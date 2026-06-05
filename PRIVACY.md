# Privacy Policy — Quiet Field

_Last updated: 2026-06-05_

Quiet Field is a new-tab extension that paints a generative color field, or shows
a public-domain painting, on each new tab. It is designed to be quiet in every
sense — including with your data.

## The short version

**Quiet Field collects nothing, sends nothing about you anywhere, and has no
servers, analytics, accounts, or tracking of any kind.** Everything it needs to
run lives on your own device.

## What is stored, and where

- **Your settings** (collection, framing, wall-label and weather toggles) are
  stored locally on your device using the browser's extension storage and a
  `localStorage` mirror. They never leave your browser.
- That is the entirety of the data Quiet Field retains.

## Location and weather (optional, off by default)

The "Match the weather" toggle is **opt-in** and **off by default**. Nothing
related to location happens unless you turn it on.

When you turn it on, the extension asks for the `geolocation` permission at that
moment (it is an *optional* permission, so installing the extension never
requests your location). If you grant it:

- Your approximate coordinates are read on your device and sent **directly from
  your browser** to two third-party services to retrieve the current conditions
  and a nearby place name:
  - **Open-Meteo** (`api.open-meteo.com`) — current weather. See
    <https://open-meteo.com/en/terms>.
  - **BigDataCloud** (`api.bigdatacloud.net`) — reverse geocoding (coordinates →
    city name). See <https://www.bigdatacloud.com/privacy-and-cookie-policy>.
- These requests go straight from your browser to those services. Quiet Field
  has no server in between and never receives, stores, or transmits your
  location itself.
- The resulting reading (a coarse condition such as "rain", a temperature, and a
  place name) is cached locally for about 30 minutes so a new tab paints
  instantly. It is not shared with anyone.

You can revoke location access at any time by turning the toggle off, or via your
browser's extension permission settings.

## What Quiet Field does NOT do

- No analytics, telemetry, or usage tracking.
- No advertising, and no selling or sharing of data.
- No accounts, sign-in, or cloud sync.
- No reading or modifying the pages you visit.
- No collection of browsing history, search terms, or the contents of the new
  tab beyond what is described above.

## Permissions, explained

- **`storage`** — saves your settings locally.
- **`geolocation`** (optional) — only requested if you enable weather matching, to
  fetch conditions for your location.
- **Host access to `api.open-meteo.com` and `api.bigdatacloud.net`** (optional) —
  only requested with weather matching, to call those two weather services.

## Contact

Questions or concerns: open an issue at
<https://github.com/argen/quiet-field/issues>.
