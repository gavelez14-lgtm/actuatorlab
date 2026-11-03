/**
 * Simplified, mechanically coherent reference geometry for a pneumatic
 * Scotch yoke actuator.
 *
 * EDUCATIONAL REPRESENTATION ONLY. These are original proportions chosen so
 * the mechanism reads clearly. They are not any manufacturer's dimensions and do
 * not reproduce any proprietary internal geometry.
 *
 * Coordinate frame (scene units, Y up):
 *  - Output shaft axis = world Y axis through the origin.
 *  - Guide-bar / piston-rod axis = line parallel to X at z = -YOKE_OFFSET, y = 0.
 *  - Pneumatic cylinder on +X side, spring module (if fitted) on -X side.
 *  - Valve hangs below the actuator; pipe runs along Z.
 */

/** Perpendicular distance from shaft axis to the pin travel line. */
export const YOKE_OFFSET = 0.55;
/** Yoke swing either side of centre (symmetric yoke). 90 deg total. */
export const HALF_SWING = Math.PI / 4;
/** Pin travel along X at the stroke ends: +/- d * tan(45deg) = +/- d. */
export const PIN_TRAVEL = YOKE_OFFSET * Math.tan(HALF_SWING);

export const HOUSING = {
  halfX: 0.95,
  zFront: 0.32,
  zBack: -1.12,
  halfY: 0.3,
} as const;

export const CYLINDER = {
  innerCapStart: HOUSING.halfX, // 0.95
  innerCapThickness: 0.1,
  tubeStart: HOUSING.halfX + 0.1, // 1.05
  tubeEnd: 2.29,
  outerCapThickness: 0.1,
  boreRadius: 0.34,
  outerRadius: 0.38,
} as const;

export const PISTON = {
  thickness: 0.12,
  radius: CYLINDER.boreRadius - 0.01,
  /** Distance from pin centre to piston centre along X. */
  rodLength: 1.66,
  rodRadius: 0.055,
} as const;

export const SPRING_MODULE = {
  adaptorStart: -HOUSING.halfX, // -0.95
  adaptorThickness: 0.1,
  canisterStart: -HOUSING.halfX - 0.1, // -1.05 (spring seat)
  canisterEnd: -2.85,
  capThickness: 0.1,
  radius: 0.42,
  plateThickness: 0.1,
  plateRadius: 0.36,
  /** Distance from pin centre to spring plate centre along X. */
  rodLength: 2.2,
  coilMeanRadius: 0.3,
  wireRadius: 0.042,
  turns: 6,
} as const;

export const YOKE = {
  hubRadius: 0.17,
  hubHeight: 0.46,
  plateY: 0.165,
  plateThickness: 0.05,
  plateWidth: 0.32,
  plateLength: 1.0,
  slotStart: 0.4,
  slotEnd: 0.93,
  slotWidth: 0.1,
} as const;

export const PIN = { radius: 0.044, height: 0.44 } as const;
export const GUIDE_BLOCK = { sizeX: 0.3, sizeY: 0.24, sizeZ: 0.26 } as const;
export const GUIDE_BAR = { z: -YOKE_OFFSET - 0.24, radius: 0.045 } as const;

export const SHAFT = { radius: 0.085, top: 0.44, bottom: -0.92 } as const;

export const BRACKET = { top: -HOUSING.halfY, bottom: -0.86, halfX: 0.34, halfZ: 0.3 } as const;

export const VALVE = {
  centerY: -1.48,
  bodyRadius: 0.5,
  ballRadius: 0.36,
  boreRadius: 0.2,
  pipeRadius: 0.26,
  flangeRadius: 0.46,
  bodyHalfLength: 0.62,
  pipeHalfLength: 1.25,
} as const;

/** Helpers --------------------------------------------------------------- */

/** Yoke angle from centreline (radians) for a given stroke 0..1. */
export function yokeAngleFromStroke(stroke: number): number {
  return -HALF_SWING + stroke * 2 * HALF_SWING;
}

/**
 * Pin X position. The pin is constrained to the guide line z = -d, and also
 * to the yoke slot (a radial line from the shaft). Intersection gives
 * x = d * tan(phi).
 */
export function pinXFromStroke(stroke: number): number {
  return YOKE_OFFSET * Math.tan(yokeAngleFromStroke(stroke));
}

/** Radial distance from shaft to pin, i.e. where the pin sits in the slot. */
export function pinRadiusFromStroke(stroke: number): number {
  return YOKE_OFFSET / Math.cos(yokeAngleFromStroke(stroke));
}

/** Piston centre X. */
export function pistonXFromStroke(stroke: number): number {
  return pinXFromStroke(stroke) + PISTON.rodLength;
}

/** Spring plate centre X. */
export function springPlateXFromStroke(stroke: number): number {
  return pinXFromStroke(stroke) - SPRING_MODULE.rodLength;
}

/** Free length of the spring (seat to plate face). */
export function springLengthFromStroke(stroke: number): number {
  const plateInnerFace = springPlateXFromStroke(stroke) + SPRING_MODULE.plateThickness / 2;
  return SPRING_MODULE.canisterStart - plateInnerFace;
}

/**
 * Three.js Y-rotation for the yoke and output shaft.
 * The yoke is modelled with its arm along local -Z. Rotating by beta about Y
 * maps (0,0,-1) to (-sin beta, 0, -cos beta). We need the arm to point at the
 * pin (sin phi, 0, -cos phi), therefore beta = -phi.
 */
export function shaftRotationY(stroke: number): number {
  return -yokeAngleFromStroke(stroke);
}

/**
 * Scotch-yoke lever arm factor. For a force F along the guide line, shaft
 * torque T = F * d / cos^2(phi). This is the textbook relation that gives the
 * characteristic "U-shaped" symmetric yoke torque curve.
 */
export function leverFactor(stroke: number): number {
  const c = Math.cos(yokeAngleFromStroke(stroke));
  return YOKE_OFFSET / (c * c);
}

/** Static mechanical sanity check, used by tests and in development. */
export function checkGeometry(): string[] {
  const issues: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const s = i / 20;
    const px = pistonXFromStroke(s);
    const pistonMin = px - PISTON.thickness / 2;
    const pistonMax = px + PISTON.thickness / 2;
    if (pistonMin < CYLINDER.tubeStart - 1e-6) issues.push(`piston hits inner cap at s=${s}`);
    if (pistonMax > CYLINDER.tubeEnd + 1e-6) issues.push(`piston hits outer cap at s=${s}`);
    const r = pinRadiusFromStroke(s);
    if (r - PIN.radius < YOKE.slotStart || r + PIN.radius > YOKE.slotEnd)
      issues.push(`pin leaves yoke slot at s=${s}`);
    const blockMax = pinXFromStroke(s) + GUIDE_BLOCK.sizeX / 2;
    if (Math.abs(blockMax) > HOUSING.halfX) issues.push(`guide block leaves housing at s=${s}`);
    const L = springLengthFromStroke(s);
    if (L < SPRING_MODULE.turns * SPRING_MODULE.wireRadius * 2)
      issues.push(`spring goes solid at s=${s}`);
    const plateOuter = springPlateXFromStroke(s) - SPRING_MODULE.plateThickness / 2;
    if (plateOuter < SPRING_MODULE.canisterEnd) issues.push(`spring plate hits end cap at s=${s}`);
  }
  return issues;
}
