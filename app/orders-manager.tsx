"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [cafe, setCafe] = useState("all");
  const [filter, setFilter] = useState<"active" | OrderStatus>("active");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const path = cafe === "all" ? "/api/orders" : `/api/orders?cafe=${cafe}`;
      setOrders(await api<CafeOrder[]>(path));
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cafe, onError]);

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
    try {
      const updated = await api<{
        id: string;
        status: OrderStatus;
        updatedAt: string;
      }>(`/api/orders/${order.id}`, { status }, "PUT");
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
        <h2>Henüz sipariş alınacak bir kafe yok.</h2>
        <p>
          Kafe ve masa QR kodları oluşturulduğunda siparişler burada görünür.
        </p>
      </section>
    );

  return (
    <section className="orders-workspace">
      <div className="orders-toolbar panel">
        <label>
          Kafe
          <select
            value={cafe}
            onChange={(event) => setCafe(event.target.value)}
          >
            <option value="all">Tüm kafeler</option>
            {cafes.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
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
                  onClick={() => advance(order)}
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
    </section>
  );
}
