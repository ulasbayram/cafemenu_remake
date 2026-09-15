import { z } from "zod";
import { svc } from "@/db";
import { asUser, owner, userJwt, fail, sameOrigin } from "@/lib/server";
import { verifyTableOrder } from "@/lib/table-order-token";
import type { Item } from "@/lib/menu";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const orderInput = z.object({
  cafe: z.string().regex(UUID),
  table: z.number().int().min(1).max(200),
  token: z.string().min(1).max(100),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(50),
});

function mapOrder(row: Record<string, unknown> & { cafes?: unknown }) {
  const cafe = Array.isArray(row.cafes) ? row.cafes[0] : row.cafes;
  return {
    id: row.id,
    cafeId: row.cafe,
    cafeName:
      cafe && typeof cafe === "object" && "name" in cafe
        ? String(cafe.name)
        : "Kafe",
    tableNo: Number(row.table_no),
    status: row.status,
    items: row.items,
    total: Number(row.total),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request) {
  try {
    await owner(request);
    const cafe = new URL(request.url).searchParams.get("cafe");
    let query = asUser(userJwt(request))
      .from("orders")
      .select(
        "id, cafe, table_no, status, items, total, created_at, updated_at, cafes(name)",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    if (cafe && UUID.test(cafe)) query = query.eq("cafe", cafe);
    const { data, error } = await query;
    if (error) throw error;
    return Response.json((data ?? []).map((row) => mapOrder(row)));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    const parsed = orderInput.safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        { error: "Sipariş bilgileri geçersiz." },
        { status: 400 },
      );
    const input = parsed.data;
    if (!(await verifyTableOrder(input.cafe, input.table, input.token)))
      return Response.json(
        { error: "Sipariş yalnızca masa QR kodundan verilebilir." },
        { status: 403 },
      );
    const client = svc();
    const { data, error } = await client
      .from("cafes")
      .select("id, published, table_count, data")
      .eq("id", input.cafe)
      .limit(1);
    if (error) throw error;
    const cafe = data?.[0];
    if (!cafe || !cafe.published || input.table > Number(cafe.table_count ?? 0))
      return Response.json(
        { error: "Masa siparişe açık değil." },
        { status: 404 },
      );

    const products = Array.isArray(cafe.data?.items)
      ? (cafe.data.items as Item[])
      : [];
    const requested = new Map(
      input.items.map((item) => [item.id, item.quantity]),
    );
    const lines = products
      .filter((item) => item.available && requested.has(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: requested.get(item.id)!,
        unitPrice: item.price,
      }));
    if (lines.length !== requested.size)
      return Response.json(
        { error: "Sepette artık satışta olmayan bir ürün var." },
        { status: 409 },
      );
    const total = lines.reduce(
      (sum, line) => sum + line.unitPrice * line.quantity,
      0,
    );
    const { data: created, error: insertError } = await client
      .from("orders")
      .insert({
        cafe: input.cafe,
        table_no: input.table,
        status: "waiting",
        items: lines,
        total,
      })
      .select("id, status, created_at")
      .single();
    if (insertError) throw insertError;
    return Response.json(
      {
        id: created.id,
        status: created.status,
        createdAt: created.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    return fail(error);
  }
}

export const dynamic = "force-dynamic";
