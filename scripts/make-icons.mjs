import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

// Generates the extension icon set from a single source SVG — a small Rothko-in-
// spirit color field: soft stacked bands on a warm dark ground. Reproducible, so
// the icons are a build artifact of this script, not hand-pixels.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/icons");
const SIZES = [16, 32, 48, 128];

// viewBox 0..100. Bands inset from the edges, lower fields heavier (gravity),
// soft edges via a gentle blur — legible even at 16px.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.1"/>
    </filter>
  </defs>
  <rect width="100" height="100" rx="20" fill="#17130d"/>
  <g filter="url(#soft)">
    <rect x="16" y="15" width="68" height="28" rx="2" fill="#8a4a36"/>
    <rect x="16" y="47" width="68" height="20" rx="2" fill="#cf9450"/>
    <rect x="16" y="71" width="68" height="16" rx="2" fill="#33505a"/>
  </g>
</svg>`;

const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await fs.mkdir(OUT, { recursive: true });
  for (const size of SIZES) {
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    const sized = svg.replace(
      "<svg ",
      `<svg width="${size}" height="${size}" `,
    );
    await page.setContent(
      `<!doctype html><html><head><style>*{margin:0;padding:0}html,body{background:transparent}</style></head><body>${sized}</body></html>`,
      { waitUntil: "domcontentloaded" },
    );
    const el = await page.$("svg");
    await el.screenshot({
      path: path.join(OUT, `icon-${size}.png`),
      omitBackground: true,
    });
    console.log(`wrote icons/icon-${size}.png`);
  }
} finally {
  await browser.close();
}
