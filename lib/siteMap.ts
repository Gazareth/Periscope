// Shared (client + server): works out a site hierarchy from screenshot names.
//
// Names are paths like "settings/profile", or Playwright snapshot names like
// "dojos-kobukan-dojo-dublin-chromium". A page is a child of another when its
// path starts with the other's path plus "/" or "-". A suffix shared by every
// name (e.g. the "-chromium" project name) is ignored.

import { naturalCompare } from "./versions";

export interface SiteNode<T> {
  page: T;
  /** Path with the shared suffix removed, e.g. "dojos-kobukan-dojo-dublin". */
  path: string;
  /** Path relative to the parent page, e.g. "kobukan-dojo-dublin". */
  label: string;
  children: SiteNode<T>[];
}

const HOME_NAMES = new Set(["home", "index", "homepage", "landing", "root"]);

/** Removes trailing "-segments" that every name shares. */
function stripCommonSuffix(names: string[]): string[] {
  if (names.length < 2) return names;
  const parts = names.map((n) => n.split("-"));
  let strip = 0;
  while (parts.every((p) => p.length > strip + 1)) {
    const segment = parts[0][parts[0].length - 1 - strip];
    if (!parts.every((p) => p[p.length - 1 - strip] === segment)) break;
    strip++;
  }
  return parts.map((p) => p.slice(0, p.length - strip).join("-"));
}

export function isHome(node: SiteNode<unknown>): boolean {
  return HOME_NAMES.has(node.path.toLowerCase());
}

/** Home first, then standalone pages, then pages with sub-pages. */
function siteOrder(a: SiteNode<unknown>, b: SiteNode<unknown>): number {
  const rank = (n: SiteNode<unknown>) => (isHome(n) ? 0 : n.children.length === 0 ? 1 : 2);
  return rank(a) - rank(b) || naturalCompare(a.path, b.path);
}

/** The pages as a tree of top-level pages, in site-map order. */
export function buildSiteTree<T extends { name: string }>(pages: T[]): SiteNode<T>[] {
  const paths = stripCommonSuffix(pages.map((p) => p.name));
  const nodes = pages.map((page, i): SiteNode<T> => ({ page, path: paths[i], label: paths[i], children: [] }));
  // Longest paths first, so the nearest ancestor wins.
  const byLength = [...nodes].sort((a, b) => b.path.length - a.path.length);

  const roots: SiteNode<T>[] = [];
  for (const node of nodes) {
    const parent = byLength.find(
      (other) =>
        other !== node &&
        (node.path.startsWith(`${other.path}/`) || node.path.startsWith(`${other.path}-`)),
    );
    if (parent) {
      node.label = node.path.slice(parent.path.length + 1);
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sort = (list: SiteNode<T>[]) => {
    list.sort(siteOrder);
    list.forEach((n) => sort(n.children));
    return list;
  };
  return sort(roots);
}

/** A node and all its descendants, depth first. */
export function flattenSiteNode<T>(node: SiteNode<T>): T[] {
  return [node.page, ...node.children.flatMap(flattenSiteNode)];
}
