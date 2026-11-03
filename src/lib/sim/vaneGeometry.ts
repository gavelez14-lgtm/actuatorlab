/**
 * Single-vane rotary actuator: original, illustrative proportions.
 *
 * A vane fixed to the output shaft swings inside a sector-shaped chamber.
 * Air on one face of the vane gives torque T = p * A * r_mean, constant
 * through travel. The vane points along local -Z at mid-stroke and turns
 * about Y, like the Scotch yoke's arm.
 */
export const VANE = {
  /** Drum outer radius and half height (bottom face meets the bracket top). */
  drumR: 0.58,
  halfY: 0.3,
  /** Chamber radii and height. */
  hubR: 0.13,
  chamberR: 0.5,
  chamberHalfY: 0.22,
  /** Vane angular half-width (rad) and thickness. */
  vaneHalf: 0.07,
  /** Chamber spans the 90 deg swing plus the vane width plus a small end clearance. */
  clearance: 0.04,
} as const;

/** Vane angle from mid-stroke, radians: -45 deg at stroke 0, +45 deg at stroke 1. */
export function vaneAngle(stroke: number) {
  return -Math.PI / 4 + stroke * (Math.PI / 2);
}

/** Chamber wall angles (rad, same convention as vaneAngle). */
export const CHAMBER_A0 = -Math.PI / 4 - VANE.vaneHalf - VANE.clearance;
export const CHAMBER_B1 = Math.PI / 4 + VANE.vaneHalf + VANE.clearance;

/** Vane must never touch a chamber wall. */
export function checkVaneGeometry(): string[] {
  const issues: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const a = vaneAngle(i / 20);
    if (a - VANE.vaneHalf < CHAMBER_A0 - 1e-9) issues.push(`vane hits wall A at ${i / 20}`);
    if (a + VANE.vaneHalf > CHAMBER_B1 + 1e-9) issues.push(`vane hits wall B at ${i / 20}`);
  }
  return issues;
}
