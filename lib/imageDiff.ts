import "server-only";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

// Mirrors Playwright's `compareImages` (packages/playwright-core, Apache-2.0):
// decode both PNGs, pad them to the same size with transparent pixels, then
// run pixelmatch with Playwright's default threshold of 0.2.
//
// pixelmatch is pinned to 7.2.x, the last release that uses the same YIQ colour
// metric as the copy Playwright bundles. `checkerboard: false` matches that
// copy's handling of semi-transparent pixels (blended against white).

export interface ImageComparison {
  diffPixels: number;
  /** Pixels in the compared area (the larger of the two sizes). */
  totalPixels: number;
  sizeChanged: boolean;
  /** Playwright-style diff image: changes in red over a faded copy. */
  diffPng: Uint8Array;
}

type Image = { data: Uint8Array; width: number; height: number };

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

export function isPng(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

/** Width and height from a PNG's header, without decoding it. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function padImageToSize(image: Image, width: number, height: number): Image {
  if (image.width === width && image.height === height) return image;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < image.height; y++) {
    const row = image.data.subarray(y * image.width * 4, (y + 1) * image.width * 4);
    data.set(row, y * width * 4);
  }
  return { data, width, height };
}

/** Compares two PNGs exactly the way Playwright's `toHaveScreenshot` does. */
export function compareImages(expectedPng: Uint8Array, actualPng: Uint8Array): ImageComparison {
  let expected: Image = PNG.sync.read(Buffer.from(expectedPng));
  let actual: Image = PNG.sync.read(Buffer.from(actualPng));
  const width = Math.max(expected.width, actual.width);
  const height = Math.max(expected.height, actual.height);
  const sizeChanged = expected.width !== actual.width || expected.height !== actual.height;
  if (sizeChanged) {
    expected = padImageToSize(expected, width, height);
    actual = padImageToSize(actual, width, height);
  }

  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(expected.data, actual.data, diff.data, width, height, {
    threshold: 0.2,
    checkerboard: false,
  });
  return {
    diffPixels,
    totalPixels: width * height,
    sizeChanged,
    diffPng: new Uint8Array(PNG.sync.write(diff)),
  };
}
