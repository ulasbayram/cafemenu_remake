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

    const search =
      new URL(request.url).searchParams.get("search")?.trim().slice(0, 100) ??
      "";
    const sb = svc();
    const { data, error } = await sb
      .from("cafes")
      .select(
        "id, owner, slug, name, location, published, table_count, logo_url, data, created_at, updated_at, visits(count)",
      )
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const owners = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (owners.error) throw owners.error;
    const ownerEmails = new Map(
      owners.data.users.map((user) => [user.id, user.email ?? null]),
    );
    const ids = (data ?? []).map((row) => row.id);
    const visitRows = ids.length
      ? await sb
          .from("visits")
          .select("cafe, day")
          .in("cafe", ids)
          .order("day", { ascending: false })
          .limit(10000)
      : { data: [], error: null };
    if (visitRows.error) throw visitRows.error;
    const visits = new Map<string, { total: number; last: string | null }>();
    for (const row of visitRows.data ?? []) {
      const current = visits.get(row.cafe) ?? { total: 0, last: null };
      current.total += 1;
      current.last =
        !current.last || row.day > current.last ? row.day : current.last;
      visits.set(row.cafe, current);
    }

    const normalizedSearch = search.toLocaleLowerCase("tr");
    return Response.json(
      (data ?? [])
        .map((row) => {
          const menu = (row.data ?? {}) as {
            items?: unknown[];
            subtitle?: string;
          };
          const activity = visits.get(row.id);
          return {
            id: row.id,
            slug: row.slug,
            name: row.name,
            subtitle: menu.subtitle ?? "",
            location: row.location,
            logoUrl: row.logo_url,
            published: row.published,
            tableCount: Number(row.table_count),
            itemCount: Array.isArray(menu.items) ? menu.items.length : 0,
            ownerId: row.owner,
            ownerEmail: ownerEmails.get(row.owner) ?? null,
            visitsTotal:
              (row.visits as unknown as { count?: number }[])?.[0]?.count ??
              activity?.total ??
              0,
            lastVisit: activity?.last ?? null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        })
        .filter(
          (row) =>
            !normalizedSearch ||
            [row.name, row.slug, row.location, row.ownerEmail ?? ""].some(
              (value) =>
                value.toLocaleLowerCase("tr").includes(normalizedSearch),
            ),
        ),
    );
  } catch (error) {
    return fail(error);
  }
}

export const dynamic = "force-dynamic";
