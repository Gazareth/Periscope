import "server-only";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
  type _Object,
} from "@aws-sdk/client-s3";
import { cacheLife } from "next/cache";
import { getConfig, repoPrefix } from "./config";
import {
  compareVersions,
  isValidVersionId,
  naturalCompare,
  toVersion,
  type Version,
} from "./versions";

export interface Screenshot {
  key: string;
  /** Path inside the version folder, without the file extension. */
  name: string;
  url: string;
}

export interface VersionSummary extends Version {
  pageCount: number;
  /** Label of the version this one is diffed against, if there is one. */
  previousLabel?: string;
  /** Visual diff vs the previous version, in %. Unset until the version is built. */
  diffPercent?: number;
}

export interface ScreenshotFile {
  bytes: Uint8Array;
  contentType?: string;
  etag?: string;
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|svg)$/i;

let client: S3Client | undefined;

function getClient(): S3Client {
  if (!client) {
    const config = getConfig();
    client = new S3Client({
      region: "auto",
      forcePathStyle: true,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return client;
}

async function list(prefix: string, options: { delimiter?: string } = {}) {
  const objects: _Object[] = [];
  const prefixes: string[] = [];
  let token: string | undefined;
  do {
    const page = await getClient().send(
      new ListObjectsV2Command({
        Bucket: getConfig().bucket,
        Prefix: prefix,
        Delimiter: options.delimiter,
        ContinuationToken: token,
      }),
    );
    objects.push(...(page.Contents ?? []));
    prefixes.push(...(page.CommonPrefixes ?? []).flatMap((p) => p.Prefix ?? []));
    token = page.NextContinuationToken;
  } while (token);
  return { objects, prefixes };
}

/** URL of an app route that serves something per R2 key, e.g. "/screenshots/<key>". */
export function keyUrl(route: "screenshots" | "diffs", key: string): string {
  return `/${route}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function toScreenshots(objects: _Object[], versionPrefix: string): Screenshot[] {
  return objects
    .flatMap((o) => (o.Key && IMAGE_EXT.test(o.Key) ? [o.Key] : []))
    .sort(naturalCompare)
    .map((key) => ({
      key,
      name: key.slice(versionPrefix.length).replace(IMAGE_EXT, ""),
      url: keyUrl("screenshots", key),
    }));
}

export function versionPrefix(versionId: string): string {
  return `${repoPrefix()}${versionId}/`;
}

/**
 * All version folders, sorted for display, each with its page count.
 * Refreshed hourly so new uploads appear without a rebuild.
 */
export async function listVersions(): Promise<VersionSummary[]> {
  "use cache";
  cacheLife("hours");

  const { mainBranch } = getConfig();
  const base = repoPrefix();
  const { prefixes } = await list(base, { delimiter: "/" });
  const versions = prefixes
    .map((p) => toVersion(p.slice(base.length, -1)))
    .sort((a, b) => compareVersions(a, b, mainBranch));

  return Promise.all(
    versions.map(async (version) => ({
      ...version,
      pageCount: (await listScreenshots(version.id)).length,
    })),
  );
}

/** The main branch plus the newest releases, which are prerendered at build. */
export async function listStaticVersionIds(): Promise<string[]> {
  const { mainBranch, staticReleases } = getConfig();
  const versions = await listVersions();
  // Versions are sorted oldest first, so the newest releases are at the end.
  const allReleases = versions.filter((v) => v.kind === "release");
  const releases = staticReleases > 0 ? allReleases.slice(-staticReleases) : [];
  return [
    ...versions.filter((v) => v.id === mainBranch),
    ...releases,
  ].map((v) => v.id);
}

/** Every screenshot in a version folder, in natural path order. */
export async function listScreenshots(versionId: string): Promise<Screenshot[]> {
  "use cache";
  cacheLife("max");

  if (!isValidVersionId(versionId)) return [];
  const prefix = versionPrefix(versionId);
  const { objects } = await list(prefix);
  return toScreenshots(objects, prefix);
}

/** One screenshot's bytes, limited to the configured repo's images. */
export async function getScreenshotFile(
  key: string,
): Promise<ScreenshotFile | null> {
  "use cache";
  cacheLife("max");

  if (!key.startsWith(repoPrefix()) || !IMAGE_EXT.test(key)) return null;
  try {
    const object = await getClient().send(
      new GetObjectCommand({ Bucket: getConfig().bucket, Key: key }),
    );
    if (!object.Body) return null;
    return {
      bytes: await object.Body.transformToByteArray(),
      contentType: object.ContentType,
      etag: object.ETag,
    };
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    if (status === 404) return null;
    throw error;
  }
}
