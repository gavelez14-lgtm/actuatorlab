import { describe, expect, it } from "vitest";
import { SimulationEngine } from "../engine";
import { EH } from "../electroHydraulic";

const run = (e: SimulationEngine, seconds: number, fps = 60) => {
  for (let t = 0; t < seconds; t += 1 / fps) e.advance(1 / fps);
};
const make = (actionType: "spring-return" | "double-acting" = "spring-return") =>
  new SimulationEngine({ family: "electro-hydraulic", actionType, failPosition: actionType === "spring-return" ? "fail-closed" : "fail-in-place" });

describe("electro-hydraulic with integral controller", () => {
  it("positions to a demand and holds without the pump", () => {
    const e = make();
    e.dispatch({ type: "set-demand", value: 0.4 });
    run(e, 8);
    const s = e.getState();
    expect(Math.abs(s.position - 0.4)).toBeLessThan(EH.deadband * 1.5);
    expect(s.eh.motorRunning).toBe(false);
    run(e, 5);
    expect(Math.abs(e.getState().position - 0.4)).toBeLessThan(EH.deadband * 1.5);
  });

  it("spring-return fails closed on power loss and on ESD", () => {
    for (const cause of ["power", "esd"] as const) {
      const e = make();
      e.dispatch({ type: "open" });
      run(e, 8);
      if (cause === "power") e.dispatch({ type: "set-supply", available: false });
      else e.dispatch({ type: "set-esd", value: true });
      run(e, EH.springStrokeTime + 2);
      expect(e.getState().position).toBeLessThan(0.01);
    }
  });

  it("double acting fails in place on power loss", () => {
    const e = make("double-acting");
    e.dispatch({ type: "set-demand", value: 0.7 });
    run(e, 8);
    e.dispatch({ type: "set-supply", available: false });
    run(e, 4);
    expect(Math.abs(e.getState().position - 0.7)).toBeLessThan(0.02);
  });

  it("partial-stroke test passes on a free valve and fails on a stuck one", () => {
    const e = make();
    e.dispatch({ type: "open" });
    run(e, 8);
    e.dispatch({ type: "start-pst" });
    let minPos = 1;
    for (let t = 0; t < 10; t += 1 / 60) {
      e.advance(1 / 60);
      minPos = Math.min(minPos, e.getState().position);
    }
    expect(e.getState().eh.pst).toBe("passed");
    expect(minPos).toBeLessThan(1 - EH.pstTravel * 0.8);
    expect(minPos).toBeGreaterThan(1 - EH.pstTravel * 1.3);
    expect(e.getState().position).toBeGreaterThan(0.99);

    e.dispatch({ type: "set-stuck", value: true });
    e.dispatch({ type: "start-pst" });
    run(e, EH.pstTimeout + 1);
    expect(e.getState().eh.pst).toBe("failed");
  });

  it("lands on the demand at a low frame rate", () => {
    const e = make();
    e.dispatch({ type: "set-demand", value: 0.55 });
    run(e, 10, 4);
    expect(Math.abs(e.getState().position - 0.55)).toBeLessThan(EH.deadband * 1.5);
  });
});
