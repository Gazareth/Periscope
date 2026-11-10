import { getScreenshotFile, listScreenshots, listStaticVersionIds } from "@/lib/r2";

// Images for the main branch and newest releases are prerendered at build time.
// Older images are fetched from R2 on first request, then cached.
export async function generateStaticParams() {
  const versionIds = await listStaticVersionIds();
  const screenshots = await Promise.all(versionIds.map(listScreenshots));
  return screenshots.flat().map((s) => ({ key: s.key.split("/") }));
}

export async function GET(
  _request: Request,
  ctx: RouteContext<"/screenshots/[...key]">,
) {
  const { key } = await ctx.params;
  const file = await getScreenshotFile(key.join("/"));
  if (!file) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  if (file.contentType) headers.set("Content-Type", file.contentType);
  if (file.etag) headers.set("ETag", file.etag);
  return new Response(file.bytes as Uint8Array<ArrayBuffer>, { headers });
}
