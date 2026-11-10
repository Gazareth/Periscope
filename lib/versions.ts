// Shared (client + server) helpers for version folder names.

export type VersionKind = "release" | "branch";

export interface Version {
  /** Folder name in R2, e.g. "1_0_0" or "develop". */
  id: string;
  /** Display name, e.g. "v1.0.0" or "develop". */
  label: string;
  kind: VersionKind;
}

const RELEASE = /^\d+(_\d+)*$/;

export const naturalCompare = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
}).compare;

export function toVersion(id: string): Version {
  const isRelease = RELEASE.test(id);
  return {
    id,
    label: isRelease ? `v${id.replaceAll("_", ".")}` : id,
    kind: isRelease ? "release" : "branch",
  };
}

/** Releases oldest to newest, then the main branch, then other branches (alphabetical). */
export function compareVersions(
  a: Version,
  b: Version,
  mainBranch?: string,
): number {
  const rank = (v: Version) =>
    v.kind === "release" ? 0 : v.id === mainBranch ? 1 : 2;
  return rank(a) - rank(b) || naturalCompare(a.id, b.id);
}

/** A version id is a single path segment. */
export function isValidVersionId(id: string): boolean {
  return id.length > 0 && !id.includes("/") && id !== "." && id !== "..";
}

/**
 * The version a diff compares against: the release before it, or for a branch,
 * the newest release. `sorted` must be in `compareVersions` order.
 */
export function previousVersion<T extends Version>(sorted: T[], id: string): T | undefined {
  const index = sorted.findIndex((v) => v.id === id);
  if (index < 0) return undefined;
  return sorted.slice(0, index).findLast((v) => v.kind === "release");
}

/** A diff percentage for display, e.g. "0%", "<0.1%", "12.3%". */
export function formatPercent(percent: number): string {
  if (percent === 0) return "0%";
  if (percent < 0.1) return "<0.1%";
  return `${percent.toFixed(1)}%`;
}
