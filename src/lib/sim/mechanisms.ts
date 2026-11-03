/**
 * Mechanism registry. Each actuator technology supplies its own kinematics
 * (lever arm vs stroke) and its own description of the torque relationship.
 * The engine and the torque model stay mechanism-agnostic.
 */
import { leverFactor } from "./geometry";
import { RP } from "./rackPinionGeometry";
import type { ActuatorFamilyId } from "./types";

export type MechanismKind = "scotch-yoke" | "rack-pinion" | "worm-gear" | "multi-turn" | "compact-electric";

export interface Mechanism {
  kind: MechanismKind;
  name: string;
  /** Shaft torque per unit of linear piston force at a given stroke. */
  lever: (stroke: number) => number;
  /** Plain statement of the torque relation shown in the UI. */
  formula: string;
  formulaNote: string;
}

/**
 * Rack and pinion: torque = force x pitch radius, constant through travel.
 * The normalised lever is chosen so the torque magnitudes are comparable with
 * the Scotch yoke model (which spans 0.55..1.10). Illustrative only.
 */
const RACK_PINION_LEVER = 0.78;

export const MECHANISMS: Record<MechanismKind, Mechanism> = {
  "scotch-yoke": {
    kind: "scotch-yoke",
    name: "Scotch yoke",
    lever: leverFactor,
    formula: "T = F·d / cos²φ",
    formulaNote: "Symmetric yoke: lowest at mid-stroke, twice as high at ±45°.",
  },
  "worm-gear": {
    kind: "worm-gear",
    name: "Electric worm gear",
    lever: () => RACK_PINION_LEVER,
    formula: "T = motor torque × ratio × efficiency",
    formulaNote: "Speed is constant; the motor is switched off when sensed torque reaches the limit.",
  },
  "compact-electric": {
    kind: "compact-electric",
    name: "Compact electric part-turn",
    lever: () => RACK_PINION_LEVER,
    formula: "T = motor torque × two-stage ratio × efficiency",
    formulaNote: "Stopped by mechanical cam limit switches, or by a spring-set mechanical torque switch.",
  },
  "multi-turn": {
    kind: "multi-turn",
    name: "Electric multi-turn",
    lever: () => RACK_PINION_LEVER,
    formula: "Thrust ≈ T × 2π / lead × efficiency",
    formulaNote: "The stem nut turns many times; the thread converts output torque into stem thrust.",
  },
  "rack-pinion": {
    kind: "rack-pinion",
    name: "Rack and pinion",
    lever: () => RACK_PINION_LEVER,
    formula: "T = F·r",
    formulaNote: `Pitch radius r is fixed, so torque per unit force is constant through travel (model r = ${RP.pitchRadius}).`,
  },
};

export function mechanismFor(family: ActuatorFamilyId): MechanismKind {
  if (family === "electric-part-turn") return "worm-gear";
  if (family === "electric-multi-turn") return "multi-turn";
  if (family === "electric-compact-part-turn") return "compact-electric";
  return family.includes("rack-pinion") ? "rack-pinion" : "scotch-yoke";
}

export function leverFor(family: ActuatorFamilyId, stroke: number): number {
  return MECHANISMS[mechanismFor(family)].lever(stroke);
}
