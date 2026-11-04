/**
 * Fault-finding scenarios. Each loads a simulator with a hidden fault injected
 * through ordinary engine commands, so the symptom comes from the same physics
 * the learner has been using, not from a script. Status text is hidden during
 * the challenge: the learner has to operate the actuator and read the
 * instruments. Every symptom is checked in src/lib/sim/__tests__/faults.test.ts.
 */
import type { SimulationEngine } from "@/lib/sim/engine";
import type { ActuatorConfiguration, VisualizationMode } from "@/lib/sim/types";
import type { ExtraControl } from "@/components/learn/EmbeddedSim";

export interface FaultScenario {
  id: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  /** The work order: what operations reported. */
  report: string;
  config: Partial<ActuatorConfiguration>;
  mode?: VisualizationMode;
  /** Inject the fault (runs before the clock starts). */
  setup: (e: SimulationEngine) => void;
  /** Extra tools the technician has for this unit. */
  extras?: ExtraControl[];
  hint: string;
  options: string[];
  answer: number;
  explanation: string;
  lesson: string;
}

/** Advance the engine in real-time-sized steps (setup only). */
export function runFor(e: SimulationEngine, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 60) e.advance(1 / 60);
}

export const FAULTS: FaultScenario[] = [
  {
    id: "will-not-open",
    title: "Will not open",
    level: "Beginner",
    report: "A spring-return, fail-closed valve will not open on command. It closed normally this morning.",
    config: { actionType: "spring-return", failPosition: "fail-closed" },
    setup: (e) => e.dispatch({ type: "set-pressure", bar: 3 }),
    hint: "Press Open, then look at the instruments. Is air reaching the cylinder? Is there enough of it?",
    options: [
      "The spring has broken",
      "The solenoid is not receiving the Open command",
      "Supply pressure is too low to break the valve out against the spring",
      "The air supply is completely lost",
    ],
    answer: 2,
    explanation:
      "Chamber A shows supply, so the command and the air are both arriving. But the supply reads about 3 bar and the margin is negative: air torque minus spring torque cannot beat the valve's break-out torque. A broken spring would make opening easier, not harder.",
    lesson: "supply-pressure-sizing",
  },
  {
    id: "stops-short",
    title: "Stops short of open",
    level: "Intermediate",
    report: "The valve opens most of the way, then stops. The open limit switch never makes, so the control system raises a travel alarm.",
    config: { actionType: "spring-return", failPosition: "fail-closed" },
    mode: "engineering",
    setup: (e) => e.dispatch({ type: "set-pressure", bar: 4 }),
    hint: "Open it and watch where it stops on the torque chart. Is the margin positive when it stops?",
    options: [
      "Supply pressure is marginal: the spring gets stronger toward the end of the air stroke",
      "The open travel stop is set too short",
      "The valve is seized part-way",
      "The spring is too weak",
    ],
    answer: 0,
    explanation:
      "The actuator stops with air still supplied and a negative margin. On a spring-return unit the spring pushes back harder the further it is compressed, so the net air torque falls toward the end of the stroke. A mis-set travel stop would stop it with torque to spare; a seized valve would not have opened most of the way smoothly.",
    lesson: "double-acting-vs-spring-return",
  },
  {
    id: "fails-wrong-way",
    title: "Fails the wrong way",
    level: "Intermediate",
    report: "After a maintenance shutdown, a valve that should fail CLOSED went open during the air-loss test.",
    config: { family: "pneumatic-rack-pinion", actionType: "spring-return", failPosition: "fail-open" },
    setup: () => {},
    hint: "Remove the supply and see where it goes. Then ask what decides which end of the stroke is 'closed'.",
    options: [
      "The springs were removed",
      "A double-acting actuator was fitted by mistake",
      "The solenoid was wired the wrong way",
      "The actuator was refitted to the valve 90° out, so the spring end is now valve open",
    ],
    answer: 3,
    explanation:
      "It still moves to its spring end on air loss, so the springs are there and it is still spring return (a double-acting unit would stay put). What changed is the coupling orientation: turned 90°, the spring end of the stroke is valve open.",
    lesson: "fail-open-vs-fail-closed",
  },
  {
    id: "ignores-commands",
    title: "Ignores every command",
    level: "Beginner",
    report: "An electric part-turn actuator does nothing when the control room sends Open or Close. The display is lit.",
    config: { family: "electric-part-turn" },
    setup: (e) => e.dispatch({ type: "set-selector", value: "stop" }),
    hint: "The display is lit, so it has power. Check the instruments for the local controls.",
    options: [
      "Mains power is lost",
      "The local selector has been left at Stop",
      "The motor has tripped on torque",
      "The hand/auto lever is locked in hand",
    ],
    answer: 1,
    explanation:
      "Power is on and there is no trip. The selector reads Stop, which blocks all commands, local and remote. It is common after local maintenance: the selector should be returned to Remote.",
    lesson: "electric-actuators",
  },
  {
    id: "stops-mid-travel",
    title: "Stops mid-travel",
    level: "Intermediate",
    report: "An electric actuator stops part-way while opening and reports a fault. Closing works.",
    config: { family: "electric-part-turn" },
    mode: "engineering",
    setup: (e) => e.dispatch({ type: "set-obstruction", value: true }),
    hint: "Open it and compare the output torque with the limit at the moment it stops.",
    options: [
      "The open position limit is set too short",
      "Power dropped out during the stroke",
      "Something in the valve is jamming it, and torque protection stopped the motor",
      "The torque limit is set below the seat break-out torque",
    ],
    answer: 2,
    explanation:
      "It broke out of the seat and ran normally, then torque rose to the limit mid-travel and the motor tripped. A short position limit would stop it without a trip; a torque limit below break-out would trip at the seat, not part-way. Investigate the valve before raising the torque limit.",
    lesson: "electric-actuators",
  },
  {
    id: "will-not-reopen",
    title: "Will not reopen",
    level: "Advanced",
    report: "A pipeline block valve closed itself last night. The line has been repaired and repressurised, but the valve will not open.",
    config: { family: "gas-scotch-yoke", actionType: "double-acting" },
    mode: "engineering",
    setup: (e) => {
      e.dispatch({ type: "open" });
      runFor(e, 8);
      e.dispatch({ type: "set-rupture", value: true });
      runFor(e, 15);
      e.dispatch({ type: "set-rupture", value: false });
      runFor(e, 20);
    },
    extras: ["rupture"],
    hint: "Pipeline pressure looks normal again. What is the line-break control telling you?",
    options: [
      "Pipeline pressure is still too low",
      "The line-break trip is latched and has not been reset",
      "The hydraulic manual override is selected",
      "The reserve gas tank is empty",
    ],
    answer: 1,
    explanation:
      "Pipeline and tank pressures are back to normal, but the line-break control still reads tripped. Trips latch on purpose, so a repaired line does not reopen the valve by itself. Once the line is confirmed safe, reset the trip, then open.",
    lesson: "line-break-protection",
  },
  {
    id: "pst-failed",
    title: "Partial-stroke test failed",
    level: "Advanced",
    report: "An electro-hydraulic shutdown valve failed its scheduled partial-stroke test overnight. It shows open and the process is running.",
    config: { family: "electro-hydraulic", actionType: "spring-return", failPosition: "fail-closed" },
    mode: "engineering",
    setup: (e) => {
      e.dispatch({ type: "open" });
      runFor(e, 8);
      e.dispatch({ type: "set-stuck", value: true });
    },
    extras: ["esd"],
    hint: "Run the test again and watch the pump, the pressure and the position.",
    options: [
      "ESD is active",
      "Power is lost",
      "The partial-stroke test is set to move too far",
      "The valve or actuator is seized and cannot move",
    ],
    answer: 3,
    explanation:
      "Power is on, ESD is healthy and the controller commands the move, but the position does not change and the test times out. The valve may not close on a real demand, so this is a dangerous failure: raise it for urgent maintenance rather than repeating the test.",
    lesson: "esd-and-partial-stroke",
  },
];
