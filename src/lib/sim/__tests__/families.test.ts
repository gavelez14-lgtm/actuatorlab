import { describe, expect, it } from "vitest";
import { SimulationEngine } from "../engine";
import { FAMILY_BEHAVIOR } from "../families";
import type { ActuatorFamilyId, SimulationCommand } from "../types";

const FAMILIES = Object.keys(FAMILY_BEHAVIOR) as ActuatorFamilyId[];

// One command from every family, sent to every family: foreign ones must be ignored safely.
const FOREIGN: SimulationCommand[] = [
  { type: "set-rupture", value: true },
  { type: "set-manual", value: false },
  { type: "pump", dir: 0 },
  { type: "set-flow", value: 0.5 },
  { type: "set-demand", value: 0.5 },
  { type: "set-esd", value: false },
  { type: "start-pst" },
  { type: "set-selector", value: "remote" },
  { type: "set-hand", value: false },
  { type: "handwheel", dir: 0 },
  { type: "set-torque-limit", value: 0.9 },
  { type: "set-pressure", bar: 6 },
];

describe("family modules", () => {
  it("every family id has a behaviour", () => {
    for (const f of FAMILIES) expect(FAMILY_BEHAVIOR[f], f).toBeDefined();
  });

  for (const family of FAMILIES) {
    it(`${family}: opens, survives supply loss, stray commands and reset`, () => {
      const e = new SimulationEngine({ family, actionType: "double-acting" });
      e.dispatch({ type: "open" });
      for (let i = 0; i < 60 * 15; i++) e.advance(1 / 60);
      const s = e.getState();
      expect(s.position, `${family} opens`).toBeGreaterThan(0.9);
      expect(s.status.length).toBeGreaterThan(0);

      e.dispatch({ type: "set-supply", available: false });
      for (const cmd of FOREIGN) e.dispatch(cmd);
      for (let i = 0; i < 60 * 3; i++) e.advance(1 / 60);
      const after = e.getState();
      expect(after.stroke).toBeGreaterThanOrEqual(0);
      expect(after.stroke).toBeLessThanOrEqual(1);
      expect(Number.isFinite(after.velocity)).toBe(true);

      e.dispatch({ type: "reset" });
      expect(e.getState().stroke).toBe(0);
      expect(e.getState().config.family).toBe(family);
    });
  }
});
