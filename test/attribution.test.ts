import { describe, expect, it } from "vitest";
import { INFLUENCE, fieldAttribution, stillProvenance } from "../src/core/attribution";

const COMPS = ["bands", "squares", "zips", "veils", "grid", "cleave"] as const;

describe("fieldAttribution", () => {
  it("credits a named painter for every composition", () => {
    for (const c of COMPS) {
      expect(INFLUENCE[c]?.length).toBeGreaterThan(0);
      const line = fieldAttribution(c);
      expect(line).toContain(INFLUENCE[c]);
    }
  });

  it("always marks the work as generated, never a reproduction", () => {
    for (const c of COMPS) {
      expect(fieldAttribution(c).toLowerCase()).toContain("generated");
    }
  });
});

describe("stillProvenance", () => {
  it("distinguishes public-domain from in-copyright works", () => {
    expect(stillProvenance("pd").toLowerCase()).toContain("public domain");
    expect(stillProvenance("personal").toLowerCase()).toContain("copyright");
  });
});
