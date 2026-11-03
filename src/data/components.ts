import type { ComponentId } from "@/lib/sim/types";
import { CYLINDER, SPRING_MODULE, VALVE, YOKE_OFFSET } from "@/lib/sim/geometry";
import { RP } from "@/lib/sim/rackPinionGeometry";
import { EPT } from "@/lib/sim/electricGeometry";
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

export function componentsFor(kind: MechanismKind): ComponentInfo[] {
  if (kind === "worm-gear") return ELECTRIC_PART_TURN_COMPONENTS;
  return kind === "rack-pinion" ? RACK_PINION_COMPONENTS : COMPONENTS;
}

export function componentInfo(kind: MechanismKind, id: ComponentId): ComponentInfo | undefined {
  return componentsFor(kind).find((c) => c.id === id);
}

/** @deprecated Scotch yoke only; use componentInfo(kind, id). */
export const COMPONENT_MAP: Record<ComponentId, ComponentInfo> = Object.fromEntries(
  COMPONENTS.map((c) => [c.id, c]),
) as Record<ComponentId, ComponentInfo>;
