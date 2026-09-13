export type LogoPalette = {
  accent: string;
  background: string;
  textColor: string;
};
type RGB = [number, number, number];
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
  const dominant: RGB = [...buckets.values()].sort(
    (a, b) => b.weight - a.weight,
  )[0]?.rgb || [72, 78, 72];
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
    const palette = paletteFromPixels(
      context.getImageData(0, 0, canvas.width, canvas.height).data,
    );
    const logo = canvas.toDataURL("image/webp", 0.82);
    if (logo.length > 120000)
      throw new Error(
        "Logo çok detaylı. Daha sade veya küçük bir görsel seçin.",
      );
    return { logo, palette };
  } finally {
    bitmap.close();
  }
}
