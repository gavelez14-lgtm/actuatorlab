import { describe, expect, it } from "vitest";
import { SimulationEngine } from "../engine";
import { minimumPressureForFullStroke, torqueCurves } from "../model";
import { GAS } from "../gas";

const run = (e: SimulationEngine, seconds: number, fps = 60) => {
  for (let t = 0; t < seconds; t += 1 / fps) e.advance(1 / fps);
};

describe("direct gas Scotch yoke", () => {
  const make = () => new SimulationEngine({ family: "gas-scotch-yoke", actionType: "double-acting" });

  it("opens on pipeline gas", () => {
    const e = make();
    e.dispatch({ type: "open" });
    run(e, 8);
    expect(e.getState().position).toBeGreaterThan(0.99);
  });

  it("line break closes the valve on reserve gas and latches", () => {
    const e = make();
    e.dispatch({ type: "open" });
    run(e, 8);
    e.dispatch({ type: "set-rupture", value: true });
    run(e, 15);
    const s = e.getState();
    expect(s.gas.tripped).toBe(true);
    expect(s.position).toBeLessThan(0.01);
    expect(s.gas.tank).toBeGreaterThan(s.gas.pipeline);
    e.dispatch({ type: "open" });
    run(e, 3);
    expect(e.getState().position).toBeLessThan(0.01);
  });

  it("does not trip when disarmed, and a double-acting valve stays open", () => {
    const e = make();
    e.dispatch({ type: "open" });
    run(e, 8);
    e.dispatch({ type: "set-line-break-armed", value: false });
    e.dispatch({ type: "set-rupture", value: true });
    run(e, 15);
    expect(e.getState().gas.tripped).toBe(false);
    expect(e.getState().position).toBeGreaterThan(0.99);
  });

  it("filters a short transient (operator set-point change does not trip)", () => {
    const e = make();
    e.dispatch({ type: "set-pressure", bar: 40 });
    run(e, 4);
    expect(e.getState().gas.tripped).toBe(false);
  });

  it("trips at the same time regardless of frame rate", () => {
    const tripTime = (fps: number) => {
      const e = make();
      e.dispatch({ type: "set-rupture", value: true });
      for (let t = 0; t < 20; t += 1 / fps) {
        e.advance(1 / fps);
        if (e.getState().gas.tripped) return e.getState().time;
      }
      return Infinity;
    };
    expect(Math.abs(tripTime(60) - tripTime(10))).toBeLessThan(0.3);
  });

  it("hand pump moves the valve with no gas, and holds when pumping stops", () => {
    const e = new SimulationEngine({ family: "gas-scotch-yoke", actionType: "spring-return", failPosition: "fail-closed" });
    e.dispatch({ type: "set-supply", available: false });
    e.dispatch({ type: "set-manual", value: true });
    e.dispatch({ type: "pump", dir: 1 });
    run(e, GAS.pumpStrokeTime / 2);
    e.dispatch({ type: "pump", dir: 0 });
    const p = e.getState().position;
    expect(p).toBeGreaterThan(0.3);
    run(e, 5);
    expect(e.getState().position).toBeCloseTo(p, 3);
  });

  it("canted yoke moves the torque peak to the breakout end", () => {
    const sym = torqueCurves({ family: "gas-scotch-yoke", actionType: "double-acting", failPosition: "fail-in-place" }, 5);
    const can = torqueCurves({ family: "gas-scotch-yoke", actionType: "double-acting", failPosition: "fail-in-place", yoke: "canted" }, 5);
    expect(sym[0].airStroke).toBeCloseTo(sym[sym.length - 1].airStroke, 5);
    expect(can[0].airStroke).toBeGreaterThan(can[can.length - 1].airStroke * 1.3);
    expect(can[0].airStroke).toBeGreaterThan(sym[0].airStroke);
    const fo = torqueCurves({ family: "pneumatic-scotch-yoke", actionType: "spring-return", failPosition: "fail-open", yoke: "canted" }, 8);
    const foSym = torqueCurves({ family: "pneumatic-scotch-yoke", actionType: "spring-return", failPosition: "fail-open" }, 8);
    // x axis is valve position: the canted gain is at the closed end (position 0) for fail-open too
    expect(fo[0].airStroke + (fo[0].springStroke ?? 0)).toBeGreaterThan(foSym[0].airStroke + (foSym[0].springStroke ?? 0));
    expect(minimumPressureForFullStroke({ family: "gas-scotch-yoke", actionType: "spring-return", failPosition: "fail-closed", yoke: "canted" })).toBeGreaterThan(0);
  });
});

describe("gas over oil", () => {
  const make = () => new SimulationEngine({ family: "gas-over-oil", actionType: "double-acting" });

  it("stroke time follows the flow controls, not pipeline pressure", () => {
    const time = (flow: number, bar: number) => {
      const e = make();
      e.dispatch({ type: "set-flow", value: flow });
      e.dispatch({ type: "set-pressure", bar });
      e.dispatch({ type: "open" });
      let t = 0;
      while (e.getState().position < 0.99 && t < 60) {
        e.advance(1 / 60);
        t += 1 / 60;
      }
      return t;
    };
    expect(time(0.5, 70)).toBeGreaterThan(time(1, 70) * 1.7);
    expect(Math.abs(time(0.5, 70) - time(0.5, 95)) / time(0.5, 70)).toBeLessThan(0.05);
  });

  it("closes on sustained low pressure that the rate trip would miss", () => {
    const e = make();
    e.dispatch({ type: "open" });
    run(e, 12);
    e.dispatch({ type: "set-pressure", bar: 25 }); // operator change: no rate transient, but below the 30 bar low set
    run(e, 20);
    const s = e.getState();
    expect(s.gas.tripped).toBe(true);
    expect(s.gas.tripCause).toBe("low");
    expect(s.position).toBeLessThan(0.01);
  });
});
