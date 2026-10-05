"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Coffee,
  Check,
  QrCode,
  Smartphone,
  Palette,
  ChartNoAxesCombined,
  ClipboardList,
  Leaf,
  Store,
  Menu,
  X,
  Sparkles,
  CakeSlice,
  CupSoda,
  ChevronDown,
  Sun,
  Moon,
  Mail,
} from "lucide-react";
import ItemLabels from "../item-labels";
import styles from "./prototype.module.css";

const features = [
  {
    icon: Palette,
    title: "Sizin menünüz. Sizin tarzınız.",
    text: "Renklerinizi, logonuzu ve menü düzeninizi işletmenizin ruhuna göre seçin.",
  },
  {
    icon: QrCode,
    title: "Bir tarama kadar yakın.",
    text: "QR kodunuzu masaya yerleştirin. Misafirleriniz uygulama indirmeden menünüze ulaşsın.",
  },
  {
    icon: ClipboardList,
    title: "Masadan size, doğrudan.",
    text: "Masa QR’larından gelen siparişleri takip edin ve durumlarını tek yerden yönetin.",
  },
  {
    icon: Leaf,
    title: "İçerik belli. Seçim kolay.",
    text: "Alerjenleri, beslenme tercihlerini ve ürün özelliklerini küçük etiketlerle gösterin.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Menünüzün nabzını tutun.",
    text: "Ziyaretlerin günlere ve saatlere dağılımını görün. Verilere dokunarak yakından bakın.",
  },
  {
    icon: Store,
    title: "Birden fazla işletme, tek panel.",
    text: "İşletmelerinizin menülerini, ürünlerini ve fiyatlarını aynı çalışma alanından düzenleyin.",
  },
];
const demoItems = [
  {
    name: "Caffè Latte",
    text: "Espresso, sıcak süt, yumuşacık köpük.",
    price: "145",
    category: "Kahveler",
    icon: Coffee,
    allergens: ["milk" as const],
    generalTags: ["caffeinated" as const],
  },
  {
    name: "Americano",
    text: "Taze çekilmiş kahve. Sade bir klasik.",
    price: "110",
    category: "Kahveler",
    icon: Coffee,
    dietaryTags: ["vegan" as const],
    generalTags: ["caffeinated" as const],
  },
  {
    name: "San Sebastian",
    text: "Karamelize kabuk, yumuşacık bir kalp.",
    price: "220",
    category: "Tatlılar",
    icon: CakeSlice,
    allergens: ["milk" as const, "eggs" as const],
    generalTags: ["homemade" as const],
  },
  {
    name: "Limonata",
    text: "Taze limon, nane ve bol ferahlık.",
    price: "120",
    category: "Soğuklar",
    icon: CupSoda,
    generalTags: ["homemade" as const, "cold" as const],
  },
];

export default function LandingPrototype() {
  const [mobileNav, setMobileNav] = useState(false);
  const [category, setCategory] = useState("Kahveler");
  const [accent, setAccent] = useState("#285c48");
  const [dark, setDark] = useState(true);
  // TODO: Projeye ait iletişim e-postası belirlendiğinde demo taleplerini
  // bir sunucu endpoint'ine bağla. Şimdilik yalnızca UI prototipi:
  // e-posta gönderilmez, form bilgileri kaydedilmez.
  const [demoNotice, setDemoNotice] = useState("");

  return (
    <div
      className={styles.landing}
      data-landing-theme={dark ? "dark" : "light"}
    >
      <a className={styles.skip} href="#icerik">
        İçeriğe geç
      </a>
      <header className={styles.header}>
        <Link
          href="/landing"
          className={styles.brand}
          aria-label="Fincan ana sayfa"
        >
          <span>
            <Coffee size={23} strokeWidth={1.7} />
          </span>
          fincan<span className={styles.brandDot}>.</span>
        </Link>
        <nav
          className={`${styles.nav} ${mobileNav ? styles.navOpen : ""}`}
          aria-label="Ana gezinme"
          id="landing-navigation"
        >
          <a href="#ozellikler" onClick={() => setMobileNav(false)}>
            Neler yapabilirsiniz?
          </a>
          <a href="#nasil-calisir" onClick={() => setMobileNav(false)}>
            Nasıl çalışır?
          </a>
          <a href="#sorular" onClick={() => setMobileNav(false)}>
            Merak edilenler
          </a>
          <a href="#demo" onClick={() => setMobileNav(false)}>
            Demo
          </a>
        </nav>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.themeToggle}
            aria-label={dark ? "Açık temaya geç" : "Koyu temaya geç"}
            title={dark ? "Açık tema" : "Koyu tema"}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link className={styles.login} href="/login">
            Giriş yap <ArrowUpRight size={15} />
          </Link>
          <Link className={styles.smallCta} href="/login">
            Hemen başla <ArrowRight size={15} />
          </Link>
          <button
            className={styles.navToggle}
            aria-label={mobileNav ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={mobileNav}
            aria-controls="landing-navigation"
            onClick={() => setMobileNav(!mobileNav)}
          >
            {mobileNav ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>
      <main id="icerik">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <span /> DAHA AZ UĞRAŞ, DAHA ÇOK MİSAFİR
            </span>
            <h1>
              Bir QR.
              <br />
              Bütün <span>menünüz.</span>
            </h1>
            <p>
              İyi bir menü, güzel bir karşılamadır. Menünüzü dijitale taşıyın;
              ürünleri, fiyatları ve siparişleri tek bir yerden yönetin.
            </p>
            <div className={styles.heroActions}>
              <Link href="/login" className={styles.primary}>
                Menümü oluşturmaya başla <ArrowUpRight size={20} />
              </Link>
              <a href="#menu-ornegi" className={styles.secondary}>
                Bir menüye göz at <ArrowRight size={18} />
              </a>
            </div>
            <div className={styles.heroNotes}>
              <span>
                <Check size={15} /> Misafirler için uygulama gerekmez
              </span>
              <span>
                <Check size={15} /> Değişiklikler aynı QR’da
              </span>
            </div>
            <div className={styles.heroFoot}>
              <span className={styles.tinyCup}>
                <Coffee size={19} />
              </span>
              <p>
                Mahalle kahvecisinden kalabalık masalara.
                <br />
                <strong>Her işletmenin menüsüne bir fincan iyi fikir.</strong>
              </p>
            </div>
          </div>
          <div
            className={styles.heroVisual}
            id="menu-ornegi"
            style={{ "--demo-accent": accent } as React.CSSProperties}
          >
            <div className={styles.visualCaption}>
              <Sparkles size={14} /> MENÜNÜZ BÖYLE GÖRÜNEBİLİR
            </div>
            <div className={styles.phone}>
              <div className={styles.phoneTop}>
                <span>9:41</span>
                <span className={styles.phoneIsland} />
                <span>
                  <Smartphone size={12} /> 100%
                </span>
              </div>
              <div className={styles.demoMenu}>
                <div className={styles.demoLogo}>
                  <Coffee size={30} strokeWidth={1.5} />
                </div>
                <h2>Mola Coffee</h2>
                <p className={styles.demoSubtitle}>
                  İyi kahve. Güzel bir mola.
                </p>
                <div className={styles.demoLocation}>
                  Kadıköy, İstanbul <span>·</span> Örnek menü
                </div>
                <div
                  className={styles.demoTabs}
                  aria-label="Örnek menü kategorileri"
                >
                  {["Kahveler", "Tatlılar", "Soğuklar"].map((value) => (
                    <button
                      key={value}
                      aria-pressed={category === value}
                      className={category === value ? styles.demoTabActive : ""}
                      onClick={() => setCategory(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className={styles.demoSectionTitle}>
                  <span>{category}</span>
                  <span>
                    {
                      demoItems.filter((item) => item.category === category)
                        .length
                    }{" "}
                    ürün
                  </span>
                </div>
                <div className={styles.demoProducts}>
                  {demoItems
                    .filter((item) => item.category === category)
                    .map((item) => (
                      <div className={styles.demoItem} key={item.name}>
                        <div className={styles.demoItemIcon}>
                          <item.icon size={24} strokeWidth={1.4} />
                        </div>
                        <div className={styles.demoItemCopy}>
                          <div>
                            <strong>{item.name}</strong>
                            <b>₺{item.price}</b>
                          </div>
                          <p>{item.text}</p>
                          <ItemLabels item={item} />
                        </div>
                      </div>
                    ))}
                </div>
                <div className={styles.demoBottom}>
                  <Leaf size={15} />
                  <span>Küçük bir mola, güzel bir gün.</span>
                </div>
                <div className={styles.demoPowered}>fincan ile hazırlandı</div>
              </div>
            </div>
            <div className={styles.floatingUpdate}>
              <span>
                <Check size={18} />
              </span>
              <div>
                <strong>Menünüz güncel.</strong>
                <small>Yeni fiyatlar, aynı QR kod.</small>
              </div>
            </div>
            <div className={styles.palette}>
              <span>Biraz da sizin renginiz.</span>
              <div>
                {["#285c48", "#865747", "#596799"].map((color) => (
                  <button
                    key={color}
                    style={{ background: color }}
                    aria-label={`${{ "#285c48": "Yeşil", "#865747": "Toprak", "#596799": "Mavi" }[color]} menü rengini seç`}
                    aria-pressed={accent === color}
                    onClick={() => setAccent(color)}
                  >
                    {accent === color && <Check size={13} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className={styles.strip} aria-label="Kullanım alanları">
          <span>GÜZEL MENÜLERİN BULUŞMA NOKTASI</span>
          <div>
            <Coffee size={19} /> Kahveciler
          </div>
          <div>
            <CakeSlice size={19} /> Pastaneler
          </div>
          <div>
            <Store size={19} /> Restoranlar
          </div>
          <div>
            <CupSoda size={19} /> Her güzel mola
          </div>
        </section>
        <section className={styles.features} id="ozellikler">
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>MENÜDEN FAZLASI</span>
            <h2>
              Masada sade.
              <br />
              Arka planda <em>işinizi kolaylaştıran.</em>
            </h2>
            <p>
              Misafirleriniz menüye odaklansın.
              <br />
              Siz de işletmenize.
            </p>
          </div>
          <div className={styles.featureGrid}>
            {features.map((feature) => (
              <article key={feature.title}>
                <span className={styles.featureIcon}>
                  <feature.icon size={24} strokeWidth={1.5} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <span className={styles.featureRule} />
              </article>
            ))}
          </div>
        </section>
        <section className={styles.how} id="nasil-calisir">
          <div className={styles.howIntro}>
            <span className={styles.eyebrow}>BAŞLAMAK KOLAY</span>
            <h2>
              İlk menünüz,
              <br />
              üç küçük adımda.
            </h2>
            <p>
              Yeni bir alışkanlık edinmenize gerek yok. Ürünlerinizi
              biliyorsunuz; gerisini birlikte düzenleyelim.
            </p>
            <Link href="/login">
              İlk adımı at <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className={styles.steps}>
            {[
              {
                title: "İşletmenizi ekleyin.",
                text: "Adınızı, logonuzu ve işletme bilgilerinizi girin.",
              },
              {
                title: "Menünüzü kendinize göre hazırlayın.",
                text: "Ürünlerinizi ekleyin veya menü metninizi yapıştırın. Fiyatları ve etiketleri tamamlayın.",
              },
              {
                title: "QR kodunuzu masaya koyun.",
                text: "Menünüzü yayınlayın, QR kodunuzu indirin. Misafirlerinizi karşılamaya hazırsınız.",
              },
            ].map((step, index) => (
              <div key={step.title}>
                <span>0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
                <Check size={18} />
              </div>
            ))}
          </div>
        </section>
        <section className={styles.demoSection} id="demo">
          <div className={styles.demoIntro}>
            <span className={styles.eyebrow}>BİRLİKTE BİR GÖZ ATALIM</span>
            <h2>
              Bir fincan eşliğinde,
              <br />
              Fincan’la tanışın.
            </h2>
            <p>
              İşletmenize özel bir demo görüşmesi planlayalım. Menü yönetimini,
              masa siparişlerini ve size uygun özellikleri birlikte inceleyelim.
            </p>
            <div className={styles.contactNote}>
              <Mail size={18} />
              <span>Demo görüşmesi için e-posta adresinizi bırakın.</span>
            </div>
          </div>
          <form
            className={styles.demoForm}
            onSubmit={(event) => {
              event.preventDefault();
              setDemoNotice(
                  "Demo talepleri yakında bu form üzerinden alınabilecek. Bilgileriniz şu anda gönderilmedi.",
              );
            }}
          >
            <h3>Demo görüşmesi talep edin</h3>
            <label htmlFor="demo-email">
              E-posta adresiniz
              <input
                id="demo-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="siz@isletmeniz.com"
                onChange={() => setDemoNotice("")}
              />
            </label>
            <label htmlFor="demo-business">
              İşletme adı <span>(isteğe bağlı)</span>
              <input
                id="demo-business"
                name="business"
                type="text"
                autoComplete="organization"
                maxLength={100}
                placeholder="İşletmenizin adı"
                onChange={() => setDemoNotice("")}
              />
            </label>
            <button className={styles.primary} type="submit">
              Demo görüşmesi iste <ArrowUpRight size={18} />
            </button>
            {demoNotice && (
              <p className={styles.formNotice} role="status">
                {demoNotice}
              </p>
            )}
          </form>
        </section>
        <section className={styles.faq} id="sorular">
          <div>
            <span className={styles.eyebrow}>AKLINIZDA KALMASIN</span>
            <h2>Bir fincan soru.</h2>
            <p>Başlamadan önce merak edebilecekleriniz.</p>
          </div>
          <div>
            {[
              {
                q: "Misafirlerimin bir uygulama indirmesi gerekiyor mu?",
                a: "Hayır. QR kodu telefonlarının kamerasıyla tarayıp menüyü tarayıcılarında açabilirler.",
              },
              {
                q: "Fiyat değişince QR kodumu yeniden bastırmalı mıyım?",
                a: "Hayır. Menü adresiniz aynı kalır. Fiyat ve ürün değişikliklerinizi kaydettiğinizde mevcut QR kodunuz güncel menüyü açar.",
              },
              {
                q: "Birden fazla işletmemi yönetebilir miyim?",
                a: "Evet. İşletmelerinizi aynı hesaba ekleyip her birinin menüsünü, ürünlerini ve tasarımını ayrı ayrı yönetebilirsiniz.",
              },
              {
                q: "Masa siparişlerini de alabilir miyim?",
                a: "Evet. Masa sayınızı tanımlayıp masa QR kodlarını oluşturabilirsiniz. Siparişleri panelden takip edebilirsiniz.",
              },
            ].map((faq) => (
              <details key={faq.q}>
                <summary>
                  {faq.q}
                  <ChevronDown size={18} />
                </summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.finalCta}>
          <span className={styles.ctaCup}>
            <Coffee size={38} strokeWidth={1.3} />
          </span>
          <span className={styles.eyebrow}>SIRADAKİ GÜZEL MENÜ SİZİNKİ</span>
          <h2>
            Menünüze yeni
            <br />
            bir sayfa açın.
          </h2>
          <p>Bir fincanla başlayın. İşletmenize yakışan menüyü hazırlayın.</p>
          <Link href="/login" className={styles.primary}>
            Hemen başla <ArrowUpRight size={19} />
          </Link>
        </section>
      </main>
      <footer className={styles.footer}>
        <Link href="/landing" className={styles.brand}>
          <Coffee size={22} /> fincan.
        </Link>
        <span>Güzel menüler. Kolay yönetim.</span>
        <Link href="/">
          Yönetim paneli <ArrowUpRight size={14} />
        </Link>
        <small>Landing page prototipi</small>
      </footer>
    </div>
  );
}
