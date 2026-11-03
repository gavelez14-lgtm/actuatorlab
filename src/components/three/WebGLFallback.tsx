"use client";

import { MonitorX } from "lucide-react";
import { useSimSelector } from "@/components/sim/SimulationProvider";
import { cn } from "@/lib/utils";

/**
 * Shown when WebGL is unavailable. The simulation engine still runs, so the
 * controls keep working and this 2D schematic tracks the live state.
 */
export function WebGLFallback({ className, reason }: { className?: string; reason: "unsupported" | "lost" }) {
  const stroke = useSimSelector((s) => Math.round(s.stroke * 200) / 200);
  const phi = -45 + stroke * 90;
  const pinX = 55 * Math.tan((phi * Math.PI) / 180);
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 p-6 text-center", className)}>
      <svg viewBox="-160 -90 320 150" className="w-full max-w-md" aria-label="2D schematic of the Scotch yoke at the current position" role="img">
        <line x1={-120} x2={120} y1={-55} y2={-55} stroke="var(--rule)" strokeDasharray="4 4" />
        <rect x={60} y={-80} width={95} height={50} rx={4} fill="none" stroke="var(--muted)" />
        <rect x={pinX + 112 - 6} y={-78} width={12} height={46} fill="var(--fg)" opacity={0.7} />
        <line x1={pinX} x2={pinX + 106} y1={-55} y2={-55} stroke="var(--fg)" strokeWidth={3} />
        <g transform={`rotate(${phi})`}>
          <rect x={-8} y={-100} width={16} height={100} rx={8} fill="none" stroke="var(--accent)" strokeWidth={2} />
        </g>
        <circle cx={0} cy={0} r={10} fill="var(--panel-2)" stroke="var(--fg)" />
        <circle cx={pinX} cy={-55} r={5} fill="var(--accent)" />
      </svg>
      <div className="flex max-w-sm flex-col items-center gap-2">
        <MonitorX className="size-5 text-[var(--muted)]" aria-hidden />
        <p className="text-sm font-medium">
          {reason === "lost" ? "The 3D view stopped because the graphics context was lost." : "3D view unavailable: this browser has WebGL turned off or unsupported."}
        </p>
        <p className="text-sm text-[var(--muted)]">
          The simulation still runs. This schematic and all readouts follow the controls.
          {reason === "lost" ? " Reload the page to restore the 3D view." : " Enable hardware acceleration to see the 3D model."}
        </p>
      </div>
    </div>
  );
}
