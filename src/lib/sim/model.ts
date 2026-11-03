/**
 * Illustrative force / torque model.
 *
 * Every number here is a NORMALISED, ILLUSTRATIVE value chosen to make the
 * behaviour of the mechanism understandable. None of it is manufacturer data, and
 * none of it should be used for sizing. The one relationship taken from
 * engineering texts are the lever relations in mechanisms.ts: Scotch yoke
 * T = F * d / cos^2(phi), rack and pinion T = F * r.
 */
import { leverForConfig } from "./mechanisms";
import type { ActuatorConfiguration, ValveKind } from "./types";

export const MODEL = {
  /** Effective piston area, normalised so force = bar x 1. */
  pistonArea: 1,
  /** Spring force at stroke 0 (installed preload), illustrative force units. */
  springPreload: 2.2,
  /** Additional spring force per unit of stroke. */
  springRate: 1.6,
  /** Ball valve demand: running torque and seat break-out/re-seat torque. */
  valveRunning: 0.35,
  valveSeat: 1.0,
  /** How quickly the seat torque fades as the ball leaves the seat (valve-position units). */
  valveSeatWidth: 0.08,
  /** Stroke time at 1x speed with a healthy torque margin, seconds. */
  nominalStrokeTime: 3.2,
  /** Net-torque margin at which the actuator reaches nominal speed. */
  referenceMargin: 1.5,
  /** Supply pressure range offered in the UI, bar(g). Generic plant-air range, illustrative. */
  pressureMin: 2,
  pressureMax: 8,
  pressureDefault: 5.5,
} as const;

/** Map actuator stroke to valve opening given the coupling arrangement. */
export function valvePositionFromStroke(config: ActuatorConfiguration, stroke: number): number {
  return config.actionType === "spring-return" && config.failPosition === "fail-open"
    ? 1 - stroke
    : stroke;
}

export function strokeFromValvePosition(config: ActuatorConfiguration, position: number): number {
  // The mapping is its own inverse.
  return valvePositionFromStroke(config, position);
}

/** Illustrative plug-valve demand shape (normalised; not valve-maker data). */
export const PLUG = { running: 0.6, breakout: 1.15, breakWidth: 0.07 } as const;

/** Illustrative butterfly-valve demand shape (normalised; not valve-maker data). */
export const BUTTERFLY = { running: 0.25, seat: 0.95, seatWidth: 0.05, dynamic: 0.42, dynamicAt: 0.75, dynamicWidth: 0.14 } as const;

export function springForce(stroke: number): number {
  return MODEL.springPreload + MODEL.springRate * stroke;
}

/**
 * Illustrative ball-valve torque demand. Highest at the seat (closed),
 * lower while the ball is running. Real valve torque depends on size, seat
 * material, pressure, media and service, and must come from the valve maker.
 */
export function valveDemand(valvePosition: number, valve: ValveKind = "ball"): number {
  if (valve === "plug") {
    // Illustrative plug valve: sliding seal contact all the way round, so the
    // running torque is high, with a large break-out at the closed end.
    return PLUG.running + (PLUG.breakout - PLUG.running) * Math.exp(-valvePosition / PLUG.breakWidth);
  }
  if (valve === "butterfly") {
    // Illustrative butterfly: seating torque at closed, low bearing friction,
    // and a flow-induced dynamic torque that peaks part-way open.
    return (
      BUTTERFLY.running +
      (BUTTERFLY.seat - BUTTERFLY.running) * Math.exp(-valvePosition / BUTTERFLY.seatWidth) +
      BUTTERFLY.dynamic * Math.exp(-(((valvePosition - BUTTERFLY.dynamicAt) / BUTTERFLY.dynamicWidth) ** 2))
    );
  }
  return (
    MODEL.valveRunning +
    (MODEL.valveSeat - MODEL.valveRunning) * Math.exp(-valvePosition / MODEL.valveSeatWidth)
  );
}

export interface ForceInputs {
  config: ActuatorConfiguration;
  stroke: number;
  pressure: number;
  /** Pressure acting on chamber A (drives stroke toward 1). */
  pA: number;
  /** Pressure acting on chamber B (drives stroke toward 0). Double-acting only. */
  pB: number;
}

export interface ForceResult {
  /** Signed active torque along +stroke direction (before valve demand). */
  active: number;
  air: number;
  spring: number;
  demand: number;
}

export function computeTorques({ config, stroke, pA, pB }: ForceInputs): ForceResult {
  const lever = leverForConfig(config, stroke);
  const airForce = (pA - pB) * MODEL.pistonArea;
  const spring = config.actionType === "spring-return" ? springForce(stroke) : 0;
  const active = (airForce - spring) * lever;
  return {
    active,
    air: Math.abs(airForce) * lever,
    spring: spring * lever,
    demand: valveDemand(valvePositionFromStroke(config, stroke), config.valve),
  };
}

export interface TorqueCurvePoint {
  /** Valve position 0..1 (x axis of the chart). */
  position: number;
  /** Actuator output on the air stroke (net of spring for spring-return). */
  airStroke: number;
  /** Spring output on the spring stroke (spring-return only). */
  springStroke: number | null;
  /** Illustrative valve demand. */
  demand: number;
}

/** Sample illustrative torque curves across the full stroke for charting. */
export function torqueCurves(config: ActuatorConfiguration, pressure: number, samples = 61): TorqueCurvePoint[] {
  const pts: TorqueCurvePoint[] = [];
  for (let i = 0; i < samples; i++) {
    const position = i / (samples - 1);
    const stroke = strokeFromValvePosition(config, position);
    const lever = leverForConfig(config, stroke);
    const spring = config.actionType === "spring-return" ? springForce(stroke) * lever : 0;
    pts.push({
      position,
      airStroke: pressure * MODEL.pistonArea * lever - spring,
      springStroke: config.actionType === "spring-return" ? spring : null,
      demand: valveDemand(position, config.valve),
    });
  }
  return pts;
}

/** Lowest supply pressure (illustrative) that completes the air stroke. */
export function minimumPressureForFullStroke(config: ActuatorConfiguration): number {
  let worst = 0;
  for (let i = 0; i <= 200; i++) {
    const s = i / 200;
    const lever = leverForConfig(config, s);
    const spring = config.actionType === "spring-return" ? springForce(s) : 0;
    const demand = valveDemand(valvePositionFromStroke(config, s), config.valve);
    worst = Math.max(worst, spring + demand / lever);
  }
  return worst / MODEL.pistonArea;
}
