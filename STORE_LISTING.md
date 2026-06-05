# Chrome Web Store listing — Quiet Field

Copy-paste source for the Web Store developer dashboard, plus the asset and
review checklist. Not shipped in the extension; kept in-repo so the listing is
versioned alongside the code.

---

## Name

Quiet Field

## Short description (≤ 132 chars)

> Every new tab becomes a calm color field in the spirit of Rothko — original
> generative art, keyed to the time of day.

## Category

Workflow & Planning (or "Fun") — new-tab / aesthetic.

## Single purpose (required by review)

> Quiet Field replaces the new-tab page with a calm, procedurally generated
> color-field artwork (optionally a public-domain painting) chosen to match the
> time of day, and optionally the local weather.

## Detailed description

> Open a new tab and meet a moment of calm.
>
> Quiet Field turns every new tab into an original, procedurally generated
> color field — soft stacked bands in the spirit of Rothko, and five more
> color-field archetypes in the spirit of Albers, Newman, Frankenthaler, Agnes
> Martin, and Clyfford Still. Every piece is generated on your device, so it's
> original and copyright-free, and a fresh one appears each time.
>
> • Instant and offline. It paints on the very first frame — no flash, no
>   network needed, and your cursor stays in the address bar.
> • Contextual. A palette is chosen for the current time of day. Turn on the
>   optional weather match and it tunes the mood to the sky outside.
> • A second collection of real public-domain abstraction — Kandinsky, Klee,
>   Mondrian, Malevich, Hilma af Klint, Turner and more — if you'd rather have
>   paintings than generated fields.
> • Quiet by design. Optional wall-label captions, framed or full-bleed, light
>   and dark aware, reduced-motion aware.
>
> Private by design: no analytics, no accounts, no tracking. Settings stay on
> your device. Location is only ever requested if you turn on weather matching.

## Permission justifications (paste into the dashboard)

- **storage** — Saves your preferences (collection, framing, caption and weather
  toggles) locally on your device. No remote storage.
- **geolocation (optional)** — Requested only when you enable "Match the
  weather", to fetch current conditions for your location. Off by default.
- **Host access — api.open-meteo.com (optional)** — Fetches current weather.
  Requested only with weather matching.
- **Host access — api.bigdatacloud.net (optional)** — Turns coordinates into a
  nearby place name for the caption. Requested only with weather matching.

## Data-use disclosures (Web Store form)

- Does this item collect user data? **Location** — only when the user enables
  weather matching; sent directly to the weather APIs, never to us; not sold,
  not used for tracking, not transferred for purposes unrelated to the single
  purpose. No other categories collected.
- Privacy policy URL: link to `PRIVACY.md` (host it, e.g. the repo's raw URL or
  a GitHub Pages page).

## Asset checklist

- [x] Icon 128×128 (`public/icons/icon-128.png`) — also 16/32/48 in manifest.
- [ ] At least one screenshot, 1280×800 or 640×400 (a new tab; the settings
      panel; a couple of different fields).
- [ ] Small promo tile 440×280 (optional but recommended).
- [ ] Privacy policy hosted at a public URL.

## Pre-submit checklist

- [ ] Build with `pnpm build:publish` (NOT `pnpm build`) — this is the
      public-domain-only build; it prunes the in-copyright Hopper collection and
      verifies none remain.
- [ ] Zip the contents of `dist/` (the files, not the folder) for upload.
- [ ] Confirm `dist/manifest.json` lists `permissions: ["storage"]` and
      `geolocation` under `optional_permissions`.
- [ ] Confirm `dist/art/stillness/` contains no `*hopper*` files.
- [ ] One-time $5 developer registration on the Web Store.
