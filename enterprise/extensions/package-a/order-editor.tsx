"use client";
import AppSelect from "@/components/app-select";
import styles from "./order-editor.module.css";
import { useEffect, useRef, useState } from "react";
import { X, Plus, Trash2, LoaderCircle, Save } from "lucide-react";
import type { Cafe } from "@/lib/menu";
import type { CafeOrder, OrderLine } from "@/lib/orders";
import { api } from "@/lib/client-api";
import { orderTotal } from "@/lib/orders";

export default function OrderEditor({
  cafe,
  order,
  close,
  onSaved,
  onPreviewSave,
}: {
  cafe: Cafe;
  order: CafeOrder | null;
  close: () => void;
  onSaved: () => void;
  onPreviewSave?: (change: {
    table: number;
    status: "waiting" | "delivered";
    items: OrderLine[];
  }) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [table, setTable] = useState(order?.tableNo ?? 1);
  const [status, setStatus] = useState<"waiting" | "delivered">(
    order?.status === "delivered" ? "delivered" : "waiting",
  );
  const [lines, setLines] = useState<OrderLine[]>(
    order?.items.map((line) => ({ ...line })) ?? [],
  );
  const [product, setProduct] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function save() {
    if (!lines.length) {
      setError("En az bir ürün ekleyin.");
      return;
    }
    if (onPreviewSave) {
      onPreviewSave({ table, status, items: lines });
      onSaved();
      close();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(
        order
          ? `/api/enterprise/package-a/orders/${order.id}`
          : "/api/enterprise/package-a/orders/manual",
        {
          cafe: cafe.id,
          table,
          status,
          items: lines.map((line) => ({
            id: line.id,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
          ...(order ? { expectedUpdatedAt: order.updatedAt } : {}),
        },
        order ? "PATCH" : "POST",
      );
      onSaved();
      close();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className={styles.editor}
      aria-labelledby="order-editor-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else close();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <header>
          <div>
            <span className="eyebrow">{cafe.name}</span>
            <h2 id="order-editor-title">
              {order ? "Siparişi düzenle" : "Manuel sipariş ekle"}
            </h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            disabled={busy}
            aria-label="Kapat"
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        <div className="form-columns">
          <label>
            Masa
            <AppSelect
              theme="enterprise"
              value={table}
              onValueChange={(value) => setTable(Number(value))}
            >
              {Array.from(
                { length: Math.max(cafe.tableCount, order?.tableNo ?? 0) },
                (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    Masa {index + 1}
                  </option>
                ),
              )}
            </AppSelect>
          </label>
          <label>
            Sipariş durumu
            <AppSelect
              theme="enterprise"
              value={status}
              onValueChange={(value) =>
                setStatus(value as "waiting" | "delivered")
              }
            >
              <option value="waiting">Bekleniyor</option>
              <option value="delivered">Teslim edildi</option>
            </AppSelect>
          </label>
        </div>
        <label>
          Ürün ekle
          <div className={styles.productPicker}>
            <AppSelect
              theme="enterprise"
              label="Eklenecek ürün"
              value={product}
              onValueChange={(value) => setProduct(value)}
            >
              <option value="">Ürün seçin</option>
              {cafe.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · ₺{item.price.toLocaleString("tr-TR")}
                  {!item.available ? " · Menüde gizli" : ""}
                </option>
              ))}
            </AppSelect>
            <button
              type="button"
              className="btn"
              disabled={!product || lines.length >= 50}
              onClick={() => {
                const item = cafe.items.find((entry) => entry.id === product);
                if (!item) return;
                setLines((current) =>
                  current.some((line) => line.id === item.id)
                    ? current.map((line) =>
                        line.id === item.id
                          ? {
                              ...line,
                              quantity: Math.min(99, line.quantity + 1),
                            }
                          : line,
                      )
                    : [
                        ...current,
                        {
                          id: item.id,
                          name: item.name,
                          unitPrice: item.price,
                          quantity: 1,
                        },
                      ],
                );
                setProduct("");
              }}
            >
              <Plus size={16} />
              Ekle
            </button>
          </div>
        </label>
        <div className={styles.editLines}>
          {lines.map((line) => (
            <div key={line.id}>
              <strong>{line.name}</strong>
              <label>
                Adet
                <input
                  aria-label={`${line.name} adedi`}
                  type="number"
                  min={1}
                  max={99}
                  required
                  value={line.quantity}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id
                          ? { ...item, quantity: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Birim fiyat (₺)
                <input
                  aria-label={`${line.name} birim fiyatı`}
                  type="number"
                  min={0}
                  max={1000000}
                  step="0.01"
                  required
                  value={line.unitPrice}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id
                          ? { ...item, unitPrice: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="icon-btn"
                aria-label={`${line.name} ürününü çıkar`}
                onClick={() =>
                  setLines((current) =>
                    current.filter((item) => item.id !== line.id),
                  )
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!lines.length && (
            <p className="muted">
              Siparişe eklemek için menüden bir ürün seçin.
            </p>
          )}
        </div>
        <div className={styles.total}>
          <span>Toplam</span>
          <strong>
            {orderTotal(lines).toLocaleString("tr-TR", {
              style: "currency",
              currency: "TRY",
            })}
          </strong>
        </div>
        <footer>
          <button type="button" className="btn" onClick={close} disabled={busy}>
            Vazgeç
          </button>
          <button className="btn primary" disabled={busy || !lines.length}>
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Save size={16} />
            )}
            Siparişi kaydet
          </button>
        </footer>
      </form>
    </dialog>
  );
}
