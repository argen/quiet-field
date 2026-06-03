import type { Piece } from "../core/types";
import { fieldAttribution, stillProvenance } from "../core/attribution";
import { renderFieldInto } from "./fields";
import { renderImageInto } from "./image";

// Builds the whole surface: a dark gallery wall, the painting hung and framed
// at its true proportions (or filling the screen), a quiet caption beneath it,
// an ambient time/place line, and an always-reachable settings control.

export interface AmbientText {
  /** e.g. "6:41 p.m." */
  timeLabel: string;
  /** City, once weather/location is on. */
  placeLabel?: string;
  /** A short contextual line, e.g. "fog · 7°". */
  contextLine?: string;
}

export interface PresentOptions {
  framing: "framed" | "full";
  showCaption: boolean;
  ambient: AmbientText;
  resolveAsset: (path: string) => string;
  /** Render the ambient time/place line. Off for previews. */
  chrome?: boolean;
}

export function present(
  root: HTMLElement,
  piece: Piece,
  opts: PresentOptions,
): void {
  const reduce = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const stage = el("div", "qf-stage");
  if (opts.framing === "full") stage.classList.add("qf-stage--full");

  const frame = el("div", "qf-frame");
  const card = el("div", "qf-card");
  card.style.aspectRatio = String(piece.aspect);
  card.style.setProperty("--a", String(piece.aspect));

  let title: HTMLElement;
  if (piece.kind === "field") {
    renderFieldInto(card, piece);
    title = el("em", "qf-cap-title");
    title.textContent = piece.paletteName;
  } else {
    card.classList.add("qf-card--image");
    renderImageInto(card, piece, opts.resolveAsset);
    title = el("span", "qf-cap-title");
    const t = el("em");
    t.textContent = piece.title;
    title.append(t);
    if (piece.year != null) title.append(document.createTextNode(`, ${piece.year}`));
  }
  frame.appendChild(card);

  // Caption beneath the painting, like a wall label.
  if (opts.showCaption) {
    const cap = el("figcaption", "qf-caption");
    cap.appendChild(title);
    if (piece.kind === "still") {
      const artist = el("span", "qf-cap-artist");
      artist.textContent = piece.artist;
      cap.appendChild(artist);
    }
    // Provenance — honest about generated-vs-actual and who it's attributed to.
    const attr = el("span", "qf-cap-attr");
    attr.textContent =
      piece.kind === "field"
        ? fieldAttribution(piece.composition)
        : stillProvenance(piece.rights);
    cap.appendChild(attr);
    if (opts.ambient.contextLine) {
      const ctx = el("span", "qf-cap-context");
      ctx.textContent = opts.ambient.contextLine;
      cap.appendChild(ctx);
    }
    frame.appendChild(cap);
  }
  stage.appendChild(frame);

  // Vignette for depth on the wall.
  stage.appendChild(el("div", "qf-vignette"));

  if (opts.chrome === false) {
    root.replaceChildren(stage);
    return;
  }

  // Ambient corner line (time / place) — fades after a beat, returns on hover.
  const ambient = el("div", "qf-ambient");
  if (!reduce) ambient.classList.add("qf-ambient--fade");
  const line = el("p", "qf-corner");
  line.appendChild(span(opts.ambient.timeLabel, "qf-corner__time"));
  if (opts.ambient.placeLabel) {
    line.appendChild(sep());
    line.appendChild(span(opts.ambient.placeLabel));
  }
  ambient.appendChild(line);
  stage.appendChild(ambient);

  root.replaceChildren(stage);
}

function el(tag: string, className?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function span(text: string, className?: string): HTMLElement {
  const s = el("span", className);
  s.textContent = text;
  return s;
}

function sep(): HTMLElement {
  const s = el("span", "qf-corner__sep");
  s.setAttribute("aria-hidden", "true");
  s.textContent = "—";
  return s;
}
