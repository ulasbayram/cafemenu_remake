"use client";
import { api } from "./client-api";
import { prepareOrderWorker } from "./order-push-registration";

export function supportsOrderPush() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function pushSetupError(error: unknown, stage: string) {
  if (error instanceof Error && error.message.includes("Kod:")) return error;
  const name = (error as { name?: string })?.name ?? "Error";
  const code =
    "PUSH_" + stage + "_" + name.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const message =
    name === "NotAllowedError"
      ? "Bildirim izni engellendi. Telefon ve Chrome/Safari bildirim ayarlarını kontrol edin."
      : name === "AbortError" && stage === "SUBSCRIBE"
        ? "Telefonun bildirim servisine ulaşılamadı. İnternet bağlantısını, Chrome ve Android'de Google Play Hizmetleri güncellemelerini kontrol edip yeniden deneyin."
        : name === "InvalidStateError"
          ? "Telefonun eski bildirim kaydı kullanılamıyor. Sayfayı yenileyip bildirimleri yeniden açın."
          : stage === "WORKER"
            ? "Bildirim hizmeti yüklenemedi. Bağlantıyı kontrol edip sayfayı yenileyin."
            : "Bildirim aboneliği tamamlanamadı. Tekrar deneyin.";
  return new Error(message + " Kod: " + code);
}
export function applicationServerKey(publicKey: string) {
  const base = publicKey.replace(/-/g, "+").replace(/_/g, "/");
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(
      atob(base + "=".repeat((4 - (base.length % 4)) % 4)),
      (c) => c.charCodeAt(0),
    );
  } catch {
    throw new Error(
      "Bildirim sunucusunun anahtarı geçersiz. Yöneticiye bildirin. Kod: PUSH_CONFIG_KEY",
    );
  }
  if (bytes.length !== 65 || bytes[0] !== 4)
    throw new Error(
      "Bildirim sunucusunun anahtarı geçersiz. Yöneticiye bildirin. Kod: PUSH_CONFIG_KEY",
    );
  return bytes;
}
export function matchesPushKey(
  subscription: PushSubscription,
  key: Uint8Array,
) {
  const old = subscription.options?.applicationServerKey;
  if (!old) return true;
  const bytes = new Uint8Array(old);
  return bytes.length === key.length && bytes.every((b, i) => b === key[i]);
}
export async function existingOrderPush() {
  if (!supportsOrderPush()) return null;
  return (
    (
      await navigator.serviceWorker.getRegistration("/")
    )?.pushManager.getSubscription() ?? null
  );
}
export async function syncOrderPush(publicKey: string) {
  if (!supportsOrderPush() || Notification.permission !== "granted")
    return false;
  const registration = await prepareOrderWorker();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;
  if (!matchesPushKey(subscription, applicationServerKey(publicKey)))
    throw new Error(
      "Bildirim anahtarı güncellendi. Telefon bildirimlerini yeniden açın. Kod: PUSH_KEY_CHANGED",
    );
  // A timeout, expired login or server outage must not destroy a valid device subscription.
  await api("/api/order-notifications", subscription.toJSON(), "POST");
  return true;
}
export async function enableOrderPush(publicKey: string) {
  if (!supportsOrderPush())
    throw new Error(
      "Bu tarayıcıda bildirim açılamıyor. iPhone'da Ana Ekrana Ekle adımlarını izleyip uygulamayı simgesinden açın. Kod: PUSH_UNSUPPORTED",
    );
  const bytes = applicationServerKey(publicKey);
  // No registration/network await before asking from this explicit tap.
  let permission: NotificationPermission;
  try {
    permission =
      Notification.permission !== "default"
        ? Notification.permission
        : await Notification.requestPermission();
  } catch (error) {
    throw pushSetupError(error, "PERMISSION");
  }
  if (permission !== "granted")
    throw new Error(
      permission === "denied"
        ? "Bildirim izni kapalı. Telefon veya tarayıcı ayarlarından izin verin. Kod: PUSH_PERMISSION_DENIED"
        : "Bildirim izni verilmedi. Açmak için düğmeye yeniden dokunun. Kod: PUSH_PERMISSION_DISMISSED",
    );
  let registration: ServiceWorkerRegistration;
  try {
    registration = await prepareOrderWorker();
  } catch (error) {
    throw pushSetupError(error, "WORKER");
  }
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !matchesPushKey(subscription, bytes)) {
    const endpoint = subscription.endpoint;
    if (!(await subscription.unsubscribe()))
      throw new Error("Eski bildirim kaydı yenilenemedi. Kod: PUSH_KEY_RESET");
    await api("/api/order-notifications", { endpoint }, "DELETE").catch(
      () => {},
    );
    subscription = null;
  }
  if (!subscription)
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytes.buffer as ArrayBuffer,
      });
    } catch (error) {
      throw pushSetupError(error, "SUBSCRIBE");
    }
  try {
    await api("/api/order-notifications", subscription.toJSON(), "POST");
  } catch (error) {
    throw new Error(
      ((error as Error).message || "Sunucuya ulaşılamadı.") +
        " Telefon kaydı korundu; tekrar deneyin. Kod: PUSH_SAVE",
    );
  }
}

export async function disableOrderPush() {
  if (!supportsOrderPush()) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try {
    await api(
      "/api/order-notifications",
      { endpoint: subscription.endpoint },
      "DELETE",
    );
  } finally {
    await subscription.unsubscribe();
  }
}

export function playOrderChime(context: AudioContext) {
  const start = context.currentTime;
  // A repeated two-tone bell, with harmonics that carry on small phone speakers.
  // Keep overlapping envelopes below full scale; a short attack avoids clicks.
  for (const repeat of [0, 0.85]) {
    [1046.5, 784].forEach((frequency, index) => {
      const at = start + repeat + index * 0.28;
      for (const [type, multiplier, peak] of [
        ["triangle", 1, 0.36],
        ["sine", 2, 0.12],
      ] as const) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency * multiplier;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(peak, at + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.48);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(at);
        oscillator.stop(at + 0.5);
      }
    });
  }
}
