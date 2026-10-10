import { z } from "zod";
import { svc } from "@/db";
import { owner, sameOrigin, fail } from "@/lib/server";
import { allowedPushEndpoint, pushConfiguration } from "@/lib/order-push";

const endpointSchema = z.string().url().max(2048).refine(allowedPushEndpoint);
const subscriptionSchema = z.object({
  endpoint: endpointSchema,
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}=?$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
  }),
});

export async function GET(request: Request) {
  try {
    const uid = await owner(request);
    const config = pushConfiguration();
    if (!config) return Response.json({ configured: false, publicKey: null });
    const { error } = await svc()
      .from("order_push_subscriptions")
      .select("endpoint")
      .eq("user_id", uid)
      .limit(1);
    return Response.json({
      configured: !error,
      publicKey: error ? null : config.publicKey,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const uid = await owner(request);
    if (!sameOrigin(request))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    if (!pushConfiguration())
      return Response.json(
        { error: "Arka plan bildirimleri henüz kurulmadı." },
        { status: 503 },
      );
    const input = subscriptionSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        { error: "Bildirim aboneliği geçersiz." },
        { status: 400 },
      );
    // Shared devices transfer this endpoint to the currently signed-in account.
    const { error } = await svc()
      .from("order_push_subscriptions")
      .upsert(
        {
          user_id: uid,
          endpoint: input.data.endpoint,
          subscription: input.data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const uid = await owner(request);
    if (!sameOrigin(request))
      return Response.json({ error: "Geçersiz istek." }, { status: 403 });
    const input = z
      .object({ endpoint: endpointSchema })
      .safeParse(await request.json());
    if (!input.success)
      return Response.json(
        { error: "Bildirim aboneliği geçersiz." },
        { status: 400 },
      );
    const { error } = await svc()
      .from("order_push_subscriptions")
      .delete()
      .eq("user_id", uid)
      .eq("endpoint", input.data.endpoint);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
