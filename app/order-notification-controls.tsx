"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, Volume2, VolumeX, LoaderCircle } from "lucide-react";
import { api } from "@/lib/client-api";
import {
  supportsOrderPush,
  enableOrderPush,
  disableOrderPush,
} from "@/lib/order-notifications-client";

export default function OrderNotificationControls({
  sound,
  toggleSound,
}: {
  sound: boolean;
  toggleSound: () => Promise<void>;
}) {
  const [push, setPush] = useState(false);
  const [busy, setBusy] = useState(false);
  const [configuration, setConfiguration] = useState<{
    configured: boolean;
    publicKey: string | null;
  } | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    api<{ configured: boolean; publicKey: string | null }>(
      "/api/order-notifications",
    )
      .then((value) => {
        if (active) setConfiguration(value);
      })
      .catch(() => {
        if (active) setConfiguration({ configured: false, publicKey: null });
      });
    if (supportsOrderPush())
      navigator.serviceWorker
        .getRegistration("/")
        .then(async (registration) => {
          const subscription =
            await registration?.pushManager.getSubscription();
          if (!active || !subscription || Notification.permission !== "granted")
            return;
          // Rebind existing permission to this account on shared devices.
          try {
            await api(
              "/api/order-notifications",
              subscription.toJSON(),
              "POST",
            );
            if (active) setPush(true);
          } catch {
            await subscription.unsubscribe();
            if (active) setPush(false);
          }
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  async function togglePush() {
    setBusy(true);
    setMessage("");
    try {
      if (push) {
        await disableOrderPush();
        setPush(false);
      } else if (!configuration?.publicKey)
        setMessage(
          "Arka plan bildirimleri henüz kurulmadı. Açık ekranda otomatik yenileme ve sipariş sesi kullanılabilir.",
        );
      else {
        await enableOrderPush(configuration.publicKey);
        setPush(true);
      }
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="order-notification-controls">
      <div>
        <button
          className="btn"
          aria-pressed={sound}
          onClick={() =>
            void toggleSound().catch((error) =>
              setMessage((error as Error).message),
            )
          }
        >
          {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          {sound ? "Sipariş sesi açık" : "Sipariş sesini aç"}
        </button>
        <button
          className="btn"
          disabled={busy || !configuration}
          aria-pressed={push}
          onClick={() => void togglePush()}
        >
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : push ? (
            <Bell size={16} />
          ) : (
            <BellOff size={16} />
          )}
          {push ? "Telefon bildirimleri açık" : "Telefon bildirimlerini aç"}
        </button>
      </div>
      <small>
        Ses için bir kez dokunun. iPhone’da uygulamayı Safari’den ana ekrana
        ekleyin. Arka plan sesi telefonunuzun bildirim ayarlarına bağlıdır.
      </small>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
