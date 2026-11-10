import "server-only";

export interface Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  org: string;
  repo: string;
  /** Branch folder prerendered at build time, e.g. "develop". */
  mainBranch: string;
  /** How many of the newest releases are prerendered at build time. */
  staticReleases: number;
}

let cached: Config | undefined;

function read(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

/** Reads and validates the app config from environment variables. */
export function getConfig(): Config {
  if (cached) return cached;

  const accountId = read("R2_ACCOUNT_ID");
  // R2_ENDPOINT is optional, e.g. for EU-jurisdiction buckets.
  const endpoint =
    read("R2_ENDPOINT") ??
    (accountId && `https://${accountId}.r2.cloudflarestorage.com`);

  const values = {
    R2_ACCESS_KEY_ID: read("R2_ACCESS_KEY_ID"),
    R2_SECRET_ACCESS_KEY: read("R2_SECRET_ACCESS_KEY"),
    R2_BUCKET: read("R2_BUCKET"),
    PERISCOPE_ORG: read("PERISCOPE_ORG"),
    PERISCOPE_REPO: read("PERISCOPE_REPO"),
  };

  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (!endpoint) missing.unshift("R2_ACCOUNT_ID (or R2_ENDPOINT)");
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. See .env.example.`,
    );
  }

  const trimSlashes = (s: string) => s.replace(/^\/+|\/+$/g, "");
  cached = {
    endpoint: endpoint!,
    accessKeyId: values.R2_ACCESS_KEY_ID!,
    secretAccessKey: values.R2_SECRET_ACCESS_KEY!,
    bucket: values.R2_BUCKET!,
    org: trimSlashes(values.PERISCOPE_ORG!),
    repo: trimSlashes(values.PERISCOPE_REPO!),
    mainBranch: read("PERISCOPE_MAIN_BRANCH") ?? "develop",
    staticReleases: Math.max(0, Number(read("PERISCOPE_STATIC_RELEASES") ?? 2) || 0),
  };
  return cached;
}

/** Key prefix for this repo's screenshots, e.g. "gazareth/european-shibu/". */
export function repoPrefix(config: Config = getConfig()): string {
  return `${config.org}/${config.repo}/`;
}
