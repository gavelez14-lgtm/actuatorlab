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

export function ModeGuide() {
  const mode = useSimSelector((s) => s.mode);
  const sr = useSimSelector((s) => s.config.actionType === "spring-return");
  const fail = useSimSelector((s) => s.config.failPosition);
  const rp = useSimSelector((s) => s.config.family.includes("rack-pinion"));
  const t = (rp ? RP_MODE_TEXT[mode] : undefined) ?? MODE_TEXT[mode];
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
        <h3 className="text-[17px] text-fg">{sr ? "Spring return: why it fails safe" : "Double acting: why it fails in place"}</h3>
        <div className="prose-lab mt-2 text-[13.5px]">
          {sr ? (
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
        <h3 className="text-[17px] text-fg">Valve position is not flow</h3>
        <p className="mt-2 max-w-[60ch] text-[13.5px] text-fg-2">
          50% open means the ball has turned 45°. It does not mean 50% of full flow. Flow depends on the valve&apos;s inherent characteristic and on the system around it.{" "}
          <Link href="/academy/quarter-turn-valves" className="text-fg underline decoration-rule-strong underline-offset-2 hover:decoration-accent">
            Read more in the Academy
          </Link>
          .
        </p>
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
