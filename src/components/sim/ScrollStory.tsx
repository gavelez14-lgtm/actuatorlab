"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { VisualizationMode } from "@/lib/sim/types";
import { SimulationProvider, useEngine, useSimSelector } from "./SimulationProvider";
import { cn } from "@/lib/utils";
import { LazyMount } from "@/components/ui/LazyMount";

const SimViewport = dynamic(() => import("@/components/three/SimViewport").then((m) => m.SimViewport), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

/**
 * Scroll-driven explanation of one stroke. Scrolling is the input: it scrubs
 * the real simulation (engine.seek), so every frame shows a mechanically
 * correct position. Each chapter switches the visualisation mode, which moves
 * the camera to the view that explains that step.
 */
const CHAPTERS: { from: number; mode: VisualizationMode; zoom: number; title: string; body: string }[] = [
  {
    from: 0,
    mode: "normal",
    zoom: 1,
    title: "Closed, and held there by a spring.",
    body: "A spring-return Scotch yoke on a quarter-turn ball valve. With no air in the cylinder, the spring keeps the valve shut.",
  },
  {
    from: 0.22,
    mode: "energy",
    zoom: 1.15,
    title: "Air pushes the piston.",
    body: "Supply air fills the chamber behind the piston. Pressure times area becomes a straight-line force, and the spring starts to compress.",
  },
  {
    from: 0.48,
    mode: "mechanical",
    zoom: 1.45,
    title: "The pin slides, the yoke turns.",
    body: "The pin can only travel in a straight line, so as it pushes the slotted yoke round it also slides outward along the slot. That changing lever arm shapes the torque.",
  },
  {
    from: 0.74,
    mode: "normal",
    zoom: 1,
    title: "Ninety degrees later, it’s open.",
    body: "The shaft, coupling and ball turn as one. Cut the air and the spring drives the whole chain back to closed.",
  },
];

/** Scroll progress (0..1) to stroke: hold briefly at each end. */
function strokeFor(p: number) {
  const a = 0.14;
  const b = 0.9;
  return Math.min(1, Math.max(0, (p - a) / (b - a)));
}

function StoryDriver({ progress }: { progress: number }) {
  const { engine, camera } = useEngine();
  const chapter = CHAPTERS.reduce((acc, c, i) => (progress >= c.from ? i : acc), 0);
  const lastChapter = useRef(-1);

  useEffect(() => {
    engine.dispatch({ type: "seek", position: strokeFor(progress) });
  }, [engine, progress]);

  useEffect(() => {
    if (lastChapter.current === chapter) return;
    const first = lastChapter.current === -1;
    lastChapter.current = chapter;
    const { mode, zoom } = CHAPTERS[chapter];
    engine.dispatch({ type: "set-mode", mode });
    if (!first) camera.current?.preset(mode, zoom);
  }, [engine, camera, chapter]);

  return null;
}

function BigAngle() {
  const angle = useSimSelector((s) => Math.round(s.outputAngle));
  return (
    <div className="pointer-events-none select-none text-right" aria-hidden>
      <div className="num font-display text-[clamp(88px,15vw,232px)] font-semibold leading-[0.8] tracking-[-0.06em] text-fg">
        {angle}
        <span className="text-muted">°</span>
      </div>
      <div className="mt-3 text-[13px] text-muted">Output shaft rotation</div>
    </div>
  );
}

export function ScrollStory() {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      setProgress((prev) => (Math.abs(prev - p) > 0.0005 ? p : prev));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const active = CHAPTERS.reduce((acc, c, i) => (progress >= c.from ? i : acc), 0);

  return (
    <section ref={ref} aria-label="How a Scotch yoke actuator opens a valve" className="relative h-[460vh]">
      <SimulationProvider initialConfig={{ actionType: "spring-return", failPosition: "fail-closed" }}>
        <StoryDriver progress={progress} />
        <div className="sticky top-12 h-[calc(100dvh-3rem)] overflow-hidden bg-viewport lg:top-0 lg:h-dvh">
          <LazyMount className="absolute inset-0" rootMargin="0px 0px -2px 0px">
            <SimViewport compact interactive={false} className="absolute inset-0" ariaLabel="Actuator stroke controlled by page scroll." />
          </LazyMount>

          {/* chapter rail */}
          <ol className="absolute left-5 top-6 flex gap-1.5 sm:left-10 sm:top-10" aria-hidden>
            {CHAPTERS.map((c, i) => (
              <li key={c.title} className={cn("h-[3px] w-8 rounded-full transition-colors duration-300", i <= active ? "bg-fg" : "bg-fill-2")} />
            ))}
          </ol>

          <div className="absolute right-5 top-6 sm:right-10 sm:top-auto sm:bottom-10">
            <BigAngle />
          </div>

          {/* chapter copy: all chapters stay in the DOM for screen readers */}
          <ol className="absolute inset-x-3 bottom-3 grid rounded-2xl bg-glass p-4 backdrop-blur-xl sm:inset-x-auto sm:bottom-10 sm:left-10 sm:w-[min(440px,45%)] sm:rounded-none sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            {CHAPTERS.map((c, i) => (
              <li
                key={c.title}
                className={cn(
                  "self-end transition-[opacity,transform] duration-500 ease-out [grid-area:1/1]",
                  i === active ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
                )}
              >
                <p className="num text-[13px] text-muted">
                  Step {i + 1} of {CHAPTERS.length}
                </p>
                <h2 className="mt-2 text-[28px] leading-[1.08] text-fg sm:text-[40px] sm:[text-shadow:0_1px_18px_var(--bg)]">{c.title}</h2>
                <p className="mt-3 max-w-[44ch] text-[15px] leading-[1.5] text-fg-2 sm:text-[17px] sm:[text-shadow:0_1px_14px_var(--bg)]">{c.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </SimulationProvider>
    </section>
  );
}
