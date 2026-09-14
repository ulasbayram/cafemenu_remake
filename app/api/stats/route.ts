import { db, owner, fail } from "@/lib/server";

export async function GET() {
  try {
    const uid = await owner(new Request("http://local"));
    const since = new Date(Date.now() - 29 * 86400000).toLocaleDateString(
      "en-CA",
      { timeZone: "Europe/Istanbul" },
    );
    const sql = db();
    const rows = await sql`
      SELECT v.cafe, v.day, v.hour, COUNT(*)::int AS count, MIN(v.table_no) AS table_no
      FROM visits v
      JOIN cafes c ON c.id = v.cafe
      WHERE c.owner = ${uid} AND v.day >= ${since}
      GROUP BY v.cafe, v.day, v.hour`;
    return Response.json(
      rows.map((r) => ({
        cafe: r.cafe,
        day: r.day,
        hour: Number(r.hour),
        count: Number(r.count),
        ...(r.table_no != null ? { table: Number(r.table_no) } : {}),
      })),
    );
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";