import type { PageDiff } from "@/lib/diff";
import type { Screenshot } from "@/lib/r2";

/** A screenshot plus how it changed since the previous version. */
export interface PageWithDiff extends Screenshot {
  diff?: PageDiff;
}

/** A page that has a previous-version counterpart to compare against. */
export interface ComparedPage {
  name: string;
  url: string;
  diff: Extract<PageDiff, { status: "compared" }>;
}

export function toComparedPage(page: PageWithDiff): ComparedPage | undefined {
  const { diff } = page;
  return diff?.status === "compared" ? { name: page.name, url: page.url, diff } : undefined;
}
