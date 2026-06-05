import { describe, expect, it } from "vitest";
import {
  CATALOG,
  EDITIONS,
  availableEditions,
  publishableStills,
} from "../src/core/catalog";
import { STILLS } from "../src/core/stills";

describe("publishableStills", () => {
  it("keeps only public-domain works", () => {
    const pub = publishableStills(STILLS);
    expect(pub.length).toBeGreaterThan(0);
    expect(pub.every((s) => s.rights === "pd")).toBe(true);
  });

  it("drops every in-copyright work", () => {
    const pub = publishableStills(STILLS);
    expect(pub.some((s) => s.rights === "personal")).toBe(false);
    // Sanity: the source catalog actually contains in-copyright work to drop.
    expect(STILLS.some((s) => s.rights === "personal")).toBe(true);
  });

  it("never strips the abstract (public-domain) collection", () => {
    const pub = publishableStills(STILLS);
    expect(pub.some((s) => s.collection === "abstract")).toBe(true);
    expect(pub.some((s) => s.collection === "hopper")).toBe(false);
  });
});

describe("availableEditions", () => {
  it("offers all three collections in a personal build", () => {
    expect(availableEditions(false)).toEqual(["fields", "abstract", "hopper"]);
  });

  it("hides Hopper in a publishable build", () => {
    expect(availableEditions(true)).toEqual(["fields", "abstract"]);
  });
});

describe("build-mode catalog (default test build is not a publish build)", () => {
  it("exposes the full catalog and all editions", () => {
    expect(CATALOG).toEqual(STILLS);
    expect(EDITIONS).toContain("hopper");
  });
});
