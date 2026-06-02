import { selectPiece } from "./core/selection";
import type { Context, Piece, Weather } from "./core/types";
import { clockLabel, seasonFor, timeOfDayFor } from "./context/clock";
import { cachedWeatherSync, ensureWeather } from "./context/weather";
import { present, type AmbientText } from "./render/present";
import { mountChrome } from "./ui/panel";
import { loadSettings, loadSettingsSync, saveSettings } from "./storage";

// Impure shell. Paints synchronously from sources available without awaiting
// (clock, the settings mirror, the cached weather reading), then reconciles
// asynchronously. A FRESH artwork is chosen on every new tab.

const app = document.getElementById("app")!;
const stageRoot = document.createElement("div");
stageRoot.id = "qf-stage-root";
const chromeRoot = document.createElement("div");
app.append(stageRoot, chromeRoot);

const now = new Date();
let settings = loadSettingsSync();
let weather: Weather | null = settings.weather ? cachedWeatherSync() : null;

function resolveAsset(path: string): string {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  return `/${path}`;
}

function contextFor(): Context {
  return {
    timeOfDay: timeOfDayFor(now),
    season: seasonFor(now),
    edition: settings.edition,
    weather: settings.weather ? weather?.kind : undefined,
  };
}

function ambientFor(): AmbientText {
  const w = settings.weather ? weather : null;
  return {
    timeLabel: clockLabel(now),
    placeLabel: w?.place,
    contextLine: w ? `${w.kind} · ${w.temp}°` : undefined,
  };
}

function pieceId(p: Piece): string {
  return p.kind === "field" ? p.paletteId : p.id;
}

// A different piece on each tab. We roll a fresh random seed and avoid showing
// the same work twice in a row.
function rollSeed(): number {
  const last = (() => {
    try {
      return localStorage.getItem("qf:last");
    } catch {
      return null;
    }
  })();
  let seed = 0;
  for (let i = 0; i < 10; i++) {
    seed = (Math.random() * 0x100000000) >>> 0;
    if (pieceId(selectPiece(contextFor(), seed)) !== last) break;
  }
  return seed;
}

let seed = rollSeed();

function paint(): void {
  const piece = selectPiece(contextFor(), seed);
  try {
    localStorage.setItem("qf:last", pieceId(piece));
  } catch {
    /* ignore */
  }
  present(stageRoot, piece, {
    framing: settings.framing,
    showCaption: settings.overlay,
    ambient: ambientFor(),
    resolveAsset,
  });
}

// 1) Synchronous first paint — zero network, zero async storage.
paint();

// Settings panel (opens/closes in place); repaints on change.
mountChrome(chromeRoot, {
  settings,
  onChange: (next) => {
    settings = next;
    paint();
    void saveSettings(next);
  },
});

// 2) Reconcile with authoritative settings, then refresh weather off the paint
//    path; re-paint on a real change.
loadSettings().then(async (authoritative) => {
  const changed =
    authoritative.edition !== settings.edition ||
    authoritative.framing !== settings.framing ||
    authoritative.overlay !== settings.overlay ||
    authoritative.weather !== settings.weather;
  settings = authoritative;
  if (changed) {
    seed = rollSeed();
    paint();
  }

  if (settings.weather) {
    const fresh = await ensureWeather();
    if (fresh && (fresh.kind !== weather?.kind || fresh.place !== weather?.place)) {
      weather = fresh;
      paint();
    }
  }
});
