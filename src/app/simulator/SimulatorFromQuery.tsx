"use client";

import { useSearchParams } from "next/navigation";
import type { ActuatorConfiguration, VisualizationMode } from "@/lib/sim/types";
import { SimulationProvider } from "@/components/sim/SimulationProvider";
import { SimulatorWorkbench } from "@/components/sim/SimulatorWorkbench";

const MODES: VisualizationMode[] = ["normal", "cutaway", "mechanical", "energy", "engineering"];

/**
 * Supported query parameters:
 *   action = double-acting | spring-return
 *   fail   = closed | open
 *   mode   = normal | cutaway | mechanical | energy | engineering
 */
export function SimulatorFromQuery() {
  const q = useSearchParams();
  const action = q.get("action") === "double-acting" ? "double-acting" : "spring-return";
  const fail = q.get("fail") === "open" ? "fail-open" : "fail-closed";
  const modeParam = q.get("mode") as VisualizationMode | null;
  const mode = modeParam && MODES.includes(modeParam) ? modeParam : "normal";
  const config: Partial<ActuatorConfiguration> = { family: "pneumatic-scotch-yoke", actionType: action, failPosition: action === "double-acting" ? "fail-in-place" : fail };
  return (
    <SimulationProvider key={`${action}-${fail}-${mode}`} initialConfig={config} initialMode={mode}>
      <SimulatorWorkbench />
    </SimulationProvider>
  );
}
