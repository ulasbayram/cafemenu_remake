import { db, fail } from "@/lib/server";
export async function GET() {
  try {
    const old = await db()
      .prepare("SELECT * FROM rates WHERE key=?")
      .bind("TRY")
      .first();
    if (old && Date.now() - Number(old.fetched_at) < 6 * 3600000)
      return Response.json({ ...JSON.parse(String(old.data)), stale: false });
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
      const data = {
        USD: usd.rate,
        EUR: eur.rate,
        date: usd.date,
        source: "ECB · Frankfurter",
      };
      await db()
        .prepare(
          "INSERT INTO rates (key,data,fetched_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,fetched_at=excluded.fetched_at",
        )
        .bind("TRY", JSON.stringify(data), Date.now())
        .run();
      return Response.json({ ...data, stale: false });
    } catch (e) {
      if (old)
        return Response.json({ ...JSON.parse(String(old.data)), stale: true });
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
