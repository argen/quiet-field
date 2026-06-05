import { describe, expect, it } from "vitest";
import { readCatalogRights, personalFiles } from "../scripts/catalog-rights.mjs";

const STILLS_TS = new URL("../src/core/stills.ts", import.meta.url).pathname;

// A minimal fixture in the exact shape generate-catalog.mjs emits.
const FIXTURE = `
export const STILLS = [
  {
    id: "a",
    file: "art/stillness/a.jpg",
    title: "A",
    rights: "pd",
  },
  {
    id: "b",
    file: "art/stillness/b.jpg",
    title: "B",
    rights: "personal",
  },
];
`;

describe("readCatalogRights", () => {
  it("pairs each file with its rights, in order", () => {
    const got = readCatalogRights(FIXTURE);
    expect(got).toEqual([
      { file: "art/stillness/a.jpg", rights: "pd" },
      { file: "art/stillness/b.jpg", rights: "personal" },
    ]);
  });

  it("parses the real generated catalog and tags every entry", () => {
    const got = readCatalogRights(STILLS_TS, { fromFile: true });
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((e) => e.file.startsWith("art/stillness/"))).toBe(true);
    expect(got.every((e) => e.rights === "pd" || e.rights === "personal")).toBe(true);
  });
});

describe("personalFiles", () => {
  it("returns only the in-copyright files", () => {
    expect(personalFiles(FIXTURE)).toEqual(["art/stillness/b.jpg"]);
  });

  it("flags the real Hopper images for pruning", () => {
    const files = personalFiles(STILLS_TS, { fromFile: true });
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.startsWith("art/stillness/"))).toBe(true);
  });
});
