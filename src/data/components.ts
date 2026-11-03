import type { ComponentId } from "@/lib/sim/types";
import { CYLINDER, SPRING_MODULE, VALVE, YOKE_OFFSET } from "@/lib/sim/geometry";

export type ComponentRole =
  | "Linear movement"
  | "Torque conversion"
  | "Output transmission"
  | "Pressure containment"
  | "Energy storage"
  | "Flow control"
  | "Structure and alignment";

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

export const COMPONENT_MAP: Record<ComponentId, ComponentInfo> = Object.fromEntries(
  COMPONENTS.map((c) => [c.id, c]),
) as Record<ComponentId, ComponentInfo>;
