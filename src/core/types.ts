// Shared domain types. Kept dependency-free so both the pure core and the
// renderer can import them without pulling in any I/O.

export type TimeOfDay =
  | "dawn"
  | "morning"
  | "noon"
  | "afternoon"
  | "dusk"
  | "night";

export type Season = "spring" | "summer" | "autumn" | "winter";

export type WeatherKind =
  | "clear"
  | "cloudy"
  | "overcast"
  | "fog"
  | "rain"
  | "storm"
  | "snow";

export type Edition = "fields" | "abstract" | "hopper";

/** Which painting collection a still belongs to. */
export type Collection = "abstract" | "hopper";

/** A reading of the current weather, once the user has opted in. */
export interface Weather {
  kind: WeatherKind;
  /** Degrees Celsius. */
  temp: number;
  isDay: boolean;
  /** City / locality for the wall label, when resolvable. */
  place?: string;
}

/** A curated color register — the soul of the Color Fields edition. */
export interface Palette {
  id: string;
  /** Poetic name, surfaced in the caption. */
  name: string;
  /** Background field the bands float over. */
  base: string;
  /** 2–4 band colors, loosely top→bottom. */
  fields: string[];
  /** Which times of day this register belongs to. */
  timeOfDay: TimeOfDay[];
  /** 0 (dark) … 1 (luminous). */
  brightness: number;
  /** 0 (cold) … 1 (warm). */
  temperature: number;
  /** Optional weather affinities used by the contextual engine. */
  weather?: WeatherKind[];
}

/** The moment the selection engine resolves a piece for. */
export interface Context {
  timeOfDay: TimeOfDay;
  season: Season;
  edition: Edition;
  /** Present only when the user has opted into weather. */
  weather?: WeatherKind;
}

/** One soft-edged band within a field composition. */
export interface Band {
  color: string;
  /** Center position of the band, 0 (top) … 1 (bottom). */
  center: number;
  /** Band height as a fraction of canvas height. */
  height: number;
  /** Edge softness, 0 (crisp-ish) … 1 (deeply feathered). */
  feather: number;
  /** Internal luminosity lift, 0 … 1. */
  lift: number;
  /** Horizontal inset as a fraction of width (asymmetry). */
  inset: number;
}

/** One nested square in a Homage-to-the-Square composition. */
export interface SquareLayer {
  color: string;
  /** Left/top position and side length as fractions of the (square) card. */
  left: number;
  top: number;
  size: number;
  feather: number;
  lift: number;
}

/** A fully-resolved, generated color field. Pure data — no DOM, no I/O. */
export interface FieldPiece {
  kind: "field";
  seed: number;
  paletteId: string;
  paletteName: string;
  base: string;
  /** "bands" = Rothko-spirit stacked fields; "squares" = Albers-spirit homage. */
  composition: "bands" | "squares";
  bands: Band[];
  squares: SquareLayer[];
  /** Film-grain intensity, 0 … 1. */
  grain: number;
  /** Width / height of the painting (portrait < 1; squares = 1). */
  aspect: number;
}

/** A representational painting (the American Stillness edition). */
export interface StillPiece {
  kind: "still";
  id: string;
  src: string;
  title: string;
  year: number | null;
  artist: string;
  /** Width / height of the source image. */
  aspect: number;
}

export type Piece = FieldPiece | StillPiece;

/** One entry in the paintings catalog. */
export interface Still {
  id: string;
  /** Path relative to the extension root, e.g. "art/stillness/nighthawks.jpg". */
  file: string;
  title: string;
  year: number | null;
  artist: string;
  /** Which selectable collection this belongs to. */
  collection: Collection;
  aspect: number;
  /** "pd" = public domain (publishable); "personal" = in-copyright, local only. */
  rights: "pd" | "personal";
  timeOfDay: TimeOfDay[];
  weather?: WeatherKind[];
}
