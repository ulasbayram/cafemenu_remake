"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShoppingBag,
  Utensils,
} from "lucide-react";
import { api } from "@/lib/client-api";
import type { Cafe } from "@/lib/menu";
import {
  orderStatusLabel,
  type CafeOrder,
  type OrderStatus,
} from "@/lib/orders";

type Props = {
  cafes: Cafe[];
  onError: (message: string) => void;
  onToast: (message: string) => void;
};

const filters: { value: "active" | OrderStatus; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "waiting", label: "Bekleniyor" },
  { value: "delivered", label: "Teslim edildi" },
  { value: "completed", label: "Tamamlandı" },
];

export default function OrdersManager({ cafes, onError, onToast }: Props) {
  const [orders, setOrders] = useState<CafeOrder[]>([]);
  const [cafe, setCafe] = useState(cafes[0]?.id ?? "");
  const [filter, setFilter] = useState<"active" | OrderStatus>("active");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<CafeOrder | null>(null);
  const [dailyCode, setDailyCode] = useState("");
  // Suppress the poll tick right after a local mutation so a stale snapshot
  // can't visually revert the card the owner just advanced.
  const suppressPollUntil = useRef(0);

  const load = useCallback(async () => {
    if (Date.now() < suppressPollUntil.current) return;
    try {
      setOrders(await api<CafeOrder[]>(`/api/orders?cafe=${cafe}`));
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cafe, onError]);

  // Follow the first cafe when the list arrives after mount.
  useEffect(() => {
    if (!cafe && cafes.length) {
      const t = window.setTimeout(() => setCafe(cafes[0].id), 0);
      return () => window.clearTimeout(t);
    }
  }, [cafe, cafes]);

  // Show the daily code when the selected cafe uses token+daily mode.
  useEffect(() => {
    let cancelled = false;
    const entry = cafes.find((c) => c.id === cafe);
    const reset = () => {
      if (!cancelled) setDailyCode("");
    };
    if (!cafe || !entry) {
      const t = window.setTimeout(reset, 0);
      return () => window.clearTimeout(t);
    }
    if (entry.orderPolicy?.enabled && entry.orderPolicy.mode === "token+daily")
      api<{ code: string }>(`/api/orders/daily-code?cafe=${cafe}`)
        .then((r) => {
          if (!cancelled) setDailyCode(r.code);
        })
        .catch(reset);
    else window.setTimeout(reset, 0);
    return () => {
      cancelled = true;
    };
  }, [cafe, cafes]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [load]);

  const visible = useMemo(
    () =>
      orders.filter((order) =>
        filter === "active"
          ? order.status !== "completed"
          : order.status === filter,
      ),
    [filter, orders],
  );

  async function advance(order: CafeOrder) {
    const status: OrderStatus =
      order.status === "waiting" ? "delivered" : "completed";
    setUpdating(order.id);
    setConfirming(null);
    try {
      const updated = await api<{
        id: string;
        status: OrderStatus;
        updatedAt: string;
      }>(`/api/orders/${order.id}`, { status }, "PUT");
      // Suppress the next poll so a stale snapshot can't visually revert this.
      // eslint-disable-next-line react-hooks/purity -- event handler, not render
      suppressPollUntil.current = Date.now() + 18000;
      setOrders((current) =>
        current.map((entry) =>
          entry.id === order.id
            ? { ...entry, status: updated.status, updatedAt: updated.updatedAt }
            : entry,
        ),
      );
      onToast(
        status === "delivered"
          ? `Masa ${order.tableNo} siparişi teslim edildi.`
          : `Masa ${order.tableNo} siparişi tamamlandı.`,
      );
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setUpdating(null);
    }
  }

  if (!cafes.length)
    return (
      <section className="panel orders-empty">
        <ShoppingBag size={34} />
        <h2>Henüz sipariş alınacak bir işletme yok.</h2>
        <p>
          İşletme ve masa QR kodları oluşturulduğunda siparişler burada görünür.
        </p>
      </section>
    );

  return (
    <section className="orders-workspace">
      <div className="orders-toolbar panel">
        {dailyCode && (
          <div className="daily-code-card" title="Bugünün sipariş kodu">
            <span>Günlük kod</span>
            <strong>{dailyCode}</strong>
            <small>masadaki ekran/pano için</small>
          </div>
        )}
        {cafes.length > 1 && (
          <label>
            İşletme
            <select
              value={cafe}
              onChange={(event) => setCafe(event.target.value)}
            >
              {cafes.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="order-filters">
          {filters.map((entry) => (
            <button
              key={entry.value}
              className={filter === entry.value ? "active" : ""}
              onClick={() => setFilter(entry.value)}
            >
              {entry.label}
              <span>
                {
                  orders.filter((order) =>
                    entry.value === "active"
                      ? order.status !== "completed"
                      : order.status === entry.value,
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        <button
          className="btn"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          <RefreshCw className={loading ? "spin" : ""} size={16} /> Yenile
        </button>
      </div>

      {loading ? (
        <div className="panel orders-empty">
          <LoaderCircle className="spin" size={28} />
          <p>Siparişler yükleniyor…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="panel orders-empty">
          <ChefHat size={34} />
          <h2>Bu görünümde sipariş yok.</h2>
          <p>Masa QR kodundan verilen yeni siparişler otomatik olarak düşer.</p>
        </div>
      ) : (
        <div className="orders-grid">
          {visible.map((order) => (
            <article
              className={`order-card status-${order.status}`}
              key={order.id}
            >
              <header>
                <span className="order-table">
                  <Utensils size={17} /> Masa {order.tableNo}
                </span>
                <span className={`order-status ${order.status}`}>
                  {order.status === "waiting" ? (
                    <Clock3 size={13} />
                  ) : order.status === "delivered" ? (
                    <CheckCircle2 size={13} />
                  ) : (
                    <CircleDollarSign size={13} />
                  )}
                  {orderStatusLabel[order.status]}
                </span>
              </header>
              <div className="order-cafe-time">
                <strong>{order.cafeName}</strong>
                {(() => {
                  const km = order.distanceKm;
                  if (km == null) return null;
                  const isGps = order.distanceSource === "gps";
                  // Only suspicious distances surface: precise GPS beyond 3km,
                  // IP-based beyond 50km (with reliability note) and 100km+.
                  if (isGps && km <= 3) return null;
                  if (!isGps && km < 50) return null;
                  const flagged =
                    (isGps && km > 3) || (!isGps && km >= 100);
                  return (
                    <span
                      className={`order-distance${
                        flagged ? " order-distance-warn" : ""
                      }`}
                      title={
                        isGps
                          ? "Cihaz konumu ile hesaplandı. AVM gibi kapalı alanlarda tespit hatalı olabilir."
                          : flagged
                            ? "IP tabanlı yaklaşık konum. Bu mesafe bilgisi güvenilir değildir, hata olabilir."
                            : "IP tabanlı yaklaşık konum — hata olabilir; AVM gibi kapalı alanlarda tespit hatalı olabilir."
                      }
                    >
                      ~{km} km{flagged ? " ⚠" : ""}
                    </span>
                  );
                })()}
                <time dateTime={order.createdAt}>
                  {new Date(order.createdAt).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              <ul>
                {order.items.map((item) => (
                  <li key={item.id}>
                    <span>
                      <b>{item.quantity}×</b> {item.name}
                    </span>
                    <strong>
                      {(item.unitPrice * item.quantity).toLocaleString(
                        "tr-TR",
                        {
                          style: "currency",
                          currency: "TRY",
                        },
                      )}
                    </strong>
                  </li>
                ))}
              </ul>
              <footer>
                <span>Toplam</span>
                <strong>
                  {order.total.toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                  })}
                </strong>
              </footer>
              {order.status !== "completed" && (
                <button
                  className="btn primary full"
                  disabled={updating === order.id}
                  onClick={() =>
                    order.status === "delivered"
                      ? setConfirming(order)
                      : advance(order)
                  }
                >
                  {updating === order.id ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : order.status === "waiting" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <CircleDollarSign size={16} />
                  )}
                  {order.status === "waiting"
                    ? "Teslim edildi olarak işaretle"
                    : "Ödeme alındı · Tamamla"}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      {confirming && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Siparişi tamamla"
          onClick={() => setConfirming(null)}
        >
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Siparişi tamamla?</h2>
            <p>
              <strong>Masa {confirming.tableNo}</strong> ·{" "}
              {confirming.items.reduce(
                (sum, line) => sum + line.quantity,
                0,
              )}{" "}
              ürün ·{" "}
              {confirming.total.toLocaleString("tr-TR", {
                style: "currency",
                currency: "TRY",
              })}
            </p>
            <p className="muted small-text">
              Ödeme alındıysa onaylayın. Tamamlanan sipariş listeden kalkar.
            </p>
            <div className="heading-actions">
              <button
                className="btn"
                onClick={() => setConfirming(null)}
                disabled={updating === confirming.id}
              >
                Vazgeç
              </button>
              <button
                className="btn primary"
                disabled={updating === confirming.id}
                onClick={() => advance(confirming)}
              >
                {updating === confirming.id ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <CircleDollarSign size={16} />
                )}{" "}
                Evet, tamamla
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
