import type { StillPiece } from "../core/types";

// Renders a representational painting into a card, shown whole (never cropped)
// — the card's aspect ratio already matches the image's, so it fills exactly.

export function renderImageInto(
  card: HTMLElement,
  piece: StillPiece,
  resolveAsset: (path: string) => string,
): void {
  const img = document.createElement("img");
  img.className = "qf-img";
  img.decoding = "async";
  img.alt = `${piece.title} (${piece.year}) — ${piece.artist}`;
  img.src = resolveAsset(piece.src);
  card.appendChild(img);
}
