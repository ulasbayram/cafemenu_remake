"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  LoaderCircle,
  Send,
  Download,
} from "lucide-react";
import { api } from "@/lib/client-api";
import {
  supportsOrderPush,
  enableOrderPush,
  disableOrderPush,
  syncOrderPush,
  existingOrderPush,
} from "@/lib/order-notifications-client";
import { prepareOrderWorker } from "@/lib/order-push-registration";
import {
  installSnapshot,
  serverInstallSnapshot,
  listenInstall,
  setInstallPrompt,
  orderPushDevice,
} from "@/lib/pwa-install";

type Setup = {
  configured: boolean;
  publicKey: string | null;
  reason?: string | null;
  message?: string | null;
};
export default function OrderNotificationControls({
  sound,
  toggleSound,
}: {
  sound: boolean;
  toggleSound: () => Promise<void>;
}) {
  const [push, setPush] = useState(false),
    [busy, setBusy] = useState(false),
    [checking, setChecking] = useState(true);
  const [configuration, setConfiguration] = useState<Setup | null>(null),
    [message, setMessage] = useState("");
  const [device, setDevice] = useState({ ios: false, installed: false }),
    [capable, setCapable] = useState(false);
  const install = useSyncExternalStore(
    listenInstall,
    installSnapshot,
    serverInstallSnapshot,
  );
  useEffect(() => {
    let active = true,
      running = false;
    const refresh = async () => {
      if (running || document.visibilityState !== "visible") return;
      running = true;
      try {
        const info = orderPushDevice();
        if (active) {
          setDevice(info);
          setCapable(supportsOrderPush());
        }
        const value = await api<Setup>("/api/order-notifications");
        if (!active) return;
        setConfiguration(value);
        if (value.configured && value.publicKey && supportsOrderPush()) {
          try {
            await prepareOrderWorker();
            const bound = await syncOrderPush(value.publicKey);
            if (active) setPush(bound);
          } catch (error) {
            if (active) {
              setPush(false);
              setMessage((error as Error).message);
            }
          }
        } else setPush(false);
      } catch {
        if (active)
          setMessage(
            "Bildirim ayarları kontrol edilemedi. Bağlantı geldiğinde yeniden denenecek. Kod: PUSH_CONFIG_NETWORK",
          );
      } finally {
        running = false;
        if (active) setChecking(false);
      }
    };
    void refresh();
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  async function togglePush() {
    setBusy(true);
    setMessage("");
    try {
      if (push) {
        await disableOrderPush();
        setPush(false);
      } else {
        let value = configuration;
        if (!value?.publicKey) {
          value = await api<Setup>("/api/order-notifications");
          setConfiguration(value);
          if (value.configured && value.publicKey) {
            setMessage(
              "Bildirim ayarları hazır. İzin penceresini açmak için Telefon bildirimlerini aç düğmesine yeniden dokunun.",
            );
            return;
          }
        }
        if (!value?.configured || !value.publicKey)
          throw new Error(
            (value?.message || "Sunucu bildirim ayarları henüz kurulmadı.") +
              " Kod: " +
              (value?.reason || "PUSH_CONFIG"),
          );
        await enableOrderPush(value.publicKey);
        setPush(true);
        setMessage(
          "Telefon kaydı tamamlandı. Test bildirimiyle kilit ekranından kontrol edebilirsiniz.",
        );
      }
    } catch (error) {
      setMessage((error as Error).message);
      if (push && !(await existingOrderPush().catch(() => null)))
        setPush(false);
    } finally {
      setBusy(false);
    }
  }
  async function testPush() {
    setBusy(true);
    setMessage("");
    try {
      const subscription = await existingOrderPush();
      if (!subscription)
        throw new Error(
          "Telefon kaydı bulunamadı. Bildirimleri yeniden açın. Kod: PUSH_TEST_NO_DEVICE",
        );
      const result = await api<{ message: string }>(
        "/api/order-notifications",
        { action: "test", endpoint: subscription.endpoint },
        "POST",
      );
      setMessage(result.message);
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
            void toggleSound().catch((e) => setMessage((e as Error).message))
          }
        >
          {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}{" "}
          {sound ? "Sipariş sesi açık" : "Sipariş sesini aç"}
        </button>
        <button
          className="btn"
          disabled={busy || checking || !capable}
          aria-pressed={push}
          onClick={() => void togglePush()}
        >
          {busy || checking ? (
            <LoaderCircle size={16} className="spin" />
          ) : push ? (
            <Bell size={16} />
          ) : (
            <BellOff size={16} />
          )}{" "}
          {checking
            ? "Bildirimler kontrol ediliyor…"
            : push
              ? "Telefon bildirimleri açık"
              : "Telefon bildirimlerini aç"}
        </button>
        {push && (
          <button
            className="btn"
            disabled={busy}
            onClick={() => void testPush()}
          >
            <Send size={15} />
            Test bildirimi gönder
          </button>
        )}
        {install && !device.installed && (
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              try {
                await install.prompt();
                const choice = await install.userChoice;
                setInstallPrompt(null);
                if (choice.outcome === "accepted")
                  setMessage(
                    "Uygulama kurulduktan sonra simgesinden açıp telefon bildirimlerini etkinleştirin.",
                  );
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            <Download size={16} />
            Uygulama olarak yükle
          </button>
        )}
      </div>
      <small>
        Açık ekrandaki sipariş sesi ve telefon bildirimi ayrı ayarlardır. Kilit
        ekranı sesi telefonunuzun bildirim/sessiz/odak ayarlarına bağlıdır.
      </small>
      {configuration && !configuration.configured && (
        <p className="notification-setup-status" role="status">
          {configuration.message ||
            "Arka plan bildirimleri sunucuda henüz kurulmadı."}
          {configuration.reason && <> · {configuration.reason}</>}
        </p>
      )}
      {message && (
        <p className="notification-setup-status" role="status">
          {message}
        </p>
      )}
      <details
        className="order-install-help"
        open={device.ios && !device.installed ? true : undefined}
      >
        <summary>Telefona kurulum ve bildirim yardımı</summary>
        <div>
          <strong>iPhone / iPad · Safari</strong>
          <ol>
            <li>
              Fincan’ı Safari’de açın. Adres çubuğundaki paylaş simgesine
              dokunun. Simge görünmüyorsa sayfa menüsünü (… / menü simgesi) açıp{" "}
              <b>Paylaş</b> seçin.
            </li>
            <li>
              Paylaşım listesini aşağı kaydırıp <b>Ana Ekrana Ekle</b> seçin.
              Yoksa listenin en altındaki <b>Eylemleri Düzenle</b> bölümünden
              ekleyin.
            </li>
            <li>
              Görünüyorsa <b>Web Uygulaması Olarak Aç</b> seçeneğini açık
              bırakıp <b>Ekle</b> deyin.
            </li>
            <li>
              Fincan’ı ana ekrandaki simgesinden açın; Siparişler bölümünde{" "}
              <b>Telefon bildirimlerini aç</b> düğmesine dokunup izin verin.
              Bildirim desteği iOS/iPadOS 16.4 ve sonrası için geçerlidir.
            </li>
          </ol>
          <strong>Android · Chrome</strong>
          <p>
            Chrome’un ⋮ menüsünden <b>Uygulamayı yükle</b> veya{" "}
            <b>Ana ekrana ekle</b> seçin. Ardından bildirim iznini açın. Kurulum
            düğmesi görünmüyorsa tarayıcı menüsünü kullanın.
          </p>
          <strong>Kilit ekranı testi</strong>
          <p>
            <b>Test bildirimi gönder</b> düğmesine dokunun. Telefonda Fincan
            bildirim iznini, kilit ekranında gösterimi ve sesi kontrol edin.
            Odak/Rahatsız Etmeyin veya Android pil kısıtları bildirimi sessize
            alabilir ya da geciktirebilir.
          </p>
          {!capable && (
            <p>
              Bu pencerede telefon bildirim desteği bulunamadı. iPhone’da ana
              ekran simgesinden açın; uygulama içi tarayıcı yerine Safari veya
              Chrome kullanın.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
