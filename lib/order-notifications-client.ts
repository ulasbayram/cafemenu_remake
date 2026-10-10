"use client";
import { api } from "./client-api";

export function supportsOrderPush() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function enableOrderPush(publicKey: string) {
  if (!supportsOrderPush())
    throw new Error(
      "Bu tarayıcı bildirimleri desteklemiyor. iPhone’da Safari üzerinden Ana Ekrana Ekle seçeneğini kullanıp uygulamayı oradan açın.",
    );
  // Request directly from the button gesture, before any network await.
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error(
      "Bildirim izni verilmedi. Telefon veya tarayıcı ayarlarından izni açabilirsiniz.",
    );
  const registration = await navigator.serviceWorker.register(
    "/order-notifications-sw.js",
    { scope: "/" },
  );
  await navigator.serviceWorker.ready;
  const bytes = Uint8Array.from(
    atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")),
    (character) => character.charCodeAt(0),
  );
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: bytes,
    }));
  try {
    await api("/api/order-notifications", subscription.toJSON(), "POST");
  } catch (error) {
    await subscription.unsubscribe();
    throw error;
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
  [880, 1174, 1318].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const at = start + index * 0.13;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.12, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.32);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.34);
  });
}
