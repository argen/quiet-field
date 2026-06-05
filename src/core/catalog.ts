import { STILLS } from "./stills";
import type { Edition, Still } from "./types";

// Build-mode catalog. `vite build` with QF_PUBLISH=1 sets __QF_PUBLISH__ true
// (see vite.config.ts `define`); every other build — dev, tests, the default
// `pnpm build` — leaves it false.
//
// rights "pd" (public domain) is the single source of truth for what may be
// published. In a publishable build no in-copyright IMAGE is ever selected,
// rendered, or shipped: the selection pool (CATALOG) and the edition picker both
// narrow to pd-only here, and the build physically prunes the personal image
// files (scripts/prune-personal.mjs). Inert catalog metadata (titles, filenames,
// years — facts, not copyrightable) may still remain in the JS bundle; that is
// the same stance the repo takes by committing stills.ts at all.

/** Drop every in-copyright work, keeping only public-domain art. */
export function publishableStills(stills: readonly Still[]): Still[] {
  return stills.filter((s) => s.rights === "pd");
}

/** Editions the user may pick. A publish build hides image-bearing personal collections. */
export function availableEditions(publish: boolean): Edition[] {
  return publish ? ["fields", "abstract"] : ["fields", "abstract", "hopper"];
}

export const PUBLISH_BUILD: boolean = __QF_PUBLISH__;

export const CATALOG: readonly Still[] = PUBLISH_BUILD
  ? publishableStills(STILLS)
  : STILLS;

export const EDITIONS: readonly Edition[] = availableEditions(PUBLISH_BUILD);
