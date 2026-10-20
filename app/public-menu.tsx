"use client";
import MenuWifi from "./menu-wifi";
import { itemName, type MenuLanguage } from "@/lib/menu-language";
import AppSelect from "@/components/app-select";
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
    [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null),
    [pickedTable, setPickedTable] = useState<number | null>(null);
  const [language, setLanguage] = useState<MenuLanguage>("tr");
  const [revealedWifi, setRevealedWifi] = useState<Cafe["wifi"]>();
  const text = (tr: string, en: string) => (language === "en" ? en : tr);
  const { theme, toggleTheme } = useMenuTheme(cafe.defaultTheme);
  // Token modes: table comes from the scanned QR URL. Open mode: the guest
  // picks it (session-only — never persisted).
  const effectiveTable = orderMode === "open" ? pickedTable : table;
  const orderEnabled = !!(
    effectiveTable &&
    orderToken &&
    (cafe.tableCount ?? 0) > 0
  );
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
          table: effectiveTable,
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
        wifi?: Cafe["wifi"];
      };
      if (!response.ok)
        throw new Error(result.error || "Sipariş gönderilemedi.");
      if (result.wifi) setRevealedWifi(result.wifi);
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
          ...(effectiveTable ? { table: effectiveTable } : {}),
        }),
      }).catch(() => {});
    } catch {}
  }, [cafe.id, effectiveTable]);
  return (
    <main
      className="public-shell"
      lang={language}
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
        <span>{text("Menü", "Menu")}</span>
        <div className="public-menu-controls">
          <div
            className="menu-language"
            role="group"
            aria-label="Dil / Language"
          >
            <button
              type="button"
              aria-pressed={language === "tr"}
              onClick={() => setLanguage("tr")}
            >
              TR
            </button>
            <button
              type="button"
              aria-pressed={language === "en"}
              onClick={() => setLanguage("en")}
            >
              EN
            </button>
          </div>
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
            {text("Para birimi", "Currency")}{" "}
            <AppSelect
              theme="customer"
              value={currency}
              onValueChange={(value) => setCurrency(value)}
            >
              <option value="TRY">₺ TRY</option>
              <option value="USD" disabled={!rates}>
                $ USD
              </option>
              <option value="EUR" disabled={!rates}>
                € EUR
              </option>
            </AppSelect>
          </label>
        </div>
      </div>
      {orderEnabled && orderMode !== "open" && (
        <div className="table-order-banner">
          <span>
            {text("Masa", "Table")} {effectiveTable}
          </span>
          <strong>
            {text(
              "Masadan sipariş verebilirsiniz",
              "You can order from your table",
            )}
          </strong>
        </div>
      )}
      {orderMode === "open" && (cafe.tableCount ?? 0) > 0 && (
        <div className="table-order-banner table-picker-banner">
          <label>
            {text("Masa numaranız", "Your table number")}
            <AppSelect
              theme="customer"
              value={pickedTable ?? ""}
              onValueChange={(value) =>
                setPickedTable(value ? Number(value) : null)
              }
            >
              <option value="">{text("Masa seçin", "Select a table")}</option>
              {Array.from(
                { length: Math.min(cafe.tableCount ?? 0, 200) },
                (_, i) => i + 1,
              ).map((t) => (
                <option key={t} value={t}>
                  {text("Masa", "Table")} {t}
                </option>
              ))}
            </AppSelect>
          </label>
          <strong>
            {pickedTable
              ? text(
                  `Masa ${pickedTable} için sipariş verebilirsiniz`,
                  `You can order for table ${pickedTable}`,
                )
              : text(
                  "Masa numaranızı seçin ve sipariş verin",
                  "Select your table to order",
                )}
          </strong>
        </div>
      )}
      <MenuWifi wifi={revealedWifi ?? cafe.wifi} english={language === "en"} />
      <MenuView
        cafe={cafe}
        language={language}
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
          : text("Ödemeler TL olarak alınır.", "Payment is collected in TRY.")}
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
            <ShoppingBag size={19} /> {text("Sepeti görüntüle", "View cart")}
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
                <span>
                  {text("MASA", "TABLE")} {effectiveTable}
                </span>
                <h2>{text("Siparişiniz", "Your order")}</h2>
              </div>
              <button
                aria-label={text("Sepeti kapat", "Close cart")}
                onClick={() => setCartOpen(false)}
              >
                <X size={20} />
              </button>
            </header>
            {sentOrder ? (
              <div className="order-success">
                <CheckCircle2 size={42} />
                <h3>
                  {text("Siparişiniz alındı.", "Your order has been received.")}
                </h3>
                <p>
                  {text(
                    "İşletme ekibi siparişinizi hazırlamaya başlayacak.",
                    "The team will start preparing your order.",
                  )}
                </p>
                <small>
                  {text("Sipariş no", "Order no")} · {sentOrder}
                </small>
                <MenuWifi
                  wifi={revealedWifi ?? cafe.wifi}
                  english={language === "en"}
                />
                <button
                  className="btn primary full"
                  onClick={() => {
                    setSentOrder(null);
                    setCartOpen(false);
                  }}
                >
                  {text("Menüye dön", "Back to menu")}
                </button>
              </div>
            ) : (
              <>
                <div className="cart-lines">
                  {cartLines.map(({ item, quantity }) => (
                    <article key={item.id}>
                      <div>
                        <strong>{itemName(item, language)}</strong>
                        <small>
                          {(item.price * quantity).toLocaleString("tr-TR", {
                            style: "currency",
                            currency: "TRY",
                          })}
                        </small>
                      </div>
                      <div className="quantity-control">
                        <button
                          aria-label={text(
                            `${item.name} adedini azalt`,
                            `Decrease ${itemName(item, language)}`,
                          )}
                          onClick={() => changeQuantity(item, -1)}
                        >
                          <Minus size={15} />
                        </button>
                        <b>{quantity}</b>
                        <button
                          aria-label={text(
                            `${item.name} adedini artır`,
                            `Increase ${itemName(item, language)}`,
                          )}
                          onClick={() => changeQuantity(item, 1)}
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="cart-total">
                  <span>{text("Toplam", "Total")}</span>
                  <strong>
                    {cartTotal.toLocaleString("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    })}
                  </strong>
                </div>
                {needsDailyCode && (
                  <label className="daily-code-field">
                    {text("Günlük sipariş kodu", "Daily order code")}
                    <input
                      inputMode="text"
                      autoCapitalize="characters"
                      maxLength={8}
                      required
                      placeholder={text(
                        "Masadaki ekranda yazan kod",
                        "Code shown at your table",
                      )}
                      value={dailyCode}
                      onChange={(e) => setDailyCode(e.target.value)}
                    />
                    <small className="muted">
                      {text(
                        "İşletmenin bugünkü sipariş kodu; masanızdaki ekran ya da panoda yazılıdır.",
                        "The daily order code is displayed at your table or on the noticeboard.",
                      )}
                    </small>
                  </label>
                )}
                {orderError && <p className="form-error">{orderError}</p>}
                <button
                  className="btn primary full order-submit"
                  disabled={sending || !cartLines.length || !effectiveTable}
                  onClick={submitOrder}
                >
                  {sending ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <ShoppingBag size={17} />
                  )}
                  {sending
                    ? text("Gönderiliyor…", "Sending…")
                    : text(
                        `Masa ${effectiveTable} için sipariş ver`,
                        `Place order for table ${effectiveTable}`,
                      )}
                </button>
                <p className="order-payment-note">
                  {text(
                    "Ödeme işletme tarafından ayrıca alınır.",
                    "Payment is collected separately by the business.",
                  )}
                </p>
              </>
            )}
          </section>
        </div>
      )}
      <p className="rate-disclaimer privacy-note-public">
        {text(
          "Sipariş doğrulaması için tarayıcınızda anonim bir tanımlayıcı saklanır. Kişisel veri ile eşleştirilmez.",
          "An anonymous identifier is stored in your browser to verify orders. It is not linked to personal information.",
        )}
      </p>
    </main>
  );
}
