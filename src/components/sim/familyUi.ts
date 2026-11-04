/**
 * Presentation registry: everything the simulator UI needs to know about an
 * actuator family, in one typed table keyed by every ActuatorFamilyId.
 * Components read from here instead of branching on family names, so adding
 * a family means adding one entry (plus its engine module in lib/sim/families).
 */
import { MODEL } from "@/lib/sim/model";
import { HYD } from "@/lib/sim/hydraulic";
import { pipelineToModel } from "@/lib/sim/gas";
import type { ActionType, ActuatorFamilyId, FailPosition, SimulationState } from "@/lib/sim/types";

/** Which family-specific control section the Configure panel shows. */
export type ControlsKind = "fluid" | "gas" | "electric" | "electro-hydraulic";
/** Which readout set the Engineering overlay shows. */
export type ReadoutsKind = "fluid" | "gas" | "electric" | "electro-hydraulic";
export type MenuGroup = "Pneumatic" | "Electric" | "Gas" | "Hydraulic" | "Electro-hydraulic";

export interface FamilyUi {
  title: string;
  /** Actuator menu placement; omit to keep the family out of the menu. */
  menu?: { group: MenuGroup; label: string };
  /** `?type=` value; null for the default (pneumatic Scotch yoke). */
  typeParam: string | null;
  controls: ControlsKind;
  readouts: ReadoutsKind;
  /** Offer double acting / spring return and fail action. */
  actionChoice: boolean;
  /** Offer ball / butterfly / plug. */
  valveChoice: boolean;
  /** Fixed valve description when valveChoice is false. */
  fixedValve?: string;
  /** Header summary of the configuration. */
  configLabel(action: ActionType, fail: FailPosition): string;
  /** Explanation under the action-type choice. */
  actionText: { sr: string; da: string };
  /** Fail-action note for double acting (no spring). */
  noSpringNote: string;
  /** Status chip text for the supply/power switch. */
  supplyChip: { on: string; off: string };
  /** Name for the energy visualisation mode. */
  energyLabel: "Air flow" | "Gas flow" | "Oil flow" | "Power flow";
  /** Fluid controls only: the supply switch and pressure slider. */
  supply?: {
    label: string;
    lossSr: string;
    lossDa: string;
    min: number;
    max: number;
    step: number;
    decimals: number;
    /** bar -> model force units */
    scale: number;
    strokeWord: string;
    flowControl?: boolean;
  };
  /** Recently-visited entry. */
  recentTitle: string;
  /** Label for the first paint option when the family's standard finish is not graphite. */
  standardFinish?: string;
}

const failWord = (fail: FailPosition) => (fail === "fail-closed" ? "fails closed" : "fails open");

const AIR_SUPPLY = (moving: "piston" | "vane"): FamilyUi["supply"] => ({
  label: "Supply available",
  lossSr: "Turn off to simulate loss of instrument air. The spring will act.",
  lossDa: `Turn off to simulate loss of instrument air. Nothing will drive the ${moving}.`,
  min: MODEL.pressureMin,
  max: MODEL.pressureMax,
  step: 0.1,
  decimals: 1,
  scale: 1,
  strokeWord: "air",
});

const HYD_SUPPLY: FamilyUi["supply"] = {
  label: "Hydraulic supply available",
  lossSr: "Turn off to simulate loss of the hydraulic power unit. The cylinder drains to tank and the spring acts.",
  lossDa: "Turn off to simulate loss of the hydraulic power unit. The trapped oil holds the valve in place.",
  min: HYD.pressureMin,
  max: HYD.pressureMax,
  step: 1,
  decimals: 0,
  scale: HYD.scale,
  strokeWord: "powered",
  flowControl: true,
};

const pneumatic = (title: string, menuLabel: string, typeParam: string | null): FamilyUi => ({
  title,
  menu: { group: "Pneumatic", label: menuLabel },
  typeParam,
  controls: "fluid",
  readouts: "fluid",
  actionChoice: true,
  valveChoice: true,
  configLabel: (a, f) => (a === "double-acting" ? "Double acting, fails in place" : `Spring return, ${failWord(f)}`),
  actionText: {
    sr: "Air drives one direction against a spring. The spring drives the other direction and provides the fail action.",
    da: "Air drives both directions. There is no spring, so there is no stored energy to reach a fail position.",
  },
  noSpringNote: "Fail-open or fail-closed needs stored energy. Add a spring module, or an accumulator and control circuit (not modelled here).",
  supplyChip: { on: "Supply on", off: "Supply lost" },
  energyLabel: "Air flow",
  supply: AIR_SUPPLY("piston"),
  recentTitle: `${title} simulator`,
});

const hydraulic = (title: string, menuLabel: string, typeParam: string): FamilyUi => ({
  ...pneumatic(title, menuLabel, typeParam),
  menu: { group: "Hydraulic", label: menuLabel },
  configLabel: (a, f) => (a === "double-acting" ? "Double acting on a hydraulic power unit, fails in place" : `Spring return on hydraulic supply, ${failWord(f)}`),
  actionText: {
    sr: "Oil drives one direction against a spring. The spring drives the other direction and provides the fail action.",
    da: "Oil drives both directions. There is no spring, so there is no stored energy to reach a fail position.",
  },
  energyLabel: "Oil flow",
  supply: HYD_SUPPLY,
});

const electric = (title: string, menuLabel: string, typeParam: string, label: string, fixedValve = "on a quarter-turn ball valve"): FamilyUi => ({
  title,
  menu: { group: "Electric", label: menuLabel },
  typeParam,
  controls: "electric",
  readouts: "electric",
  actionChoice: false,
  valveChoice: false,
  fixedValve,
  configLabel: () => label,
  actionText: { sr: "", da: "" },
  noSpringNote: "",
  supplyChip: { on: "Power on", off: "Power lost" },
  energyLabel: "Power flow",
  recentTitle: `${title} simulator`,
});

const gas = (title: string, menuLabel: string, typeParam: string, overOil: boolean): FamilyUi => ({
  title,
  menu: { group: "Gas", label: menuLabel },
  typeParam,
  controls: "gas",
  readouts: "gas",
  actionChoice: true,
  valveChoice: true,
  configLabel: (a, f) =>
    overOil
      ? a === "double-acting"
        ? "Double acting, gas pressure on oil, line-break and low-pressure close"
        : `Spring return, gas over oil, ${failWord(f)}`
      : a === "double-acting"
        ? "Double acting on pipeline gas, line-break close"
        : `Spring return on pipeline gas, ${failWord(f)}`,
  actionText: {
    sr: "Gas drives one direction against a spring. The spring drives the other direction and provides the fail action.",
    da: overOil
      ? "Gas pushes oil to either side of the piston. With no spring, stored gas is what closes the valve after a trip."
      : "Gas drives both directions. With no spring, the reserve tank is the stored energy that closes the valve after a line break.",
  },
  noSpringNote: "Loss of power gas leaves the valve in place. The line-break control is what drives it closed, using stored gas.",
  supplyChip: { on: "Gas on", off: "Gas isolated" },
  energyLabel: overOil ? "Oil flow" : "Gas flow",
  recentTitle: `${title} simulator`,
});

export const FAMILY_UI: Record<ActuatorFamilyId, FamilyUi> = {
  "pneumatic-scotch-yoke": pneumatic("Pneumatic Scotch yoke", "Scotch yoke", null),
  "pneumatic-rack-pinion": pneumatic("Pneumatic rack and pinion", "Rack and pinion", "rack-pinion"),
  "pneumatic-vane": {
    ...pneumatic("Pneumatic vane", "Vane", "pneumatic-vane"),
    actionChoice: false,
    configLabel: () => "Single vane, double acting, fails in place",
    standardFinish: "Green (std)",
    noSpringNote: "Double acting: air drives the vane both ways and it fails in place. Spring-return vane actuators add a separate spring module, which is not modelled here.",
    supply: AIR_SUPPLY("vane"),
  },
  "electric-part-turn": electric("Electric part-turn", "Intelligent part-turn", "electric-part-turn", "Motor and self-locking worm gear, fails in place"),
  "electric-multi-turn": electric("Electric multi-turn", "Intelligent multi-turn", "electric-multi-turn", "Motor, worm gear and stem nut, fails in place", "on a rising-stem wedge gate valve"),
  "electric-compact-part-turn": electric(
    "Compact electric part-turn",
    "Compact part-turn",
    "electric-compact-part-turn",
    "Two-stage self-locking gearing with cam limit and torque switches, fails in place",
  ),
  "gas-scotch-yoke": gas("Direct gas Scotch yoke", "Direct gas (high pressure)", "gas-scotch-yoke", false),
  "gas-over-oil": gas("Gas-over-oil Scotch yoke", "Gas over oil", "gas-over-oil", true),
  "hydraulic-scotch-yoke": hydraulic("Hydraulic Scotch yoke", "Scotch yoke", "hydraulic-scotch-yoke"),
  "hydraulic-rack-pinion": hydraulic("Hydraulic rack and pinion", "Rack and pinion (large)", "hydraulic-rack-pinion"),
  "electro-hydraulic": {
    title: "Electro-hydraulic Scotch yoke",
    menu: { group: "Electro-hydraulic", label: "With integral controller" },
    typeParam: "electro-hydraulic",
    controls: "electro-hydraulic",
    readouts: "electro-hydraulic",
    actionChoice: true,
    valveChoice: true,
    configLabel: (a, f) => (a === "double-acting" ? "Motor-driven pump, double acting, fails in place" : `Motor-driven pump against a spring, ${failWord(f)}`),
    actionText: {
      sr: "The pump drives one direction against a spring. The dump valve lets the spring drive the other direction, and gives the fail action.",
      da: "The pump drives both directions through a directional valve. There is no spring, so it fails in place.",
    },
    noSpringNote: "Fail-open or fail-closed needs stored energy. Without a spring, the pump stops and the valve stays put.",
    supplyChip: { on: "Power on", off: "Power lost" },
    energyLabel: "Oil flow",
    recentTitle: "Electro-hydraulic simulator",
  },
  // Catalogue entry that opens the multi-turn simulator; never shown as its own type.
  "rising-stem-linear": { ...pneumatic("Rising-stem linear", "Rising stem", "rising-stem-linear"), menu: undefined },
};

export const MENU_GROUPS: MenuGroup[] = ["Pneumatic", "Electric", "Gas", "Hydraulic", "Electro-hydraulic"];

/** Family for a `?type=` value (unknown or missing: pneumatic Scotch yoke). */
export function familyFromType(type: string | null): ActuatorFamilyId {
  const hit = (Object.keys(FAMILY_UI) as ActuatorFamilyId[]).find((f) => FAMILY_UI[f].menu && FAMILY_UI[f].typeParam === type);
  return hit ?? "pneumatic-scotch-yoke";
}

/** Simulator URL for a family, optionally with query parameters. */
export function simulatorHref(family: ActuatorFamilyId, params?: URLSearchParams) {
  const p = new URLSearchParams(params);
  const t = FAMILY_UI[family].typeParam;
  if (t) p.set("type", t);
  else p.delete("type");
  return `/simulator${p.size ? `?${p}` : ""}`;
}

/** Pressure in model force units that drives the torque chart. */
export function modelPressure(s: SimulationState) {
  const ui = FAMILY_UI[s.config.family];
  if (ui.readouts === "gas") return pipelineToModel(s.gas.tank);
  return s.supplyPressure * (ui.supply?.scale ?? 1);
}

/** Word for the powered stroke and its torque: "Air" only for instrument air. */
export function poweredWord(family: ActuatorFamilyId) {
  const e = FAMILY_UI[family].energyLabel;
  return e === "Air flow" ? "Air" : e === "Gas flow" ? "Gas" : e === "Oil flow" ? "Oil" : "Motor";
}

/** Shareable link that reopens the simulator in the current setup. */
export function setupHref(s: SimulationState) {
  const ui = FAMILY_UI[s.config.family];
  const p = new URLSearchParams();
  if (ui.actionChoice) {
    if (s.config.actionType === "double-acting") p.set("action", "double-acting");
    else if (s.config.failPosition === "fail-open") p.set("fail", "open");
  }
  if (ui.valveChoice && s.config.valve && s.config.valve !== "ball") p.set("valve", s.config.valve);
  if (s.config.yoke === "canted") p.set("yoke", "canted");
  if (s.mode !== "normal") p.set("mode", s.mode);
  if (s.explode >= 0.5) p.set("explode", "1");
  return simulatorHref(s.config.family, p);
}
