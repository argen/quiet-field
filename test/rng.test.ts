import { describe, expect, it } from "vitest";
import { hashSeed, mulberry32, Rng } from "../src/core/rng";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produces values in [0, 1)", () => {
    const next = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("diverges for different seeds", () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });
});

describe("Rng", () => {
  it("range stays within bounds", () => {
    const rng = new Rng(99);
    for (let i = 0; i < 500; i++) {
      const v = rng.range(5, 9);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(9);
    }
  });

  it("int is inclusive of both ends", () => {
    const rng = new Rng(42);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) seen.add(rng.int(1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it("pick throws on an empty array", () => {
    expect(() => new Rng(1).pick([])).toThrow();
  });
});

describe("hashSeed", () => {
  it("is stable and order-sensitive", () => {
    expect(hashSeed("dawn")).toEqual(hashSeed("dawn"));
    expect(hashSeed("dawn")).not.toEqual(hashSeed("dusk"));
  });
});
