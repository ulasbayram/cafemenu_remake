import { svc } from "@/db";
import { verifyAdmin } from "@/lib/jwt";
import { fail } from "@/lib/server";

export async function GET(request: Request) {
  try {
    if (!(await verifyAdmin(request)))
      return Response.json({ error: "Bu sayfa size ait değil." }, { status: 403 });
    const { search } = new URL(request.url);
    const q = typeof search === "string" ? search.slice(0, 100) : "";
    const { data, error } = await svc().rpc("admin_cafes", { search: q });
    if (error) throw error;
    return Response.json(
      data.map(
        (r: {
          id: string;
          slug: string;
          name: string;
          published: boolean;
          table_count: number;
          created_at: string;
          owner_email: string | null;
          visits_total: number;
          last_visit: string | null;
        }) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          published: r.published,
          tableCount: Number(r.table_count),
          ownerEmail: r.owner_email,
          visitsTotal: Number(r.visits_total),
          lastVisit: r.last_visit,
          createdAt: r.created_at,
        }),
      ),
    );
  } catch (e) {
    return fail(e);
  }
}
export const dynamic = "force-dynamic";