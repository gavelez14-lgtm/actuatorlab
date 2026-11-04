"use client";

import { MEDIUM_COLOURS, supplyMedium, supplyReading } from "./familyUi";
import { useSimState } from "./SimulationProvider";
import { cn } from "@/lib/utils";

/**
 * Always-visible supply readout: what drives this actuator, its live value and
 * what it is doing. Colours match the lines and flow markers in the 3D view.
 */
export function SupplyBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  const s = useSimState();
  const m = supplyMedium(s.config.family);
  const r = supplyReading(s);
  const dot = (c: string, key?: string) => <span key={key} className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: c, boxShadow: `0 0 0 3px ${c}33` }} aria-hidden />;
  return (
    <div className={cn("inline-flex items-center gap-2 text-[12.5px]", className)} aria-label={`Supply: ${m.label}, ${r.value}, ${r.state}`}>
      <span className="inline-flex items-center gap-1">
        {m.source && dot(MEDIUM_COLOURS[m.source], "src")}
        {m.source && <span className="text-muted" aria-hidden>→</span>}
        {dot(MEDIUM_COLOURS[m.working], "work")}
      </span>
      <span className="font-medium text-fg">{m.label}</span>
      {!compact && <span className="num text-fg-2">{r.value}</span>}
      <span className={cn("rounded-full px-1.5 py-px text-[11.5px]", r.ok ? "bg-fill text-fg-2" : "bg-danger/12 text-danger")}>{r.state}</span>
    </div>
  );
}
