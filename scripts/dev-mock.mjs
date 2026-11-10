// Runs `next dev` against a fake in-memory R2 with placeholder screenshots,
// so the UI can be tried without real credentials.
// Usage: pnpm dev:mock [-- next dev args]
import { spawn } from "node:child_process";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { PNG } from "pngjs";

const BUCKET = "app-screenshots";
const ORG = "demo-org";
const REPO = "demo-app";
const VERSIONS = ["0_1_0", "0_2_0", "1_0_0", "1_1_0", "develop"];
const PAGES = [
  { name: "home", mobile: false },
  { name: "home-mobile", mobile: true },
  { name: "login", mobile: false },
  { name: "login-mobile", mobile: true },
  { name: "dashboard", mobile: false },
  { name: "settings/profile", mobile: false },
  { name: "settings/billing", mobile: false },
  { name: "checkout", mobile: true },
];

/** "hsl(h s% l%)" components to [r, g, b]. */
function hsl(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return [f(0), f(8), f(4)];
}

/**
 * A simple wireframe-style page mock-up, as a PNG so it can be diffed.
 * Layouts drift a little between versions so the diffs have something to show.
 */
function wireframe(version, page, index) {
  const step = VERSIONS.indexOf(version);
  const [w, h] = page.mobile ? [390, 844] : [1440, 900];
  const hue = (index * 47 + (step >= 3 ? 30 : 0)) % 360;
  const accent = hsl(hue, 70, 55);
  const soft = hsl(hue, 60, 94);
  const grey = [236, 238, 242];
  const changed = (index + step) % 3 === 0;

  const png = new PNG({ width: w, height: h });
  const block = (x, y, bw, bh, [r, g, b] = grey) => {
    for (let py = Math.max(0, Math.round(y)); py < Math.min(h, Math.round(y + bh)); py++) {
      for (let px = Math.max(0, Math.round(x)); px < Math.min(w, Math.round(x + bw)); px++) {
        const i = (py * w + px) * 4;
        png.data[i] = r;
        png.data[i + 1] = g;
        png.data[i + 2] = b;
        png.data[i + 3] = 255;
      }
    }
  };

  block(0, 0, w, h, [255, 255, 255]);
  block(0, 0, w, 64, accent);
  if (page.mobile) {
    block(16, 88, w - 32, changed ? 240 : 180, soft);
    for (let i = 0; i < (changed ? 5 : 6); i++) block(16, (changed ? 352 : 292) + i * 84, w - 32, 68);
    block(16, h - 72, w - 32, 52, accent);
  } else {
    block(0, 64, 240, h - 64, [246, 247, 249]);
    for (let i = 0; i < 7 + (step % 2); i++) block(24, 96 + i * 48, 192, 28);
    block(272, 96, w - 304, 220, soft);
    const columns = changed ? 4 : 3;
    const cardW = (w - 304 - 24 * (columns - 1)) / columns;
    for (let i = 0; i < columns * 2; i++) {
      block(272 + (i % columns) * (cardW + 24), 348 + Math.floor(i / columns) * 260, cardW, 236);
    }
  }
  return PNG.sync.write(png);
}

const files = new Map();
for (const version of VERSIONS) {
  PAGES.forEach((page, i) => {
    // "checkout" first appears in 1.0.0, so earlier diffs show it as new.
    if (page.name === "checkout" && VERSIONS.indexOf(version) < 2) return;
    files.set(`${ORG}/${REPO}/${version}/${page.name}.png`, wireframe(version, page, i));
  });
}

const xmlEscape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Implements just enough of the S3 API (path-style ListObjectsV2 + GetObject).
const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const pathname = decodeURIComponent(url.pathname).replace(/^\/|\/$/g, "");

  if (pathname === BUCKET && url.searchParams.get("list-type") === "2") {
    const prefix = url.searchParams.get("prefix") ?? "";
    const delimiter = url.searchParams.get("delimiter");
    const contents = [];
    const prefixes = new Set();
    for (const key of [...files.keys()].sort()) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const cut = delimiter ? rest.indexOf(delimiter) : -1;
      if (cut >= 0) prefixes.add(prefix + rest.slice(0, cut + 1));
      else contents.push(key);
    }
    res.setHeader("Content-Type", "application/xml");
    res.end(
      `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Name>${BUCKET}</Name>` +
        `<Prefix>${xmlEscape(prefix)}</Prefix><KeyCount>${contents.length}</KeyCount><IsTruncated>false</IsTruncated>` +
        contents.map((k) => `<Contents><Key>${xmlEscape(k)}</Key><Size>${files.get(k).length}</Size></Contents>`).join("") +
        [...prefixes].map((p) => `<CommonPrefixes><Prefix>${xmlEscape(p)}</Prefix></CommonPrefixes>`).join("") +
        `</ListBucketResult>`,
    );
    return;
  }

  const body = pathname.startsWith(`${BUCKET}/`) && files.get(pathname.slice(BUCKET.length + 1));
  if (body) {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("ETag", `"${body.length}"`);
    res.end(body);
    return;
  }
  res.statusCode = 404;
  res.setHeader("Content-Type", "application/xml");
  res.end(`<?xml version="1.0" encoding="UTF-8"?><Error><Code>NoSuchKey</Code></Error>`);
});

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();
  console.log(`Fake R2 running on http://127.0.0.1:${port} (${files.size} screenshots)`);

  const require = createRequire(import.meta.url);
  const nextBin = path.join(path.dirname(require.resolve("next/package.json")), "dist/bin/next");
  // Real environment variables take priority over .env.local in Next.js.
  // pnpm passes a leading "--" through; next doesn't expect it.
  const args = process.argv.slice(2).filter((arg, i) => !(i === 0 && arg === "--"));
  const next = spawn(process.execPath, [nextBin, "dev", ...args], {
    stdio: "inherit",
    env: {
      ...process.env,
      R2_ENDPOINT: `http://127.0.0.1:${port}`,
      R2_ACCESS_KEY_ID: "mock",
      R2_SECRET_ACCESS_KEY: "mock",
      R2_BUCKET: BUCKET,
      PERISCOPE_ORG: ORG,
      PERISCOPE_REPO: REPO,
      PERISCOPE_MAIN_BRANCH: "develop",
    },
  });
  const stop = () => next.kill();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  next.on("exit", (code) => {
    server.close();
    process.exit(code ?? 0);
  });
});
