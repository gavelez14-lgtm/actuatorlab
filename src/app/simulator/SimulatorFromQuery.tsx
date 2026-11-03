"use client";

import { useSearchParams } from "next/navigation";
import type { ActuatorConfiguration, VisualizationMode } from "@/lib/sim/types";
import { SimulationProvider } from "@/components/sim/SimulationProvider";
import { SimulatorWorkbench } from "@/components/sim/SimulatorWorkbench";
import { familyFromType } from "@/components/sim/familyUi";

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
  const family = familyFromType(type);
  const valveParam = q.get("valve");
  const valve = valveParam === "butterfly" || valveParam === "plug" ? valveParam : "ball";
  const config: Partial<ActuatorConfiguration> = { family, actionType: action, failPosition: action === "double-acting" ? "fail-in-place" : fail, valve };
  return (
    <SimulationProvider key={`${family}-${action}-${fail}-${mode}-${valve}`} initialConfig={config} initialMode={mode}>
      <SimulatorWorkbench />
    </SimulationProvider>
  );
}
