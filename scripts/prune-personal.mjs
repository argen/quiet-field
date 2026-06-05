import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { personalFiles, readCatalogRights } from "./catalog-rights.mjs";

// Post-build guard for publishable packages: physically removes every
// in-copyright image (rights !== "pd") from the build output, then verifies
// none remain. Run after `QF_PUBLISH=1 vite build` (see the build:publish
// script). rights in src/core/stills.ts is the single source of truth.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.resolve(process.argv[2] ?? path.join(ROOT, "dist"));
const stillsTs = path.join(ROOT, "src/core/stills.ts");

// Integrity guard: the file→rights parser assumes the generator emits `file`
// before `rights` in every entry. If that ever drifts, the regex would silently
// pair the wrong rights and could under-count what to prune. Cross-check the
// number of parsed pairs against the raw `rights:` count and refuse to proceed
// if they disagree — a missed pair must never let in-copyright art slip through.
const parsed = readCatalogRights(stillsTs, { fromFile: true });
const declared = (readFileSync(stillsTs, "utf8").match(/\brights:\s*"/g) ?? []).length;
if (parsed.length !== declared) {
  console.error(
    `prune-personal: FAILED — catalog parse mismatch (${parsed.length} pairs vs ` +
      `${declared} rights entries in ${stillsTs}). Refusing to publish.`,
  );
  process.exit(1);
}

const files = personalFiles(stillsTs, { fromFile: true });

let removed = 0;
for (const f of files) {
  const p = path.join(dist, f);
  if (existsSync(p)) {
    rmSync(p);
    removed++;
  }
}

const leftover = files.filter((f) => existsSync(path.join(dist, f)));
if (leftover.length) {
  console.error(
    `prune-personal: FAILED — ${leftover.length} in-copyright file(s) still in ${dist}:`,
  );
  for (const f of leftover) console.error(`  ${f}`);
  process.exit(1);
}

console.log(
  `prune-personal: removed ${removed} in-copyright image(s); ${dist} is public-domain only.`,
);
