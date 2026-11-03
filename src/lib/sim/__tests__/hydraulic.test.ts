import { describe, expect, it } from "vitest";
import { SimulationEngine } from "../engine";
import { HYD } from "../hydraulic";

const strokeTime = (e: SimulationEngine) => {
  e.dispatch({ type: "open" });
  let t = 0;
  while (e.getState().position < 0.99 && t < 60) {
    e.advance(1 / 60);
    t += 1 / 60;
  }
  return t;
};

describe("hydraulic actuators", () => {
  for (const family of ["hydraulic-scotch-yoke", "hydraulic-rack-pinion"] as const) {
    it(`${family}: starts at the hydraulic default pressure and strokes at the flow-set speed`, () => {
      const e = new SimulationEngine({ family, actionType: "double-acting" });
      expect(e.getState().supplyPressure).toBe(HYD.pressureDefault);
      e.dispatch({ type: "set-flow", value: 1 });
      const t = strokeTime(e);
      expect(t).toBeGreaterThan(HYD.strokeTime * 0.9);
      expect(t).toBeLessThan(HYD.strokeTime * 1.6);
    });
  }

  it("stalls when hydraulic pressure is too low for the spring-return powered stroke", () => {
    const e = new SimulationEngine({ family: "hydraulic-scotch-yoke", actionType: "spring-return", failPosition: "fail-closed" });
    e.dispatch({ type: "set-pressure", bar: HYD.pressureMin });
    e.dispatch({ type: "open" });
    for (let i = 0; i < 600; i++) e.advance(1 / 60);
    expect(e.getState().position).toBeLessThan(0.99);
  });
});

import { checkVaneGeometry } from "../vaneGeometry";
import { torqueCurves } from "../model";

describe("pneumatic vane", () => {
  it("vane clears the chamber walls through the stroke", () => {
    expect(checkVaneGeometry()).toEqual([]);
  });
  it("is double acting only and gives constant torque", () => {
    const e = new SimulationEngine({ family: "pneumatic-vane", actionType: "spring-return" });
    expect(e.getState().config.actionType).toBe("double-acting");
    const c = torqueCurves(e.getState().config, 5.5);
    expect(c[0].airStroke).toBeCloseTo(c[30].airStroke, 6);
    e.dispatch({ type: "open" });
    for (let i = 0; i < 600; i++) e.advance(1 / 60);
    expect(e.getState().position).toBeGreaterThan(0.99);
  });
});
