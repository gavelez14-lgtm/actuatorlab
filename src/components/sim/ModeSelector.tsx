"use client";

import { Activity, Eye, Layers, Settings2, Wind, Zap } from "lucide-react";
import type { VisualizationMode } from "@/lib/sim/types";
import { Segmented } from "@/components/ui/controls";
import { useEngine, useSimSelector } from "./SimulationProvider";

export const MODES: { value: VisualizationMode; label: string; icon: typeof Eye; summary: string }[] = [
  { value: "normal", label: "Normal", icon: Eye, summary: "Complete actuator and valve" },
  { value: "cutaway", label: "Cutaway", icon: Layers, summary: "See inside the housing" },
  { value: "mechanical", label: "Mechanism", icon: Settings2, summary: "Piston, yoke, pin and shaft, slowed" },
  { value: "energy", label: "Air flow", icon: Wind, summary: "Illustrative supply and exhaust paths" },
  { value: "engineering", label: "Engineering", icon: Activity, summary: "Readouts and torque profile" },
];

export function ModeSelector() {
  const { engine, camera } = useEngine();
  const mode = useSimSelector((s) => s.mode);
  const electric = useSimSelector((s) => s.config.family.startsWith("electric"));
  const fluid = useSimSelector((s) => (s.config.family === "gas-over-oil" || s.config.family === "electro-hydraulic" ? "Oil flow" : s.config.family === "gas-scotch-yoke" ? "Gas flow" : null));
  return (
    <Segmented
      label="Visualisation mode"
      value={mode}
      onChange={(m) => {
        engine.dispatch({ type: "set-mode", mode: m });
        camera.current?.preset(m);
      }}
      className="w-full overflow-x-auto sm:w-auto"
      options={MODES.map((m) => ({
        value: m.value,
        hint: electric && m.value === "energy" ? "Illustrative electrical and mechanical power path" : m.summary,
        label: (
          <>
            {electric && m.value === "energy" ? <Zap aria-hidden /> : <m.icon aria-hidden />}
            <span className="max-sm:sr-only">{electric && m.value === "energy" ? "Power flow" : fluid && m.value === "energy" ? fluid : m.label}</span>
          </>
        ),
      }))}
    />
  );
}
