import { db, owner, fail } from "@/lib/server";
export async function GET() {
  try {
    const uid = await owner();
    const since = new Date(Date.now() - 29 * 86400000).toLocaleDateString(
      "en-CA",
      { timeZone: "Europe/Istanbul" },
    );
    const rows = await db()
      .prepare(
        "SELECT v.cafe,v.day,v.hour,COUNT(*) as count FROM visits v JOIN cafes c ON c.id=v.cafe WHERE c.owner=? AND v.day>=? GROUP BY v.cafe,v.day,v.hour",
      )
      .bind(uid, since)
      .all();
    return Response.json(rows.results);
  } catch (e) {
    return fail(e);
  }
}
