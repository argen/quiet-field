import { PALETTES } from "./palettes";
import { Rng } from "./rng";
import { STILLS } from "./stills";
import type {
  Band,
  Context,
  FieldPiece,
  Palette,
  Piece,
  SquareLayer,
  Still,
  StillPiece,
} from "./types";

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

export function selectField(ctx: Context, seed: number): FieldPiece {
  const rng = new Rng(seed);
  const palette = rng.pick(candidatePalettes(ctx));
  // About a third of fields are Albers-style nested squares; the rest are
  // Rothko-spirit stacked bands.
  const squares = rng.float() < 0.32;
  return {
    kind: "field",
    seed,
    paletteId: palette.id,
    paletteName: palette.name,
    base: palette.base,
    composition: squares ? "squares" : "bands",
    bands: squares ? [] : composeBands(palette, rng),
    squares: squares ? composeSquares(palette, rng) : [],
    grain: rng.range(0.05, 0.12),
    aspect: squares ? 1 : rng.range(0.72, 0.86),
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
