import { svc } from "@/db";
import { verifyAdmin } from "@/lib/jwt";
import { fail } from "@/lib/server";

export async function GET(request: Request) {
  try {
    if (!(await verifyAdmin(request)))
      return Response.json(
        { error: "Admin yetkisi gerekli." },
        { status: 403 },
      );
    const sb = svc();
    const [{ data: users, error }, { data: cafes, error: cafesError }] =
      await Promise.all([
        sb.auth.admin.listUsers({ page: 1, perPage: 500 }),
        sb.from("cafes").select("owner"),
      ]);
    if (error) throw error;
    if (cafesError) throw cafesError;
    const counts = new Map<string, number>();
    for (const cafe of cafes ?? [])
      counts.set(cafe.owner, (counts.get(cafe.owner) ?? 0) + 1);
    return Response.json(
      users.users
        .map((user) => ({
          id: user.id,
          email: user.email ?? "E-posta yok",
          cafes: counts.get(user.id) ?? 0,
          createdAt: user.created_at,
          lastSignInAt: user.last_sign_in_at ?? null,
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  } catch (error) {
    return fail(error);
  }
}

export const dynamic = "force-dynamic";
