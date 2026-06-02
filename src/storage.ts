import type { Edition } from "./core/types";

// Settings persistence. chrome.storage.local is the source of truth, but it is
// async — so we mirror settings into localStorage (synchronous) so the very
// first paint can read them without awaiting anything. Outside the extension
// (vite dev) chrome.* is absent and localStorage alone backs everything.

export interface Settings {
  edition: Edition;
  /** "framed" = the painting hung on a wall; "full" = it fills the screen. */
  framing: "framed" | "full";
  /** Show the caption + ambient time/place text. */
  overlay: boolean;
  /** Opt-in weather/location matching. */
  weather: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  edition: "fields",
  framing: "framed",
  overlay: true,
  weather: false,
};

const MIRROR_KEY = "qf:settings";

function hasChromeStorage(): boolean {
  return (
    typeof chrome !== "undefined" &&
    !!chrome.storage &&
    !!chrome.storage.local
  );
}

function coerce(raw: unknown): Settings {
  const s = (raw ?? {}) as Partial<Settings>;
  return {
    edition:
      s.edition === "abstract" || s.edition === "hopper" ? s.edition : "fields",
    framing: s.framing === "full" ? "full" : "framed",
    overlay: s.overlay !== false,
    weather: s.weather === true,
  };
}

/** Synchronous best-effort read for the paint path. Never throws. */
export function loadSettingsSync(): Settings {
  try {
    const raw = localStorage.getItem(MIRROR_KEY);
    if (raw) return coerce(JSON.parse(raw));
  } catch {
    /* ignore — fall through to defaults */
  }
  return { ...DEFAULT_SETTINGS };
}

/** Authoritative async read; refreshes the sync mirror as a side effect. */
export async function loadSettings(): Promise<Settings> {
  if (hasChromeStorage()) {
    const got = await chrome.storage.local.get(MIRROR_KEY);
    const settings = coerce(got[MIRROR_KEY]);
    mirror(settings);
    return settings;
  }
  return loadSettingsSync();
}

export async function saveSettings(settings: Settings): Promise<void> {
  mirror(settings);
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [MIRROR_KEY]: settings });
  }
}

function mirror(settings: Settings): void {
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota/availability errors */
  }
}
