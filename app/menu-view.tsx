"use client";
/* eslint-disable @next/next/no-img-element -- Logos are already resized locally and stored as bounded data URLs. */
import { useState, useEffect, useRef, type CSSProperties } from "react";
import {
  Coffee,
  MapPin,
  Leaf,
  LockKeyhole,
  Camera,
  Play,
  Globe,
  Star,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { socialFields, normalizeSocialLink } from "@/lib/social-links";
import { menuCategories, type Cafe, type Item } from "@/lib/menu";
import { logoSurfaceFromPixels } from "@/lib/logo";
export type Rates = {
  USD: number;
  EUR: number;
  date: string;
  source: string;
  stale: boolean;
};
export type MenuBlock =
  "theme" | "header" | "footer" | `category:${string}` | `item:${string}`;
export default function MenuView({
  cafe,
  rates,
  currency = "TRY",
  onSelectBlock,
  selectedBlock,
  onEdit,
}: {
  cafe: Cafe;
  rates?: Rates | null;
  currency?: string;
  onSelectBlock?: (block: MenuBlock) => void;
  selectedBlock?: MenuBlock;
  onEdit?: (item: Item) => void;
}) {
  const editable = !!(onSelectBlock || onEdit),
    categories = menuCategories(cafe).filter(
      (c) =>
        editable || cafe.items.some((i) => i.category === c && i.available),
    );
  const [selected, setSelected] = useState("Tümü");
  const [detectedSurface, setDetectedSurface] = useState<{
    logo: string;
    color: string | null;
  } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!onSelectBlock || !selectedBlock || selectedBlock === "theme") return;
    const element = root.current?.querySelector(
      `[data-menu-block="${CSS.escape(selectedBlock)}"]`,
    );
    element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedBlock, onSelectBlock]);
  const active = onSelectBlock
    ? "Tümü"
    : selected === "Tümü" || categories.includes(selected)
      ? selected
      : "Tümü";
  const blockClass = (key: MenuBlock) =>
    onSelectBlock
      ? `selectable-block ${selectedBlock === key ? "block-selected" : ""}`
      : "";
  const selectProps = (key: MenuBlock, label: string) =>
    onSelectBlock
      ? {
          role: "button",
          "data-menu-block": key,
          tabIndex: 0,
          "aria-label": `${label} bloğunu düzenle`,
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onSelectBlock(key);
          },
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectBlock(key);
            }
          },
        }
      : {};
  const ItemTag = editable ? "button" : "div";
  const allLinks = socialFields.flatMap((field) => {
    try {
      const href = normalizeSocialLink(
        cafe.socialLinks?.[field.key] || "",
        field.key,
      );
      return href ? [{ ...field, href }] : [];
    } catch {
      return [];
    }
  });
  const socialLinks = allLinks.filter((link) => link.key !== "googleReviews");
  const reviewLink = allLinks.find((link) => link.key === "googleReviews");
  return (
    <div
      ref={root}
      className={`customer-menu theme-${cafe.style} ${onSelectBlock ? "block-editing" : ""}`}
      style={
        {
          "--menu-accent": cafe.accent,
          "--logo-dark-surface":
            cafe.logoSurface ||
            (detectedSurface?.logo === cafe.logoUrl
              ? detectedSurface?.color
              : null) ||
            "#141414",
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
      <div
        className={`menu-brand ${blockClass("header")}`}
        {...selectProps("header", "Başlık")}
      >
        {onSelectBlock && <span className="block-label">Başlık</span>}
        <span
          className={`menu-emblem ${cafe.logoUrl ? "has-logo" : ""} logo-${cafe.logoSize || "medium"}`}
        >
          {cafe.logoUrl ? (
            <img
              src={cafe.logoUrl}
              alt={`${cafe.name} logosu`}
              onLoad={(e) => {
                if (cafe.logoSurface || !cafe.logoUrl) return;
                const canvas = document.createElement("canvas");
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                try {
                  ctx.drawImage(e.currentTarget, 0, 0, 64, 64);
                  setDetectedSurface({
                    logo: cafe.logoUrl,
                    color: logoSurfaceFromPixels(
                      ctx.getImageData(0, 0, 64, 64).data,
                      64,
                      64,
                    ),
                  });
                } catch {
                  /* Keep the neutral surface if the image cannot be sampled. */
                }
              }}
            />
          ) : (
            <Coffee size={30} strokeWidth={1.4} />
          )}
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
      {socialLinks.length > 0 && (
        <nav
          className="menu-social-links"
          aria-label="Kafenin sosyal hesapları ve web sitesi"
        >
          {socialLinks.map((link) => (
            <a
              key={link.key}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${cafe.name} · ${link.label} (yeni sekmede açılır)`}
            >
              {link.key === "instagram" ? (
                <Camera size={16} />
              ) : link.key === "youtube" ? (
                <Play size={16} />
              ) : link.key === "website" ? (
                <Globe size={16} />
              ) : link.key === "whatsapp" ? (
                <MessageCircle size={16} />
              ) : null}
              {link.key === "whatsapp" ? "WhatsApp’tan sipariş" : link.label}
            </a>
          ))}
        </nav>
      )}
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
            onClick={() => {
              setSelected(c);
              onSelectBlock?.(`category:${c}`);
            }}
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
              <h2
                className={blockClass(`category:${cat}`)}
                {...selectProps(`category:${cat}`, `${cat} kategorisi`)}
              >
                {cat}
                <span>
                  {
                    cafe.items.filter(
                      (i) => i.category === cat && (editable || i.available),
                    ).length
                  }
                </span>
                {onSelectBlock && <span className="block-label">Kategori</span>}
              </h2>
              {cafe.items
                .filter((i) => i.category === cat && (editable || i.available))
                .map((item) => (
                  <ItemTag
                    data-menu-block={`item:${item.id}`}
                    className={`menu-item ${!item.available ? "unavailable" : ""} ${blockClass(`item:${item.id}`)}`}
                    key={item.id}
                    onClick={
                      editable
                        ? () => {
                            onEdit?.(item);
                            onSelectBlock?.(`item:${item.id}`);
                          }
                        : undefined
                    }
                    aria-label={
                      editable
                        ? `${item.name || "Yeni ürün"} ürününü düzenle`
                        : undefined
                    }
                  >
                    {onSelectBlock && <span className="block-label">Ürün</span>}
                    <span>
                      <strong>{item.name || "Yeni ürün"}</strong>
                      {item.photo && (
                        <img
                          className="item-photo"
                          src={item.photo}
                          alt=""
                          loading="lazy"
                        />
                      )}
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
                  </ItemTag>
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
      {reviewLink && (
        <section
          className="menu-review-invite"
          aria-label="Kafeyi değerlendirin"
        >
          <Star size={22} aria-hidden="true" />
          <strong>Deneyiminizi bizimle paylaşın</strong>
          <p>Google’da yorum bırakarak kafemizi değerlendirebilirsiniz.</p>
          <a
            href={reviewLink.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${cafe.name} için Google’da değerlendirme yap (yeni sekmede açılır)`}
          >
            Google’da değerlendirin{" "}
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        </section>
      )}
      <footer
        className={`menu-footer permanent-watermark ${blockClass("footer")}`}
        {...selectProps("footer", "Fincan imzası")}
      >
        <Coffee size={14} />
        <span>fincan ile hazırlandı</span>
        {onSelectBlock && <LockKeyhole size={12} />}
      </footer>
    </div>
  );
}
