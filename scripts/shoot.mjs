import puppeteer from "puppeteer";

// Pins clock + settings (via the localStorage mirror) to preview any state.
const SHOTS = [
  { label: "fields-sharp-dusk", iso: "2025-11-20T18:50:00", click: false,
    settings: { edition: "fields", framing: "framed", overlay: true, weather: false } },
  { label: "panel-open", iso: "2025-11-20T18:50:00", click: true,
    settings: { edition: "fields", framing: "framed", overlay: true, weather: false } },
  { label: "still-dusk", iso: "2025-11-20T18:40:00", click: false,
    settings: { edition: "stillness", framing: "framed", overlay: true, weather: false } },
  { label: "still-morning", iso: "2025-11-20T09:20:00", click: false,
    settings: { edition: "stillness", framing: "framed", overlay: true, weather: false } },
  { label: "still-night", iso: "2025-11-20T23:30:00", click: false,
    settings: { edition: "stillness", framing: "framed", overlay: true, weather: false } },
];

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--force-color-profile=srgb"],
});

for (const { iso, label, settings, click } of SHOTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
  await page.evaluateOnNewDocument(
    (fixedIso, settingsJson) => {
      const fixed = new Date(fixedIso).getTime();
      const RealDate = Date;
      class MockDate extends RealDate {
        constructor(...a) { a.length === 0 ? super(fixed) : super(...a); }
        static now() { return fixed; }
      }
      // eslint-disable-next-line no-global-assign
      Date = MockDate;
      localStorage.setItem("qf:settings", settingsJson);
      localStorage.removeItem("qf:last");
    },
    iso,
    JSON.stringify(settings),
  );
  await page.goto("http://localhost:4173/newtab.html", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 500));
  if (click) {
    await page.click(".qf-settings");
    await new Promise((r) => setTimeout(r, 350));
  }
  await page.screenshot({ path: `/tmp/qf-${label}.png` });
  console.log(`shot ${label}`);
  await page.close();
}

await browser.close();
console.log("done");
