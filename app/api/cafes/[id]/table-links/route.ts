import { asUser, owner, userJwt, fail } from "@/lib/server";
import { signTableOrder } from "@/lib/table-order-token";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await owner(request);
    const { id } = await params;
    if (!UUID.test(id))
      return Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
    const { data, error } = await asUser(userJwt(request))
      .from("cafes")
      .select("id, slug, table_count")
      .eq("id", id)
      .limit(1);
    if (error) throw error;
    const cafe = data?.[0];
    if (!cafe)
      return Response.json({ error: "Kafe bulunamadı." }, { status: 404 });
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
    return Response.json({ links });
  } catch (error) {
    return fail(error);
  }
}

export const dynamic = "force-dynamic";
