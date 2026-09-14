import { db, fail } from "@/lib/server";
import { verifyAdmin } from "@/lib/jwt";

export async function GET(request: Request) {
  try {
    if (!(await verifyAdmin(request)))
      return Response.json({ error: "Bu sayfa size ait değil." }, { status: 403 });
    const sql = db();
    const [[counts], [visitAgg], series, [recentSignups]] = await Promise.all([
      sql`SELECT
            COUNT(*)::int AS cafes,
            COUNT(*) FILTER (WHERE published)::int AS published_cafes,
            COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS new_cafes_7d
          FROM cafes`,
      sql`SELECT
            COUNT(*)::int AS visits_total,
            COUNT(*) FILTER (WHERE day >= (now() - interval '7 days')::date)::int AS visits_7d,
            COUNT(*) FILTER (WHERE day >= (now() - interval '30 days')::date)::int AS visits_30d,
            COUNT(DISTINCT cafe) FILTER (WHERE day >= (now() - interval '30 days')::date)::int AS active_cafes_30d
          FROM visits`,
      sql`SELECT day::text AS day, COUNT(*)::int AS count
          FROM visits
          WHERE day >= (now() - interval '30 days')::date
          GROUP BY day ORDER BY day`,
      sql`SELECT COUNT(*)::int AS users FROM auth.users WHERE created_at > now() - interval '7 days'`,
    ]);
    const [userCount] = await sql`SELECT COUNT(*)::int AS users FROM auth.users`;
    const [rateRow] =
      await sql`SELECT fetched_at FROM rates WHERE key = 'TRY' LIMIT 1`;
    return Response.json({
      cafes: counts.cafes,
      publishedCafes: counts.published_cafes,
      newCafes7d: counts.new_cafes_7d,
      visitsTotal: visitAgg.visits_total,
      visits7d: visitAgg.visits_7d,
      visits30d: visitAgg.visits_30d,
      activeCafes30d: visitAgg.active_cafes_30d,
      users: userCount.users,
      newUsers7d: recentSignups.users,
      series,
      ratesFetchedAt: rateRow?.fetched_at ?? null,
    });
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";