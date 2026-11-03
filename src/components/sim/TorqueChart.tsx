"use client";

import { useMemo } from "react";
import { torqueCurves } from "@/lib/sim/model";
import { MECHANISMS, mechanismFor } from "@/lib/sim/mechanisms";
import { ELECTRIC, electricDemand, torqueLimitValue } from "@/lib/sim/electric";
import type { ActuatorConfiguration } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

/**
 * Illustrative torque profile across the stroke, from the documented
 * mechanism's lever relation (see mechanisms.ts) with illustrative spring and valve
 * values. Units are normalised; this is not manufacturer data.
 */
export function TorqueChart({
  config,
  pressure,
  position,
  className,
  showAxisNote = true,
}: {
  config: ActuatorConfiguration;
  pressure: number;
  position?: number;
  className?: string;
  showAxisNote?: boolean;
}) {
  const sr = config.actionType === "spring-return";
  const pts = useMemo(() => torqueCurves(config, pressure), [config, pressure]);
  const W = 320;
  const H = 168;
  const pad = { l: 30, r: 10, t: 10, b: 26 };
  const maxY = Math.max(...pts.map((p) => Math.max(p.airStroke, p.springStroke ?? 0, p.demand))) * 1.08;
  const minY = Math.min(0, ...pts.map((p) => p.airStroke));
  const x = (v: number) => pad.l + v * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - minY) / (maxY - minY)) * (H - pad.t - pad.b);
  const path = (sel: (p: (typeof pts)[number]) => number | null) =>
    pts
      .map((p, i) => {
        const v = sel(p);
        return v === null ? "" : `${i === 0 ? "M" : "L"}${x(p.position).toFixed(1)},${y(v).toFixed(1)}`;
      })
      .join(" ");

  const cur = position === undefined ? null : pts[Math.round(position * (pts.length - 1))];
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const yTicks = useMemo(() => {
    const step = maxY > 8 ? 2 : 1;
    const out: number[] = [];
    for (let v = 0; v <= maxY; v += step) out.push(v);
    return out;
  }, [maxY]);

  return (
    <figure className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Illustrative torque curves for a ${sr ? "spring-return" : "double-acting"} ${MECHANISMS[mechanismFor(config.family)].name.toLowerCase()} at ${pressure.toFixed(1)} bar.`}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth={t === 0 ? 1 : 0.5} />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="var(--muted)" className="num">
              {t}
            </text>
          </g>
        ))}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 10} textAnchor={t === 1 ? "end" : t === 0 ? "start" : "middle"} fontSize="9" fill="var(--muted)" className="num">
            {t * 100}%
          </text>
        ))}
        <path d={path((p) => p.demand)} fill="none" stroke="var(--muted)" strokeWidth={1.25} strokeDasharray="3 3" />
        <path d={path((p) => p.airStroke)} fill="none" stroke="var(--air)" strokeWidth={2} />
        {sr && <path d={path((p) => p.springStroke)} fill="none" stroke="var(--warn)" strokeWidth={2} />}
        {cur && (
          <>
            <line x1={x(cur.position)} x2={x(cur.position)} y1={pad.t} y2={H - pad.b} stroke="var(--accent)" strokeWidth={1} />
            <circle cx={x(cur.position)} cy={y(cur.airStroke)} r={3} fill="var(--air)" stroke="var(--panel)" strokeWidth={1.5} />
            {sr && cur.springStroke !== null && <circle cx={x(cur.position)} cy={y(cur.springStroke)} r={3} fill="var(--warn)" stroke="var(--panel)" strokeWidth={1.5} />}
          </>
        )}
      </svg>
      <figcaption className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-air" aria-hidden />
          {sr ? "Air stroke (net of spring)" : "Air stroke output"}
        </span>
        {sr && (
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-warn" aria-hidden />
            Spring stroke output
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-3 border-t border-muted" aria-hidden />
          Valve demand
        </span>
        {showAxisNote && <span className="w-full">Horizontal: valve position. Vertical: normalised torque from {MECHANISMS[mechanismFor(config.family)].formula}.</span>}
      </figcaption>
    </figure>
  );
}

/**
 * Electric part-turn torque chart: illustrative valve demand across the
 * stroke against the torque limit and rated output. The motor runs at
 * constant speed while demand stays below the limit.
 */
export function ElectricTorqueChart({
  torqueLimit,
  obstruction,
  position,
  outputTorque,
  className,
}: {
  torqueLimit: number;
  obstruction: boolean;
  position?: number;
  outputTorque?: number;
  className?: string;
}) {
  const W = 320;
  const H = 168;
  const pad = { l: 30, r: 10, t: 10, b: 26 };
  const rated = ELECTRIC.ratedTorque;
  const maxY = Math.max(rated, ELECTRIC.obstructionTorque) * 1.1;
  const x = (v: number) => pad.l + v * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / maxY) * (H - pad.t - pad.b);
  const pts = Array.from({ length: 121 }, (_, i) => i / 120);
  const demand = pts.map((p, i) => `${i ? "L" : "M"}${x(p).toFixed(1)},${y(electricDemand(p, obstruction, true)).toFixed(1)}`).join(" ");
  const limit = torqueLimitValue(torqueLimit);
  return (
    <figure className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Illustrative valve torque demand against a torque limit of ${Math.round(torqueLimit * 100)} percent of rated output.`}>
        {[0, 1, 2].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth={t === 0 ? 1 : 0.5} />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="var(--muted)" className="num">
              {t}
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text key={t} x={x(t)} y={H - 10} textAnchor={t === 1 ? "end" : t === 0 ? "start" : "middle"} fontSize="9" fill="var(--muted)" className="num">
            {t * 100}%
          </text>
        ))}
        <line x1={x(0)} x2={x(1)} y1={y(rated)} y2={y(rated)} stroke="var(--muted)" strokeWidth={1} strokeDasharray="1 3" />
        <line x1={x(0)} x2={x(1)} y1={y(limit)} y2={y(limit)} stroke="var(--accent)" strokeWidth={1.5} />
        <path d={demand} fill="none" stroke="var(--air)" strokeWidth={2} />
        {position !== undefined && (
          <>
            <line x1={x(position)} x2={x(position)} y1={pad.t} y2={H - pad.b} stroke="var(--fg-2)" strokeWidth={0.75} />
            {outputTorque !== undefined && outputTorque > 0 && <circle cx={x(position)} cy={y(outputTorque)} r={3} fill="var(--accent)" stroke="var(--panel)" strokeWidth={1.5} />}
          </>
        )}
      </svg>
      <figcaption className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-air" aria-hidden />
          Valve demand (opening)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-accent" aria-hidden />
          Torque limit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-3 border-t border-dotted border-muted" aria-hidden />
          Rated output
        </span>
      </figcaption>
    </figure>
  );
}
