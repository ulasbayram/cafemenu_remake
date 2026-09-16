import { asUser, owner, userJwt, fail } from "@/lib/server";

/** Owner-scoped order aggregates for the dashboard stats tab. */
export async function GET(request: Request) {
  try {
    await owner(request);
    const { data, error } = await asUser(userJwt(request))
      .from("orders")
      .select("id, cafe, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw error;
    return Response.json(
      (data ?? []).map((r) => ({
        id: r.id,
        cafe: r.cafe,
        total: Number(r.total),
        status: r.status,
        createdAt: r.created_at,
      })),
    );
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";
