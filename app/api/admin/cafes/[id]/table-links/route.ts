import { svc } from "@/db";
import { verifyAdmin } from "@/lib/jwt";
import { fail } from "@/lib/server";
import { signTableOrder } from "@/lib/table-order-token";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await verifyAdmin(request)))
      return Response.json({ error: "Yetkisiz." }, { status: 403 });
    const { id } = await params;
    if (!UUID.test(id))
      return Response.json({ error: "İşletme bulunamadı." }, { status: 404 });
    const { data, error } = await svc()
      .from("cafes")
      .select("id, slug, name, table_count")
      .eq("id", id)
      .limit(1);
    if (error) throw error;
    const cafe = data?.[0];
    if (!cafe)
      return Response.json({ error: "İşletme bulunamadı." }, { status: 404 });
    const count = Number(cafe.table_count ?? 0);
    const links = await Promise.all(
      Array.from({ length: count }, async (_, index) => {
        const table = index + 1;
        const token = await signTableOrder(id, table);
        return {
          table,
          path: `/menu/${cafe.slug}?table=${table}&order=${token}`,
        };
      }),
    );
    return Response.json({
      slug: cafe.slug,
      name: cafe.name,
      links,
    });
  } catch (error) {
    return fail(error);
  }
}

export const dynamic = "force-dynamic";
