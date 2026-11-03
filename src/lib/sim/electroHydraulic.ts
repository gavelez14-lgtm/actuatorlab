/**
 * Self-contained electro-hydraulic actuator with an integral controller.
 *
 * A motor-driven pump strokes a hydraulic cylinder against a spring; a dump
 * solenoid releases the oil so the spring drives the return stroke. The
 * integral controller positions the valve to a demand, handles an emergency
 * shutdown (ESD) input and runs partial-stroke tests.
 *
 * ILLUSTRATIVE VALUES ONLY: speeds, deadband, test travel and timeouts are
 * generic teaching numbers, not any manufacturer's data.
 */
import type { ActuatorFamilyId } from "./types";

export const EH = {
  /** Pumped stroke time (full travel), s. */
  pumpStrokeTime: 6,
  /** Spring stroke time through the dump/flow-control valve, s. */
  springStrokeTime: 3,
  /** Positioner deadband, valve-position units. */
  deadband: 0.006,
  /** Partial-stroke test travel, fraction of full stroke from open. */
  pstTravel: 0.15,
  /** Partial-stroke test must reach its travel within this time, s. */
  pstTimeout: 5,
  /** Illustrative system pressure while pumping and holding, bar. */
  workingPressure: 120,
} as const;

export function isElectroHydraulic(family: ActuatorFamilyId) {
  return family === "electro-hydraulic";
}
