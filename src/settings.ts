import { EDITIONS } from "./core/catalog";
import { selectPiece } from "./core/selection";
import type { Edition } from "./core/types";
import { clockLabel, seasonFor, seedFor, timeOfDayFor } from "./context/clock";
import { cachedWeatherSync, requestWeatherAccess, refreshWeather } from "./context/weather";
import { present } from "./render/present";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from "./storage";

// Settings page: reflects current settings in the controls, persists on change,
// shows a live preview, and handles the weather opt-in (which needs a location
// permission requested from a user gesture).

const preview = document.getElementById("preview")!;
let settings: Settings = { ...DEFAULT_SETTINGS };

function resolveAsset(path: string): string {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  return `/${path}`;
}

function renderPreview(): void {
  const now = new Date();
  const weather = settings.weather ? cachedWeatherSync() : null;
  const piece = selectPiece(
    {
      timeOfDay: timeOfDayFor(now),
      season: seasonFor(now),
      edition: settings.edition,
      weather: weather?.kind,
    },
    seedFor(now),
  );
  present(preview, piece, {
    framing: settings.framing,
    showCaption: settings.overlay,
    ambient: {
      timeLabel: clockLabel(now),
      placeLabel: weather?.place,
      contextLine: weather ? `${weather.kind} · ${weather.temp}°` : undefined,
    },
    resolveAsset,
    chrome: false,
  });
}

function reflect(): void {
  for (const seg of document.querySelectorAll<HTMLElement>(".seg")) {
    const key = seg.dataset.key as keyof Settings;
    for (const btn of seg.querySelectorAll<HTMLButtonElement>("button")) {
      btn.setAttribute(
        "aria-pressed",
        String(btn.dataset.value === String(settings[key])),
      );
    }
  }
  for (const box of document.querySelectorAll<HTMLInputElement>(
    "input[type=checkbox][data-key]",
  )) {
    const key = box.dataset.key as keyof Settings;
    box.checked = settings[key] === true;
  }
}

async function update(patch: Partial<Settings>): Promise<void> {
  settings = { ...settings, ...patch };
  reflect();
  renderPreview();
  await saveSettings(settings);
}

// Turning weather on needs a location permission; if it's refused, turn it back
// off rather than leave a dead toggle.
async function toggleWeather(on: boolean): Promise<void> {
  if (!on) {
    await update({ weather: false });
    return;
  }
  const granted = await requestWeatherAccess();
  if (!granted) {
    await update({ weather: false });
    return;
  }
  await update({ weather: true });
  await refreshWeather();
  renderPreview();
}

// A publishable build bundles only public-domain editions; drop any picker
// option (and its explanatory copy) for an edition that isn't available.
function pruneEditions(): void {
  const available = new Set<Edition>(EDITIONS);
  for (const btn of document.querySelectorAll<HTMLButtonElement>(
    '.seg[data-key="edition"] button',
  )) {
    if (!available.has(btn.dataset.value as Edition)) btn.remove();
  }
  if (!available.has("hopper")) {
    for (const node of document.querySelectorAll("[data-personal]")) node.remove();
  }
}

function wire(): void {
  for (const seg of document.querySelectorAll<HTMLElement>(".seg")) {
    const key = seg.dataset.key as keyof Settings;
    seg.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
      if (!btn || btn.disabled || !btn.dataset.value) return;
      void update({ [key]: btn.dataset.value } as Partial<Settings>);
    });
  }
  for (const box of document.querySelectorAll<HTMLInputElement>(
    "input[type=checkbox][data-key]",
  )) {
    const key = box.dataset.key as keyof Settings;
    box.addEventListener("change", () => {
      if (key === "weather") void toggleWeather(box.checked);
      else void update({ [key]: box.checked } as Partial<Settings>);
    });
  }
}

async function init(): Promise<void> {
  settings = await loadSettings();
  pruneEditions();
  reflect();
  renderPreview();
  wire();
}

void init();
