"use client";
import { useEffect, useState, type CSSProperties } from "react";
import {
  Sun,
  Moon,
  ShoppingBag,
  Minus,
  Plus,
  X,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";
import type { Cafe, Item } from "@/lib/menu";
import { useMenuTheme } from "./use-menu-theme";
import MenuView, { type Rates } from "./menu-view";
export default function PublicMenu({
  cafe,
  table,
  orderToken,
  orderMode,
}: {
  cafe: Cafe;
  table?: number | null;
  orderToken?: string | null;
  orderMode?: "token" | "token+daily" | "open" | null;
}) {
  const [rates, setRates] = useState<Rates | null>(null),
    [currency, setCurrency] = useState("TRY"),
    [rateError, setRateError] = useState(""),
    [cart, setCart] = useState<Record<string, number>>({}),
    [cartOpen, setCartOpen] = useState(false),
    [sending, setSending] = useState(false),
    [orderError, setOrderError] = useState(""),
    [sentOrder, setSentOrder] = useState<string | null>(null),
    [dailyCode, setDailyCode] = useState(""),
    [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { theme, toggleTheme } = useMenuTheme(cafe.defaultTheme);
  const orderEnabled = !!(table && orderToken);
  const needsDailyCode = orderMode === "token+daily";
  const cartLines = cafe.items
    .filter((item) => item.available && (cart[item.id] ?? 0) > 0)
    .map((item) => ({ item, quantity: cart[item.id] }));
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cartLines.reduce(
    (sum, line) => sum + line.item.price * line.quantity,
    0,
  );

  function changeQuantity(item: Item, amount: number) {
    setCart((current) => {
      const quantity = Math.max(
        0,
        Math.min(20, (current[item.id] ?? 0) + amount),
      );
      const next = { ...current };
      if (quantity) next[item.id] = quantity;
      else delete next[item.id];
      return next;
    });
  }

  async function submitOrder() {
    if (!orderEnabled || !cartLines.length) return;
    setSending(true);
    setOrderError("");
    try {
      const visitor = (() => {
        try {
          let id = localStorage.getItem("fincan-visitor");
          if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem("fincan-visitor", id);
          }
          return id;
        } catch {
          return crypto.randomUUID();
        }
      })();
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafe: cafe.id,
          table,
          token: orderToken,
          visitor,
          ...(needsDailyCode && dailyCode.trim()
            ? { dailyCode: dailyCode.trim() }
            : {}),
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
          items: cartLines.map((line) => ({
            id: line.item.id,
            quantity: line.quantity,
          })),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "Sipariş gönderilemedi.");
      setCart({});
      setSentOrder(result.id?.slice(0, 8).toUpperCase() || "ALINDI");
    } catch (error) {
      setOrderError((error as Error).message);
    } finally {
      setSending(false);
    }
  }
  /** Opt-in GPS at cart-open; denial is fine — IP distance covers the rest. */
  function askLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => setCoords(null),
      { timeout: 8000, maximumAge: 300000 },
    );
  }
  useEffect(() => {
    document.documentElement.dataset.menuTheme = theme;
  }, [theme]);
  useEffect(() => {
    fetch("/api/rates")
      .then(async (r) => {
        const d = (await r.json()) as Rates & { error?: string };
        if (!r.ok) throw new Error(d.error);
        setRates(d);
      })
      .catch((e) => setRateError(e.message));
    try {
      let visitor = localStorage.getItem("fincan-visitor");
      if (!visitor) {
        visitor = crypto.randomUUID();
        localStorage.setItem("fincan-visitor", visitor);
      }
      fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafe: cafe.id,
          visitor,
          ...(table ? { table } : {}),
        }),
      }).catch(() => {});
    } catch {}
  }, [cafe.id, table]);
  return (
    <main
      className="public-shell"
      style={
        {
          "--public-brand": cafe.accent,
          "--menu-accent": cafe.accent,
          "--menu-background": cafe.background || "#fdfcf7",
          "--menu-text": cafe.textColor || "#303c2f",
        } as CSSProperties
      }
    >
      <div className="currency-bar">
        <span>Menü / Menu</span>
        <div className="public-menu-controls">
          <button
            className="public-theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === "dark"
                ? "Açık tema / Light mode"
                : "Koyu tema / Dark mode"
            }
            title={
              theme === "dark"
                ? "Açık tema / Light mode"
                : "Koyu tema / Dark mode"
            }
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <label>
            Currency{" "}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="TRY">₺ TRY</option>
              <option value="USD" disabled={!rates}>
                $ USD
              </option>
              <option value="EUR" disabled={!rates}>
                € EUR
              </option>
            </select>
          </label>
        </div>
      </div>
      {orderEnabled && (
        <div className="table-order-banner">
          <span>Masa {table}</span>
          <strong>Masadan sipariş verebilirsiniz</strong>
        </div>
      )}
      <MenuView
        cafe={cafe}
        rates={rates}
        currency={currency}
        onAddToOrder={
          orderEnabled ? (item) => changeQuantity(item, 1) : undefined
        }
      />
      <p className="rate-disclaimer">
        {rates
          ? `${rates.stale ? "Son bilinen kur / Last available rate · " : ""}${rates.source} · ${rates.date}. `
          : rateError}{" "}
        {currency !== "TRY"
          ? "Converted prices are approximate. Payment is in TRY."
          : "Ödemeler TL olarak alınır."}
      </p>
      {orderEnabled && cartCount > 0 && (
        <button
          className="cart-fab"
          onClick={() => {
            setCartOpen(true);
            if (!coords) askLocation();
          }}
        >
          <span>
            <ShoppingBag size={19} /> Sepeti görüntüle
          </span>
          <b>{cartCount}</b>
          <strong>
            {cartTotal.toLocaleString("tr-TR", {
              style: "currency",
              currency: "TRY",
            })}
          </strong>
        </button>
      )}
      {cartOpen && orderEnabled && (
        <div
          className="order-sheet-overlay"
          onMouseDown={() => !sending && setCartOpen(false)}
        >
          <section
            className="order-sheet"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>MASA {table}</span>
                <h2>Siparişiniz</h2>
              </div>
              <button
                aria-label="Sepeti kapat"
                onClick={() => setCartOpen(false)}
              >
                <X size={20} />
              </button>
            </header>
            {sentOrder ? (
              <div className="order-success">
                <CheckCircle2 size={42} />
                <h3>Siparişiniz alındı.</h3>
                <p>Kafe ekibi siparişinizi hazırlamaya başlayacak.</p>
                <small>Sipariş no · {sentOrder}</small>
                <button
                  className="btn primary full"
                  onClick={() => {
                    setSentOrder(null);
                    setCartOpen(false);
                  }}
                >
                  Menüye dön
                </button>
              </div>
            ) : (
              <>
                <div className="cart-lines">
                  {cartLines.map(({ item, quantity }) => (
                    <article key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <small>
                          {(item.price * quantity).toLocaleString("tr-TR", {
                            style: "currency",
                            currency: "TRY",
                          })}
                        </small>
                      </div>
                      <div className="quantity-control">
                        <button
                          aria-label={`${item.name} adedini azalt`}
                          onClick={() => changeQuantity(item, -1)}
                        >
                          <Minus size={15} />
                        </button>
                        <b>{quantity}</b>
                        <button
                          aria-label={`${item.name} adedini artır`}
                          onClick={() => changeQuantity(item, 1)}
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="cart-total">
                  <span>Toplam</span>
                  <strong>
                    {cartTotal.toLocaleString("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    })}
                  </strong>
                </div>
                {needsDailyCode && (
                  <label className="daily-code-field">
                    Günlük sipariş kodu
                    <input
                      inputMode="text"
                      autoCapitalize="characters"
                      maxLength={8}
                      required
                      placeholder="Masadaki ekranda yazan kod"
                      value={dailyCode}
                      onChange={(e) => setDailyCode(e.target.value)}
                    />
                    <small className="muted">
                      Kafenin bugünkü sipariş kodu; masanızdaki ekran ya da
                      panoda yazılıdır.
                    </small>
                  </label>
                )}
                {orderError && <p className="form-error">{orderError}</p>}
                <button
                  className="btn primary full order-submit"
                  disabled={sending || !cartLines.length}
                  onClick={submitOrder}
                >
                  {sending ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <ShoppingBag size={17} />
                  )}
                  {sending ? "Gönderiliyor…" : `Masa ${table} için sipariş ver`}
                </button>
                <p className="order-payment-note">
                  Ödeme kafe tarafından ayrıca alınır.
                </p>
              </>
            )}
          </section>
        </div>
      )}
      <p className="rate-disclaimer privacy-note-public">
        Cihazınızda anonim bir tanımlayıcı saklanır — ziyaret sayımı ve
        siparişler için; kişisel veri ile eşleştirilmez.
      </p>
    </main>
  );
}
