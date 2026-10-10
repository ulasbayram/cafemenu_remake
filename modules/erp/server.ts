import { svc } from "@/db";
import { asUser, owner, userJwt } from "@/lib/server";
import { hasAccountModule } from "@/lib/module-access";
export class ErpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function erpAccess(request: Request, cafeId: string) {
  const uid = await owner(request);
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(cafeId))
    throw new ErpError("İşletme seçin.", 400);
  if (!(await hasAccountModule(uid, "erp")))
    throw new ErpError("Aktif ERP Modülü erişimi gerekli.", 403);
  const { data, error } = await asUser(userJwt(request))
    .from("cafes")
    .select("id, name, data")
    .eq("id", cafeId)
    .eq("owner", uid)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ErpError("İşletme bulunamadı.", 404);
  return {
    uid,
    cafe: {
      id: data.id as string,
      name: data.name as string,
      items: data.data?.items ?? [],
    },
  };
}
export async function erpRows(
  table: string,
  cafeId: string,
  filters: { key: string; from: string; to: string } | null = null,
  limit?: number,
) {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = svc().from(table).select("*").eq("cafe_id", cafeId);
    if (filters)
      query = query.gte(filters.key, filters.from).lt(filters.key, filters.to);
    query =
      table === "erp_sales"
        ? query.order("completed_at").order("order_id")
        : query.order(
            table === "erp_recipes"
              ? "product_id"
              : table === "erp_movements"
                ? "created_at"
                : "id",
            { ascending: table !== "erp_movements" },
          );
    if (table === "erp_recipes") query = query.order("ingredient_id");
    if (table === "erp_movements") query = query.order("id");
    const { data, error } = await query.range(
      offset,
      offset + (limit ?? 1000) - 1,
    );
    if (error) throw error;
    rows.push(...(data ?? []));
    if (limit || !data || data.length < 1000) break;
  }
  return rows;
}
export function erpFailure(error: unknown) {
  if (error instanceof ErpError)
    return Response.json({ error: error.message }, { status: error.status });
  const code = (error as { code?: string })?.code;
  if (["42P01", "PGRST205", "PGRST202"].includes(code ?? ""))
    return Response.json(
      {
        error:
          "ERP kurulumu eksik. Supabase üzerinde 0007_erp.sql migration dosyasını çalıştırın.",
      },
      { status: 503 },
    );
  if (code === "40001")
    return Response.json(
      { error: "Stok değişti. Güncel miktarı yenileyip tekrar sayım yapın." },
      { status: 409 },
    );
  if (code === "23505")
    return Response.json(
      { error: "Malzeme adı veya ürün reçetesi zaten kayıtlı." },
      { status: 409 },
    );
  if (code === "42501")
    return Response.json(
      { error: "ERP erişimi kaldırılmış veya süresi dolmuş." },
      { status: 403 },
    );
  if (code === "P0002" || code === "23503")
    return Response.json(
      { error: "Ürün veya malzeme bulunamadı. Listeyi yenileyin." },
      { status: 409 },
    );
  return null;
}
