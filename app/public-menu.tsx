"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { Sun, Moon } from "lucide-react";
import type { Cafe } from "@/lib/menu";
import { useMenuTheme } from "./use-menu-theme";
import MenuView, { type Rates } from "./menu-view";
export default function PublicMenu({ cafe }: { cafe: Cafe }) {
  const [rates, setRates] = useState<Rates | null>(null),
    [currency, setCurrency] = useState("TRY"),
    [rateError, setRateError] = useState("");
  const { theme, toggleTheme } = useMenuTheme(cafe.defaultTheme);
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
        body: JSON.stringify({ cafe: cafe.id, visitor }),
      }).catch(() => {});
    } catch {}
  }, [cafe.id]);
  return (
    <main
      className="public-shell"
      style={{ "--public-brand": cafe.accent } as CSSProperties}
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
      <MenuView cafe={cafe} rates={rates} currency={currency} />
      <p className="rate-disclaimer">
        {rates
          ? `${rates.stale ? "Son bilinen kur / Last available rate · " : ""}${rates.source} · ${rates.date}. `
          : rateError}{" "}
        {currency !== "TRY"
          ? "Converted prices are approximate. Payment is in TRY."
          : "Ödemeler TL olarak alınır."}
      </p>
    </main>
  );
}
