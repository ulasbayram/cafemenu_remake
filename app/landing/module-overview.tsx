"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Clock3,
  Coffee,
  Milk,
  UsersRound,
  Warehouse,
} from "lucide-react";
import styles from "./module-overview.module.css";

export default function ModuleOverview() {
  const [active, setActive] = useState<"erp" | "crm">("erp");
  const section = useRef<HTMLElement>(null);
  function selectModule(module: "erp" | "crm") {
    setActive(module);
    // Keep deep links in sync without jumping away from the tab controls.
    window.history.replaceState(
      window.history.state,
      "",
      module === "erp" ? "#erp-hakkinda" : "#personel-hakkinda",
    );
  }

  useEffect(() => {
    // Pricing links also open the matching tab, including direct page links.
    const followHash = () => {
      const hash = window.location.hash;
      if (hash !== "#erp-hakkinda" && hash !== "#personel-hakkinda") return;
      setActive(hash === "#erp-hakkinda" ? "erp" : "crm");
      requestAnimationFrame(() => section.current?.scrollIntoView());
    };
    followHash();
    window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, []);

  return (
    <section
      ref={section}
      className={styles.overview}
      id="moduller"
      aria-labelledby="module-overview-title"
    >
      <div className={styles.heading}>
        <span>MENÜNÜZDEN İŞLETMENİZE</span>
        <h2 id="module-overview-title">
          Arka plandaki işler de
          <br />
          <em>biraz kolaylaşsın.</em>
        </h2>
        <p>
          ERP ile stok ve finans akışınızı takip edin. Planlanan personel
          modülüyle ekibinizin mesai ve satış verilerini aynı yerde görmeyi
          hedefliyoruz.
        </p>
      </div>

      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Fincan modülleri"
        onKeyDown={(event) => {
          const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
          if (!keys.includes(event.key)) return;
          event.preventDefault();
          const next =
            event.key === "Home"
              ? "erp"
              : event.key === "End"
                ? "crm"
                : active === "erp"
                  ? "crm"
                  : "erp";
          selectModule(next);
          event.currentTarget
            .querySelector<HTMLButtonElement>(`#module-tab-${next}`)
            ?.focus();
        }}
      >
        <button
          type="button"
          role="tab"
          id="module-tab-erp"
          aria-controls="erp-hakkinda"
          aria-selected={active === "erp"}
          tabIndex={active === "erp" ? 0 : -1}
          onClick={() => selectModule("erp")}
        >
          <Warehouse size={20} />
          <span>
            <strong>ERP</strong>
            <small>Stok ve finans</small>
          </span>
        </button>
        <button
          type="button"
          role="tab"
          id="module-tab-crm"
          aria-controls="personel-hakkinda"
          aria-selected={active === "crm"}
          tabIndex={active === "crm" ? 0 : -1}
          onClick={() => selectModule("crm")}
        >
          <UsersRound size={20} />
          <span>
            <strong>
              CRM <em>Yakında</em>
            </strong>
            <small>Personel ve vardiya</small>
          </span>
        </button>
      </div>

      <article
        className={styles.module}
        id="erp-hakkinda"
        role="tabpanel"
        aria-labelledby="module-tab-erp"
        hidden={active !== "erp"}
        tabIndex={0}
      >
        <div className={styles.copy}>
          <span className={styles.kicker}>
            <Warehouse size={17} /> FINCAN ERP MODÜLÜ
          </span>
          <h3 id="erp-overview-title">
            Ne tüketildi, ne kaldı,
            <br />
            ne kazandırdı?
          </h3>
          <p>
            Ürün reçetelerinizi tanımlayın. Fincan, ücreti alınan ve tamamlanan
            siparişlerde kullanılan malzemeleri stoktan otomatik düşsün.
          </p>
          <ol className={styles.steps}>
            <li>
              <span>01</span>
              <div>
                <h4>Malzemeleri ve reçeteleri ekleyin.</h4>
                <p>
                  Sütü litre, kahveyi kilogram, hazır ürünleri adet olarak takip
                  edin. Bir ürün için gereken miktarı belirleyin.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h4>Sipariş tamamlanınca stok güncellensin.</h4>
                <p>
                  Bir latte için 250 ml süt kullanılıyorsa stoktan 0,25 litre
                  düşer. Aynı malzeme farklı ürünlerin reçetelerinde de
                  kullanılabilir.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h4>Giderleri ve sonucu birlikte görün.</h4>
                <p>
                  Alış maliyetleri, işletme giderleri, günlük satış adedi ve
                  dönemsel ciro üzerinden tahmini kârı izleyin. Satış
                  eğilimlerini ve düşük stok uyarılarını görün.
                </p>
              </div>
            </li>
          </ol>
          <a className={styles.link} href="#erp-fiyat">
            ERP fiyatını inceleyin <ArrowUpRight size={17} />
          </a>
        </div>
        <div className={styles.visual}>
          <div className={styles.visualHeader}>
            <span>
              <Warehouse size={16} />
              Stok akışı
            </span>
            <small>Örnek senaryo</small>
          </div>
          <div className={styles.product}>
            <span>
              <Coffee size={25} strokeWidth={1.5} />
            </span>
            <div>
              <strong>1 Caffè Latte</strong>
              <small>Sipariş tamamlandı</small>
            </div>
            <Check size={18} />
          </div>
          <div className={styles.recipe}>
            <Milk size={19} />
            <span>Reçetede kullanılan süt</span>
            <strong>
              250 ml <small>= 0,25 L</small>
            </strong>
          </div>
          <div className={styles.stockComparison}>
            <div>
              <span>Önce</span>
              <strong>
                100 <small>L</small>
              </strong>
            </div>
            <ArrowDown size={19} />
            <div>
              <span>Kalan süt stoğu</span>
              <strong>
                99,75 <small>L</small>
              </strong>
            </div>
          </div>
          <div className={styles.insight}>
            <Check size={15} />
            <p>
              Stok hareketi ve satışın malzeme maliyeti birlikte kaydedilir.
            </p>
          </div>
          <p className={styles.caption}>
            Tamamlanma anındaki maliyet korunur. Maliyet bilgisi eksikse raporda
            belirtilir.
          </p>
        </div>
      </article>

      <article
        className={styles.module}
        id="personel-hakkinda"
        role="tabpanel"
        aria-labelledby="module-tab-crm"
        hidden={active !== "crm"}
        tabIndex={0}
      >
        <div className={styles.copy}>
          <span className={styles.kicker}>
            <UsersRound size={17} /> FINCAN CRM MODÜLÜ <small>Yakında</small>
          </span>
          <h3 id="staff-overview-title">
            Ekibinizin mesaisi,
            <br />
            işletmenizin günlük akışı.
          </h3>
          <p>
            Personel ve vardiya yönetimi için planlanan modül: önceden
            belirlenen çalışma saatleri, uygulamadan bildirilen giriş ve
            çıkışlar, mesaiye göre satış dağılımı.
          </p>
          <ol className={styles.steps}>
            <li>
              <span>01</span>
              <div>
                <h4>Çalışma saatlerini önceden planlayın.</h4>
                <p>
                  Yönetici, personelleri ve beklenen giriş–çıkış saatlerini
                  tanımlar. Ekibin çalışma planı tek yerde görünür.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h4>Personel mesaisini uygulamadan bildirsin.</h4>
                <p>
                  Personel, işe başladığında girişini ve mesaisi bittiğinde
                  çıkışını bildirir. Planlanan ve gerçekleşen saatler birlikte
                  takip edilir.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h4>Mesai saatlerindeki satışları izleyin.</h4>
                <p>
                  Çalışma süresindeki satışlar personel bazında dağıtılarak
                  raporlanır. Vardiyaların ve personellerin satış içindeki payı
                  görülebilir.
                </p>
              </div>
            </li>
          </ol>
          <a className={styles.link} href="#crm-fiyat">
            Personel modülünün fiyatını inceleyin <ArrowUpRight size={17} />
          </a>
        </div>
        <div className={styles.visual}>
          <div className={styles.visualHeader}>
            <span>
              <Clock3 size={16} />
              Personel ve vardiya
            </span>
            <small>Planlanan akış</small>
          </div>
          <div className={styles.shift}>
            <span>Örnek çalışma planı</span>
            <strong>
              09.00 <span>—</span> 17.00
            </strong>
          </div>
          <div className={styles.attendance}>
            <div>
              <span className={styles.dot} />
              <p>
                Giriş bildirimi<small>Personel uygulamadan bildirdi</small>
              </p>
              <strong>09.03</strong>
            </div>
            <div>
              <span className={styles.dot} />
              <p>
                Çıkış bildirimi<small>Gerçekleşen mesai kaydı</small>
              </p>
              <strong>17.02</strong>
            </div>
          </div>
          <div className={styles.salesFlow}>
            <span>Mesai saatlerindeki satışlar</span>
            <ArrowDown size={18} />
            <div>
              <span>
                <UsersRound size={15} />
                Deniz
              </span>
              <span>
                <UsersRound size={15} />
                Ece
              </span>
            </div>
            <small>Personel bazında satış dağılımı</small>
          </div>
          <p className={styles.caption}>
            Örnek arayüzdür. Personel modülü henüz kullanıma açık değildir.
          </p>
        </div>
      </article>
    </section>
  );
}
