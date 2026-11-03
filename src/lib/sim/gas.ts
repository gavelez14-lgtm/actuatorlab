/**
 * Direct high-pressure gas Scotch yoke: pipeline gas, line-break detection,
 * hydraulic hand-pump override, canted yoke option.
 *
 * ILLUSTRATIVE VALUES ONLY. Pipeline pressures, drop rates, set points and
 * delays are generic teaching numbers, not any manufacturer's ratings.
 */
import type { ActuatorConfiguration, ActuatorFamilyId } from "./types";

export const GAS = {
  /** Illustrative pipeline pressure range, bar(g). */
  pipelineMin: 20,
  pipelineMax: 100,
  pipelineDefault: 70,
  /**
   * The actuator cylinder is sized for pipeline pressure, so the torque model
   * sees pipeline pressure scaled into its normalised force units.
   */
  scale: 5.5 / 70, // MODEL.pressureDefault / pipelineDefault (kept literal to avoid an import cycle)
  /** Rupture: pipeline pressure decays exponentially toward this floor. */
  ruptureFloor: 4,
  ruptureTau: 9,
  /** Line-break set point (rate of drop) range and default, bar/s. */
  rateMin: 0.5,
  rateMax: 6,
  rateDefault: 2,
  /** Rate must stay above the set point this long before tripping (filters transients), s. */
  tripDelay: 1.5,
  /** Low-pass time constant for the measured rate of drop, s. */
  rateFilter: 0.6,
  /** Reserve tank pressure lost per full stroke of gas consumed (fraction of current). */
  consumptionPerStroke: 0.12,
  /** Time for a full stroke on the hydraulic hand pump, s (dozens of lever strokes). */
  pumpStrokeTime: 28,
  /** Pump lever cycles per second while pumping (visual only). */
  pumpCadence: 1.4,
  /** Gas-over-oil: stroke time with the flow controls fully open, s. */
  goStrokeTime: 4,
  flowMin: 0.2,
  flowDefault: 0.6,
  /** Gas-over-oil low-pressure trip set point range and default, bar. */
  lowMin: 10,
  lowMax: 60,
  lowDefault: 30,
  /** Canted yoke: slot angle offset that moves the torque peak to the breakout end, rad. */
  cant: (-6 * Math.PI) / 180,
} as const;

/** Pipeline-gas powered families (direct gas and gas over oil). */
export function isGas(family: ActuatorFamilyId) {
  return family === "gas-scotch-yoke" || family === "gas-over-oil";
}

export function isGasOverOil(family: ActuatorFamilyId) {
  return family === "gas-over-oil";
}

/** Gas over oil: oil flow, not force margin, sets the speed. */
export function goStrokeTime(flow: number) {
  return GAS.goStrokeTime / Math.max(GAS.flowMin, flow);
}

/**
 * Scotch yoke lever with optional cant (illustrative shape). The cant always
 * favours the valve-closed end, where a ball valve needs its break-out and
 * re-seat torque; with a fail-open coupling that is the other stroke end.
 */
export function yokeLever(config: ActuatorConfiguration, stroke: number, d: number, halfSwing: number): number {
  const closedAtStrokeEnd = config.actionType === "spring-return" && config.failPosition === "fail-open";
  const cant = config.yoke === "canted" ? (closedAtStrokeEnd ? -GAS.cant : GAS.cant) : 0;
  const phi = -halfSwing + stroke * 2 * halfSwing + cant;
  const c = Math.cos(phi);
  return d / (c * c);
}

export function pipelineToModel(bar: number) {
  return bar * GAS.scale;
}
