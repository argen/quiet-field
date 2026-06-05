export interface CatalogRight {
  file: string;
  rights: string;
}
export function readCatalogRights(
  source: string,
  opts?: { fromFile?: boolean },
): CatalogRight[];
export function personalFiles(
  source: string,
  opts?: { fromFile?: boolean },
): string[];
