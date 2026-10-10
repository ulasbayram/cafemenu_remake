import { enterpriseAssignment } from "@/enterprise/server";
import { svc } from "@/db";
import { asUser, owner, userJwt, sameOrigin, fail } from "@/lib/server";
import {
  manualOrderSchema,
  manualOrderLines,
  orderTotal,
} from "@/enterprise/extensions/package-a/orders";
import type { Item } from "@/lib/menu";
import { notifyNewOrder } from "@/lib/order-push";

export async function POST(request: Request) {
  try {
    const uid = await owner(request);
    if (!sameOrigin(request))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    const parsed = manualOrderSchema.safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        { error: "Masa, ürün ve adet bilgilerini kontrol edin." },
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
    const { data: cafe, error } = await asUser(userJwt(request))
      .from("cafes")
      .select("id, name, owner, table_count, data")
      .eq("id", input.cafe)
      .eq("owner", uid)
      .maybeSingle();
    if (error) throw error;
    if (!cafe)
      return Response.json({ error: "İşletme bulunamadı." }, { status: 404 });
    if (input.table > Number(cafe.table_count))
      return Response.json(
        { error: "İşletmede tanımlı bir masa seçin." },
        { status: 400 },
      );
    let lines;
    try {
      lines = manualOrderLines(input, (cafe.data?.items ?? []) as Item[]);
    } catch {
      return Response.json(
        { error: "Seçilen ürün artık menüde bulunmuyor." },
        { status: 409 },
      );
    }
    const { data: created, error: insertError } = await svc()
      .from("orders")
      .insert({
        cafe: cafe.id,
        table_no: input.table,
        status: input.status,
        items: lines,
        total: orderTotal(lines),
      })
      .select("id, status, created_at")
      .single();
    if (insertError) throw insertError;
    await notifyNewOrder({
      id: created.id,
      cafeId: cafe.id,
      cafeName: cafe.name,
      ownerId: uid,
      tableNo: input.table,
      total: orderTotal(lines),
    });
    return Response.json(created, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
