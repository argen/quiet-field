# Quiet Field

Every new tab becomes a calm color field **in the spirit of Rothko** — original,
generated artwork keyed to the time of day. A Manifest V3 Chrome extension that
overrides the new-tab page.

Inspired by [Current Rothko](https://rothko.joonas.wtf/), reworked for the new-tab
context: it must paint **instantly, offline, with no flash**, leave focus in the
address bar, and never trigger a permission prompt.

## What it is (and isn't)

- **Color Fields** are *generated*, not reproductions — no painting is copied, so the
  extension is publishable with a zero-warning install (only `storage`).
- The art reflects the moment: a curated palette register is chosen for the current
  time of day, then a soft-edged, feathered, grained composition is generated from a
  seed (deterministic — the same moment yields the same field).

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:5173/newtab.html  (full HMR; chrome.* is stubbed)
pnpm test       # vitest — the pure core: selection, palettes, clock, rng
pnpm build      # tsc --noEmit && vite build  ->  dist/
```

### Painting images (Abstract + Hopper collections)

The downloaded painting images live in `public/art/stillness/` and are **not
committed** (they're reproducible artifacts; Hopper is also in copyright). The
catalog metadata and the curation sources are committed, so regenerate the
images with:

```bash
node scripts/generate-catalog.mjs   # sources in data/curation/, writes src/core/stills.ts + images
```

The **Fields** collection is fully generated and needs no images, so a fresh
clone works immediately in Fields; Abstract/Hopper need the step above.

### Load the extension

```bash
pnpm build
# chrome://extensions → enable Developer mode → "Load unpacked" → select ./dist
```

### Preview the art (headless)

```bash
pnpm build && pnpm preview --port 4173 &
node scripts/shoot.mjs     # writes /tmp/qf-<time>.png for dawn/noon/dusk/night
```

## Architecture

Pure core, impure shell. `core/selection.ts` and `render/fields.ts` are pure and do
no I/O; `newtab.ts` gathers the moment and calls them, painting synchronously before
any `await`.

```
src/
  newtab.html     critical CSS inlined; base tone from prefers-color-scheme pre-JS
  newtab.ts       impure shell: synchronous paint, then async reconcile
  core/
    rng.ts        seeded PRNG (mulberry32) — determinism
    palettes.ts   hand-curated color registers (the product)
    selection.ts  selectPiece(context, seed) — pure, testable heart
    types.ts
  render/fields.ts  soft-edged field renderer (SVG turbulence + blur + grain)
  context/clock.ts  time-of-day / season / seed — no permission, no network
  ui/overlay.ts     ambient wall label, fades after a beat
  settings.ts/.html plain options page with a live preview
  storage.ts        chrome.storage + synchronous localStorage mirror
```

## Presentation

Both editions are presented like a painting **hung and framed on a gallery wall** (the
default), or **full-bleed**. The color fields are rendered with *present, luminous bodies
and feathered edges* — softness at the rim, not a blur over the whole image — plus a light
hand-painted irregularity and canvas grain.

## Collections

Three selectable collections (settings → Collection):

- **Fields** — generated color-field art, a curated palette per time of day (and weather,
  if enabled). Original, copyright-free, publishable.
- **Abstract** — real **public-domain** abstraction, contextually matched: Kandinsky, Klee,
  Mondrian, Malevich, Hilma af Klint, Sophie Taeuber-Arp, van Doesburg, El Lissitzky,
  Moholy-Nagy, Robert Delaunay, Popova, Čiurlionis, and late (near-abstract) Turner. All
  sourced from Wikimedia Commons; safe to publish.
- **Hopper** — Edward Hopper, shown whole and framed. **Personal/unpacked build only** —
  Hopper is under US copyright (`rights: "personal"`); a publishable build must filter to
  `rights === "pd"`.

Mark Rothko stays as generated **Fields** (his work is in copyright). The catalogue
metadata from the National Gallery of Art's CC0 Rothko gift is kept in
`src/data/nga-rothko.json` for future enrichment.

## Weather (opt-in)

Toggle "Match the weather" in settings: it asks for your location (a one-time permission),
then uses [Open-Meteo](https://open-meteo.com/) (no API key) to pick art that fits the sky
right now, with a `rain · 18°` line and your city in the caption. It runs entirely off the
paint path — the tab paints instantly from a cached reading, then refreshes in the
background and re-paints only if conditions changed.

## Roadmap

- **Done:** Color Fields + Stillness editions, time-of-day + weather matching, framed/full
  presentation, settings, offline, instant paint.
- **Next:** more palette registers and public-domain stills (Hammershøi, Turner) for a
  publishable Stillness edition; matte/border refinements; a "shuffle" / pin control.
