import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

// Reads workflow-curated JSON, downloads each painting from Wikimedia Commons,
// drops anything that doesn't resolve to a real image, and emits
// src/core/stills.ts. Also copies NGA Rothko metadata (CC0) into the repo.
//
// Collections:
//   abstract — public-domain abstraction (publishable)
//   hopper   — Edward Hopper (in copyright → rights "personal", local only)

const ROOT = "/Users/bruno/Sites/quiet-field";
const OUT_DIR = path.join(ROOT, "public/art/stillness");
const TIME = ["dawn", "morning", "noon", "afternoon", "dusk", "night"];
const WX = ["clear", "cloudy", "overcast", "fog", "rain", "storm", "snow"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// (file, collection, rights). Missing files are skipped gracefully.
const SOURCES = [
  { file: "data/curation/qf-still-hopper.json", collection: "hopper", rights: "personal" },
  { file: "data/curation/qf-still-hopper2.json", collection: "hopper", rights: "personal" },
  { file: "data/curation/qf-still-turner.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-abs-kandinsky.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-abs-kandinsky2.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-abs-klee.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-abs-klee2.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-abs-mondrian.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-abs-mondrian2.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-abs-malevich.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-abs-malevich2.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-abs-afklint.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-abs-afklint2.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-abs-modern.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-abs-modern2.json", collection: "abstract", rights: "pd" },
  // Atmospheric / proto-abstract public-domain expansion.
  { file: "data/curation/qf-exp-monet.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-exp-whistler.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-exp-marc.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-exp-redon.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-exp-dove.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-exp-giacometti.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-exp-cezanne.json", collection: "abstract", rights: "pd" },
  { file: "data/curation/qf-exp-friedrich.json", collection: "abstract", rights: "pd" },
];

const cleanTags = (arr, allowed) =>
  Array.isArray(arr) ? arr.filter((t) => allowed.includes(t)) : [];
const slug = (s) =>
  String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
// Fetch the ORIGINAL file (served from the CDN, not the thumbnail handler,
// which is aggressively rate-limited) and downscale locally with sips.
const filePathUrl = (filename) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;

function isImage(b) {
  if (b.length < 12) return false;
  if (b[0] === 0xff && b[1] === 0xd8) return true; // jpeg
  if (b[0] === 0x89 && b[1] === 0x50) return true; // png
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return true;
  if (b.toString("ascii", 0, 3) === "GIF") return true;
  return false;
}

async function download(filename, dest) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(filePathUrl(filename), {
        headers: { "User-Agent": "QuietField/0.1 (personal art project; non-commercial)" },
        redirect: "follow",
      });
      if (res.status === 429 || res.status >= 500) {
        // Wikimedia is throttling our IP — wait out the window politely.
        await sleep(12000 + 6000 * attempt);
        continue;
      }
      if (!res.ok) return false;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 6000 || !isImage(buf)) return false;
      const tmp = `${dest}.src`;
      await fs.writeFile(tmp, buf);
      execFileSync(
        "sips",
        ["-s", "format", "jpeg", "-Z", "1000", "-s", "formatOptions", "62", tmp, "--out", dest],
        { stdio: "ignore" },
      );
      await fs.rm(tmp, { force: true });
      return true;
    } catch {
      await sleep(600 * (attempt + 1));
    }
  }
  return false;
}

async function pool(items, n, worker) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await worker(items[idx], idx);
      }
    }),
  );
  return out;
}

// Per-artist cap — keeps the collections varied without bloating the bundle.
const CAP = { hopper: 30, abstract: 16 };
// QF_CACHE_ONLY=1 rebuilds the catalog from already-downloaded images without
// hitting the network (used while Wikimedia is throttling our IP).
const CACHE_ONLY = process.env.QF_CACHE_ONLY === "1";

// ---- gather works -------------------------------------------------------
const ids = new Set();
let works = [];
for (const src of SOURCES) {
  if (!existsSync(src.file)) {
    console.log(`skip (missing): ${src.file}`);
    continue;
  }
  const data = JSON.parse(await fs.readFile(src.file, "utf8"));
  for (const w of data.works) {
    if (!w.filename || !w.width || !w.height) continue;
    const artist = w.artistName || data.artist;
    let id = slug(`${artist}-${w.title || w.id}`);
    while (ids.has(id)) id += "-x";
    ids.add(id);
    const timeOfDay = cleanTags(w.timeOfDay, TIME);
    if (timeOfDay.length === 0) timeOfDay.push("afternoon");
    works.push({
      id,
      filename: w.filename,
      title: w.title,
      year: Number.isFinite(w.year) ? w.year : null,
      artist,
      collection: src.collection,
      rights: src.rights,
      aspect: +(w.width / w.height).toFixed(3),
      timeOfDay,
      weather: cleanTags(w.weather, WX),
    });
  }
}
console.log(`gathered ${works.length} candidate works`);

// Cap per artist, preferring works already downloaded (cache) so re-runs stay
// stable, then by id for determinism.
{
  const byArtist = new Map();
  for (const w of works) {
    if (!byArtist.has(w.artist)) byArtist.set(w.artist, []);
    byArtist.get(w.artist).push(w);
  }
  const capped = [];
  for (const [, list] of byArtist) {
    list.sort((a, b) => {
      const ah = existsSync(path.join(OUT_DIR, `${a.id}.jpg`)) ? 0 : 1;
      const bh = existsSync(path.join(OUT_DIR, `${b.id}.jpg`)) ? 0 : 1;
      return ah - bh || a.id.localeCompare(b.id);
    });
    capped.push(...list.slice(0, CAP[list[0].collection] ?? 12));
  }
  works = capped;
  console.log(`capped to ${works.length} works`);
}

// ---- download (incremental: keep good files, only fetch missing) --------
await fs.mkdir(OUT_DIR, { recursive: true });

let done = 0;
const failed = [];
const results = await pool(works, 1, async (w) => {
  const dest = path.join(OUT_DIR, `${w.id}.jpg`);
  const entry = { ...w, file: `art/stillness/${w.id}.jpg` };
  try {
    const st = await fs.stat(dest);
    if (st.size > 4000) {
      done++;
      return entry; // already have it
    }
  } catch {
    /* not downloaded yet */
  }
  if (CACHE_ONLY) return null; // skip network entirely
  await sleep(1100); // polite single-stream pacing to avoid IP throttling
  const ok = await download(w.filename, dest).catch(() => false);
  process.stdout.write(`\r  processed ${++done}/${works.length}`);
  if (!ok) failed.push(`${w.artist} — ${w.title}`);
  return ok ? entry : null;
});
process.stdout.write("\n");
const stills = results.filter(Boolean);
console.log(`stills: ${stills.length} kept, ${failed.length} dropped`);

// ---- emit stills.ts -----------------------------------------------------
function lit(s) {
  const wx = s.weather.length ? `\n    weather: ${JSON.stringify(s.weather)},` : "";
  return `  {
    id: ${JSON.stringify(s.id)},
    file: ${JSON.stringify(s.file)},
    title: ${JSON.stringify(s.title)},
    year: ${s.year === null ? "null" : s.year},
    artist: ${JSON.stringify(s.artist)},
    collection: ${JSON.stringify(s.collection)},
    rights: ${JSON.stringify(s.rights)},
    aspect: ${s.aspect},
    timeOfDay: ${JSON.stringify(s.timeOfDay)},${wx}
  },`;
}

const order = { abstract: 0, hopper: 1 };
stills.sort(
  (a, b) => order[a.collection] - order[b.collection] || a.artist.localeCompare(b.artist),
);

const body = [];
let header = "";
for (const s of stills) {
  const h = `${s.collection} · ${s.artist}`;
  if (h !== header) {
    header = h;
    body.push(`  // — ${h} ${"—".repeat(Math.max(2, 44 - h.length))}`);
  }
  body.push(lit(s));
}

const stillsTs = `import type { Still } from "./types";

// The paintings catalog. Generated by scripts/generate-catalog.mjs from a
// workflow-curated set sourced from Wikimedia Commons. Each is tagged (by the
// curating agents) with the time of day and weather it belongs to.
//
// COLLECTIONS:
//   abstract — public-domain abstraction; safe to publish.
//   hopper   — Edward Hopper, still under US copyright → rights "personal".
//              For the personal/unpacked build only. A publishable build must
//              filter to rights === "pd".

export const STILLS: readonly Still[] = [
${body.join("\n")}
];

const BY_ID = new Map(STILLS.map((s) => [s.id, s]));

export function stillById(id: string): Still | undefined {
  return BY_ID.get(id);
}
`;
await fs.writeFile(path.join(ROOT, "src/core/stills.ts"), stillsTs);

// ---- NGA Rothko metadata (CC0) -----------------------------------------
if (existsSync("data/curation/qf-nga-rothko.json")) {
  const nga = await fs.readFile("data/curation/qf-nga-rothko.json", "utf8");
  await fs.mkdir(path.join(ROOT, "src/data"), { recursive: true });
  await fs.writeFile(path.join(ROOT, "src/data/nga-rothko.json"), nga);
  try {
    const n = JSON.parse(nga).works?.length ?? 0;
    console.log(`NGA Rothko metadata: ${n} records saved to src/data/nga-rothko.json`);
  } catch {
    console.log("NGA Rothko metadata saved (unparsed).");
  }
}

// ---- report -------------------------------------------------------------
const byCol = {};
for (const s of stills) (byCol[s.collection] ??= new Set()).add(s.artist);
for (const [c, set] of Object.entries(byCol)) {
  console.log(`  ${c}: ${stills.filter((s) => s.collection === c).length} works, ${set.size} artists`);
}
const cov = Object.fromEntries(TIME.map((k) => [k, 0]));
for (const s of stills) for (const k of s.timeOfDay) cov[k]++;
console.log("by time:", TIME.map((k) => `${k}:${cov[k]}`).join("  "));
if (failed.length) console.log("dropped:\n  " + failed.slice(0, 40).join("\n  "));
