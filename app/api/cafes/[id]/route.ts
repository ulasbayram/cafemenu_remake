import { db, owner, fail, sameOrigin } from "@/lib/server";
import { cafeSchema } from "@/lib/menu";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const uid = await owner(request);
    if (!sameOrigin(request))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    const { id } = await params;
    if (!UUID.test(id))
      return Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
    const sql = db();
    const [existing] = await sql`
      SELECT id, slug, created_at FROM cafes WHERE id = ${id} AND owner = ${uid}`;
    if (!existing)
      return Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
    const result = cafeSchema.safeParse(await request.json());
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
    const c = result.data;
    await sql`
      UPDATE cafes SET
        name = ${c.name},
        location = ${c.location ?? ""},
        social = ${JSON.stringify(c.socialLinks ?? {})}::jsonb,
        published = ${c.published},
        table_count = ${c.tableCount ?? 0},
        data = ${JSON.stringify({ ...c, name: undefined, slug: undefined, location: undefined, socialLinks: undefined, published: undefined, tableCount: undefined })}::jsonb,
        updated_at = now()
      WHERE id = ${id} AND owner = ${uid}`;
    return Response.json({
      ...c,
      id,
      createdAt: new Date(existing.created_at).toISOString(),
    });
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";