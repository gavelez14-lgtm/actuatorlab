"use client";

import type { FigureId } from "@/data/lessons";
import { TorqueChart } from "@/components/sim/TorqueChart";
import { Illustrative } from "@/components/ui/primitives";
import { EmbeddedSim } from "./EmbeddedSim";

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
          <EmbeddedSim config={{ actionType: "double-acting" }} mode="cutaway" autoCycle ariaLabel="Live 3D Scotch yoke in half section, cycling open and closed." />
          <figcaption className="mt-2 text-[12.5px] text-muted">Live model in half section, cycling automatically. Watch the pin slide outward in the slot near the ends of travel.</figcaption>
        </figure>
      );
    case "spring-return-live":
      return (
        <figure className="my-5">
          <EmbeddedSim config={{ actionType: "spring-return", failPosition: "fail-closed" }} mode="energy" supplyToggle ariaLabel="Live 3D spring-return actuator with supply control." />
          <figcaption className="mt-2 text-[12.5px] text-muted">Spring return, fail closed. Blue is supply air; grey is exhausting air. Air movement is illustrative, not a fluid simulation.</figcaption>
        </figure>
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
