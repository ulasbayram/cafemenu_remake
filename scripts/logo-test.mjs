import assert from "node:assert/strict";
import { paletteFromPixels } from "../lib/logo.ts";
const pixels = (...values) => new Uint8ClampedArray(values.flat());
const red = paletteFromPixels(pixels([200, 40, 30, 255]));
assert.equal(
  paletteFromPixels(
    pixels([255, 255, 255, 255], [0, 0, 255, 0], [200, 40, 30, 255]),
  ).accent,
  red.accent,
  "Ignore white and transparent background",
);
for (const sample of [
  [255, 230, 0, 255],
  [250, 180, 180, 255],
  [0, 0, 0, 255],
  [255, 255, 255, 255],
]) {
  const palette = paletteFromPixels(pixels(sample));
  const lum = (hex) =>
    hex
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  assert.ok(
    (lum(palette.background) + 0.05) / (lum(palette.accent) + 0.05) >= 4.45,
    "Readable accent against suggested background, allowing rounding",
  );
  assert.ok(
    (lum(palette.background) + 0.05) / (lum(palette.textColor) + 0.05) >= 7,
    "Readable body text",
  );
}
console.log(
  "PASS: logo background filtering, neutral fallback, palette contrast",
);
