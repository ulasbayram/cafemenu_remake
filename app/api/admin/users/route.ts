import { db, fail } from "@/lib/server";
import { verifyAdmin } from "@/lib/jwt";

export async function GET(request: Request) {
  try {
    if (!(await verifyAdmin(request)))
      return Response.json({ error: "Bu sayfa size ait değil." }, { status: 403 });
    const sql = db();
    const rows = await sql`
      SELECT u.id, u.email, u.created_at,
             (SELECT COUNT(*)::int FROM cafes c WHERE c.owner = u.id) AS cafes
      FROM auth.users u
      ORDER BY u.created_at DESC
      LIMIT 500`;
    return Response.json(
      rows.map((r) => ({
        id: r.id,
        email: r.email,
        cafes: Number(r.cafes),
        createdAt: new Date(r.created_at).toISOString(),
      })),
    );
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";