import { describe, expect, it } from "vitest";
import {
  candidatePalettes,
  candidateStills,
  selectField,
  selectPiece,
  selectStill,
} from "../src/core/selection";
import { PALETTES } from "../src/core/palettes";
import { STILLS } from "../src/core/stills";
import type { Context } from "../src/core/types";

const base: Context = {
  timeOfDay: "night",
  season: "winter",
  edition: "fields",
};

describe("candidatePalettes", () => {
  it("narrows to the current time of day", () => {
    const got = candidatePalettes(base);
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((p) => p.timeOfDay.includes("night"))).toBe(true);
  });

  it("narrows by weather only while the pool stays varied", () => {
    const night = PALETTES.filter((p) => p.timeOfDay.includes("night"));
    const snowNight = night.filter((p) => p.weather?.includes("snow"));
    const got = candidatePalettes({ ...base, weather: "snow" });
    if (snowNight.length >= 5) {
      // Enough snow-night registers → contextual match holds.
      expect(got.every((p) => p.weather?.includes("snow"))).toBe(true);
    } else {
      // Too few → variety is preserved rather than collapsing to one mood.
      expect(got.length).toBeGreaterThan(snowNight.length);
    }
  });

  it("falls back to the time pool when no palette matches the weather", () => {
    const got = candidatePalettes({ ...base, weather: "rain" });
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((p) => p.timeOfDay.includes("night"))).toBe(true);
  });

  it("never returns an empty pool for any time of day", () => {
    for (const t of [
      "dawn",
      "morning",
      "noon",
      "afternoon",
      "dusk",
      "night",
    ] as const) {
      expect(candidatePalettes({ ...base, timeOfDay: t }).length).toBeGreaterThan(0);
    }
  });
});

describe("selectField", () => {
  it("is deterministic for the same context and seed", () => {
    expect(selectField(base, 777)).toEqual(selectField(base, 777));
  });

  it("can vary with the seed", () => {
    const ids = new Set(
      Array.from({ length: 20 }, (_, i) => selectField(base, i * 101).paletteId),
    );
    expect(ids.size).toBeGreaterThan(1);
  });

  it("only draws from this moment's candidate palettes", () => {
    const allowed = new Set(candidatePalettes(base).map((p) => p.id));
    for (let i = 0; i < 50; i++) {
      expect(allowed.has(selectField(base, i).paletteId)).toBe(true);
    }
  });

  const fields = Array.from({ length: 60 }, (_, i) => selectField(base, i));

  it("produces a sane band composition", () => {
    const piece = fields.find((p) => p.composition === "bands")!;
    expect(piece).toBeDefined();
    const palette = PALETTES.find((p) => p.id === piece.paletteId)!;
    expect(piece.bands.length).toBe(palette.fields.length);
    for (const b of piece.bands) {
      expect(b.height).toBeGreaterThan(0);
      // Bands float within the margins — they never touch the canvas edge.
      expect(b.center - b.height / 2).toBeGreaterThanOrEqual(0.1 - 1e-9);
      expect(b.center + b.height / 2).toBeLessThanOrEqual(0.9 + 1e-9);
      expect(palette.fields).toContain(b.color);
    }
    expect(piece.grain).toBeGreaterThan(0);
    expect(piece.aspect).toBeGreaterThan(0.6);
    expect(piece.aspect).toBeLessThan(1); // portrait
  });

  it("produces a sane Albers-square composition", () => {
    const piece = fields.find((p) => p.composition === "squares")!;
    expect(piece).toBeDefined();
    expect(piece.aspect).toBe(1); // square canvas
    expect(piece.squares.length).toBeGreaterThanOrEqual(2);
    for (const s of piece.squares) {
      expect(s.size).toBeGreaterThan(0);
      expect(s.left).toBeGreaterThanOrEqual(0);
      expect(s.left + s.size).toBeLessThanOrEqual(1 + 1e-9);
      expect(s.top).toBeGreaterThanOrEqual(0);
      expect(s.top + s.size).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

describe("paintings collections", () => {
  const times = ["dawn", "morning", "noon", "afternoon", "dusk", "night"] as const;
  const ctx = (edition: Context["edition"], t: Context["timeOfDay"]): Context => ({
    ...base,
    edition,
    timeOfDay: t,
  });
  const populated = (edition: Context["edition"]) =>
    times.find((t) => candidateStills(ctx(edition, t)).length > 0);

  it("candidateStills only returns the chosen collection", () => {
    for (const ed of ["abstract", "hopper"] as const) {
      for (const t of times) {
        const want = ed === "hopper" ? "hopper" : "abstract";
        for (const s of candidateStills(ctx(ed, t))) expect(s.collection).toBe(want);
      }
    }
  });

  it("never collapses to one work — variety on refresh at every time of day", () => {
    for (const ed of ["abstract", "hopper"] as const) {
      const collection = ed === "hopper" ? "hopper" : "abstract";
      const size = STILLS.filter((s) => s.collection === collection).length;
      for (const t of times) {
        // Even a thinly-tagged moment must offer real choice to rotate through.
        expect(candidateStills(ctx(ed, t)).length).toBeGreaterThanOrEqual(
          Math.min(5, size),
        );
      }
    }
  });

  it("selectStill stays in collection, is deterministic, carries metadata", () => {
    for (const ed of ["abstract", "hopper"] as const) {
      const t = populated(ed);
      expect(t).toBeDefined();
      const c = ctx(ed, t!);
      const allowed = new Set(candidateStills(c).map((s) => s.id));
      const a = selectStill(c, 7);
      expect(a).toEqual(selectStill(c, 7));
      expect(allowed.has(a.id)).toBe(true);
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.artist.length).toBeGreaterThan(0);
      expect(a.src).toMatch(/art\/stillness\//);
    }
  });

  it("selectPiece routes by edition", () => {
    expect(selectPiece(ctx("fields", "night"), 1).kind).toBe("field");
    const t = populated("abstract")!;
    expect(selectPiece(ctx("abstract", t), 1).kind).toBe("still");
  });
});
