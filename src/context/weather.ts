import type { Weather, WeatherKind } from "../core/types";

// Opt-in weather + location. Kept entirely off the critical paint path: the
// shell paints from a synchronous cached reading (if any), then refreshes in
// the background and re-paints only if the weather actually changed.
//
// Uses Open-Meteo (no API key, CORS-enabled) for conditions and BigDataCloud's
// free client endpoint for a city name. In the packaged extension these need
// host permissions + geolocation, requested when the user opts in.

const CACHE_KEY = "qf:weather";
const TTL_MS = 30 * 60 * 1000;
const WEATHER_ORIGINS = [
  "https://api.open-meteo.com/*",
  "https://api.bigdatacloud.net/*",
];

interface Cached {
  weather: Weather;
  ts: number;
}

/** Synchronous best-effort read for the paint path. Never throws, never waits. */
export function cachedWeatherSync(): Weather | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as Cached).weather ?? null;
  } catch {
    return null;
  }
}

function cacheAgeMs(): number {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return Infinity;
    return Date.now() - (JSON.parse(raw) as Cached).ts;
  } catch {
    return Infinity;
  }
}

/** Refresh if stale; returns the current reading (or null if unavailable). */
export async function ensureWeather(): Promise<Weather | null> {
  if (cacheAgeMs() < TTL_MS) return cachedWeatherSync();
  return refreshWeather();
}

export async function refreshWeather(): Promise<Weather | null> {
  const coords = await getCoords();
  if (!coords) return cachedWeatherSync();
  try {
    const weather = await fetchWeather(coords.lat, coords.lon);
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ weather, ts: Date.now() } satisfies Cached),
    );
    return weather;
  } catch {
    return cachedWeatherSync();
  }
}

/**
 * Request location + the weather API hosts. Called from a user gesture.
 *
 * Geolocation is an OPTIONAL permission (so install never warns about location),
 * requested at runtime only when the user opts into weather. We request it
 * together with the CORS-enabled API hosts in a single prompt and return whether
 * the user granted it — the caller reverts the toggle if not. In dev/preview
 * (no extension APIs) the page uses `navigator.geolocation` directly.
 */
export async function requestWeatherAccess(): Promise<boolean> {
  if (typeof chrome === "undefined" || !chrome.permissions?.request) return true;
  try {
    return await chrome.permissions.request({
      permissions: ["geolocation"],
      origins: WEATHER_ORIGINS,
    });
  } catch {
    return false;
  }
}

function getCoords(): Promise<{ lat: number; lon: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(null),
      { maximumAge: TTL_MS, timeout: 8000 },
    );
  });
}

async function fetchWeather(lat: number, lon: number): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,is_day`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const json = (await res.json()) as {
    current: { temperature_2m: number; weather_code: number; is_day: number };
  };
  const cur = json.current;
  const isDay = cur.is_day === 1;
  return {
    kind: mapCode(cur.weather_code),
    temp: Math.round(cur.temperature_2m),
    isDay,
    place: await reverseGeocode(lat, lon).catch(() => undefined),
  };
}

async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<string | undefined> {
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
  );
  if (!res.ok) return undefined;
  const j = (await res.json()) as {
    city?: string;
    locality?: string;
    principalSubdivision?: string;
  };
  return j.city || j.locality || j.principalSubdivision || undefined;
}

// WMO weather interpretation codes → our coarse moods.
function mapCode(code: number): WeatherKind {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "cloudy";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if (code >= 71 && code <= 77) return "snow";
  if (code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  return "cloudy";
}
