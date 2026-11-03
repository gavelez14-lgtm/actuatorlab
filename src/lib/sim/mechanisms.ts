/**
 * Mechanism registry. Each actuator technology supplies its own kinematics
 * (lever arm vs stroke) and its own description of the torque relationship.
 * The engine and the torque model stay mechanism-agnostic.
 */
import { leverFactor } from "./geometry";
import { RP } from "./rackPinionGeometry";
import type { ActuatorFamilyId } from "./types";

export type MechanismKind = "scotch-yoke" | "rack-pinion";

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
  "rack-pinion": {
    kind: "rack-pinion",
    name: "Rack and pinion",
    lever: () => RACK_PINION_LEVER,
    formula: "T = F·r",
    formulaNote: `Pitch radius r is fixed, so torque per unit force is constant through travel (model r = ${RP.pitchRadius}).`,
  },
};

export function mechanismFor(family: ActuatorFamilyId): MechanismKind {
  return family.includes("rack-pinion") ? "rack-pinion" : "scotch-yoke";
}

export function leverFor(family: ActuatorFamilyId, stroke: number): number {
  return MECHANISMS[mechanismFor(family)].lever(stroke);
}
