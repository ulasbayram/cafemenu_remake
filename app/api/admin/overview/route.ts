import { svc } from "@/db";
import { verifyAdmin } from "@/lib/jwt";
import { fail } from "@/lib/server";
import { aggregateVisits, istanbulDay } from "@/lib/visit-stats";

const DAY = 86_400_000;

export async function GET(request: Request) {
  try {
    if (!(await verifyAdmin(request)))
      return Response.json(
        { error: "Admin yetkisi gerekli." },
        { status: 403 },
      );

    const sb = svc();
    const now = Date.now();
    const since7 = new Date(now - 7 * DAY).toISOString();
    const today = istanbulDay(new Date(now));
    const since7Day = istanbulDay(new Date(now - 6 * DAY));
    const since30Day = istanbulDay(new Date(now - 29 * DAY));
    // PostgREST caps individual responses. Read every page before aggregating
    // so chart totals and selected-day details include all recorded visits.
    async function loadRecentVisits() {
      const rows: { cafe: string; day: string; hour: number; name: string }[] =
        [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await sb
          .from("visits")
          .select("cafe, day, hour, cafes(name)")
          .gte("day", since30Day)
          .lte("day", today)
          .order("day")
          .order("cafe")
          .order("visitor")
          .range(offset, offset + 999);
        if (error) throw error;
        for (const row of data ?? []) {
          const cafe = row.cafes as unknown as { name: string } | null;
          rows.push({
            cafe: row.cafe,
            day: row.day,
            hour: row.hour,
            name: cafe?.name ?? "İşletme",
          });
        }
        if (!data || data.length < 1000) break;
      }
      return { data: rows, error: null };
    }
    const [
      cafes,
      published,
      newCafes,
      visits,
      visits7,
      visits30,
      recentVisits,
      rate,
      users,
    ] = await Promise.all([
      sb.from("cafes").select("id", { count: "exact", head: true }),
      sb
        .from("cafes")
        .select("id", { count: "exact", head: true })
        .eq("published", true),
      sb
        .from("cafes")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since7),
      sb.from("visits").select("cafe", { count: "exact", head: true }),
      sb
        .from("visits")
        .select("cafe", { count: "exact", head: true })
        .gte("day", since7Day)
        .lte("day", today),
      sb
        .from("visits")
        .select("cafe", { count: "exact", head: true })
        .gte("day", since30Day)
        .lte("day", today),
      loadRecentVisits(),
      sb.from("rates").select("fetched_at").eq("key", "TRY").maybeSingle(),
      sb.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    for (const result of [
      cafes,
      published,
      newCafes,
      visits,
      visits7,
      visits30,
      recentVisits,
      rate,
    ])
      if (result.error) throw result.error;
    if (users.error) throw users.error;

    const byDay: Record<string, number> = {};
    const active = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const day = istanbulDay(new Date(now - (29 - i) * DAY));
      byDay[day] = 0;
    }
    for (const row of recentVisits.data ?? []) {
      byDay[row.day] = (byDay[row.day] ?? 0) + 1;
      active.add(row.cafe);
    }

    const allUsers = users.data.users;
    return Response.json({
      cafes: cafes.count ?? 0,
      publishedCafes: published.count ?? 0,
      newCafes7d: newCafes.count ?? 0,
      visitsTotal: visits.count ?? 0,
      visits7d: visits7.count ?? 0,
      visits30d: visits30.count ?? 0,
      activeCafes30d: active.size,
      users: users.data.total ?? allUsers.length,
      newUsers7d: allUsers.filter((user) => user.created_at >= since7).length,
      series: Object.entries(byDay).map(([day, count]) => ({ day, count })),
      today,
      visitBuckets: aggregateVisits(recentVisits.data),
      visitCafes: [
        ...new Map(
          recentVisits.data.map((row) => [
            row.cafe,
            { id: row.cafe, name: row.name },
          ]),
        ).values(),
      ],
      ratesFetchedAt: rate.data?.fetched_at ?? null,
    });
  } catch (error) {
    return fail(error);
  }
}

export const dynamic = "force-dynamic";
