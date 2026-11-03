"use client";

import Link from "next/link";
import { Keyboard } from "lucide-react";
import type { VisualizationMode } from "@/lib/sim/types";
import { useSimSelector } from "./SimulationProvider";

const MODE_TEXT: Record<VisualizationMode, { title: string; body: string[] }> = {
  normal: {
    title: "Normal operation",
    body: [
      "The actuator sits on a mounting bracket above a quarter-turn ball valve. The output shaft, coupling, valve stem and ball are one rigid chain, so the ball turns exactly as the shaft turns.",
      "The white stripe on the indicator on top of the actuator lines up with the ball bore. When the stripe runs along the pipe, the valve is open.",
    ],
  },
  cutaway: {
    title: "Cutaway",
    body: [
      "Half section removes the top half of the housing, cylinder and spring module. Transparent keeps the shells visible as a ghost so you can see how parts sit relative to each other.",
      "The valve body is always shown sectioned so the ball and its bore can be seen. Real training valves often have a window cut for the same reason.",
    ],
  },
  mechanical: {
    title: "How the Scotch yoke converts motion",
    body: [
      "The piston and guide block can only move in a straight line along the dashed orange line. The pin on the guide block sits in the yoke's slot.",
      "As the block travels, the pin pushes on the slot wall and swings the yoke through 90° (blue arc). The pin also slides along the slot because its distance from the shaft changes. That changing lever arm is what shapes the torque curve.",
      "Animation is slowed to 0.35× in this mode. Change it with the speed control.",
    ],
  },
  energy: {
    title: "Air flow (illustrative)",
    body: [
      "Blue shows pressurised supply air. Grey shows air leaving through the exhaust or breather. Markers show direction only. This is not a CFD or fluid simulation, and marker speed does not represent flow rate.",
      "Chamber A is between the inner end cap and the piston. Pressure there drives the air stroke. In double acting, chamber B drives the return stroke. In spring return, chamber B breathes to atmosphere.",
    ],
  },
  engineering: {
    title: "Engineering view",
    body: [
      "Readouts show position, angle, supply and chamber states, with torque values from a simplified model. Torque is normalised and illustrative. It is useful for understanding shape and margin, not for sizing.",
      "A symmetric Scotch yoke gives T = F·d / cos²φ, where d is the yoke offset and φ the yoke angle from centre. Torque is highest at both ends of travel and lowest at mid-stroke.",
    ],
  },
};

/** Rack-and-pinion versions of the mechanism-specific explanations. */
const RP_MODE_TEXT: Partial<typeof MODE_TEXT> = {
  normal: {
    title: "Normal operation",
    body: [
      "A twin-piston rack and pinion sits on a bracket above the ball valve. The pinion shaft, coupling, valve stem and ball turn together as one rigid chain.",
      "The indicator stripe on top lines up with the ball bore. When it runs along the pipe, the valve is open.",
    ],
  },
  mechanical: {
    title: "How the rack and pinion converts motion",
    body: [
      "Two pistons share one bore. Air in the centre chamber pushes them apart; air in the outer chambers (or the springs) pushes them back together.",
      "Each piston carries a toothed rack, one on each side of the pinion. Moving apart, one rack travels left on one side while the other travels right on the other side, so both turn the pinion the same way.",
      "The racks always act at the pinion's pitch radius, so the lever arm never changes. That is why rack-and-pinion torque is nearly flat across the stroke. Animation is slowed to 0.35× in this mode.",
    ],
  },
  energy: {
    title: "Air flow (illustrative)",
    body: [
      "Blue shows pressurised supply air; grey shows air leaving. Markers show direction only. This is not a fluid simulation.",
      "Chamber A is the centre chamber between the pistons: pressure there drives them apart. Chamber B is the pair of outer chambers behind the pistons. In spring return, B breathes to atmosphere while the springs do the return work.",
    ],
  },
  engineering: {
    title: "Engineering view",
    body: [
      "Readouts show position, angle, supply and chamber states, with torque values from a simplified model. Values are normalised and illustrative, for understanding shape and margin, not sizing.",
      "Rack and pinion gives T = F·r: the pitch radius r is fixed, so for double acting the air curve is flat. In spring return the air stroke falls and the spring stroke falls as the springs extend, because spring force changes with length, not because of the gearing.",
    ],
  },
};

/** Electric part-turn versions of the explanations. */
const EPT_MODE_TEXT: Partial<typeof MODE_TEXT> = {
  normal: {
    title: "Normal operation",
    body: [
      "An electric part-turn actuator sits on the bracket above the ball valve. The motor drives a worm, the worm drives a wheel segment on the output shaft, and the output turns the ball through 90°.",
      "The display on the front cover shows valve position. The two knobs below it are the Local/Stop/Remote selector and the Open/Close control.",
    ],
  },
  cutaway: {
    title: "Cutaway",
    body: [
      "Half section removes the top of the gearcase, motor and covers. You can see the worm thread engaging the bronze wheel segment, the torque sensor at the worm shaft end, and the encoder on top of the output.",
      "The valve body is always shown sectioned so the ball can be seen.",
    ],
  },
  mechanical: {
    title: "How the worm gear works",
    body: [
      "The motor spins fast with low torque. Each turn of the single-start worm moves the wheel on by one tooth, so the worm turns many times for the output's quarter turn. Speed goes down and torque goes up by the same ratio, less friction.",
      "A worm drive is typically self-locking: the valve cannot turn the worm backwards. That is why the actuator holds position with the motor off, and why an electric part-turn actuator does not need a brake.",
      "When the wheel resists, the worm shaft is pushed along its own axis. The torque sensor at the shaft end measures that thrust. Animation is slowed to 0.35× in this mode.",
    ],
  },
  energy: {
    title: "Power flow (illustrative)",
    body: [
      "Yellow shows electrical power: in through the cable to the terminal compartment, and on to the motor. Orange shows mechanical power: along the worm, through the wheel, and down the output shaft to the valve.",
      "Markers appear only while the motor runs and show the direction of power, not its amount. Turn the hand/auto lever to hand and the motor path goes quiet: the handwheel is driving instead.",
    ],
  },
  engineering: {
    title: "Engineering view",
    body: [
      "The chart shows the valve's illustrative torque demand across the stroke against the torque limit. The motor runs at constant speed whatever the load, until demand reaches the limit and the sensor switches it off.",
      "Set the limit below the seat break-out torque and the actuator trips before it moves. Enable the jam and it trips mid-stroke, stopping the motor instead of forcing the valve. Values are normalised and illustrative.",
    ],
  },
};

/** Multi-turn on a rising-stem gate valve. */
const MT_MODE_TEXT: Partial<typeof MODE_TEXT> = {
  normal: {
    title: "Normal operation",
    body: [
      "An electric multi-turn actuator sits directly on the bonnet of a wedge gate valve. Its output turns many times per stroke; a nut in the thrust base turns with it, and the threaded stem, which cannot turn, rises or falls.",
      "As the valve opens, the stem climbs up through the hollow output into the cover tube on top. The display shows valve position; the encoder counts output turns, so it knows the stem height even without power.",
    ],
  },
  cutaway: {
    title: "Cutaway",
    body: [
      "Half section removes the top of the gearcase, thrust base and cover tube, so you can follow the drive: worm, full wheel, hollow output, stem nut, stem.",
      "The valve is always shown sectioned. Watch the gate rise into the body cavity above the bore. When fully open it leaves an unobstructed passage.",
    ],
  },
  mechanical: {
    title: "How rotation becomes thrust",
    body: [
      "The motor drives the worm, the worm drives a full wheel on the hollow output, and the output turns the drive bush (stem nut) in the thrust base.",
      "The nut turns but cannot move up or down; the stem moves up or down but cannot turn. So each output turn moves the stem by one thread lead. Thrust is roughly torque × 2π ÷ lead, less thread friction.",
      "Closing on torque drives the wedge into its seats until the sensed torque reaches the limit. That gives a tight shut-off, and it is why the closing curve rises steeply in the last few percent. Animation is slowed to 0.35× in this mode.",
    ],
  },
  energy: {
    title: "Power flow (illustrative)",
    body: [
      "Yellow shows electrical power to the motor. Orange shows mechanical power: along the worm, round the wheel, down through the stem nut, and into the stem that pushes the gate.",
      "Markers appear only while the motor runs and show direction, not amount.",
    ],
  },
  engineering: {
    title: "Engineering view",
    body: [
      "Blue is the illustrative opening demand: high while unseating the wedge, then the running load. Dashed yellow is closing: flat until the wedge meets the seats, then rising steeply.",
      "With Close on torque on, the motor stops when closing demand reaches the torque limit: the valve is seated, not tripped. Stem thrust is shown from the same torque via the thread. Values are normalised and illustrative.",
    ],
  },
};

/** Compact electromechanical part-turn. */
const CPT_MODE_TEXT: Partial<typeof MODE_TEXT> = {
  normal: {
    title: "Normal operation",
    body: [
      "A compact electromechanical actuator on the ball valve. There is no display and no local selector: Open and Close come from the control system, and the domed indicator on top shows position mechanically.",
      "Compare it with the intelligent part-turn: the same job, with switches instead of sensors.",
    ],
  },
  mechanical: {
    title: "Switches, not sensors",
    body: [
      "Two reduction stages drive the output: a motor pinion turns a larger spur gear on the worm shaft, and the worm turns the wheel segment. The worm stage makes the train self-locking.",
      "Two cams on the output each press a limit switch at one end of travel. That is how the motor stops at open and closed. Between the ends the actuator itself does not know the position.",
      "The worm shaft end works against preset springs. If the load is too high it moves far enough to trip the torque switch, which cuts the motor. You get 'tripped', not a torque reading. Animation is slowed to 0.35× in this mode.",
    ],
  },
  energy: {
    title: "Power flow (illustrative)",
    body: [
      "Yellow: electrical power in through the cable entries to the motor. Orange: mechanical power through the spur stage, the worm, and down the output shaft to the valve.",
      "Markers show direction only, and only while the motor runs.",
    ],
  },
  engineering: {
    title: "Engineering view",
    body: [
      "Instead of a measured torque, this actuator reports switch states: torque switch made or tripped, open limit made or clear, close limit made or clear. That is all the control system would see without optional transmitters.",
      "The chart shows the illustrative valve demand against the torque switch setting. Enable the jam to see the switch trip.",
    ],
  },
};

export function ModeGuide() {
  const mode = useSimSelector((s) => s.mode);
  const sr = useSimSelector((s) => s.config.actionType === "spring-return");
  const fail = useSimSelector((s) => s.config.failPosition);
  const rp = useSimSelector((s) => s.config.family.includes("rack-pinion"));
  const electric = useSimSelector((s) => s.config.family.startsWith("electric"));
  const multi = useSimSelector((s) => s.config.family === "electric-multi-turn");
  const compact = useSimSelector((s) => s.config.family === "electric-compact-part-turn");
  const t = (compact ? CPT_MODE_TEXT[mode] : multi ? MT_MODE_TEXT[mode] : electric ? EPT_MODE_TEXT[mode] : rp ? RP_MODE_TEXT[mode] : undefined) ?? MODE_TEXT[mode];
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-[19px] text-fg">{t.title}</h3>
        <div className="prose-lab mt-2 text-[13.5px]">
          {t.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-panel-2 p-4">
        <h3 className="text-[17px] text-fg">{electric ? "Electric: why it fails in place" : sr ? "Spring return: why it fails safe" : "Double acting: why it fails in place"}</h3>
        <div className="prose-lab mt-2 text-[13.5px]">
          {electric ? (
            <>
              <p>Without power the motor cannot run, and the self-locking worm holds the valve exactly where it stopped. Nothing stores energy to drive it anywhere else.</p>
              <p>
                The absolute encoder still knows the position, and a backup battery keeps the display and settings alive. The handwheel works with no power at all. Electric actuators that must fail open or closed
                add stored energy, such as a spring or a battery or capacitor unit. That is not modelled here.
              </p>
            </>
          ) : sr ? (
            <>
              <p>
                On the air stroke, pressure in chamber A pushes the piston outward and compresses the spring. When the cylinder vents, either because the solenoid de-energises or because supply is lost, the
                spring is the only remaining active force and drives the mechanism back.
              </p>
              <p>
                The fail position is wherever the spring end of the stroke is. In this configuration that is <strong>{fail === "fail-closed" ? "valve closed" : "valve open"}</strong>, set by how the actuator is coupled to the
                valve, not by the animation.
              </p>
            </>
          ) : (
            <>
              <p>Air drives the piston in both directions, and nothing stores energy. Remove the supply and there is no force to move the valve, so it stays where it was.</p>
              <p>
                Double-acting actuators can be made to fail open or closed by adding stored energy, such as an air reservoir with a dedicated control circuit. That is not modelled here, so this simulator never moves a
                double-acting actuator without supply.
              </p>
            </>
          )}
        </div>
      </section>

      <section>
        {multi ? (
          <>
            <h3 className="text-[17px] text-fg">Gate valves isolate, they do not throttle</h3>
            <p className="mt-2 max-w-[60ch] text-[13.5px] text-fg-2">
              A gate valve is meant to be fully open or fully closed. Part-open, the gate edge sits in a high-velocity stream that erodes it and the seats, and the flow changes very unevenly with position. Use a globe, ball or butterfly control valve to regulate flow.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-[17px] text-fg">Valve position is not flow</h3>
        <p className="mt-2 max-w-[60ch] text-[13.5px] text-fg-2">
          50% open means the ball has turned 45°. It does not mean 50% of full flow. Flow depends on the valve&apos;s inherent characteristic and on the system around it.{" "}
          <Link href="/academy/quarter-turn-valves" className="text-fg underline decoration-rule-strong underline-offset-2 hover:decoration-accent">
            Read more in the Academy
          </Link>
          .
        </p>
      
          </>
        )}
      </section>

      <section className="border-t border-rule pt-4">
        <h3 className="flex items-center gap-2 font-sans text-[13px] font-semibold text-fg">
          <Keyboard className="size-4" aria-hidden /> Keyboard
        </h3>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
          {[
            ["Space", "Play / pause"],
            ["O", "Open"],
            ["C", "Close"],
            ["R", "Reset"],
            ["S", "Toggle supply"],
            ["F", "Fit view"],
            ["Esc", "Clear selection"],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="rounded-md bg-fill px-1.5 py-0.5 font-sans text-[12px] text-fg">{k}</kbd>
              </dt>
              <dd className="text-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
