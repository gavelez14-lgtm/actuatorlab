"use client";

import { ArrowDownToLine, ArrowUpFromLine, Pause, Play, Repeat, RotateCcw, Square } from "lucide-react";
import { MULTI_TURN, isElectric, isMultiTurn } from "@/lib/sim/electric";
import { Button } from "@/components/ui/primitives";
import { Range, Segmented } from "@/components/ui/controls";
import { cn } from "@/lib/utils";
import { useEngine, useSimState } from "./SimulationProvider";
import { AngleDial, PositionGauge } from "./Readouts";

const SPEEDS = ["0.25", "0.5", "1", "2"] as const;

export function PlaybackBar({ compact = false }: { compact?: boolean }) {
  const { engine } = useEngine();
  const s = useSimState();
  const pct = Math.round(s.position * 100);
  const electric = isElectric(s.config.family);
  const multiTurn = isMultiTurn(s.config.family);
  const travel = s.targetPosition === null ? null : 1 - Math.abs(s.targetPosition - s.position);
  const speedValue = (SPEEDS.find((v) => Math.abs(Number(v) - s.speed) < 0.01) ?? "custom") as (typeof SPEEDS)[number];

  return (
    <div className={cn("flex flex-col gap-3 border-t border-rule bg-panel px-3 py-3 sm:px-4", compact && "gap-2 py-2")}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => engine.dispatch({ type: "toggle-play" })}
          aria-label={s.playing ? "Pause simulation" : "Play simulation"}
          aria-keyshortcuts="Space"
        >
          {s.playing ? <Pause aria-hidden /> : <Play aria-hidden />}
        </Button>
        <div className="mx-1 h-6 w-px bg-rule" aria-hidden />
        <Button variant="primary" onClick={() => engine.dispatch({ type: "open" })} aria-keyshortcuts="O">
          <ArrowUpFromLine aria-hidden />
          Open
        </Button>
        <Button variant="secondary" onClick={() => engine.dispatch({ type: "close" })} aria-keyshortcuts="C">
          <ArrowDownToLine aria-hidden />
          Close
        </Button>
        {electric && (
          <Button variant="secondary" onClick={() => engine.dispatch({ type: "stop" })} aria-label="Stop the motor">
            <Square aria-hidden />
            Stop
          </Button>
        )}
        <Button variant="ghost" onClick={() => engine.dispatch({ type: "reset" })} aria-keyshortcuts="R">
          <RotateCcw aria-hidden />
          Reset
        </Button>
        {!compact && (
          <Button
            variant={s.autoCycle ? "outline" : "ghost"}
            aria-pressed={s.autoCycle}
            onClick={() => engine.dispatch({ type: "set-auto-cycle", value: !s.autoCycle })}
            className={cn(s.autoCycle && "border-accent text-accent")}
          >
            <Repeat aria-hidden />
            Auto-cycle
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-[12.5px] text-muted sm:inline">Speed</span>
          <Segmented
            size="sm"
            label="Animation speed"
            value={speedValue}
            onChange={(v) => engine.dispatch({ type: "set-speed", speed: Number(v) })}
            options={SPEEDS.map((v) => ({ value: v, label: `${v}×` }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 md:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
        <div className="flex items-center gap-2.5">
          <PositionGauge value={s.position} />
          <div className="leading-tight">
            <div className="text-[12px] text-muted">Valve position</div>
            <div className="num font-display text-[24px] font-semibold text-fg" aria-live="off">
              {pct}
              <span className="ml-0.5 text-[15px] text-muted">% open</span>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-1 flex items-baseline justify-between gap-2 text-[12px] text-muted">
            <label htmlFor="sim-scrub">Drag to position (pauses the simulation)</label>
            <span className="num">
              {travel === null ? "No command" : `${s.targetPosition === 1 ? "Opening" : "Closing"} travel ${Math.round(travel * 100)}%`}
            </span>
          </div>
          <div className="relative">
            <Range
              id="sim-scrub"
              label="Valve position"
              valueText={`${pct} percent open`}
              min={0}
              max={1}
              step={0.005}
              value={s.position}
              onChange={(v) => engine.dispatch({ type: "seek", position: v })}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted" aria-hidden>
            <span>Closed</span>
            <span>Open</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {multiTurn ? (
            <div className="leading-tight">
              <div className="text-[12px] text-muted">Output turns</div>
              <div className="num font-display text-[24px] font-semibold text-fg">
                {(s.stroke * MULTI_TURN.outputTurns).toFixed(1)}
                <span className="ml-1 text-[15px] text-muted">of {MULTI_TURN.outputTurns}</span>
              </div>
            </div>
          ) : (
            <>
              <AngleDial angle={s.outputAngle} />
              <div className="leading-tight">
                <div className="text-[12px] text-muted">Output angle</div>
                <div className="num font-display text-[24px] font-semibold text-fg">
                  {s.outputAngle.toFixed(0)}
                  <span className="ml-0.5 text-[15px] text-muted">°</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="col-span-2 flex items-center gap-2 md:col-span-1">
          <span
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium",
              s.direction === "stopped" ? "bg-panel-2 text-muted" : "bg-accent-soft text-accent",
            )}
          >
            <span className={cn("size-1.5 rounded-full", s.direction === "stopped" ? "bg-muted" : "bg-accent")} aria-hidden />
            {s.direction === "stopped" ? (s.electric.tripped ? "Torque trip" : s.stalled ? "Stalled" : "Stopped") : s.direction === "opening" ? "Opening" : "Closing"}
          </span>
          <span
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium",
              s.supplyAvailable ? "bg-air-soft text-air" : "bg-danger/10 text-danger",
            )}
          >
            {electric ? (s.supplyAvailable ? "Power on" : "Power lost") : s.supplyAvailable ? "Supply on" : "Supply lost"}
          </span>
        </div>
      </div>
    </div>
  );
}
