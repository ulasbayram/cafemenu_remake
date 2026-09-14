import { svc } from "@/db";
import { fail } from "@/lib/server";

type RateRow = { USD: number; EUR: number; date: string; source: string };

export async function GET() {
  try {
    const { data: old, error: oldErr } = await svc()
      .from("rates")
      .select("data, fetched_at")
      .eq("key", "TRY")
      .limit(1);
    if (oldErr) throw oldErr;
    if (old?.[0] && Date.now() - new Date(old[0].fetched_at).getTime() < 6 * 3600000)
      return Response.json({ ...old[0].data, stale: false });
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
      const { error } = await svc()
        .from("rates")
        .upsert(
          { key: "TRY", data, fetched_at: new Date().toISOString() },
          { onConflict: "key" },
        );
      if (error) throw error;
      return Response.json({ ...data, stale: false });
    } catch (e) {
      if (old?.[0]) return Response.json({ ...old[0].data, stale: true });
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