import { PALETTES } from "./palettes";
import { Rng } from "./rng";
import { STILLS } from "./stills";
import type {
  Band,
  Context,
  FieldPiece,
  GridLine,
  Palette,
  Piece,
  Shard,
  SquareLayer,
  Still,
  StillPiece,
  Veil,
  Zip,
} from "./types";

type Composition = FieldPiece["composition"];

// The contextual heart of the app. PURE: given a moment and a seed it always
// resolves the same piece, with zero I/O. The impure shell (newtab.ts) gathers
// the context and seed and calls this.

/** Palettes that belong to this moment, narrowing by weather when present. */
export function candidatePalettes(ctx: Context): Palette[] {
  return narrow(PALETTES, ctx);
}

/** Stills in the chosen collection that belong to this moment. */
export function candidateStills(ctx: Context): Still[] {
  const collection = ctx.edition === "hopper" ? "hopper" : "abstract";
  const inCollection = STILLS.filter((s) => s.collection === collection);
  return narrow(inCollection, ctx);
}

/** Resolve one concrete, renderable piece for the moment and edition. */
export function selectPiece(ctx: Context, seed: number): Piece {
  return ctx.edition === "fields"
    ? selectField(ctx, seed)
    : selectStill(ctx, seed);
}

// The composition mix. Each archetype is in the spirit of a color-field
// painter; "bands" (Rothko) stays the signature look, the rest are a supporting
// cast that keeps the wall varied without ever feeling busy.
const COMPOSITION_WEIGHTS: readonly [Composition, number][] = [
  ["bands", 0.42], // Rothko — stacked soft fields (dominant)
  ["veils", 0.16], // Frankenthaler / Louis — poured blooms
  ["grid", 0.14], // Agnes Martin — pale ruled lines
  ["zips", 0.12], // Newman — vertical zips on a flat field
  ["squares", 0.09], // Albers — nested homage squares
  ["cleave", 0.07], // Clyfford Still — ragged vertical tears
];

function pickWeighted<T>(rng: Rng, entries: readonly [T, number][]): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng.float() * total;
  for (const [item, w] of entries) {
    r -= w;
    if (r < 0) return item;
  }
  return entries[entries.length - 1]![0];
}

function aspectFor(comp: Composition, rng: Rng): number {
  switch (comp) {
    case "squares":
    case "grid":
      return 1; // square canvas (Albers / Martin)
    case "veils":
      return rng.range(0.92, 1.08);
    case "zips":
      return rng.range(0.9, 1.15); // Newman canvases run wide
    case "cleave":
      return rng.range(0.78, 0.9);
    default: // bands
      return rng.range(0.72, 0.86); // portrait
  }
}

export function selectField(ctx: Context, seed: number): FieldPiece {
  const rng = new Rng(seed);
  const palette = rng.pick(candidatePalettes(ctx));
  const composition = pickWeighted(rng, COMPOSITION_WEIGHTS);
  return {
    kind: "field",
    seed,
    paletteId: palette.id,
    paletteName: palette.name,
    base: palette.base,
    composition,
    // Exactly one payload is populated; the rest stay empty.
    bands: composition === "bands" ? composeBands(palette, rng) : [],
    squares: composition === "squares" ? composeSquares(palette, rng) : [],
    zips: composition === "zips" ? composeZips(palette, rng) : [],
    veils: composition === "veils" ? composeVeils(palette, rng) : [],
    grid: composition === "grid" ? composeGrid(palette, rng) : [],
    shards: composition === "cleave" ? composeCleave(palette, rng) : [],
    grain: rng.range(0.05, 0.12),
    aspect: aspectFor(composition, rng),
  };
}

export function selectStill(ctx: Context, seed: number): StillPiece {
  const rng = new Rng(seed);
  const still = rng.pick(candidateStills(ctx));
  return {
    kind: "still",
    id: still.id,
    src: still.file, // resolved to an absolute URL by the shell
    title: still.title,
    year: still.year,
    artist: still.artist,
    rights: still.rights,
    aspect: still.aspect,
  };
}

interface Taggable {
  timeOfDay: Context["timeOfDay"][];
  weather?: NonNullable<Context["weather"]>[];
}

// Smallest pool we'll narrow down to. Below this, contextual matching is
// dropped in favour of variety — otherwise a thinly-tagged moment (e.g. a
// collection with only one "dawn" painting) repeats the same work on every
// refresh.
const MIN_POOL = 5;

// Narrow a tagged collection to the moment: by time of day, then by weather
// when the user has opted in — but only commit to a narrower pool while it
// still offers real variety. Never collapses to empty.
function narrow<T extends Taggable>(items: readonly T[], ctx: Context): T[] {
  const all = [...items];
  const byTime = all.filter((it) => it.timeOfDay.includes(ctx.timeOfDay));
  // Keep the time-matched pool only if it's varied enough; else use everything.
  let pool = byTime.length >= Math.min(MIN_POOL, all.length) ? byTime : all;
  if (ctx.weather) {
    const byWeather = pool.filter((it) => it.weather?.includes(ctx.weather!));
    if (byWeather.length >= Math.min(MIN_POOL, pool.length)) pool = byWeather;
  }
  return pool;
}

// Stacked, soft-edged bands with Rothko's gravity: generous margins, a heavier
// lower field, slight asymmetry — never perfectly centered.
function composeBands(palette: Palette, rng: Rng): Band[] {
  const colors = palette.fields;
  const n = colors.length;

  const topMargin = rng.range(0.1, 0.16);
  const bottomMargin = rng.range(0.1, 0.15);
  const gap = rng.range(0.025, 0.05);
  const available = 1 - topMargin - bottomMargin - gap * (n - 1);

  // Lower bands carry more visual weight (gravity).
  const weights = colors.map((_, i) => rng.range(0.85, 1.15) * (1 + i * 0.28));
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const bands: Band[] = [];
  let y = topMargin;
  for (let i = 0; i < n; i++) {
    const height = (available * weights[i]!) / weightSum;
    bands.push({
      color: colors[i]!,
      center: y + height / 2,
      height,
      feather: rng.range(0.4, 0.8),
      lift: rng.range(0.12, 0.4),
      inset: rng.range(0.06, 0.12),
    });
    y += height + gap;
  }
  return bands;
}

// Albers "Homage to the Square": nested flat squares that sit slightly low
// (smaller bottom margin than top), on the palette's base as ground.
function composeSquares(palette: Palette, rng: Rng): SquareLayer[] {
  const colors = palette.fields.slice(0, 4);
  const n = colors.length;
  const g0 = rng.range(0.05, 0.09);
  const maxStep = (0.4 - g0) / Math.max(1, n - 1);
  const step = Math.min(rng.range(0.08, 0.13), maxStep);
  const bottomFactor = rng.range(0.45, 0.7); // < 1 → squares sit low

  const layers: SquareLayer[] = [];
  for (let i = 0; i < n; i++) {
    const side = g0 + i * step;
    const size = 1 - 2 * side;
    const bottom = side * bottomFactor;
    layers.push({
      color: colors[i]!,
      left: side,
      top: 1 - bottom - size,
      size,
      feather: rng.range(0.15, 0.4),
      lift: rng.range(0.05, 0.22),
    });
  }
  return layers;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Newman "zips": a flat ground (the palette base) crossed by one to three thin
// vertical bands. Monumental, calm, and very legible behind caption text.
function composeZips(palette: Palette, rng: Rng): Zip[] {
  const colors = palette.fields;
  const n = rng.int(1, 3);
  const zips: Zip[] = [];
  for (let i = 0; i < n; i++) {
    const width = rng.range(0.015, 0.06);
    zips.push({
      color: colors[i % colors.length]!,
      left: rng.range(0.12 + width / 2, 0.88 - width / 2),
      width,
      feather: rng.range(0.2, 0.6),
      lift: rng.range(0.1, 0.35),
    });
  }
  return zips;
}

// Frankenthaler / Morris Louis "veils": a few large, overlapping soak-stain
// blooms that bleed into the ground. Self-feathering radial bodies — softness
// in the shape, never a blur over the whole field.
function composeVeils(palette: Palette, rng: Rng): Veil[] {
  const colors = palette.fields;
  const n = rng.int(2, 4);
  const veils: Veil[] = [];
  for (let i = 0; i < n; i++) {
    veils.push({
      color: rng.pick(colors),
      cx: rng.range(0.28, 0.72),
      cy: rng.range(0.3, 0.72),
      rx: rng.range(0.28, 0.5),
      ry: rng.range(0.3, 0.52),
      lift: rng.range(0.45, 0.8),
    });
  }
  return veils;
}

// Agnes Martin "grid": many evenly-spaced, close-valued horizontal lines on a
// pale ground — the quietest register. Lines alternate between the palette's
// tones so the surface shimmers faintly rather than reading as ruled paper.
function composeGrid(palette: Palette, rng: Rng): GridLine[] {
  const colors = palette.fields;
  const n = rng.int(8, 16);
  const top = rng.range(0.1, 0.16);
  const bottom = rng.range(0.1, 0.16);
  const gap = (1 - top - bottom) / (n - 1);
  const lines: GridLine[] = [];
  for (let i = 0; i < n; i++) {
    lines.push({
      pos: top + i * gap,
      thickness: rng.range(0.004, 0.012),
      color: colors[i % colors.length]!,
    });
  }
  return lines;
}

// Clyfford Still "cleave": ragged vertical tears of color. The canvas is split
// into a few slabs by jagged vertical seams; the outer edges stay straight, the
// interior seams tear. The renderer adds organic wobble via displacement.
function composeCleave(palette: Palette, rng: Rng): Shard[] {
  const colors = palette.fields;
  const n = rng.int(3, 5);
  const rows = 5; // vertical resolution of each torn seam
  // n+1 seams, including the straight left (x=0) and right (x=1) edges.
  const seams: number[][] = [];
  for (let s = 0; s <= n; s++) {
    const baseX = s / n;
    const col: number[] = [];
    for (let r = 0; r <= rows; r++) {
      if (s === 0) col.push(0);
      else if (s === n) col.push(1);
      else col.push(clamp(baseX + rng.range(-0.08, 0.08), 0.04, 0.96));
    }
    seams.push(col);
  }
  const shards: Shard[] = [];
  for (let s = 0; s < n; s++) {
    const left = seams[s]!;
    const right = seams[s + 1]!;
    const points: [number, number][] = [];
    for (let r = 0; r <= rows; r++) points.push([right[r]!, r / rows]); // right edge, down
    for (let r = rows; r >= 0; r--) points.push([left[r]!, r / rows]); // left edge, up
    shards.push({ color: colors[s % colors.length]!, points });
  }
  return shards;
}
