import {
  asUser,
  isUniqueViolation,
  owner,
  userJwt,
  fail,
  sameOrigin,
} from "@/lib/server";
import { cafeSchema } from "@/lib/menu";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const uid = await owner(request);
    const { id } = await params;
    if (!UUID.test(id))
      return Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
    const { data, error } = await asUser(userJwt(request))
      .from("cafes")
      .select("id, name, location, social, published, table_count, logo_url, data, created_at")
      .eq("id", id)
      .limit(1);
    if (error) throw error;
    const row = data?.[0];
    if (!row)
      return Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
    return Response.json({
      ...((row.data ?? {}) as object),
      name: row.name,
      location: row.location,
      socialLinks: row.social,
      published: row.published,
      tableCount: Number(row.table_count),
      logoUrl: row.logo_url ?? undefined,
      id: row.id,
      createdAt: row.created_at,
    });
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await owner(request);
    if (!sameOrigin(request))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    const { id } = await params;
    if (!UUID.test(id))
      return Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
    const client = asUser(userJwt(request));
    const result = cafeSchema.safeParse(await request.json());
    if (!result.success)
      return Response.json(
        { error: result.error.issues[0].message },
        { status: 400 },
      );
    const c = result.data;
    const { data: existingRows } = await client
      .from("cafes")
      .select("id, slug, created_at")
      .eq("id", id)
      .limit(1);
    const existing = existingRows?.[0];
    if (!existing)
      return Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
    if (c.slug !== existing.slug)
      return Response.json(
        {
          error:
            "Basılmış QR kodlarını korumak için menü adresi değiştirilemez.",
        },
        { status: 400 },
      );
    const { error } = await client
      .from("cafes")
      .update({
        name: c.name,
        location: c.location ?? "",
        social: c.socialLinks ?? {},
        published: c.published,
        table_count: c.tableCount ?? 0,
        data: {
          ...c,
          name: undefined,
          slug: undefined,
          location: undefined,
          socialLinks: undefined,
          published: undefined,
          tableCount: undefined,
        },
      })
      .eq("id", id);
    if (error) {
      if (isUniqueViolation(error))
        return Response.json(
          { error: "Bu menü adresi kullanılıyor. Başka bir adres seçin." },
          { status: 409 },
        );
      throw error;
    }
    return Response.json({ ...c, id, createdAt: existing.created_at });
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";