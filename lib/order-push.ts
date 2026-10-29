import { buildPushPayload } from "@block65/webcrypto-web-push";
import { svc } from "@/db";
import { env } from "@/lib/jwt";

export function pushConfiguration() {
  const worker = (
    globalThis as unknown as { FINCAN_WORKER_ENV?: Record<string, string> }
  ).FINCAN_WORKER_ENV;
  const read = (key: string) =>
    (env(key) ?? worker?.[key])?.trim().replace(/^(["'])(.*)\1$/, "$2");
  const publicKey = read("VAPID_PUBLIC_KEY");
  const privateKey = read("VAPID_PRIVATE_KEY");
  const subject = read("VAPID_SUBJECT");
  return publicKey && privateKey && subject
    ? { publicKey, privateKey, subject }
    : null;
}

let checked: { key: string; valid: Promise<boolean> } | null = null;
/** Check the actual signing pair, not just the existence of three env values. */
export function validPushConfiguration(
  config: NonNullable<ReturnType<typeof pushConfiguration>>,
) {
  const key = JSON.stringify(config);
  if (checked?.key === key) return checked.valid;
  const valid = (async () => {
    try {
      const subject = new URL(config.subject);
      if (
        !["https:", "mailto:"].includes(subject.protocol) ||
        subject.username ||
        subject.password
      )
        return false;
      if (
        subject.protocol === "https:" &&
        (!subject.hostname ||
          ["localhost", "127.0.0.1", "[::1]"].includes(subject.hostname))
      )
        return false;
      if (
        subject.protocol === "mailto:" &&
        !/^[^\s@]+@[^\s@]+$/.test(subject.pathname)
      )
        return false;
      const decode = (s: string) =>
        Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
          c.charCodeAt(0),
        );
      const pub = decode(config.publicKey),
        priv = decode(config.privateKey);
      if (pub.length !== 65 || pub[0] !== 4 || priv.length !== 32) return false;
      const encode = (b: Uint8Array) =>
        btoa(String.fromCharCode(...b))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/g, "");
      const publicJwk = {
        kty: "EC",
        crv: "P-256",
        x: encode(pub.slice(1, 33)),
        y: encode(pub.slice(33, 65)),
      };
      const signer = await crypto.subtle.importKey(
        "jwk",
        { ...publicJwk, d: config.privateKey },
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"],
      );
      const verifier = await crypto.subtle.importKey(
        "jwk",
        publicJwk,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"],
      );
      const message = new TextEncoder().encode("fincan-push-config-check");
      return await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        verifier,
        await crypto.subtle.sign(
          { name: "ECDSA", hash: "SHA-256" },
          signer,
          message,
        ),
        message,
      );
    } catch {
      return false;
    }
  })();
  checked = { key, valid };
  return valid;
}

export type PushDelivery = {
  accepted: boolean;
  expired: boolean;
  status: number | null;
  code: string;
};
export async function sendDevicePush(
  entry: {
    endpoint: string;
    subscription: Parameters<typeof buildPushPayload>[1];
  },
  payload: unknown,
  config: NonNullable<ReturnType<typeof pushConfiguration>>,
): Promise<PushDelivery> {
  if (!allowedPushEndpoint(entry.endpoint))
    return {
      accepted: false,
      expired: false,
      status: null,
      code: "PUSH_ENDPOINT",
    };
  try {
    const request = await buildPushPayload(
      {
        data: JSON.stringify(payload),
        options: { ttl: 3600, urgency: "high" },
      },
      entry.subscription,
      config,
    );
    const response = await fetch(entry.endpoint, {
      ...request,
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    return {
      accepted: response.ok,
      expired: response.status === 404 || response.status === 410,
      status: response.status,
      code: response.ok ? "PUSH_ACCEPTED" : `PUSH_PROVIDER_${response.status}`,
    };
  } catch (error) {
    return {
      accepted: false,
      expired: false,
      status: null,
      code:
        (error as Error).name === "TimeoutError"
          ? "PUSH_SEND_TIMEOUT"
          : "PUSH_SEND_ERROR",
    };
  }
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
      url.hostname.endsWith(".push.apple.com") ||
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
    if (!(await validPushConfiguration(config))) {
      console.warn("Order push unavailable: PUSH_CONFIG_INVALID");
      return;
    }
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
      createdAt: new Date().toISOString(),
    });
    await Promise.allSettled(
      (data ?? []).map(async (entry) => {
        if (!allowedPushEndpoint(entry.endpoint)) return;
        const result = await sendDevicePush(entry, JSON.parse(payload), config);
        if (result.expired)
          await svc()
            .from("order_push_subscriptions")
            .delete()
            .eq("endpoint", entry.endpoint)
            .eq("user_id", order.ownerId);
        else if (!result.accepted)
          console.warn("Order push delivery failed", result.code);
      }),
    );
  } catch {
    console.warn("Order push unavailable; order remains saved");
  }
}
