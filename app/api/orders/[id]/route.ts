import { z } from "zod";
import { svc } from "@/db";
import { asUser, owner, userJwt, fail, sameOrigin } from "@/lib/server";
import type { OrderLine } from "@/lib/orders";
import { settlementSchema, settleLines } from "@/lib/order-settlement";

const inputSchema = z.object({ status: z.enum(["delivered", "completed"]) });
type Context = { params: Promise<{ id: string }> };
async function update(
  request: Request,
  { params }: Context,
  discountOnly: boolean,
) {
  try {
    await owner(request);
    if (!sameOrigin(request))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success)
      return Response.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    const body = await request.json();
    const parsed = discountOnly
      ? { success: true as const, data: { status: "delivered" as const } }
      : inputSchema.safeParse(body);
    if (!parsed.success)
      return Response.json(
        { error: "Sipariş durumu geçersiz." },
        { status: 400 },
      );
    // RLS establishes cafe ownership before using the server-only mutation client.
    const { data: current, error: readError } = await asUser(userJwt(request))
      .from("orders")
      .select("id, cafe, status, items, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;
    if (!current)
      return Response.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    const completed = parsed.data.status === "completed";
    if (
      discountOnly
        ? current.status !== "delivered"
        : !(
            (current.status === "waiting" && !completed) ||
            (current.status === "delivered" && completed)
          )
    )
      return Response.json(
        { error: "Bu işlem siparişin mevcut aşamasında yapılamaz." },
        { status: 409 },
      );
    let changes: Record<string, unknown> = { status: parsed.data.status };
    let expected = current.updated_at;
    if (completed || discountOnly) {
      const settlement = settlementSchema.safeParse(body);
      if (!settlement.success || (completed && !settlement.data.paymentMethod))
        return Response.json(
          {
            error:
              "Ödeme yöntemi, indirim ve güncel sipariş bilgilerini kontrol edin.",
          },
          { status: 400 },
        );
      expected = settlement.data.expectedUpdatedAt;
      try {
        const priced = settleLines(
          current.items as OrderLine[],
          settlement.data,
        );
        changes = {
          ...changes,
          items: priced.items,
          total: priced.total,
          receipt_discount: priced.receiptDiscount,
          ...(completed
            ? { payment_method: settlement.data.paymentMethod }
            : {}),
        };
      } catch (error) {
        return Response.json(
          { error: (error as Error).message },
          { status: 400 },
        );
      }
    }
    const { data, error } = await svc()
      .from("orders")
      .update(changes)
      .eq("id", id)
      .eq("cafe", current.cafe)
      .eq("status", current.status)
      .eq("updated_at", expected)
      .select("status, updated_at")
      .maybeSingle();
    if (error) {
      if (["42703", "PGRST204"].includes(error.code))
        return Response.json(
          {
            error:
              "Ödeme altyapısı için 0010_order_settlement.sql migration dosyasını uygulayın.",
          },
          { status: 503 },
        );
      throw error;
    }
    if (!data)
      return Response.json(
        {
          error:
            "Sipariş başka bir cihazda değiştirildi. Listeyi yenileyip yeniden açın.",
        },
        { status: 409 },
      );
    return Response.json({
      id,
      status: data.status,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    return fail(error);
  }
}
export function PUT(request: Request, context: Context) {
  return update(request, context, false);
}
export function PATCH(request: Request, context: Context) {
  return update(request, context, true);
}
export const dynamic = "force-dynamic";
