import puppeteer from "puppeteer";
const SHOTS = [
  { label: "abstract-1", iso: "2026-06-02T14:00:00", ed: "abstract" },
  { label: "abstract-2", iso: "2026-06-02T11:00:00", ed: "abstract" },
  { label: "hopper-1",   iso: "2026-06-02T15:00:00", ed: "hopper" },
];
const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox","--force-color-profile=srgb"] });
for (const s of SHOTS) {
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 800 });
  await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
  await p.evaluateOnNewDocument((iso, ed) => {
    const f = new Date(iso).getTime(); const R = Date;
    class M extends R { constructor(...a){ a.length===0?super(f):super(...a);} static now(){return f;} }
    globalThis.Date = M;
    localStorage.setItem("qf:settings", JSON.stringify({edition:ed,framing:"framed",overlay:true,weather:false}));
    localStorage.removeItem("qf:last");
  }, s.iso, s.ed);
  try {
    await p.goto("http://localhost:4173/newtab.html", { waitUntil: "load", timeout: 15000 });
    await new Promise(r=>setTimeout(r,1200));
    await p.screenshot({ path: `/tmp/qf-${s.label}.png` });
    console.log("shot", s.label);
  } catch(e){ console.log("FAIL", s.label, e.message); }
  await p.close();
}
await b.close();
console.log("done");
