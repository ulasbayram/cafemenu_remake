import { z } from "zod";
import { svc } from "@/db";
import { owner, sameOrigin, fail } from "@/lib/server";
import {
  allowedPushEndpoint,
  pushConfiguration,
  validPushConfiguration,
  sendDevicePush,
} from "@/lib/order-push";

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
    if (!config)
      return Response.json({
        configured: false,
        publicKey: null,
        reason: "PUSH_CONFIG_MISSING",
        message: "Sunucunun VAPID bildirim ayarları eksik.",
      });
    if (!(await validPushConfiguration(config)))
      return Response.json({
        configured: false,
        publicKey: null,
        reason: "PUSH_CONFIG_INVALID",
        message:
          "Sunucunun VAPID anahtarları veya iletişim adresi geçersiz. Yöneticinin kontrol etmesi gerekiyor.",
      });
    const { error } = await svc()
      .from("order_push_subscriptions")
      .select("endpoint")
      .eq("user_id", uid)
      .limit(1);
    return Response.json({
      configured: !error,
      publicKey: error ? null : config.publicKey,
      reason: error
        ? error.code === "42P01" || error.code === "PGRST205"
          ? "PUSH_DATABASE_MISSING"
          : "PUSH_DATABASE_UNAVAILABLE"
        : null,
      message: error
        ? error.code === "42P01" || error.code === "PGRST205"
          ? "Bildirim tablosu kurulmamış. Yönetici 0004 migration dosyasını kontrol etmeli."
          : "Bildirim sunucusuna şu anda ulaşılamıyor. Tekrar deneyin."
        : null,
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
    const config = pushConfiguration();
    if (!config || !(await validPushConfiguration(config)))
      return Response.json(
        { error: "Arka plan bildirimleri henüz kurulmadı." },
        { status: 503 },
      );
    const body = await request.json();
    if (
      body &&
      typeof body === "object" &&
      "action" in body &&
      body.action === "test"
    ) {
      const test = z.object({ endpoint: endpointSchema }).safeParse(body);
      if (!test.success)
        return Response.json(
          { error: "Geçersiz telefon kaydı. Kod: PUSH_TEST_INPUT" },
          { status: 400 },
        );
      const { data: device, error: lookupError } = await svc()
        .from("order_push_subscriptions")
        .select("endpoint, subscription")
        .eq("user_id", uid)
        .eq("endpoint", test.data.endpoint)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!device)
        return Response.json(
          {
            error:
              "Bu hesap için telefon kaydı bulunamadı. Bildirimleri tekrar açın. Kod: PUSH_TEST_NO_DEVICE",
          },
          { status: 404 },
        );
      const result = await sendDevicePush(
        device,
        {
          type: "test",
          title: "Fincan · Test bildirimi",
          body: "Bu bildirimi görüyorsanız telefonun arka plan bildirim bağlantısı çalışıyor.",
          url: "/?view=orders",
        },
        config,
      );
      if (result.expired || result.stale) {
        // Unusable row: remove it so the next "enable" creates a fresh one.
        await svc()
          .from("order_push_subscriptions")
          .delete()
          .eq("user_id", uid)
          .eq("endpoint", device.endpoint);
      }
      if (!result.accepted)
        return Response.json(
          {
            error: result.expired
              ? "Telefon kaydı sona ermiş. Bildirimleri yeniden açın. Kod: PUSH_TEST_EXPIRED"
              : result.stale
                ? "Telefon kaydı artık geçerli değil. Bildirimleri yeniden açın. Kod: PUSH_TEST_STALE"
                : `Bildirim servisi mesajı kabul etmedi. Kod: ${result.code}`,
          },
          { status: 502 },
        );
      return Response.json({
        accepted: true,
        // The push service only queued the message; it cannot confirm display.
        message:
          "Test bildirimi telefonun bildirim servisine gönderildi. Birkaç saniye içinde görünmezse bildirim iznini, odak (rahatsız etme) modunu ve iPhone'da Ana Ekrana Ekle kurulumunu kontrol edin.",
      });
    }
    const input = subscriptionSchema.safeParse(body);
    if (!input.success)
      return Response.json(
        {
          error:
            "Telefonun bildirim kaydı desteklenmiyor veya geçersiz. Kod: PUSH_SUBSCRIPTION_INVALID",
        },
        { status: 400 },
      );
    // Shared devices transfer this endpoint to the currently signed-in account.
    const { error } = await svc().from("order_push_subscriptions").upsert(
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
