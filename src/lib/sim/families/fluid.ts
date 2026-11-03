/**
 * Fluid-power piston actuators (air, gas, oil) driving a quarter-turn
 * mechanism. Force comes from chamber pressure; valve demand acts like
 * friction; spring return gets its fail action from the spring force.
 */
import { MODEL, computeTorques, strokeFromValvePosition, type ForceResult } from "../model";
import { GAS } from "../gas";
import { HYD } from "../hydraulic";
import type { ChamberCondition, SimulationState } from "../types";
import { atStrokeEnd, finishMotion, pct, smoothstep, type FamilyBehavior, type FamilyContext } from "./shared";

const VELOCITY_RESPONSE = 7; // 1/s

export type Medium = "air" | "gas" | "oil";

export interface FluidSpec {
  medium: Medium;
  /** Pressure in model force units acting on a supplied chamber. */
  modelPressure(s: SimulationState): number;
  /** Stroke time when oil is metered (speed independent of margin), or null. */
  meteredTime?(s: SimulationState): number | null;
  /** Called after the stroke moves, before auto-cycle. */
  afterMove?(s: SimulationState, dt: number): void;
  /** Text for a double-acting powered stroke. */
  daMotion?(verb: string): string;
}

/** Directional-valve chamber logic for double acting and spring return. */
export function fluidChambers(s: SimulationState): [ChamberCondition, ChamberCondition] {
  if (s.config.actionType === "double-acting") {
    if (s.supplyAvailable && s.commandedStroke !== null)
      return s.commandedStroke === 1 ? ["supply", "exhaust"] : ["exhaust", "supply"];
    return ["idle", "idle"];
  }
  return [s.supplyAvailable && s.commandedStroke === 1 ? "supply" : "exhaust", "atmosphere"];
}

export function fluidForces(s: SimulationState, p: number): ForceResult {
  const pA = s.chamberA === "supply" ? p : 0;
  const pB = s.chamberB === "supply" ? p : 0;
  const f = computeTorques({ config: s.config, stroke: s.stroke, pressure: s.supplyPressure, pA, pB });
  s.torque = { air: f.air, spring: f.spring, valveDemand: f.demand, net: Math.abs(f.active) - f.demand };
  return f;
}

export function fluidStep(ctx: FamilyContext, dt: number, spec: FluidSpec) {
  const s = ctx.s;
  ctx.derive();
  const f = ctx.forces();

  // Valve demand behaves like friction: it opposes motion and must be exceeded before anything moves.
  const excess = Math.abs(f.active) - f.demand;
  const dir = excess > 0 ? Math.sign(f.active) : 0;

  let vTarget = 0;
  if (dir !== 0 && !atStrokeEnd(s, dir)) {
    const distToEnd = dir > 0 ? 1 - s.stroke : s.stroke;
    const metered = spec.meteredTime?.(s) ?? null;
    if (metered !== null) {
      // Oil is metered through the flow controls: steady speed set by the valve opening.
      vTarget = (dir / metered) * (0.5 + 0.5 * smoothstep(0, 0.04, distToEnd));
    } else {
      const margin = Math.min(1.25, 0.35 + 0.65 * Math.sqrt(excess / MODEL.referenceMargin));
      const cushion = 0.3 + 0.7 * smoothstep(0, 0.09, distToEnd);
      vTarget = (dir / MODEL.nominalStrokeTime) * margin * cushion;
    }
  }

  const prevStalled = s.stalled;
  s.stalled = dir === 0 && Math.abs(f.active) > 1e-6 && !atStrokeEnd(s, Math.sign(f.active)) && s.supplyAvailable;

  s.velocity += (vTarget - s.velocity) * (1 - Math.exp(-dt * VELOCITY_RESPONSE));
  if (Math.abs(s.velocity) < 1e-4 && vTarget === 0) s.velocity = 0;
  s.stroke += s.velocity * dt;
  if (s.stroke >= 1) {
    s.stroke = 1;
    if (s.velocity > 0) s.velocity = 0;
  } else if (s.stroke <= 0) {
    s.stroke = 0;
    if (s.velocity < 0) s.velocity = 0;
  }

  ctx.derive();
  s.airFlowing = Math.abs(s.velocity) > 0.004;
  spec.afterMove?.(s, dt);
  finishMotion(s);

  ctx.cycle(dt, !s.airFlowing, () => ctx.command(s.position < 0.5 ? "open" : "close", true));
  if (prevStalled !== s.stalled) ctx.emit();
}

export function fluidCommand(ctx: FamilyContext, kind: "open" | "close", silent: boolean) {
  const s = ctx.s;
  const targetStroke = strokeFromValvePosition(s.config, kind === "open" ? 1 : 0) as 0 | 1;
  s.commandedStroke = targetStroke;
  ctx.derive();
  if (silent) return;
  const needsSupply = s.config.actionType === "double-acting" || targetStroke === 1; // spring return: stroke 1 is the powered stroke
  if (needsSupply && !s.supplyAvailable) {
    ctx.flash(
      s.config.actionType === "double-acting"
        ? `${kind === "open" ? "Open" : "Close"} signal recorded, but there is no supply. A double-acting actuator has no stored energy, so it stays put until supply returns.`
        : `${kind === "open" ? "Open" : "Close"} signal recorded, but there is no supply. The spring holds the actuator at its fail position until supply returns.`,
    );
  } else if (s.config.actionType === "spring-return" && targetStroke === 0) {
    ctx.flash("Solenoid de-energised: the cylinder vents and the spring drives the stroke.");
  }
  if (!s.playing) ctx.flash("Simulation is paused. Press Play to see the command execute.");
}

export function fluidSupplyNotice(s: SimulationState, available: boolean) {
  if (!available)
    return s.config.actionType === "spring-return"
      ? "Supply lost. The cylinder vents and the stored spring energy drives the actuator to its fail position."
      : "Supply lost. Both chambers lose motive pressure; with no stored energy the actuator stops where it is.";
  return s.commandedStroke === null
    ? "Supply restored. No command is active, so nothing moves."
    : "Supply restored. The actuator responds to the control signal that is still active.";
}

export function fluidStatus(s: SimulationState, spec: FluidSpec): string {
  const sr = s.config.actionType === "spring-return";
  const med = spec.medium;
  const Med = med[0].toUpperCase() + med.slice(1);
  if (!s.playing) return `Paused at ${pct(s.position)} open.`;
  if (s.airFlowing) {
    const verb = s.direction === "opening" ? "Opening" : "Closing";
    if (sr && s.chamberA !== "supply") return `${verb}: spring stroke. Cylinder ${med} is ${med === "oil" ? "returning to tank" : "exhausting"} while the spring extends.`;
    if (sr) return `${verb}: ${med === "air" ? "air" : "powered"} stroke. ${Med} pressure drives the piston and compresses the spring.`;
    return spec.daMotion?.(verb) ?? `${verb}: air drives the piston; the opposite chamber exhausts.`;
  }
  if (s.stalled) return `Stalled at ${pct(s.position)}: available torque does not exceed the load. Raise supply pressure (illustrative model).`;
  if (sr && !s.supplyAvailable) return `Supply lost. Spring holds the valve ${s.config.failPosition === "fail-closed" ? "closed" : "open"} (fail position).`;
  if (!sr && !s.supplyAvailable) return `Supply lost. No stored energy: the valve stays at ${pct(s.position)} (fail in place).`;
  if (s.commandedStroke === null) return sr ? "At rest on the spring. Issue an Open or Close command." : "Idle. Issue an Open or Close command.";
  return `Holding ${s.position > 0.5 ? "open" : "closed"}.${sr && s.chamberA === "supply" ? ` ${Med} pressure holds the spring compressed.` : sr ? " The spring holds this position." : " Supply pressure holds the piston at its end stop."}`;
}

/** Build a plain fluid-power family from a spec. */
export function makeFluidFamily(
  spec: FluidSpec,
  extra: Partial<FamilyBehavior> & { setPressure(s: SimulationState, bar: number): void },
): FamilyBehavior {
  return {
    chambers: fluidChambers,
    forces: (s) => fluidForces(s, spec.modelPressure(s)),
    step: (ctx, dt) => fluidStep(ctx, dt, spec),
    command: fluidCommand,
    supplyNotice: fluidSupplyNotice,
    status: (s) => fluidStatus(s, spec),
    ...extra,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Instrument-air families: Scotch yoke, rack and pinion, vane. */
export const PNEUMATIC = makeFluidFamily(
  { medium: "air", modelPressure: (s) => s.supplyPressure },
  { setPressure: (s, bar) => void (s.supplyPressure = clamp(bar, MODEL.pressureMin, MODEL.pressureMax)) },
);

export const PNEUMATIC_VANE = makeFluidFamily(
  {
    medium: "air",
    modelPressure: (s) => s.supplyPressure,
    daMotion: (verb) => `${verb}: air on one face of the vane turns it; the other side of the chamber exhausts.`,
  },
  {
    normalise: (c) => ({ ...c, actionType: "double-acting", failPosition: "fail-in-place" }),
    setPressure: (s, bar) => void (s.supplyPressure = clamp(bar, MODEL.pressureMin, MODEL.pressureMax)),
  },
);

/** Hydraulic power unit supply: metered oil, pressure sets torque. */
export const HYDRAULIC = makeFluidFamily(
  {
    medium: "oil",
    modelPressure: (s) => s.supplyPressure * HYD.scale,
    meteredTime: (s) => HYD.strokeTime / Math.max(GAS.flowMin, s.gas.flow),
    daMotion: (verb) => `${verb}: oil from the power unit drives the piston; oil from the other side returns to tank.`,
  },
  {
    initialPressure: HYD.pressureDefault,
    setPressure: (s, bar) => void (s.supplyPressure = clamp(bar, HYD.pressureMin, HYD.pressureMax)),
    handle: (ctx, cmd) => {
      if (cmd.type !== "set-flow") return false;
      ctx.s.gas.flow = clamp(cmd.value, GAS.flowMin, 1);
      return true;
    },
  },
);
