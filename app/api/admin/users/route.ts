import { svc } from "@/db";
import { verifyAdmin } from "@/lib/jwt";
import { fail } from "@/lib/server";

export async function GET(request: Request) {
  try {
    if (!(await verifyAdmin(request)))
      return Response.json({ error: "Bu sayfa size ait değil." }, { status: 403 });
    const { data, error } = await svc().rpc("admin_users");
    if (error) throw error;
    return Response.json(
      data.map((r: { id: string; email: string; created_at: string; cafes: number }) => ({
        id: r.id,
        email: r.email,
        cafes: Number(r.cafes),
        createdAt: r.created_at,
      })),
    );
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";