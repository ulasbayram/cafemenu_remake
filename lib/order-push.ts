import { buildPushPayload } from "@block65/webcrypto-web-push";
import { svc } from "@/db";
import { env } from "@/lib/jwt";

export function pushConfiguration() {
  const worker = (
    globalThis as unknown as { FINCAN_WORKER_ENV?: Record<string, string> }
  ).FINCAN_WORKER_ENV;
  const read = (key: string) => env(key) ?? worker?.[key];
  const publicKey = read("VAPID_PUBLIC_KEY");
  const privateKey = read("VAPID_PRIVATE_KEY");
  const subject = read("VAPID_SUBJECT");
  return publicKey && privateKey && subject
    ? { publicKey, privateKey, subject }
    : null;
}

export function allowedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      return false;
    return (
      url.hostname === "fcm.googleapis.com" ||
      url.hostname === "updates.push.services.mozilla.com" ||
      url.hostname === "web.push.apple.com" ||
      url.hostname.endsWith(".notify.windows.com")
    );
  } catch {
    return false;
  }
}

/** Notification failures must never turn a successfully saved order into
 * an apparent checkout failure (and provoke duplicate orders). */
export async function notifyNewOrder(order: {
  id: string;
  cafeId: string;
  cafeName: string;
  ownerId: string;
  tableNo: number;
  total: number;
}) {
  try {
    const config = pushConfiguration();
    if (!config) return;
    const { data, error } = await svc()
      .from("order_push_subscriptions")
      .select("endpoint, subscription")
      .eq("user_id", order.ownerId)
      .limit(50);
    if (error) {
      console.warn("Order push subscription lookup failed", error.code);
      return;
    }
    const payload = JSON.stringify({
      title: `${order.cafeName} · Yeni sipariş`,
      body: `Masa ${order.tableNo} · ${order.total.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}`,
      orderId: order.id,
      cafeId: order.cafeId,
      url: `/?view=orders&cafe=${encodeURIComponent(order.cafeId)}`,
    });
    await Promise.allSettled(
      (data ?? []).map(async (entry) => {
        if (!allowedPushEndpoint(entry.endpoint)) return;
        const request = await buildPushPayload(
          { data: payload, options: { ttl: 300, urgency: "high" } },
          entry.subscription,
          config,
        );
        const response = await fetch(entry.endpoint, {
          ...request,
          redirect: "error",
          signal: AbortSignal.timeout(8000),
        });
        if (response.status === 404 || response.status === 410)
          await svc()
            .from("order_push_subscriptions")
            .delete()
            .eq("endpoint", entry.endpoint)
            .eq("user_id", order.ownerId);
        else if (!response.ok)
          console.warn("Order push delivery failed", response.status);
      }),
    );
  } catch {
    console.warn("Order push unavailable; order remains saved");
  }
}
