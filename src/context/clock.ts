import type { Season, TimeOfDay } from "../core/types";

// Time-of-day and season from the local clock. No permission, no network —
// always available, always on the fast path.

export function timeOfDayFor(date: Date): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 11) return "morning";
  if (h >= 11 && h < 14) return "noon";
  if (h >= 14 && h < 17) return "afternoon";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

// Meteorological seasons, northern hemisphere. Good enough for palette mood;
// hemisphere correction can ride in with the (opt-in) location layer later.
export function seasonFor(date: Date): Season {
  const m = date.getMonth(); // 0 = Jan
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

/**
 * A seed bucketed to the current ~20-minute slot, so a single piece persists
 * for a while (every new tab in that window shows the same painting) and then
 * gently rotates. Combined with the date it never repeats day to day.
 */
export function seedFor(date: Date): number {
  const slot = Math.floor(date.getMinutes() / 20);
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${slot}`;
  // Cheap string hash inlined to avoid importing the core from the clock.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Human time for the wall label, e.g. "6:41 a.m." */
export function clockLabel(date: Date): string {
  let h = date.getHours();
  const m = date.getMinutes();
  const suffix = h < 12 ? "a.m." : "p.m.";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")} ${suffix}`;
}
