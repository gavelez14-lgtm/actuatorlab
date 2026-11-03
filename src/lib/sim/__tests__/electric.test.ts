import { describe, expect, it } from "vitest";
import { SimulationEngine } from "../engine";
import { ELECTRIC } from "../electric";

const fam = { family: "electric-part-turn" as const };
const run = (e: SimulationEngine, s: number) => {
  for (let t = 0; t < s; t += 1 / 60) e.advance(1 / 60);
};

describe("electric part-turn", () => {
  it("opens at constant speed and stops at the limit", () => {
    const e = new SimulationEngine(fam);
    e.dispatch({ type: "open" });
    run(e, 2);
    const p1 = e.getState().position;
    run(e, 1);
    const p2 = e.getState().position;
    expect(p2 - p1).toBeCloseTo(1 / ELECTRIC.strokeTime, 1); // constant speed
    run(e, 8);
    expect(e.getState().position).toBe(1);
    expect(e.getState().electric.motorRunning).toBe(false);
  });
  it("fails in place on power loss and keeps the position", () => {
    const e = new SimulationEngine(fam);
    e.dispatch({ type: "open" });
    run(e, 2.5);
    e.dispatch({ type: "set-supply", available: false });
    run(e, 0.5);
    const held = e.getState().position;
    run(e, 5);
    expect(held).toBeGreaterThan(0.2);
    expect(e.getState().position).toBeCloseTo(held, 6);
  });
  it("trips on torque at an obstruction and does not pass it", () => {
    const e = new SimulationEngine(fam);
    e.dispatch({ type: "set-obstruction", value: true });
    e.dispatch({ type: "open" });
    run(e, 10);
    const s = e.getState();
    expect(s.electric.tripped).toBe("opening");
    expect(s.position).toBeGreaterThanOrEqual(ELECTRIC.obstructionWindow[0] - 0.01);
    expect(s.position).toBeLessThan(ELECTRIC.obstructionWindow[1]);
    // reversing clears the trip and closes
    e.dispatch({ type: "close" });
    run(e, 10);
    expect(e.getState().position).toBe(0);
    expect(e.getState().electric.tripped).toBeNull();
  });
  it("trips at the seat when the torque limit is set below break-out", () => {
    const e = new SimulationEngine(fam);
    e.dispatch({ type: "set-torque-limit", value: 0.4 }); // 0.8 units < seat demand 1.0
    e.dispatch({ type: "open" });
    run(e, 3);
    expect(e.getState().electric.tripped).toBe("opening");
    expect(e.getState().position).toBe(0);
  });
  it("ignores commands at Stop and the motor stays off in hand mode", () => {
    const e = new SimulationEngine(fam);
    e.dispatch({ type: "set-selector", value: "stop" });
    e.dispatch({ type: "open" });
    run(e, 2);
    expect(e.getState().position).toBe(0);
    e.dispatch({ type: "set-selector", value: "remote" });
    e.dispatch({ type: "set-hand", value: true });
    e.dispatch({ type: "open" });
    run(e, 2);
    expect(e.getState().position).toBe(0);
    e.dispatch({ type: "handwheel", dir: 1 });
    run(e, 3);
    expect(e.getState().position).toBeGreaterThan(0.05);
    expect(e.getState().electric.motorRunning).toBe(false);
  });
  it("handwheel works without power", () => {
    const e = new SimulationEngine(fam);
    e.dispatch({ type: "set-supply", available: false });
    e.dispatch({ type: "set-hand", value: true });
    e.dispatch({ type: "handwheel", dir: 1 });
    run(e, 4);
    expect(e.getState().position).toBeGreaterThan(0.1);
  });
});

describe("compact electromechanical part-turn", () => {
  const cfam = { family: "electric-compact-part-turn" as const };
  it("opens on limit switches and has no local selector", () => {
    const e = new SimulationEngine(cfam);
    e.dispatch({ type: "set-selector", value: "stop" });
    expect(e.getState().electric.selector).toBe("remote");
    e.dispatch({ type: "open" });
    run(e, 9);
    expect(e.getState().position).toBe(1);
    expect(e.getState().status).toMatch(/cam limit switch/);
  });
  it("trips the mechanical torque switch at a jam", () => {
    const e = new SimulationEngine(cfam);
    e.dispatch({ type: "set-obstruction", value: true });
    e.dispatch({ type: "open" });
    run(e, 9);
    expect(e.getState().electric.tripped).toBe("opening");
    expect(e.getState().status).toMatch(/Torque switch tripped/);
  });
});
