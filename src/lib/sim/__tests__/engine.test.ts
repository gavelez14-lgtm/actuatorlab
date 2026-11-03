import { describe, expect, it } from "vitest";
import { SimulationEngine } from "../engine";
import { checkGeometry, pinRadiusFromStroke, pinXFromStroke, shaftRotationY, YOKE_OFFSET } from "../geometry";
import { minimumPressureForFullStroke, valvePositionFromStroke } from "../model";

function run(e: SimulationEngine, seconds: number, fps = 60) {
  for (let t = 0; t < seconds; t += 1 / fps) e.advance(1 / fps);
}

describe("geometry", () => {
  it("keeps every part within its constraints through the full stroke", () => {
    expect(checkGeometry()).toEqual([]);
  });
  it("places the pin on the yoke slot line at every stroke", () => {
    for (let i = 0; i <= 10; i++) {
      const s = i / 10;
      const x = pinXFromStroke(s);
      const beta = shaftRotationY(s);
      // yoke arm direction (local -Z rotated by beta about Y)
      const dir = [-Math.sin(beta), -Math.cos(beta)];
      const r = pinRadiusFromStroke(s);
      expect(dir[0] * r).toBeCloseTo(x, 9);
      expect(dir[1] * r).toBeCloseTo(-YOKE_OFFSET, 9);
    }
  });
  it("rotates exactly 90 degrees over the stroke", () => {
    expect(Math.abs(shaftRotationY(1) - shaftRotationY(0))).toBeCloseTo(Math.PI / 2, 9);
  });
});

describe("double-acting", () => {
  it("opens and closes under air pressure", () => {
    const e = new SimulationEngine({ actionType: "double-acting" });
    e.dispatch({ type: "open" });
    run(e, 6);
    expect(e.getState().position).toBe(1);
    e.dispatch({ type: "close" });
    run(e, 6);
    expect(e.getState().position).toBe(0);
  });
  it("stays in place when supply is lost mid-stroke", () => {
    const e = new SimulationEngine({ actionType: "double-acting" });
    e.dispatch({ type: "open" });
    run(e, 1.2);
    e.dispatch({ type: "set-supply", available: false });
    run(e, 1.5); // decelerate
    const held = e.getState().position;
    run(e, 5);
    expect(held).toBeGreaterThan(0.05);
    expect(held).toBeLessThan(0.95);
    expect(e.getState().position).toBeCloseTo(held, 6);
    expect(e.getState().config.failPosition).toBe("fail-in-place");
  });
  it("resumes toward the active command when supply returns", () => {
    const e = new SimulationEngine({ actionType: "double-acting" });
    e.dispatch({ type: "set-supply", available: false });
    e.dispatch({ type: "open" });
    run(e, 3);
    expect(e.getState().position).toBe(0);
    e.dispatch({ type: "set-supply", available: true });
    run(e, 6);
    expect(e.getState().position).toBe(1);
  });
});

describe("spring-return", () => {
  it("fail-closed: returns to closed on supply loss", () => {
    const e = new SimulationEngine({ actionType: "spring-return", failPosition: "fail-closed" });
    e.dispatch({ type: "open" });
    run(e, 6);
    expect(e.getState().position).toBe(1);
    e.dispatch({ type: "set-supply", available: false });
    run(e, 6);
    expect(e.getState().position).toBe(0);
    expect(e.getState().stroke).toBe(0);
  });
  it("fail-open: spring end is the open position", () => {
    const e = new SimulationEngine({ actionType: "spring-return", failPosition: "fail-open" });
    expect(e.getState().position).toBe(1);
    e.dispatch({ type: "close" });
    run(e, 6);
    expect(e.getState().position).toBe(0);
    e.dispatch({ type: "set-supply", available: false });
    run(e, 6);
    expect(e.getState().position).toBe(1);
  });
  it("cannot make the air stroke without supply", () => {
    const e = new SimulationEngine({ actionType: "spring-return" });
    e.dispatch({ type: "set-supply", available: false });
    e.dispatch({ type: "open" });
    run(e, 4);
    expect(e.getState().position).toBe(0);
  });
  it("stalls part-way when pressure is below the illustrative minimum", () => {
    const e = new SimulationEngine({ actionType: "spring-return" });
    const min = minimumPressureForFullStroke(e.getState().config);
    e.dispatch({ type: "set-pressure", bar: min - 0.6 });
    e.dispatch({ type: "open" });
    run(e, 8);
    const s = e.getState();
    expect(s.position).toBeGreaterThan(0);
    expect(s.position).toBeLessThan(1);
    expect(s.stalled).toBe(true);
  });
});

describe("timing", () => {
  it("is frame-rate independent", () => {
    const a = new SimulationEngine({ actionType: "double-acting" });
    const b = new SimulationEngine({ actionType: "double-acting" });
    a.dispatch({ type: "open" });
    b.dispatch({ type: "open" });
    run(a, 1.5, 30);
    run(b, 1.5, 120);
    expect(a.getState().stroke).toBeCloseTo(b.getState().stroke, 1);
  });
  it("pausing freezes position and resuming continues without a jump", () => {
    const e = new SimulationEngine({ actionType: "double-acting" });
    e.dispatch({ type: "open" });
    run(e, 1);
    e.dispatch({ type: "pause" });
    const p = e.getState().stroke;
    run(e, 2);
    expect(e.getState().stroke).toBe(p);
    e.dispatch({ type: "play" });
    e.advance(1 / 60);
    expect(Math.abs(e.getState().stroke - p)).toBeLessThan(0.02);
  });
  it("reverses smoothly mid-stroke", () => {
    const e = new SimulationEngine({ actionType: "double-acting" });
    e.dispatch({ type: "open" });
    run(e, 1.2);
    e.dispatch({ type: "close" });
    let prev = e.getState().stroke;
    for (let i = 0; i < 120; i++) {
      e.advance(1 / 60);
      const cur = e.getState().stroke;
      expect(Math.abs(cur - prev)).toBeLessThan(0.02);
      prev = cur;
    }
  });
  it("maps valve position through the coupling", () => {
    expect(valvePositionFromStroke({ family: "cp", actionType: "spring-return", failPosition: "fail-open" }, 0.25)).toBe(0.75);
  });
});
