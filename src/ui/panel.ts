import { EDITIONS } from "../core/catalog";
import type { Edition } from "../core/types";
import { refreshWeather, requestWeatherAccess } from "../context/weather";
import type { Settings } from "../storage";

// A persistent settings control that opens and closes IN PLACE over the new tab
// (no separate tab to open and then close again). The trigger uses a real cog —
// not the sun-like glyph it replaces.

export interface ChromeOptions {
  settings: Settings;
  /** Persist + repaint. Returns the settings actually applied. */
  onChange: (next: Settings) => void | Promise<void>;
}

const COG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.08A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.08A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.08a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.08a1.65 1.65 0 0 0-1.52 1z"/></svg>`;

const PANEL_HTML = `
  <div class="qf-panel__head">
    <span class="qf-panel__title">Quiet Field</span>
    <button type="button" class="qf-panel__close" aria-label="Close settings">&times;</button>
  </div>
  <div class="qf-panel__row">
    <span>Collection</span>
    <div class="qf-seg" data-key="edition">
      <button type="button" data-value="fields">Fields</button>
      <button type="button" data-value="abstract">Abstract</button>
      <button type="button" data-value="hopper">Hopper</button>
    </div>
  </div>
  <div class="qf-panel__row">
    <span>Framing</span>
    <div class="qf-seg" data-key="framing">
      <button type="button" data-value="framed">Framed</button>
      <button type="button" data-value="full">Full</button>
    </div>
  </div>
  <label class="qf-panel__row">
    <span>Wall label</span>
    <input type="checkbox" data-key="overlay" />
  </label>
  <label class="qf-panel__row">
    <span>Match the weather</span>
    <input type="checkbox" data-key="weather" />
  </label>
  <p class="qf-panel__note">A fresh artwork each new tab.</p>`;

export function mountChrome(root: HTMLElement, opts: ChromeOptions): void {
  let current: Settings = { ...opts.settings };

  const gear = document.createElement("button");
  gear.type = "button";
  gear.className = "qf-settings";
  gear.setAttribute("aria-label", "Settings");
  gear.setAttribute("aria-expanded", "false");
  gear.innerHTML = COG;

  const panel = document.createElement("div");
  panel.className = "qf-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Settings");
  panel.innerHTML = PANEL_HTML;

  // A publishable build only ships public-domain editions; drop the rest.
  const available = new Set<Edition>(EDITIONS);
  for (const btn of panel.querySelectorAll<HTMLButtonElement>(
    '.qf-seg[data-key="edition"] button',
  )) {
    if (!available.has(btn.dataset.value as Edition)) btn.remove();
  }

  root.append(gear, panel);
  const noteEl = panel.querySelector<HTMLElement>(".qf-panel__note")!;
  const DEFAULT_NOTE = noteEl.textContent ?? "";
  const setNote = (t: string): void => {
    noteEl.textContent = t;
  };
  reflect();

  let open = false;
  const setOpen = (v: boolean): void => {
    open = v;
    panel.classList.toggle("qf-panel--open", v);
    gear.setAttribute("aria-expanded", String(v));
    if (v) panel.querySelector<HTMLElement>("button, input")?.focus();
    else gear.focus();
  };

  gear.addEventListener("click", () => setOpen(!open));
  panel
    .querySelector(".qf-panel__close")!
    .addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) setOpen(false);
  });
  document.addEventListener("click", (e) => {
    const t = e.target as Node;
    if (open && !panel.contains(t) && !gear.contains(t)) setOpen(false);
  });

  // Segmented controls.
  for (const seg of panel.querySelectorAll<HTMLElement>(".qf-seg")) {
    const key = seg.dataset.key as keyof Settings;
    seg.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
      if (!btn?.dataset.value) return;
      commit({ [key]: btn.dataset.value } as Partial<Settings>);
    });
  }
  // Checkboxes.
  for (const box of panel.querySelectorAll<HTMLInputElement>(
    "input[type=checkbox][data-key]",
  )) {
    const key = box.dataset.key as keyof Settings;
    box.addEventListener("change", () => {
      if (key === "weather") void toggleWeather(box.checked);
      else commit({ [key]: box.checked } as Partial<Settings>);
    });
  }

  function commit(patch: Partial<Settings>): void {
    current = { ...current, ...patch };
    reflect();
    void opts.onChange(current);
  }

  async function toggleWeather(on: boolean): Promise<void> {
    if (!on) {
      commit({ weather: false });
      setNote(DEFAULT_NOTE);
      return;
    }
    setNote("Requesting your location…");
    const granted = await requestWeatherAccess(); // location + API hosts
    if (!granted) {
      commit({ weather: false }); // reverts the box via reflect()
      setNote("Location access declined — matching the time of day.");
      return;
    }
    commit({ weather: true });
    const reading = await refreshWeather();
    setNote(
      reading
        ? `Matching the weather${reading.place ? ` in ${reading.place}` : ""}.`
        : "Location unavailable — matching the time of day.",
    );
    void opts.onChange(current); // re-pick with the fresh reading
  }

  function reflect(): void {
    for (const seg of panel.querySelectorAll<HTMLElement>(".qf-seg")) {
      const key = seg.dataset.key as keyof Settings;
      for (const btn of seg.querySelectorAll<HTMLButtonElement>("button")) {
        btn.setAttribute(
          "aria-pressed",
          String(btn.dataset.value === String(current[key])),
        );
      }
    }
    for (const box of panel.querySelectorAll<HTMLInputElement>(
      "input[type=checkbox][data-key]",
    )) {
      const key = box.dataset.key as keyof Settings;
      box.checked = current[key] === true;
    }
  }
}
