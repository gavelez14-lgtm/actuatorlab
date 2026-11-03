import type { ActuatorFamilyId, ComponentId } from "@/lib/sim/types";
import { CYLINDER, SPRING_MODULE, VALVE, YOKE_OFFSET } from "@/lib/sim/geometry";
import { RP } from "@/lib/sim/rackPinionGeometry";
import { EPT } from "@/lib/sim/electricGeometry";
import { MT } from "@/lib/sim/multiTurnGeometry";
import { CPT } from "@/lib/sim/compactGeometry";
import type { MechanismKind } from "@/lib/sim/mechanisms";

export type ComponentRole =
  | "Linear movement"
  | "Torque conversion"
  | "Output transmission"
  | "Pressure containment"
  | "Energy storage"
  | "Flow control"
  | "Structure and alignment"
  | "Motive power"
  | "Sensing and control";

export interface ComponentInfo {
  id: ComponentId;
  name: string;
  role: ComponentRole;
  /** One-line mechanical function. */
  function: string;
  /** Plain-language educational description. */
  description: string;
  /** Where construction differs between designs. Keeps us honest about generalisation. */
  caveat?: string;
  /** Camera focus target in scene units. */
  focus: [number, number, number];
  /** Camera distance for focus action. */
  distance: number;
  springReturnOnly?: boolean;
  group: "actuator" | "valve";
}

/** Scotch yoke components (also includes the shared valve and mounting parts). */
export const COMPONENTS: ComponentInfo[] = [
  {
    id: "cylinder",
    name: "Cylinder",
    role: "Pressure containment",
    function: "Pressure-containing chamber in which the piston moves.",
    description:
      "The cylinder tube and its seals hold compressed air on one or both sides of the piston. Pressure acting over the piston area is what produces the actuator's linear force.",
    focus: [(CYLINDER.tubeStart + CYLINDER.tubeEnd) / 2, 0, -YOKE_OFFSET],
    distance: 3.2,
    group: "actuator",
  },
  {
    id: "end-caps",
    name: "End caps",
    role: "Pressure containment",
    function: "Close the ends of the cylinder and spring module and carry the air ports.",
    description:
      "End caps seal the pressure chamber, react the pressure load and usually carry the air connections. Many designs place adjustable travel stops in the end caps to set the exact end positions of the stroke.",
    caveat: "Port positions and stop arrangements vary between designs and sizes.",
    focus: [CYLINDER.tubeEnd, 0, -YOKE_OFFSET],
    distance: 2.4,
    group: "actuator",
  },
  {
    id: "piston",
    name: "Piston",
    role: "Linear movement",
    function: "Converts pressure differential into linear force.",
    description:
      "The difference in pressure between the two faces of the piston, multiplied by its area, gives a force along the cylinder axis. Seals on the piston keep the two chambers separate.",
    focus: [1.7, 0, -YOKE_OFFSET],
    distance: 2.4,
    group: "actuator",
  },
  {
    id: "connecting-mechanism",
    name: "Piston rod and guide block",
    role: "Linear movement",
    function: "Transfers piston movement to the yoke assembly.",
    description:
      "The rod carries the piston's force into a guide block (crosshead) that travels in a straight line. The guide block carries the sliding pin, so the pin can only move along the guide axis.",
    caveat:
      "This model uses a rod and guide block. Other Scotch yoke designs arrange the rod, guide and pin differently.",
    focus: [0.6, 0, -YOKE_OFFSET],
    distance: 2.6,
    group: "actuator",
  },
  {
    id: "guide-bar",
    name: "Guide bar",
    role: "Structure and alignment",
    function: "Keeps the guide block travelling in a straight line.",
    description:
      "The guide bar reacts the side load that the yoke puts on the pin, so the piston rod and seals see mainly axial load. Without it the piston would be pushed sideways against the cylinder wall.",
    focus: [0, 0, -YOKE_OFFSET - 0.24],
    distance: 2.4,
    group: "actuator",
  },
  {
    id: "pin",
    name: "Sliding pin",
    role: "Torque conversion",
    function: "Transfers force between the connecting mechanism and yoke.",
    description:
      "The pin is fixed to the guide block and engages the slot in the yoke. As the block moves in a straight line, the pin slides along the slot, and its distance from the shaft changes through the stroke.",
    focus: [0, 0.2, -YOKE_OFFSET],
    distance: 1.7,
    group: "actuator",
  },
  {
    id: "yoke",
    name: "Yoke",
    role: "Torque conversion",
    function: "Converts linear movement into rotary output through its interaction with the pin.",
    description:
      "The yoke is a slotted arm fixed to the output shaft. The pin pushes on the slot wall, which turns the yoke. The effective lever arm is longest at the ends of travel, which is why a symmetric Scotch yoke produces more torque at the ends of the stroke than in the middle.",
    focus: [0, 0.2, -0.35],
    distance: 2.0,
    group: "actuator",
  },
  {
    id: "output-shaft",
    name: "Output shaft",
    role: "Output transmission",
    function: "Transfers actuator torque to the valve.",
    description:
      "The shaft turns with the yoke through a quarter turn and passes the torque through the mounting coupling to the valve stem. The top of the shaft often drives a position indicator.",
    focus: [0, -0.2, 0],
    distance: 2.4,
    group: "actuator",
  },
  {
    id: "housing",
    name: "Yoke housing",
    role: "Structure and alignment",
    function: "Encloses the yoke and supports the shaft bearings, cylinder and spring module.",
    description:
      "The housing holds the moving parts in alignment and reacts the forces between the cylinder, spring module and shaft. It is the structural centre of the actuator.",
    focus: [0, 0, -0.4],
    distance: 3.0,
    group: "actuator",
  },
  {
    id: "spring",
    name: "Spring",
    role: "Energy storage",
    function: "Stores energy and returns the mechanism when motive supply is removed.",
    description:
      "During the air stroke the piston compresses the spring. When the cylinder vents, intentionally or because supply is lost, the spring is the only remaining active force and drives the mechanism back to the spring end. That end defines the fail position.",
    caveat: "Spring modules can use one or several nested springs. A single coil is shown for clarity.",
    focus: [(SPRING_MODULE.canisterStart + SPRING_MODULE.canisterEnd) / 2, 0, -YOKE_OFFSET],
    distance: 3.0,
    springReturnOnly: true,
    group: "actuator",
  },
  {
    id: "bracket",
    name: "Mounting bracket",
    role: "Structure and alignment",
    function: "Fixes the actuator to the valve and keeps the shafts concentric.",
    description:
      "The bracket and coupling hold the actuator shaft on the same axis as the valve stem and transmit the reaction torque into the valve body. Misalignment here causes side loads and wear.",
    caveat: "Mounting interfaces are commonly standardised (for example ISO 5211). Check the specific valve and actuator documentation.",
    focus: [0, -0.6, 0],
    distance: 2.2,
    group: "valve",
  },
  {
    id: "stem",
    name: "Valve stem and coupling",
    role: "Output transmission",
    function: "Carries actuator torque from the coupling into the ball.",
    description:
      "The stem is keyed or flatted to the ball, so the ball turns exactly as the actuator shaft turns. Any backlash here shows up as lost motion at the valve.",
    focus: [0, VALVE.centerY + 0.5, 0],
    distance: 2.0,
    group: "valve",
  },
  {
    id: "valve-body",
    name: "Valve body",
    role: "Pressure containment",
    function: "Contains the process fluid and houses the ball and seats.",
    description:
      "The body connects to the pipeline and holds the seats that seal against the ball. It is shown sectioned here so the ball can be seen.",
    focus: [0, VALVE.centerY, 0],
    distance: 2.8,
    group: "valve",
  },
  {
    id: "ball",
    name: "Ball",
    role: "Flow control",
    function: "Rotates within the valve body to control the flow passage.",
    description:
      "The ball has a bore through it. Aligned with the pipe, the valve is open. Turned 90 degrees, the solid side faces the seats and the valve is closed. Part-way positions expose part of the bore, but flow is not proportional to angle.",
    focus: [0, VALVE.centerY, 0],
    distance: 2.0,
    group: "valve",
  },
];

const VALVE_PARTS = COMPONENTS.filter((c) => c.group === "valve");

/**
 * Twin-piston rack and pinion. Architecture follows publicly documented
 * compact twin-piston designs; proportions are original and illustrative.
 */
export const RACK_PINION_COMPONENTS: ComponentInfo[] = [
  {
    id: "housing",
    name: "Body (cylinder)",
    role: "Pressure containment",
    function: "One bore holds both pistons; the pinion passes through the middle.",
    description:
      "The body is a single cylinder bore with the pinion crossing it at the centre. The space between the pistons is the centre chamber; the spaces behind them are the outer chambers. Bodies are commonly extruded aluminium, often anodised.",
    focus: [0, 0, 0],
    distance: 3.2,
    group: "actuator",
  },
  {
    id: "piston",
    name: "Pistons",
    role: "Linear movement",
    function: "Two opposed pistons convert air pressure into equal and opposite linear forces.",
    description:
      "Air in the centre chamber pushes both pistons outward at the same time; air in the outer chambers pushes them back in. Because the forces are opposed, the side loads on the pinion largely cancel.",
    focus: [0.55, 0, 0],
    distance: 2.4,
    group: "actuator",
  },
  {
    id: "rack",
    name: "Racks",
    role: "Torque conversion",
    function: "Toothed bars on each piston that mesh with the pinion.",
    description:
      "Each piston carries a rack on opposite sides of the pinion. As the pistons move apart, one rack moves left on one side and the other moves right on the other side, so both turn the pinion the same way. Their torques add.",
    caveat: "Rack form and tooth count vary between designs; teeth are shown simplified.",
    focus: [0, 0.05, 0],
    distance: 1.6,
    group: "actuator",
  },
  {
    id: "pinion",
    name: "Pinion",
    role: "Torque conversion",
    function: "Gear on the output shaft, driven by both racks.",
    description:
      "The pinion turns as the racks move. Its pitch radius never changes, so torque per unit of piston force is the same at every point of the stroke. Designs commonly retain the pinion so it cannot be pushed out of the body under pressure (anti-blowout).",
    focus: [0, 0.05, 0],
    distance: 1.5,
    group: "actuator",
  },
  {
    id: "output-shaft",
    name: "Output shaft and indicator",
    role: "Output transmission",
    function: "Transfers torque to the valve and shows position on top.",
    description:
      "The pinion shaft extends below the body to drive the valve coupling, and above it to the position indicator and the accessory interface used for switch boxes and positioners (often to the VDI/VDE 3845 NAMUR pattern).",
    focus: [0, 0.2, 0],
    distance: 2.2,
    group: "actuator",
  },
  {
    id: "end-caps",
    name: "End caps",
    role: "Pressure containment",
    function: "Close each end of the body and seat the springs.",
    description: "End caps seal the outer chambers and react the spring and pressure loads. In spring-return builds they hold the spring cartridges.",
    focus: [RP.body.halfX, 0, 0],
    distance: 2.2,
    group: "actuator",
  },
  {
    id: "spring",
    name: "Spring cartridges",
    role: "Energy storage",
    function: "Store energy on the air stroke and drive the return stroke.",
    description:
      "Springs sit between each piston and its end cap. The air stroke compresses them; when the centre chamber vents, they push the pistons back in and close (or open) the valve. The number of springs is chosen to suit the available supply pressure. Spring designs are commonly pre-loaded cartridges so the cap can be removed safely.",
    caveat: "Three springs per side are shown; real builds use different counts and nested springs.",
    focus: [0.85, 0, 0],
    distance: 2.0,
    springReturnOnly: true,
    group: "actuator",
  },
  {
    id: "travel-stops",
    name: "Travel stops",
    role: "Structure and alignment",
    function: "Adjustable bolts that set the exact end-of-travel positions.",
    description:
      "Stop bolts through the end caps meet the pistons at the end of the stroke. Turning them sets the end position precisely, typically a few degrees either side of 90°, so the valve seats exactly where it should.",
    focus: [RP.body.halfX, 0, 0],
    distance: 1.8,
    group: "actuator",
  },
  ...VALVE_PARTS,
];

/**
 * Electric part-turn with worm-wheel segment. Architecture follows publicly
 * documented intelligent part-turn actuators; proportions are original.
 */
export const ELECTRIC_PART_TURN_COMPONENTS: ComponentInfo[] = [
  {
    id: "motor",
    name: "Electric motor",
    role: "Motive power",
    function: "Turns the worm shaft at high speed and low torque.",
    description:
      "The motor runs at a fixed speed and drives the worm shaft directly. A reversing starter inside the actuator runs it one way to open and the other way to close. The motor is switched off at the position limits, on a torque trip, on Stop, or if power is lost.",
    focus: [0.72, EPT.worm.y, EPT.worm.z],
    distance: 2.2,
    group: "actuator",
  },
  {
    id: "worm",
    name: "Worm shaft",
    role: "Torque conversion",
    function: "A screw thread that drives the wheel teeth, giving a large speed reduction.",
    description:
      "Each turn of the single-start worm advances the wheel by one tooth, so the worm turns many times for the output's quarter turn. A worm drive is typically self-locking: the valve cannot back-drive the motor, so the actuator holds position with the motor off.",
    focus: [0, EPT.worm.y, EPT.worm.z],
    distance: 1.6,
    group: "actuator",
  },
  {
    id: "worm-wheel",
    name: "Worm wheel segment",
    role: "Torque conversion",
    function: "Toothed segment on the output shaft, driven by the worm.",
    description:
      "A part-turn actuator only needs about 90° of travel, so only a segment of a full wheel is needed. The wheel multiplies the motor torque by the gear ratio, less friction losses, and turns the output shaft.",
    caveat: "Full-wheel versions exist for multi-turn output; a segment is shown here.",
    focus: [0, EPT.wheel.y, -0.15],
    distance: 1.7,
    group: "actuator",
  },
  {
    id: "torque-sensor",
    name: "Torque sensor",
    role: "Sensing and control",
    function: "Measures output torque from the worm shaft's end thrust.",
    description:
      "When the wheel resists the worm, the worm shaft is pushed axially, in proportion to the output torque. A sensor at the end of the shaft measures that thrust. When it reaches the set torque limit, the motor is switched off to protect the valve and the actuator.",
    focus: [0.44, EPT.worm.y, EPT.worm.z],
    distance: 1.4,
    group: "actuator",
  },
  {
    id: "encoder",
    name: "Absolute position encoder",
    role: "Sensing and control",
    function: "Knows the output position at all times, with or without power.",
    description:
      "An absolute encoder on the output reports its true position directly, rather than counting movement from a reference. Position is never lost on a power cut, including when the valve is moved by hand with the power off.",
    focus: [0, 0.36, 0],
    distance: 1.4,
    group: "actuator",
  },
  {
    id: "handwheel",
    name: "Handwheel and hand/auto lever",
    role: "Output transmission",
    function: "Manual operation, independent of the motor.",
    description:
      "Locking the hand/auto lever in hand declutches the motor, so the handwheel drives the output without back-driving the motor. In auto, the motor drive takes priority. Manual operation works with no power at all.",
    focus: [EPT.handwheel.x, EPT.worm.y, EPT.worm.z],
    distance: 2.0,
    group: "actuator",
  },
  {
    id: "local-controls",
    name: "Local controls and display",
    role: "Sensing and control",
    function: "Local/Stop/Remote and Open/Close selectors, with a position display.",
    description:
      "The selectors work through the cover rather than through holes in it, so the enclosure stays sealed. The display shows valve position, and a backup battery keeps it running when mains power is off.",
    focus: [0, EPT.cover.y, EPT.cover.z + 0.1],
    distance: 1.8,
    group: "actuator",
  },
  {
    id: "terminal",
    name: "Terminal compartment",
    role: "Pressure containment",
    function: "Separately sealed space where power and control cables are connected.",
    description:
      "A sealed terminal block separates the wiring compartment from the electronics and gearing, so the internals stay sealed even with the terminal cover off during installation.",
    focus: [0, 0.45, -0.33],
    distance: 1.8,
    group: "actuator",
  },
  {
    id: "housing",
    name: "Gearcase",
    role: "Structure and alignment",
    function: "Holds the gear train in an oil bath and carries the output bearings.",
    description: "The gearcase supports the worm, wheel and output shaft in alignment. Gear trains of this type are commonly oil-bath lubricated for life.",
    focus: [0, 0.12, -0.1],
    distance: 2.6,
    group: "actuator",
  },
  {
    id: "travel-stops",
    name: "Mechanical end stops",
    role: "Structure and alignment",
    function: "Physical limits on the wheel segment's travel.",
    description:
      "The electrical position limits stop the motor at each end of travel. The mechanical stops are a backstop beyond them, and are also what the handwheel works against.",
    focus: [0.2, EPT.wheel.y, -0.1],
    distance: 1.5,
    group: "actuator",
  },
  {
    id: "output-shaft",
    name: "Output shaft",
    role: "Output transmission",
    function: "Carries torque from the wheel through the base to the valve.",
    description: "The output shaft runs from the wheel through the base, where the drive coupling and mounting flange follow standard patterns such as ISO 5211.",
    focus: [0, -0.3, 0],
    distance: 2.0,
    group: "actuator",
  },
  ...VALVE_PARTS,
];

const pt = (id: ComponentId) => ELECTRIC_PART_TURN_COMPONENTS.find((c) => c.id === id)!;

/**
 * Electric multi-turn on a rising-stem wedge gate valve. Architecture follows
 * public IQ literature; proportions are original.
 */
export const MULTI_TURN_COMPONENTS: ComponentInfo[] = [
  { ...pt("motor"), focus: [0.72, MT.worm.y, MT.worm.z] },
  { ...pt("worm"), focus: [0, MT.worm.y, MT.worm.z] },
  {
    id: "worm-wheel",
    name: "Worm wheel",
    role: "Torque conversion",
    function: "Full wheel on the hollow output, driven by the worm.",
    description: "A multi-turn actuator turns its output many times per stroke, so it needs a full wheel rather than a segment. The wheel is fixed to the hollow output shaft that the valve stem passes through.",
    focus: [0, MT.wheel.y, -0.1],
    distance: 1.8,
    group: "actuator",
  },
  { ...pt("torque-sensor"), focus: [0.44, MT.worm.y, MT.worm.z] },
  {
    id: "output-shaft",
    name: "Hollow output shaft",
    role: "Output transmission",
    function: "Turns the drive bush; the rising stem passes up through its centre.",
    description: "The output is hollow so a rising stem can travel up through the actuator. Drive dogs at its lower end engage slots in the drive bush in the thrust base.",
    focus: [0, 0.2, 0],
    distance: 1.8,
    group: "actuator",
  },
  {
    id: "encoder",
    name: "Absolute position encoder",
    role: "Sensing and control",
    function: "Tracks output turns, with or without power.",
    description: "On a multi-turn actuator the encoder must know how many turns the output has made, not just an angle. An absolute design keeps that count through a power cut and while the valve is moved by hand.",
    focus: [0, 0.5, 0],
    distance: 1.5,
    group: "actuator",
  },
  {
    id: "thrust-base",
    name: "Thrust base",
    role: "Structure and alignment",
    function: "Separate base that carries the stem thrust into the valve flange.",
    description: "The thrust base holds the drive bush on a thrust bearing. The reaction to pushing the stem up or down passes through the bearing and base into the valve, not through the gearbox. The flange interface commonly follows ISO 5210.",
    focus: [0, -0.14, 0],
    distance: 1.6,
    group: "actuator",
  },
  {
    id: "stem-nut",
    name: "Drive bush (stem nut)",
    role: "Torque conversion",
    function: "Threaded nut turned by the output; drives the stem up or down.",
    description: "The drive bush is machined with the valve stem's thread. It turns but cannot move axially; the stem moves axially but cannot turn. So each output turn raises or lowers the stem by one thread lead, converting torque into thrust.",
    focus: [0, -0.14, 0],
    distance: 1.3,
    group: "actuator",
  },
  {
    id: "handwheel",
    name: "Handwheel and hand/auto lever",
    role: "Output transmission",
    function: "Manual operation on top of the actuator.",
    description: "Moving the lever to Hand and turning the handwheel engages hand drive. It stays engaged until the actuator runs electrically, which automatically returns it to motor drive. Hand operation works with no power.",
    focus: [0, MT.handwheel.y, 0],
    distance: 1.8,
    group: "actuator",
  },
  {
    id: "stem-cover",
    name: "Stem cover tube",
    role: "Structure and alignment",
    function: "Protects the rising stem where it emerges above the actuator.",
    description: "As the valve opens, the stem rises through the hollow output and above the handwheel. The sealed cover tube keeps weather and dirt off the stem thread.",
    focus: [0, 0.95, 0],
    distance: 1.8,
    group: "actuator",
  },
  { ...pt("local-controls"), focus: [0, MT.gearcase.centre[1], 0.5] },
  { ...pt("terminal"), focus: [0, 0.58, -0.33] },
  { ...pt("housing"), focus: [0, 0.25, -0.1] },
  {
    id: "stem",
    name: "Valve stem",
    role: "Output transmission",
    function: "Threaded, non-rotating stem that carries the gate.",
    description: "The stem is prevented from turning, so when the nut turns the stem travels up or down. Its thread lead sets how far the gate moves per turn, and therefore how many turns a full stroke takes.",
    focus: [0, -0.6, 0],
    distance: 2.2,
    group: "valve",
  },
  {
    id: "gate",
    name: "Wedge gate",
    role: "Flow control",
    function: "Slides across the bore to shut off flow.",
    description: "Lifted clear of the bore, the gate leaves a full, unobstructed passage. Lowered, its wedge faces press into the seats. Gate valves are for isolation, open or shut; they are not suited to throttling.",
    focus: [0, MT.valve.pipeY, 0],
    distance: 2.2,
    group: "valve",
  },
  {
    id: "bonnet",
    name: "Bonnet and packing",
    role: "Pressure containment",
    function: "Closes the top of the body; packing seals around the moving stem.",
    description: "The bonnet carries the stem out of the pressure boundary. Packing around the stem seals it while letting it slide. Packing friction adds to the torque the actuator must supply.",
    focus: [0, -0.4, 0],
    distance: 1.8,
    group: "valve",
  },
  {
    id: "valve-body",
    name: "Gate valve body",
    role: "Pressure containment",
    function: "Contains the process fluid and houses the gate and seats.",
    description: "The body has a cavity above the bore to receive the gate when open. It is shown sectioned so the gate can be seen.",
    focus: [0, MT.valve.pipeY, 0],
    distance: 2.8,
    group: "valve",
  },
];

/**
 * Compact electromechanical part-turn. Layout after the public Noah NA
 * brochure; proportions are original.
 */
export const COMPACT_COMPONENTS: ComponentInfo[] = [
  {
    id: "motor",
    name: "Motor",
    role: "Motive power",
    function: "Small motor inside the case, protected by a thermal cut-out.",
    description: "A built-in thermal protector switches the motor off if it overheats, for example when it is stalled or run too often. That protects the winding, not the valve.",
    focus: [0.1, CPT.motor.y, CPT.motor.z],
    distance: 1.4,
    group: "actuator",
  },
  {
    id: "spur-gears",
    name: "Stage 1: spur gears",
    role: "Torque conversion",
    function: "Motor pinion drives a larger gear on the worm shaft.",
    description: "The first reduction stage. A small pinion driving a larger gear trades speed for torque by the ratio of their sizes before the worm stage multiplies it again.",
    caveat: "Two-stage self-locking gearing is documented; the exact gear types inside a given model are not. A spur-then-worm train is shown as an illustration.",
    focus: [CPT.spur.x, 0.07, CPT.worm.z],
    distance: 1.1,
    group: "actuator",
  },
  {
    id: "worm",
    name: "Stage 2: worm",
    role: "Torque conversion",
    function: "Drives the wheel segment; makes the train self-locking.",
    description: "The worm stage gives most of the reduction and stops the valve back-driving the actuator, so it holds position with no power.",
    focus: [0, CPT.worm.y, CPT.worm.z],
    distance: 1.1,
    group: "actuator",
  },
  {
    id: "worm-wheel",
    name: "Wheel segment",
    role: "Torque conversion",
    function: "Turns the output shaft through its quarter turn.",
    description: "Only about 90° of travel is needed, so a segment of a wheel is enough.",
    focus: [0, CPT.wheel.y, -0.06],
    distance: 1.1,
    group: "actuator",
  },
  {
    id: "limit-switches",
    name: "Cam limit switches",
    role: "Sensing and control",
    function: "Cams on the output press switches that stop the motor at open and closed.",
    description: "Each cam is set so its lobe presses a microswitch exactly at one end of travel, opening the motor circuit. Simple and adjustable, but the actuator only 'knows' the two ends; anything in between is unknown unless a position transmitter is fitted.",
    focus: [0.12, 0.19, 0],
    distance: 1.0,
    group: "actuator",
  },
  {
    id: "torque-switch",
    name: "Mechanical torque switch",
    role: "Sensing and control",
    function: "Spring-set switch that cuts the motor on excessive torque.",
    description: "When the load resists, the worm pushes against preset springs. Past the set point it operates a switch and cuts the motor. It protects the valve and actuator, but gives only 'tripped' or 'not tripped', not a torque value.",
    caveat: "Some small sizes have no torque switch at all.",
    focus: [CPT.worm.x0 + 0.05, CPT.worm.y + 0.04, CPT.worm.z],
    distance: 1.0,
    group: "actuator",
  },
  {
    id: "dome-indicator",
    name: "Domed position indicator",
    role: "Sensing and control",
    function: "Mechanical pointer on the output shaft, visible through a dome.",
    description: "Connected directly to the centre column, so it always shows the true valve position, with or without power.",
    focus: [0, CPT.dome.y + 0.04, 0],
    distance: 1.2,
    group: "actuator",
  },
  {
    id: "handwheel",
    name: "Handwheel and manual/auto lever",
    role: "Output transmission",
    function: "Manual operation, selected with a lockable lever.",
    description: "Handwheel drive is independent of the motor drive and selected with a lever that can be locked in either position.",
    focus: [CPT.handwheel.x, CPT.worm.y, CPT.worm.z],
    distance: 1.6,
    group: "actuator",
  },
  {
    id: "housing",
    name: "Case",
    role: "Structure and alignment",
    function: "Compact cast aluminium case with sealed cable entries.",
    description: "A powder-coated aluminium casting with O-ring-sealed joints and a heater to prevent condensation inside. Valve mounting follows ISO 5211.",
    focus: [CPT.case.centre[0], CPT.case.centre[1], CPT.case.centre[2]],
    distance: 2.0,
    group: "actuator",
  },
  {
    id: "travel-stops",
    name: "Stop bolts",
    role: "Structure and alignment",
    function: "Mechanical backstop beyond the limit switch settings.",
    description: "If a limit switch fails to stop the motor, the stop bolts physically prevent the output going past its end positions.",
    focus: [0.1, CPT.wheel.y, -0.05],
    distance: 1.1,
    group: "actuator",
  },
  { ...pt("output-shaft"), focus: [0, -0.3, 0] },
  ...VALVE_PARTS,
];

const GZ = -YOKE_OFFSET;
/** Direct-gas additions and overrides on top of the Scotch yoke list. */
export const GAS_COMPONENTS: ComponentInfo[] = [
  {
    id: "cylinder",
    name: "High-pressure gas cylinder",
    role: "Pressure containment",
    function: "Contains pipeline gas acting on the piston.",
    description:
      "A direct-gas actuator is powered by the gas in the pipeline it controls, at pipeline pressure. Because that pressure is high, the cylinder can be smaller in bore than an instrument-air cylinder for the same torque, with walls and seals rated for the pressure.",
    caveat: "Gas quality matters: pipeline gas may carry liquids or particles, so supply filters and materials suited to the gas are typical.",
    focus: [(CYLINDER.tubeStart + CYLINDER.tubeEnd) / 2, 0, GZ],
    distance: 3.2,
    group: "actuator",
  },
  {
    id: "hydraulic-override",
    name: "Hydraulic override cylinder",
    role: "Motive power",
    function: "Moves the actuator by hand-pumped oil when gas operation is not available.",
    description:
      "A small hydraulic cylinder in line with the gas cylinder. Its piston is on a tail rod from the gas piston. Pumping oil into one side pushes the whole slider; the trapped oil then holds the position. A release valve returns oil to the reservoir.",
    caveat: "Some designs use a mechanical (screw or gearbox) override instead; arrangements vary.",
    focus: [3.1, 0, GZ],
    distance: 2.6,
    group: "actuator",
  },
  {
    id: "hand-pump",
    name: "Hand pump",
    role: "Motive power",
    function: "Lever pump that feeds oil to the override cylinder.",
    description:
      "Each stroke of the lever displaces a small volume of oil, so a full valve stroke takes many lever strokes. A direction valve selects which side of the override cylinder receives oil; a reservoir sits on top of the pump.",
    focus: [3.1, 0.45, GZ],
    distance: 2.2,
    group: "actuator",
  },
  {
    id: "gas-tank",
    name: "Reserve gas tank",
    role: "Energy storage",
    function: "Stores pipeline gas behind a check valve for at least one stroke when the line pressure collapses.",
    description:
      "The check valve lets the tank fill from the pipeline but not drain back into it. When a line break drops pipeline pressure, the tank still holds enough gas to close the valve. Each stroke spends some of it, which is why the tank must be sized for the strokes it must guarantee.",
    caveat: "Tank volume and the number of guaranteed strokes come from the actuator and valve sizing, not from this model.",
    focus: [1.67, -0.9, 0.8],
    distance: 2.6,
    group: "actuator",
  },
  {
    id: "gas-controls",
    name: "Line-break control",
    role: "Sensing and control",
    function: "Watches the rate of pipeline pressure drop and closes the valve when it exceeds a set point.",
    description:
      "A pipeline rupture shows up as pressure falling much faster than normal operation ever causes. The control compares the rate of drop with a set point, and only trips if it stays above it for a delay, so short transients do not shut the line. Once tripped it latches until an operator resets it.",
    caveat: "Real line-break systems may combine rate-of-drop with low-pressure and high-pressure trips, and can be mechanical or electronic.",
    focus: [0.92, -0.78, 0.8],
    distance: 2.4,
    group: "actuator",
  },
];

/** Gas-over-oil overrides on top of the direct-gas list. */
export const GAS_OVER_OIL_COMPONENTS: ComponentInfo[] = [
  {
    id: "cylinder",
    name: "Hydraulic cylinder",
    role: "Pressure containment",
    function: "Contains the oil that drives the piston.",
    description:
      "In a gas-over-oil actuator the gas never enters the cylinder. Gas pushes on oil in the tanks, and the oil drives the piston. Oil is nearly incompressible, so the stroke is smooth and its speed can be metered precisely.",
    focus: [(CYLINDER.tubeStart + CYLINDER.tubeEnd) / 2, 0, GZ],
    distance: 3.2,
    group: "actuator",
  },
  {
    id: "gas-tank",
    name: "Gas/oil tanks",
    role: "Energy storage",
    function: "Two tanks where gas pressure acts on oil; one feeds each side of the cylinder.",
    description:
      "Control valves admit pipeline gas to the top of one tank. Its oil is pushed into the cylinder while oil from the other side returns to the second tank, whose gas is vented. Watch the oil levels swap as the valve strokes. Tank volume must cover a full stroke of oil.",
    caveat: "Tank arrangement, volumes and any separate gas storage vary with design and duty.",
    focus: [1.67, -0.9, 0.8],
    distance: 2.8,
    group: "actuator",
  },
  {
    id: "flow-controls",
    name: "Flow-control valves",
    role: "Flow control",
    function: "Meter the oil to set the stroke speed in each direction.",
    description:
      "Because oil is metered rather than gas, stroke time is steady and adjustable, and it barely changes with pipeline pressure. That control is a main reason to choose gas over oil for large pipeline valves, where slamming shut can cause surge.",
    focus: [1.3, -1.0, 0.8],
    distance: 2.4,
    group: "actuator",
  },
  {
    id: "gas-controls",
    name: "Line-break and low-pressure control",
    role: "Sensing and control",
    function: "Closes the valve on a fast pressure drop or a sustained low pipeline pressure.",
    description:
      "As on the direct-gas actuator, a rate-of-drop monitor detects a rupture. A low-pressure trip adds a second condition: if pipeline pressure stays below a set point, the valve closes even if it fell slowly. Both latch until reset.",
    focus: [0.92, -0.78, 0.8],
    distance: 2.4,
    group: "actuator",
  },
];

/** Electro-hydraulic overrides and additions on top of the Scotch yoke list. */
export const ELECTRO_HYDRAULIC_COMPONENTS: ComponentInfo[] = [
  {
    id: "cylinder",
    name: "Hydraulic cylinder",
    role: "Pressure containment",
    function: "Contains the oil the pump delivers to drive the piston.",
    description:
      "The integral pump pushes oil into the cylinder to stroke the piston against the spring. A solenoid valve then locks the oil in, so the actuator holds position with the pump off.",
    focus: [(CYLINDER.tubeStart + CYLINDER.tubeEnd) / 2, 0, GZ],
    distance: 3.2,
    group: "actuator",
  },
  {
    id: "power-unit",
    name: "Hydraulic power unit",
    role: "Motive power",
    function: "Motor, pump, reservoir and dump solenoid: makes hydraulic pressure on demand from electrical power.",
    description:
      "The motor runs the pump only while the actuator needs to move against the spring (or in either direction on double acting). The dump solenoid is held closed while powered; de-energising it releases the oil to the reservoir so the spring can stroke the valve. That makes power loss a fail-safe event for spring-return units.",
    caveat: "Pump type, reservoir arrangement and the number of solenoid valves vary with design and duty.",
    focus: [1.7, 0.1, 0.22],
    distance: 2.4,
    group: "actuator",
  },
  {
    id: "controller",
    name: "Integral controller",
    role: "Sensing and control",
    function: "Positions the valve to a demand signal, handles ESD and runs partial-stroke tests.",
    description:
      "The controller compares the measured position with the demand and runs the pump or opens the dump valve to close the gap, stopping inside a small deadband. A separate emergency shutdown input overrides the demand. Partial-stroke tests move the valve a short way toward its fail position and back, proving it is not stuck without stopping the process.",
    caveat: "Signal types, diagnostics and safety certification depend on the specific product.",
    focus: [2.68, 0, 0.22],
    distance: 2.2,
    group: "actuator",
  },
];

export function componentsFor(kind: MechanismKind, gasFamily: ActuatorFamilyId | null = null): ComponentInfo[] {
  if (gasFamily === "electro-hydraulic") {
    const extra = ELECTRO_HYDRAULIC_COMPONENTS;
    return [...COMPONENTS.map((c) => extra.find((g) => g.id === c.id) ?? c), ...extra.filter((g) => !COMPONENTS.some((c) => c.id === g.id))];
  }
  if (gasFamily) {
    const extra = gasFamily === "gas-over-oil" ? [...GAS_OVER_OIL_COMPONENTS, ...GAS_COMPONENTS.filter((g) => !GAS_OVER_OIL_COMPONENTS.some((o) => o.id === g.id))] : GAS_COMPONENTS;
    return [...COMPONENTS.map((c) => extra.find((g) => g.id === c.id) ?? c), ...extra.filter((g) => !COMPONENTS.some((c) => c.id === g.id))];
  }
  if (kind === "compact-electric") return COMPACT_COMPONENTS;
  if (kind === "multi-turn") return MULTI_TURN_COMPONENTS;
  if (kind === "worm-gear") return ELECTRIC_PART_TURN_COMPONENTS;
  return kind === "rack-pinion" ? RACK_PINION_COMPONENTS : COMPONENTS;
}

export function componentInfo(kind: MechanismKind, id: ComponentId, gasFamily: ActuatorFamilyId | null = null): ComponentInfo | undefined {
  return componentsFor(kind, gasFamily).find((c) => c.id === id);
}

/** @deprecated Scotch yoke only; use componentInfo(kind, id). */
export const COMPONENT_MAP: Record<ComponentId, ComponentInfo> = Object.fromEntries(
  COMPONENTS.map((c) => [c.id, c]),
) as Record<ComponentId, ComponentInfo>;
