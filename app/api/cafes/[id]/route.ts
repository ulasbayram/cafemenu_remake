import { db, owner, fail, sameOrigin } from "@/lib/server";
import { cafeSchema } from "@/lib/menu";
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const uid = await owner();
    if (!sameOrigin(req))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    const { id } = await params;
    const existing = await db()
      .prepare("SELECT * FROM cafes WHERE id=? AND owner=?")
      .bind(id, uid)
      .first();
    if (!existing)
      return Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
    const result = cafeSchema.safeParse(await req.json());
    if (!result.success)
      return Response.json(
        { error: result.error.issues[0].message },
        { status: 400 },
      );
    if (result.data.slug !== existing.slug)
      return Response.json(
        {
          error:
            "Basılmış QR kodlarını korumak için menü adresi değiştirilemez.",
        },
        { status: 400 },
      );
    await db()
      .prepare("UPDATE cafes SET name=?,data=? WHERE id=? AND owner=?")
      .bind(result.data.name, JSON.stringify(result.data), id, uid)
      .run();
    return Response.json({
      ...result.data,
      id,
      createdAt: existing.created_at,
    });
  } catch (e) {
    return fail(e);
  }
}
