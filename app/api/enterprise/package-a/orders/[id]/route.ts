import { svc } from "@/db";
import { asUser, owner, userJwt, fail, sameOrigin } from "@/lib/server";
import type { OrderLine } from "@/lib/orders";
import { orderTotal } from "@/lib/orders";
import type { Item } from "@/lib/menu";
import { enterpriseAssignment } from "@/enterprise/server";
import {
  manualOrderSchema,
  manualOrderLines,
} from "@/enterprise/extensions/package-a/orders";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const uid = await owner(request);
    if (!sameOrigin(request))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    const { id } = await params;
    if (!UUID.test(id))
      return Response.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    const parsed = manualOrderSchema
      .required({ expectedUpdatedAt: true })
      .safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        { error: "Sipariş bilgilerini kontrol edin." },
        { status: 400 },
      );
    const input = parsed.data;
    if (
      !(await enterpriseAssignment(
        "package-a",
        uid,
        userJwt(request),
        input.cafe,
      ))
    )
      return Response.json(
        {
          error:
            "Manuel sipariş işlemleri için bu işletmeye atanmış Paket A erişimi gerekir.",
        },
        { status: 403 },
      );
    const client = asUser(userJwt(request));
    const { data: current, error: readError } = await client
      .from("orders")
      .select("id, cafe, status, items, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;
    if (!current)
      return Response.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    if (current.cafe !== input.cafe)
      return Response.json(
        { error: "Sipariş başka bir işletmeye taşınamaz." },
        { status: 400 },
      );
    if (current.status === "completed")
      return Response.json(
        { error: "Tamamlanan sipariş düzenlenemez." },
        { status: 409 },
      );
    const { data: cafe, error: cafeError } = await client
      .from("cafes")
      .select("table_count, data")
      .eq("id", current.cafe)
      .eq("owner", uid)
      .maybeSingle();
    if (cafeError) throw cafeError;
    if (!cafe)
      return Response.json({ error: "İşletme bulunamadı." }, { status: 404 });
    if (input.table > Number(cafe.table_count))
      return Response.json(
        { error: "İşletmede tanımlı bir masa seçin." },
        { status: 400 },
      );
    let lines;
    try {
      lines = manualOrderLines(
        input,
        (cafe.data?.items ?? []) as Item[],
        current.items as OrderLine[],
      );
    } catch {
      return Response.json(
        { error: "Ürün listesi değişti. Siparişi yeniden açın." },
        { status: 409 },
      );
    }
    const { data: updated, error: updateError } = await svc()
      .from("orders")
      .update({
        table_no: input.table,
        items: lines,
        total: orderTotal(lines),
        status: input.status,
      })
      .eq("id", id)
      .eq("updated_at", input.expectedUpdatedAt)
      .eq("cafe", input.cafe)
      .neq("status", "completed")
      .select("id, status, updated_at")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated)
      return Response.json(
        {
          error:
            "Sipariş başka bir cihazda değiştirildi. Yenileyip tekrar düzenleyin.",
        },
        { status: 409 },
      );
    return Response.json(updated);
  } catch (error) {
    return fail(error);
  }
}
