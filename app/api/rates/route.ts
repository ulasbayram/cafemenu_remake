import { db, fail } from "@/lib/server";

type RateRow = { USD: number; EUR: number; date: string; source: string };

export async function GET() {
  try {
    const sql = db();
    const [old] = await sql`
      SELECT data, fetched_at FROM rates WHERE key = 'TRY' LIMIT 1`;
    if (old && Date.now() - new Date(old.fetched_at).getTime() < 6 * 3600000)
      return Response.json({ ...(old.data as RateRow), stale: false });
    try {
      const response = await fetch(
        "https://api.frankfurter.dev/v2/rates?base=TRY&quotes=USD,EUR&providers=ECB",
        { signal: AbortSignal.timeout(8000) },
      );
      if (!response.ok) throw new Error("Kur servisi yanıt vermedi");
      const rows = (await response.json()) as {
        quote: string;
        rate: number;
        date: string;
      }[];
      const usd = rows.find((r) => r.quote === "USD"),
        eur = rows.find((r) => r.quote === "EUR");
      if (!usd || !eur || !(usd.rate > 0) || !(eur.rate > 0))
        throw new Error("Geçersiz kur");
      const data: RateRow = {
        USD: usd.rate,
        EUR: eur.rate,
        date: usd.date,
        source: "ECB · Frankfurter",
      };
      await sql`
        INSERT INTO rates (key, data, fetched_at) VALUES ('TRY', ${JSON.stringify(data)}::jsonb, now())
        ON CONFLICT (key) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`;
      return Response.json({ ...data, stale: false });
    } catch (e) {
      if (old)
        return Response.json({ ...(old.data as RateRow), stale: true });
      console.error(e);
      return Response.json(
        {
          error:
            "Kur bilgisi şu an alınamıyor. Fiyatlar TL olarak gösteriliyor.",
        },
        { status: 503 },
      );
    }
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";