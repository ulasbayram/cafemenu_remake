import { asUser, owner, userJwt, fail } from "@/lib/server";
import { enterpriseAssignment } from "@/enterprise/server";
import { istanbulDay, aggregateVisits } from "@/lib/visit-stats";
import type { Cafe } from "@/lib/menu";
import type { OrderLine } from "@/lib/orders";
export async function GET(request: Request) {
  try {
    const uid = await owner(request),
      jwt = userJwt(request);
    const requested =
      new URL(request.url).searchParams.get("cafe") ?? undefined;
    const assignment = await enterpriseAssignment(
      "package-a",
      uid,
      jwt,
      requested,
    );
    if (!assignment)
      return Response.json(
        { error: "Bu özel çalışma alanına erişiminiz yok." },
        { status: 403 },
      );
    const cafeId = assignment.cafeId,
      client = asUser(jwt);
    const today = istanbulDay(new Date()),
      since = istanbulDay(new Date(Date.now() - 6 * 86400000));
    const { data: cafe, error } = await client
      .from("cafes")
      .select(
        "id, slug, name, location, social, published, table_count, logo_url, data, created_at",
      )
      .eq("id", cafeId)
      .eq("owner", uid)
      .maybeSingle();
    if (error) throw error;
    if (!cafe)
      return Response.json({ error: "İşletme bulunamadı." }, { status: 404 });
    const visits: { cafe: string; day: string; hour: number }[] = [];
    const orders: {
      id: string;
      cafe: string;
      table_no: number;
      total: number;
      payment_method?: "cash" | "card" | null;
      receipt_discount?: number;
      status: string;
      created_at: string;
      updated_at: string;
      items: OrderLine[];
    }[] = [];
    // Scope both queries on every page. Same package never grants cross-cafe access.
    await Promise.all([
      (async () => {
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await client
            .from("visits")
            .select("cafe, day, hour")
            .eq("cafe", cafeId)
            .gte("day", since)
            .lte("day", today)
            .order("day")
            .order("visitor")
            .range(offset, offset + 999);
          if (error) throw error;
          visits.push(...(data ?? []));
          if (!data || data.length < 1000) break;
        }
      })(),
      (async () => {
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await client
            .from("orders")
            .select("*")
            .eq("cafe", cafeId)
            .gte("created_at", `${since}T00:00:00+03:00`)
            .order("created_at", { ascending: false })
            .order("id")
            .range(offset, offset + 999);
          if (error) throw error;
          orders.push(...(data ?? []));
          if (!data || data.length < 1000) break;
        }
      })(),
    ]);
    return Response.json({
      today,
      cafe: {
        ...(cafe.data as object),
        id: cafe.id,
        name: cafe.name,
        slug: cafe.slug,
        location: cafe.location,
        socialLinks: cafe.social,
        published: cafe.published,
        tableCount: Number(cafe.table_count),
        logoUrl: cafe.logo_url ?? null,
        createdAt: cafe.created_at,
      } as Cafe,
      visits: aggregateVisits(visits),
      orders: orders.map((row) => ({
        id: row.id,
        cafe: row.cafe,
        table: row.table_no,
        total: Number(row.total),
        paymentMethod: row.payment_method ?? null,
        receiptDiscount: Number(row.receipt_discount ?? 0),
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        items: row.items,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}
