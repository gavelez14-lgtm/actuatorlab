import { describe, expect, it } from "vitest";
import { SimulationEngine } from "../engine";
import { MULTI_TURN } from "../electric";

const fam = { family: "electric-multi-turn" as const };
const run = (e: SimulationEngine, s: number) => {
  for (let t = 0; t < s; t += 1 / 60) e.advance(1 / 60);
};

describe("electric multi-turn on a rising-stem gate valve", () => {
  it("opens fully on the motor in about the stroke time", () => {
    const e = new SimulationEngine(fam);
    e.dispatch({ type: "open" });
    run(e, MULTI_TURN.strokeTime * 0.5);
    expect(e.getState().position).toBeGreaterThan(0.4);
    expect(e.getState().position).toBeLessThan(0.6);
    run(e, MULTI_TURN.strokeTime);
    expect(e.getState().position).toBe(1);
  });
  it("closes on torque: seats the wedge and stops without a trip", () => {
    const e = new SimulationEngine(fam);
    e.dispatch({ type: "open" });
    run(e, 12);
    e.dispatch({ type: "close" });
    run(e, 14);
    const s = e.getState();
    expect(s.position).toBe(0);
    expect(s.electric.seated).toBe(true);
    expect(s.electric.tripped).toBeNull();
    expect(s.status).toMatch(/Closed on torque/);
  });
  it("closes on the position limit when torque seating is off", () => {
    const e = new SimulationEngine(fam);
    e.dispatch({ type: "set-close-on-torque", value: false });
    e.dispatch({ type: "open" });
    run(e, 12);
    e.dispatch({ type: "close" });
    run(e, 14);
    expect(e.getState().position).toBe(0);
    expect(e.getState().electric.seated).toBe(false);
    expect(e.getState().status).toMatch(/position limit/);
  });
  it("a motor command automatically disengages hand drive", () => {
    const e = new SimulationEngine(fam);
    e.dispatch({ type: "set-hand", value: true });
    e.dispatch({ type: "open" });
    expect(e.getState().electric.handMode).toBe(false);
    run(e, 3);
    expect(e.getState().position).toBeGreaterThan(0.2);
  });
  it("fails in place on power loss", () => {
    const e = new SimulationEngine(fam);
    e.dispatch({ type: "open" });
    run(e, 4);
    e.dispatch({ type: "set-supply", available: false });
    run(e, 0.5);
    const held = e.getState().position;
    run(e, 4);
    expect(e.getState().position).toBeCloseTo(held, 6);
  });
});

import { checkMultiTurnGeometry, MT_LIFT, mtGateCentreY } from "../multiTurnGeometry";
describe("multi-turn geometry", () => {
  it("gate, stem and cover tube stay consistent through the stroke", () => {
    expect(checkMultiTurnGeometry()).toEqual([]);
  });
  it("gate lift equals output turns x lead", () => {
    expect(mtGateCentreY(1) - mtGateCentreY(0)).toBeCloseTo(MT_LIFT, 9);
  });
});

describe("frame-rate independence of electric events", () => {
  it("still seats on torque at 4 frames per second", () => {
    const e = new SimulationEngine({ family: "electric-multi-turn" });
    e.dispatch({ type: "open" });
    for (let t = 0; t < 12; t += 0.25) e.advance(0.25);
    e.dispatch({ type: "close" });
    for (let t = 0; t < 14; t += 0.25) e.advance(0.25);
    expect(e.getState().electric.seated).toBe(true);
  });
  it("still trips at the jam at 4 frames per second", () => {
    const e = new SimulationEngine({ family: "electric-part-turn" });
    e.dispatch({ type: "set-obstruction", value: true });
    e.dispatch({ type: "open" });
    for (let t = 0; t < 10; t += 0.25) e.advance(0.25);
    expect(e.getState().electric.tripped).toBe("opening");
    expect(e.getState().position).toBeLessThan(0.63);
  });
});
