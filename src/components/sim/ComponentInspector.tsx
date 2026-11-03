"use client";

import { Crosshair, MousePointerClick, X } from "lucide-react";
import { componentInfo, componentsFor, type ComponentRole } from "@/data/components";
import { mechanismFor } from "@/lib/sim/mechanisms";
import { Button, Tag } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useEngine, useSimSelector } from "./SimulationProvider";

const ROLE_TONE: Record<ComponentRole, "live" | "air" | "ok" | "warn" | "neutral"> = {
  "Linear movement": "neutral",
  "Torque conversion": "live",
  "Output transmission": "ok",
  "Pressure containment": "air",
  "Energy storage": "warn",
  "Flow control": "air",
  "Structure and alignment": "neutral",
  "Motive power": "live",
  "Sensing and control": "ok",
};

export function ComponentInspector() {
  const { engine, camera } = useEngine();
  const selected = useSimSelector((s) => s.selectedComponent);
  const sr = useSimSelector((s) => s.config.actionType === "spring-return");
  const kind = useSimSelector((s) => mechanismFor(s.config.family));
  const info = selected ? (componentInfo(kind, selected) ?? null) : null;
  const list = componentsFor(kind).filter((c) => !c.springReturnOnly || sr);

  return (
    <div className="space-y-5">
      {info ? (
        <article aria-live="polite" className="rounded-xl bg-panel-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[20px] text-fg">{info.name}</h3>
              <Tag tone={ROLE_TONE[info.role]} className="mt-1.5">
                {info.role}
              </Tag>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Clear selection" onClick={() => engine.dispatch({ type: "select", id: null })}>
              <X aria-hidden />
            </Button>
          </div>
          <p className="mt-3 text-[14px] font-medium text-fg">{info.function}</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-fg-2">{info.description}</p>
          {info.caveat && <p className="mt-2 border-l-2 border-rule-strong pl-3 text-[12.5px] leading-snug text-muted">{info.caveat}</p>}
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => camera.current?.focus(info.id)}>
            <Crosshair aria-hidden />
            Focus camera
          </Button>
        </article>
      ) : (
        <div className="flex items-start gap-3 rounded-xl bg-fill p-4 text-[13.5px] text-muted">
          <MousePointerClick className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>Click a part in the 3D view, or choose one below, to see what it does and where it sits in the force path.</p>
        </div>
      )}

      {(["actuator", "valve"] as const).map((group) => (
        <div key={group}>
          <h3 className="mb-1.5 font-sans text-[12.5px] font-medium text-muted">{group === "actuator" ? "Actuator" : "Valve and mounting"}</h3>
          <ul className="divide-y divide-rule overflow-hidden rounded-xl bg-panel-2">
            {list
              .filter((c) => c.group === group)
              .map((c) => {
                const active = c.id === selected;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        engine.dispatch({ type: "select", id: active ? null : c.id });
                      }}
                      onDoubleClick={() => camera.current?.focus(c.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13.5px] transition-colors",
                        active ? "bg-accent-soft text-fg" : "text-fg-2 hover:bg-panel-2",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn("size-1.5 rounded-full", active ? "bg-accent" : "bg-rule-strong")} aria-hidden />
                        {c.name}
                      </span>
                      <span className="text-[11.5px] text-muted">{c.role}</span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
