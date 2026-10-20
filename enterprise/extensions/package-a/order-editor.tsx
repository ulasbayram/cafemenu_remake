"use client";
/* eslint-disable @next/next/no-img-element -- Bounded existing product photos. */
import AppSelect from "@/components/app-select";
import styles from "./order-editor.module.css";
import { useEffect, useRef, useState } from "react";
import {
  X,
  Plus,
  Minus,
  Trash2,
  LoaderCircle,
  Save,
  Search,
  Coffee,
} from "lucide-react";
import type { Cafe, Item } from "@/lib/menu";
import type { CafeOrder, OrderLine } from "@/lib/orders";
import { api } from "@/lib/client-api";
import { priceOrder } from "@/lib/orders";

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
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  async function save() {
    if (!lines.length) {
      setError("En az bir ürün ekleyin.");
      return;
    }
    try {
      priceOrder(lines, order?.receiptDiscount ?? 0);
    } catch (error) {
      setError((error as Error).message);
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
  function add(item: Item) {
    setLines((old) =>
      old.some((l) => l.id === item.id)
        ? old.map((l) =>
            l.id === item.id
              ? { ...l, quantity: Math.min(99, l.quantity + 1) }
              : l,
          )
        : old.length >= 50
          ? old
          : [
              ...old,
              {
                id: item.id,
                name: item.name,
                unitPrice: item.price,
                quantity: 1,
              },
            ],
    );
  }
  function quantity(id: string, delta: number) {
    setLines((old) =>
      old
        .map((l) =>
          l.id === id
            ? { ...l, quantity: Math.min(99, l.quantity + delta) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }
  const categories = [...new Set(cafe.items.map((i) => i.category))];
  const products = cafe.items.filter(
    (i) =>
      (category === "all" || i.category === category) &&
      i.name.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")),
  );
  let total = 0;
  try {
    total = priceOrder(lines, order?.receiptDiscount ?? 0).total;
  } catch {}
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
        <header className={styles.header}>
          <div>
            <span className="eyebrow">{cafe.name}</span>
            <h2 id="order-editor-title">
              {order ? "Siparişi düzenle" : "Manuel sipariş"}
            </h2>
          </div>
          <label className={styles.tableSelect}>
            Masa
            <AppSelect
              theme="enterprise"
              label="Sipariş masası"
              disabled={busy}
              value={table}
              onValueChange={(value) => setTable(Number(value))}
            >
              {Array.from(
                { length: Math.max(cafe.tableCount, order?.tableNo ?? 0) },
                (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Masa {i + 1}
                  </option>
                ),
              )}
            </AppSelect>
          </label>
          <button
            type="button"
            className="icon-btn"
            disabled={busy}
            aria-label="Kapat"
            onClick={close}
          >
            <X size={22} />
          </button>
        </header>
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        <fieldset disabled={busy} className={styles.workspace}>
          <nav className={styles.categories} aria-label="Ürün kategorileri">
            <h3>Kategoriler</h3>
            <button
              type="button"
              aria-pressed={category === "all"}
              onClick={() => setCategory("all")}
            >
              Tüm ürünler <small>{cafe.items.length}</small>
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
                <small>
                  {cafe.items.filter((i) => i.category === c).length}
                </small>
              </button>
            ))}
          </nav>
          <div className={styles.catalog}>
            <label className={styles.search}>
              <Search size={17} />
              <input
                aria-label="Ürün ara"
                placeholder="Ürün ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className={styles.products}>
              {products.map((item) => {
                const count =
                  lines.find((l) => l.id === item.id)?.quantity ?? 0;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={styles.product}
                    onClick={() => add(item)}
                    disabled={lines.length >= 50 && !count}
                    aria-label={item.name + " ekle"}
                  >
                    <span className={styles.photo}>
                      {item.photo ? (
                        <img src={item.photo} alt="" />
                      ) : (
                        <Coffee size={28} strokeWidth={1.3} />
                      )}
                    </span>
                    <strong>{item.name}</strong>
                    <span>
                      {item.price.toLocaleString("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                      })}
                    </span>
                    {!item.available && <small>Menüde gizli</small>}
                    <b className={styles.count}>
                      {count || <Plus size={15} />}
                    </b>
                  </button>
                );
              })}
            </div>
            {!products.length && (
              <p className="muted">Aramanıza uygun ürün bulunamadı.</p>
            )}
          </div>
        </fieldset>
        <section className={styles.basket} aria-label="Sipariş içeriği">
          <div className={styles.basketHeading}>
            <h3>
              Sipariş içeriği{" "}
              <small>{lines.reduce((s, l) => s + l.quantity, 0)} ürün</small>
            </h3>
            <AppSelect
              theme="enterprise"
              label="Sipariş durumu"
              value={status}
              disabled={busy}
              onValueChange={(value) =>
                setStatus(value as "waiting" | "delivered")
              }
            >
              <option value="waiting">Bekleniyor</option>
              <option value="delivered">Teslim edildi</option>
            </AppSelect>
          </div>
          <div className={styles.lines}>
            {!lines.length && (
              <p className="muted">Siparişe eklemek için bir ürüne dokunun.</p>
            )}
            {lines.map((line) => (
              <div className={styles.line} key={line.id}>
                <strong>{line.name}</strong>
                <div className={styles.quantity}>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={line.name + " azalt"}
                    onClick={() => quantity(line.id, -1)}
                  >
                    <Minus size={14} />
                  </button>
                  <span>{line.quantity}</span>
                  <button
                    type="button"
                    disabled={busy || line.quantity >= 99}
                    aria-label={line.name + " artır"}
                    onClick={() => quantity(line.id, 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <label>
                  Birim fiyat (₺)
                  <input
                    aria-label={line.name + " birim fiyatı"}
                    type="number"
                    min={0}
                    max={1000000}
                    step="0.01"
                    required
                    disabled={busy}
                    value={line.unitPrice}
                    onChange={(e) =>
                      setLines((old) =>
                        old.map((l) =>
                          l.id === line.id
                            ? { ...l, unitPrice: Number(e.target.value) }
                            : l,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-btn"
                  disabled={busy}
                  aria-label={line.name + " ürününü çıkar"}
                  onClick={() =>
                    setLines((old) => old.filter((l) => l.id !== line.id))
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
        <footer className={styles.footer}>
          <div>
            <span>Toplam</span>
            <strong>
              {total.toLocaleString("tr-TR", {
                style: "currency",
                currency: "TRY",
              })}
            </strong>
          </div>
          <button
            className="btn primary"
            disabled={busy || !lines.length || !cafe.tableCount}
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Save size={17} />
            )}
            Siparişi onayla
          </button>
        </footer>
      </form>
    </dialog>
  );
}
