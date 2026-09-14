import { svc } from "@/db";
import { verifyAdmin } from "@/lib/jwt";
import { cafeSchema } from "@/lib/menu";
import { fail, sameOrigin } from "@/lib/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getCafe(id: string) {
  const { data, error } = await svc()
    .from("cafes")
    .select(
      "id, slug, name, location, social, published, table_count, logo_url, data, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...((data.data ?? {}) as object),
    id: data.id,
    slug: data.slug,
    name: data.name,
    location: data.location,
    socialLinks: data.social,
    published: data.published,
    tableCount: Number(data.table_count),
    logoUrl:
      data.logo_url ??
      (data.data as { logoUrl?: string })?.logoUrl ??
      undefined,
    createdAt: data.created_at,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await verifyAdmin(request)))
      return Response.json(
        { error: "Admin yetkisi gerekli." },
        { status: 403 },
      );
    const { id } = await params;
    if (!UUID.test(id))
      return Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
    const cafe = await getCafe(id);
    return cafe
      ? Response.json(cafe)
      : Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin)
      return Response.json(
        { error: "Admin yetkisi gerekli." },
        { status: 403 },
      );
    if (!sameOrigin(request))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    const { id } = await params;
    if (!UUID.test(id))
      return Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
    const existing = await getCafe(id);
    if (!existing)
      return Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
    const result = cafeSchema.safeParse(await request.json());
    if (!result.success)
      return Response.json(
        { error: result.error.issues[0].message },
        { status: 400 },
      );
    const cafe = result.data;
    if (cafe.slug !== existing.slug)
      return Response.json(
        {
          error:
            "Basılmış QR kodlarını korumak için menü adresi değiştirilemez.",
        },
        { status: 400 },
      );
    const { error } = await svc()
      .from("cafes")
      .update({
        name: cafe.name,
        location: cafe.location ?? "",
        social: cafe.socialLinks ?? {},
        published: cafe.published,
        table_count: cafe.tableCount ?? 0,
        logo_url: cafe.logoUrl ?? null,
        data: {
          ...cafe,
          name: undefined,
          slug: undefined,
          location: undefined,
          socialLinks: undefined,
          published: undefined,
          tableCount: undefined,
          logoUrl: undefined,
          lastAdminEdit: { at: new Date().toISOString(), by: admin.id },
        },
      })
      .eq("id", id);
    if (error) throw error;
    return Response.json({ ...cafe, id, createdAt: existing.createdAt });
  } catch (error) {
    return fail(error);
  }
}

export const dynamic = "force-dynamic";
