import { z } from "zod";
import { svc } from "@/db";
import { fail, sameOrigin } from "@/lib/server";
import { erpInput } from "@/modules/erp/schema";
import { erpAccess, erpRows, erpFailure, ErpError } from "@/modules/erp/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const year = Number(params.get("year") ?? new Date().getFullYear());
    if (!Number.isInteger(year) || year < 2020 || year > 2100)
      throw new ErpError("Yıl geçersiz.", 400);
    const { cafe } = await erpAccess(request, params.get("cafe") ?? "");
    const insightEnd = new Date();
    const [inventory, recipes, sales, expenses, movements, insightSales] =
      await Promise.all([
        erpRows("erp_inventory", cafe.id),
        erpRows("erp_recipes", cafe.id),
        erpRows("erp_sales", cafe.id, {
          key: "completed_at",
          from: `${year}-01-01T00:00:00+03:00`,
          to: `${year + 1}-01-01T00:00:00+03:00`,
        }),
        erpRows("erp_expenses", cafe.id, {
          key: "day",
          from: `${year}-01-01`,
          to: `${year + 1}-01-01`,
        }),
        erpRows("erp_movements", cafe.id, null, 100),
        erpRows("erp_sales", cafe.id, {
          key: "completed_at",
          from: new Date(insightEnd.getTime() - 61 * 86400000).toISOString(),
          to: insightEnd.toISOString(),
        }),
      ]);
    return Response.json({
      cafe,
      inventory,
      recipes,
      sales,
      insightSales,
      expenses,
      movements,
      year,
    });
  } catch (error) {
    return erpFailure(error) ?? fail(error);
  }
}
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new ErpError("Geçersiz istek.", 403);
    const parsed = z
      .object({
        cafeId: z.string().uuid(),
        requestId: z.string().uuid(),
        input: erpInput,
      })
      .safeParse(await request.json());
    if (!parsed.success)
      throw new ErpError(
        "Alanları kontrol edin. Miktarlarda en fazla 6, tutarlarda 2 ondalık kullanın.",
        400,
      );
    const { uid, cafe } = await erpAccess(request, parsed.data.cafeId);
    const { error } = await svc().rpc("erp_mutate", {
      p_user: uid,
      p_cafe: cafe.id,
      p_request: parsed.data.requestId,
      p_input: parsed.data.input,
    });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    return erpFailure(error) ?? fail(error);
  }
}
