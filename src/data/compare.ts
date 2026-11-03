/**
 * Comparison data. Every row describes TYPICAL engineering characteristics of
 * the mechanism type. None of it is manufacturer performance data.
 * Add a new mechanism by adding a column key and filling each row.
 */
export type MechanismKey = "scotchYoke" | "rackPinion";

export const MECHANISMS: Record<MechanismKey, { name: string; simulator: string | null }> = {
  scotchYoke: { name: "Scotch yoke", simulator: "/simulator" },
  rackPinion: { name: "Rack and pinion", simulator: "/simulator?type=rack-pinion" },
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
      scotchYoke: "Pneumatic, pipeline gas, gas over oil, hydraulic or electro-hydraulic. Five of them are in the simulator.",
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

/* ---------------- Power sources ---------------- */

export type PowerKey = "pneumatic" | "directGas" | "gasOverOil" | "electroHydraulic" | "electricIntelligent" | "electricCompact";

export const POWER_SOURCES: Record<PowerKey, { name: string; simulator: string }> = {
  pneumatic: { name: "Pneumatic", simulator: "/simulator" },
  directGas: { name: "Direct gas", simulator: "/simulator?type=gas-scotch-yoke" },
  gasOverOil: { name: "Gas over oil", simulator: "/simulator?type=gas-over-oil" },
  electroHydraulic: { name: "Electro-hydraulic", simulator: "/simulator?type=electro-hydraulic" },
  electricIntelligent: { name: "Electric, intelligent", simulator: "/simulator?type=electric-part-turn" },
  electricCompact: { name: "Electric, compact", simulator: "/simulator?type=electric-compact-part-turn" },
};

export const POWER_ROWS: { aspect: string; values: Record<PowerKey, string> }[] = [
  {
    aspect: "Motive energy",
    values: {
      pneumatic: "Instrument air from a plant compressor system.",
      directGas: "Pipeline gas, at line pressure, straight to the cylinder.",
      gasOverOil: "Pipeline gas pressurising oil; the oil drives the cylinder.",
      electroHydraulic: "Electrical power to an on-board motor and pump.",
      electricIntelligent: "Electrical power to a motor and self-locking gearing.",
      electricCompact: "Electrical power to a motor and self-locking gearing.",
    },
  },
  {
    aspect: "Where it is typical",
    values: {
      pneumatic: "Process plants with an air supply.",
      directGas: "Remote gas pipeline valve sites with no air or reliable power.",
      gasOverOil: "Large pipeline block valves where controlled stroke speed matters.",
      electroHydraulic: "Sites with power but no air, needing hydraulic force and spring fail-safe.",
      electricIntelligent: "Plants wanting digital control, diagnostics and no air system.",
      electricCompact: "Smaller valves and dampers where simple on-off is enough.",
    },
  },
  {
    aspect: "On loss of power",
    values: {
      pneumatic: "Spring return goes to its fail position; double acting stays put.",
      directGas: "Spring return fails safe; double acting uses stored gas after a trip.",
      gasOverOil: "Stored gas closes on a line-break or low-pressure trip.",
      electroHydraulic: "Spring return: dump solenoid opens and the spring fails safe.",
      electricIntelligent: "Stays in place unless a stored-energy option is fitted.",
      electricCompact: "Stays in place unless a spring-return version is used.",
    },
  },
  {
    aspect: "Speed control",
    values: {
      pneumatic: "Restrictors and exhaust control; speed varies with load and pressure.",
      directGas: "Gas restrictors; speed varies with pipeline pressure.",
      gasOverOil: "Oil flow controls: steady, adjustable, insensitive to gas pressure.",
      electroHydraulic: "Set by pump flow and the dump-valve restriction.",
      electricIntelligent: "Constant motor speed; some designs vary it electronically.",
      electricCompact: "Constant motor speed.",
    },
  },
  {
    aspect: "Position and diagnostics",
    values: {
      pneumatic: "Added with switches, positioners and controllers.",
      directGas: "Added with switches and line-break controls.",
      gasOverOil: "Added with switches and line-break controls.",
      electroHydraulic: "Integral controller: positioning, ESD, partial-stroke testing.",
      electricIntelligent: "Built in: absolute position, measured torque, data logging.",
      electricCompact: "Limit and torque switches only, unless options are fitted.",
    },
  },
  {
    aspect: "Watch out for",
    values: {
      pneumatic: "Air quality and supply pressure at the actuator.",
      directGas: "Gas venting, gas quality, and set-point trade-offs.",
      gasOverOil: "Oil and gas tanks to maintain; more complex.",
      electroHydraulic: "Oil condition and seals; motor duty.",
      electricIntelligent: "Duty rating, and that it fails in place by default.",
      electricCompact: "No torque or position data between the ends of travel.",
    },
  },
];
