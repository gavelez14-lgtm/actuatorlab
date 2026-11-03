/**
 * Reference geometry for an electric multi-turn actuator on a rising-stem
 * wedge gate valve, laid out after public IQ literature: motor and worm
 * driving a full worm wheel on a hollow output shaft; drive bush (stem nut)
 * in a separate thrust base on a thrust bearing; handwheel on top on the
 * output axis with a stem cover tube above it; ISO 5210 flange.
 * Proportions are original and illustrative.
 *
 * Frame: output axis and valve stem = world Y. Pipe runs along Z.
 */
import { MULTI_TURN } from "./electric";

export const MT = {
  gearcase: { centre: [0, 0.25, -0.1] as const, size: [0.9, 0.56, 0.95] as const },
  wheel: { pitchRadius: 0.3, thickness: 0.1, teeth: 60, y: 0.15 },
  worm: { y: 0.15, z: -0.355, pitchRadius: 0.055, threadLength: 0.32, x0: -0.46, x1: 0.46 },
  motor: { x0: 0.45, x1: 1.0, radius: 0.2 },
  hollowShaft: { inner: 0.06, outer: 0.09, bottom: -0.2, top: 0.6 },
  handwheel: { y: 0.66, radius: 0.32 },
  coverTube: { radius: 0.065, bottom: 0.62, top: 1.3 },
  thrustBase: { top: -0.03, bottom: -0.25, radius: 0.22 },
  stemNut: { y: -0.14, height: 0.18, radius: 0.1 },
  /** Valve */
  valve: {
    pipeY: -1.4,
    bodyBottom: -1.78,
    cavityTop: -0.55,
    cavityRadius: 0.36,
    bonnetTop: -0.25,
    bonnetRadius: 0.12,
    gateHalfWidth: 0.27,
    gateHeight: 0.56,
    gateThickness: 0.09,
    pipeRadius: 0.24,
    flangeZ: 0.62,
    pipeEndZ: 1.3,
  },
  stem: { radius: 0.042 },
} as const;

/** Gate lift for a full stroke = output turns x thread lead. */
export const MT_LEAD = 0.045;
export const MT_LIFT = MULTI_TURN.outputTurns * MT_LEAD;

export function mtGateCentreY(stroke: number): number {
  return MT.valve.pipeY + stroke * MT_LIFT;
}

/** Stem top (rising stem): stem is fixed to the gate and does not rotate. */
export const MT_STEM_LENGTH = 1.84;
export function mtStemBottomY(stroke: number): number {
  return mtGateCentreY(stroke) + MT.valve.gateHeight / 2 - 0.02;
}

/** Hollow output and drive bush rotation (anticlockwise from above to open). */
export function mtOutputRotation(stroke: number): number {
  return stroke * MULTI_TURN.outputTurns * Math.PI * 2;
}

export function mtWormRotation(stroke: number): number {
  return mtOutputRotation(stroke) * MULTI_TURN.wormRatio;
}

export function checkMultiTurnGeometry(): string[] {
  const issues: string[] = [];
  const v = MT.valve;
  for (let i = 0; i <= 10; i++) {
    const s = i / 10;
    const gateTop = mtGateCentreY(s) + v.gateHeight / 2;
    const gateBottom = mtGateCentreY(s) - v.gateHeight / 2;
    if (gateTop > v.cavityTop) issues.push(`gate leaves body cavity at s=${s}`);
    if (gateBottom < v.bodyBottom) issues.push(`gate below body at s=${s}`);
    const stemTop = mtStemBottomY(s) + MT_STEM_LENGTH;
    if (stemTop > MT.coverTube.top) issues.push(`stem leaves cover tube at s=${s}`);
    if (stemTop < MT.stemNut.y + MT.stemNut.height / 2) issues.push(`stem disengages from nut at s=${s}`);
  }
  // closed: bore fully blocked; open: bore fully clear
  if (mtGateCentreY(0) + v.gateHeight / 2 < v.pipeY + v.pipeRadius) issues.push("gate does not cover bore when closed");
  if (mtGateCentreY(1) - v.gateHeight / 2 < v.pipeY + v.pipeRadius) issues.push("gate does not clear bore when open");
  return issues;
}
