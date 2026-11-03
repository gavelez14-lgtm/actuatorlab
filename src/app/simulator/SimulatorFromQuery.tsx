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
 *   type   = scotch-yoke (default) | rack-pinion | electric-part-turn | electric-multi-turn
 *            | electric-compact-part-turn | gas-scotch-yoke | gas-over-oil | electro-hydraulic
 *            | hydraulic-scotch-yoke | hydraulic-rack-pinion
 */
export function SimulatorFromQuery() {
  const q = useSearchParams();
  const action = q.get("action") === "double-acting" ? "double-acting" : "spring-return";
  const fail = q.get("fail") === "open" ? "fail-open" : "fail-closed";
  const modeParam = q.get("mode") as VisualizationMode | null;
  const mode = modeParam && MODES.includes(modeParam) ? modeParam : "normal";
  const type = q.get("type");
  const family = type === "rack-pinion" ? "pneumatic-rack-pinion" : type === "electric-part-turn" ? "electric-part-turn" : type === "electric-multi-turn" ? "electric-multi-turn" : type === "electric-compact-part-turn" ? "electric-compact-part-turn" : type === "gas-scotch-yoke" ? "gas-scotch-yoke" : type === "gas-over-oil" ? "gas-over-oil" : type === "electro-hydraulic" ? "electro-hydraulic" : type === "hydraulic-scotch-yoke" ? "hydraulic-scotch-yoke" : type === "hydraulic-rack-pinion" ? "hydraulic-rack-pinion" : "pneumatic-scotch-yoke";
  const config: Partial<ActuatorConfiguration> = { family, actionType: action, failPosition: action === "double-acting" ? "fail-in-place" : fail };
  return (
    <SimulationProvider key={`${family}-${action}-${fail}-${mode}`} initialConfig={config} initialMode={mode}>
      <SimulatorWorkbench />
    </SimulationProvider>
  );
}
