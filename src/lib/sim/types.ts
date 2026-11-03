/**
 * Simulation domain types.
 *
 * These types are framework-agnostic: nothing in src/lib/sim imports React or
 * Three.js. The renderer consumes `SimulationState`; UI dispatches commands to
 * the engine.
 */

export type ActuatorFamilyId =
  | "pneumatic-scotch-yoke"
  | "pneumatic-rack-pinion"
  | "pneumatic-vane"
  | "electric-part-turn"
  | "electric-multi-turn"
  | "rising-stem-linear"
  | "hydraulic-scotch-yoke"
  | "hydraulic-rack-pinion"
  | "electro-hydraulic"
  | "electric-compact-part-turn"
  | "gas-scotch-yoke"
  | "gas-over-oil";

/** How motive energy drives the actuator. */
export type ActionType = "double-acting" | "spring-return";

/**
 * What the valve does when motive supply is lost.
 * - fail-closed / fail-open: only physically possible with stored energy (spring).
 * - fail-in-place: double-acting with no stored energy; the actuator stays where it is.
 */
export type FailPosition = "fail-closed" | "fail-open" | "fail-in-place";

export type VisualizationMode =
  | "normal"
  | "cutaway"
  | "mechanical"
  | "energy"
  | "engineering";

export type CutawayStyle = "solid" | "ghost" | "section";

export type MotionDirection = "opening" | "closing" | "stopped";

/**
 * Pneumatic condition of a cylinder chamber.
 * - supply: connected to supply and pressurised
 * - exhaust: connected to exhaust/vent and emptying
 * - atmosphere: open to atmosphere via breather (spring side of spring-return)
 * - idle: no supply connected, no pressure differential (e.g. supply lost)
 */
export type ChamberCondition = "supply" | "exhaust" | "atmosphere" | "idle";

export type ComponentId =
  | "housing"
  | "cylinder"
  | "end-caps"
  | "piston"
  | "connecting-mechanism"
  | "guide-bar"
  | "yoke"
  | "pin"
  | "output-shaft"
  | "spring"
  | "bracket"
  | "valve-body"
  | "ball"
  | "stem"
  | "rack"
  | "pinion"
  | "travel-stops"
  | "motor"
  | "worm"
  | "worm-wheel"
  | "handwheel"
  | "torque-sensor"
  | "encoder"
  | "local-controls"
  | "terminal"
  | "thrust-base"
  | "stem-nut"
  | "stem-cover"
  | "gate"
  | "bonnet"
  | "limit-switches"
  | "torque-switch"
  | "dome-indicator"
  | "spur-gears"
  | "hydraulic-override"
  | "hand-pump"
  | "gas-controls"
  | "gas-tank"
  | "flow-controls"
  | "power-unit"
  | "controller";

export interface ActuatorConfiguration {
  family: ActuatorFamilyId;
  actionType: ActionType;
  /** For double-acting this is always "fail-in-place". */
  failPosition: FailPosition;
  /** Scotch yoke only: symmetric (default) or canted torque characteristic. */
  yoke?: "symmetric" | "canted";
  /** Quarter-turn valve driven (default ball). */
  valve?: ValveKind;
}

export type ValveKind = "ball" | "butterfly" | "plug";

/** Illustrative torque values, normalised (dimensionless). NOT manufacturer data. */
export interface TorqueSnapshot {
  /** Torque available from air on the piston at the current angle. */
  air: number;
  /** Torque produced by the spring at the current angle (spring-return only). */
  spring: number;
  /** Illustrative valve torque demand at the current valve position. */
  valveDemand: number;
  /** Net torque in the direction of travel. Negative or zero = stall. */
  net: number;
}

export type LocalSelector = "local" | "stop" | "remote";

/** Enclosure paint. Real actuators ship in customer-specified colours. */
export type PaintFinish = "graphite" | "red" | "blue" | "yellow";

/** Electric actuator state. Present for every family; only used by electric ones. */
export interface ElectricState {
  /** Local/Stop/Remote selector on the actuator's local controls. */
  selector: LocalSelector;
  /** Hand/auto lever locked in hand: motor declutched, handwheel drives. */
  handMode: boolean;
  /** Handwheel being turned: -1 toward closed, +1 toward open, 0 not turning. */
  handDir: -1 | 0 | 1;
  /** Torque switch-off setting, fraction of rated output (0.4..1). */
  torqueLimit: number;
  /** Teaching aid: a jam partway through the opening stroke. */
  obstruction: boolean;
  /** Direction the motor was travelling when it tripped on torque, or null. */
  tripped: "opening" | "closing" | null;
  motorRunning: boolean;
  /** Output torque the actuator is producing, illustrative units (rated = 1 on the display scale). */
  outputTorque: number;
  /** Multi-turn: stop closing when torque reaches the limit (torque-seated) rather than at the position limit. */
  closeOnTorque: boolean;
  /** Multi-turn: the last close finished by seating on torque. */
  seated: boolean;
}

/** Direct-gas actuator state. Present for every family; only used by gas ones. */
export interface GasState {
  /** Pipeline pressure upstream of the actuator, illustrative bar(g). */
  pipeline: number;
  /** Operator-set pipeline pressure the line returns to when intact. */
  pipelineSet: number;
  /** Reserve tank behind a check valve: follows the line up, never down. */
  tank: number;
  /** Filtered rate of pipeline pressure change, bar/s (negative = falling). */
  rate: number;
  /** A pipeline rupture downstream is in progress. */
  ruptured: boolean;
  /** Line-break detection armed. */
  armed: boolean;
  /** Rate-of-drop set point, bar/s. */
  setPoint: number;
  /** Seconds the drop rate has exceeded the set point. */
  overFor: number;
  /** Line-break control has tripped and latched a close. */
  tripped: boolean;
  /** Hydraulic manual override selected (gas controls isolated). */
  manual: boolean;
  /** Gas-over-oil: low-pressure trip set point, bar. */
  lowSet: number;
  /** Gas-over-oil: flow-control valve opening, 0.2..1 (sets stroke speed). */
  flow: number;
  /** Which condition tripped the line-break control. */
  tripCause: "rate" | "low" | null;
  /** Hand pump: +1 pumping toward open, -1 toward closed, 0 idle. */
  pumpDir: -1 | 0 | 1;
  /** Pump lever phase, radians (visual). */
  pumpPhase: number;
}

/** Electro-hydraulic state. Present for every family; only used by electro-hydraulic. */
export interface ElectroHydraulicState {
  /** Positioner demand, valve position 0..1, or null for no demand. */
  demand: number | null;
  /** Emergency shutdown input active: dump oil, spring to fail position. */
  esd: boolean;
  /** Partial-stroke test phase. */
  pst: "idle" | "out" | "back" | "passed" | "failed";
  /** Simulation time the current PST phase started. */
  pstStart: number;
  /** Teaching aid: valve stuck in position (PST should fail). */
  stuck: boolean;
  motorRunning: boolean;
  /** Dump solenoid open: oil returning to the reservoir under spring force. */
  dumping: boolean;
  /** Illustrative hydraulic pressure, bar. */
  pressure: number;
}

export interface SimulationState {
  config: ActuatorConfiguration;

  /** Actuator stroke, 0 = start of air stroke (spring end), 1 = end of air stroke. */
  stroke: number;
  /** Valve opening, normalised 0 (closed) .. 1 (open). Derived from stroke + coupling. */
  position: number;
  /** Valve position the current command is driving toward, or null when idle. */
  targetPosition: number | null;
  /** Actuator output shaft rotation from stroke start, degrees 0..90. */
  outputAngle: number;
  /** Stroke velocity, stroke-units per second (signed). */
  velocity: number;
  direction: MotionDirection;

  /** Illustrative supply pressure, bar(g). */
  supplyPressure: number;
  supplyAvailable: boolean;

  /**
   * Control signal. For double-acting: which end the directional valve routes air to.
   * For spring-return: true = solenoid energised (air to cylinder), false = vented.
   * `null` = no command issued since reset.
   */
  commandedStroke: 0 | 1 | null;

  chamberA: ChamberCondition; // inner chamber: pressure here drives stroke 0 -> 1
  chamberB: ChamberCondition; // outer chamber: pressure here drives stroke 1 -> 0 (DA only)
  /** True while air is actually flowing (piston moving under air or venting). */
  airFlowing: boolean;

  torque: TorqueSnapshot;
  stalled: boolean;

  playing: boolean;
  speed: number;
  autoCycle: boolean;

  mode: VisualizationMode;
  cutaway: CutawayStyle;
  housingOpacity: number;
  showLabels: boolean;
  selectedComponent: ComponentId | null;

  /** Plain-language explanation of what the actuator is doing and why. */
  status: string;
  /** Short-lived message after a rejected command (e.g. no supply). */
  notice: string | null;

  /** Simulation clock, seconds (pauses when `playing` is false). */
  time: number;

  electric: ElectricState;
  gas: GasState;
  eh: ElectroHydraulicState;
  paint: PaintFinish;
}

export type SimulationCommand =
  | { type: "open" }
  | { type: "close" }
  | { type: "reset" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "toggle-play" }
  | { type: "set-speed"; speed: number }
  | { type: "set-auto-cycle"; value: boolean }
  | { type: "set-supply"; available: boolean }
  | { type: "set-pressure"; bar: number }
  | { type: "set-config"; config: Partial<ActuatorConfiguration> }
  | { type: "set-mode"; mode: VisualizationMode }
  | { type: "set-cutaway"; style: CutawayStyle }
  | { type: "set-housing-opacity"; value: number }
  | { type: "set-labels"; value: boolean }
  | { type: "select"; id: ComponentId | null }
  | { type: "seek"; position: number }
  | { type: "stop" }
  | { type: "set-selector"; value: LocalSelector }
  | { type: "set-hand"; value: boolean }
  | { type: "handwheel"; dir: -1 | 0 | 1 }
  | { type: "set-torque-limit"; value: number }
  | { type: "set-obstruction"; value: boolean }
  | { type: "set-close-on-torque"; value: boolean }
  | { type: "set-paint"; value: PaintFinish }
  | { type: "set-rupture"; value: boolean }
  | { type: "set-line-break-armed"; value: boolean }
  | { type: "set-line-break-rate"; value: number }
  | { type: "reset-line-break" }
  | { type: "set-manual"; value: boolean }
  | { type: "set-flow"; value: number }
  | { type: "set-demand"; value: number | null }
  | { type: "set-esd"; value: boolean }
  | { type: "start-pst" }
  | { type: "set-stuck"; value: boolean }
  | { type: "set-low-set"; value: number }
  | { type: "pump"; dir: -1 | 0 | 1 };
