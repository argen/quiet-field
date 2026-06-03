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

describe("selectField — new color-field archetypes", () => {
  // A wide seed sweep so every archetype (the rarest, "cleave", is ~7%) is hit.
  const sample = Array.from({ length: 600 }, (_, i) => selectField(base, i));
  const first = (c: string) => sample.find((p) => p.composition === c);

  it("Newman 'zips': vertical bands that stay on the canvas", () => {
    const piece = first("zips")!;
    expect(piece).toBeDefined();
    expect(piece.zips.length).toBeGreaterThanOrEqual(1);
    expect(piece.zips.length).toBeLessThanOrEqual(3);
    for (const z of piece.zips) {
      expect(z.width).toBeGreaterThan(0);
      expect(z.left - z.width / 2).toBeGreaterThanOrEqual(-1e-9);
      expect(z.left + z.width / 2).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("Frankenthaler 'veils': on-canvas blooms with real radii", () => {
    const piece = first("veils")!;
    expect(piece).toBeDefined();
    expect(piece.veils.length).toBeGreaterThanOrEqual(2);
    expect(piece.veils.length).toBeLessThanOrEqual(4);
    for (const v of piece.veils) {
      expect(v.rx).toBeGreaterThan(0);
      expect(v.ry).toBeGreaterThan(0);
      expect(v.cx).toBeGreaterThanOrEqual(0);
      expect(v.cx).toBeLessThanOrEqual(1);
      expect(v.cy).toBeGreaterThanOrEqual(0);
      expect(v.cy).toBeLessThanOrEqual(1);
      expect(v.lift).toBeGreaterThan(0);
      expect(v.lift).toBeLessThanOrEqual(1);
    }
  });

  it("Agnes Martin 'grid': thin, ordered, on-canvas ruled lines", () => {
    const piece = first("grid")!;
    expect(piece).toBeDefined();
    expect(piece.grid.length).toBeGreaterThanOrEqual(6);
    let prev = -1;
    for (const g of piece.grid) {
      expect(g.thickness).toBeGreaterThan(0);
      expect(g.thickness).toBeLessThan(0.06); // a line, not a band
      expect(g.pos).toBeGreaterThanOrEqual(0);
      expect(g.pos).toBeLessThanOrEqual(1);
      expect(g.pos).toBeGreaterThan(prev); // sorted top→bottom, no overlap
      prev = g.pos;
    }
  });

  it("Clyfford Still 'cleave': closed polygons, all coords on-canvas", () => {
    const piece = first("cleave")!;
    expect(piece).toBeDefined();
    expect(piece.shards.length).toBeGreaterThanOrEqual(2);
    for (const sh of piece.shards) {
      expect(sh.points.length).toBeGreaterThanOrEqual(3); // a real polygon
      for (const [x, y] of sh.points) {
        expect(x).toBeGreaterThanOrEqual(-1e-9);
        expect(x).toBeLessThanOrEqual(1 + 1e-9);
        expect(y).toBeGreaterThanOrEqual(-1e-9);
        expect(y).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it("only ever populates the active composition's array", () => {
    const arr: Record<string, (p: (typeof sample)[number]) => number> = {
      bands: (p) => p.bands.length,
      squares: (p) => p.squares.length,
      zips: (p) => p.zips.length,
      veils: (p) => p.veils.length,
      grid: (p) => p.grid.length,
      cleave: (p) => p.shards.length,
    };
    for (const p of sample) {
      for (const [comp, count] of Object.entries(arr)) {
        if (comp !== p.composition) expect(count(p)).toBe(0);
      }
    }
  });

  it("keeps 'bands' dominant while every archetype still appears", () => {
    const tally = new Map<string, number>();
    for (const p of sample) tally.set(p.composition, (tally.get(p.composition) ?? 0) + 1);
    for (const c of ["bands", "squares", "zips", "veils", "grid", "cleave"]) {
      expect(tally.get(c) ?? 0).toBeGreaterThan(0); // all six occur
    }
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    expect(top).toBe("bands"); // Rothko stays the signature look
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
