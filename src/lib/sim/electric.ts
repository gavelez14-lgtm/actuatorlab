/**
 * Illustrative model of an electric part-turn actuator (motor, self-locking
 * worm and wheel, torque and position limits, declutchable handwheel).
 *
 * Behaviour follows publicly documented features of intelligent electric
 * part-turn actuators (for example Rotork IQT literature): output torque is
 * sensed from worm-shaft thrust and the motor is switched off at a set torque
 * limit; position is held by an absolute encoder with or without power; a
 * lockable hand/auto lever declutches the motor for handwheel operation.
 *
 * All numbers are normalised and illustrative, not product ratings.
 */
import { valveDemand } from "./model";
import type { ActuatorFamilyId } from "./types";

export const ELECTRIC = {
  /** Rated output torque in the same normalised units as valve demand. */
  ratedTorque: 2.0,
  /** Stroke time at 1x speed. Electric part-turn speed is load-independent until a trip. */
  strokeTime: 6,
  /** Handwheel stroke time (geared, deliberately slow). */
  handStrokeTime: 24,
  /** Worm turns per 90° of output (single-start worm, illustrative ratio). */
  wormTurnsPerStroke: 15,
  /** Valve position window where the obstruction teaching aid jams the valve. */
  obstructionWindow: [0.55, 0.62] as const,
  obstructionTorque: 2.6,
  torqueLimitMin: 0.4,
  torqueLimitDefault: 0.8,
} as const;

/**
 * Multi-turn on a rising-stem wedge gate valve (behaviour after public IQ
 * literature): hollow output turns a drive bush (stem nut) in a thrust base;
 * the non-rotating threaded stem rises and falls. Wedge gates are commonly
 * closed on torque: the wedge is driven into the seats until torque reaches
 * the limit.
 */
export const MULTI_TURN = {
  strokeTime: 10,
  handStrokeTime: 40,
  /** Output turns for a full stroke (illustrative; real valves vary widely). */
  outputTurns: 12,
  /** Worm turns per output turn (illustrative ratio). */
  wormRatio: 8,
  /** Gate running torque, unseating at open start, wedging near closed. */
  running: 0.45,
  unseat: 1.1,
  /** Valve position below which closing starts to wedge into the seats. */
  wedgeZone: 0.04,
  /** Demand at full wedging (exceeds any limit, so a torque-seated close always ends on torque). */
  wedgeMax: 2.4,
  /** Illustrative thrust per unit torque from the stem thread (2*pi/lead x efficiency, normalised). */
  thrustFactor: 3.2,
} as const;

export function isElectric(family: ActuatorFamilyId): boolean {
  return family === "electric-part-turn" || family === "electric-multi-turn";
}

export function isMultiTurn(family: ActuatorFamilyId): boolean {
  return family === "electric-multi-turn";
}

/** Wedge gate demand: unseating on opening, wedging on closing near the seat. */
export function gateDemand(position: number, opening: boolean): number {
  if (opening) return MULTI_TURN.running + (MULTI_TURN.unseat - MULTI_TURN.running) * Math.exp(-position / 0.03);
  if (position < MULTI_TURN.wedgeZone) {
    const t = 1 - position / MULTI_TURN.wedgeZone;
    return MULTI_TURN.running + (MULTI_TURN.wedgeMax - MULTI_TURN.running) * t * t;
  }
  return MULTI_TURN.running;
}

/** Valve torque demand seen by an electric actuator, including the jam if enabled. */
export function electricDemand(position: number, obstruction: boolean, opening: boolean, family: ActuatorFamilyId = "electric-part-turn"): number {
  const base = isMultiTurn(family) ? gateDemand(position, opening) : valveDemand(position);
  if (obstruction && opening) {
    const [a, b] = ELECTRIC.obstructionWindow;
    if (position >= a && position <= b) return ELECTRIC.obstructionTorque;
  }
  return base;
}

export function torqueLimitValue(fraction: number): number {
  return fraction * ELECTRIC.ratedTorque;
}
