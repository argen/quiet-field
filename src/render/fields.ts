import type { FieldPiece } from "../core/types";

// Renders a generated color field into a painting card. The fields are PRESENT
// — solid, luminous bodies — with softness only at the *edges*, the way a real
// Rothko has feathered boundaries but a glowing, opaque centre. (An earlier
// version blurred the whole composition and read as out-of-focus; this masks
// the edges instead and keeps a light hand-painted irregularity.)
//
// Pure given the piece. Knows nothing about time, weather, storage, framing.

const SVG_NS = "http://www.w3.org/2000/svg";

export function renderFieldInto(card: HTMLElement, piece: FieldPiece): void {
  card.style.background = piece.base;

  const edgeId = `qf-edge-${piece.seed.toString(36)}`;
  const grainId = `qf-grain-${piece.seed.toString(36)}`;
  card.appendChild(buildFilters(piece, edgeId, grainId));

  if (piece.composition === "squares") {
    renderSquares(card, piece);
  } else {
    renderBands(card, piece, edgeId);
  }

  // Canvas tooth — fine grain that unifies the surface and kills banding.
  const grain = document.createElement("div");
  grain.className = "qf-grain";
  grain.style.opacity = String(piece.grain);
  grain.style.filter = `url(#${grainId})`;
  card.appendChild(grain);
}

// Soft-edged feather mask (vertical + horizontal), intersected — a solid body
// with a narrow dissolving rim.
function featherMask(el: HTMLElement, fv: number, fh: number): void {
  const v = `linear-gradient(to bottom, transparent 0%, #000 ${fv}%, #000 ${100 - fv}%, transparent 100%)`;
  const h = `linear-gradient(to right, transparent 0%, #000 ${fh}%, #000 ${100 - fh}%, transparent 100%)`;
  el.style.webkitMaskImage = `${v}, ${h}`;
  el.style.maskImage = `${v}, ${h}`;
  el.style.maskComposite = "intersect";
  (el.style as CSSStyleDeclaration & { webkitMaskComposite?: string }).webkitMaskComposite =
    "source-in";
}

function renderBands(card: HTMLElement, piece: FieldPiece, edgeId: string): void {
  // A wrapper carries the subtle displacement so band edges look brushed and
  // irregular rather than ruler-straight.
  const wrap = document.createElement("div");
  wrap.className = "qf-fieldwrap";
  wrap.style.filter = `url(#${edgeId})`;

  for (const band of piece.bands) {
    const el = document.createElement("div");
    el.className = "qf-band";
    el.style.top = `${(band.center - band.height / 2) * 100}%`;
    el.style.height = `${band.height * 100}%`;
    el.style.left = `${band.inset * 100}%`;
    el.style.right = `${band.inset * 100}%`;
    const glow = (band.lift * 0.14).toFixed(3);
    el.style.background = `radial-gradient(72% 82% at 50% 42%, rgba(255,255,255,${glow}) 0%, rgba(255,255,255,0) 72%), ${band.color}`;
    featherMask(el, +(1.5 + band.feather * 4).toFixed(1), +(1 + band.feather * 2.5).toFixed(1));
    wrap.appendChild(el);
  }
  card.appendChild(wrap);
}

// Albers homage — nested flat squares, crisp edges (only a whisper of feather).
function renderSquares(card: HTMLElement, piece: FieldPiece): void {
  const wrap = document.createElement("div");
  wrap.className = "qf-fieldwrap";
  for (const sq of piece.squares) {
    const el = document.createElement("div");
    el.className = "qf-square";
    el.style.left = `${sq.left * 100}%`;
    el.style.top = `${sq.top * 100}%`;
    el.style.width = `${sq.size * 100}%`;
    el.style.height = `${sq.size * 100}%`;
    const glow = (sq.lift * 0.1).toFixed(3);
    el.style.background = `radial-gradient(80% 80% at 50% 45%, rgba(255,255,255,${glow}) 0%, rgba(255,255,255,0) 78%), ${sq.color}`;
    const f = +(0.8 + sq.feather * 2.2).toFixed(1);
    featherMask(el, f, f);
    wrap.appendChild(el);
  }
  card.appendChild(wrap);
}

function buildFilters(
  piece: FieldPiece,
  edgeId: string,
  grainId: string,
): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "qf-defs");
  svg.setAttribute("aria-hidden", "true");
  const defs = document.createElementNS(SVG_NS, "defs");

  // Edge filter: gentle wobble + a whisper of blur. Low scale — just enough to
  // break the straight edge, not enough to soften the whole field.
  const edge = filter(edgeId, "-12%", "-12%", "124%", "124%");
  edge.appendChild(
    turbulence({
      type: "fractalNoise",
      baseFrequency: "0.013 0.021",
      numOctaves: "2",
      seed: String(piece.seed % 1000),
      result: "n",
    }),
  );
  const disp = document.createElementNS(SVG_NS, "feDisplacementMap");
  setAttrs(disp, {
    in: "SourceGraphic",
    in2: "n",
    scale: "7", // just enough to break the ruler-straight edge
    xChannelSelector: "R",
    yChannelSelector: "G",
    result: "d",
  });
  edge.appendChild(disp);
  const blur = document.createElementNS(SVG_NS, "feGaussianBlur");
  setAttrs(blur, { in: "d", stdDeviation: "0.5" });
  edge.appendChild(blur);
  defs.appendChild(edge);

  // Grain filter: fine, desaturated fractal noise.
  const grain = filter(grainId, "0%", "0%", "100%", "100%");
  grain.appendChild(
    turbulence({
      type: "fractalNoise",
      baseFrequency: "0.85",
      numOctaves: "2",
      stitchTiles: "stitch",
    }),
  );
  const cm = document.createElementNS(SVG_NS, "feColorMatrix");
  setAttrs(cm, { type: "saturate", values: "0" });
  grain.appendChild(cm);
  defs.appendChild(grain);

  svg.appendChild(defs);
  return svg;
}

function filter(
  id: string,
  x: string,
  y: string,
  w: string,
  h: string,
): SVGFilterElement {
  const f = document.createElementNS(SVG_NS, "filter");
  setAttrs(f, {
    id,
    x,
    y,
    width: w,
    height: h,
    "color-interpolation-filters": "sRGB",
  });
  return f;
}

function turbulence(attrs: Record<string, string>): SVGFETurbulenceElement {
  const t = document.createElementNS(SVG_NS, "feTurbulence");
  setAttrs(t, attrs);
  return t;
}

function setAttrs(el: Element, attrs: Record<string, string>): void {
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}
