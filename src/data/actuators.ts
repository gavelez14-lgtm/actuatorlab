/**
 * Actuator family catalogue.
 *
 * SOURCE POLICY: Family codes and their basic technology class are listed as
 * scoped for this training programme. No ratings, sizes, torque values,
 * pressure limits or internal construction details are given for any family,
 * because none have been verified against Rotork documentation in this build.
 * Everything under `principles` is general engineering knowledge that applies
 * to the technology class, not to a specific product.
 */
import type { ActuatorFamilyId } from "@/lib/sim/types";

export type Technology = "Scotch yoke" | "Rack and pinion" | "Electro-hydraulic" | "Electric";
export type PowerSource = "Pneumatic" | "Hydraulic" | "Electro-hydraulic" | "Electric";

export interface ActuatorFamily {
  id: ActuatorFamilyId;
  code: string;
  name: string;
  technology: Technology;
  powerSource: PowerSource;
  movement: string;
  status: "interactive" | "planned";
  summary: string;
  operation: string[];
  configurations: { name: string; note: string }[];
  objectives: string[];
  /** General engineering principles for this technology class. */
  principles: string[];
  /** Manufacturer-specific details. Empty until verified against official documentation. */
  manufacturer: { verified: false; note: string };
  relatedLessons: string[];
}

const UNVERIFIED =
  "Product-specific ratings, sizes, options and construction are not shown. Consult current Rotork documentation for these.";

export const FAMILIES: ActuatorFamily[] = [
  {
    id: "cp",
    code: "CP",
    name: "Pneumatic Scotch yoke",
    technology: "Scotch yoke",
    powerSource: "Pneumatic",
    movement: "Quarter-turn (90°)",
    status: "interactive",
    summary: "Compressed air drives a piston; a slotted yoke converts its straight-line stroke into a quarter turn.",
    operation: [
      "Air pressure acts on a piston in a cylinder and produces a linear force.",
      "The piston rod drives a guide block carrying a pin. The pin engages a slot in the yoke, which is fixed to the output shaft.",
      "As the pin travels in a straight line, it turns the yoke through 90°. The changing lever arm gives the Scotch yoke its characteristic torque curve.",
    ],
    configurations: [
      { name: "Double acting", note: "Air drives both directions. Holds position on loss of supply unless stored energy is added." },
      { name: "Spring return, fail closed", note: "Air strokes against a spring; the spring drives the valve closed when the cylinder vents." },
      { name: "Spring return, fail open", note: "Same principle with the spring end of travel arranged as valve open." },
    ],
    objectives: [
      "Trace the force path from air pressure to valve ball.",
      "Explain why the pin slides along the yoke slot during the stroke.",
      "Predict what a spring-return and a double-acting actuator do on loss of supply.",
      "Read an illustrative Scotch yoke torque curve.",
    ],
    principles: [
      "A symmetric yoke gives output torque proportional to 1/cos²φ: highest at the ends of travel, lowest at mid-stroke.",
      "Many valves, including ball valves, need their highest torque near the closed position, which suits the Scotch yoke curve.",
      "Spring-return units must be sized so the spring alone can close (or open) the valve at the end of its stroke.",
    ],
    manufacturer: { verified: false, note: UNVERIFIED },
    relatedLessons: ["scotch-yoke-mechanics", "double-acting-vs-spring-return", "quarter-turn-valves"],
  },
  {
    id: "gp",
    code: "GP",
    name: "Pneumatic Scotch yoke",
    technology: "Scotch yoke",
    powerSource: "Pneumatic",
    movement: "Quarter-turn (90°)",
    status: "planned",
    summary: "A second pneumatic Scotch yoke family in the training scope. Shares the mechanical principle shown in the CP-style simulator.",
    operation: [
      "Operating principle as for pneumatic Scotch yoke actuators: air drives a piston, a yoke and pin convert the stroke into a quarter turn.",
      "How this family differs from CP in size range, construction and options is not covered until verified documentation is added.",
    ],
    configurations: [
      { name: "Double acting", note: "General configuration for pneumatic Scotch yoke actuators." },
      { name: "Spring return", note: "General configuration for pneumatic Scotch yoke actuators." },
    ],
    objectives: ["Recognise that one mechanical principle can be packaged in several product families.", "Know where to look for family-specific data."],
    principles: ["Larger Scotch yoke actuators follow the same torque relationship; the yoke geometry and cylinder bore set the magnitude."],
    manufacturer: { verified: false, note: UNVERIFIED },
    relatedLessons: ["scotch-yoke-mechanics"],
  },
  {
    id: "gh",
    code: "GH",
    name: "Hydraulic Scotch yoke",
    technology: "Scotch yoke",
    powerSource: "Hydraulic",
    movement: "Quarter-turn (90°)",
    status: "planned",
    summary: "Hydraulic fluid drives the piston instead of air. The yoke mechanism converts the stroke to a quarter turn in the same way.",
    operation: [
      "Hydraulic pressure on a piston produces linear force. Hydraulic systems typically operate at much higher pressures than plant air, so a smaller cylinder can produce a large force.",
      "The Scotch yoke converts the stroke to rotation exactly as in a pneumatic unit.",
    ],
    configurations: [
      { name: "Double acting", note: "Fluid drives both directions." },
      { name: "Spring return", note: "Fluid strokes against a spring; spring provides the fail action." },
    ],
    objectives: ["Compare hydraulic and pneumatic motive power.", "Explain why the mechanism is independent of the power medium."],
    principles: ["Hydraulic fluid is effectively incompressible, giving stiff positioning compared with air.", "A hydraulic power unit or accumulator is needed as the pressure source."],
    manufacturer: { verified: false, note: UNVERIFIED },
    relatedLessons: ["power-sources", "scotch-yoke-mechanics"],
  },
  {
    id: "gt",
    code: "GT",
    name: "Rack and pinion",
    technology: "Rack and pinion",
    powerSource: "Pneumatic",
    movement: "Quarter-turn (90°)",
    status: "planned",
    summary: "Pistons with toothed racks turn a pinion gear on the output shaft, giving a near-constant torque through the stroke.",
    operation: [
      "Air drives one or two opposed pistons. Each piston carries a gear rack.",
      "The racks mesh with a pinion on the output shaft, so linear rack movement turns the shaft.",
      "Because the pinion pitch radius is fixed, the lever arm does not change through the stroke.",
    ],
    configurations: [
      { name: "Double acting", note: "Air drives both directions." },
      { name: "Spring return", note: "Springs, often in the piston chambers, provide the return stroke." },
    ],
    objectives: ["Explain why rack and pinion torque is nearly constant.", "Contrast rack and pinion with Scotch yoke."],
    principles: ["Output torque ≈ piston force × pinion pitch radius, constant through travel apart from friction effects.", "Compact and symmetrical, commonly used on smaller quarter-turn valves."],
    manufacturer: { verified: false, note: UNVERIFIED },
    relatedLessons: ["rack-and-pinion-mechanics"],
  },
  {
    id: "rh",
    code: "RH",
    name: "Hydraulic rack and pinion",
    technology: "Rack and pinion",
    powerSource: "Hydraulic",
    movement: "Quarter-turn (90°)",
    status: "planned",
    summary: "Hydraulically powered rack and pinion. Same gear principle as the pneumatic version with a hydraulic power source.",
    operation: ["Hydraulic pressure drives the rack pistons; the pinion converts rack movement into rotation."],
    configurations: [
      { name: "Double acting", note: "General configuration." },
      { name: "Spring return", note: "General configuration." },
    ],
    objectives: ["Relate power source and mechanism as independent design choices."],
    principles: ["Combines rack-and-pinion torque characteristics with hydraulic force density."],
    manufacturer: { verified: false, note: UNVERIFIED },
    relatedLessons: ["power-sources"],
  },
  {
    id: "si",
    code: "Skilmatic SI",
    name: "Self-contained electro-hydraulic",
    technology: "Electro-hydraulic",
    powerSource: "Electro-hydraulic",
    movement: "Quarter-turn or linear (depends on configuration)",
    status: "planned",
    summary: "An electric motor drives a hydraulic pump inside the actuator, so the unit needs electrical power only, not an external fluid supply.",
    operation: [
      "An integral motor and pump generate hydraulic pressure on demand.",
      "That pressure drives a hydraulic actuator mechanism. A spring can provide fail-safe action when power is removed.",
    ],
    configurations: [
      { name: "Spring return", note: "General electro-hydraulic fail-safe arrangement." },
      { name: "Double acting", note: "General arrangement." },
    ],
    objectives: ["Explain how electro-hydraulic actuators combine electric control with hydraulic force.", "Identify why they suit remote sites without air supply."],
    principles: ["Avoids long instrument air or hydraulic lines.", "Combines precise electric control with hydraulic force and spring fail-safe capability."],
    manufacturer: { verified: false, note: UNVERIFIED },
    relatedLessons: ["power-sources"],
  },
  {
    id: "iq",
    code: "IQ",
    name: "Intelligent electric actuator",
    technology: "Electric",
    powerSource: "Electric",
    movement: "Multi-turn (part-turn with gearbox)",
    status: "planned",
    summary: "An electric motor drives the output through a gear train. Integrated controls handle position limits, torque protection and communication.",
    operation: [
      "A motor drives a reduction gear train to the output. Electric actuators of this type are commonly multi-turn; a quarter-turn gearbox adapts them to part-turn valves.",
      "Position and torque are sensed electronically so the actuator stops at set limits.",
    ],
    configurations: [
      { name: "Multi-turn", note: "Gate and globe valves, sluice gates." },
      { name: "Part-turn via gearbox", note: "Ball, butterfly and plug valves." },
    ],
    objectives: ["Explain multi-turn versus quarter-turn output.", "Describe why electric actuators typically fail in place unless a fail-safe option is fitted."],
    principles: ["Without stored energy, an electric actuator stops where it is on power loss.", "Fail-safe electric designs use batteries, springs or capacitors as stored energy."],
    manufacturer: { verified: false, note: UNVERIFIED },
    relatedLessons: ["power-sources", "linear-vs-rotary"],
  },
];

export const FAMILY_MAP = Object.fromEntries(FAMILIES.map((f) => [f.id, f])) as Record<ActuatorFamilyId, ActuatorFamily>;
