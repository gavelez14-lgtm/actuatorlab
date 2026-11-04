import { describe, expect, it } from "vitest";
import { FAMILY_UI, familyFromType, simulatorHref } from "@/components/sim/familyUi";
import { FAMILY_BEHAVIOR } from "../families";
import type { ActuatorFamilyId } from "../types";

const FAMILIES = Object.keys(FAMILY_UI) as ActuatorFamilyId[];

describe("family UI registry", () => {
  it("covers the same families as the engine registry", () => {
    expect(new Set(FAMILIES)).toEqual(new Set(Object.keys(FAMILY_BEHAVIOR)));
  });
  it("round-trips every menu family through its ?type= URL", () => {
    for (const f of FAMILIES.filter((f) => FAMILY_UI[f].menu)) {
      const href = simulatorHref(f);
      const type = new URL(href, "http://x").searchParams.get("type");
      expect(familyFromType(type), href).toBe(f);
    }
  });
  it("has unique type params and complete fluid supply settings", () => {
    const types = FAMILIES.filter((f) => FAMILY_UI[f].menu).map((f) => FAMILY_UI[f].typeParam);
    expect(new Set(types).size).toBe(types.length);
    for (const f of FAMILIES) if (FAMILY_UI[f].controls === "fluid") expect(FAMILY_UI[f].supply, f).toBeDefined();
  });
  it("falls back to the Scotch yoke for unknown types", () => {
    expect(familyFromType("nonsense")).toBe("pneumatic-scotch-yoke");
    expect(familyFromType(null)).toBe("pneumatic-scotch-yoke");
  });
});

import { SimulationEngine } from "../engine";
import { setupHref } from "@/components/sim/familyUi";
describe("shareable setup links", () => {
  it("encodes family, action, fail, valve, yoke and mode", () => {
    const e = new SimulationEngine({ family: "pneumatic-rack-pinion", actionType: "spring-return", failPosition: "fail-open", valve: "plug" });
    e.dispatch({ type: "set-mode", mode: "engineering" });
    const u = new URL(setupHref(e.getState()), "http://x");
    expect(Object.fromEntries(u.searchParams)).toEqual({ type: "rack-pinion", fail: "open", valve: "plug", mode: "engineering" });
    const y = new SimulationEngine({ actionType: "double-acting", yoke: "canted" });
    expect(setupHref(y.getState())).toBe("/simulator?action=double-acting&yoke=canted");
  });
});
