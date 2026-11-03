import type { ActuatorFamilyId } from "../types";
import { ELECTRIC_FAMILY } from "./electric";
import { ELECTRO_HYDRAULIC } from "./electroHydraulic";
import { HYDRAULIC, PNEUMATIC, PNEUMATIC_VANE } from "./fluid";
import { DIRECT_GAS, GAS_OVER_OIL } from "./gas";
import type { FamilyBehavior } from "./shared";

export type { FamilyBehavior, FamilyContext } from "./shared";

/** Every actuator family maps to exactly one behaviour module. */
export const FAMILY_BEHAVIOR: Record<ActuatorFamilyId, FamilyBehavior> = {
  "pneumatic-scotch-yoke": PNEUMATIC,
  "pneumatic-rack-pinion": PNEUMATIC,
  "pneumatic-vane": PNEUMATIC_VANE,
  "electric-part-turn": ELECTRIC_FAMILY,
  "electric-multi-turn": ELECTRIC_FAMILY,
  "electric-compact-part-turn": ELECTRIC_FAMILY,
  // Catalogue entry that opens the multi-turn simulator; never loaded directly.
  "rising-stem-linear": PNEUMATIC,
  "hydraulic-scotch-yoke": HYDRAULIC,
  "hydraulic-rack-pinion": HYDRAULIC,
  "electro-hydraulic": ELECTRO_HYDRAULIC,
  "gas-scotch-yoke": DIRECT_GAS,
  "gas-over-oil": GAS_OVER_OIL,
};

export function behaviorFor(family: ActuatorFamilyId): FamilyBehavior {
  return FAMILY_BEHAVIOR[family];
}
