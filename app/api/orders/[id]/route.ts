import { z } from "zod";
import { asUser, owner, userJwt, fail, sameOrigin } from "@/lib/server";
import type { OrderStatus } from "@/lib/orders";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const inputSchema = z.object({
  status: z.enum(["delivered", "completed"]),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await owner(request);
    if (!sameOrigin(request))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    const { id } = await params;
    if (!UUID.test(id))
      return Response.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    const input = inputSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        { error: "Sipariş durumu geçersiz." },
        { status: 400 },
      );
    const client = asUser(userJwt(request));
    const { data: rows, error: readError } = await client
      .from("orders")
      .select("id, status")
      .eq("id", id)
      .limit(1);
    if (readError) throw readError;
    const current = rows?.[0] as
      { id: string; status: OrderStatus } | undefined;
    if (!current)
      return Response.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    const allowed =
      (current.status === "waiting" && input.data.status === "delivered") ||
      (current.status === "delivered" && input.data.status === "completed");
    if (!allowed)
      return Response.json(
        { error: "Sipariş durumu bu adıma geçirilemez." },
        { status: 409 },
      );
    const { data, error } = await client
      .from("orders")
      .update({ status: input.data.status })
      .eq("id", id)
      .eq("status", current.status)
      .select("status, updated_at")
      .single();
    if (error) throw error;
    return Response.json({
      id,
      status: data.status,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    return fail(error);
  }
}

export const dynamic = "force-dynamic";
