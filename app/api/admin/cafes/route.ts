import { db, fail } from "@/lib/server";
import { verifyAdmin } from "@/lib/jwt";

export async function GET(request: Request) {
  try {
    if (!(await verifyAdmin(request)))
      return Response.json({ error: "Bu sayfa size ait değil." }, { status: 403 });
    const { search } = new URL(request.url);
    const q = typeof search === "string" ? `%${search.toLowerCase()}%` : "%";
    const sql = db();
    const rows = await sql`
      SELECT c.id, c.slug, c.name, c.published, c.table_count, c.created_at,
             u.email AS owner_email,
             (SELECT COUNT(*)::int FROM visits v WHERE v.cafe = c.id) AS visits_total,
             (SELECT MAX(day::text) FROM visits v WHERE v.cafe = c.id) AS last_visit
      FROM cafes c
      LEFT JOIN auth.users u ON u.id = c.owner
      WHERE LOWER(c.name) LIKE ${q} OR LOWER(c.slug) LIKE ${q} OR LOWER(u.email) LIKE ${q}
      ORDER BY c.created_at DESC
      LIMIT 200`;
    return Response.json(
      rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        published: r.published,
        tableCount: Number(r.table_count),
        ownerEmail: r.owner_email,
        visitsTotal: Number(r.visits_total),
        lastVisit: r.last_visit,
        createdAt: new Date(r.created_at).toISOString(),
      })),
    );
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";