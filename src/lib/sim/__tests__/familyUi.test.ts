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
