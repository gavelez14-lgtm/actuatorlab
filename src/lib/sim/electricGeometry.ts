/**
 * Reference geometry for an electric part-turn actuator with a worm-wheel
 * segment, laid out after publicly documented intelligent part-turn designs
 * (for example Rotork IQT literature): motor coaxial with a worm shaft, worm
 * wheel segment on the output, geared handwheel with hand/auto lever, front
 * control cover with display and two local selectors, separate sealed
 * terminal compartment, ISO 5211 base. Proportions are original.
 *
 * Frame: output axis = world Y. Worm shaft runs along X behind the output (-Z).
 */
export const EPT = {
  gearcase: { centre: [0, 0.12, -0.1] as const, size: [0.9, 0.56, 0.95] as const },
  wheel: { pitchRadius: 0.3, thickness: 0.1, teeth: 60, y: 0.05, extra: 0.35 },
  worm: { z: -0.355, y: 0.05, pitchRadius: 0.055, x0: -0.62, x1: 0.46, threadLength: 0.32 },
  motor: { x0: 0.45, x1: 1.0, radius: 0.2 },
  handwheel: { x: -0.66, radius: 0.26 },
  cover: { z: 0.375, radius: 0.3, depth: 0.12, y: 0.12 },
  terminal: { centre: [0, 0.45, -0.33] as const, size: [0.5, 0.1, 0.36] as const },
  base: { top: -0.16, bottom: -0.3, half: 0.25 },
} as const;

/** Circular pitch of the wheel = axial pitch of a single-start worm. */
export const EPT_PITCH = (2 * Math.PI * EPT.wheel.pitchRadius) / EPT.wheel.teeth;

/** Worm turns for the full 90° (single start: wheel teeth / 4). */
export const EPT_WORM_TURNS = EPT.wheel.teeth / 4;

/** Same output convention as the other quarter-turn models. */
export function eptOutputRotationY(stroke: number): number {
  return Math.PI / 4 - stroke * (Math.PI / 2);
}

/** Worm rotation about X, locked to the output by the gear ratio (no slip). */
export function eptWormRotation(stroke: number): number {
  return stroke * EPT_WORM_TURNS * Math.PI * 2;
}
