/**
 * Compact electromechanical part-turn geometry (layout after the public Noah
 * NA brochure: two-stage self-locking gearing, cam limit switches, mechanical
 * torque switch, domed indicator, side handwheel). Proportions are original.
 * Output axis = world Y; worm along X behind the output (-Z).
 */
export const CPT = {
  case: { centre: [0.05, 0.08, -0.04] as const, size: [0.6, 0.46, 0.52] as const },
  base: { top: -0.15, bottom: -0.3, half: 0.2 },
  worm: { y: 0.0, z: -0.19, pitchRadius: 0.045, threadLength: 0.22, x0: -0.3, x1: 0.31 },
  wheel: { pitchRadius: 0.145, thickness: 0.08, teeth: 40, y: 0.0, extra: 0.3 },
  spur: { x: 0.29, gearRadius: 0.1, pinionRadius: 0.04, teethGear: 30, teethPinion: 12 },
  motor: { y: 0.14, z: -0.19, x0: -0.06, x1: 0.26, radius: 0.085 },
  cams: { yOpen: 0.17, yClose: 0.215, radius: 0.05, switchX: 0.115 },
  dome: { y: 0.31, radius: 0.13 },
  handwheel: { x: -0.4, radius: 0.17 },
} as const;

/** Worm turns per 90° (single start: wheel teeth / 4). */
export const CPT_WORM_TURNS = CPT.wheel.teeth / 4;
export const CPT_SPUR_RATIO = CPT.spur.gearRadius / CPT.spur.pinionRadius;

export function cptOutputRotationY(stroke: number): number {
  return Math.PI / 4 - stroke * (Math.PI / 2);
}
export function cptWormRotation(stroke: number): number {
  return stroke * CPT_WORM_TURNS * Math.PI * 2;
}
