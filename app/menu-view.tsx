"use client";
import { useState, type CSSProperties } from "react";
import { Coffee, MapPin, Leaf, ChevronRight } from "lucide-react";
import type { Cafe, Item } from "@/lib/menu";
export type Rates = {
  USD: number;
  EUR: number;
  date: string;
  source: string;
  stale: boolean;
};
export default function MenuView({
  cafe,
  onEdit,
  rates,
  currency = "TRY",
}: {
  cafe: Cafe;
  onEdit?: (item: Item) => void;
  rates?: Rates | null;
  currency?: string;
}) {
  const categories = [
    ...new Set(
      cafe.items.filter((i) => onEdit || i.available).map((i) => i.category),
    ),
  ];
  const [selected, setSelected] = useState("Tümü");
  const active =
    selected === "Tümü" || categories.includes(selected) ? selected : "Tümü";
  return (
    <div
      className={`customer-menu theme-${cafe.style}`}
      style={
        {
          "--menu-accent": cafe.accent,
          "--menu-background": cafe.background || "#fdfcf7",
          "--menu-text": cafe.textColor || "#303c2f",
          "--menu-font":
            cafe.font === "sans"
              ? "Manrope, sans-serif"
              : cafe.font === "mono"
                ? "monospace"
                : "Georgia, serif",
          "--menu-scale": cafe.scale || 1,
        } as CSSProperties
      }
    >
      <div className="menu-brand">
        <span className="menu-emblem">
          <Coffee size={30} strokeWidth={1.4} />
        </span>
        <small>COFFEE & GOOD MOMENTS</small>
        <h1>{cafe.name}</h1>
        <p>{cafe.subtitle}</p>
        {cafe.location && (
          <span className="menu-location">
            <MapPin size={12} />
            {cafe.location}
          </span>
        )}
      </div>
      <div className="menu-category">
        <button
          className={active === "Tümü" ? "selected" : ""}
          onClick={() => setSelected("Tümü")}
        >
          Tümü
        </button>
        {categories.map((c) => (
          <button
            key={c}
            className={active === c ? "selected" : ""}
            onClick={() => setSelected(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="menu-products">
        {categories
          .filter((c) => active === "Tümü" || c === active)
          .map((cat) => (
            <section key={cat}>
              <h2>
                {cat}
                <span>
                  {
                    cafe.items.filter(
                      (i) => i.category === cat && (onEdit || i.available),
                    ).length
                  }
                </span>
              </h2>
              {cafe.items
                .filter((i) => i.category === cat && (onEdit || i.available))
                .map((item) => (
                  <button
                    className={`menu-item ${!item.available ? "unavailable" : ""}`}
                    key={item.id}
                    onClick={() => onEdit?.(item)}
                    disabled={!onEdit}
                  >
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                      {!item.available && <em>Menüde gizli</em>}
                    </span>
                    <b>
                      {new Intl.NumberFormat(
                        currency === "TRY" ? "tr-TR" : "en-US",
                        {
                          style: "currency",
                          currency,
                          minimumFractionDigits:
                            currency === "TRY" && Number.isInteger(item.price)
                              ? 0
                              : 2,
                          maximumFractionDigits: 2,
                        },
                      ).format(
                        item.price *
                          (currency === "TRY"
                            ? 1
                            : rates?.[currency as "USD" | "EUR"] || 1),
                      )}
                    </b>
                    {onEdit && <ChevronRight size={14} />}
                  </button>
                ))}
            </section>
          ))}
        {!cafe.items.length && (
          <div className="empty-menu">
            <Leaf />
            <p>Menünüze ilk lezzeti ekleyin.</p>
          </div>
        )}
      </div>
      {cafe.showBranding !== false && (
        <footer className="menu-footer">
          <Coffee size={14} />
          <span>fincan ile hazırlandı</span>
        </footer>
      )}
    </div>
  );
}
