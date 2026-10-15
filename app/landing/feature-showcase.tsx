"use client";
/* eslint-disable @next/next/no-img-element -- Static screenshots are captured from the actual app and lazy-loaded without an image service. */
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesCombined,
  ClipboardList,
  Leaf,
  Maximize2,
  Palette,
  QrCode,
  Store,
} from "lucide-react";
import styles from "./feature-showcase.module.css";

const features = [
  {
    icon: Palette,
    label: "Menü tasarımı",
    image: "menu-editor",
    title: "Sizin menünüz. Sizin tarzınız.",
    text: "Renklerinizi, logonuzu ve menü düzeninizi işletmenizin ruhuna göre seçin.",
    alt: "Fincan menü tasarım editörü: menü önizlemesi ve tasarım ayarları.",
  },
  {
    icon: QrCode,
    label: "QR menü",
    image: "qr-menu",
    title: "Bir tarama kadar yakın.",
    text: "QR kodunuzu masaya yerleştirin. Misafirleriniz uygulama indirmeden menünüze ulaşsın.",
    alt: "Fincan işletme panelinde menü QR kodu ve paylaşma seçenekleri.",
  },
  {
    icon: ClipboardList,
    label: "Siparişler",
    image: "orders",
    title: "Masadan size, doğrudan.",
    text: "Masa QR’larından gelen siparişleri takip edin ve durumlarını tek yerden yönetin.",
    alt: "Fincan sipariş ekranı: masa siparişleri, ürünler, tutarlar ve durum takibi.",
  },
  {
    icon: Leaf,
    label: "Ürün etiketleri",
    image: "product-labels",
    title: "İçerik belli. Seçim kolay.",
    text: "Alerjenleri, beslenme tercihlerini ve ürün özelliklerini küçük etiketlerle gösterin.",
    alt: "Fincan ürün düzenleme ekranında alerjen, beslenme tercihi ve ürün etiketi seçenekleri.",
  },
  {
    icon: ChartNoAxesCombined,
    label: "İstatistikler",
    image: "visit-statistics",
    title: "Menünüzün nabzını tutun.",
    text: "Ziyaretlerin günlere ve saatlere dağılımını görün. Verilere dokunarak yakından bakın.",
    alt: "Fincan istatistik ekranında günlük ziyaret grafiği ve seçilen verinin ayrıntıları.",
  },
  {
    icon: Store,
    label: "İşletmeler",
    image: "businesses",
    title: "Birden fazla işletme, tek panel.",
    text: "İşletmelerinizin menülerini, ürünlerini ve fiyatlarını aynı çalışma alanından düzenleyin.",
    alt: "Fincan işletme yönetimi ekranında işletme kartları ve yeni işletme ekleme seçeneği.",
  },
];

export default function FeatureShowcase() {
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const root = rail.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(
            (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.6,
          )
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible)
          setActive(Number((visible.target as HTMLElement).dataset.slide));
      },
      { root, threshold: [0.6, 0.8, 1] },
    );
    root
      .querySelectorAll("[data-slide]")
      .forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, []);
  function go(index: number) {
    const root = rail.current;
    if (!root || index < 0 || index >= features.length) return;
    const target = root.children[index] as HTMLElement;
    root.scrollTo({
      left: target.offsetLeft,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <div
      className={styles.showcase}
      role="region"
      aria-label="Fincan özellikleri ve ekran görüntüleri"
      aria-roledescription="slayt gösterisi"
    >
      <div className={styles.toolbar}>
        <span>FİNCAN’A YAKINDAN BAKIN</span>
        <div className={styles.arrows}>
          <button
            type="button"
            onClick={() => go(active - 1)}
            disabled={active === 0}
            aria-label="Önceki özellik"
            aria-controls="feature-screens"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => go(active + 1)}
            disabled={active === features.length - 1}
            aria-label="Sonraki özellik"
            aria-controls="feature-screens"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <div
        className={styles.rail}
        ref={rail}
        id="feature-screens"
        tabIndex={0}
        aria-label="Sağ ve sol ok tuşlarıyla veya kaydırarak özellikleri inceleyin"
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowRight") {
            event.preventDefault();
            go(active + 1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            go(active - 1);
          }
        }}
      >
        {features.map((feature, index) => (
          <article
            className={styles.slide}
            data-slide={index}
            key={feature.image}
            role="group"
            aria-roledescription="slayt"
            aria-label={`${index + 1} / ${features.length}: ${feature.label}`}
          >
            <div className={styles.screen}>
              <div className={styles.screenTop}>
                <span className={styles.windowDots} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  fincan <b>/</b> {feature.label}
                </span>
                <a
                  href={`/landing/screenshots/${feature.image}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${feature.label} ekran görüntüsünü büyüt`}
                  tabIndex={active === index ? 0 : -1}
                >
                  <Maximize2 size={15} />
                </a>
              </div>
              <img
                src={`/landing/screenshots/${feature.image}.jpg`}
                alt={feature.alt}
                width={1440}
                height={800}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </div>
            <div className={styles.caption}>
              <span className={styles.icon}>
                <feature.icon size={23} strokeWidth={1.6} />
              </span>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
              <span className={styles.slideNumber} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
                <small>/ 06</small>
              </span>
            </div>
          </article>
        ))}
      </div>
      <div className={styles.footer}>
        <div className={styles.dots} role="group" aria-label="Özellik seçin">
          {features.map((feature, index) => (
            <button
              type="button"
              key={feature.image}
              aria-label={`${feature.label} slaytına git`}
              aria-current={index === active ? "true" : undefined}
              aria-controls="feature-screens"
              onClick={() => go(index)}
            >
              <span />
            </button>
          ))}
        </div>
        <p role="status" aria-live="polite" aria-atomic="true">
          {active + 1} / {features.length} <span>·</span>{" "}
          {features[active].label}
        </p>
        <span className={styles.swipeHint}>
          Kaydırarak keşfedin <ArrowRight size={14} />
        </span>
      </div>
    </div>
  );
}
