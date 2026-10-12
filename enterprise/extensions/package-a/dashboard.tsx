"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ModuleNavigation from "@/modules/navigation";
import {
  ArrowUpRight,
  Building2,
  ChartNoAxesCombined,
  Crown,
  Coffee,
  ClipboardList,
  Users,
  Banknote,
  ChevronRight,
  LoaderCircle,
  Info,
  RefreshCw,
  Puzzle,
} from "lucide-react";
import { api } from "@/lib/client-api";
import { supabase } from "@/lib/supabase-browser";
import VisitChart from "@/app/visit-chart";
import PackageAOrders from "./order-workspace";
import type { PackageAData } from "./types";
import styles from "./dashboard.module.css";
const tabs = [
  { key: "overview", label: "Genel bakış", icon: Building2 },
  { key: "orders", label: "Siparişler", icon: ClipboardList },
  { key: "insights", label: "İstatistikler", icon: ChartNoAxesCombined },
  { key: "extension", label: "Özel özellikler", icon: Puzzle },
] as const;
const money = (value: number) =>
  value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

export default function PackageADashboard({
  preview,
  initialData,
  requestedCafe,
}: {
  preview: boolean;
  initialData: PackageAData | null;
  requestedCafe?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("overview");
  const [loading, setLoading] = useState(!preview),
    [error, setError] = useState("");
  const endpoint = `/api/enterprise/package-a${requestedCafe ? `?cafe=${encodeURIComponent(requestedCafe)}` : ""}`;
  useEffect(() => {
    if (preview) return;
    let active = true;
    (async () => {
      const { data: session } = await supabase().auth.getSession();
      if (!active) return;
      if (!session.session) {
        const next = `/enterprise/package-a${requestedCafe ? `?cafe=${encodeURIComponent(requestedCafe)}` : ""}`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      try {
        const response = await api<PackageAData>(endpoint);
        if (active) setData(response);
      } catch (error) {
        if (active) setError((error as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })().catch((error) => {
      if (active) {
        setError((error as Error).message);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [preview, endpoint, requestedCafe, router]);
  async function refresh() {
    if (preview) return;
    setLoading(true);
    setError("");
    try {
      setData(await api<PackageAData>(endpoint));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const cafe = data?.cafe;
  const visitCount =
    data?.visits.reduce((sum, visit) => sum + visit.count, 0) ?? 0;
  const activeOrders =
    data?.orders.filter((order) => order.status !== "completed") ?? [];
  const revenue =
    data?.orders
      .filter((order) => order.status === "completed")
      .reduce((sum, order) => sum + order.total, 0) ?? 0;

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/?view=overview" className={styles.brand}>
          <Coffee size={24} />
          fincan<span>enterprise</span>
        </Link>
        <div className={styles.customer}>
          <span>
            <Crown size={20} />
          </span>
          <div>
            <strong>{cafe?.name ?? "Özel çalışma alanı"}</strong>
            <small>Paket A · Müşteriye özel</small>
          </div>
        </div>
        <nav aria-label="Enterprise gezinmesi">
          {tabs.map((entry) => (
            <button
              key={entry.key}
              aria-current={tab === entry.key ? "page" : undefined}
              className={tab === entry.key ? styles.active : ""}
              onClick={() => setTab(entry.key)}
            >
              <entry.icon size={19} />
              {entry.label}
              <ChevronRight size={14} />
            </button>
          ))}
        </nav>
        <ModuleNavigation />
        <div className={styles.sidebarFoot}>
          <p>
            Özel ekranlar.
            <br />
            Yalnızca sizin veriniz.
          </p>
        </div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <span>
            <Crown size={15} />
            PAKET A · ENTERPRISE
          </span>
          <Link href="/?view=overview">
            Standart panel <ArrowUpRight size={15} />
          </Link>
        </header>
        <div className={styles.content}>
          {preview && (
            <div className={styles.previewNotice}>
              <Info size={17} />
              <div>
                <strong>
                  Geliştirme önizlemesi · {cafe?.name} örnek hesabı
                </strong>
                <span>
                  Tek işletme kapsamı. Canlı veriler kullanılmaz veya
                  değiştirilmez.
                </span>
              </div>
            </div>
          )}
          <div className={styles.heading}>
            <div>
              <span className={styles.eyebrow}>
                MÜŞTERİYE ÖZEL ÇALIŞMA ALANI
              </span>
              <h1>
                {cafe?.name ?? "Enterprise"}
                <br />
                <span>Paket A Dashboard</span>
              </h1>
              <p>
                Aynı özel özellikler, her müşterinin kendi işletmesine ait
                veriler.
              </p>
            </div>
            {preview && (
              <div
                className={styles.scenarios}
                aria-label="Ayrı örnek hesap senaryoları"
              >
                <span>Örnek hesabı ayrı aç</span>
                <Link
                  href="/enterprise/package-a?preview=1&scenario=ortak"
                  aria-current={
                    cafe?.id === "preview-ortak" ? "page" : undefined
                  }
                >
                  Ortak Kafe
                </Link>
                <Link
                  href="/enterprise/package-a?preview=1&scenario=nova"
                  aria-current={
                    cafe?.id === "preview-nova" ? "page" : undefined
                  }
                >
                  Nova Kafe
                </Link>
              </div>
            )}
          </div>
          {error && (
            <div className={styles.error} role="alert">
              <Info size={20} />
              <div>
                <strong>Çalışma alanı açılamadı</strong>
                <p>{error}</p>
              </div>
              <button onClick={() => void refresh()}>
                <RefreshCw size={16} />
                Tekrar dene
              </button>
            </div>
          )}
          {loading && !data ? (
            <div className={styles.empty}>
              <LoaderCircle size={27} className="spin" />
              Çalışma alanı yükleniyor…
            </div>
          ) : (
            data &&
            cafe && (
              <>
                {tab === "overview" && (
                  <>
                    <section className={styles.metrics}>
                      {[
                        {
                          label: "Tanımlı masalar",
                          value: String(cafe.tableCount),
                          note: "Yalnızca bu işletme",
                          icon: Building2,
                        },
                        {
                          label: "Son 7 gün ziyaretleri",
                          value: visitCount.toLocaleString("tr-TR"),
                          note: "Günlük tekil ziyaret toplamı",
                          icon: Users,
                        },
                        {
                          label: "Aktif siparişler",
                          value: String(activeOrders.length),
                          note: "Son 7 gün · Bekleyen ve teslim edilen",
                          icon: ClipboardList,
                        },
                        {
                          label: "Tamamlanan sipariş tutarı",
                          value: money(revenue),
                          note: "Son 7 gün · Tamamlanan siparişler",
                          icon: Banknote,
                        },
                      ].map((metric) => (
                        <article key={metric.label}>
                          <span>
                            <metric.icon size={18} />
                          </span>
                          <small>{metric.label}</small>
                          <strong>{metric.value}</strong>
                          <p>{metric.note}</p>
                        </article>
                      ))}
                    </section>
                    <section className={styles.overviewGrid}>
                      <div className={styles.panel}>
                        <header>
                          <div>
                            <span className={styles.eyebrow}>
                              ÇALIŞMA ALANINIZ
                            </span>
                            <h2>Bugün nereden başlayalım?</h2>
                          </div>
                        </header>
                        <div className={styles.shortcuts}>
                          {tabs.slice(1).map((entry) => (
                            <button
                              key={entry.key}
                              onClick={() => setTab(entry.key)}
                            >
                              <span>
                                <entry.icon size={23} />
                              </span>
                              <strong>{entry.label}</strong>
                              <ArrowUpRight size={18} />
                            </button>
                          ))}
                        </div>
                        <p className={styles.caption}>
                          Bu ekranlardaki tüm veriler {cafe.name} işletmesine
                          aittir.
                        </p>
                      </div>
                      <div className={styles.customerNote}>
                        <Crown size={27} />
                        <h2>Aynı paket. Ayrı hesap.</h2>
                        <p>
                          Paket A özel ekranları sağlar. İşletme verileriniz
                          diğer Paket A müşterileriyle paylaşılmaz.
                        </p>
                        <span>ERP ve modüllerden bağımsız</span>
                      </div>
                    </section>
                    <section className={styles.cafeSection}>
                      <div className={styles.sectionTitle}>
                        <h2>İşletmeniz</h2>
                        <span>Tek işletme kapsamı</span>
                      </div>
                      <div className={styles.cafeCards}>
                        <article>
                          <div className={styles.cafeHeader}>
                            <span className={styles.ortakMark}>
                              {cafe.name.charAt(0)}
                            </span>
                            <span className={styles.pill}>
                              {cafe.published ? "Yayında" : "Taslak"}
                            </span>
                          </div>
                          <h3>{cafe.name}</h3>
                          <p>{cafe.location || "Konum eklenmemiş"}</p>
                          <div className={styles.cafeNumbers}>
                            <span>
                              <strong>{cafe.tableCount}</strong>Masa
                            </span>
                            <span>
                              <strong>{visitCount}</strong>Ziyaret · 7 gün
                            </span>
                            <span>
                              <strong>{activeOrders.length}</strong>Aktif
                              sipariş
                            </span>
                          </div>
                          <button onClick={() => setTab("orders")}>
                            Siparişler <ChevronRight size={16} />
                          </button>
                        </article>
                      </div>
                    </section>
                  </>
                )}
                {tab === "orders" && (
                  <PackageAOrders
                    cafe={cafe}
                    initialOrders={data.orders}
                    preview={preview}
                    onPreviewChange={(orders) =>
                      setData((current) =>
                        current ? { ...current, orders } : current,
                      )
                    }
                    onChanged={() => void refresh()}
                  />
                )}
                {tab === "insights" && (
                  <section className={styles.chartContainer}>
                    <VisitChart
                      visits={data.visits}
                      days={7}
                      today={data.today}
                      cafes={[cafe]}
                      loading={false}
                      title={`${cafe.name} · Ziyaretler`}
                      showTotal
                    />
                  </section>
                )}
                {tab === "extension" && (
                  <section className={styles.panel}>
                    <header>
                      <div>
                        <span className={styles.eyebrow}>PAKET A UZANTISI</span>
                        <h2>Paket A’ya özel sipariş araçları</h2>
                      </div>
                      <Puzzle size={26} />
                    </header>
                    <p className={styles.caption}>
                      Manuel sipariş ekleme ve ürün, adet, fiyat, masa düzenleme
                      bu pakete özeldir. Araçları Siparişler ekranında kullanabilirsiniz.
                    </p>
                    <button className={styles.refresh} onClick={() => setTab("orders")}>Sipariş araçlarını aç <ChevronRight size={16} /></button>
                  </section>
                )}
              </>
            )
          )}
          {preview && (
            <details className={styles.foundation}>
              <summary>Bu temel nasıl çalışıyor?</summary>
              <p>
                Paket, kullanılacak özel ekranları belirler. Kullanıcı ve
                işletme ataması, görülebilecek kayıtları belirler. Ortak Kafe
                ile Nova Kafe aynı Paket A kodunu kullanır; sorgular her istekte
                yalnızca atanmış işletmeyle sınırlanır. Bu örnek hesap
                değiştiricisi yalnızca geliştirme önizlemesindedir.
              </p>
              <div>
                <span>Aynı özellik paketi</span>
                <span>Ayrı işletme verileri</span>
                <span>Bağımsız modül yetkileri</span>
              </div>
            </details>
          )}
        </div>
      </div>
    </main>
  );
}
