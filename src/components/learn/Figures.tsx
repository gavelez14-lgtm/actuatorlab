"use client";

import type { FigureId } from "@/data/lessons";
import { TorqueChart } from "@/components/sim/TorqueChart";
import { Illustrative } from "@/components/ui/primitives";
import { EmbeddedSim, FamilyPickerDemo } from "./EmbeddedSim";

function Frame({ children, caption }: { children: React.ReactNode; caption: string }) {
  return (
    <figure className="my-5">
      <div className="rounded-2xl bg-panel-2 p-4">{children}</div>
      <figcaption className="mt-2 text-[12.5px] text-muted">{caption}</figcaption>
    </figure>
  );
}

const txt = { fill: "var(--fg)", fontSize: 12, fontFamily: "var(--font-sans)" } as const;
const sub = { fill: "var(--muted)", fontSize: 10.5, fontFamily: "var(--font-sans)" } as const;

function ActuatorSystem() {
  const box = (x: number, label: string, detail: string, accent = false) => (
    <g>
      <rect x={x} y={34} width={120} height={56} rx={6} fill="var(--panel)" stroke={accent ? "var(--accent)" : "var(--rule-strong)"} />
      <text x={x + 60} y={58} textAnchor="middle" {...txt} fontWeight={600}>
        {label}
      </text>
      <text x={x + 60} y={76} textAnchor="middle" {...sub}>
        {detail}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 520 130" className="w-full" role="img" aria-label="Block diagram: control signal and power source feed the actuator, which moves the valve.">
      <defs>
        <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>
      {box(10, "Control signal", "open / close")}
      {box(200, "Actuator", "mechanism", true)}
      {box(390, "Valve", "controls the fluid")}
      <line x1={130} y1={62} x2={196} y2={62} stroke="var(--muted)" markerEnd="url(#arr)" />
      <line x1={320} y1={62} x2={386} y2={62} stroke="var(--accent)" strokeWidth={2} markerEnd="url(#arr)" />
      <text x={353} y={54} textAnchor="middle" {...sub}>
        torque
      </text>
      <line x1={260} y1={122} x2={260} y2={94} stroke="var(--air)" markerEnd="url(#arr)" />
      <text x={270} y={122} {...sub}>
        energy: air, oil or electricity
      </text>
    </svg>
  );
}

function PowerSources() {
  const items = [
    { t: "Pneumatic", d: ["Compressed air on a piston", "Springs give simple fail-safe", "Moderate force per size"], c: "var(--air)" },
    { t: "Hydraulic", d: ["Pressurised oil on a piston", "High force from small cylinders", "Stiff, steady movement"], c: "var(--warn)" },
    { t: "Electric", d: ["Motor and gear train", "Only a power cable needed", "Usually fails in place"], c: "var(--ok)" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((i) => (
        <div key={i.t} className="rounded-xl bg-panel p-3">
          <div className="mb-2 h-1 w-8 rounded-full" style={{ background: i.c }} />
          <div className="font-display text-[18px] font-semibold text-fg">{i.t}</div>
          <ul className="mt-1 space-y-1 text-[13px] text-fg-2">
            {i.d.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function LinearRotary() {
  return (
    <svg viewBox="0 0 520 140" className="w-full" role="img" aria-label="Three output types: linear stroke, multi-turn rotation and quarter-turn rotation.">
      <g>
        <line x1={40} y1={70} x2={130} y2={70} stroke="var(--accent)" strokeWidth={3} />
        <path d="M130,64 L142,70 L130,76 z" fill="var(--accent)" />
        <path d="M40,64 L28,70 L40,76 z" fill="var(--accent)" />
        <text x={85} y={115} textAnchor="middle" {...txt} fontWeight={600}>
          Linear
        </text>
        <text x={85} y={130} textAnchor="middle" {...sub}>
          push / pull a stem
        </text>
      </g>
      <g transform="translate(260 66)">
        {[0, 1, 2].map((i) => (
          <ellipse key={i} cx={0} cy={-18 + i * 14} rx={34} ry={8} fill="none" stroke="var(--fg-2)" />
        ))}
        <path d="M34,10 l6,-6 l-8,-2 z" fill="var(--accent)" />
        <text x={0} y={49} textAnchor="middle" {...txt} fontWeight={600}>
          Multi-turn
        </text>
        <text x={0} y={64} textAnchor="middle" {...sub}>
          many revolutions
        </text>
      </g>
      <g transform="translate(430 80)">
        <line x1={0} y1={0} x2={46} y2={0} stroke="var(--rule-strong)" strokeDasharray="3 3" />
        <line x1={0} y1={0} x2={0} y2={-46} stroke="var(--rule-strong)" strokeDasharray="3 3" />
        <path d="M40,0 A40,40 0 0 0 0,-40" fill="none" stroke="var(--accent)" strokeWidth={3} />
        <path d="M-6,-38 L0,-48 L6,-38 z" fill="var(--accent)" transform="rotate(-90 0 -40) translate(0 0)" />
        <text x={18} y={-16} {...sub}>
          90°
        </text>
        <text x={8} y={35} textAnchor="middle" {...txt} fontWeight={600}>
          Quarter-turn
        </text>
        <text x={8} y={50} textAnchor="middle" {...sub}>
          ball, butterfly, plug
        </text>
      </g>
    </svg>
  );
}

function QuarterTurn() {
  const ball = (x: number, angle: number, label: string) => (
    <g transform={`translate(${x} 60)`}>
      <rect x={-70} y={-16} width={140} height={32} fill="var(--panel)" stroke="var(--rule-strong)" />
      <circle r={30} fill="var(--panel-2)" stroke="var(--fg-2)" strokeWidth={1.5} />
      <g transform={`rotate(${90 - angle})`}>
        <rect x={-30} y={-11} width={60} height={22} fill="var(--air-soft)" stroke="var(--air)" />
      </g>
      <text y={58} textAnchor="middle" {...txt} fontWeight={600}>
        {label}
      </text>
      <text y={73} textAnchor="middle" {...sub}>
        {angle}° turned
      </text>
    </g>
  );
  return (
    <div>
      <svg viewBox="0 0 520 145" className="w-full" role="img" aria-label="Top view of a ball valve at 0, 45 and 90 degrees. The bore aligns with the pipe only when fully open.">
        {ball(90, 0, "Closed")}
        {ball(260, 45, "50% position")}
        {ball(430, 90, "Open")}
      </svg>
      <p className="mt-1 text-[12.5px] text-muted">At 50% position the bore is turned 45°. The open area, and the flow, are not half of the fully open values.</p>
    </div>
  );
}

export function LessonFigure({ id }: { id: FigureId }) {
  switch (id) {
    case "actuator-system":
      return (
        <Frame caption="An actuator needs energy, a control signal and a mechanism. The valve is a separate device.">
          <ActuatorSystem />
        </Frame>
      );
    case "power-sources":
      return (
        <Frame caption="General characteristics of each power source. Specific products vary.">
          <PowerSources />
        </Frame>
      );
    case "linear-rotary":
      return (
        <Frame caption="Output movement types.">
          <LinearRotary />
        </Frame>
      );
    case "quarter-turn":
      return (
        <Frame caption="Ball valve, viewed from above, at three positions.">
          <QuarterTurn />
        </Frame>
      );
    case "scotch-yoke-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ actionType: "double-acting" }} mode="mechanical" extras={["yoke"]} chart ariaLabel="Live 3D Scotch yoke in mechanism view with a yoke choice and live torque chart." />
          <figcaption className="mt-2 text-[12.5px] text-muted">Press Open and watch the pin slide outward in the slot near the ends of travel, where the chart shows torque rising. Switch to a canted yoke and the swing arc and the curve both shift.</figcaption>
        </figure>
      );
    case "spring-return-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ actionType: "spring-return", failPosition: "fail-closed" }} mode="energy" supplyToggle ariaLabel="Live 3D spring-return actuator with supply control." />
          <figcaption className="mt-2 text-[12.5px] text-muted">Spring return, fail closed. Blue is supply air; grey is exhausting air. Air movement is illustrative, not a fluid simulation.</figcaption>
        </figure>
      );
    case "rack-pinion-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ family: "pneumatic-rack-pinion", actionType: "spring-return", failPosition: "fail-closed" }} mode="cutaway" extras={["spring"]} chart ariaLabel="Live 3D twin-piston rack and pinion in half section with an action choice and live torque chart." />
          <figcaption className="mt-2 text-[12.5px] text-muted">The pistons move apart on the air stroke, compressing the spring cartridges; the racks turn the pinion between them. Switch to double acting: the springs go and the torque line goes flat.</figcaption>
        </figure>
      );
    case "rack-pinion-torque":
      return (
        <Frame caption="Left: double acting, a flat line. Right: spring return, where the springs tilt both curves. Normalised illustrative units at 5.5 bar, not manufacturer data.">
          <div className="mb-2 flex justify-end">
            <Illustrative />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <TorqueChart config={{ family: "pneumatic-rack-pinion", actionType: "double-acting", failPosition: "fail-in-place" }} pressure={5.5} showAxisNote={false} />
            <TorqueChart config={{ family: "pneumatic-rack-pinion", actionType: "spring-return", failPosition: "fail-closed" }} pressure={5.5} showAxisNote={false} />
          </div>
        </Frame>
      );
    case "electric-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ family: "electric-part-turn" }} mode="mechanical" extra="jam" supplyToggle ariaLabel="Live 3D electric part-turn actuator in section, with power and jam controls." />
          <figcaption className="mt-2 text-[12.5px] text-muted">Open the valve, then switch on the jam and open again: the motor stops on torque instead of forcing the valve. Turn the power off mid-stroke and it stays where it is.</figcaption>
        </figure>
      );
    case "line-break-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ family: "gas-scotch-yoke", actionType: "double-acting" }} mode="engineering" extra="rupture" ariaLabel="Live 3D direct-gas actuator with a pipeline rupture control." />
          <figcaption className="mt-2 text-[12.5px] text-muted">Open the valve, then rupture the pipeline. The pressure falls, the rate of drop crosses the set point, and after the delay the valve closes on stored gas. Illustrative values.</figcaption>
        </figure>
      );
    case "esd-pst-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ family: "electro-hydraulic", actionType: "spring-return", failPosition: "fail-closed" }} mode="normal" extra="esd" ariaLabel="Live 3D electro-hydraulic actuator with ESD and partial-stroke test controls." />
          <figcaption className="mt-2 text-[12.5px] text-muted">Open the valve and run a partial-stroke test: it moves a little toward closed and back. Then trigger ESD: the dump valve opens and the spring closes the valve, whatever the demand.</figcaption>
        </figure>
      );
    case "valve-demand-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ actionType: "spring-return", failPosition: "fail-closed" }} mode="cutaway" extras={["valve"]} chart ariaLabel="Live 3D Scotch yoke with a valve selector and a live torque chart." />
          <figcaption className="mt-2 text-[12.5px] text-muted">Switch the valve between ball, butterfly and plug and watch the dashed demand change shape against the same air and spring curves. The tightest gap sets the size. The orange line follows the valve as it moves. Normalised illustrative units.</figcaption>
        </figure>
      );
    case "pressure-stall-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ actionType: "spring-return", failPosition: "fail-closed" }} mode="cutaway" extras={["pressure"]} chart ariaLabel="Live 3D spring-return Scotch yoke with a supply pressure slider and a live torque chart." />
          <figcaption className="mt-2 text-[12.5px] text-muted">Lower the supply pressure to about 4 bar and press Open: the actuator stalls part-way, where the air curve drops below valve demand plus spring. Lower still and it cannot even break the valve out of its seat. Illustrative model.</figcaption>
        </figure>
      );
    case "coupling-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ actionType: "spring-return", failPosition: "fail-closed" }} mode="cutaway" extras={["coupling"]} supplyToggle ariaLabel="Live 3D spring-return actuator with a coupling orientation control." />
          <figcaption className="mt-2 text-[12.5px] text-muted">Change the coupling and watch the ball: the actuator still rests at its spring end, but that end is now valve open. Turn the supply off in each case to see where it fails.</figcaption>
        </figure>
      );
    case "solenoid-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ actionType: "spring-return", failPosition: "fail-closed" }} mode="energy" extras={["action"]} supplyToggle ariaLabel="Live 3D actuator in air-flow view with a 3/2 or 5/2 solenoid choice." />
          <figcaption className="mt-2 text-[12.5px] text-muted">With a 3/2 valve only chamber A is fed and vented; the spring does the return. With a 5/2 valve one chamber fills while the other exhausts, and they swap. Blue is supply, grey is exhaust. Illustrative.</figcaption>
        </figure>
      );
    case "limit-switch-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ family: "electric-compact-part-turn" }} mode="mechanical" ariaLabel="Live 3D compact electric actuator in section showing cams and limit switches." />
          <figcaption className="mt-2 text-[12.5px] text-muted">Open and close and watch the cams on the output: each presses its limit switch only at the end of travel. Between the ends, the switches report nothing.</figcaption>
        </figure>
      );
    case "stroke-time-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ actionType: "double-acting" }} mode="normal" extras={["pressure"]} strokeTimer ariaLabel="Live 3D pneumatic actuator with a supply pressure slider and a stroke timer." />
          <figcaption className="mt-2 text-[12.5px] text-muted">Time a stroke, lower the pressure and time it again. On air, less pressure means less torque margin and a slower stroke. Simulation time; illustrative.</figcaption>
        </figure>
      );
    case "flow-control-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ family: "hydraulic-scotch-yoke", actionType: "double-acting" }} mode="normal" extras={["flow", "pressure"]} strokeTimer ariaLabel="Live 3D hydraulic actuator with flow-control and pressure sliders and a stroke timer." />
          <figcaption className="mt-2 text-[12.5px] text-muted">Now on metered oil: change the flow control and the stroke time follows it; change the pressure and it barely moves. Pressure sets torque, flow sets speed. Illustrative.</figcaption>
        </figure>
      );
    case "command-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ actionType: "spring-return", failPosition: "fail-closed" }} mode="normal" supplyToggle ariaLabel="Live 3D actuated ball valve with open, close and supply controls." />
          <figcaption className="mt-2 text-[12.5px] text-muted">You send Open or Close; the actuator supplies the force. Turn the supply off while it is open and see what it does on its own.</figcaption>
        </figure>
      );
    case "power-source-live":
      return (
        <figure className="my-5">
          <FamilyPickerDemo
            supplyToggle
            ariaLabel="Live 3D actuator with a choice of power source"
            options={[
              { family: "pneumatic-scotch-yoke", label: "Air", config: { actionType: "spring-return", failPosition: "fail-closed" } },
              { family: "electric-part-turn", label: "Electric" },
              { family: "hydraulic-scotch-yoke", label: "Hydraulic", config: { actionType: "double-acting" } },
              { family: "gas-scotch-yoke", label: "Pipeline gas", config: { actionType: "double-acting" } },
              { family: "electro-hydraulic", label: "Electro-hydraulic", config: { actionType: "spring-return", failPosition: "fail-closed" } },
            ]}
          />
          <figcaption className="mt-2 text-[12.5px] text-muted">Same command, five power sources. Open the valve, then switch the supply off: the spring-return air and electro-hydraulic units close, the electric and double-acting units stay where they are.</figcaption>
        </figure>
      );
    case "converter-live":
      return (
        <figure className="my-5">
          <FamilyPickerDemo
            mode="cutaway"
            ariaLabel="Live 3D mechanisms that turn force into valve movement"
            options={[
              { family: "pneumatic-scotch-yoke", label: "Scotch yoke", config: { actionType: "double-acting" } },
              { family: "pneumatic-rack-pinion", label: "Rack and pinion", config: { actionType: "double-acting" } },
              { family: "pneumatic-vane", label: "Vane" },
              { family: "electric-multi-turn", label: "Rising stem (multi-turn)" },
            ]}
          />
          <figcaption className="mt-2 text-[12.5px] text-muted">Three ways to get a quarter turn from air, and one that turns many times to make a straight-line stem movement. Press Open in each and follow the force path.</figcaption>
        </figure>
      );
    case "yoke-torque-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ actionType: "double-acting" }} mode="mechanical" extras={["pressure"]} chart ariaLabel="Live 3D Scotch yoke with a supply pressure slider and live torque chart." />
          <figcaption className="mt-2 text-[12.5px] text-muted">The chart&apos;s U shape is the 1/cos²φ lever. Change the pressure: the whole curve scales, but its shape does not. The orange line marks where the yoke is now.</figcaption>
        </figure>
      );
    case "action-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ actionType: "double-acting" }} mode="energy" extras={["spring"]} supplyToggle chart ariaLabel="Live 3D actuator in air-flow view with a spring-return or double-acting choice." />
          <figcaption className="mt-2 text-[12.5px] text-muted">Double acting: air feeds one chamber and the other exhausts, both ways. Switch to spring return and only one chamber is fed. In each case, open the valve and turn the supply off.</figcaption>
        </figure>
      );
    case "yoke-compare":
      return (
        <Frame caption="Double acting at 5.5 bar. Left: symmetric yoke. Right: canted yoke, with the peak moved to the closed end. Normalised illustrative units, not manufacturer data.">
          <div className="mb-2 flex justify-end">
            <Illustrative />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <TorqueChart config={{ family: "pneumatic-scotch-yoke", actionType: "double-acting", failPosition: "fail-in-place" }} pressure={5.5} showAxisNote={false} />
            <TorqueChart config={{ family: "pneumatic-scotch-yoke", actionType: "double-acting", failPosition: "fail-in-place", yoke: "canted" }} pressure={5.5} showAxisNote={false} />
          </div>
        </Frame>
      );
    case "yoke-compare-sr":
      return (
        <Frame caption="Spring return, fail closed, at 5.5 bar. Left: symmetric. Right: canted. Normalised illustrative units.">
          <div className="mb-2 flex justify-end">
            <Illustrative />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <TorqueChart config={{ family: "pneumatic-scotch-yoke", actionType: "spring-return", failPosition: "fail-closed" }} pressure={5.5} showAxisNote={false} />
            <TorqueChart config={{ family: "pneumatic-scotch-yoke", actionType: "spring-return", failPosition: "fail-closed", yoke: "canted" }} pressure={5.5} showAxisNote={false} />
          </div>
        </Frame>
      );
    case "torque-curves":
      return (
        <Frame caption="Double-acting symmetric yoke at 5.5 bar against an illustrative ball-valve demand. Normalised units, not manufacturer data.">
          <div className="mb-2 flex justify-end">
            <Illustrative />
          </div>
          <TorqueChart config={{ family: "pneumatic-scotch-yoke", actionType: "double-acting", failPosition: "fail-in-place" }} pressure={5.5} className="mx-auto max-w-[540px]" />
        </Frame>
      );
    case "fail-comparison":
      return (
        <Frame caption="Spring return, fail closed, at 5.5 bar. The air curve is net of spring force. Normalised illustrative units.">
          <div className="mb-2 flex justify-end">
            <Illustrative />
          </div>
          <TorqueChart config={{ family: "pneumatic-scotch-yoke", actionType: "spring-return", failPosition: "fail-closed" }} pressure={5.5} className="mx-auto max-w-[540px]" />
        </Frame>
      );
  }
}
