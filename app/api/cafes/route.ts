import { db, owner, fail, sameOrigin } from "@/lib/server";
import { cafeSchema } from "@/lib/menu";

export async function GET() {
  try {
    const uid = await owner(new Request("http://local"));
    const sql = db();
    const rows =
      await sql`SELECT id, name, location, social, published, table_count, logo_url, data, created_at
                FROM cafes WHERE owner = ${uid} ORDER BY created_at DESC`;
    return Response.json(
      rows.map((r) => ({
        ...(r.data as object),
        name: r.name,
        location: r.location,
        socialLinks: r.social,
        published: r.published,
        tableCount: Number(r.table_count),
        logoUrl: r.logo_url ?? undefined,
        id: r.id,
        createdAt: new Date(r.created_at).toISOString(),
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
    const sql = db();
    const used =
      await sql`SELECT id FROM cafes WHERE slug = ${c.slug} LIMIT 1`;
    if (used.length)
      return Response.json(
        { error: "Bu menü adresi kullanılıyor. Başka bir adres seçin." },
        { status: 409 },
      );
    const id = crypto.randomUUID();
    const [row] = await sql`
      INSERT INTO cafes (id, owner, slug, name, location, social, published, table_count, data, created_at, updated_at)
      VALUES (${id}, ${uid}, ${c.slug}, ${c.name}, ${c.location ?? ""},
              ${JSON.stringify(c.socialLinks ?? {})}::jsonb, ${c.published},
              ${c.tableCount ?? 0}, ${JSON.stringify({ ...c, name: undefined, slug: undefined, location: undefined, socialLinks: undefined, published: undefined, tableCount: undefined })}::jsonb,
              now(), now())
      RETURNING id, created_at`;
    return Response.json(
      {
        ...c,
        id: row.id,
        createdAt: new Date(row.created_at).toISOString(),
      },
      { status: 201 },
    );
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";