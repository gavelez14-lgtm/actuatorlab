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
  | "yoke-compare-sr";

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
  { slug: "torque-requirements", number: 11, title: "Torque requirements and torque curves", level: "Advanced", status: "planned", summary: "Break-out, run, re-seat and end torques, and safety factors." },
  { slug: "supply-pressure-sizing", number: 12, title: "Supply pressure and actuator sizing principles", level: "Advanced", status: "planned", summary: "Sizing at minimum supply pressure and checking spring end torque." },
  { slug: "valve-mounting", number: 13, title: "Valve mounting and interfaces", level: "Advanced", status: "planned", summary: "Brackets, couplings, standards and alignment." },
  { slug: "control-panels", number: 14, title: "Control panels and accessories", level: "Advanced", status: "planned", summary: "What sits between the control system and the actuator." },
  { slug: "solenoids-boosters-switches", number: 15, title: "Solenoid valves, volume boosters and limit switches", level: "Advanced", status: "planned", summary: "Directing air, moving it faster and confirming position." },
  { slug: "speed-control", number: 16, title: "Speed control and operating times", level: "Advanced", status: "planned", summary: "Restrictors, exhaust control and what sets stroke time." },
];

export const LESSON_MAP = Object.fromEntries(LESSONS.map((l) => [l.slug, l])) as Record<string, Lesson>;
export const AVAILABLE_LESSONS = LESSONS.filter((l) => l.status === "available");

export function neighbours(slug: string) {
  const list = AVAILABLE_LESSONS;
  const i = list.findIndex((l) => l.slug === slug);
  return { prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null };
}
