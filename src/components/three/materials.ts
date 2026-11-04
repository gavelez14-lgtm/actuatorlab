import * as THREE from "three";
import type { ComponentId, CutawayStyle, PaintFinish } from "@/lib/sim/types";

/**
 * Per-component materials. Each clickable component gets its own material
 * instances so highlighting one never tints another. Shell materials also
 * carry the cutaway behaviour (ghost transparency or section clipping).
 */

export const HIGHLIGHT = new THREE.Color("#E8641B");

type MatSpec = {
  color: string;
  metalness: number;
  roughness: number;
  component: ComponentId | null;
  shell?: boolean;
  side?: THREE.Side;
};

const SPECS = {
  housing: { color: "#525A65", metalness: 0.35, roughness: 0.55, component: "housing", shell: true },
  housingTrim: { color: "#3C434C", metalness: 0.4, roughness: 0.5, component: "housing", shell: true },
  // Cylinder tubes are painted with the body on heavy-duty units (as photographed in the brochures).
  cylinder: { color: "#525A65", metalness: 0.35, roughness: 0.5, component: "cylinder", shell: true },
  endCaps: { color: "#5A626D", metalness: 0.4, roughness: 0.5, component: "end-caps", shell: true },
  tieRods: { color: "#9AA2AB", metalness: 0.9, roughness: 0.25, component: "end-caps" },
  // Silver anodised extruded aluminium, as documented for compact twin-piston bodies.
  rpBody: { color: "#B9C0C7", metalness: 0.7, roughness: 0.38, component: "housing", shell: true },
  // Die-cast end caps in black epoxy (RAL 9005) by default.
  rpEndCaps: { color: "#1B1D20", metalness: 0.25, roughness: 0.55, component: "end-caps", shell: true },
  stainless: { color: "#C4CAD0", metalness: 0.95, roughness: 0.22, component: "end-caps" },
  // Vane outer cases: polyester powder coat, documented standard green RAL 6018.
  vaneCase: { color: "#57A639", metalness: 0.15, roughness: 0.6, component: "housing", shell: true },
  // Electro-hydraulic module: tagged with its own components so highlight and isolate work.
  ehController: { color: "#525A65", metalness: 0.35, roughness: 0.5, component: "controller" },
  ehReservoir: { color: "#525A65", metalness: 0.35, roughness: 0.55, component: "power-unit" },
  ehMotor: { color: "#4B525C", metalness: 0.45, roughness: 0.5, component: "power-unit" },
  // Dome position indicators as photographed: yellow on the twin-piston unit, red on the vane unit.
  domeYellow: { color: "#F2C21B", metalness: 0.05, roughness: 0.35, component: "output-shaft" },
  domeRed: { color: "#C8352B", metalness: 0.05, roughness: 0.35, component: "output-shaft" },
  domeBlack: { color: "#1C1E21", metalness: 0.1, roughness: 0.5, component: "output-shaft" },
  vaneFixings: { color: "#C4CAD0", metalness: 0.95, roughness: 0.22, component: "housing" },
  vaneStops: { color: "#C4CAD0", metalness: 0.95, roughness: 0.22, component: "travel-stops" },
  nameplate: { color: "#D9DDE1", metalness: 0.85, roughness: 0.35, component: "housing" },
  rack: { color: "#C8CED4", metalness: 0.95, roughness: 0.22, component: "rack" },
  pinion: { color: "#B4BBC3", metalness: 0.95, roughness: 0.25, component: "pinion" },
  stopBolt: { color: "#9AA2AB", metalness: 0.9, roughness: 0.25, component: "travel-stops" },
  motor: { color: "#4B525C", metalness: 0.45, roughness: 0.5, component: "motor", shell: true },
  rotor: { color: "#B87333", metalness: 0.85, roughness: 0.35, component: "motor" },
  worm: { color: "#C9CFD5", metalness: 0.95, roughness: 0.2, component: "worm" },
  wormWheel: { color: "#B48A55", metalness: 0.85, roughness: 0.35, component: "worm-wheel" },
  handwheel: { color: "#3F464F", metalness: 0.6, roughness: 0.4, component: "handwheel" },
  torqueSensor: { color: "#7FA7C9", metalness: 0.5, roughness: 0.4, component: "torque-sensor" },
  encoder: { color: "#9EC79A", metalness: 0.3, roughness: 0.5, component: "encoder" },
  controlCover: { color: "#4B525C", metalness: 0.4, roughness: 0.5, component: "local-controls", shell: true },
  knob: { color: "#24282E", metalness: 0.2, roughness: 0.6, component: "local-controls" },
  selectorKnob: { color: "#C8352B", metalness: 0.15, roughness: 0.5, component: "local-controls" },
  bezel: { color: "#C9CED3", metalness: 0.9, roughness: 0.25, component: "local-controls" },
  terminalBox: { color: "#454C55", metalness: 0.4, roughness: 0.5, component: "terminal", shell: true },
  cable: { color: "#1E2227", metalness: 0, roughness: 0.8, component: "terminal" },
  gate: { color: "#C3CAD1", metalness: 0.5, roughness: 0.38, component: "gate" },
  lever: { color: "#E6E9EC", metalness: 0.2, roughness: 0.5, component: "handwheel", shell: true },
  stemNut: { color: "#B48A55", metalness: 0.85, roughness: 0.35, component: "stem-nut" },
  thrustBase: { color: "#3C434C", metalness: 0.4, roughness: 0.5, component: "thrust-base", shell: true },
  coverTube: { color: "#8E969F", metalness: 0.8, roughness: 0.3, component: "stem-cover", shell: true },
  bonnet: { color: "#545A62", metalness: 0.45, roughness: 0.6, component: "bonnet", shell: true, side: THREE.DoubleSide },
  spurGear: { color: "#C9A66B", metalness: 0.85, roughness: 0.3, component: "spur-gears" },
  cam: { color: "#BFC6CD", metalness: 0.9, roughness: 0.25, component: "limit-switches" },
  switchBody: { color: "#2A2E34", metalness: 0.2, roughness: 0.6, component: "limit-switches" },
  switchLever: { color: "#E3B341", metalness: 0.3, roughness: 0.5, component: "limit-switches" },
  torqueSwitch: { color: "#7FA7C9", metalness: 0.5, roughness: 0.4, component: "torque-switch" },
  dome: { color: "#DCE7F0", metalness: 0, roughness: 0.05, component: "dome-indicator" },
  domeDisc: { color: "#F1F3F5", metalness: 0, roughness: 0.6, component: "dome-indicator" },
  domeArrow: { color: "#FF9F0A", metalness: 0, roughness: 0.5, component: "dome-indicator" },
  piston: { color: "#8C959E", metalness: 0.8, roughness: 0.35, component: "piston" },
  pistonSeal: { color: "#1E2126", metalness: 0, roughness: 0.8, component: "piston" },
  rod: { color: "#D8DDE2", metalness: 1, roughness: 0.14, component: "connecting-mechanism" },
  block: { color: "#7D8690", metalness: 0.7, roughness: 0.38, component: "connecting-mechanism" },
  guideBar: { color: "#ADB4BB", metalness: 0.95, roughness: 0.2, component: "guide-bar" },
  yoke: { color: "#8A939D", metalness: 0.7, roughness: 0.32, component: "yoke" },
  pin: { color: "#E4E7EA", metalness: 1, roughness: 0.12, component: "pin" },
  shaft: { color: "#C5CBD1", metalness: 0.95, roughness: 0.2, component: "output-shaft" },
  indicator: { color: "#262A30", metalness: 0.2, roughness: 0.6, component: "output-shaft" },
  indicatorStripe: { color: "#F1F3F5", metalness: 0, roughness: 0.5, component: "output-shaft" },
  spring: { color: "#C49A2C", metalness: 0.35, roughness: 0.45, component: "spring", side: THREE.DoubleSide },
  canister: { color: "#525A65", metalness: 0.35, roughness: 0.55, component: "spring", shell: true },
  springPlate: { color: "#7C858E", metalness: 0.7, roughness: 0.35, component: "spring" },
  bracket: { color: "#454C55", metalness: 0.45, roughness: 0.5, component: "bracket" },
  stem: { color: "#A9B1B9", metalness: 0.95, roughness: 0.22, component: "stem" },
  valveBody: { color: "#545A62", metalness: 0.45, roughness: 0.6, component: "valve-body", shell: true, side: THREE.DoubleSide },
  ball: { color: "#E9ECEF", metalness: 1, roughness: 0.08, component: "ball", side: THREE.DoubleSide },
  seat: { color: "#E2DDD0", metalness: 0, roughness: 0.7, component: "valve-body" },
  bore: { color: "#3A4855", metalness: 0.6, roughness: 0.35, component: "ball", side: THREE.DoubleSide },
  pipe: { color: "#6C737B", metalness: 0.5, roughness: 0.55, component: null, side: THREE.DoubleSide },
  tubing: { color: "#2C7DB5", metalness: 0.1, roughness: 0.45, component: null },
  fitting: { color: "#B9A06A", metalness: 0.85, roughness: 0.3, component: null },
  controlBlock: { color: "#40464F", metalness: 0.4, roughness: 0.5, component: null },
  hydCylinder: { color: "#AEB5BD", metalness: 0.85, roughness: 0.3, component: "hydraulic-override", shell: true },
  hydPiston: { color: "#C9A66B", metalness: 0.8, roughness: 0.35, component: "hydraulic-override" },
  oil: { color: "#C98A1B", metalness: 0, roughness: 0.4, component: "hydraulic-override" },
  pumpBody: { color: "#3C434C", metalness: 0.45, roughness: 0.5, component: "hand-pump" },
  pumpLever: { color: "#C9CED3", metalness: 0.9, roughness: 0.25, component: "hand-pump" },
  gasTank: { color: "#525A65", metalness: 0.35, roughness: 0.55, component: "gas-tank" },
  // Gas control cabinets are photographed in stainless steel.
  gasControl: { color: "#C3C8CD", metalness: 0.85, roughness: 0.3, component: "gas-controls" },
  gaugeFace: { color: "#F1F3F5", metalness: 0, roughness: 0.6, component: "gas-controls" },
  gaugeNeedle: { color: "#C8352B", metalness: 0.1, roughness: 0.5, component: "gas-controls" },
  gasLine: { color: "#B9A06A", metalness: 0.85, roughness: 0.3, component: "gas-controls" },
} satisfies Record<string, MatSpec>;

export type MaterialKey = keyof typeof SPECS;
export type MaterialSet = Record<MaterialKey, THREE.MeshStandardMaterial>;

/** Keep upper half (y < SECTION_Y) of shells in section mode. */
export const SECTION_PLANE = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.02);
/** Valve body is always shown as a training cutaway: front half (x > 0) removed. */
export const VALVE_SECTION_PLANE = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);

export function createMaterials(): MaterialSet {
  const out = {} as MaterialSet;
  for (const [key, spec] of Object.entries(SPECS) as [MaterialKey, MatSpec][]) {
    const m = new THREE.MeshStandardMaterial({
      color: spec.color,
      metalness: spec.metalness,
      roughness: spec.roughness,
      side: spec.side ?? (spec.shell ? THREE.DoubleSide : THREE.FrontSide),
    });
    m.userData = { component: spec.component, shell: !!spec.shell, baseColor: spec.color };
    out[key] = m;
  }
  out.valveBody.clippingPlanes = [VALVE_SECTION_PLANE];
  out.pipe.clippingPlanes = [VALVE_SECTION_PLANE];
  out.bonnet.clippingPlanes = [VALVE_SECTION_PLANE];
  out.dome.transparent = true;
  out.dome.opacity = 0.28;
  out.dome.depthWrite = false;
  for (const m of Object.values(out)) m.userData.base = { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite };
  return out;
}

export function disposeMaterials(set: MaterialSet) {
  Object.values(set).forEach((m) => m.dispose());
}

/** Apply selection / hover emphasis. */
export function applyHighlight(set: MaterialSet, selected: ComponentId | null, hovered: ComponentId | null) {
  for (const m of Object.values(set)) {
    const c = m.userData.component as ComponentId | null;
    if (c && c === selected) {
      m.emissive.copy(HIGHLIGHT);
      m.emissiveIntensity = 0.55;
    } else if (c && c === hovered) {
      m.emissive.copy(HIGHLIGHT);
      m.emissiveIntensity = 0.18;
    } else {
      m.emissive.setRGB(0, 0, 0);
      m.emissiveIntensity = 0;
    }
  }
}

/**
 * Isolate: dim every part except `selected`. Runs after applyCutaway, so shell
 * materials restore to their cutaway state and the rest to their base state.
 */
export function applyIsolate(set: MaterialSet, selected: ComponentId | null) {
  for (const m of Object.values(set)) {
    const c = m.userData.component as ComponentId | null;
    const dim = selected !== null && c !== selected;
    if (dim) {
      if (!m.transparent) m.needsUpdate = true;
      m.transparent = true;
      m.opacity = Math.min(m.opacity, 0.08);
      m.depthWrite = false;
    } else if (!m.userData.shell) {
      const b = m.userData.base as { transparent: boolean; opacity: number; depthWrite: boolean };
      if (m.transparent !== b.transparent) m.needsUpdate = true;
      m.transparent = b.transparent;
      m.opacity = b.opacity;
      m.depthWrite = b.depthWrite;
    }
  }
}

/** Apply cutaway style to shell materials (housing, cylinder, end caps, canister). */
export function applyCutaway(set: MaterialSet, style: CutawayStyle, opacity: number) {
  for (const [key, m] of Object.entries(set) as [MaterialKey, THREE.MeshStandardMaterial][]) {
    if (!m.userData.shell) continue;
    const isValve = key === "valveBody" || key === "bonnet";
    const wantTransparent = style === "ghost";
    const planes = isValve
      ? style === "section"
        ? [VALVE_SECTION_PLANE, SECTION_PLANE]
        : [VALVE_SECTION_PLANE]
      : style === "section"
        ? [SECTION_PLANE]
        : [];
    const changed =
      m.transparent !== wantTransparent || (m.clippingPlanes?.length ?? 0) !== planes.length;
    m.transparent = wantTransparent;
    m.opacity = wantTransparent ? opacity : 1;
    m.depthWrite = !wantTransparent;
    m.clippingPlanes = planes;
    if (changed) m.needsUpdate = true;
  }
}

/**
 * Raycast filter so clicks pass through clipped-away geometry
 * and through ghosted shells.
 */
export function makeShellRaycast(getPlanes: () => THREE.Plane[], isGhost: () => boolean) {
  return function (this: THREE.Mesh, raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    if (isGhost()) return;
    const tmp: THREE.Intersection[] = [];
    THREE.Mesh.prototype.raycast.call(this, raycaster, tmp);
    const planes = getPlanes();
    for (const hit of tmp) {
      if (planes.every((p) => p.distanceToPoint(hit.point) >= 0)) intersects.push(hit);
    }
  };
}

/** Painted enclosure parts and their per-finish colours. */
const PAINTED: MaterialKey[] = ["housing", "housingTrim", "canister", "endCaps", "motor", "controlCover", "terminalBox", "thrustBase", "gasTank", "ehController", "ehReservoir", "ehMotor", "cylinder"];
export const PAINT_COLOURS: Record<PaintFinish, { main: string; trim: string }> = {
  graphite: { main: "#525A65", trim: "#3C434C" },
  red: { main: "#A6231C", trim: "#7E1A15" },
  blue: { main: "#2E5B8A", trim: "#22466B" },
  yellow: { main: "#D29B19", trim: "#9F7512" },
};

/**
 * Rack-and-pinion end caps keep their own finish: black (RAL 9005) as standard,
 * blue (RAL 5015) as the documented option, other finishes as special paint.
 */
const RP_CAP_COLOURS: Record<PaintFinish, string> = {
  graphite: "#1B1D20",
  blue: "#2271B3",
  red: PAINT_COLOURS.red.main,
  yellow: PAINT_COLOURS.yellow.main,
};

/** Vane cases: the standard finish is green (RAL 6018); other finishes are special paint. */
const VANE_CASE_COLOURS: Record<PaintFinish, string> = {
  graphite: "#57A639",
  blue: PAINT_COLOURS.blue.main,
  red: PAINT_COLOURS.red.main,
  yellow: PAINT_COLOURS.yellow.main,
};

/** Standard finishes that are not graphite, by family style (used when "graphite" = standard is chosen). */
export const STANDARD_FINISH: Partial<Record<string, { main: string; trim: string }>> = {
  // Self-contained electro-hydraulic units are photographed in a light grey finish.
  "electro-hydraulic": { main: "#C9CDD1", trim: "#AEB3B8" },
  // Current intelligent electric ranges are photographed in a light silver-grey finish.
  "electric-part-turn": { main: "#CDD1D5", trim: "#B0B5BA" },
  "electric-multi-turn": { main: "#CDD1D5", trim: "#B0B5BA" },
};

export function applyPaint(set: MaterialSet, paint: PaintFinish, family?: string) {
  const std = paint === "graphite" && family ? STANDARD_FINISH[family] : undefined;
  const c = std ?? PAINT_COLOURS[paint];
  for (const key of PAINTED) {
    const trim = key === "housingTrim" || key === "thrustBase";
    set[key].color.set(trim ? c.trim : c.main);
  }
  set.rpEndCaps.color.set(RP_CAP_COLOURS[paint]);
  set.vaneCase.color.set(VANE_CASE_COLOURS[paint]);
}
