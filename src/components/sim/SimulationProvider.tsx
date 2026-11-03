"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { SimulationEngine } from "@/lib/sim/engine";
import type { ActuatorConfiguration, ComponentId, SimulationState, VisualizationMode } from "@/lib/sim/types";

/** Imperative camera actions, implemented inside the 3D scene. */
export interface CameraApi {
  reset: () => void;
  fit: () => void;
  focus: (id: ComponentId) => void;
  /** Fly to the mode's preset view; `scale` multiplies the preset distance. */
  preset: (mode: VisualizationMode, scale?: number) => void;
}

interface SimContextValue {
  engine: SimulationEngine;
  camera: React.RefObject<CameraApi | null>;
}

const SimContext = createContext<SimContextValue | null>(null);

export function SimulationProvider({
  children,
  initialConfig,
  initialMode,
  autoCycle,
}: {
  children: ReactNode;
  initialConfig?: Partial<ActuatorConfiguration>;
  initialMode?: VisualizationMode;
  autoCycle?: boolean;
}) {
  const [engine] = useState(() => {
    const e = new SimulationEngine(initialConfig);
    if (initialMode && initialMode !== "normal") e.dispatch({ type: "set-mode", mode: initialMode });
    if (autoCycle) e.dispatch({ type: "set-auto-cycle", value: true });
    return e;
  });
  const camera = useRef<CameraApi | null>(null);

  useEffect(() => {
    engine.start();
    return () => engine.stop();
  }, [engine]);

  return <SimContext.Provider value={{ engine, camera }}>{children}</SimContext.Provider>;
}

export function useEngine() {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("useEngine must be used inside <SimulationProvider>");
  return ctx;
}

/** Throttled, immutable snapshot of simulation state for React UI. */
export function useSimState(): SimulationState {
  const { engine } = useEngine();
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
}

/**
 * Subscribe to a single derived value. Components only re-render when the
 * selected value changes (compared with Object.is), so return primitives.
 */
export function useSimSelector<T>(selector: (s: SimulationState) => T): T {
  const { engine } = useEngine();
  return useSyncExternalStore(
    engine.subscribe,
    () => selector(engine.getSnapshot()),
    () => selector(engine.getSnapshot()),
  );
}
