/**
 * Reference geometry for a twin-piston pneumatic rack-and-pinion actuator.
 *
 * Architecture follows publicly documented features of compact twin-piston
 * designs (for example the Rotork GT range brochure, pub110-019): two opposed
 * pistons with integral racks driving one central pinion, spring cartridges
 * between pistons and end caps for spring return, adjustable end stops,
 * NAMUR accessory interface on top and ISO 5211 valve mounting below.
 *
 * Proportions are ORIGINAL and illustrative. They are not any manufacturer's
 * dimensions and do not reproduce proprietary internal geometry.
 *
 * Frame: pinion axis = world Y through the origin. Pistons travel along X.
 * Piston A (left, -X) carries its rack at +Z; piston B (right, +X) at -Z.
 * Air in the centre chamber drives both pistons outward (stroke 0 -> 1).
 */

export const RP = {
  /** Pinion pitch radius. Linear rack travel for 90° = r * pi/2. */
  pitchRadius: 0.14,
  pinionTeeth: 16,
  pinionHeight: 0.2,
  body: { halfX: 1.05, halfY: 0.31, halfZ: 0.33, boreRadius: 0.265, wall: 0.04 },
  endCapThickness: 0.08,
  piston: { radius: 0.255, thickness: 0.15, innerAtClosed: 0.3 },
  rack: { length: 0.57, height: 0.12, depth: 0.07, toothDepth: 0.03 },
  spring: { coilRadius: 0.07, wireRadius: 0.016, turns: 6, count: 3, ringRadius: 0.135 },
  stopBolt: { radius: 0.03, length: 0.22 },
} as const;

/** Linear travel of each piston for the full 90° stroke. */
export const RP_TRAVEL = RP.pitchRadius * (Math.PI / 2);

/** Inner (centre-facing) face of piston B at a given stroke; piston A mirrors it. */
export function rpPistonInnerX(stroke: number): number {
  return RP.piston.innerAtClosed + stroke * RP_TRAVEL;
}

export function rpPistonCentreX(stroke: number): number {
  return rpPistonInnerX(stroke) + RP.piston.thickness / 2;
}

export function rpPistonOuterX(stroke: number): number {
  return rpPistonInnerX(stroke) + RP.piston.thickness;
}

/** Inside face of the end cap (spring seat). */
export const RP_CAP_INNER_X = RP.body.halfX;

export function rpSpringLength(stroke: number): number {
  return RP_CAP_INNER_X - rpPistonOuterX(stroke);
}

/**
 * Pinion rotation about Y. Same sign convention as the Scotch yoke shaft so
 * the shared valve coupling works unchanged: rack A at +Z moving -X needs a
 * negative rotation, i.e. rot = pi/4 - stroke * pi/2.
 */
export function rpPinionRotationY(stroke: number): number {
  return Math.PI / 4 - stroke * (Math.PI / 2);
}

export function checkRackPinionGeometry(): string[] {
  const issues: string[] = [];
  const solid = RP.spring.turns * RP.spring.wireRadius * 2 + 4 * RP.spring.wireRadius * 2;
  for (let i = 0; i <= 20; i++) {
    const s = i / 20;
    const inner = rpPistonInnerX(s);
    if (inner < RP.pitchRadius + 0.02) issues.push(`piston hits pinion at s=${s}`);
    const outer = rpPistonOuterX(s);
    if (outer > RP_CAP_INNER_X - RP.stopBolt.length / 4) issues.push(`piston hits end cap at s=${s}`);
    if (rpSpringLength(s) < solid) issues.push(`springs go solid at s=${s}`);
    // rack must span the pinion centre line so the teeth stay engaged
    const rackFar = inner - RP.rack.length;
    if (rackFar > -0.03) issues.push(`rack disengages from pinion at s=${s}`);
    // the opposite piston's inner face sits at -inner; the rack tail must not reach it
    if (rackFar <= -inner) issues.push(`rack hits opposite piston at s=${s}`);
  }
  return issues;
}
