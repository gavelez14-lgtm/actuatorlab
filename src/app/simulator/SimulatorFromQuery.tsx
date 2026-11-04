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
 *   valve  = ball (default) | butterfly | plug
 *   yoke   = symmetric (default) | canted
 *   explode = 1 to open in the exploded (anatomy) view
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
  const yoke = q.get("yoke") === "canted" ? "canted" : "symmetric";
  const exploded = q.get("explode") === "1";
  const config: Partial<ActuatorConfiguration> = { family, actionType: action, failPosition: action === "double-acting" ? "fail-in-place" : fail, valve, yoke };
  return (
    <SimulationProvider key={`${family}-${action}-${fail}-${mode}-${valve}-${yoke}-${exploded}`}
      initialConfig={config}
      initialMode={mode}
      setup={exploded ? (e) => e.dispatch({ type: "set-explode", value: 1 }) : undefined}
    >
      <SimulatorWorkbench />
    </SimulationProvider>
  );
}
