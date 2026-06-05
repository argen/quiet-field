import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

// Renders the new-tab page for the README hero shot. Fields needs no images and
// paints synchronously, so this works offline against `vite preview` (dist).
// Pin the clock so the result is deterministic; sweep a few seeds and keep the
// first that lands a Rothko-style `bands` composition (the signature look).

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs/screenshot-newtab.png");
const URL_BASE = process.env.QF_PREVIEW ?? "http://localhost:4173";

const ISO = process.argv[2] ?? "2025-11-20T18:45:00"; // dusk — warm registers
const settings = {
  edition: "fields",
  framing: "framed",
  overlay: true,
  weather: false,
};

const browser = await puppeteer.launch({
  args: ["--no-sandbox", "--force-color-profile=srgb"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "dark" },
  ]);
  await page.evaluateOnNewDocument(
    (fixedIso, settingsJson) => {
      const fixed = new Date(fixedIso).getTime();
      const RealDate = Date;
      class MockDate extends RealDate {
        constructor(...a) {
          a.length === 0 ? super(fixed) : super(...a);
        }
        static now() {
          return fixed;
        }
      }
      // eslint-disable-next-line no-global-assign
      Date = MockDate;
      localStorage.setItem("qf:settings", settingsJson);
      localStorage.removeItem("qf:last");
    },
    ISO,
    JSON.stringify(settings),
  );
  await page.goto(`${URL_BASE}/newtab.html`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 700)); // let the fade-in settle
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT });
  console.log(`wrote ${path.relative(ROOT, OUT)} @ ${ISO}`);
} finally {
  await browser.close();
}
