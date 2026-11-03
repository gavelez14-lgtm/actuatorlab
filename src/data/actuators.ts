/**
 * Actuator technology library.
 *
 * Organised by technology, not by manufacturer or product range. Everything
 * here is general engineering knowledge about the technology class. No
 * product ratings, sizes, torque values or option lists are given: those
 * belong to a specific manufacturer's documentation.
 */
import type { ActuatorFamilyId } from "@/lib/sim/types";

export type Technology = "Scotch yoke" | "Rack and pinion" | "Vane" | "Electro-hydraulic" | "Electric gearbox" | "Linear";
export type PowerSource = "Pneumatic" | "Hydraulic" | "Electro-hydraulic" | "Electric" | "Pneumatic or electric";

export interface ActuatorFamily {
  id: ActuatorFamilyId;
  /** Short name for compact displays, e.g. "Scotch yoke". */
  short: string;
  name: string;
  technology: Technology;
  powerSource: PowerSource;
  movement: string;
  status: "interactive" | "planned";
  summary: string;
  operation: string[];
  configurations: { name: string; note: string }[];
  objectives: string[];
  principles: string[];
  relatedLessons: string[];
}

export const FAMILIES: ActuatorFamily[] = [
  {
    id: "pneumatic-scotch-yoke",
    short: "Scotch yoke",
    name: "Pneumatic Scotch yoke",
    technology: "Scotch yoke",
    powerSource: "Pneumatic",
    movement: "Quarter-turn (90°)",
    status: "interactive",
    summary: "Compressed air drives a piston; a slotted yoke converts its straight-line stroke into a quarter turn.",
    operation: [
      "Air pressure acts on a piston in a cylinder and produces a linear force.",
      "The piston rod drives a guide block carrying a pin. The pin engages a slot in the yoke, which is fixed to the output shaft.",
      "As the pin travels in a straight line it turns the yoke through 90°. The changing lever arm gives the Scotch yoke its characteristic torque curve.",
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
      "Common on medium to large quarter-turn valves where high end-of-stroke torque matters.",
      "Spring-return units must be sized so the spring alone can operate the valve at the end of its stroke.",
    ],
    relatedLessons: ["scotch-yoke-mechanics", "double-acting-vs-spring-return", "quarter-turn-valves"],
  },
  {
    id: "pneumatic-rack-pinion",
    short: "Rack and pinion",
    name: "Pneumatic rack and pinion",
    technology: "Rack and pinion",
    powerSource: "Pneumatic",
    movement: "Quarter-turn (90°, longer rotations possible)",
    status: "planned",
    summary: "Two opposed pistons carry toothed racks that turn a pinion gear on the output shaft, giving near-constant torque through the stroke.",
    operation: [
      "Air enters the centre chamber and drives two opposed pistons outward. Air on the outer chambers drives them back.",
      "Each piston carries a gear rack. Both racks mesh with a pinion on the output shaft, on opposite sides, so their forces add as torque.",
      "Because the pinion's pitch radius never changes, the lever arm is the same at every point of the stroke.",
    ],
    configurations: [
      { name: "Double acting", note: "Air drives both directions: centre chamber to open, outer chambers to close (or the reverse)." },
      { name: "Spring return", note: "Spring cartridges in the end caps drive the return stroke. The number of springs is chosen to suit the supply pressure." },
      { name: "Fail open or fail closed", note: "Set by how the pistons and shaft are assembled relative to the valve, and by which chamber the springs act on." },
    ],
    objectives: [
      "Explain why rack-and-pinion torque is nearly constant.",
      "Describe how opposed pistons balance the load on the pinion.",
      "Compare spring-return torque on the air stroke and the spring stroke.",
      "Contrast rack and pinion with Scotch yoke for a given valve.",
    ],
    principles: [
      "Output torque ≈ piston force × pinion pitch radius, roughly constant through travel apart from friction.",
      "In spring return, spring torque falls as the springs extend, so the end of the spring stroke is the critical sizing point.",
      "Compact and symmetrical. Commonly used on small to medium quarter-turn valves.",
      "Accessory mounting for solenoid valves and switch boxes is often to standard interfaces such as VDI/VDE 3845 (NAMUR).",
    ],
    relatedLessons: ["rack-and-pinion-mechanics", "double-acting-vs-spring-return"],
  },
  {
    id: "pneumatic-vane",
    short: "Vane",
    name: "Pneumatic vane",
    technology: "Vane",
    powerSource: "Pneumatic",
    movement: "Quarter-turn (limited by the chamber)",
    status: "planned",
    summary: "Air pushes directly on a vane fixed to the shaft inside a sector-shaped chamber. Rotary force with no linear-to-rotary conversion.",
    operation: [
      "A flat vane is fixed to the output shaft and divides a sector-shaped chamber in two.",
      "Air admitted to one side of the vane pushes it round; the other side exhausts. Reversing the air reverses the rotation.",
      "Rotation stops when the vane meets the end of the chamber, so the chamber shape sets the travel.",
    ],
    configurations: [
      { name: "Double acting", note: "Air on either side of the vane drives each direction." },
      { name: "Spring return", note: "Possible with an added spring module; less common than on piston designs." },
    ],
    objectives: [
      "Explain how a vane produces torque directly from pressure.",
      "Identify why vane actuators have few moving parts.",
      "Recognise the sealing challenge at the vane edges.",
    ],
    principles: [
      "Torque ≈ pressure × vane area × distance from the shaft to the vane's centre of pressure, roughly constant through travel.",
      "Very few moving parts and no backlash from gears or slots, which suits smooth modulating duty.",
      "The vane's edge seals are the main wear point and leakage path.",
    ],
    relatedLessons: ["linear-vs-rotary", "power-sources"],
  },
  {
    id: "electric-part-turn",
    short: "Part-turn",
    name: "Electric part-turn",
    technology: "Electric gearbox",
    powerSource: "Electric",
    movement: "Quarter-turn (90°)",
    status: "planned",
    summary: "A motor drives a high-ratio gear train, often a worm gear, to turn the output through about 90° and stop at set limits.",
    operation: [
      "An electric motor drives a reduction gear train. A worm gear stage is common because it gives a high ratio and resists being back-driven.",
      "Position sensing stops the motor at the open and closed limits. Torque sensing stops it if the valve jams or seats hard.",
      "A handwheel provides manual operation, usually with a declutch so the motor and handwheel do not fight.",
    ],
    configurations: [
      { name: "On-off (isolating)", note: "Drives fully open or fully closed on command." },
      { name: "Modulating (regulating)", note: "Positions to any point in between, following a control signal." },
      { name: "Fail-safe option", note: "Stored energy (spring, battery or capacitor) drives to a set position on power loss. Without it, the actuator stays in place." },
    ],
    objectives: [
      "Trace the drive path from motor to valve.",
      "Explain the roles of limit and torque sensing.",
      "Explain why a plain electric actuator fails in place.",
      "Distinguish on-off from modulating duty.",
    ],
    principles: [
      "Without stored energy, an electric actuator stops where it is on loss of power.",
      "A self-locking worm gear holds the valve against process forces without needing power.",
      "Duty rating (starts per hour, run time) limits how often the actuator can move without overheating the motor.",
    ],
    relatedLessons: ["power-sources", "quarter-turn-valves"],
  },
  {
    id: "electric-multi-turn",
    short: "Multi-turn",
    name: "Electric multi-turn",
    technology: "Electric gearbox",
    powerSource: "Electric",
    movement: "Multi-turn (many revolutions)",
    status: "planned",
    summary: "A motor and gear train turn a hollow output drive through many revolutions to operate gate, globe and sluice valves.",
    operation: [
      "A motor drives a reduction gear train to a hollow output sleeve that turns many times per stroke.",
      "On a rising-stem valve, the output turns a threaded stem nut. The stem cannot rotate, so it is driven up or down, converting torque into thrust.",
      "Position is measured by counting output turns. Torque sensing stops the motor at a set limit, protecting the valve when it seats.",
    ],
    configurations: [
      { name: "Rising stem (thrust base)", note: "Output drives a stem nut; the actuator carries the stem thrust." },
      { name: "Non-rising stem", note: "Output turns the valve stem directly; the thread is inside the valve." },
      { name: "Part-turn via gearbox", note: "A quarter-turn gearbox adapts the multi-turn output to a ball, butterfly or plug valve." },
    ],
    objectives: [
      "Explain how a stem nut converts rotation into linear thrust.",
      "Compare torque-seated and position-seated closing.",
      "Explain why stroke time depends on the number of turns.",
    ],
    principles: [
      "Thrust on a rising stem ≈ torque × 2π ÷ thread lead, less friction losses in the thread.",
      "Gate valves are often closed on torque (torque-seated) to ensure a tight seal; many other valves stop on position.",
      "Stroke time = output turns per stroke ÷ output speed.",
    ],
    relatedLessons: ["linear-vs-rotary", "power-sources"],
  },
  {
    id: "rising-stem-linear",
    short: "Rising stem",
    name: "Rising-stem linear actuation",
    technology: "Linear",
    powerSource: "Pneumatic or electric",
    movement: "Linear stroke",
    status: "planned",
    summary: "The valve stem moves straight up and down. Driven directly by a linear actuator, or by a multi-turn actuator through a threaded stem nut.",
    operation: [
      "In a rising-stem valve, such as many gate and globe valves, the closure member is lifted off or pressed onto its seat by the stem moving axially.",
      "A pneumatic linear actuator (piston or diaphragm) pushes the stem directly. Spring-loaded diaphragm actuators are common on control valves.",
      "Alternatively, an electric multi-turn actuator turns a stem nut and the threaded stem rises or falls.",
    ],
    configurations: [
      { name: "Pneumatic diaphragm, spring return", note: "Air on the diaphragm against a spring; air-to-open or air-to-close." },
      { name: "Pneumatic piston", note: "Higher pressure and longer strokes than a diaphragm; double acting or spring return." },
      { name: "Electric multi-turn with stem nut", note: "Rotation converted to thrust by the stem thread." },
    ],
    objectives: [
      "Distinguish thrust (linear) from torque (rotary) requirements.",
      "Explain air-to-open and air-to-close.",
      "Explain why seating thrust matters on gate and globe valves.",
    ],
    principles: [
      "Linear actuators are sized on thrust: the force to overcome process pressure on the plug, packing friction and seating load.",
      "Diaphragm force ≈ pressure × effective diaphragm area, minus the spring force at that position.",
      "Stroke length and seating thrust both come from the valve manufacturer's data.",
    ],
    relatedLessons: ["linear-vs-rotary", "actuator-vs-valve"],
  },
  {
    id: "hydraulic-scotch-yoke",
    short: "Scotch yoke",
    name: "Hydraulic Scotch yoke",
    technology: "Scotch yoke",
    powerSource: "Hydraulic",
    movement: "Quarter-turn (90°)",
    status: "planned",
    summary: "Hydraulic fluid drives the piston instead of air. The yoke converts the stroke to a quarter turn exactly as in the pneumatic version.",
    operation: [
      "Hydraulic pressure on a piston produces linear force. Hydraulic systems typically run at much higher pressure than plant air, so a smaller cylinder produces a large force.",
      "The Scotch yoke converts the stroke to rotation as in a pneumatic unit.",
    ],
    configurations: [
      { name: "Double acting", note: "Fluid drives both directions." },
      { name: "Spring return", note: "Fluid strokes against a spring; the spring provides the fail action." },
    ],
    objectives: ["Compare hydraulic and pneumatic motive power.", "Explain why the mechanism is independent of the power medium."],
    principles: [
      "Hydraulic fluid is effectively incompressible, giving stiff positioning compared with air.",
      "A hydraulic power unit or accumulator is needed as the pressure source.",
    ],
    relatedLessons: ["power-sources", "scotch-yoke-mechanics"],
  },
  {
    id: "hydraulic-rack-pinion",
    short: "Rack and pinion",
    name: "Hydraulic rack and pinion",
    technology: "Rack and pinion",
    powerSource: "Hydraulic",
    movement: "Quarter-turn (90°)",
    status: "planned",
    summary: "The rack-and-pinion mechanism driven by hydraulic pressure for high force from a compact body.",
    operation: ["Hydraulic pressure drives the rack pistons; the pinion converts rack movement into rotation with a constant lever arm."],
    configurations: [
      { name: "Double acting", note: "Fluid drives both directions." },
      { name: "Spring return", note: "Spring provides the fail action." },
    ],
    objectives: ["Relate power source and mechanism as independent design choices."],
    principles: ["Combines rack-and-pinion torque characteristics with hydraulic force density."],
    relatedLessons: ["power-sources"],
  },
  {
    id: "electro-hydraulic",
    short: "Electro-hydraulic",
    name: "Self-contained electro-hydraulic",
    technology: "Electro-hydraulic",
    powerSource: "Electro-hydraulic",
    movement: "Quarter-turn or linear",
    status: "planned",
    summary: "An electric motor drives a pump inside the actuator, so it needs only electrical power yet delivers hydraulic force and spring fail-safe action.",
    operation: [
      "An integral motor and pump generate hydraulic pressure on demand.",
      "That pressure drives a hydraulic cylinder through a Scotch yoke, rack and pinion or direct linear stroke. A spring can provide fail-safe action when power is removed.",
    ],
    configurations: [
      { name: "Spring return", note: "Hydraulic stroke against a spring; spring drives to the fail position." },
      { name: "Double acting", note: "Pump drives both directions." },
    ],
    objectives: ["Explain how electro-hydraulic actuators combine electric control with hydraulic force.", "Identify why they suit remote sites without an air supply."],
    principles: ["Avoids long instrument air or hydraulic lines.", "Combines precise electric control with hydraulic force and spring fail-safe capability."],
    relatedLessons: ["power-sources"],
  },
];

export const FAMILY_MAP = Object.fromEntries(FAMILIES.map((f) => [f.id, f])) as Record<ActuatorFamilyId, ActuatorFamily>;

/** Old product-code URLs, kept working after the move to technology names. */
export const LEGACY_SLUGS: Record<string, ActuatorFamilyId> = {
  cp: "pneumatic-scotch-yoke",
  gp: "pneumatic-scotch-yoke",
  gh: "hydraulic-scotch-yoke",
  gt: "pneumatic-rack-pinion",
  rh: "hydraulic-rack-pinion",
  si: "electro-hydraulic",
  iq: "electric-multi-turn",
};
