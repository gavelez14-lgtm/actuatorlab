import * as THREE from "three";
import type { ComponentId, CutawayStyle } from "@/lib/sim/types";

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
  cylinder: { color: "#B7BEC6", metalness: 0.85, roughness: 0.3, component: "cylinder", shell: true },
  endCaps: { color: "#5A626D", metalness: 0.4, roughness: 0.5, component: "end-caps", shell: true },
  tieRods: { color: "#9AA2AB", metalness: 0.9, roughness: 0.25, component: "end-caps" },
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

/** Apply cutaway style to shell materials (housing, cylinder, end caps, canister). */
export function applyCutaway(set: MaterialSet, style: CutawayStyle, opacity: number) {
  for (const [key, m] of Object.entries(set) as [MaterialKey, THREE.MeshStandardMaterial][]) {
    if (!m.userData.shell) continue;
    const isValve = key === "valveBody";
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
