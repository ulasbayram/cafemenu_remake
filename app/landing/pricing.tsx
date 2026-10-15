"use client";

import {
  ArrowUpRight,
  Check,
  Layers3,
  Puzzle,
  Sparkles,
  Warehouse,
  UsersRound,
} from "lucide-react";
import styles from "./pricing.module.css";

const formatPrice = (value: number) => value.toLocaleString("tr-TR");
const modules = [
  {
    name: "ERP",
    monthly: 399,
    yearly: 3990,
    icon: Warehouse,
    description:
      "Malzemeden satışa, işletmenizin stok ve finans akışını takip edin.",
    upcoming: false,
    infoHref: "#erp-hakkinda",
  },
  {
    name: "CRM",
    monthly: 249,
    yearly: 2490,
    icon: UsersRound,
    description:
      "Personel giriş–çıkışı, vardiya planı ve mesaiye göre satış dağılımı.",
    upcoming: true,
    infoHref: "#personel-hakkinda",
  },
];

export default function Pricing({
  onChoose,
}: {
  onChoose: (plan: string) => void;
}) {
  return (
    <section
      className={styles.pricing}
      id="fiyatlandirma"
      aria-labelledby="pricing-title"
    >
      <div className={styles.heading}>
        <span>İŞLETMENİZE UYGUN BİR FİNCAN</span>
        <h2 id="pricing-title">
          İhtiyacınız kadar başlayın.
          <br />
          <em>İşinizle birlikte büyütün.</em>
        </h2>
        <p>
          Menünüz için Basic, tüm modüller için Full Suite.
          <br />
          Size özel bir fikir varsa birlikte şekillendirelim.
        </p>
      </div>
      <div className={styles.cards}>
        <article className={styles.card} aria-labelledby="basic-title">
          <div className={styles.planIcon}>
            <Puzzle size={21} strokeWidth={1.6} />
          </div>
          <h3 id="basic-title">Fincan Basic</h3>
          <p className={styles.description}>
            Dijital menünüzü ve günlük işlerinizi tek yerden yönetin.
          </p>
          <div className={styles.price}>
            <strong>
              {formatPrice(599)} <span>TL</span>
            </strong>
            <span>/ ay</span>
          </div>
          <div className={styles.annual}>
            <span>Yıllık plan</span>
            <strong>
              {formatPrice(5990)} TL <span>/ yıl</span>
            </strong>
          </div>
          <a
            href="#demo"
            className={styles.cta}
            onClick={() => onChoose("Fincan Basic")}
          >
            Basic hakkında görüşelim <ArrowUpRight size={17} />
          </a>
          <ul className={styles.features}>
            {[
              "QR menü ve menü tasarımı",
              "Ürün, fiyat ve içerik yönetimi",
              "Masa siparişleri ve istatistikler",
            ].map((feature) => (
              <li key={feature}>
                <Check size={16} />
                {feature}
              </li>
            ))}
          </ul>
          <p className={styles.planNote}>
            İhtiyacınıza göre ERP veya CRM ekleyin.
            <a href="#ek-moduller">
              Ek modülleri inceleyin <ArrowUpRight size={14} />
            </a>
          </p>
        </article>
        <article
          className={`${styles.card} ${styles.suite}`}
          aria-labelledby="suite-title"
        >
          <span className={styles.ribbon}>
            <Layers3 size={13} />
            Modüller dahil
          </span>
          <div className={styles.planIcon}>
            <Layers3 size={21} strokeWidth={1.6} />
          </div>
          <h3 id="suite-title">Fincan Full Suite</h3>
          <p className={styles.description}>
            Menünüzden işletme yönetimine, Fincan’ı bir bütün olarak kullanın.
          </p>
          <div className={styles.price}>
            <strong>
              {formatPrice(999)} <span>TL</span>
            </strong>
            <span>/ ay</span>
          </div>
          <div className={styles.annual}>
            <span>Yıllık plan</span>
            <strong>
              {formatPrice(9990)} TL <span>/ yıl</span>
            </strong>
          </div>
          <a
            href="#demo"
            className={styles.cta}
            onClick={() => onChoose("Fincan Full Suite")}
          >
            Full Suite hakkında görüşelim <ArrowUpRight size={17} />
          </a>
          <ul className={styles.features}>
            {[
              "Basic paketindeki tüm özellikler",
              "ERP Modülü dahil",
              "CRM Modülü dahil · yakında",
              "Modüller için ayrı ücret yok",
            ].map((feature) => (
              <li key={feature}>
                <Check size={16} />
                {feature}
              </li>
            ))}
          </ul>
          <div className={styles.suiteNote}>
            <Layers3 size={22} strokeWidth={1.5} />
            <h4>Tek paket, bütün modüller.</h4>
            <p>
              ERP ve CRM için ayrı abonelikler yerine tüm modülleri Full Suite
              kapsamında kullanın.
            </p>
          </div>
        </article>
        <article
          className={`${styles.card} ${styles.enterprise}`}
          aria-labelledby="enterprise-title"
        >
          <div className={styles.planIcon}>
            <Sparkles size={21} strokeWidth={1.6} />
          </div>
          <h3 id="enterprise-title">Fincan Enterprise</h3>
          <p className={styles.description}>
            İşletmenize özgü ekranlar, tasarımlar ve çalışma biçimleri için.
          </p>
          <div className={`${styles.price} ${styles.customPrice}`}>
            <strong>Size özel teklif</strong>
          </div>
          <div className={styles.annual}>
            <span>Kapsamı birlikte belirleyelim.</span>
          </div>
          <a
            href="#demo"
            className={styles.cta}
            onClick={() => onChoose("Fincan Enterprise")}
          >
            İhtiyaçlarınızı konuşalım <ArrowUpRight size={17} />
          </a>
          <ul className={styles.features}>
            {[
              "İşletmenize özel tasarımlar",
              "İhtiyaca özel ekran ve iş akışları",
              "Görüşmeyle belirlenen kapsam",
              "Kapsama göre fiyatlandırma",
            ].map((feature) => (
              <li key={feature}>
                <Check size={16} />
                {feature}
              </li>
            ))}
          </ul>
          <p className={styles.enterpriseNote}>
            Standart bir pakete sığmayan fikirleriniz varsa, size uygun çözümü
            birlikte planlayalım.
          </p>
        </article>
      </div>
      <section
        className={styles.modules}
        id="ek-moduller"
        aria-labelledby="modules-title"
      >
        <div className={styles.moduleHeading}>
          <div>
            <span>BASIC’E EKLEYİN · FULL SUITE’TE DAHİL</span>
            <h3 id="modules-title">İşletmenize biraz daha fazlası.</h3>
          </div>
          <p>
            Yalnızca ihtiyacınız olan modülü ekleyin.
            <br />
            Full Suite kullanıyorsanız modüller için ayrıca ücret ödemezsiniz.
          </p>
        </div>
        <div className={styles.moduleCards}>
          {modules.map((module) => (
            <article
              className={`${styles.card} ${styles.moduleCard}`}
              key={module.name}
              id={`${module.name.toLowerCase()}-fiyat`}
              aria-labelledby={`${module.name.toLowerCase()}-module-title`}
            >
              <div className={styles.moduleTop}>
                <div className={styles.planIcon}>
                  <module.icon size={23} strokeWidth={1.6} />
                </div>
                <span className={styles.moduleBadge}>
                  {module.upcoming ? "Yakında" : "Ek modül"}
                </span>
              </div>
              <h4 id={`${module.name.toLowerCase()}-module-title`}>
                Fincan {module.name} Modülü
              </h4>
              <p className={styles.description}>{module.description}</p>
              <a className={styles.moduleLearnMore} href={module.infoHref}>
                Nasıl çalışır? <ArrowUpRight size={14} />
              </a>
              <div className={styles.price}>
                <strong>
                  {formatPrice(module.monthly)} <span>TL</span>
                </strong>
                <span>/ ay</span>
              </div>
              <div className={styles.annual}>
                <span>Yıllık plan</span>
                <strong>
                  {formatPrice(module.yearly)} TL <span>/ yıl</span>
                </strong>
              </div>
              {module.upcoming ? (
                <p className={styles.moduleDetail}>
                  Personel ve vardiya yönetimi için planlanan CRM geliştirme
                  aşamasında. Kullanıma açıldığında Basic’e eklenebilecek ve
                  Full Suite’e dahil olacak.
                </p>
              ) : (
                <ul className={`${styles.features} ${styles.moduleFeatures}`}>
                  {[
                    "Stok ve ürün reçeteleri",
                    "Otomatik malzeme tüketimi",
                    "Gider, ciro ve tahmini kâr takibi",
                  ].map((feature) => (
                    <li key={feature}>
                      <Check size={16} />
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.moduleBottom}>
                <span>
                  <Check size={14} />
                  Full Suite’e dahil
                </span>
                <a
                  href="#demo"
                  className={styles.cta}
                  onClick={() => onChoose(`Fincan ${module.name} Modülü`)}
                >
                  {module.name} hakkında bilgi al <ArrowUpRight size={17} />
                </a>
              </div>
              <small className={styles.moduleDisclaimer}>
                Gösterilen ücret, Basic paket ücretine ek modül bedelidir.
              </small>
            </article>
          ))}
        </div>
      </section>
      <p className={styles.footnote}>
        Aylık ücretler aylık planı, yıllık ücretler bir yıllık toplam plan
        bedelini gösterir. CRM Modülü geliştirme aşamasındadır; kullanıma
        açıldığında Full Suite’e dahil olacaktır. Enterprise kapsamı ayrıca
        görüşülür.
      </p>
    </section>
  );
}
