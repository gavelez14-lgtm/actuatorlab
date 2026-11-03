/**
 * Contract between the engine core and each actuator family.
 *
 * The engine owns the clock, snapshots, notices and generic commands
 * (play, mode, seek, config...). Everything that depends on how a family
 * produces motion lives in a FamilyBehavior: its chamber conditions, forces,
 * physics step, open/close handling, family-only commands and status text.
 */
import { valvePositionFromStroke, type ForceResult } from "../model";
import type { ActuatorConfiguration, ChamberCondition, SimulationCommand, SimulationState } from "../types";

export const END_EPS = 1e-4;
export const AUTO_CYCLE_DWELL = 1.1; // seconds (simulation time)
/** Fixed sub-step for families with narrow events (seating, jams, PST). */
export const SUB_STEP = 1 / 120;

export function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;

export const atStrokeEnd = (s: SimulationState, dir: number) => (dir > 0 ? s.stroke >= 1 - END_EPS : s.stroke <= END_EPS);

/** Set airFlowing and the valve-relative direction from the current velocity. */
export function finishMotion(s: SimulationState) {
  s.airFlowing = Math.abs(s.velocity) > 0.004;
  const valveVel = valvePositionFromStroke(s.config, 1) > 0.5 ? s.velocity : -s.velocity;
  s.direction = !s.airFlowing ? "stopped" : valveVel > 0 ? "opening" : "closing";
}

/** Run `step` in fixed sub-steps so behaviour does not depend on frame rate. */
export function subStep(dt: number, step: (h: number) => void) {
  const n = Math.max(1, Math.ceil(dt / SUB_STEP));
  for (let i = 0; i < n; i++) step(dt / n);
}

/** Services the engine provides to a family while it runs. */
export interface FamilyContext {
  s: SimulationState;
  /** Recompute position, target and chamber conditions. */
  derive(): void;
  /** Recompute s.torque from the family's force model. */
  forces(): ForceResult;
  flash(message: string): void;
  /** Push a snapshot to the UI now (for discrete events such as a trip). */
  emit(): void;
  /** Issue open/close through the family (used by auto-cycle). */
  command(kind: "open" | "close", silent?: boolean): void;
  /** Auto-cycle dwell: when `idle` long enough, call `fire`. */
  cycle(dt: number, idle: boolean, fire: () => void): void;
}

export interface FamilyBehavior {
  /** Family-specific configuration rules, applied before the common ones. */
  normalise?(c: ActuatorConfiguration): ActuatorConfiguration;
  /** Initial supply pressure if not the pneumatic default. */
  initialPressure?: number;
  chambers(s: SimulationState): [ChamberCondition, ChamberCondition];
  forces(s: SimulationState): ForceResult;
  step(ctx: FamilyContext, dt: number): void;
  command(ctx: FamilyContext, kind: "open" | "close", silent: boolean): void;
  /** Notice shown when the supply/power switch changes. */
  supplyNotice(s: SimulationState, available: boolean): string;
  setPressure(s: SimulationState, bar: number): void;
  /** Family-only commands. Return true if consumed. */
  handle?(ctx: FamilyContext, cmd: SimulationCommand): boolean;
  status(s: SimulationState): string;
  /** Keep the UI updating while nothing moves (e.g. pipeline pressure falling). */
  liveUi?(s: SimulationState): boolean;
}
