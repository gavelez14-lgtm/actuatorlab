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

export function isElectric(family: ActuatorFamilyId): boolean {
  return family === "electric-part-turn";
}

/** Valve torque demand seen by an electric actuator, including the jam if enabled. */
export function electricDemand(position: number, obstruction: boolean, opening: boolean): number {
  const base = valveDemand(position);
  if (obstruction && opening) {
    const [a, b] = ELECTRIC.obstructionWindow;
    if (position >= a && position <= b) return ELECTRIC.obstructionTorque;
  }
  return base;
}

export function torqueLimitValue(fraction: number): number {
  return fraction * ELECTRIC.ratedTorque;
}
