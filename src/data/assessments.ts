import type { Question } from "./lessons";

export interface Assessment {
  slug: string;
  title: string;
  level: "Beginner" | "Intermediate";
  description: string;
  passMark: number; // fraction
  relatedLessons: string[];
  questions: Question[];
}

export const ASSESSMENTS: Assessment[] = [
  {
    slug: "actuator-fundamentals",
    title: "Actuator fundamentals",
    level: "Beginner",
    description: "Actuators and valves, power sources, movement types and quarter-turn valve basics.",
    passMark: 0.7,
    relatedLessons: ["what-is-an-actuator", "actuator-vs-valve", "power-sources", "linear-vs-rotary", "quarter-turn-valves"],
    questions: [
      {
        id: "f1",
        prompt: "What does an actuator convert into mechanical movement?",
        options: ["Process fluid", "Energy, in response to a control signal", "Temperature", "Valve position into flow"],
        answer: 1,
        explanation: "An actuator takes energy (air, oil or electricity) and, when commanded, produces movement.",
      },
      {
        id: "f2",
        prompt: "Which component contains process pressure in an actuated valve assembly?",
        options: ["Actuator cylinder", "Valve body", "Mounting bracket", "Solenoid valve"],
        answer: 1,
        explanation: "The valve body contains the process fluid. The actuator cylinder contains only its motive air or oil.",
      },
      {
        id: "f3",
        prompt: "Force from a pneumatic piston is approximately…",
        options: ["Pressure × piston area", "Pressure ÷ area", "Speed × mass", "Voltage × current"],
        answer: 0,
        explanation: "F = P × A, before friction and spring forces.",
      },
      {
        id: "f4",
        prompt: "Which power source is effectively incompressible, giving stiff positioning?",
        options: ["Compressed air", "Hydraulic oil", "Electricity", "Steam"],
        answer: 1,
        explanation: "Hydraulic fluid barely compresses, so the piston does not 'bounce' under load the way it can with air.",
      },
      {
        id: "f5",
        prompt: "A butterfly valve needs which type of actuator output?",
        options: ["Linear", "Multi-turn", "Quarter-turn", "None"],
        answer: 2,
        explanation: "The disc rotates about 90° from closed to open.",
      },
      {
        id: "f6",
        prompt: "What usually connects the actuator output shaft to the valve stem?",
        options: ["A coupling", "A gasket", "A filter", "A limit switch"],
        answer: 0,
        explanation: "The coupling transmits torque between the two shafts; the bracket holds them aligned.",
      },
      {
        id: "f7",
        prompt: "A ball valve reads 25% position. Which statement is correct?",
        options: ["Flow is 25% of maximum", "The ball has turned about 22.5° from closed", "The valve is leaking", "The actuator has stalled"],
        answer: 1,
        explanation: "25% of a 90° stroke is 22.5°. Flow depends on the valve characteristic and system, so it is not simply 25%.",
      },
      {
        id: "f8",
        prompt: "Why might a site choose an electro-hydraulic actuator?",
        options: ["It needs no power at all", "It gives hydraulic force with only an electrical supply", "It is always the cheapest option", "It has no moving parts"],
        answer: 1,
        explanation: "An integral motor-driven pump makes hydraulic pressure locally, useful where there is no air or hydraulic supply.",
      },
    ],
  },
  {
    slug: "scotch-yoke-mechanics",
    title: "Scotch yoke mechanics",
    level: "Intermediate",
    description: "Force path, pin and slot kinematics, torque curve shape and spring-return behaviour.",
    passMark: 0.7,
    relatedLessons: ["scotch-yoke-mechanics", "double-acting-vs-spring-return"],
    questions: [
      {
        id: "s1",
        prompt: "What constrains the guide block to move in a straight line?",
        options: ["The yoke slot", "The guide bar", "The output shaft", "The spring"],
        answer: 1,
        explanation: "The guide bar reacts side loads so the block, and therefore the pin, travel straight.",
      },
      {
        id: "s2",
        prompt: "The pin's distance from the shaft at yoke angle φ is…",
        options: ["d · cos φ", "d / cos φ", "d · tan φ", "constant"],
        answer: 1,
        explanation: "With d the offset to the pin's line of travel, the radial distance is d / cos φ, which is why the pin slides in the slot.",
      },
      {
        id: "s3",
        prompt: "For constant piston force, the symmetric Scotch yoke torque curve is…",
        options: ["Flat", "Highest at mid-stroke", "Highest at both ends, lowest at mid-stroke", "Highest at one end only"],
        answer: 2,
        explanation: "T = F·d / cos²φ is symmetric about φ = 0, with minimum at mid-stroke.",
      },
      {
        id: "s4",
        prompt: "Why does a symmetric Scotch yoke suit many ball valves?",
        options: ["Ball valves need most torque at mid-stroke", "Ball valves need most torque near the ends, at break-out and re-seat", "Ball valves need no torque", "It uses less air"],
        answer: 1,
        explanation: "Seat friction peaks near closed; the yoke delivers its highest torque near the ends.",
      },
      {
        id: "s5",
        prompt: "A spring-return, fail-closed actuator is fully open when supply is lost. What happens?",
        options: ["It stays open", "The cylinder vents and the spring closes the valve", "It moves to 50%", "It waits for a new command"],
        answer: 1,
        explanation: "With air gone, the spring is the only active force, and it drives to the spring end, which is closed here.",
      },
      {
        id: "s6",
        prompt: "In spring return, which torque must be checked at the end of the spring stroke?",
        options: ["Air torque at maximum pressure", "Spring torque against the valve's requirement", "Motor torque", "None, springs always win"],
        answer: 1,
        explanation: "At the end of the spring stroke the spring is at its weakest. It must still exceed the valve's requirement with margin.",
      },
      {
        id: "s7",
        prompt: "A double-acting actuator loses supply. Which statement is correct?",
        options: ["It always fails closed", "It always fails open", "It fails in place unless stored energy is added", "It reverses direction"],
        answer: 2,
        explanation: "Double acting has no spring. An air reservoir and suitable control circuit can provide a fail action, but otherwise it stays put.",
      },
      {
        id: "s8",
        prompt: "What is the role of a canted yoke?",
        options: ["To remove the need for a piston", "To shift peak torque toward one end of travel", "To make the stroke longer than 90°", "To replace the guide bar"],
        answer: 1,
        explanation: "Angling the slot changes the lever arm along the stroke, favouring one end.",
      },
    ],
  },
  {
    slug: "power-and-safety",
    title: "Power sources and safety functions",
    level: "Intermediate",
    description: "Pipeline gas, gas over oil, electro-hydraulic and electric actuators: line break, ESD, partial-stroke testing and fail positions.",
    passMark: 0.7,
    relatedLessons: ["power-sources", "fail-open-vs-fail-closed", "symmetric-vs-canted-yoke"],
    questions: [
      {
        id: "p1",
        prompt: "Why might a remote pipeline valve use a direct-gas actuator?",
        options: ["Gas is cheaper than air", "The site has pipeline gas but no instrument air or reliable power", "Gas actuators need no maintenance", "Gas gives a flat torque curve"],
        answer: 1,
        explanation: "The pipeline's own gas is the energy source that is always there.",
      },
      {
        id: "p2",
        prompt: "A rate-of-drop line-break control only trips after the drop has lasted a set delay. Why?",
        options: ["To save gas", "So short transients do not shut the line", "To let the tank empty", "Because the gauge is slow"],
        answer: 1,
        explanation: "Normal operations can cause brief pressure dips. The delay filters them out; a rupture keeps falling.",
      },
      {
        id: "p3",
        prompt: "After a line break, what lets a double-acting direct-gas actuator still close the valve?",
        options: ["A spring", "Gas stored in a tank behind a check valve", "The hand pump", "Pipeline pressure"],
        answer: 1,
        explanation: "The check valve stops the stored gas draining back into the collapsing line.",
      },
      {
        id: "p4",
        prompt: "Pipeline pressure falls slowly but stays very low. Which trip catches it?",
        options: ["Rate of drop", "Low pressure", "Torque", "Partial-stroke test"],
        answer: 1,
        explanation: "A slow fall never exceeds the rate set point. A low-pressure trip covers that case.",
      },
      {
        id: "p5",
        prompt: "What mainly sets stroke speed on a gas-over-oil actuator?",
        options: ["Pipeline pressure", "Oil flow-control valves", "The spring", "Motor speed"],
        answer: 1,
        explanation: "Oil is metered, so speed is steady and adjustable and changes little with gas pressure.",
      },
      {
        id: "p6",
        prompt: "A spring-return electro-hydraulic actuator loses power. What happens?",
        options: ["It stays in place", "The dump solenoid opens and the spring drives to the fail position", "The pump runs on battery", "It moves to 50%"],
        answer: 1,
        explanation: "The dump solenoid is held closed by power. Losing power releases the oil and lets the spring act.",
      },
      {
        id: "p7",
        prompt: "What does a partial-stroke test prove?",
        options: ["The valve seals tightly", "The valve and actuator can still move toward the fail position, without stopping the process", "The torque switch setting", "The supply pressure"],
        answer: 1,
        explanation: "A short move and return shows the valve is not stuck. It does not prove tight shut-off.",
      },
      {
        id: "p8",
        prompt: "An intelligent electric part-turn actuator with no stored-energy option loses power at 30% open. What happens?",
        options: ["It closes", "It opens", "It stays at about 30%, and still knows its position", "It loses its position"],
        answer: 2,
        explanation: "The self-locking gearing holds it and the absolute encoder keeps the position.",
      },
    ],
  },
];

export const ASSESSMENT_MAP = Object.fromEntries(ASSESSMENTS.map((a) => [a.slug, a])) as Record<string, Assessment>;
