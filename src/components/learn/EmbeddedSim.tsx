"use client";

import dynamic from "next/dynamic";
import { ArrowDownToLine, ArrowUpFromLine, ExternalLink, Pause, Play } from "lucide-react";
import type { ActuatorConfiguration, VisualizationMode } from "@/lib/sim/types";
import { SimulationProvider, useEngine, useSimState } from "@/components/sim/SimulationProvider";
import { Button, ButtonLink } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/controls";
import { cn } from "@/lib/utils";
import { LazyMount } from "@/components/ui/LazyMount";
import { simulatorHref } from "@/components/sim/familyUi";

const SimViewport = dynamic(() => import("@/components/three/SimViewport").then((m) => m.SimViewport), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-[13px] text-muted" role="status">
      Loading 3D model
    </div>
  ),
});

export type ExtraControl = "rupture" | "esd" | "jam";

function MiniControls({ supplyToggle, href, extra }: { supplyToggle: boolean; href: string; extra?: ExtraControl }) {
  const { engine } = useEngine();
  const s = useSimState();
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-rule bg-panel px-3 py-2.5">
      <Button size="icon-sm" variant="ghost" onClick={() => engine.dispatch({ type: "toggle-play" })} aria-label={s.playing ? "Pause" : "Play"}>
        {s.playing ? <Pause aria-hidden /> : <Play aria-hidden />}
      </Button>
      <Button size="sm" variant="primary" onClick={() => engine.dispatch({ type: "open" })}>
        <ArrowUpFromLine aria-hidden /> Open
      </Button>
      <Button size="sm" onClick={() => engine.dispatch({ type: "close" })}>
        <ArrowDownToLine aria-hidden /> Close
      </Button>
      <span className="num ml-1 text-[13px] text-fg-2">
        {Math.round(s.position * 100)}% open, {s.outputAngle.toFixed(0)}°
      </span>
      {supplyToggle && (
        <div className="min-w-[150px]">
          <Switch tone="air" checked={s.supplyAvailable} onChange={(v) => engine.dispatch({ type: "set-supply", available: v })} label="Supply" />
        </div>
      )}
      {extra === "rupture" && (
        <Button size="sm" variant={s.gas.ruptured ? "secondary" : "primary"} onClick={() => engine.dispatch({ type: "set-rupture", value: !s.gas.ruptured })}>
          {s.gas.ruptured ? "Repair pipeline" : "Rupture pipeline"}
        </Button>
      )}
      {extra === "rupture" && s.gas.tripped && !s.gas.ruptured && (
        <Button size="sm" onClick={() => engine.dispatch({ type: "reset-line-break" })}>
          Reset trip
        </Button>
      )}
      {extra === "esd" && (
        <div className="min-w-[120px]">
          <Switch checked={s.eh.esd} onChange={(v) => engine.dispatch({ type: "set-esd", value: v })} label="ESD" />
        </div>
      )}
      {extra === "esd" && (
        <Button size="sm" onClick={() => engine.dispatch({ type: "start-pst" })}>
          Partial-stroke test
        </Button>
      )}
      {extra === "jam" && (
        <div className="min-w-[150px]">
          <Switch checked={s.electric.obstruction} onChange={(v) => engine.dispatch({ type: "set-obstruction", value: v })} label="Jam valve" />
        </div>
      )}
      <ButtonLink href={href} size="sm" variant="ghost" className="ml-auto">
        Full simulator <ExternalLink aria-hidden />
      </ButtonLink>
      <p className="w-full text-[12.5px] text-muted" aria-live="polite">
        {s.notice ?? s.status}
      </p>
    </div>
  );
}

export function EmbeddedSim({
  config,
  mode = "cutaway",
  supplyToggle = false,
  className,
  autoCycle = false,
  ariaLabel,
  extra,
}: {
  extra?: ExtraControl;
  config: Partial<ActuatorConfiguration>;
  mode?: VisualizationMode;
  supplyToggle?: boolean;
  className?: string;
  autoCycle?: boolean;
  ariaLabel?: string;
}) {
  const params = new URLSearchParams({ action: config.actionType ?? "spring-return", mode });
  if (config.failPosition === "fail-open") params.set("fail", "open");

  return (
    <SimulationProvider initialConfig={config} initialMode={mode} autoCycle={autoCycle}>
      <div className={cn("overflow-hidden rounded-2xl bg-viewport", className)}>
        <div className="relative h-[320px] sm:h-[380px]">
          <LazyMount className="absolute inset-0">
            <SimViewport compact interactive={false} className="absolute inset-0" ariaLabel={ariaLabel} />
          </LazyMount>
        </div>
        <MiniControls supplyToggle={supplyToggle} href={simulatorHref(config.family ?? "pneumatic-scotch-yoke", params)} extra={extra} />
      </div>
    </SimulationProvider>
  );
}
