/**
 * Academy curriculum. Only lessons with status "available" have content.
 * Planned lessons are listed so learners can see the path, and are never
 * shown as completed or as if they had content.
 */

export type Level = "Beginner" | "Intermediate" | "Advanced";

export type FigureId =
  | "actuator-system"
  | "power-sources"
  | "linear-rotary"
  | "quarter-turn"
  | "scotch-yoke-live"
  | "torque-curves"
  | "spring-return-live"
  | "fail-comparison"
  | "rack-pinion-live"
  | "rack-pinion-torque"
  | "yoke-compare"
  | "yoke-compare-sr"
  | "electric-live"
  | "line-break-live"
  | "esd-pst-live";

export interface Question {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface LessonSection {
  heading: string;
  body: string[];
  figure?: FigureId;
  /** One real, memorable number, set large like a presentation slide. */
  stat?: { value: string; label: string };
}

export interface Lesson {
  slug: string;
  number: number;
  title: string;
  level: Level;
  status: "available" | "planned";
  minutes?: number;
  summary: string;
  objectives?: string[];
  sections?: LessonSection[];
  terms?: { term: string; definition: string }[];
  checks?: Question[];
}

export const LESSONS: Lesson[] = [
  {
    slug: "what-is-an-actuator",
    number: 1,
    title: "What is an actuator?",
    level: "Beginner",
    status: "available",
    minutes: 8,
    summary: "The device that turns a control signal and a source of energy into mechanical movement.",
    objectives: [
      "Define an actuator in one sentence.",
      "Name the three things every actuator needs: a power source, a control signal and a mechanism.",
      "Explain why process plants automate valves.",
    ],
    sections: [
      {
        heading: "Movement on command",
        body: [
          "An **actuator** is a device that produces mechanical movement when it is told to. In process plants, that movement usually opens, closes or positions a valve.",
          "Every actuator combines three things: a **source of energy** (compressed air, hydraulic fluid or electricity), a **control signal** that says when and where to move, and a **mechanism** that turns the energy into the right kind of movement.",
        ],
        figure: "actuator-system",
      },
      {
        heading: "Why automate a valve?",
        body: [
          "A person with a handwheel can operate a valve, but not from a control room, not in a fraction of a second during an emergency, and not thousands of times a day.",
          "Actuators let a control system operate valves remotely, repeatably and, when designed for it, automatically move them to a safe position if something goes wrong.",
        ],
      },
      {
        heading: "What an actuator is not",
        body: [
          "The actuator does not control the fluid directly. The **valve** does that. The actuator supplies the torque or thrust the valve needs. Keeping those two roles separate makes sizing and troubleshooting much easier, and is the subject of the next lesson.",
        ],
      },
    ],
    terms: [
      { term: "Actuator", definition: "A device that converts energy into mechanical movement in response to a control signal." },
      { term: "Motive power", definition: "The energy source that drives the actuator, such as compressed air, hydraulic fluid or electricity." },
      { term: "Control signal", definition: "The command that tells the actuator to move, for example energising a solenoid valve." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "Which of these is an actuator's job?",
        options: ["Seal against process pressure", "Provide the movement that operates the valve", "Measure flow in the pipe", "Store process fluid"],
        answer: 1,
        explanation: "The actuator provides torque or thrust to move the valve. Sealing and controlling the fluid is the valve's job.",
      },
      {
        id: "q2",
        prompt: "Which list contains the three things every actuator needs?",
        options: ["Power source, control signal, mechanism", "Valve, pipe, pump", "Motor, battery, display", "Spring, piston, solenoid"],
        answer: 0,
        explanation: "Every actuator needs energy, an instruction to move and a mechanism. The other lists name specific parts that only some actuators have.",
      },
    ],
  },
  {
    slug: "actuator-vs-valve",
    number: 2,
    title: "Actuator versus valve",
    level: "Beginner",
    status: "available",
    minutes: 8,
    summary: "Where the valve's job ends and the actuator's begins, and how the two are joined.",
    objectives: ["Separate the roles of valve and actuator.", "Describe the mounting interface between them.", "Explain why valve torque drives actuator selection."],
    sections: [
      {
        heading: "Two devices, one assembly",
        body: [
          "A **valve** controls fluid: it contains pressure, seals, and opens or restricts a passage. An **actuator** moves the valve's closure member (ball, disc, plug or gate).",
          "They are usually bought, sized and maintained as separate items, then joined with a mounting bracket and a coupling so the actuator's output shaft drives the valve stem.",
        ],
      },
      {
        heading: "The interface",
        body: [
          "The bracket holds the actuator square and concentric to the valve. The coupling transmits torque from the actuator shaft to the valve stem. Any misalignment adds side loads and wear, and any backlash shows up as lost motion.",
          "Many valves and actuators follow standard mounting patterns (ISO 5211 is common for part-turn valves), which makes them easier to pair. Always check the specific documentation.",
        ],
      },
      {
        heading: "The valve sets the requirement",
        body: [
          "The valve's torque requirement depends on its type, size, seat materials, pressure and service. The actuator must exceed it at every point of the stroke, with a safety margin. That is why sizing starts with the valve data, not the actuator catalogue.",
        ],
      },
    ],
    terms: [
      { term: "Closure member", definition: "The part of a valve that blocks or opens the flow path: ball, disc, plug or gate." },
      { term: "Coupling", definition: "The part that connects the actuator output shaft to the valve stem and transmits torque." },
      { term: "Mounting bracket", definition: "The structure that fixes the actuator to the valve and keeps the shafts aligned." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "Which device contains process pressure?",
        options: ["The actuator", "The valve", "The solenoid", "The coupling"],
        answer: 1,
        explanation: "The valve body and seats contain the process fluid. The actuator only provides movement.",
      },
      {
        id: "q2",
        prompt: "Where should actuator sizing start?",
        options: ["The largest actuator in stock", "The valve's torque requirement", "The pipe colour", "The control room layout"],
        answer: 1,
        explanation: "The actuator must exceed the valve's torque requirement with margin, so valve data comes first.",
      },
    ],
  },
  {
    slug: "power-sources",
    number: 3,
    title: "Pneumatic, hydraulic and electric power",
    level: "Beginner",
    status: "available",
    minutes: 10,
    summary: "How each energy source produces force, and the practical trade-offs between them.",
    objectives: ["Describe how each power source produces force.", "Compare them on speed, force density, fail-safe ability and infrastructure.", "Recognise electro-hydraulic as a combination."],
    sections: [
      {
        heading: "Three ways to make force",
        stat: { value: "F = P × A", label: "Piston force is pressure times area, whether the fluid is air or oil. Electric actuators get their force from a motor and gears instead." },
        body: [
          "**Pneumatic** actuators use compressed air acting on a piston or diaphragm. Force equals pressure times area. Plant instrument air is widely available, and springs give simple fail-safe action.",
          "**Hydraulic** actuators use pressurised oil. Hydraulic systems run at much higher pressures than plant air, so they produce large forces from compact cylinders, and the fluid is effectively incompressible, which gives stiff, steady movement.",
          "**Electric** actuators use a motor and gearbox. They need only a power cable, offer precise positioning and diagnostics, and usually stop where they are if power is lost unless a fail-safe option is fitted.",
        ],
        figure: "power-sources",
      },
      {
        heading: "Combinations",
        body: [
          "**Electro-hydraulic** actuators contain their own motor and pump, so they need only electrical power yet deliver hydraulic force and can include a spring for fail-safe action. They suit remote sites with no air or hydraulic supply.",
        ],
      },
      {
        heading: "Choosing between them",
        body: [
          "The choice depends on what the site already has, the force needed, how fast the valve must move, what must happen on loss of power, and the environment. None of the three is best in every case.",
        ],
      },
    ],
    terms: [
      { term: "Instrument air", definition: "Clean, dry compressed air supplied for control equipment." },
      { term: "Force density", definition: "How much force a device produces for its size. Hydraulics are high; pneumatics are lower." },
      { term: "Electro-hydraulic", definition: "An actuator with an integral motor-driven pump that creates its own hydraulic pressure." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "Why can a hydraulic cylinder be smaller than a pneumatic one for the same force?",
        options: ["Oil is lighter than air", "Hydraulic systems operate at much higher pressure", "Hydraulic pistons are made of steel", "Hydraulic actuators are always electric"],
        answer: 1,
        explanation: "Force = pressure × area. Higher pressure means less area is needed for the same force.",
      },
      {
        id: "q2",
        prompt: "A standard electric actuator loses power mid-stroke. What does it typically do?",
        options: ["Returns to closed", "Returns to open", "Stops where it is", "Oscillates"],
        answer: 2,
        explanation: "Without stored energy (battery, spring or capacitor), there is nothing to drive it, so it stays in place.",
      },
    ],
  },
  {
    slug: "linear-vs-rotary",
    number: 4,
    title: "Rotary versus linear movement",
    level: "Beginner",
    status: "available",
    minutes: 7,
    summary: "Linear, multi-turn and quarter-turn outputs, and which valves need which.",
    objectives: ["Distinguish linear, multi-turn and quarter-turn output.", "Match valve types to the movement they need.", "Explain why many actuators convert linear to rotary motion."],
    sections: [
      {
        heading: "Three kinds of output",
        stat: { value: "90°", label: "All a ball, butterfly or plug valve needs to go from fully closed to fully open." },
        body: [
          "**Linear** actuators push and pull a stem in a straight line, for example on many globe control valves.",
          "**Multi-turn** actuators rotate the output many revolutions, typically to drive a threaded stem on gate or globe valves.",
          "**Quarter-turn** (part-turn) actuators rotate the output through about 90°, which is all a ball, butterfly or plug valve needs to go from closed to open.",
        ],
        figure: "linear-rotary",
      },
      {
        heading: "Converting linear to rotary",
        body: [
          "A piston naturally produces linear force. To drive a quarter-turn valve, a pneumatic or hydraulic actuator needs a mechanism that converts linear movement to rotation. The two most common are the **Scotch yoke** and the **rack and pinion**, covered in the intermediate lessons.",
        ],
      },
    ],
    terms: [
      { term: "Quarter-turn", definition: "A 90° rotation, used by ball, butterfly and plug valves." },
      { term: "Multi-turn", definition: "Output that rotates many revolutions, often driving a threaded valve stem." },
      { term: "Thrust", definition: "Linear force, the output of a linear actuator. Torque is its rotary equivalent." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "Which valve type normally needs a quarter-turn actuator?",
        options: ["Rising-stem gate valve", "Ball valve", "Globe valve with linear stem", "Diaphragm valve"],
        answer: 1,
        explanation: "A ball valve goes from closed to open in a 90° rotation.",
      },
      {
        id: "q2",
        prompt: "Why do piston actuators for ball valves need a conversion mechanism?",
        options: ["Pistons move in a straight line, the valve needs rotation", "Pistons rotate too fast", "Ball valves need multi-turn input", "To reduce air consumption"],
        answer: 0,
        explanation: "The piston produces linear force; a Scotch yoke or rack and pinion converts it into rotation.",
      },
    ],
  },
  {
    slug: "quarter-turn-valves",
    number: 5,
    title: "Quarter-turn valve fundamentals",
    level: "Beginner",
    status: "available",
    minutes: 10,
    summary: "Ball, butterfly and plug valves, and why valve position is not the same as flow.",
    objectives: ["Describe how ball, butterfly and plug valves close.", "Explain where valve torque comes from.", "Explain why 50% open does not mean 50% flow."],
    sections: [
      {
        heading: "Three common types",
        body: [
          "A **ball valve** turns a ball with a bore through it. Aligned with the pipe, it is open; turned 90°, the solid side faces the seats and it is closed.",
          "A **butterfly valve** turns a disc in the flow stream. A **plug valve** turns a plug with a port through it. All three need only a quarter turn.",
        ],
        figure: "quarter-turn",
      },
      {
        heading: "Where valve torque comes from",
        body: [
          "Most of a ball valve's torque comes from friction between the ball and its seats, and in the stem packing. It is usually highest when breaking the ball out of the closed seat, and again as it re-seats on closing. Flow and pressure add dynamic torques, especially on butterfly valves.",
          "The valve manufacturer provides the torque values for the specific valve, size and service. The simulator uses an illustrative shape, not real numbers.",
        ],
      },
      {
        heading: "Position is not flow",
        stat: { value: "50% ≠ 50%", label: "Half of the stroke is not half of the flow. The valve characteristic and the system around it decide." },
        body: [
          "At 50% position the ball has turned 45°. That does **not** mean half of the full flow passes. Flow through a partly open valve depends on the shape of the opening (the valve's inherent characteristic) and on the pressure drop across it, which depends on the rest of the system.",
          "This is why ActuatorLab always says \"valve position\" and never \"flow\".",
        ],
      },
    ],
    terms: [
      { term: "Seat", definition: "The sealing ring the closure member presses against to shut off flow." },
      { term: "Break-out torque", definition: "The torque needed to start moving a valve from its seated position." },
      { term: "Inherent characteristic", definition: "The relationship between valve position and flow at constant pressure drop." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "A ball valve is at 50% position. What can you say about flow?",
        options: ["It is exactly 50% of maximum", "It depends on the valve characteristic and the system", "It is zero", "It is always more than 50%"],
        answer: 1,
        explanation: "Position and flow are related through the valve characteristic and the system pressure drop. They are not equal.",
      },
      {
        id: "q2",
        prompt: "Where does a ball valve usually need the highest torque?",
        options: ["At mid-stroke", "When breaking out of the closed seat", "When fully open", "Only when the pipe is empty"],
        answer: 1,
        explanation: "Seat friction makes break-out from closed the usual peak.",
      },
    ],
  },
  {
    slug: "scotch-yoke-mechanics",
    number: 6,
    title: "Scotch yoke mechanics",
    level: "Intermediate",
    status: "available",
    minutes: 14,
    summary: "How a pin in a slotted yoke turns straight-line force into a quarter turn, and why the torque curve is U-shaped.",
    objectives: [
      "Trace the force path from piston to output shaft.",
      "Explain why the pin slides along the yoke slot.",
      "Derive the shape of the symmetric yoke torque curve.",
      "Relate that curve to ball valve torque demand.",
    ],
    sections: [
      {
        heading: "The mechanism",
        body: [
          "The piston rod drives a **guide block** that can only travel in a straight line. A **pin** on the block sits in a slot in the **yoke**, which is fixed to the output shaft.",
          "When the block moves, the pin pushes against the side of the slot and swings the yoke. Because the pin travels in a straight line while the slot swings in an arc, the pin also slides along the slot. Watch it in the model below.",
        ],
        figure: "scotch-yoke-live",
      },
      {
        heading: "Why the torque changes",
        stat: { value: "2×", label: "Torque at ±45° compared with mid-stroke, for the same piston force, in a symmetric Scotch yoke." },
        body: [
          "Let **d** be the distance from the shaft to the pin's line of travel and **φ** the yoke's angle from centre. The pin sits at distance d/cos φ from the shaft, and only the part of the force perpendicular to the yoke turns it. Combining both gives **T = F · d / cos²φ**.",
          "At mid-stroke (φ = 0) the lever arm is shortest and torque is lowest. At the ends (φ = ±45°) cos²φ = 0.5, so torque is twice the mid-stroke value for the same force.",
        ],
        figure: "torque-curves",
      },
      {
        heading: "Why that suits many valves",
        body: [
          "A ball valve usually needs most torque at break-out and re-seating, at the ends of travel. A symmetric Scotch yoke delivers most torque in exactly those places. **Canted** yokes shift the curve to favour one end, a topic in a later lesson.",
          "The guide bar matters too: it reacts the side load the yoke puts on the pin, so the piston rod and seals see mainly axial load.",
        ],
      },
    ],
    terms: [
      { term: "Yoke", definition: "A slotted arm fixed to the output shaft that the pin drives." },
      { term: "Guide block", definition: "The crosshead that carries the pin and travels in a straight line." },
      { term: "Symmetric yoke", definition: "A yoke whose slot is centred so the torque curve is the same at both ends." },
      { term: "Canted yoke", definition: "A yoke with an angled slot that shifts peak torque toward one end of travel." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "Why does the pin slide along the yoke slot during the stroke?",
        options: ["The slot is worn", "The pin moves in a straight line while the slot swings in an arc", "The yoke changes length", "Air pressure pushes it"],
        answer: 1,
        explanation: "The pin's distance from the shaft is d/cos φ, which changes with angle, so it must slide in the slot.",
      },
      {
        id: "q2",
        prompt: "In a symmetric Scotch yoke with constant piston force, where is output torque lowest?",
        options: ["At the start of travel", "At mid-stroke", "At the end of travel", "It is constant"],
        answer: 1,
        explanation: "At mid-stroke φ = 0 and cos²φ = 1, so T = F·d, the minimum.",
      },
      {
        id: "q3",
        prompt: "At φ = 45°, how does torque compare with mid-stroke for the same force?",
        options: ["Half", "Equal", "About 1.4 times", "Twice"],
        answer: 3,
        explanation: "cos²45° = 0.5, so T = F·d / 0.5 = 2·F·d.",
      },
    ],
  },
  {
    slug: "rack-and-pinion-mechanics",
    number: 7,
    title: "Rack and pinion mechanics",
    level: "Intermediate",
    status: "available",
    minutes: 12,
    summary: "Two opposed pistons, two racks and one pinion: why the torque stays nearly flat across the stroke.",
    objectives: [
      "Describe the twin-piston layout and the two air chambers.",
      "Explain why both racks turn the pinion the same way.",
      "Explain why rack-and-pinion torque is nearly constant.",
      "Compare spring-return torque on the air and spring strokes.",
    ],
    sections: [
      {
        heading: "Two pistons, one pinion",
        body: [
          "A twin-piston rack and pinion has one cylinder bore with **two opposed pistons**. The **pinion**, a gear on the output shaft, crosses the bore at the centre.",
          "Each piston carries a toothed **rack**. The two racks sit on opposite sides of the pinion. When the pistons move apart, one rack travels left on one side and the other travels right on the other side. Both push the pinion round in the same direction, so their torques add, and the sideways loads on the pinion largely cancel.",
          "Air in the **centre chamber** drives the pistons apart. Air in the two **outer chambers**, or springs in spring-return builds, drives them back together.",
        ],
        figure: "rack-pinion-live",
      },
      {
        heading: "Why the torque is flat",
        stat: { value: "T = F·r", label: "The racks always act at the pinion's pitch radius r, so torque per unit of piston force is the same at every angle." },
        body: [
          "In a Scotch yoke, the lever arm changes with angle. In a rack and pinion it does not: the rack teeth always push at the **pitch radius**. For a double-acting actuator at constant pressure, the output torque is essentially a flat line, apart from friction.",
          "Rack travel and rotation are locked together: travel = pitch radius × angle in radians. A 90° stroke moves each piston by r × π/2.",
        ],
        figure: "rack-pinion-torque",
      },
      {
        heading: "Spring return changes the shape",
        body: [
          "Spring-return builds put spring cartridges between each piston and its end cap. On the air stroke the springs compress, so the **net air torque falls** as the stroke goes on. On the spring stroke the springs extend, so **spring torque falls** too.",
          "The gearing still has a constant lever arm. The slope comes from the springs, not from the mechanism. That is why rack-and-pinion spring-return sizing focuses on the end of each stroke.",
          "The number of springs fitted is matched to the supply pressure, which is also why many designs can be converted between spring return and double acting.",
        ],
      },
      {
        heading: "Where it fits",
        body: [
          "Rack and pinion actuators are compact and symmetrical, and are common on small to medium quarter-turn valves. Accessory interfaces for solenoid valves, switch boxes and positioners commonly follow standard patterns such as VDI/VDE 3845 (NAMUR), and valve mounting commonly follows ISO 5211.",
          "Because the torque is flat, the actuator must be sized for the valve's highest torque, wherever in the stroke it occurs. A Scotch yoke puts its highest torque at the ends, which suits valves that need it there.",
        ],
      },
    ],
    terms: [
      { term: "Rack", definition: "A straight toothed bar. Moving it along its length turns the gear it meshes with." },
      { term: "Pinion", definition: "The gear on the output shaft that the racks drive." },
      { term: "Pitch radius", definition: "The effective radius at which the rack teeth push on the pinion." },
      { term: "Centre chamber", definition: "The space between the two pistons. Pressure here drives them apart." },
      { term: "Spring cartridge", definition: "A pre-loaded spring assembly that can be removed safely as a unit." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "Why do the two racks turn the pinion in the same direction?",
        options: ["They are on opposite sides of the pinion and move in opposite directions", "They both move the same way", "One rack is reversed by a second gear", "The springs make them agree"],
        answer: 0,
        explanation: "Opposite sides plus opposite motion gives the same rotation sense, so the two torques add.",
      },
      {
        id: "q2",
        prompt: "In a double-acting rack and pinion at constant pressure, the torque curve is…",
        options: ["U-shaped, highest at the ends", "Nearly flat", "Highest at mid-stroke", "Zero at the ends"],
        answer: 1,
        explanation: "The pitch radius does not change, so T = F·r is constant apart from friction.",
      },
      {
        id: "q3",
        prompt: "In spring return, why does the net air torque fall during the air stroke?",
        options: ["The pinion radius shrinks", "The springs compress and push back harder", "The racks disengage", "The valve gets lighter"],
        answer: 1,
        explanation: "Spring force rises as the springs compress. The gearing itself is constant.",
      },
    ],
  },
  {
    slug: "double-acting-vs-spring-return",
    number: 8,
    title: "Double acting versus spring return",
    level: "Intermediate",
    status: "available",
    minutes: 12,
    summary: "Where the energy for each stroke comes from, and what that means when the air supply fails.",
    objectives: [
      "Describe the air path for each stroke in both configurations.",
      "Explain why spring return provides a fail position and double acting does not.",
      "Read spring-return torque curves for the air and spring strokes.",
    ],
    sections: [
      {
        heading: "Double acting",
        stat: { value: "0", label: "Stored energy in a double-acting actuator with no reservoir. Lose the supply and it stays where it is." },
        body: [
          "Air is supplied to one side of the piston to drive it one way, and to the other side to drive it back. A directional control valve (often a 5/2 solenoid valve) routes air to one chamber while venting the other.",
          "There is no spring. If the supply fails, **nothing stores energy** to move the valve, so it stays where it is. Fail-open or fail-closed behaviour needs extra stored energy, such as an air reservoir with its own control circuit.",
        ],
      },
      {
        heading: "Spring return",
        body: [
          "Air drives the piston in one direction and **compresses a spring**. To move back, the cylinder is vented (often through a 3/2 solenoid valve) and the spring drives the stroke.",
          "If the supply is lost, the cylinder vents and the spring returns the actuator to the **spring end of travel**. Whether that end is valve open or valve closed depends on how the actuator is arranged on the valve. That is the fail position.",
          "Try it below. Open the valve, then turn the supply off.",
        ],
        figure: "spring-return-live",
      },
      {
        heading: "Two torque curves",
        body: [
          "On the air stroke, the air must overcome the valve and compress the spring, so **net air torque falls** as the spring is compressed. On the spring stroke, **spring torque falls** as the spring extends. Both are shaped by the yoke's 1/cos²φ factor.",
          "Sizing a spring-return actuator means checking both: the spring alone must move the valve at the end of the spring stroke, and the air must beat valve plus spring at the end of the air stroke, at the minimum expected supply pressure.",
        ],
        figure: "fail-comparison",
      },
    ],
    terms: [
      { term: "Air stroke", definition: "The stroke driven by air pressure. In spring return, this compresses the spring." },
      { term: "Spring stroke", definition: "The stroke driven by the spring when the cylinder vents." },
      { term: "Fail position", definition: "Where the valve goes, or stays, when motive power is lost." },
      { term: "Fail in place", definition: "Remains at its last position on loss of supply. Typical of double acting without stored energy." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "A double-acting actuator with no reservoir loses supply at 40% open. What happens?",
        options: ["It closes", "It opens", "It stays near 40%", "It cycles"],
        answer: 2,
        explanation: "No stored energy means no driving force, so it stays where it is.",
      },
      {
        id: "q2",
        prompt: "What determines whether a spring-return actuator fails open or fails closed?",
        options: ["The animation speed", "Which end of travel the spring drives to, as arranged on the valve", "The supply pressure", "The colour of the spring"],
        answer: 1,
        explanation: "The spring always drives to the spring end of travel. The mounting arrangement decides whether that is open or closed.",
      },
      {
        id: "q3",
        prompt: "In spring return, why does net air torque fall during the air stroke?",
        options: ["The air leaks", "The spring is compressed more, so it pushes back harder", "The valve gets lighter", "The yoke shortens"],
        answer: 1,
        explanation: "Spring force rises as it compresses, and it opposes the air.",
      },
    ],
  },
  {
    slug: "fail-open-vs-fail-closed",
    number: 9,
    title: "Fail-open versus fail-closed",
    level: "Intermediate",
    status: "available",
    minutes: 10,
    summary: "Choosing the safe position for a process, and how the actuator is arranged to achieve it.",
    objectives: [
      "Explain that the fail position is a process decision, not an actuator property.",
      "Give examples where fail closed and fail open are each the safe choice.",
      "Describe the ways an actuator can be arranged to reach its fail position.",
    ],
    sections: [
      {
        heading: "The process decides",
        body: [
          "A fail position answers one question: **if motive power or the control signal is lost, which valve position leaves the plant safest?** The answer comes from the process and its hazard review, not from the actuator catalogue.",
          "A valve feeding fuel to a burner usually fails **closed**: with no control, stop the fuel. A valve supplying cooling water to an exothermic reactor usually fails **open**: with no control, keep cooling. A blowdown or vent valve often fails **open** so pressure can be released.",
          "Sometimes neither end is safe, and the valve should **stay where it is**. That is fail in place, or fail last.",
        ],
      },
      {
        heading: "Same actuator, different arrangement",
        stat: { value: "90°", label: "Turning the coupling a quarter turn swaps fail closed for fail open on a spring-return quarter-turn actuator." },
        body: [
          "A spring-return actuator always drives to its **spring end of travel**. Whether that end is valve open or valve closed depends on how the actuator is mounted on the valve. Turning the coupling 90° (or mounting the actuator the other way) swaps the fail action.",
          "Try it below: switch the supply off, then change Fail action in the simulator and repeat.",
        ],
        figure: "spring-return-live",
      },
      {
        heading: "Other ways to fail safe",
        body: [
          "**Double acting with stored gas or air.** A reservoir behind a check valve, with a control circuit that strokes the actuator on loss of supply. The direct-gas actuator in the simulator uses the same idea to close after a line break.",
          "**Hydraulic accumulators** do the same job for hydraulic actuators.",
          "**Electric actuators** fail in place unless fitted with stored energy: a spring module, or a battery or capacitor unit that drives to a set position.",
          "Whatever the method, check it has enough energy at the **worst case**: lowest spring force at the end of the spring stroke, or lowest reservoir pressure after the strokes it must guarantee.",
        ],
      },
    ],
    terms: [
      { term: "Fail closed (FC)", definition: "Goes closed on loss of motive power or signal." },
      { term: "Fail open (FO)", definition: "Goes open on loss of motive power or signal." },
      { term: "Fail in place (FIP) / fail last", definition: "Stays at its last position." },
      { term: "Spring end", definition: "The end of travel the spring drives to. The mounting sets whether it is open or closed." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "Who or what should decide whether a valve fails open or closed?",
        options: ["The actuator's colour", "The process hazard review", "Whichever is cheaper", "The valve size"],
        answer: 1,
        explanation: "The safe position depends on what the valve does in the process.",
      },
      {
        id: "q2",
        prompt: "A spring-return actuator fails closed. How could the same actuator fail open on the same valve?",
        options: ["Raise the supply pressure", "Change the coupling orientation by 90°", "Remove the spring", "Reverse the air ports only"],
        answer: 1,
        explanation: "The spring end stays the same; the mounting decides what that end means for the valve.",
      },
      {
        id: "q3",
        prompt: "A double-acting actuator must fail closed. What does it need?",
        options: ["Nothing extra", "A stored-energy source and a circuit to use it", "A faster solenoid", "A bigger handwheel"],
        answer: 1,
        explanation: "Without stored energy, a double-acting actuator fails in place.",
      },
    ],
  },
  {
    slug: "symmetric-vs-canted-yoke",
    number: 10,
    title: "Symmetric versus canted yoke concepts",
    level: "Intermediate",
    status: "available",
    minutes: 10,
    summary: "Shaping the torque curve to match the valve.",
    objectives: [
      "Explain where the symmetric yoke's U-shaped torque curve comes from.",
      "Match the curve to a ball valve's demand.",
      "Describe what a canted yoke changes, and when it helps.",
    ],
    sections: [
      {
        heading: "The symmetric U",
        stat: { value: "2×", label: "Torque at either end of a symmetric 90° Scotch yoke stroke compared with mid-stroke, for the same force: 1/cos²45° = 2." },
        body: [
          "In a symmetric yoke the slot is radial and the stroke is centred: the yoke swings 45° either side of square to the piston. Torque is T = F·d / cos²φ, so it is lowest at mid-stroke and **twice as high at both ends**.",
          "That suits a ball valve well: the valve needs its highest torque at the ends, to break out of the seats and to re-seat.",
        ],
      },
      {
        heading: "Where the demand really is",
        body: [
          "Look closer at a ball valve and both of its peaks are at the **closed** end: break to open, and end to close. The open end needs much less. A symmetric yoke still delivers its peak at the open end too, which is torque the valve does not need.",
          "A **canted** yoke angles the slot so the swing is no longer centred. The peak moves to one end, matched to the valve's closed position, and the other end drops. For a spring-return actuator this can mean a smaller spring or cylinder for the same valve.",
        ],
        figure: "yoke-compare",
      },
      {
        heading: "Spring return",
        body: [
          "With a spring, the effect shows in both curves. The canted yoke lifts torque where the spring must re-seat the valve and where air breaks it out. Compare these with the symmetric curves.",
          "Switch the yoke between Symmetric and Canted in the simulator's Configure panel and watch the Engineering chart change.",
        ],
        figure: "yoke-compare-sr",
      },
    ],
    terms: [
      { term: "Symmetric yoke", definition: "Radial slot, stroke centred on square: equal torque peaks at both ends." },
      { term: "Canted yoke", definition: "Slot or swing offset so the torque peak is at one chosen end of travel." },
      { term: "Break-out torque", definition: "Torque to start a closed valve moving off its seats." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "For the same piston force, how does end-of-stroke torque compare with mid-stroke on a symmetric 90° yoke?",
        options: ["The same", "About half", "About twice", "About four times"],
        answer: 2,
        explanation: "1/cos²45° = 2.",
      },
      {
        id: "q2",
        prompt: "Why can a canted yoke suit a ball valve better than a symmetric one?",
        options: ["It turns more than 90°", "It puts the peak torque at the closed end, where the valve needs it", "It needs no air", "It removes the spring"],
        answer: 1,
        explanation: "Break-out and re-seat both happen at the closed end.",
      },
    ],
  },
  {
    slug: "torque-requirements",
    number: 11,
    title: "Torque requirements and torque curves",
    level: "Advanced",
    status: "available",
    minutes: 12,
    summary: "Break-out, run, re-seat and end torques, and safety factors.",
    objectives: [
      "Name the points on a quarter-turn valve's torque demand.",
      "Lay an actuator curve over a valve curve and find the tightest margin.",
      "Explain why safety factors and service conditions matter.",
    ],
    sections: [
      {
        heading: "What the valve asks for",
        body: [
          "A quarter-turn valve does not need the same torque all the way. Valve makers usually quote a few points: **break to open** (unseating from closed), **run** (moving between the ends), **end to open**, **break to close**, and **end to close** or re-seat (pushing back into the seats).",
          "For many ball valves the largest values are at the **closed** end. Butterfly valves can also have a dynamic torque from the flow itself, which peaks part-way open.",
          "These values depend on size, pressure class, seat material, the medium, temperature and how long the valve sits without moving. They must come from the valve maker for the actual service.",
        ],
      },
      {
        heading: "Overlaying the curves",
        body: [
          "Sizing is a comparison at every point in the stroke: **actuator output must exceed valve demand times a margin**, everywhere, in both directions. The smallest gap decides the size.",
          "In the chart, compare the actuator curve with the illustrative demand. With a Scotch yoke the tightest point is usually near an end; with a rack and pinion it is wherever the valve's peak is.",
        ],
        figure: "torque-curves",
      },
      {
        heading: "Margins and conditions",
        body: [
          "A **safety factor** covers what the datasheet cannot know: dirty service, long periods without moving, temperature, wear. The factor to use is set by the valve maker, the end user's specification or the applicable standard.",
          "Check the worst case, not the nominal one: **lowest** supply pressure, **weakest** end of the spring stroke, **highest** valve torque. An actuator that only works at nominal conditions will fail when it is needed.",
        ],
      },
    ],
    terms: [
      { term: "Break-out torque", definition: "Torque to start a valve moving from rest, usually off its seats." },
      { term: "Run torque", definition: "Torque while the closure member is moving between the ends." },
      { term: "Re-seat / end-to-close torque", definition: "Torque to push the closure member back into its seats." },
      { term: "Safety factor", definition: "Multiplier on valve demand to cover uncertainty and service conditions." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "Where should you check the actuator against the valve?",
        options: ["Only at mid-stroke", "Only at break-out", "At every point of the stroke, in both directions", "Only at the open end"],
        answer: 2,
        explanation: "The tightest margin can be anywhere; the curves must be compared through the whole stroke.",
      },
      {
        id: "q2",
        prompt: "Which supply pressure should a pneumatic actuator be sized at?",
        options: ["The highest expected", "The nominal", "The lowest expected at the actuator", "Any"],
        answer: 2,
        explanation: "It must still work when the supply is at its lowest.",
      },
    ],
  },
  {
    slug: "supply-pressure-sizing",
    number: 12,
    title: "Supply pressure and actuator sizing principles",
    level: "Advanced",
    status: "available",
    minutes: 10,
    summary: "Sizing at minimum supply pressure and checking spring end torque.",
    objectives: [
      "Explain why force scales with pressure and piston area.",
      "List the checks for double-acting and spring-return sizing.",
      "Explain why bigger is not automatically safer.",
    ],
    sections: [
      {
        heading: "Force from pressure",
        body: [
          "Piston force is pressure times effective area. Halve the supply pressure and the air torque halves too. That is why the **minimum** pressure at the actuator, after regulators, filters and long tubing, is the one that matters.",
          "In the simulator, lower the supply pressure until the Scotch yoke stalls part-way. The point where it stalls is where the actuator curve drops below the valve demand.",
        ],
      },
      {
        heading: "Spring-return checks",
        body: [
          "A spring-return actuator has two strokes and therefore two sets of checks. The **spring** must move the valve at the end of the spring stroke, where it is weakest. The **air** must overcome valve demand **plus** the spring at the end of the air stroke, at minimum pressure, where the spring is strongest.",
          "Raising the spring to cover the valve raises the air torque needed too. Spring and cylinder are sized together.",
        ],
        figure: "fail-comparison",
      },
      {
        heading: "Oversizing has costs",
        body: [
          "An actuator far too large can overstress the valve stem, the coupling or the mounting if it ever drives against a jam. Some specifications therefore set a **maximum** output relative to the valve's strength, as well as a minimum.",
          "Larger actuators also use more air per stroke and stroke more slowly for the same supply.",
        ],
      },
    ],
    terms: [
      { term: "Minimum supply pressure", definition: "Lowest pressure expected at the actuator, used for sizing." },
      { term: "Spring end torque", definition: "Spring output at the end of the spring stroke, its weakest point." },
      { term: "Maximum allowable stem torque", definition: "Valve stem limit that the actuator output should not exceed." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "For spring return, where is the air stroke usually hardest?",
        options: ["At the start, when the spring is relaxed", "At the end, where the spring is most compressed", "In the middle", "It is constant"],
        answer: 1,
        explanation: "Spring force rises as it compresses, opposing the air most at the end of the air stroke.",
      },
      {
        id: "q2",
        prompt: "Why can an oversized actuator be a problem?",
        options: ["It cannot open the valve", "It can overstress the valve stem or coupling against a jam", "It has no fail position", "It needs a higher voltage"],
        answer: 1,
        explanation: "Excess torque has to go somewhere when the valve cannot move.",
      },
    ],
  },
  {
    slug: "valve-mounting",
    number: 13,
    title: "Valve mounting and interfaces",
    level: "Advanced",
    status: "available",
    minutes: 8,
    summary: "Brackets, couplings, standards and alignment.",
    objectives: [
      "Describe the parts between actuator and valve.",
      "Name the common interface standards.",
      "Explain why alignment and coupling orientation matter.",
    ],
    sections: [
      {
        heading: "From shaft to stem",
        body: [
          "Between the actuator output and the valve stem sit a **mounting bracket** (or adaptor) and a **coupling** (or drive bush). The bracket carries the actuator's reaction torque into the valve body; the coupling carries the output torque into the stem.",
          "Both must be strong enough for the actuator's maximum output, not just the valve's demand.",
        ],
        figure: "scotch-yoke-live",
      },
      {
        heading: "Standard interfaces",
        body: [
          "**ISO 5211** defines flange sizes and drive shapes for part-turn actuator attachment. **ISO 5210** does the same for multi-turn actuators. Matching codes mean an actuator and valve can be joined with a standard bracket and coupling.",
          "On top of many pneumatic actuators, a **NAMUR** interface (VDI/VDE 3845) gives a standard pattern for mounting solenoid valves, switch boxes and positioners.",
        ],
      },
      {
        heading: "Alignment and orientation",
        body: [
          "Misalignment between actuator shaft and valve stem adds side load and wear, and can make a valve stick. Brackets should be rigid and concentric.",
          "Coupling orientation decides which actuator end of travel is valve open. That is how one spring-return actuator can be fail open or fail closed (lesson 9). Check the position indicator agrees with the valve after any re-mounting.",
        ],
      },
    ],
    terms: [
      { term: "ISO 5211", definition: "Part-turn actuator attachment: flanges and drive components." },
      { term: "ISO 5210", definition: "Multi-turn actuator attachment." },
      { term: "NAMUR (VDI/VDE 3845)", definition: "Standard interfaces for mounting accessories on actuators." },
      { term: "Reaction torque", definition: "Equal and opposite torque the bracket carries back into the valve body." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "What does the mounting bracket carry?",
        options: ["The process fluid", "The actuator's reaction torque into the valve body", "Air to the cylinder", "The control signal"],
        answer: 1,
        explanation: "Output torque turns the stem; the equal reaction goes through the bracket.",
      },
      {
        id: "q2",
        prompt: "Which standard covers part-turn actuator flanges?",
        options: ["ISO 5210", "ISO 5211", "IEC 60529", "ISO 9001"],
        answer: 1,
        explanation: "ISO 5211 is for part-turn; ISO 5210 is for multi-turn.",
      },
    ],
  },
  {
    slug: "control-panels",
    number: 14,
    title: "Control panels and accessories",
    level: "Advanced",
    status: "available",
    minutes: 8,
    summary: "What sits between the control system and the actuator.",
    objectives: [
      "Trace a control signal from the control system to the cylinder.",
      "Name the common pneumatic accessories and their jobs.",
      "Explain why safety functions are often separate from normal control.",
    ],
    sections: [
      {
        heading: "Signal in, air out",
        body: [
          "The control system sends an electrical signal: on-off for a solenoid valve, or an analogue or digital demand for a positioner. The accessory turns that into air routed to the right chamber.",
          "Air on its way in usually passes a **filter regulator** that cleans it and sets the pressure. Position comes back from a **switch box** (open and closed) or a **position transmitter**.",
        ],
      },
      {
        heading: "Control panels",
        body: [
          "Larger or safety-critical valves often get a **control panel**: a plate or cabinet with the solenoids, regulators, boosters, reservoirs, test valves and gauges plumbed together. The gas and electro-hydraulic actuators in the simulator have the same idea built in: the line-break control and the integral controller.",
        ],
        figure: "spring-return-live",
      },
      {
        heading: "Separate safety paths",
        body: [
          "A shutdown function should not depend on the same parts as normal control. A common pattern is a dedicated ESD solenoid that vents the actuator regardless of what the positioner is doing. The electro-hydraulic simulator's ESD input shows the result.",
        ],
      },
    ],
    terms: [
      { term: "Filter regulator", definition: "Cleans the supply air and sets its pressure." },
      { term: "Switch box", definition: "Limit switches that report end positions." },
      { term: "Positioner", definition: "Controls air to hold the valve at a demanded position." },
      { term: "ESD", definition: "Emergency shutdown: a safety action that overrides normal control." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "Why give an ESD function its own solenoid?",
        options: ["It is cheaper", "So shutdown does not depend on the normal control path", "To move faster", "To save air"],
        answer: 1,
        explanation: "Independence means one failure cannot stop both normal control and the safety action.",
      },
      {
        id: "q2",
        prompt: "What does a switch box tell the control system?",
        options: ["Supply pressure", "When the valve is at its open or closed end", "Torque", "Flow rate"],
        answer: 1,
        explanation: "Limit switches confirm end positions only.",
      },
    ],
  },
  {
    slug: "solenoids-boosters-switches",
    number: 15,
    title: "Solenoid valves, volume boosters and limit switches",
    level: "Advanced",
    status: "available",
    minutes: 8,
    summary: "Directing air, moving it faster and confirming position.",
    objectives: [
      "Match 3/2 and 5/2 solenoid valves to spring-return and double-acting actuators.",
      "Explain what a volume booster does.",
      "Describe how limit switches confirm position.",
    ],
    sections: [
      {
        heading: "Solenoid valves",
        body: [
          "A **3/2** valve (three ports, two positions) connects one chamber to supply or to exhaust. It suits **spring return**: energise to fill the cylinder, de-energise to vent it and let the spring act.",
          "A **5/2** valve (five ports, two positions) feeds one chamber while venting the other, and swaps them when switched. It suits **double acting**.",
          "In the simulator's Air flow mode, the blue and grey paths are exactly what these valves do.",
        ],
      },
      {
        heading: "Volume boosters",
        body: [
          "A positioner or small solenoid passes only a little air. A **volume booster** is a pneumatic amplifier: a small signal pressure controls a large flow from the supply, so a big cylinder can stroke quickly while still following the small device.",
        ],
      },
      {
        heading: "Limit switches",
        body: [
          "Cams on the actuator shaft operate switches at the open and closed ends. The control system uses them to confirm the valve got there. Between the ends they say nothing, which is why the compact electric simulator reports only 'made' or 'clear'.",
        ],
      },
    ],
    terms: [
      { term: "3/2 valve", definition: "Three ports, two positions: supply or exhaust one chamber." },
      { term: "5/2 valve", definition: "Five ports, two positions: one chamber to supply, the other to exhaust." },
      { term: "Volume booster", definition: "Pneumatic amplifier that delivers high flow following a low-flow signal." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "Which solenoid valve type suits a double-acting actuator?",
        options: ["2/2", "3/2", "5/2", "None"],
        answer: 2,
        explanation: "A 5/2 valve pressurises one chamber and vents the other.",
      },
      {
        id: "q2",
        prompt: "What does a volume booster add?",
        options: ["Higher pressure", "Higher flow following a small signal", "Position feedback", "A fail position"],
        answer: 1,
        explanation: "It amplifies flow, not pressure.",
      },
    ],
  },
  {
    slug: "speed-control",
    number: 16,
    title: "Speed control and operating times",
    level: "Advanced",
    status: "available",
    minutes: 8,
    summary: "Restrictors, exhaust control and what sets stroke time.",
    objectives: [
      "Explain what sets the stroke time of air, gas, oil and electric actuators.",
      "Describe why exhaust restriction gives steadier control than supply restriction.",
      "Explain why some valves must not close too fast.",
    ],
    sections: [
      {
        heading: "What sets the time",
        body: [
          "A pneumatic actuator strokes as fast as air can fill one chamber and empty the other. Port and tubing size, solenoid and booster capacity, supply pressure and the torque margin all play a part. That is why the simulator's Scotch yoke slows when you lower the pressure.",
          "Oil is metered precisely, so **gas-over-oil** and **electro-hydraulic** actuators keep a steady, adjustable speed. **Electric** actuators run at the motor and gear speed.",
        ],
      },
      {
        heading: "Restricting the exhaust",
        body: [
          "Restricting the **exhaust** side holds a cushion of air against the piston, so the stroke is steadier than when restricting the supply. Many speed controls are fitted on the exhaust for that reason.",
        ],
      },
      {
        heading: "Not too fast, not too slow",
        body: [
          "A shutdown valve may have a **maximum** closing time set by the safety case. A valve in a long liquid line may need a **minimum** closing time, because slamming it shut causes pressure surge (water hammer). Try the gas-over-oil flow-control setting to see how speed is set independently of pressure.",
        ],
      },
    ],
    terms: [
      { term: "Stroke time", definition: "Time for a full open or close stroke." },
      { term: "Exhaust restrictor", definition: "Speed control that limits outflow from the venting chamber." },
      { term: "Surge (water hammer)", definition: "Pressure spike from stopping a moving liquid column too quickly." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "Why do many pneumatic speed controls restrict the exhaust rather than the supply?",
        options: ["Cheaper parts", "A cushion of air gives a steadier stroke", "It saves air", "It raises torque"],
        answer: 1,
        explanation: "Back pressure on the exhaust side damps the motion.",
      },
      {
        id: "q2",
        prompt: "Why might a liquid line valve need a minimum closing time?",
        options: ["To save power", "To avoid pressure surge", "To pass a partial-stroke test", "To protect the switch box"],
        answer: 1,
        explanation: "Stopping the liquid too fast causes surge.",
      },
    ],
  },
  {
    slug: "electric-actuators",
    number: 17,
    title: "Electric actuators: limits, torque and fail-in-place",
    level: "Intermediate",
    status: "available",
    minutes: 10,
    summary: "How an electric actuator knows where to stop, how it protects the valve, and what happens when the power goes.",
    objectives: [
      "Explain the difference between stopping on position and stopping on torque.",
      "Describe why a self-locking gear holds the valve without power.",
      "Compare switch-based and sensor-based electric actuators.",
    ],
    sections: [
      {
        heading: "Motor, gear, valve",
        body: [
          "An electric actuator turns a fast, low-torque motor into a slow, high-torque output through a large gear reduction, usually including a **worm and wheel**. A worm can drive the wheel, but the wheel cannot drive the worm back. That **self-locking** is why the valve stays put when the motor stops, with no brake and no power.",
          "Speed is set by the motor and gearing, so the stroke runs at a near-constant rate whatever the valve load, until something tells the motor to stop.",
        ],
        figure: "electric-live",
      },
      {
        heading: "Two ways to stop",
        body: [
          "**On position (limit):** the motor stops when the output reaches a set point at the end of travel. Quarter-turn ball and butterfly valves usually stop this way.",
          "**On torque:** the motor stops when output torque reaches a set value. Wedge gate valves are often closed on torque so the wedge is driven firmly into its seats. The same torque sensing also stops the motor if the valve jams part-way, protecting valve and actuator.",
          "A compact actuator does this with cam-operated **switches**; an intelligent one **measures** position and torque, so it can report them and record torque profiles for diagnostics.",
        ],
      },
      {
        heading: "Fail in place",
        body: [
          "Lose the power and the motor stops; the self-locking gear holds the valve wherever it was. That is **fail in place**. If the process needs the valve to move on power loss, the actuator needs stored energy: a spring module, or a battery or capacitor unit that drives to a set position.",
        ],
      },
    ],
    terms: [
      { term: "Self-locking", definition: "A gear the output cannot back-drive, so position holds without power." },
      { term: "Limit (position) seating", definition: "Stopping the motor at a set end position." },
      { term: "Torque seating", definition: "Stopping the motor when output torque reaches a set value." },
      { term: "Torque trip", definition: "Stopping on torque before the end of travel, usually because of a jam." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "Why does a worm-geared electric actuator hold position without power?",
        options: ["A brake is applied", "The worm gear cannot be back-driven", "The spring holds it", "The valve is self-locking"],
        answer: 1,
        explanation: "The wheel cannot turn the worm, so process forces cannot move the output.",
      },
      {
        id: "q2",
        prompt: "Which valve is commonly closed on torque rather than on position?",
        options: ["Wedge gate valve", "Ball valve", "Butterfly valve", "Check valve"],
        answer: 0,
        explanation: "The wedge is driven into its seats until the set torque is reached.",
      },
      {
        id: "q3",
        prompt: "An electric actuator must drive the valve closed on power loss. What does it need?",
        options: ["Nothing extra", "A faster motor", "Stored energy such as a spring or battery module", "A larger handwheel"],
        answer: 2,
        explanation: "Without stored energy it fails in place.",
      },
    ],
  },
  {
    slug: "line-break-protection",
    number: 18,
    title: "Pipeline valves: line break and stored energy",
    level: "Advanced",
    status: "available",
    minutes: 10,
    summary: "How a pipeline valve detects a rupture from pressure alone and closes on energy it stored beforehand.",
    objectives: [
      "Explain how a rupture shows up in pipeline pressure.",
      "Describe rate-of-drop and low-pressure trips and their trade-offs.",
      "Explain why stored gas must be protected by a check valve.",
    ],
    sections: [
      {
        heading: "What a rupture looks like",
        body: [
          "When a gas pipeline ruptures downstream, pressure at the valve falls much faster than anything normal operation causes. A **rate-of-drop** monitor watches that fall. If it stays above a set point for a set delay, the control closes the valve.",
          "The delay matters. Normal operations, such as a compressor tripping or a large user starting up, cause short dips. Filtering them out avoids shutting a pipeline for nothing.",
        ],
        figure: "line-break-live",
      },
      {
        heading: "Set points are a trade-off",
        body: [
          "Set the rate too low and normal transients trip the valve. Set it too high and a small rupture, which drops pressure slowly, is missed. A **low-pressure** trip covers that slow case: if pressure stays below a floor, the valve closes regardless of the rate.",
          "Once tripped, the control **latches**. Nobody wants a valve that reopens into a leak, so an operator must reset it after the line is made safe.",
        ],
      },
      {
        heading: "Energy you stored earlier",
        body: [
          "The actuator runs on the same gas that is escaping. A **check valve** and a reserve tank keep enough gas to close the valve after the line pressure has collapsed. On a gas-over-oil actuator the same stored gas pushes the oil.",
          "The reserve must be sized for the strokes it has to guarantee, at the lowest pressure it could start from.",
        ],
      },
    ],
    terms: [
      { term: "Line break", definition: "A pipeline rupture, detected from pressure at the valve." },
      { term: "Rate-of-drop trip", definition: "Closes the valve when pressure falls faster than a set rate for a set time." },
      { term: "Low-pressure trip", definition: "Closes the valve when pressure stays below a set floor." },
      { term: "Latch", definition: "The trip stays active until deliberately reset." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "Why is there a delay before a rate-of-drop trip acts?",
        options: ["To save gas", "To ignore short, normal pressure dips", "To let the valve cool", "To charge the tank"],
        answer: 1,
        explanation: "Transients are brief; a rupture keeps falling.",
      },
      {
        id: "q2",
        prompt: "What keeps gas available to close the valve after the line pressure collapses?",
        options: ["A check valve and reserve tank", "The spring", "A bigger cylinder", "The hand pump"],
        answer: 0,
        explanation: "The check valve stops the stored gas draining back into the falling line.",
      },
      {
        id: "q3",
        prompt: "A small leak drops pressure slowly. Which trip is designed to catch it?",
        options: ["Rate of drop", "Low pressure", "Torque", "Partial stroke"],
        answer: 1,
        explanation: "A slow fall may never exceed the rate set point.",
      },
    ],
  },
  {
    slug: "esd-and-partial-stroke",
    number: 19,
    title: "Emergency shutdown and partial-stroke testing",
    level: "Advanced",
    status: "available",
    minutes: 9,
    summary: "Making sure a safety valve moves when it is needed, without having to shut the plant down to prove it.",
    objectives: [
      "Explain what an ESD input does and why it overrides normal control.",
      "Describe a partial-stroke test and what it can and cannot prove.",
    ],
    sections: [
      {
        heading: "The problem with safety valves",
        body: [
          "A shutdown valve may sit open for months, then have to close in seconds. The longer it sits, the more likely it is to stick, and the only way to be certain it moves is to move it. Closing it fully stops the process.",
        ],
      },
      {
        heading: "ESD overrides everything",
        body: [
          "An **emergency shutdown (ESD)** input is a separate signal that drives the valve to its fail position whatever the normal demand says. On a spring-return electro-hydraulic actuator, ESD opens the dump valve and the spring does the work.",
        ],
        figure: "esd-pst-live",
      },
      {
        heading: "Partial-stroke testing",
        body: [
          "A **partial-stroke test** moves the valve a short way toward its fail position, typically a small fraction of travel, and back. The process barely notices, but the test proves the actuator works and the valve is not seized.",
          "It does **not** prove the valve seals when fully closed, so full-stroke tests are still needed, just less often. In the full simulator, switch on Valve stuck and run the test to see it fail.",
        ],
      },
    ],
    terms: [
      { term: "ESD", definition: "Emergency shutdown: a safety signal that overrides normal control." },
      { term: "Partial-stroke test (PST)", definition: "A short move toward the fail position and back, proving the valve can move." },
    ],
    checks: [
      {
        id: "q1",
        prompt: "What can a partial-stroke test NOT prove?",
        options: ["That the actuator works", "That the valve is not seized", "That the valve seals tightly when fully closed", "That the control signal reaches the actuator"],
        answer: 2,
        explanation: "It never reaches the seat, so tight shut-off is untested.",
      },
      {
        id: "q2",
        prompt: "An ESD signal arrives while the positioner demands 60% open. A spring-return unit…",
        options: ["Stays at 60%", "Goes to its fail position", "Goes to 50%", "Waits for the demand to change"],
        answer: 1,
        explanation: "ESD overrides the demand.",
      },
    ],
  },
];

export const LESSON_MAP = Object.fromEntries(LESSONS.map((l) => [l.slug, l])) as Record<string, Lesson>;
export const AVAILABLE_LESSONS = LESSONS.filter((l) => l.status === "available");

export function neighbours(slug: string) {
  const list = AVAILABLE_LESSONS;
  const i = list.findIndex((l) => l.slug === slug);
  return { prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null };
}
