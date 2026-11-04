import { describe, expect, it } from "vitest";
import { SimulationEngine } from "../engine";
import { FAULTS, runFor } from "@/data/faults";

function load(id: string) {
  const f = FAULTS.find((x) => x.id === id)!;
  const e = new SimulationEngine(f.config);
  f.setup(e);
  return e;
}

describe("fault-finding scenarios produce their reported symptoms", () => {
  it("will-not-open: stays closed, air arrives, margin negative", () => {
    const e = load("will-not-open");
    e.dispatch({ type: "open" });
    runFor(e, 6);
    const s = e.getState();
    expect(s.position).toBeLessThan(0.01);
    expect(s.chamberA).toBe("supply");
    expect(s.torque.net).toBeLessThan(0);
    expect(s.supplyAvailable).toBe(true);
  });

  it("stops-short: opens most of the way, stops with air on and negative margin", () => {
    const e = load("stops-short");
    e.dispatch({ type: "open" });
    runFor(e, 12);
    const s = e.getState();
    expect(s.position).toBeGreaterThan(0.5);
    expect(s.position).toBeLessThan(0.97);
    expect(s.stalled).toBe(true);
    expect(s.chamberA).toBe("supply");
  });

  it("fails-wrong-way: opens on supply loss from closed", () => {
    const e = load("fails-wrong-way");
    e.dispatch({ type: "close" });
    runFor(e, 6);
    expect(e.getState().position).toBeLessThan(0.01);
    e.dispatch({ type: "set-supply", available: false });
    runFor(e, 6);
    expect(e.getState().position).toBeGreaterThan(0.99);
  });

  it("ignores-commands: powered, no trip, selector at stop, does not move", () => {
    const e = load("ignores-commands");
    e.dispatch({ type: "open" });
    runFor(e, 8);
    const s = e.getState();
    expect(s.position).toBeLessThan(0.01);
    expect(s.supplyAvailable).toBe(true);
    expect(s.electric.tripped).toBeNull();
    expect(s.electric.selector).toBe("stop");
  });

  it("stops-mid-travel: trips opening part-way; closing works", () => {
    const e = load("stops-mid-travel");
    e.dispatch({ type: "open" });
    runFor(e, 10);
    const s = e.getState();
    expect(s.electric.tripped).toBe("opening");
    expect(s.position).toBeGreaterThan(0.3);
    expect(s.position).toBeLessThan(0.7);
    e.dispatch({ type: "close" });
    runFor(e, 10);
    expect(e.getState().position).toBeLessThan(0.01);
  });

  it("will-not-reopen: line healthy, trip latched, Open does nothing until reset", () => {
    const e = load("will-not-reopen");
    const s = e.getState();
    expect(s.position).toBeLessThan(0.01);
    expect(s.gas.tripped).toBe(true);
    expect(s.gas.ruptured).toBe(false);
    expect(s.gas.pipeline).toBeGreaterThan(65);
    e.dispatch({ type: "open" });
    runFor(e, 5);
    expect(e.getState().position).toBeLessThan(0.01);
    e.dispatch({ type: "reset-line-break" });
    e.dispatch({ type: "open" });
    runFor(e, 8);
    expect(e.getState().position).toBeGreaterThan(0.99);
  });

  it("pst-failed: open, powered, no ESD; a new PST fails", () => {
    const e = load("pst-failed");
    let s = e.getState();
    expect(s.position).toBeGreaterThan(0.99);
    expect(s.eh.esd).toBe(false);
    expect(s.supplyAvailable).toBe(true);
    e.dispatch({ type: "start-pst" });
    runFor(e, 8);
    s = e.getState();
    expect(s.eh.pst).toBe("failed");
    expect(s.position).toBeGreaterThan(0.99);
  });

  it("every scenario has a valid answer and an explanation", () => {
    for (const f of FAULTS) {
      expect(f.answer).toBeGreaterThanOrEqual(0);
      expect(f.answer).toBeLessThan(f.options.length);
      expect(f.explanation.length).toBeGreaterThan(40);
    }
    expect(new Set(FAULTS.map((f) => f.id)).size).toBe(FAULTS.length);
  });
});
