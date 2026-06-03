import type { FieldPiece, StillPiece } from "./types";

// Honest attribution, kept pure and testable.
//
// The generated Fields are ORIGINAL works — never reproductions — so each
// composition openly credits the painter whose sensibility it channels, marked
// plainly as "generated" so it's never mistaken for that artist's actual work.
// (Most of these painters are still in copyright, which is exactly why we
// emulate rather than reproduce.) Real paintings carry their own artist / title
// / year plus a public-domain-or-in-copyright provenance note.

/** The painter each generated composition is in the spirit of. */
export const INFLUENCE: Record<FieldPiece["composition"], string> = {
  bands: "Mark Rothko",
  squares: "Josef Albers",
  zips: "Barnett Newman",
  veils: "Helen Frankenthaler",
  grid: "Agnes Martin",
  cleave: "Clyfford Still",
};

/** Caption line for a generated field — names the influence, marks it generated. */
export function fieldAttribution(composition: FieldPiece["composition"]): string {
  return `Generated · in the spirit of ${INFLUENCE[composition]}`;
}

/** Caption line for a real painting — its rights provenance. */
export function stillProvenance(rights: StillPiece["rights"]): string {
  return rights === "pd" ? "Public domain" : "In copyright · personal use";
}
