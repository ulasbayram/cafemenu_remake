"use client";
import { useState } from "react";
import { Plus, Pencil, RefreshCw, Check, LoaderCircle } from "lucide-react";
import type { Cafe } from "@/lib/menu";
import type { CafeOrder } from "@/lib/orders";
import { orderStatusLabel, paymentMethodLabel } from "@/lib/orders";
import { api } from "@/lib/client-api";
import { useOrderFeed } from "@/hooks/use-order-feed";
import OrderNotificationControls from "@/app/order-notification-controls";
import OrderSettlement from "@/app/order-settlement";
import OrderEditor from "./order-editor";
import { priceOrder } from "@/lib/orders";
import type { EnterpriseOrder } from "./types";
import styles from "./dashboard.module.css";

function toOrder(row: EnterpriseOrder, cafe: Cafe): CafeOrder {
  return {
    id: row.id,
    cafeId: cafe.id,
    cafeName: cafe.name,
    tableNo: row.table,
    status: row.status,
    total: row.total,
    paymentMethod: row.paymentMethod,
    receiptDiscount: row.receiptDiscount,
    items: row.items,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    distanceKm: null,
    distanceSource: null,
  };
}
export default function PackageAOrders({
  cafe,
  initialOrders,
  preview,
  onPreviewChange,
  onChanged,
}: {
  cafe: Cafe;
  initialOrders: EnterpriseOrder[];
  preview: boolean;
  onPreviewChange: (orders: EnterpriseOrder[]) => void;
  onChanged: () => void;
}) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [demoOrders, setDemoOrders] = useState(
    initialOrders.map((order) => toOrder(order, cafe)),
  );
  const [filter, setFilter] = useState("active");
  const [editor, setEditor] = useState<{ order: CafeOrder | null } | null>(
    null,
  );
  const [settlement, setSettlement] = useState<CafeOrder | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const feed = useOrderFeed(cafe.id, setError, setMessage, !preview);
  const orders = preview ? demoOrders : feed.orders;
  const visible = orders.filter(
    (order) =>
      filter === "all" ||
      (filter === "active"
        ? order.status !== "completed"
        : order.status === filter),
  );
  const publishPreview = (next: CafeOrder[]) => {
    setDemoOrders(next);
    onPreviewChange(
      next.map((order) => ({
        id: order.id,
        cafe: cafe.id,
        table: order.tableNo,
        status: order.status,
        total: order.total,
        paymentMethod: order.paymentMethod,
        receiptDiscount: order.receiptDiscount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items,
      })),
    );
  };
  async function advance(order: CafeOrder) {
    const status = order.status === "waiting" ? "delivered" : "completed";
    if (status === "completed") {
      setSettlement(order);
      return;
    }
    setBusy(order.id);
    setError("");
    try {
      if (preview)
        publishPreview(
          demoOrders.map((row) =>
            row.id === order.id
              ? { ...row, status, updatedAt: new Date().toISOString() }
              : row,
          ),
        );
      else {
        await api(`/api/orders/${order.id}`, { status }, "PUT");
        await feed.refresh();
        onChanged();
      }
      setMessage("Sipariş durumu güncellendi.");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className={`${styles.panel} ${styles.orderWorkspace}`}>
      <header>
        <div>
          <span className={styles.eyebrow}>{cafe.name} · PAKET A</span>
          <h2>Siparişler</h2>
          <p>
            {preview
              ? "Önizleme değişiklikleri yalnızca bu sayfada tutulur."
              : feed.live
                ? "Canlı bağlantı · Anlık güncellemeler"
                : "Otomatik kontrol · Her saniye"}
          </p>
        </div>
        <div className={styles.orderActions}>
          {!preview && (
            <button
              className={styles.refresh}
              onClick={() => void feed.refresh()}
            >
              <RefreshCw size={16} />
              Yenile
            </button>
          )}
          <button
            className={styles.refresh}
            disabled={!cafe.tableCount}
            onClick={() => setEditor({ order: null })}
          >
            <Plus size={16} />
            Manuel sipariş
          </button>
        </div>
      </header>
      {!preview && (
        <OrderNotificationControls
          sound={feed.sound}
          toggleSound={feed.toggleSound}
        />
      )}
      <div className={styles.orderFilters}>
        {[
          ["active", "Aktif"],
          ["all", "Tümü"],
          ["completed", "Tamamlanan"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className={styles.caption} role="status">
          {message}
        </p>
      )}
      {!preview && feed.loading ? (
        <div className={styles.empty}>
          <LoaderCircle size={23} className="spin" />
          Siparişler yükleniyor…
        </div>
      ) : (
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>Masa / ürünler</th>
                <th>Durum</th>
                <th>Tutar</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>Masa {order.tableNo}</strong>
                    <small className={styles.orderLines}>
                      {order.items
                        .map((line) => `${line.quantity}× ${line.name}`)
                        .join(" · ")}
                    </small>
                  </td>
                  <td>
                    <span
                      className={`${styles.orderState} ${order.status === "waiting" ? styles.waiting : ""}`}
                    >
                      {orderStatusLabel[order.status]}
                    </span>
                    {order.paymentMethod && (
                      <small className={styles.orderLines}>
                        {paymentMethodLabel[order.paymentMethod]}
                      </small>
                    )}
                  </td>
                  <td>
                    {order.total.toLocaleString("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    })}
                  </td>
                  <td>
                    {order.status !== "completed" && (
                      <div className={styles.orderActions}>
                        <button
                          className={styles.refresh}
                          disabled={!!busy}
                          onClick={() => setEditor({ order })}
                        >
                          <Pencil size={14} />
                          Düzenle
                        </button>
                        <button
                          className={styles.refresh}
                          disabled={!!busy}
                          onClick={() => void advance(order)}
                        >
                          <Check size={14} />
                          {order.status === "waiting"
                            ? "Teslim edildi"
                            : "Ödeme ve indirim"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className={styles.caption}>Bu görünümde sipariş yok.</p>
          )}
        </div>
      )}
      {settlement && (
        <OrderSettlement
          order={settlement}
          close={() => setSettlement(null)}
          onSaved={() => {
            if (!preview) {
              void feed.refresh();
              onChanged();
            }
            setMessage("Sipariş güncellendi.");
          }}
          onPreviewSave={
            preview
              ? (change) =>
                  publishPreview(
                    demoOrders.map((row) =>
                      row.id === settlement.id
                        ? {
                            ...row,
                            ...change,
                            status: change.completed ? "completed" : row.status,
                            updatedAt: new Date().toISOString(),
                          }
                        : row,
                    ),
                  )
              : undefined
          }
        />
      )}
      {editor && (
        <OrderEditor
          cafe={cafe}
          order={editor.order}
          close={() => setEditor(null)}
          onSaved={() => {
            setMessage(
              editor.order ? "Sipariş güncellendi." : "Manuel sipariş eklendi.",
            );
            if (!preview) {
              void feed.refresh();
              onChanged();
            }
          }}
          onPreviewSave={
            preview
              ? (change) => {
                  const now = new Date().toISOString();
                  const priced = priceOrder(
                    change.items,
                    editor.order?.receiptDiscount ?? 0,
                  );
                  const next: CafeOrder = editor.order
                    ? {
                        ...editor.order,
                        tableNo: change.table,
                        status: change.status,
                        items: priced.items,
                        total: priced.total,
                        updatedAt: now,
                      }
                    : {
                        id: `preview-manual-${crypto.randomUUID()}`,
                        cafeId: cafe.id,
                        cafeName: cafe.name,
                        tableNo: change.table,
                        status: change.status,
                        items: priced.items,
                        total: priced.total,
                        createdAt: now,
                        updatedAt: now,
                        distanceKm: null,
                        distanceSource: null,
                      };
                  publishPreview(
                    editor.order
                      ? demoOrders.map((row) =>
                          row.id === next.id ? next : row,
                        )
                      : [next, ...demoOrders],
                  );
                }
              : undefined
          }
        />
      )}
    </section>
  );
}
