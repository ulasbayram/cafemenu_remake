export type LogoPalette = {
  accent: string;
  background: string;
  textColor: string;
};
type RGB = [number, number, number];
/** Only blend a logo into the page when its opaque edges share a dark ground. */
export function logoSurfaceFromPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): string | null {
  const edges: RGB[] = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (x !== 0 && y !== 0 && x !== width - 1 && y !== height - 1) continue;
      const i = (y * width + x) * 4;
      if (pixels[i + 3] < 240) return null;
      edges.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
    }
  if (!edges.length) return null;
  const median = [0, 1, 2].map(
    (c) =>
      edges.map((rgb) => rgb[c]).sort((a, b) => a - b)[
        Math.floor(edges.length / 2)
      ],
  ) as RGB;
  const matching = edges.filter((rgb) =>
    rgb.every((v, c) => Math.abs(v - median[c]) < 24),
  );
  return matching.length / edges.length >= 0.85 && luminance(median) < 0.12
    ? hex(median)
    : null;
}
const hex = (rgb: RGB) =>
  "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const mix = (rgb: RGB, target: number, amount: number): RGB =>
  rgb.map((v) => v * (1 - amount) + target * amount) as RGB;
const luminance = (rgb: RGB) =>
  rgb
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);

/** Ignore transparent/white backgrounds and group nearby shades of the logo. */
export function themeFromPixels(pixels: Uint8ClampedArray): "light" | "dark" {
  let dark = 0,
    total = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const weight = pixels[i + 3] / 255;
    total += weight;
    if (luminance([pixels[i], pixels[i + 1], pixels[i + 2]]) < 0.35)
      dark += weight;
  }
  return total > 0 && dark > total / 2 ? "dark" : "light";
}

export function paletteFromPixels(pixels: Uint8ClampedArray): LogoPalette {
  const buckets = new Map<string, { rgb: RGB; weight: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    const rgb: RGB = [pixels[i], pixels[i + 1], pixels[i + 2]];
    if (pixels[i + 3] < 128 || Math.min(...rgb) > 235) continue;
    const saturation = (Math.max(...rgb) - Math.min(...rgb)) / 255;
    const weight = (pixels[i + 3] / 255) * (1 + saturation * 3);
    const key = rgb.map((v) => Math.floor(v / 32)).join(",");
    const previous = buckets.get(key);
    if (previous) {
      previous.rgb = previous.rgb.map(
        (v, j) =>
          (v * previous.weight + rgb[j] * weight) / (previous.weight + weight),
      ) as RGB;
      previous.weight += weight;
    } else buckets.set(key, { rgb, weight });
  }
  const ranked = [...buckets.values()].sort((a, b) => b.weight - a.weight);
  const chromatic = ranked.find(
    (b) =>
      Math.max(...b.rgb) - Math.min(...b.rgb) > 45 &&
      b.weight >= (ranked[0]?.weight || 0) * 0.05,
  );
  const dominant: RGB = chromatic?.rgb || ranked[0]?.rgb || [72, 72, 72];
  const background = mix(dominant, 255, 0.96);
  let accent = dominant;
  while ((luminance(background) + 0.05) / (luminance(accent) + 0.05) < 4.5)
    accent = mix(accent, 0, 0.08);
  return {
    accent: hex(accent),
    background: hex(background),
    textColor: hex(mix(dominant, 0, 0.78)),
  };
}

export async function prepareLogo(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("PNG, JPG veya WebP bir logo seçin.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Logo en fazla 5 MB olabilir.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const factor = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * factor));
    canvas.height = Math.max(1, Math.round(bitmap.height * factor));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Bu tarayıcı logo işlemeyi desteklemiyor.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const palette = paletteFromPixels(pixels);
    const defaultTheme = themeFromPixels(pixels);
    const logoSurface = logoSurfaceFromPixels(
      pixels,
      canvas.width,
      canvas.height,
    );
    const logo = canvas.toDataURL("image/webp", 0.82);
    if (logo.length > 120000)
      throw new Error(
        "Logo çok detaylı. Daha sade veya küçük bir görsel seçin.",
      );
    return { logo, palette, defaultTheme, logoSurface };
  } finally {
    bitmap.close();
  }
}
