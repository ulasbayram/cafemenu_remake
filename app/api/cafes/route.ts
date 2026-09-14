import { asUser, isUniqueViolation, owner, userJwt, fail, sameOrigin } from "@/lib/server";
import { cafeSchema } from "@/lib/menu";

export async function GET(request: Request) {
  try {
    await owner(request);
    const { data, error } = await asUser(userJwt(request))
      .from("cafes")
      .select("id, slug, name, location, social, published, table_count, logo_url, data, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json(
      data.map((r) => ({
        ...(r.data as object),
        slug: r.slug,
        name: r.name,
        location: r.location,
        socialLinks: r.social,
        published: r.published,
        tableCount: Number(r.table_count),
        logoUrl:
          r.logo_url ?? (r.data as { logoUrl?: string })?.logoUrl ?? undefined,
        id: r.id,
        createdAt: r.created_at,
      })),
    );
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    const uid = await owner(request);
    if (!sameOrigin(request))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    const result = cafeSchema.safeParse(await request.json());
    if (!result.success)
      return Response.json(
        { error: result.error.issues[0].message },
        { status: 400 },
      );
    const c = result.data;
    const payload = {
      id: crypto.randomUUID(),
      owner: uid,
      slug: c.slug,
      name: c.name,
      location: c.location ?? "",
      social: c.socialLinks ?? {},
      published: c.published,
      table_count: c.tableCount ?? 0,
      logo_url: c.logoUrl ?? null,
      data: {
        ...c,
        name: undefined,
        slug: undefined,
        location: undefined,
        socialLinks: undefined,
        published: undefined,
        tableCount: undefined,
        logoUrl: undefined,
      },
    };
    const { data, error } = await asUser(userJwt(request))
      .from("cafes")
      .insert(payload)
      .select("id, created_at")
      .single();
    if (error) {
      if (isUniqueViolation(error))
        return Response.json(
          { error: "Bu menü adresi kullanılıyor. Başka bir adres seçin." },
          { status: 409 },
        );
      throw error;
    }
    return Response.json(
      { ...c, id: data.id, createdAt: data.created_at },
      { status: 201 },
    );
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";