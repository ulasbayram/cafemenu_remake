"use client";

/**
 * Shared QR rendering: every printed/scanned QR is a full navigable URL
 * with the Fincan logo embedded at the center (EC level H).
 */

/** Prefixes a route path with the current origin. Throws for non-URLs. */
export function qrContent(path: string): string {
  const text = path.startsWith("http") ? path : `${window.location.origin}${path}`;
  if (!/^https?:\/\//.test(text))
    throw new Error("QR içeriği geçerli bir URL değil.");
  return text;
}

export async function loadFincanLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/favicon.svg";
  });
}

const DEFAULT_DARK = "#172f27";

/**
 * Renders a QR canvas for `text` (route path or full URL) with the logo
 * centered at ≤24% of the side, on a white rounded surround.
 * Returned canvas is supersampled (8px per module) for print quality.
 */
export async function qrCanvasWithLogo(
  text: string,
  logo: HTMLImageElement | null,
  dark = DEFAULT_DARK,
): Promise<HTMLCanvasElement> {
  const qrcode = await import("qrcode");
  const matrix = await qrcode.create(qrContent(text), {
    errorCorrectionLevel: "H",
  });
  const size = matrix.modules.size;
  const quiet = 4;
  const scale = 8;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = (size + quiet * 2) * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = dark;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (matrix.modules.data[y * size + x])
        ctx.fillRect((quiet + x) * scale, (quiet + y) * scale, scale, scale);
  if (logo) {
    const logoW = Math.round(canvas.width * 0.22);
    const pad = Math.round(logoW * 0.08);
    const x0 = (canvas.width - logoW) / 2;
    const y0 = (canvas.width - logoW) / 2;
    const r = 12;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x0 - pad + r, y0 - pad);
    ctx.arcTo(x0 + logoW + pad, y0 - pad, x0 + logoW + pad, y0 + logoW + pad, r);
    ctx.arcTo(
      x0 + logoW + pad,
      y0 + logoW + pad,
      x0 - pad,
      y0 + logoW + pad,
      r,
    );
    ctx.arcTo(x0 - pad, y0 + logoW + pad, x0 - pad, y0 - pad, r);
    ctx.arcTo(x0 - pad, y0 - pad, x0 + logoW + pad, y0 - pad, r);
    ctx.closePath();
    ctx.fill();
    ctx.drawImage(logo, x0, y0, logoW, logoW);
  }
  return canvas;
}

/** Convenience: composite QR as a PNG data URL (for previews/downloads). */
export async function qrPngWithLogo(
  text: string,
  logo: HTMLImageElement | null,
  dark = DEFAULT_DARK,
): Promise<string> {
  return (await qrCanvasWithLogo(text, logo, dark)).toDataURL("image/png");
}
