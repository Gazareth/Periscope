# 🔭 Periscope
NextJS App for viewing web apps at a glance

Periscope shows app screenshots stored in Cloudflare R2. The home page lists every version in a carousel; pick one to open its pages on a canvas or as a site map, with visual diffs against the previous version.

## Setup

Requires Node 24+ and pnpm.

```sh
pnpm install
cp .env.example .env.local   # then fill in your R2 credentials
pnpm dev
```

Screenshots are read from `<R2_BUCKET>/<PERISCOPE_ORG>/<PERISCOPE_REPO>/<version>/`, for example:

```
app-screenshots/gazareth/european-shibu/0_0_0/
app-screenshots/gazareth/european-shibu/1_0_0/
app-screenshots/gazareth/european-shibu/develop/
```

Release folders like `1_0_0` are shown as `v1.0.0`. Any image (`png`, `jpg`, `webp`, `gif`, `avif`, `svg`) inside a version folder, including in subfolders, becomes a page on the canvas.

| Variable | Description |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare account ID (or set `R2_ENDPOINT` instead) |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API token with Object Read access |
| `R2_BUCKET` | Bucket name, e.g. `app-screenshots` |
| `PERISCOPE_ORG` / `PERISCOPE_REPO` | Organisation and repo folders, e.g. `gazareth` / `european-shibu` |
| `PERISCOPE_MAIN_BRANCH` | Branch folder to prerender (default `develop`) |
| `PERISCOPE_STATIC_RELEASES` | How many of the newest releases to prerender (default `2`) |

## Caching

- **Main branch + newest releases**: pages and images are fully prerendered at build time. Rebuild to pick up new screenshots for these.
- **Older releases**: rendered from R2 on the first visit, then cached.
- **Home page**: prerendered at build and refreshed hourly in the background, so newly uploaded versions appear without a rebuild.

R2 credentials are needed at build time and at runtime.

## Visual diffs

Each page is compared with the same page in the previous version. A release is compared with the release before it, and a branch with the newest release. The comparison works exactly like Playwright's `toHaveScreenshot`:

- pixelmatch 7.2, the same YIQ algorithm Playwright bundles, with Playwright's default threshold of 0.2;
- images of different sizes are padded with transparent pixels.

Only PNG screenshots are compared.

- **Per page**: the % of pixels that changed. Click a page's chip on the canvas, or the page in the site map, to open the comparison viewer. It has Diff, Actual, Expected, Side by side and Slider views, ported from Playwright's HTML report (Apache-2.0).
- **Per version** (home page): changed pixels across all pages ÷ all pixels compared. Added and removed pages count as fully changed. It is computed at build time for the prerendered versions; older versions show `??`.

## Views

A version opens as a **canvas**, laid out in site-map order:

1. Home and standalone pages on the first row.
2. One row per section: the page, then its sub-pages.

Sub-pages are worked out from names. `dojos-kobukan-dojo-dublin` and `settings/profile` are children of `dojos` and `settings`. A suffix every name shares, like Playwright's `-chromium`, is ignored.

The **site map** toggle shows the same hierarchy as a tree diagram, built with [React Flow](https://reactflow.dev) and `d3-hierarchy`.

## Canvas and site map controls

| Action | Control |
| --- | --- |
| Pan | Click and drag (left or middle mouse button) |
| Zoom | Mouse wheel / trackpad pinch, `+` / `-` |
| Fit all pages | `Shift+1` or the fit button |
| 100% | `Shift+0` or click the zoom percentage |
| Zoom to a page | Double-click it |

# Licence / Branding

While the source code of this project is dedicated to the public domain under The Unlicense, the project name, logo, and unique branding assets are proprietary. You may not use the project name or logos in a way that implies an official endorsement or affiliation with the original creator.
