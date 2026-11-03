"use client";

import { cn } from "@/lib/utils";

/** Quarter-turn dial: 0..90 degrees with a live needle. */
export function AngleDial({ angle, className }: { angle: number; className?: string }) {
  const a = Math.max(0, Math.min(90, angle));
  const rad = ((180 + a) * Math.PI) / 180; // needle sweeps from left (0) to up (90)
  const r = 26;
  const nx = 32 + Math.cos(rad) * r;
  const ny = 34 + Math.sin(rad) * r;
  return (
    <svg viewBox="0 0 40 40" className={cn("size-10", className)} aria-hidden>
      <path d="M 4 34 A 28 28 0 0 1 32 6" fill="none" stroke="var(--rule-strong)" strokeWidth="3" strokeLinecap="round" transform="translate(0 0)" />
      {[0, 45, 90].map((t) => {
        const tr = ((180 + t) * Math.PI) / 180;
        return (
          <line
            key={t}
            x1={32 + Math.cos(tr) * 22}
            y1={34 + Math.sin(tr) * 22}
            x2={32 + Math.cos(tr) * 18}
            y2={34 + Math.sin(tr) * 18}
            stroke="var(--muted)"
            strokeWidth="1"
          />
        );
      })}
      <line x1="32" y1="34" x2={nx} y2={ny} stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="34" r="2.2" fill="var(--fg)" />
    </svg>
  );
}

/** Vertical valve-position gauge. */
export function PositionGauge({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("relative h-10 w-2 overflow-hidden rounded-full bg-rule", className)} aria-hidden>
      <div className="absolute inset-x-0 bottom-0 rounded-full bg-accent" style={{ height: `${value * 100}%` }} />
    </div>
  );
}
