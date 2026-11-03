/**
 * Comparison data. Every row describes TYPICAL engineering characteristics of
 * the mechanism type. None of it is manufacturer performance data.
 * Add a new mechanism by adding a column key and filling each row.
 */
export type MechanismKey = "scotchYoke" | "rackPinion";

export const MECHANISMS: Record<MechanismKey, { name: string; simulator: string | null }> = {
  scotchYoke: { name: "Scotch yoke", simulator: "/simulator" },
  rackPinion: { name: "Rack and pinion", simulator: null },
};

export interface CompareRow {
  aspect: string;
  values: Record<MechanismKey, string>;
}

export const COMPARE_ROWS: CompareRow[] = [
  {
    aspect: "Mechanical movement",
    values: {
      scotchYoke: "Piston drives a guide block and pin. The pin slides in a slotted yoke fixed to the shaft.",
      rackPinion: "Piston carries a toothed rack that meshes with a pinion gear on the shaft.",
    },
  },
  {
    aspect: "Output type",
    values: {
      scotchYoke: "Quarter-turn, typically 90° with end-stop adjustment.",
      rackPinion: "Quarter-turn. Rotation can be extended by lengthening the racks.",
    },
  },
  {
    aspect: "Torque characteristic",
    values: {
      scotchYoke: "Varies with angle: highest at the ends of travel, lowest at mid-stroke (symmetric yoke). Canted yokes shift the peak.",
      rackPinion: "Nearly constant through the stroke, because the pinion radius does not change.",
    },
  },
  {
    aspect: "Typical torque range",
    values: {
      scotchYoke: "Commonly used for medium to very high torque, larger valves.",
      rackPinion: "Commonly used for low to medium torque, smaller valves.",
    },
  },
  {
    aspect: "Power source",
    values: {
      scotchYoke: "Pneumatic or hydraulic.",
      rackPinion: "Pneumatic or hydraulic.",
    },
  },
  {
    aspect: "Fit to valve torque",
    values: {
      scotchYoke: "Good match for valves with high break-out and re-seat torque near the ends, such as many ball and plug valves.",
      rackPinion: "Uniform output, so it must be sized for the valve's peak torque wherever it occurs.",
    },
  },
  {
    aspect: "Design differences",
    values: {
      scotchYoke: "Separate cylinder and housing; spring module usually on the opposite side of the housing; guide bar takes side load.",
      rackPinion: "Compact, symmetrical body; often opposed pistons; springs commonly fitted inside the end caps.",
    },
  },
];
