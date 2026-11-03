import { describe, expect, it } from "vitest";
import { SimulationEngine } from "../engine";
import { RP, RP_TRAVEL, checkRackPinionGeometry, rpPinionRotationY, rpPistonInnerX } from "../rackPinionGeometry";
import { leverFor } from "../mechanisms";
import { torqueCurves } from "../model";

const RP_FAMILY = "pneumatic-rack-pinion" as const;
const run = (e: SimulationEngine, s: number) => {
  for (let t = 0; t < s; t += 1 / 60) e.advance(1 / 60);
};

describe("rack and pinion geometry", () => {
  it("keeps pistons, racks and springs within their constraints", () => {
    expect(checkRackPinionGeometry()).toEqual([]);
  });
  it("rack travel equals pitch radius times pinion rotation (no slip)", () => {
    for (let i = 0; i <= 10; i++) {
      const s = i / 10;
      const travel = rpPistonInnerX(s) - rpPistonInnerX(0);
      const rotation = Math.abs(rpPinionRotationY(s) - rpPinionRotationY(0));
      expect(travel).toBeCloseTo(RP.pitchRadius * rotation, 9);
    }
    expect(RP_TRAVEL).toBeCloseTo(RP.pitchRadius * (Math.PI / 2), 9);
  });
});

describe("rack and pinion behaviour", () => {
  it("has a constant lever arm through the stroke", () => {
    expect(leverFor(RP_FAMILY, 0)).toBe(leverFor(RP_FAMILY, 0.5));
    expect(leverFor(RP_FAMILY, 1)).toBe(leverFor(RP_FAMILY, 0.5));
  });
  it("double-acting air torque curve is flat", () => {
    const pts = torqueCurves({ family: RP_FAMILY, actionType: "double-acting", failPosition: "fail-in-place" }, 5.5);
    const vals = pts.map((p) => p.airStroke);
    expect(Math.max(...vals) - Math.min(...vals)).toBeLessThan(1e-9);
  });
  it("spring return fails closed on supply loss", () => {
    const e = new SimulationEngine({ family: RP_FAMILY, actionType: "spring-return", failPosition: "fail-closed" });
    e.dispatch({ type: "open" });
    run(e, 6);
    expect(e.getState().position).toBe(1);
    e.dispatch({ type: "set-supply", available: false });
    run(e, 6);
    expect(e.getState().position).toBe(0);
  });
  it("double acting holds in place on supply loss", () => {
    const e = new SimulationEngine({ family: RP_FAMILY, actionType: "double-acting" });
    e.dispatch({ type: "open" });
    run(e, 1.2);
    e.dispatch({ type: "set-supply", available: false });
    run(e, 1.5);
    const held = e.getState().position;
    run(e, 4);
    expect(held).toBeGreaterThan(0.05);
    expect(e.getState().position).toBeCloseTo(held, 6);
  });
});
