import { buildPushPayload } from "@block65/webcrypto-web-push";
import { svc } from "@/db";
import { env } from "@/lib/jwt";

/** VAPID signing material used for every Web Push request. */
export type PushConfiguration = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

/** Worker bindings bridged onto globalThis by patch-wrangler.mjs. */
function workerEnv(): Record<string, string> | undefined {
  const scope: unknown = globalThis;
  if (typeof scope !== "object" || scope === null) return undefined;
  if (!("FINCAN_WORKER_ENV" in scope)) return undefined;
  const value: unknown = scope.FINCAN_WORKER_ENV;
  return typeof value === "object" && value !== null
    ? (value as Record<string, string>)
    : undefined;
}

export function pushConfiguration(): PushConfiguration | null {
  const worker = workerEnv();
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
export function validPushConfiguration(config: PushConfiguration) {
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
  /** The push service no longer knows this subscription (404/410). */
  expired: boolean;
  /**
   * The push service rejected our credentials for this subscription (401/403),
   * typically because the VAPID keypair was regenerated. The stored row can
   * never succeed again and must be dropped so the client re-registers.
   */
  stale: boolean;
  status: number | null;
  code: string;
  /** Original error text when the send threw, for diagnostics only. */
  detail?: string;
};
export async function sendDevicePush(
  entry: {
    endpoint: string;
    subscription: Parameters<typeof buildPushPayload>[1];
  },
  payload: unknown,
  config: PushConfiguration,
): Promise<PushDelivery> {
  if (!allowedPushEndpoint(entry.endpoint))
    return {
      accepted: false,
      expired: false,
      stale: false,
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
    // Workers rejects redirect: "error" at runtime ("won't be implemented
    // since it does not make sense at the edge"), which made every push throw.
    // "manual" keeps the same intent: never follow a provider redirect.
    const response = await fetch(entry.endpoint, {
      ...request,
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    const status = response.status;
    return {
      accepted: response.ok,
      expired: status === 404 || status === 410,
      // 401/403 means the credentials no longer match this subscription.
      stale: status === 401 || status === 403,
      status,
      code: response.ok
        ? "PUSH_ACCEPTED"
        : status === 401
          ? "PUSH_CREDENTIAL_STALE"
          : `PUSH_PROVIDER_${status}`,
    };
  } catch (error) {
    const name = (error as Error)?.name ?? "Error";
    const message = String((error as Error)?.message ?? error).slice(0, 200);
    let provider: string | null = null;
    try {
      provider = new URL(entry.endpoint).hostname;
    } catch {
      provider = null;
    }
    // Without this the UI only ever shows "PUSH_SEND_ERROR", which is
    // undiagnosable. Keep the provider host and the real reason.
    console.warn("Order push send failed", { name, message, provider });
    return {
      accepted: false,
      expired: false,
      stale: false,
      status: null,
      code:
        name === "TimeoutError"
          ? "PUSH_SEND_TIMEOUT"
          : `PUSH_SEND_ERROR_${name.replace(/[^a-z0-9]/gi, "").toUpperCase() || "UNKNOWN"}`,
      detail: message,
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
        if (result.expired || result.stale) {
          // The row can never succeed again: drop it so the device re-registers
          // on its next sync instead of failing silently forever.
          await svc()
            .from("order_push_subscriptions")
            .delete()
            .eq("endpoint", entry.endpoint)
            .eq("user_id", order.ownerId);
          console.warn("Order push subscription removed", {
            code: result.code,
            provider: new URL(entry.endpoint).hostname,
            userId: order.ownerId,
          });
        } else if (!result.accepted) {
          console.warn("Order push delivery failed", {
            code: result.code,
            status: result.status,
            provider: new URL(entry.endpoint).hostname,
            userId: order.ownerId,
          });
        }
      }),
    );
  } catch {
    console.warn("Order push unavailable; order remains saved");
  }
}
