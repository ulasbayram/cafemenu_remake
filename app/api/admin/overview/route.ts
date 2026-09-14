import { svc } from "@/db";
import { verifyAdmin } from "@/lib/jwt";
import { fail } from "@/lib/server";

export async function GET(request: Request) {
  try {
    if (!(await verifyAdmin(request)))
      return Response.json({ error: "Bu sayfa size ait değil." }, { status: 403 });
    const { data, error } = await svc().rpc("admin_overview");
    if (error) throw error;
    const r = data as {
      cafes: number;
      published_cafes: number;
      new_cafes_7d: number;
      visits_total: number;
      visits_7d: number;
      visits_30d: number;
      active_cafes_30d: number;
      users: number;
      new_users_7d: number;
    };
    const series = await svc()
      .from("visits")
      .select("day")
      .gte("day", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
    const byDay: Record<string, number> = {};
    for (const row of series.data ?? [])
      byDay[row.day] = (byDay[row.day] ?? 0) + 1;
    const [rateRow] = (await svc()
      .from("rates")
      .select("fetched_at")
      .eq("key", "TRY")
      .limit(1)).data ?? [];
    return Response.json({
      cafes: Number(r.cafes),
      publishedCafes: Number(r.published_cafes),
      newCafes7d: Number(r.new_cafes_7d),
      visitsTotal: Number(r.visits_total),
      visits7d: Number(r.visits_7d),
      visits30d: Number(r.visits_30d),
      activeCafes30d: Number(r.active_cafes_30d),
      users: Number(r.users),
      newUsers7d: Number(r.new_users_7d),
      series: Object.entries(byDay).map(([day, count]) => ({ day, count })),
      ratesFetchedAt: rateRow?.fetched_at ?? null,
    });
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";