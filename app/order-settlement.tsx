"use client";
import { useEffect, useRef, useState } from "react";
import { Banknote, CreditCard, Gift, LoaderCircle, X } from "lucide-react";
import { api } from "@/lib/client-api";
import {
  priceOrder,
  type CafeOrder,
  type OrderLine,
  type PaymentMethod,
} from "@/lib/orders";
import styles from "./order-settlement.module.css";

export const orderMoney = (value: number) =>
  value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
export default function OrderSettlement({
  order,
  close,
  onSaved,
  onPreviewSave,
}: {
  order: CafeOrder;
  close: () => void;
  onSaved: () => void;
  onPreviewSave?: (change: {
    items: OrderLine[];
    total: number;
    receiptDiscount: number;
    paymentMethod: PaymentMethod | null;
    completed: boolean;
  }) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [lines, setLines] = useState(order.items.map((l) => ({ ...l })));
  const [discount, setDiscount] = useState(String(order.receiptDiscount ?? 0));
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">(
    "amount",
  );
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  const update = (id: string, change: Partial<OrderLine>) =>
    setLines((old) => old.map((l) => (l.id === id ? { ...l, ...change } : l)));
  let priced: ReturnType<typeof priceOrder> | null = null,
    validation = "";
  try {
    const amount = Number(discount.replace(",", "."));
    if (discountMode === "percent" && (amount < 0 || amount > 100))
      throw new Error("İndirim oranı 0–100 arasında olmalı.");
    const remaining = priceOrder(lines).total;
    priced = priceOrder(
      lines,
      discountMode === "percent"
        ? Math.round(remaining * amount) / 100
        : amount,
    );
  } catch (e) {
    validation = (e as Error).message;
  }
  async function save(completed: boolean) {
    if (!priced || (completed && !method)) return;
    setBusy(true);
    setError("");
    try {
      if (onPreviewSave)
        onPreviewSave({
          items: priced.items,
          total: priced.total,
          receiptDiscount: priced.receiptDiscount,
          paymentMethod: completed ? method : null,
          completed,
        });
      else
        await api(
          `/api/orders/${order.id}`,
          {
            ...(completed
              ? { status: "completed", paymentMethod: method }
              : {}),
            expectedUpdatedAt: order.updatedAt,
            receiptDiscount: priced.receiptDiscount,
            adjustments: lines.map((l) => ({
              id: l.id,
              complimentaryQuantity: l.complimentaryQuantity ?? 0,
              discountAmount: l.discountAmount ?? 0,
            })),
          },
          completed ? "PUT" : "PATCH",
        );
      onSaved();
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="settlement-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else close();
      }}
    >
      <header>
        <div>
          <span>
            Masa {order.tableNo} · {order.cafeName}
          </span>
          <h2 id="settlement-title">Ödeme ve indirim</h2>
        </div>
        <button
          className="icon-btn"
          aria-label="Kapat"
          disabled={busy}
          onClick={close}
        >
          <X size={20} />
        </button>
      </header>
      <p className={styles.hint}>
        İkram ve indirimleri kontrol edin, tahsil ettiğiniz ödeme yöntemini
        seçerek siparişi tamamlayın.
      </p>
      <div className={styles.lines}>
        {lines.map((l) => (
          <article key={l.id}>
            <div className={styles.lineHeading}>
              <strong>
                {l.quantity}× {l.name}
              </strong>
              <span>{orderMoney(l.quantity * l.unitPrice)}</span>
            </div>
            <div className={styles.adjustments}>
              <label>
                <span>
                  <Gift size={14} /> İkram adedi
                </span>
                <input
                  type="number"
                  min={0}
                  max={l.quantity}
                  step={1}
                  value={l.complimentaryQuantity ?? 0}
                  disabled={busy}
                  onChange={(e) =>
                    update(l.id, {
                      complimentaryQuantity: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Ek ürün indirimi (₺)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={l.discountAmount ?? 0}
                  disabled={busy}
                  onChange={(e) =>
                    update(l.id, { discountAmount: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <small>
              İkramlar ürün adedini değiştirmez.
              {priced &&
                ` Net: ${orderMoney(priced.items.find((p) => p.id === l.id)!.netTotal)}`}
            </small>
          </article>
        ))}
      </div>
      <div className={styles.receipt}>
        <label>
          Fişin tamamına indirim
          <input
            type="number"
            min={0}
            max={discountMode === "percent" ? 100 : undefined}
            step="0.01"
            disabled={busy}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </label>
        <div role="group" aria-label="Fiş indirimi türü">
          {(
            [
              ["amount", "₺"],
              ["percent", "%"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              disabled={busy}
              aria-pressed={discountMode === value}
              onClick={() => {
                setDiscountMode(value);
                setDiscount("0");
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {priced && (
        <div className={styles.totals}>
          <p>
            <span>Ara toplam</span>
            <b>{orderMoney(priced.subtotal)}</b>
          </p>
          <p>
            <span>İkram ve indirim</span>
            <b>−{orderMoney(priced.discountTotal)}</b>
          </p>
          <p>
            <strong>Tahsil edilecek</strong>
            <strong>{orderMoney(priced.total)}</strong>
          </p>
        </div>
      )}
      <fieldset disabled={busy} className={styles.payment}>
        <legend>Ödeme nasıl alındı?</legend>
        {(
          [
            ["cash", "Nakit", Banknote],
            ["card", "Kredi kartı", CreditCard],
          ] as const
        ).map(([value, label, Icon]) => (
          <label key={value} data-selected={method === value}>
            <input
              type="radio"
              name="payment-method"
              value={value}
              checked={method === value}
              onChange={() => setMethod(value)}
            />
            <Icon size={22} />
            {label}
          </label>
        ))}
      </fieldset>
      {(error || validation) && (
        <p className="error-banner" role="alert">
          {error || validation}
        </p>
      )}
      <footer>
        <button className="btn" disabled={busy} onClick={close}>
          Vazgeç
        </button>
        <button
          className="btn"
          disabled={busy || !priced}
          onClick={() => void save(false)}
        >
          İndirimi kaydet
        </button>
        <button
          className="btn primary"
          disabled={busy || !priced || !method}
          onClick={() => void save(true)}
        >
          {busy && <LoaderCircle className="spin" size={16} />}Ödeme alındı ·
          Tamamla
        </button>
      </footer>
      <p className={styles.hint}>
        Tamamlanan sipariş değiştirilemez. Bu pencere tahsilat işlemi yapmaz;
        aldığınız ödemeyi kaydeder.
      </p>
    </dialog>
  );
}
