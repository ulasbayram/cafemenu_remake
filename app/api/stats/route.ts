import { asUser, owner, userJwt, fail } from "@/lib/server";

export async function GET(request: Request) {
  try {
    await owner(request);
    const { data, error } = await asUser(userJwt(request)).rpc("visits_stats");
    if (error) throw error;
    return Response.json(
      data.map((r: Record<string, unknown>) => ({
        cafe: r.cafe,
        day: r.day,
        hour: Number(r.hour),
        count: Number(r.count),
        ...(r.table_no != null ? { table: Number(r.table_no) } : {}),
      })),
    );
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";