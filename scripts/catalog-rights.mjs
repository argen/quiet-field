import { readFileSync } from "node:fs";

// Single source of truth for "which bundled images may be published".
// Parses the generated src/core/stills.ts (or a literal string) and pairs each
// entry's `file` with its `rights`. Used by the publish-build prune step so a
// publishable package physically cannot contain in-copyright art.
//
// The generator (generate-catalog.mjs) always emits `file` immediately before
// `rights` within each object literal, so a non-greedy file→rights match is
// exact and order-preserving.

const PAIR = /file:\s*"([^"]+)"[\s\S]*?rights:\s*"([^"]+)"/g;

/**
 * @param {string} source  stills.ts contents, or a path when opts.fromFile.
 * @param {{fromFile?: boolean}} [opts]
 * @returns {{file: string, rights: string}[]}
 */
export function readCatalogRights(source, opts = {}) {
  const text = opts.fromFile ? readFileSync(source, "utf8") : source;
  const out = [];
  for (const m of text.matchAll(PAIR)) {
    out.push({ file: m[1], rights: m[2] });
  }
  return out;
}

/** Bundled image paths that are NOT public domain (must not be published). */
export function personalFiles(source, opts = {}) {
  return readCatalogRights(source, opts)
    .filter((e) => e.rights !== "pd")
    .map((e) => e.file);
}
