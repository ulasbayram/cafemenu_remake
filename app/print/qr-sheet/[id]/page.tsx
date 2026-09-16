"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, LoaderCircle } from "lucide-react";
import { api } from "@/lib/client-api";
import type { Cafe } from "@/lib/menu";

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
        const qrcode = await import("qrcode");
        // Fincan logo bitmap (favicon) for the QR center.
        const logo = await new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = "/favicon.svg";
        });
        const cells: { qr: HTMLCanvasElement; table: number }[] = [];
        const allLinks =
          links.length > 0
            ? links
            : [{ table: 0, path: `/menu/${cafe.slug}` }];
        for (const link of allLinks) {
          const matrix = await qrcode.create(link.path, {
            errorCorrectionLevel: "H",
          });
          const size = matrix.modules.size;
          const quiet = 4;
          const cellCanvas = document.createElement("canvas");
          const scale = 8; // supersample: QR at 8px/module
          cellCanvas.width = cellCanvas.height =
            (size + quiet * 2) * scale;
          const ctx = cellCanvas.getContext("2d");
          if (!ctx) throw new Error("canvas");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, cellCanvas.width, cellCanvas.height);
          ctx.fillStyle = "#172f27";
          const moduleSize = scale;
          for (let y = 0; y < size; y++)
            for (let x = 0; x < size; x++)
              if (matrix.modules.data[y * size + x])
                ctx.fillRect(
                  (quiet + x) * scale,
                  (quiet + y) * scale,
                  moduleSize,
                  moduleSize,
                );
          // Centered Fincan logo, ≤24% of QR width, white surround.
          if (logo) {
            const logoW = Math.round(cellCanvas.width * 0.22);
            const pad = Math.round(logoW * 0.08);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(
              Math.round((cellCanvas.width - logoW) / 2 - pad),
              Math.round((cellCanvas.width - logoW) / 2 - pad),
              logoW + pad * 2,
              logoW + pad * 2,
            );
            const r = 12;
            const x0 = (cellCanvas.width - logoW) / 2;
            const y0 = (cellCanvas.width - logoW) / 2;
            ctx.beginPath();
            ctx.moveTo(y0 + r, y0);
            ctx.arcTo(x0 + logoW, y0, x0 + logoW, y0 + logoW, r);
            ctx.arcTo(x0 + logoW, y0 + logoW, x0, y0 + logoW, r);
            ctx.arcTo(x0, y0 + logoW, x0, y0, r);
            ctx.arcTo(x0, y0, x0 + logoW, y0, r);
            ctx.closePath();
            ctx.fill();
            if (logo) ctx.drawImage(logo, x0, y0, logoW, logoW);
          }
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
            ctx.font = "400 78px sans-serif";
            ctx.fillStyle = "#4b5c55";
            ctx.fillText(
              cell.table > 0 ? `${cafe.name} · masa ${cell.table}` : "Menü",
              x + CELL / 2,
              y + qrSize + 250,
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


