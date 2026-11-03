/**
 * Pipeline-gas families: direct gas (gas on the piston) and gas over oil
 * (gas pushes oil, oil is metered to the piston). Both add a pipeline and
 * line-break monitor, a reserve of stored gas and a hydraulic hand-pump
 * override on top of the fluid-power stroke.
 */
import { strokeFromValvePosition, valvePositionFromStroke } from "../model";
import { GAS, goStrokeTime, isGasOverOil, pipelineToModel } from "../gas";
import type { SimulationState } from "../types";
import { fluidChambers, fluidCommand, fluidForces, fluidStatus, fluidStep, type FluidSpec } from "./fluid";
import { END_EPS, finishMotion, pct, type FamilyBehavior, type FamilyContext } from "./shared";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Pipeline and line-break monitor. The rate of pressure change is low-pass
 * filtered and must exceed the set point for a delay before tripping, so a
 * short transient does not close the line. A check valve keeps the reserve
 * at the highest recent pipeline pressure.
 */
function monitor(ctx: FamilyContext, dt: number) {
  const s = ctx.s;
  const g = s.gas;
  const prev = g.pipeline;
  if (g.ruptured) g.pipeline += (GAS.ruptureFloor - g.pipeline) * (1 - Math.exp(-dt / GAS.ruptureTau));
  else g.pipeline += (g.pipelineSet - g.pipeline) * (1 - Math.exp(-dt / 3));
  g.rate += ((g.pipeline - prev) / dt - g.rate) * (1 - Math.exp(-dt / GAS.rateFilter));
  if (g.pipeline > g.tank) g.tank = g.pipeline;
  const low = isGasOverOil(s.config.family) && g.pipeline < g.lowSet;
  if (g.armed && !g.tripped && (-g.rate > g.setPoint || low)) {
    g.overFor += dt;
    if (g.overFor >= GAS.tripDelay) {
      g.tripped = true;
      g.tripCause = -g.rate > g.setPoint ? "rate" : "low";
      g.manual = false;
      g.pumpDir = 0;
      s.commandedStroke = strokeFromValvePosition(s.config, 0) as 0 | 1;
      ctx.flash(
        g.tripCause === "rate"
          ? `Line break: pipeline pressure fell faster than ${g.setPoint.toFixed(1)} bar/s for ${GAS.tripDelay} s. The control closes the valve on stored gas and latches until reset.`
          : `Low pressure: the pipeline stayed below ${g.lowSet.toFixed(0)} bar for ${GAS.tripDelay} s. The control closes the valve on stored gas and latches until reset.`,
      );
      ctx.emit();
    }
  } else if (-g.rate <= g.setPoint && !low) {
    g.overFor = 0;
  }
}

/** Hydraulic hand-pump override: each lever stroke displaces oil into the override cylinder. */
function manualStep(ctx: FamilyContext, dt: number) {
  const s = ctx.s;
  const g = s.gas;
  ctx.derive();
  const dirStroke = g.pumpDir === 0 ? 0 : valvePositionFromStroke(s.config, 1) > 0.5 ? g.pumpDir : -g.pumpDir;
  const atEnd = dirStroke > 0 ? s.stroke >= 1 - END_EPS : s.stroke <= END_EPS;
  const vTarget = dirStroke !== 0 && !atEnd ? dirStroke / GAS.pumpStrokeTime : 0;
  // Trapped oil is incompressible here: motion stops the moment pumping stops.
  s.velocity = vTarget === 0 ? 0 : s.velocity + (vTarget - s.velocity) * (1 - Math.exp(-dt * 30));
  s.stroke = clamp(s.stroke + s.velocity * dt, 0, 1);
  if (g.pumpDir !== 0 && !atEnd) g.pumpPhase += dt * GAS.pumpCadence * Math.PI * 2;
  ctx.derive();
  ctx.forces();
  s.stalled = false;
  finishMotion(s);
}

function makeGasFamily(overOil: boolean): FamilyBehavior {
  const spec: FluidSpec = {
    medium: overOil ? "oil" : "gas",
    modelPressure: (s) => pipelineToModel(s.gas.tank),
    meteredTime: overOil ? (s) => goStrokeTime(s.gas.flow) : undefined,
    afterMove: (s, dt) => {
      if (!s.airFlowing || (s.chamberA !== "supply" && s.chamberB !== "supply")) return;
      // Each stroke spends stored gas (vented to a safe area).
      s.gas.tank = Math.max(0, s.gas.tank - s.gas.tank * GAS.consumptionPerStroke * Math.abs(s.velocity) * dt);
      if (s.gas.pipeline > s.gas.tank) s.gas.tank = s.gas.pipeline;
    },
    daMotion: overOil
      ? (verb) => `${verb}: gas pushes oil into one side of the piston; oil from the other side returns to its tank.`
      : (verb) => `${verb}: pipeline gas drives the piston; the opposite chamber exhausts.`,
  };

  return {
    // With the override selected the gas controls are isolated: no chamber is fed.
    chambers: (s) => (s.gas.manual ? ["idle", "idle"] : fluidChambers(s)),
    forces: (s) => fluidForces(s, spec.modelPressure(s)),
    step(ctx, dt) {
      monitor(ctx, dt);
      if (ctx.s.gas.manual) manualStep(ctx, dt);
      else fluidStep(ctx, dt, spec);
    },
    command(ctx, kind, silent) {
      const g = ctx.s.gas;
      if (g.tripped && kind === "open") {
        if (!silent) ctx.flash("Line-break trip is latched. The valve stays closed until the trip is reset (after the pipeline is made safe).");
        return;
      }
      if (g.manual) {
        if (!silent) ctx.flash("Manual override is selected, so the gas controls are isolated. Return to gas operation first.");
        return;
      }
      fluidCommand(ctx, kind, silent);
    },
    supplyNotice: (s, available) =>
      !available
        ? s.config.actionType === "spring-return"
          ? "Power gas isolated. The cylinder vents and the spring drives the valve to its fail position."
          : "Power gas isolated. With no gas to the cylinder, the valve stays where it is."
        : "Power gas restored. The actuator follows the command that is still active.",
    setPressure(s, bar) {
      // An operator set point, treated as a steady state: no transient for the monitor.
      const p = clamp(bar, GAS.pipelineMin, GAS.pipelineMax);
      const g = s.gas;
      Object.assign(g, { pipelineSet: p, pipeline: g.ruptured ? g.pipeline : p, tank: g.ruptured ? g.tank : p, rate: 0, overFor: 0 });
    },
    handle(ctx, cmd) {
      const s = ctx.s;
      const g = s.gas;
      switch (cmd.type) {
        case "set-rupture":
          g.ruptured = cmd.value;
          if (cmd.value && !s.playing) s.playing = true;
          ctx.flash(
            cmd.value
              ? g.armed
                ? "Pipeline rupture downstream. Watch the rate of pressure drop against the line-break set point."
                : "Pipeline rupture downstream, with line-break detection disarmed. Nothing will close the valve automatically."
              : "Pipeline repaired and repressurising. A latched trip still needs a reset.",
          );
          return true;
        case "set-line-break-armed":
          g.armed = cmd.value;
          g.overFor = 0;
          return true;
        case "set-line-break-rate":
          g.setPoint = clamp(cmd.value, GAS.rateMin, GAS.rateMax);
          return true;
        case "reset-line-break":
          if (g.ruptured) ctx.flash("Cannot reset yet: the pipeline is still ruptured. Repair it first; a reset on a broken line would let the valve reopen into the leak.");
          else if (overOil && g.pipeline < g.lowSet) ctx.flash("Cannot reset yet: pipeline pressure is still below the low-pressure set point.");
          else {
            g.tripped = false;
            g.tripCause = null;
            g.overFor = 0;
            ctx.flash("Line-break trip reset. The valve stays closed until an Open command.");
          }
          return true;
        case "set-flow":
          g.flow = clamp(cmd.value, GAS.flowMin, 1);
          return true;
        case "set-low-set":
          g.lowSet = clamp(cmd.value, GAS.lowMin, GAS.lowMax);
          return true;
        case "set-manual":
          g.manual = cmd.value;
          g.pumpDir = 0;
          if (cmd.value) {
            s.commandedStroke = null;
            ctx.flash("Manual override selected. Gas controls are isolated and the hydraulic cylinder holds the actuator; pump to move it.");
          }
          ctx.derive();
          return true;
        case "pump":
          if (!g.manual && cmd.dir !== 0) {
            ctx.flash("Select manual override first. In gas operation the control valves have priority.");
            return true;
          }
          g.pumpDir = cmd.dir;
          if (cmd.dir !== 0 && !s.playing) s.playing = true;
          return true;
        default:
          return false;
      }
    },
    status(s: SimulationState) {
      const g = s.gas;
      const sr = s.config.actionType === "spring-return";
      if (g.manual)
        return g.pumpDir !== 0 && s.airFlowing
          ? `Hand pump: oil into the override cylinder drives the valve ${s.direction === "opening" ? "open" : "closed"}, ${pct(s.position)} open.`
          : `Manual override at ${pct(s.position)} open. The trapped oil holds the actuator${sr ? " against the spring" : ""}.`;
      if (g.tripped)
        return s.airFlowing
          ? `${g.tripCause === "low" ? "Low-pressure trip" : "Line break tripped"}: closing on stored gas.`
          : `Line break tripped and latched. Valve ${s.position < 0.02 ? "closed" : `at ${pct(s.position)}`}. Reset when the line is safe.`;
      if (g.ruptured && g.armed && g.overFor > 0)
        return `Pressure falling at ${(-g.rate).toFixed(1)} bar/s, above the ${g.setPoint.toFixed(1)} bar/s set point for ${g.overFor.toFixed(1)} of ${GAS.tripDelay} s.`;
      return fluidStatus(s, spec);
    },
    liveUi: (s) => s.gas.ruptured || Math.abs(s.gas.pipeline - s.gas.pipelineSet) > 0.05,
  };
}

export const DIRECT_GAS = makeGasFamily(false);
export const GAS_OVER_OIL = makeGasFamily(true);
