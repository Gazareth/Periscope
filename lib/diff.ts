import "server-only";
import { cacheLife } from "next/cache";
import { repoPrefix } from "./config";
import { compareImages, isPng, pngSize, type ImageComparison } from "./imageDiff";
import {
  getScreenshotFile,
  keyUrl,
  listScreenshots,
  listStaticVersionIds,
  listVersions,
  type VersionSummary,
} from "./r2";
import { previousVersion, toVersion, type Version } from "./versions";

/** How one page changed since the previous version. */
export type PageDiff =
  | { status: "added" }
  | {
      status: "compared";
      /** Changed pixels as a % of the page. */
      percent: number;
      diffPixels: number;
      sizeChanged: boolean;
      previousUrl: string;
      diffUrl: string;
    };

export interface VersionDiff {
  previous: Version;
  /**
   * Changed pixels across all pages, as a % of all pixels compared.
   * Added and removed pages count as fully changed.
   */
  percent: number;
  /** Keyed by screenshot name. Pages that aren't PNGs are left out. */
  pages: Record<string, PageDiff>;
  removed: string[];
}

const toPercent = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

/** Compares two screenshots. Cached for good: a key's image never changes. */
async function compareScreenshots(
  expectedKey: string,
  actualKey: string,
): Promise<ImageComparison | null> {
  "use cache";
  cacheLife("max");

  const [expected, actual] = await Promise.all([
    getScreenshotFile(expectedKey),
    getScreenshotFile(actualKey),
  ]);
  if (!expected || !actual || !isPng(expected.bytes) || !isPng(actual.bytes)) return null;
  return compareImages(expected.bytes, actual.bytes);
}

/** Pixel count of a PNG screenshot, or undefined for other formats. */
async function pixelArea(key: string): Promise<number | undefined> {
  const file = await getScreenshotFile(key);
  if (!file || !isPng(file.bytes)) return undefined;
  const { width, height } = pngSize(file.bytes);
  return width * height;
}

async function diffVersions(
  versionId: string,
  previousId: string,
): Promise<Omit<VersionDiff, "previous">> {
  "use cache";
  cacheLife("max");

  const [current, previous] = await Promise.all([
    listScreenshots(versionId),
    listScreenshots(previousId),
  ]);
  const previousByName = new Map(previous.map((s) => [s.name, s]));
  const currentNames = new Set(current.map((s) => s.name));
  const removed = previous.filter((s) => !currentNames.has(s.name));

  let diffPixels = 0;
  let totalPixels = 0;
  const countWhole = (area: number | undefined) => {
    if (area === undefined) return false;
    diffPixels += area;
    totalPixels += area;
    return true;
  };

  const pages: Record<string, PageDiff> = {};
  // One at a time: decoding full-page screenshots is memory-hungry.
  for (const screenshot of current) {
    const old = previousByName.get(screenshot.name);
    if (!old) {
      if (countWhole(await pixelArea(screenshot.key))) pages[screenshot.name] = { status: "added" };
      continue;
    }
    const result = await compareScreenshots(old.key, screenshot.key);
    if (!result) continue;
    diffPixels += result.diffPixels;
    totalPixels += result.totalPixels;
    pages[screenshot.name] = {
      status: "compared",
      percent: toPercent(result.diffPixels, result.totalPixels),
      diffPixels: result.diffPixels,
      sizeChanged: result.sizeChanged,
      previousUrl: old.url,
      diffUrl: keyUrl("diffs", screenshot.key),
    };
  }
  for (const s of removed) countWhole(await pixelArea(s.key));

  return {
    percent: toPercent(diffPixels, totalPixels),
    pages,
    removed: removed.map((s) => s.name),
  };
}

/** A version's diff against the one before it, or null for the first version. */
export async function getVersionDiff(versionId: string): Promise<VersionDiff | null> {
  const previous = previousVersion(await listVersions(), versionId);
  if (!previous) return null;
  const diff = await diffVersions(versionId, previous.id);
  return { ...diff, previous: toVersion(previous.id) };
}

/** The diff image for a screenshot against its previous-version counterpart. */
export async function getDiffImage(key: string): Promise<Uint8Array | null> {
  const base = repoPrefix();
  if (!key.startsWith(base)) return null;
  const versionId = key.slice(base.length).split("/")[0];
  const versions = await listVersions();
  const previous = previousVersion(versions, versionId);
  if (!previous) return null;

  const [current, before] = await Promise.all([
    listScreenshots(versionId),
    listScreenshots(previous.id),
  ]);
  const name = current.find((s) => s.key === key)?.name;
  const counterpart = before.find((s) => s.name === name);
  if (!name || !counterpart) return null;
  return (await compareScreenshots(counterpart.key, key))?.diffPng ?? null;
}

/**
 * Every version for the home page. Diffs are filled in for the prerendered
 * versions only; older ones show as unknown until they're built.
 */
export async function listVersionSummaries(): Promise<VersionSummary[]> {
  const [versions, staticIds] = await Promise.all([listVersions(), listStaticVersionIds()]);
  return Promise.all(
    versions.map(async (version) => {
      const previous = previousVersion(versions, version.id);
      if (!previous) return version;
      const diff = staticIds.includes(version.id)
        ? await diffVersions(version.id, previous.id)
        : undefined;
      return { ...version, previousLabel: previous.label, diffPercent: diff?.percent };
    }),
  );
}

/** Screenshot keys that have a diff image, for prerendering. */
export async function listStaticDiffKeys(): Promise<string[]> {
  const ids = await listStaticVersionIds();
  const keys = await Promise.all(
    ids.map(async (id) => {
      const diff = await getVersionDiff(id);
      if (!diff) return [];
      const screenshots = await listScreenshots(id);
      return screenshots.filter((s) => diff.pages[s.name]?.status === "compared").map((s) => s.key);
    }),
  );
  return keys.flat();
}
