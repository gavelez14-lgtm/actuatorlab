/**
 * Hydraulic actuators supplied from a separate hydraulic power unit (HPU):
 * the same Scotch yoke and rack-and-pinion mechanisms, driven by oil.
 *
 * ILLUSTRATIVE VALUES ONLY: pressure range and stroke time are generic
 * teaching numbers, not ratings for any product.
 */
import type { ActuatorFamilyId } from "./types";

export const HYD = {
  pressureMin: 40,
  pressureMax: 210,
  pressureDefault: 140,
  /** Model force units per bar (cylinder sized for hydraulic pressure). */
  scale: 5.5 / 140,
  /** Stroke time with the flow controls fully open, s. */
  strokeTime: 3,
} as const;

export function isHydraulic(family: ActuatorFamilyId) {
  return family === "hydraulic-scotch-yoke" || family === "hydraulic-rack-pinion";
}
