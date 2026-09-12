import { db, owner, fail, sameOrigin } from "@/lib/server";
import { cafeSchema } from "@/lib/menu";
export async function GET() {
  try {
    const uid = await owner();
    const rows = await db()
      .prepare("SELECT * FROM cafes WHERE owner=? ORDER BY created_at DESC")
      .bind(uid)
      .all();
    return Response.json(
      rows.results.map((r) => ({
        ...JSON.parse(String(r.data)),
        id: r.id,
        createdAt: r.created_at,
      })),
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    const uid = await owner();
    if (!sameOrigin(req))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    const result = cafeSchema.safeParse(await req.json());
    if (!result.success)
      return Response.json(
        { error: result.error.issues[0].message },
        { status: 400 },
      );
    const c = result.data;
    const used = await db()
      .prepare("SELECT id FROM cafes WHERE slug=?")
      .bind(c.slug)
      .first();
    if (used)
      return Response.json(
        { error: "Bu menü adresi kullanılıyor. Başka bir adres seçin." },
        { status: 409 },
      );
    const id = crypto.randomUUID(),
      createdAt = new Date().toISOString();
    await db()
      .prepare(
        "INSERT INTO cafes (id,owner,slug,name,data,created_at) VALUES (?,?,?,?,?,?)",
      )
      .bind(id, uid, c.slug, c.name, JSON.stringify(c), createdAt)
      .run();
    return Response.json({ ...c, id, createdAt }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
