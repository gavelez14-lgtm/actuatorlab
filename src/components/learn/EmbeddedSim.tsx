"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, ExternalLink, Gauge, Pause, Play, Timer } from "lucide-react";
import type { SimulationEngine } from "@/lib/sim/engine";
import { EngineeringOverlay } from "@/components/sim/EngineeringOverlay";
import type { ActuatorConfiguration, ActuatorFamilyId, VisualizationMode } from "@/lib/sim/types";
import { GAS } from "@/lib/sim/gas";
import { MULTI_TURN, isMultiTurn } from "@/lib/sim/electric";
import { SimulationProvider, useEngine, useSimState } from "@/components/sim/SimulationProvider";
import { Button, ButtonLink } from "@/components/ui/primitives";
import { Range, Segmented, Switch } from "@/components/ui/controls";
import { cn } from "@/lib/utils";
import { LazyMount } from "@/components/ui/LazyMount";
import { FAMILY_UI, modelPressure, simulatorHref } from "@/components/sim/familyUi";
import { TorqueChart } from "@/components/sim/TorqueChart";
import { SupplyBadge } from "@/components/sim/SupplyBadge";

const SimViewport = dynamic(() => import("@/components/three/SimViewport").then((m) => m.SimViewport), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-[13px] text-muted" role="status">
      Loading 3D model
    </div>
  ),
});

/** Lesson-specific controls an embedded simulator can show. */
export type ExtraControl =
  | "rupture" // pipeline rupture and trip reset (gas)
  | "esd" // ESD switch and partial-stroke test (electro-hydraulic)
  | "jam" // valve jam (electric)
  | "valve" // ball / butterfly / plug
  | "pressure" // supply pressure slider
  | "coupling" // fail closed / fail open (spring return)
  | "action" // spring return (3/2) / double acting (5/2)
  | "flow" // flow-control setting (oil)
  | "yoke" // symmetric / canted Scotch yoke
  | "spring"; // spring return / double acting (neutral wording)

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">{children}</div>;
}

function ExtraControls({ extras }: { extras: ExtraControl[] }) {
  const { engine } = useEngine();
  const s = useSimState();
  const ui = FAMILY_UI[s.config.family];
  const sup = ui.supply;
  const has = (x: ExtraControl) => extras.includes(x);
  return (
    <>
      {has("valve") && (
        <Row>
          <span className="text-[12.5px] text-muted">Valve</span>
          <Segmented
            label="Valve"
            value={s.config.valve ?? "ball"}
            onChange={(v) => engine.dispatch({ type: "set-config", config: { valve: v } })}
            options={[
              { value: "ball", label: "Ball" },
              { value: "butterfly", label: "Butterfly" },
              { value: "plug", label: "Plug" },
            ]}
          />
        </Row>
      )}
      {has("yoke") && (
        <Row>
          <span className="text-[12.5px] text-muted">Yoke</span>
          <Segmented
            label="Yoke"
            value={s.config.yoke ?? "symmetric"}
            onChange={(v) => engine.dispatch({ type: "set-config", config: { yoke: v } })}
            options={[
              { value: "symmetric", label: "Symmetric" },
              { value: "canted", label: "Canted" },
            ]}
          />
        </Row>
      )}
      {has("spring") && (
        <Row>
          <span className="text-[12.5px] text-muted">Action</span>
          <Segmented
            label="Action type"
            value={s.config.actionType}
            onChange={(v) => engine.dispatch({ type: "set-config", config: { actionType: v } })}
            options={[
              { value: "spring-return", label: "Spring return" },
              { value: "double-acting", label: "Double acting" },
            ]}
          />
        </Row>
      )}
      {has("action") && (
        <Row>
          <span className="text-[12.5px] text-muted">Solenoid</span>
          <Segmented
            label="Action type"
            value={s.config.actionType}
            onChange={(v) => engine.dispatch({ type: "set-config", config: { actionType: v } })}
            options={[
              { value: "spring-return", label: "3/2, spring return" },
              { value: "double-acting", label: "5/2, double acting" },
            ]}
          />
        </Row>
      )}
      {has("coupling") && (
        <Row>
          <span className="text-[12.5px] text-muted">Coupling</span>
          <Segmented
            label="Fail action"
            value={s.config.failPosition}
            onChange={(v) => engine.dispatch({ type: "set-config", config: { failPosition: v } })}
            options={[
              { value: "fail-closed", label: "Fail closed" },
              { value: "fail-open", label: "Fail open (turned 90°)" },
            ]}
          />
        </Row>
      )}
      {has("pressure") && sup && (
        <Row>
          <label htmlFor="emb-pressure" className="text-[12.5px] text-muted">
            Supply pressure
          </label>
          <div className="min-w-[160px] flex-1">
            <Range id="emb-pressure" label="Supply pressure" min={sup.min} max={sup.max} step={sup.step} value={s.supplyPressure} onChange={(v) => engine.dispatch({ type: "set-pressure", bar: v })} />
          </div>
          <span className="num text-[13px] text-fg">{s.supplyPressure.toFixed(sup.decimals)} bar</span>
        </Row>
      )}
      {has("flow") && (
        <Row>
          <label htmlFor="emb-flow" className="text-[12.5px] text-muted">
            Flow control
          </label>
          <div className="min-w-[160px] flex-1">
            <Range id="emb-flow" label="Flow-control setting" min={GAS.flowMin} max={1} step={0.01} value={s.gas.flow} onChange={(v) => engine.dispatch({ type: "set-flow", value: v })} />
          </div>
          <span className="num text-[13px] text-fg">{Math.round(s.gas.flow * 100)}% open</span>
        </Row>
      )}
      {has("rupture") && (
        <Button size="sm" variant={s.gas.ruptured ? "secondary" : "primary"} onClick={() => engine.dispatch({ type: "set-rupture", value: !s.gas.ruptured })}>
          {s.gas.ruptured ? "Repair pipeline" : "Rupture pipeline"}
        </Button>
      )}
      {has("rupture") && s.gas.tripped && !s.gas.ruptured && (
        <Button size="sm" onClick={() => engine.dispatch({ type: "reset-line-break" })}>
          Reset trip
        </Button>
      )}
      {has("esd") && (
        <div className="min-w-[120px]">
          <Switch checked={s.eh.esd} onChange={(v) => engine.dispatch({ type: "set-esd", value: v })} label="ESD" />
        </div>
      )}
      {has("esd") && (
        <Button size="sm" onClick={() => engine.dispatch({ type: "start-pst" })}>
          Partial-stroke test
        </Button>
      )}
      {has("jam") && (
        <div className="min-w-[150px]">
          <Switch checked={s.electric.obstruction} onChange={(v) => engine.dispatch({ type: "set-obstruction", value: v })} label="Jam valve" />
        </div>
      )}
    </>
  );
}

/** Measures each stroke in simulation time (start of motion to stop). */
function StrokeTimer() {
  const s = useSimState();
  const [flowing, setFlowing] = useState(s.airFlowing);
  const [start, setStart] = useState<number | null>(null);
  const [last, setLast] = useState<number | null>(null);
  // Adjust state during render when motion starts or stops (no effect needed).
  if (s.airFlowing !== flowing) {
    setFlowing(s.airFlowing);
    if (s.airFlowing) setStart(s.time);
    else if (start !== null) setLast(s.time - start);
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-fg-2" aria-live="polite">
      <Timer className="size-3.5" aria-hidden />
      {s.airFlowing && start !== null ? "Timing…" : last !== null ? <span className="num">Last stroke {last.toFixed(1)} s</span> : "Stroke time appears here"}
    </span>
  );
}

function InstrumentsPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-rule bg-panel px-3 py-2.5">
      <Button size="sm" variant="secondary" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Gauge aria-hidden /> {open ? "Hide instruments" : "Read the instruments"}
      </Button>
      {open && (
        <div className="mt-3 [&>div]:w-full [&>div]:max-w-none">
          <EngineeringOverlay />
        </div>
      )}
    </div>
  );
}

function LiveChart() {
  const s = useSimState();
  return <TorqueChart config={s.config} pressure={modelPressure(s)} position={s.position} showAxisNote={false} />;
}

function MiniControls({ supplyToggle, href, extras, strokeTimer, hideStatus }: { supplyToggle: boolean; href?: string; extras: ExtraControl[]; strokeTimer: boolean; hideStatus: boolean }) {
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
        {Math.round(s.position * 100)}% open,{" "}
        {isMultiTurn(s.config.family) ? `${(s.stroke * MULTI_TURN.outputTurns).toFixed(1)} turns` : `${s.outputAngle.toFixed(0)}°`}
      </span>
      <SupplyBadge compact className="ml-1" />
      {strokeTimer && <StrokeTimer />}
      {supplyToggle && (
        <div className="min-w-[150px]">
          <Switch tone="air" checked={s.supplyAvailable} onChange={(v) => engine.dispatch({ type: "set-supply", available: v })} label="Supply" />
        </div>
      )}
      {href && (
        <ButtonLink href={href} size="sm" variant="ghost" className="ml-auto">
          Full simulator <ExternalLink aria-hidden />
        </ButtonLink>
      )}
      {extras.length > 0 && (
        <div className="flex w-full flex-wrap items-center gap-2 border-t border-rule pt-2.5">
          <ExtraControls extras={extras} />
        </div>
      )}
      {!hideStatus && (
        <p className="w-full text-[12.5px] text-muted" aria-live="polite">
          {s.notice ?? s.status}
        </p>
      )}
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
  extras = [],
  chart = false,
  strokeTimer = false,
  setup,
  hideStatus = false,
  instruments = false,
}: {
  /** Inject state before the clock starts (fault-finding). */
  setup?: (engine: SimulationEngine) => void;
  /** Hide status text and notices (they would give a diagnosis away). */
  hideStatus?: boolean;
  /** Offer the Engineering readouts as an instruments panel. */
  instruments?: boolean;
  config: Partial<ActuatorConfiguration>;
  mode?: VisualizationMode;
  supplyToggle?: boolean;
  className?: string;
  autoCycle?: boolean;
  ariaLabel?: string;
  /** Single extra control (shorthand for `extras`). */
  extra?: ExtraControl;
  extras?: ExtraControl[];
  /** Show the live torque chart under the model. */
  chart?: boolean;
  /** Time each stroke. */
  strokeTimer?: boolean;
}) {
  const params = new URLSearchParams({ action: config.actionType ?? "spring-return", mode });
  if (config.failPosition === "fail-open") params.set("fail", "open");
  if (config.valve && config.valve !== "ball") params.set("valve", config.valve);
  const all = extra ? [extra, ...extras] : extras;
  return (
    <SimulationProvider initialConfig={config} initialMode={mode} autoCycle={autoCycle} setup={setup}>
      <div className={cn("overflow-hidden rounded-2xl bg-viewport", className)}>
        <div className={cn("grid", chart && "md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]")}>
          <div className="relative h-[320px] sm:h-[380px]">
            <LazyMount className="absolute inset-0">
              <SimViewport compact interactive={false} className="absolute inset-0" ariaLabel={ariaLabel} />
            </LazyMount>
          </div>
          {chart && (
            <div className="flex flex-col justify-center border-t border-rule bg-panel p-3 md:border-l md:border-t-0">
              <LiveChart />
            </div>
          )}
        </div>
        <MiniControls
          supplyToggle={supplyToggle}
          href={hideStatus ? undefined : simulatorHref(config.family ?? "pneumatic-scotch-yoke", params)}
          extras={all}
          strokeTimer={strokeTimer}
          hideStatus={hideStatus}
        />
        {instruments && <InstrumentsPanel />}
      </div>
    </SimulationProvider>
  );
}

/**
 * The same lesson demo across several families. Switching family remounts the
 * simulator (each family has its own engine module and model).
 */
export function FamilyPickerDemo({
  options,
  mode = "normal",
  supplyToggle = false,
  ariaLabel,
}: {
  options: { family: ActuatorFamilyId; label: string; config?: Partial<ActuatorConfiguration> }[];
  mode?: VisualizationMode;
  supplyToggle?: boolean;
  ariaLabel?: string;
}) {
  const [family, setFamily] = useState(options[0].family);
  const opt = options.find((o) => o.family === family) ?? options[0];
  return (
    <div>
      <div className="mb-2 overflow-x-auto">
        <Segmented label="Actuator" value={family} onChange={(v) => setFamily(v)} options={options.map((o) => ({ value: o.family, label: o.label }))} />
      </div>
      <EmbeddedSim key={family} config={{ family, ...opt.config }} mode={mode} supplyToggle={supplyToggle} ariaLabel={`${ariaLabel ?? "Live 3D actuator"}: ${opt.label}`} />
    </div>
  );
}
