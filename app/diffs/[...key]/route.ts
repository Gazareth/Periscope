import { getDiffImage, listStaticDiffKeys } from "@/lib/diff";

// Playwright-style diff images (changes in red). Like screenshots, the main
// branch and newest releases are prerendered; older ones render on first request.
export async function generateStaticParams() {
  const keys = await listStaticDiffKeys();
  return keys.map((key) => ({ key: key.split("/") }));
}

export async function GET(
  _request: Request,
  ctx: RouteContext<"/diffs/[...key]">,
) {
  const { key } = await ctx.params;
  const png = await getDiffImage(key.join("/"));
  if (!png) return new Response("Not found", { status: 404 });
  return new Response(png as Uint8Array<ArrayBuffer>, {
    headers: { "Content-Type": "image/png" },
  });
}
