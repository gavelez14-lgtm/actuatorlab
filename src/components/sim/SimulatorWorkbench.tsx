"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { ChevronDown, Focus, Maximize, RotateCcw, Tag as TagIcon } from "lucide-react";
import { Button, Illustrative, Tag } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progress";
import { ModeSelector } from "./ModeSelector";
import { PlaybackBar } from "./PlaybackBar";
import { ConfigPanel } from "./ConfigPanel";
import { ComponentInspector } from "./ComponentInspector";
import { ModeGuide } from "./ModeGuide";
import { EngineeringOverlay } from "./EngineeringOverlay";
import { useEngine, useSimSelector, useSimState } from "./SimulationProvider";
import { FAMILY_UI, MENU_GROUPS, simulatorHref } from "./familyUi";
import type { ActuatorFamilyId } from "@/lib/sim/types";

const SimViewport = dynamic(() => import("@/components/three/SimViewport").then((m) => m.SimViewport), {
  ssr: false,
  loading: () => <ViewportLoading />,
});

function ViewportLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center text-[13px] text-muted" role="status">
      <span className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-rule-strong border-t-accent" aria-hidden />
      Loading 3D model
    </div>
  );
}

type Tab = "configure" | "components" | "guide";
const TABS: { id: Tab; label: string }[] = [
  { id: "configure", label: "Configure" },
  { id: "components", label: "Components" },
  { id: "guide", label: "Guide" },
];

function StatusLine() {
  const s = useSimState();
  return (
    <div className="pointer-events-none absolute left-3 right-16 top-3 flex flex-col items-start gap-2 sm:right-auto sm:max-w-[min(560px,calc(100%-12rem))]">
      <p className="pointer-events-auto glass rounded-full px-3.5 py-1.5 text-[13px] text-fg" aria-live="polite">
        {s.status}
      </p>
      {s.notice && (
        <p className="pointer-events-auto glass rounded-2xl px-3.5 py-2 text-[13px] text-fg-2" role="status">
          {s.notice}
        </p>
      )}
    </div>
  );
}

function ViewportToolbar() {
  const { engine, camera } = useEngine();
  const labels = useSimSelector((s) => s.showLabels);
  const selected = useSimSelector((s) => s.selectedComponent);
  return (
    <div className="absolute right-3 top-3 flex flex-col gap-1 glass rounded-2xl p-1" role="toolbar" aria-label="Camera">
      <Button variant="ghost" size="icon-sm" onClick={() => camera.current?.reset()} aria-label="Reset camera" title="Reset camera">
        <RotateCcw aria-hidden />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={() => camera.current?.fit()} aria-label="Fit view" title="Fit view">
        <Maximize aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => selected && camera.current?.focus(selected)}
        disabled={!selected}
        aria-label="Focus selected component"
        title={selected ? "Focus selected component" : "Select a component to focus"}
      >
        <Focus aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => engine.dispatch({ type: "set-labels", value: !labels })}
        aria-pressed={labels}
        aria-label="Toggle movement labels"
        title="Movement labels"
        className={cn(labels && "text-accent")}
      >
        <TagIcon aria-hidden />
      </Button>
    </div>
  );
}

export function SimulatorWorkbench() {
  const { engine, camera } = useEngine();
  const mode = useSimSelector((s) => s.mode);
  const selected = useSimSelector((s) => s.selectedComponent);
  const actionType = useSimSelector((s) => s.config.actionType);
  const fail = useSimSelector((s) => s.config.failPosition);
  const family = useSimSelector((s) => s.config.family);
  const ui = FAMILY_UI[family];
  const valveKind = useSimSelector((s) => s.config.valve ?? "ball");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("configure");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { touchRecent } = useProgress();

  useEffect(() => {
    touchRecent({ id: `sim-${family}`, title: FAMILY_UI[family].recentTitle, href: simulatorHref(family) });
  }, [touchRecent, family]);

  // Selecting a part in the scene brings the Components tab forward
  // (state adjusted during render, per React guidance, not in an effect).
  const [lastSelected, setLastSelected] = useState(selected);
  if (selected !== lastSelected) {
    setLastSelected(selected);
    if (selected) setTab("components");
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.closest("input, textarea, select, [contenteditable=true]") || (el.closest("button, [role=radio], [role=switch]") && (e.key === " " || e.key === "Enter")))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const s = engine.getState();
      if (k === " ") {
        e.preventDefault();
        engine.dispatch({ type: "toggle-play" });
      } else if (k === "o") engine.dispatch({ type: "open" });
      else if (k === "c") engine.dispatch({ type: "close" });
      else if (k === "r") engine.dispatch({ type: "reset" });
      else if (k === "s") engine.dispatch({ type: "set-supply", available: !s.supplyAvailable });
      else if (k === "f") camera.current?.fit();
      else if (k === "escape") engine.dispatch({ type: "select", id: null });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, camera]);

  const onTabKey = (e: ReactKeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let n = i;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length;
    else return;
    e.preventDefault();
    setTab(TABS[n].id);
    tabRefs.current[n]?.focus();
  };

  const configLabel = ui.configLabel(actionType, fail);
  const valveText = ui.valveChoice
    ? valveKind === "butterfly"
      ? "on a butterfly valve"
      : valveKind === "plug"
        ? "on a plug valve"
        : "on a quarter-turn ball valve"
    : (ui.fixedValve ?? "on a quarter-turn ball valve");

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh lg:min-h-0">
      <header className="flex flex-col gap-3 border-b border-rule bg-panel px-4 py-3 md:flex-row md:items-center md:justify-between lg:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[24px] text-fg">{ui.title}</h1>
            <Tag tone="live">Interactive</Tag>
          </div>
          <p className="mt-0.5 text-[13px] text-muted">
            {configLabel}, {valveText}. <Illustrative>Educational model, not manufacturer geometry</Illustrative>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative inline-flex h-9 items-center rounded-[9px] bg-fill pl-3 pr-8 text-[13px] text-fg">
            <span className="mr-1.5 text-muted">Actuator</span>
            <select
              aria-label="Actuator type"
              className="cursor-pointer appearance-none bg-transparent font-medium text-fg outline-none"
              value={family}
              onChange={(ev) => {
                const next = ev.target.value as ActuatorFamilyId;
                const params = new URLSearchParams();
                // Keep the action and fail choice when both families offer it.
                if (ui.actionChoice && FAMILY_UI[next].actionChoice) {
                  if (actionType === "double-acting") params.set("action", "double-acting");
                  if (fail === "fail-open") params.set("fail", "open");
                }
                router.push(simulatorHref(next, params));
              }}
            >
              {MENU_GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {(Object.keys(FAMILY_UI) as ActuatorFamilyId[])
                    .filter((f) => FAMILY_UI[f].menu?.group === group)
                    .map((f) => (
                      <option key={f} value={f}>
                        {FAMILY_UI[f].menu!.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-muted" aria-hidden />
          </label>
          <ModeSelector />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative h-[56vh] min-h-[340px] bg-viewport lg:h-auto lg:flex-1">
            <SimViewport className="absolute inset-0" />
            <StatusLine />
            <ViewportToolbar />
            {mode === "engineering" && (
              <div className="pointer-events-none absolute bottom-3 left-3 hidden sm:block">
                <EngineeringOverlay />
              </div>
            )}
            <p className="pointer-events-none absolute bottom-3 right-3 hidden text-[11.5px] text-muted md:block">Drag to orbit, scroll to zoom, right-drag to pan. Click a part to inspect it.</p>
          </div>
          {mode === "engineering" && (
            <div className="border-t border-rule bg-panel p-3 sm:hidden">
              <EngineeringOverlay />
            </div>
          )}
          <PlaybackBar />
        </div>

        <aside className="flex w-full shrink-0 flex-col border-t border-rule bg-panel lg:w-[360px] lg:border-l lg:border-t-0" aria-label="Simulator panels">
          <div role="tablist" aria-label="Simulator panels" className="flex border-b border-rule px-2" onKeyDown={onTabKey}>
            {TABS.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                id={`tab-${t.id}`}
                aria-controls={`panel-${t.id}`}
                aria-selected={tab === t.id}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative h-11 px-3 text-[13.5px] font-medium transition-colors",
                  tab === t.id ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                {t.label}
                <span aria-hidden className={cn("absolute inset-x-3 bottom-0 h-0.5 rounded-full", tab === t.id ? "bg-accent" : "bg-transparent")} />
              </button>
            ))}
          </div>
          <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto p-4" tabIndex={0}>
            {tab === "configure" && <ConfigPanel />}
            {tab === "components" && <ComponentInspector />}
            {tab === "guide" && <ModeGuide />}
          </div>
        </aside>
      </div>
    </div>
  );
}
