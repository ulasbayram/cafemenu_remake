"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, LoaderCircle } from "lucide-react";
import { api } from "@/lib/client-api";
import { loadFincanLogo, qrCanvasWithLogo } from "@/lib/qr-composite";
import type { Cafe } from "@/lib/menu";

/**
 * Draws text centered at (cx, y), shrinking the font until it fits maxWidth
 * (floor 44px), then ellipsis-truncating. Prevents cross-cell bleed.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  startSize: number,
) {
  let size = startSize;
  ctx.fillStyle = "#4b5c55";
  ctx.textAlign = "center";
  let label = text;
  while (size > 44) {
    ctx.font = `400 ${size}px sans-serif`;
    if (ctx.measureText(label).width <= maxWidth) break;
    size -= 6;
  }
  ctx.font = `400 ${size}px sans-serif`;
  while (label.length > 1 && ctx.measureText(label + "…").width > maxWidth)
    label = label.slice(0, -1);
  if (label !== text) label += "…";
  ctx.fillText(label, cx, y);
}

/** A4 @300dpi canvas dimensions. */
const PAGE_W = 2480;
const PAGE_H = 3508;
/** 3×4 grid of 60mm cells with 14mm side margins (portrait A4). */
const COLS = 3;
const ROWS = 4;
const CELL = Math.floor(Math.min(PAGE_W / COLS, (PAGE_H - 500) / ROWS));

export default function PrintQrSheet() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [pages, setPages] = useState<string[]>([]);
  const [meta, setMeta] = useState<{ name: string; slug: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const cafe = await api<Cafe>(`/api/cafes/${id}`, undefined, "GET");
        if (!active) return;
        setMeta({ name: cafe.name, slug: cafe.slug });
        const { links } = await api<{
          links: { table: number; path: string }[];
        }>(`/api/cafes/${id}/table-links`);
        const logo = await loadFincanLogo();
        const cells: { qr: HTMLCanvasElement; table: number }[] = [];
        const allLinks =
          links.length > 0
            ? links
            : [{ table: 0, path: `/menu/${cafe.slug}` }];
        for (const link of allLinks) {
          // qrCanvasWithLogo prepends the origin — encoded text is always a
          // full navigable URL. A non-URL here throws instead of printing
          // dead paper.
          const cellCanvas = await qrCanvasWithLogo(link.path, logo);
          cells.push({ qr: cellCanvas, table: link.table });
        }
        // Paginate 12 per page.
        const pageCount = Math.ceil(cells.length / (COLS * ROWS)) || 1;
        const rendered: string[] = [];
        for (let p = 0; p < pageCount; p++) {
          const page = document.createElement("canvas");
          page.width = PAGE_W;
          page.height = PAGE_H;
          const ctx = page.getContext("2d");
          if (!ctx) throw new Error("canvas");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, PAGE_W, PAGE_H);
          const slice = cells.slice(p * COLS * ROWS, (p + 1) * COLS * ROWS);
          slice.forEach((cell, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x = Math.round((PAGE_W - COLS * CELL) / 2 + col * CELL);
            const y = 250 + row * CELL;
            const qrSize = Math.round(CELL * 0.78);
            ctx.drawImage(
              cell.qr,
              x + Math.round((CELL - qrSize) / 2),
              y,
              qrSize,
              qrSize,
            );
            ctx.fillStyle = "#172f27";
            ctx.font = "700 110px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(
              cell.table > 0 ? `Masa ${cell.table}` : cafe.name,
              x + CELL / 2,
              y + qrSize + 150,
            );
            // Subtitle: cafe name only (table is already on the line above),
            // shrunk to fit the cell so neighboring cards never overlap.
            fitText(
              ctx,
              cafe.name,
              x + CELL / 2,
              y + qrSize + 250,
              CELL - 40,
              78,
            );
          });
          rendered.push(page.toDataURL("image/png"));
        }
        if (active) setPages(rendered);
      } catch (e) {
        if (active) setError((e as Error).message || "Sayfa oluşturulamadı.");
      }
    })();
    return () => {
      active = false;
    };
  }, [params?.id]);

  if (error)
    return (
      <main className="auth-page">
        <div className="auth-main">
          <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
            <h2>Yazdırma sayfası hazırlanamadı.</h2>
            <p>{error}</p>
            <button className="btn primary full" onClick={() => router.back()}>
              Geri dön
            </button>
          </form>
        </div>
      </main>
    );

  return (
    <main className="print-sheet-page">
      <header className="print-sheet-header">
        <div>
          <h1>Masa QR kâğıtları</h1>
          <p>
            {meta?.name} · A4 · 300dpi · her kart: QR + masa numarası + işletme
            adı + fincan logosu
          </p>
        </div>
        <button
          className="btn primary"
          disabled={!pages.length}
          onClick={() => {
            for (let i = 0; i < pages.length; i++) {
              const a = document.createElement("a");
              a.href = pages[i];
              a.download = `fincan-masa-qr-${meta?.slug ?? "qr"}-sayfa-${
                i + 1
              }.png`;
              a.click();
            }
          }}
        >
          <Download size={16} /> PNG indir
        </button>
      </header>
      {pages.length ? (
        pages.map((src, i) => (
          <img
            key={i}
            src={src}
            width={PAGE_W}
            height={PAGE_H}
            alt={`Masa QR kâğıdı sayfa ${i + 1}`}
            className="print-sheet-preview"
          />
        ))
      ) : (
        <LoaderCircle className="spin" size={28} />
      )}
    </main>
  );
}


