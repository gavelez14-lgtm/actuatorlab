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
  innerCapThickness: 0.08,
  tubeStart: HOUSING.halfX + 0.08, // 1.03: room for the longer pin travel of a canted yoke
  tubeEnd: 2.31,
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
  radius: 0.5, // spring cans are photographed noticeably larger in diameter than the cylinder
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

/**
 * Yoke kinematics. A symmetric yoke swings 45 deg either side of square to
 * the guide line. A canted yoke offsets that swing by `cant`, so the torque
 * peak moves to one end. To keep the pin travel inside the same cylinder,
 * the bore is a little longer than a symmetric yoke needs, and the piston and
 * spring attach with a `shift` that centres the asymmetric pin travel.
 * The yoke and shaft turn by (phi + cant); the valve coupling is keyed with
 * the opposite offset, so the valve still turns exactly 0..90 deg.
 */
export interface YokeKinematics {
  /** Perpendicular offset from shaft axis to the pin travel line. */
  d: number;
  /** Swing offset, radians (0 for symmetric). */
  cant: number;
  /** Extra X offset of piston and spring plate relative to the pin. */
  shift: number;
}

export const CANT_ANGLE = (6 * Math.PI) / 180;
export const SYMMETRIC: YokeKinematics = { d: YOKE_OFFSET, cant: 0, shift: 0 };

/**
 * Kinematics for a configuration. The cant always favours the valve-closed
 * end (break-out and re-seat); with a fail-open coupling that is stroke 1.
 */
export function yokeKinematics(config: { yoke?: "symmetric" | "canted"; actionType: string; failPosition: string }): YokeKinematics {
  if (config.yoke !== "canted") return SYMMETRIC;
  const closedAtStrokeEnd = config.actionType === "spring-return" && config.failPosition === "fail-open";
  const cant = closedAtStrokeEnd ? CANT_ANGLE : -CANT_ANGLE;
  const d = YOKE_OFFSET;
  // Centre the asymmetric pin travel on the cylinder: travel grows by 1/cos(2*cant).
  const t0 = Math.tan(-HALF_SWING + cant);
  const t1 = Math.tan(HALF_SWING + cant);
  return { d, cant, shift: -(d * (t0 + t1)) / 2 };
}

/** Swing angle phi from mid-stroke (radians) for a given stroke 0..1, before cant. */
export function yokeAngleFromStroke(stroke: number): number {
  return -HALF_SWING + stroke * 2 * HALF_SWING;
}

/** Yoke angle from square to the guide line, including cant. */
export function yokeArmAngle(stroke: number, k: YokeKinematics = SYMMETRIC): number {
  return yokeAngleFromStroke(stroke) + k.cant;
}

/**
 * Pin X position. The pin is constrained to the guide line z = -d, and also
 * to the yoke slot (a radial line from the shaft). Intersection gives
 * x = d * tan(psi), psi the yoke arm angle.
 */
export function pinXFromStroke(stroke: number, k: YokeKinematics = SYMMETRIC): number {
  return k.d * Math.tan(yokeArmAngle(stroke, k));
}

/** Radial distance from shaft to pin, i.e. where the pin sits in the slot. */
export function pinRadiusFromStroke(stroke: number, k: YokeKinematics = SYMMETRIC): number {
  return k.d / Math.cos(yokeArmAngle(stroke, k));
}

/** Piston centre X. */
export function pistonXFromStroke(stroke: number, k: YokeKinematics = SYMMETRIC): number {
  return pinXFromStroke(stroke, k) + k.shift + PISTON.rodLength;
}

/** Spring plate centre X. */
export function springPlateXFromStroke(stroke: number, k: YokeKinematics = SYMMETRIC): number {
  return pinXFromStroke(stroke, k) + k.shift - SPRING_MODULE.rodLength;
}

/** Free length of the spring (seat to plate face). */
export function springLengthFromStroke(stroke: number, k: YokeKinematics = SYMMETRIC): number {
  const plateInnerFace = springPlateXFromStroke(stroke, k) + SPRING_MODULE.plateThickness / 2;
  return SPRING_MODULE.canisterStart - plateInnerFace;
}

/**
 * Three.js Y-rotation for the yoke and output shaft.
 * The yoke is modelled with its arm along local -Z. Rotating by beta about Y
 * maps (0,0,-1) to (-sin beta, 0, -cos beta). We need the arm to point at the
 * pin (sin psi, 0, -cos psi), therefore beta = -psi.
 */
export function shaftRotationY(stroke: number, k: YokeKinematics = SYMMETRIC): number {
  return -yokeArmAngle(stroke, k);
}

/**
 * Scotch-yoke lever arm factor. For a force F along the guide line, shaft
 * torque T = F * d / cos^2(psi). Symmetric: the U-shaped curve; canted: the
 * same law over an offset swing, so the peak moves to one end.
 */
export function leverFactor(stroke: number, k: YokeKinematics = SYMMETRIC): number {
  const c = Math.cos(yokeArmAngle(stroke, k));
  return k.d / (c * c);
}

/** Static mechanical sanity check, used by tests and in development. */
export function checkGeometry(k: YokeKinematics = SYMMETRIC): string[] {
  const issues: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const s = i / 20;
    const px = pistonXFromStroke(s, k);
    const pistonMin = px - PISTON.thickness / 2;
    const pistonMax = px + PISTON.thickness / 2;
    if (pistonMin < CYLINDER.tubeStart - 1e-6) issues.push(`piston hits inner cap at s=${s}`);
    if (pistonMax > CYLINDER.tubeEnd + 1e-6) issues.push(`piston hits outer cap at s=${s}`);
    const r = pinRadiusFromStroke(s, k);
    if (r - PIN.radius < YOKE.slotStart || r + PIN.radius > YOKE.slotEnd)
      issues.push(`pin leaves yoke slot at s=${s}`);
    const blockEdge = Math.abs(pinXFromStroke(s, k)) + GUIDE_BLOCK.sizeX / 2;
    if (blockEdge > HOUSING.halfX) issues.push(`guide block leaves housing at s=${s}`);
    const L = springLengthFromStroke(s, k);
    if (L < SPRING_MODULE.turns * SPRING_MODULE.wireRadius * 2)
      issues.push(`spring goes solid at s=${s}`);
    const plateOuter = springPlateXFromStroke(s, k) - SPRING_MODULE.plateThickness / 2;
    if (plateOuter < SPRING_MODULE.canisterEnd) issues.push(`spring plate hits end cap at s=${s}`);
  }
  return issues;
}
