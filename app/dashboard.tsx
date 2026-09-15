"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Sites authentication requires top-level navigation, never Next prefetch. */
/* eslint-disable @next/next/no-img-element -- QR is an in-memory PNG, not an image optimizer source. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "./theme-toggle";
import { useEffect, useState, useRef, type ReactNode } from "react";
import {
  Coffee,
  LayoutDashboard,
  Store,
  BookOpen,
  ScanLine,
  ChartNoAxesCombined,
  Settings,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Plus,
  Users,
  Eye,
  QrCode,
  ArrowRight,
  ArrowLeft,
  Download,
  Check,
  Palette,
  Globe,
  X,
  Save,
  ExternalLink,
  Copy,
  CalendarDays,
  Search,
  LoaderCircle,
  LogIn,
  Clock,
  Menu,
  Info,
  Printer,
  Package,
  ClipboardList,
} from "lucide-react";
import { Cafe, Item, cafeSlug, slugify, sampleItems } from "@/lib/menu";
import { type Rates } from "./menu-view";
import { parseMenu } from "@/lib/ocr";
import { socialFields } from "@/lib/social-links";
import { api } from "@/lib/client-api";
import ProductsManager from "./products-manager";
import OrdersManager from "./orders-manager";
type Tab =
  | "overview"
  | "cafes"
  | "menus"
  | "products"
  | "orders"
  | "import"
  | "stats"
  | "settings";
type Stat = { cafe: string; day: string; hour: number; count: number };
type QrOptions = Parameters<typeof import("qrcode").toDataURL>[1];

async function qrDataUrl(text: string, options: QrOptions) {
  const qrModule = await import("qrcode");
  const toDataURL = qrModule.toDataURL ?? qrModule.default?.toDataURL;
  if (!toDataURL) throw new Error("QR encoder could not be loaded.");
  return toDataURL(text, options);
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      aria-label={title}
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-title">
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Kapat" onClick={close}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function Dashboard({
  initialTab = "overview",
}: {
  initialTab?: Tab;
}) {
  const router = useRouter();
  const sidebarRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const sidebarBackRef = useRef<HTMLButtonElement>(null);
  const [cafeDetails, setCafeDetails] = useState<Cafe | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(initialTab),
    [cafes, setCafes] = useState<Cafe[]>([]),
    [stats, setStats] = useState<Stat[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [rates, setRates] = useState<Rates | null>(null),
    [rateError, setRateError] = useState(false),
    [selected, setSelected] = useState("all"),
    [period, setPeriod] = useState("7"),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState("");
  const [user, setUser] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [create, setCreate] = useState(false),
    [newName, setNewName] = useState(""),
    [newSlug, setNewSlug] = useState(""),
    [newLocation, setNewLocation] = useState(""),
    [withSample, setWithSample] = useState(false),
    [busy, setBusy] = useState(false),
    [qr, setQr] = useState<Cafe | null>(null),
    [qrImage, setQrImage] = useState<{ id: string; url: string } | null>(null),
    [qrTables, setQrTables] = useState<{
      id: string;
      slug: string;
      tableCount: number;
      name: string;
    } | null>(null),
    [qrTableImages, setQrTableImages] = useState<string[]>([]),
    [rawText, setRawText] = useState(""),
    [importItems, setImportItems] = useState<Item[]>([]),
    [scanCafe, setScanCafe] = useState(""),
    [detailsBusy, setDetailsBusy] = useState(false);
  const now = new Date();
  const dateLabel = now.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const signedIn = !!user;
  const userName = user?.name || "";
  const userEmail = user?.email || "";
  const qrUrl = qrImage?.id === qr?.id ? qrImage?.url || "" : "";
  useEffect(() => {
    let active = true;
    async function initialize() {
      const { supabase } = await import("@/lib/supabase-browser");
      let session: { name: string; email: string } | null = null;
      try {
        const { data } = await supabase().auth.getSession();
        const u = data.session?.user;
        if (u) {
          const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
          session = {
            name:
              (typeof meta.full_name === "string" && meta.full_name) ||
              (typeof meta.name === "string" && meta.name) ||
              u.email?.split("@")[0] ||
              "Kafe Yöneticisi",
            email: u.email || "",
          };
        }
      } catch {
        // Supabase not configured yet — treat as signed out.
      }
      if (!session) {
        window.location.assign(new URL("/login", window.location.origin).href);
        return;
      }
      if (active) setUser(session);
      try {
        const [c, s] = await Promise.all([
          api<Cafe[]>("/api/cafes"),
          api<Stat[]>("/api/stats"),
        ]);
        if (active) {
          setCafes(c);
          setStats(s);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
      try {
        const r = await fetch("/api/rates");
        if (!r.ok) throw new Error();
        const data = (await r.json()) as Rates;
        if (active) setRates(data);
      } catch {
        if (active) setRateError(true);
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    if (!qr) return;
    let active = true;
    qrDataUrl(`${window.location.origin}/${qr.slug}`, {
      width: 800,
      margin: 4,
      color: { dark: "#172f27", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (active) setQrImage({ id: qr.id, url });
      })
      .catch((cause) => {
        console.error("QR generation failed", cause);
        if (active) setError("QR kod oluşturulamadı.");
      });
    return () => {
      active = false;
    };
  }, [qr]);
  useEffect(() => {
    if (!qrTables) return;
    let active = true;
    Promise.resolve()
      .then(async () => {
        const { links } = await api<{
          links: { table: number; path: string }[];
        }>(`/api/cafes/${qrTables.id}/table-links`);
        const urls: string[] = [];
        for (const link of links) {
          urls.push(
            await qrDataUrl(`${window.location.origin}${link.path}`, {
              width: 600,
              margin: 3,
              color: { dark: "#172f27", light: "#ffffff" },
              errorCorrectionLevel: "M",
            }),
          );
        }
        if (active) setQrTableImages(urls);
      })
      .catch((cause) => {
        console.error("Table QR generation failed", cause);
        if (active) setError("QR kodları oluşturulamadı.");
      });
    return () => {
      active = false;
    };
  }, [qrTables]);

  useEffect(() => {
    if (!mobile) return;
    const menuToggle = menuToggleRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarBackRef.current?.focus();
    const desktop = window.matchMedia("(min-width: 721px)");
    const onResize = () => {
      if (desktop.matches) setMobile(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobile(false);
      }
      if (event.key !== "Tab") return;
      const controls = sidebarRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), [tabindex="0"]',
      );
      if (!controls?.length) return;
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    desktop.addEventListener("change", onResize);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", onResize);
      document.removeEventListener("keydown", onKey);
      requestAnimationFrame(() => menuToggle?.focus());
    };
  }, [mobile]);

  function navigate(t: Tab) {
    setTab(t);
    window.history.replaceState(
      null,
      "",
      t === "overview" ? "/" : `/?view=${t}`,
    );
    setMobile(false);
    setError("");
  }
  function startCreate() {
    if (!signedIn) {
      window.location.assign(new URL("/login", window.location.origin).href);
      return;
    }
    setNewName("");
    setNewSlug("");
    setNewLocation("");
    setCreate(true);
    setWithSample(false);
    setError("");
  }
  async function createCafe() {
    setBusy(true);
    setError("");
    try {
      const normalizedSlug = cafeSlug(newSlug, newName);
      setNewSlug(normalizedSlug);
      const c = await api<Cafe>("/api/cafes", {
        name: newName.trim(),
        slug: normalizedSlug,
        location: newLocation.trim(),
        subtitle: "Küçük bir mola, güzel bir kahve.",
        accent: "#245b46",
        style: "classic",
        published: false,
        tableCount: 0,
        items: withSample ? sampleItems : [],
      });
      setCafes((p) => [c, ...p]);
      setCreate(false);
      setTab("cafes");
      setToast("Kafeniz ve QR kodunuz hazır. Menünüzü düzenleyebilirsiniz.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function openEditor(c: Cafe) {
    router.push(`/editor/${c.id}`);
  }
  async function saveCafeDetails() {
    if (!cafeDetails) return;
    setDetailsBusy(true);
    try {
      const updated = await api<Cafe>(
        `/api/cafes/${cafeDetails.id}`,
        cafeDetails,
        "PUT",
      );
      setCafes((p) => p.map((c) => (c.id === updated.id ? updated : c)));
      setCafeDetails(null);
      setToast("Kafe bilgileri kaydedildi.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDetailsBusy(false);
    }
  }
  async function logout() {
    try {
      const { supabase } = await import("@/lib/supabase-browser");
      await supabase().auth.signOut();
      window.location.assign(new URL("/login", window.location.origin).href);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function importMenu() {
    const c = cafes.find((c) => c.id === scanCafe);
    if (!c) {
      setError("Aktarılacak kafeyi seçin.");
      return;
    }
    setBusy(true);
    try {
      const updated = await api<Cafe>(
        `/api/cafes/${c.id}`,
        { ...c, items: [...c.items, ...importItems] },
        "PUT",
      );
      setCafes((p) => p.map((x) => (x.id === c.id ? updated : x)));
      setImportItems([]);
      setRawText("");
      setToast(`${importItems.length} ürün menüye eklendi.`);
      openEditor(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const today = now.toLocaleDateString("en-CA", {
      timeZone: "Europe/Istanbul",
    }),
    since = new Date(
      now.getTime() - (Number(period) - 1) * 86400000,
    ).toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" }),
    filtered = stats.filter(
      (s) => (selected === "all" || s.cafe === selected) && s.day >= since,
    ),
    todayCount = filtered
      .filter((s) => s.day === today)
      .reduce((a, s) => a + s.count, 0),
    total = filtered.reduce((a, s) => a + s.count, 0),
    visibleCafes = cafes.filter(
      (c) =>
        (selected === "all" || c.id === selected) &&
        c.name.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")),
    ),
    nav = [
      { id: "overview", label: "Genel bakış", icon: LayoutDashboard },
      { id: "cafes", label: "Kafelerim", icon: Store },
      { id: "menus", label: "Menü yönetimi", icon: BookOpen },
      { id: "products", label: "Ürünler", icon: Package },
      { id: "orders", label: "Siparişler", icon: ClipboardList },
      { id: "import", label: "Menü yapıştır", icon: ScanLine },
      { id: "stats", label: "İstatistikler", icon: ChartNoAxesCombined },
    ] as const;
  const hours = Array.from({ length: 12 }, (_, i) => {
      const hour = i * 2;
      return {
        hour,
        count: filtered
          .filter((s) => s.hour >= hour && s.hour < hour + 2)
          .reduce((a, s) => a + s.count, 0),
      };
    }),
    max = Math.max(
      4,
      Math.ceil(Math.max(0, ...hours.map((h) => h.count)) / 4) * 4,
    );
  const heading: Record<Tab, string> = {
    overview: "Genel bakış",
    cafes: "Kafelerim",
    menus: "Menü yönetimi",
    products: "Ürünler ve kategoriler",
    orders: "Siparişler",
    import: "Fiziksel menünüz, dijital olsun.",
    stats: "Menünüzün nabzını tutun.",
    settings: "Hesap ve kullanım",
  };
  return (
    <div className="app-shell">
      <button
        className={`sidebar-backdrop ${mobile ? "visible" : ""}`}
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => setMobile(false)}
      />
      <aside
        id="dashboard-sidebar"
        ref={sidebarRef}
        aria-label="Ana gezinme"
        className={`sidebar ${mobile ? "mobile-open" : ""}`}
      >
        <button
          ref={sidebarBackRef}
          className="sidebar-back"
          onClick={() => setMobile(false)}
          aria-label="Geri, gezinmeyi kapat"
        >
          <ArrowLeft size={18} /> Geri
        </button>
        <Link className="brand" href="/">
          <span>
            <Coffee size={24} />
          </span>
          fincan<span className="brand-period">.</span>
        </Link>
        <div className="workspace-label">ÇALIŞMA ALANINIZ</div>
        <button className="workspace-switch" onClick={() => navigate("cafes")}>
          <span className="workspace-icon">
            <Store size={18} />
          </span>
          <span>
            <strong>Kafe yönetimi</strong>
            <small>{cafes.length} kafe · Kişisel hesap</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">YÖNETİM</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "active" : ""}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.id === "import" && <span className="nav-badge">ÜCRETSİZ</span>}
              {n.id === "cafes" && cafes.length > 0 && (
                <span className="nav-count">{cafes.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="small-promo">
            <span className="promo-icon">
              <QrCode size={21} />
            </span>
            <h3>Bir QR. Koca bir menü.</h3>
            <p>
              Menünüz değişsin,
              <br />
              QR kodunuz aynı kalsın.
            </p>
            <button onClick={() => navigate("cafes")}>
              QR kodlarım <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className={`settings-nav ${tab === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Settings size={18} />
            Ayarlar
          </button>
          <div className="profile">
            <span className="avatar">
              {signedIn ? userName.slice(0, 1).toUpperCase() : "K"}
            </span>
            <span>
              <strong>{userName}</strong>
              <small>
                {signedIn ? "Kişisel hesap" : "Başlamak için giriş yapın"}
              </small>
            </span>
            {!signedIn && (
              <a href="/login" title="Giriş yap">
                <LogIn size={17} />
              </a>
            )}
          </div>
        </div>
      </aside>
      <div className="workspace" inert={mobile}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-toggle"
              ref={menuToggleRef}
              onClick={() => setMobile(true)}
              aria-label="Gezinmeyi aç"
              aria-expanded={mobile}
              aria-controls="dashboard-sidebar"
            >
              <Menu size={21} />
            </button>
            <span>Çalışma alanı</span>
            <ChevronRight size={14} />
            <strong>{heading[tab]}</strong>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <span className="live-label">
              <span /> Her şey bir fincanla başlar
            </span>
            <button
              type="button"
              className="avatar small profile-trigger"
              aria-label="Hesap bilgilerini görüntüle"
              aria-haspopup="dialog"
              onClick={() => setProfileOpen(true)}
            >
              {userName.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>
        <main className="main-content" key={tab}>
          {error && (
            <div className="error-banner" role="alert">
              <Info size={18} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Uyarıyı kapat">
                <X size={16} />
              </button>
            </div>
          )}
          <>
            <div className="page-heading">
              <div>
                {tab === "overview" && (
                  <div className="eyebrow">KAFENİZİN DİJİTAL KÖŞESİ</div>
                )}
                <h1>
                  {tab === "overview"
                    ? "Güzel bir güne merhaba."
                    : heading[tab]}
                </h1>
                <p>
                  {tab === "overview"
                    ? "Menüleriniz, kafeleriniz ve küçük ama değerli içgörüler."
                    : tab === "cafes"
                      ? "Tüm kafeleriniz, tek bir yerde."
                      : tab === "menus"
                        ? "Her kafenin ruhuna uygun bir menü tasarlayın."
                        : tab === "products"
                          ? "Kategorileri ve ürünleri tek bir çalışma alanından yönetin."
                          : tab === "orders"
                            ? "Masalardan gelen siparişleri takip edin."
                            : tab === "import"
                              ? "Menü metnini yapıştırın. Ürünleri kontrol edin. Menünüze ekleyin."
                              : tab === "stats"
                                ? "Gerçek menü ziyaretleriyle gününüzü daha iyi anlayın."
                                : "Sade, şeffaf ve düşük maliyetli bir çalışma alanı."}
                </p>
              </div>
              <div className="heading-actions">
                {(tab === "overview" || tab === "stats") && (
                  <span className="date-chip">
                    <CalendarDays size={16} />
                    {dateLabel}
                  </span>
                )}
                {tab !== "settings" &&
                  tab !== "import" &&
                  tab !== "menus" &&
                  tab !== "products" &&
                  tab !== "orders" && (
                    <button className="btn primary" onClick={startCreate}>
                      <Plus size={18} /> Yeni kafe ekle
                    </button>
                  )}
              </div>
            </div>
            {(tab === "overview" || tab === "stats") && (
              <>
                <div className="filter-row">
                  <select
                    aria-label="Kafe filtresi"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    <option value="all">Tüm kafeler</option>
                    {cafes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <div className="period-control">
                    {["1", "7", "30"].map((v, i) => (
                      <button
                        key={v}
                        className={period === v ? "active" : ""}
                        onClick={() => setPeriod(v)}
                      >
                        {["Bugün", "Son 7 gün", "Son 30 gün"][i]}
                      </button>
                    ))}
                  </div>
                  <span className="muted period-note">
                    Türkiye saati · Günlük tekil ziyaretler
                  </span>
                </div>
                <div className="stats-grid">
                  {[
                    {
                      label: "Bugünkü ziyaretçiler",
                      value: todayCount,
                      icon: Users,
                      note: "Bugün menünüze uğrayanlar",
                      color: "green",
                    },
                    {
                      label: "Dönem ziyaretleri",
                      value: total,
                      icon: Eye,
                      note:
                        period === "1"
                          ? "Bugün"
                          : `Son ${period} gündeki günlük tekiller`,
                      color: "blue",
                    },
                    {
                      label: "Yayındaki kafeler",
                      value: cafes.filter(
                        (c) =>
                          c.published &&
                          (selected === "all" || c.id === selected),
                      ).length,
                      icon: Store,
                      note: "Misafirlerini karşılamaya hazır",
                      color: "orange",
                    },
                    {
                      label: "Menüdeki ürünler",
                      value: visibleCafes.reduce(
                        (a, c) => a + c.items.filter((i) => i.available).length,
                        0,
                      ),
                      icon: BookOpen,
                      note: "Keşfedilmeyi bekleyen lezzetler",
                      color: "purple",
                    },
                  ].map((s) => (
                    <section className="stat-card" key={s.label}>
                      <div>
                        <span>{s.label}</span>
                        <span className={`stat-icon ${s.color}`}>
                          <s.icon size={18} />
                        </span>
                      </div>
                      <strong>
                        {loading ? "—" : s.value.toLocaleString("tr-TR")}
                      </strong>
                      <small>{s.note}</small>
                    </section>
                  ))}
                </div>
                <div className="analytics-grid">
                  <section className="panel chart-panel">
                    <div className="panel-title">
                      <div>
                        <h2>Ziyaretçi trafiği</h2>
                        <p>Günün en hareketli saatlerini keşfedin.</p>
                      </div>
                      <span className="chart-legend">
                        <i /> Menü ziyaretleri
                      </span>
                    </div>
                    <div className="chart">
                      <div className="chart-axis">
                        {[4, 3, 2, 1, 0].map((n) => (
                          <span key={n}>{Math.ceil((max * n) / 4)}</span>
                        ))}
                      </div>
                      <div className="chart-body">
                        <div className="chart-grid">
                          {[0, 1, 2, 3, 4].map((n) => (
                            <i key={n} />
                          ))}
                        </div>
                        <div className="chart-bars">
                          {hours.map((h) => (
                            <div key={h.hour} className="bar-slot">
                              <div
                                className="bar"
                                style={{ height: `${(h.count / max) * 92}%` }}
                                title={`${String(h.hour).padStart(2, "0")}:00 · ${h.count} ziyaret`}
                              />
                              <span>{String(h.hour).padStart(2, "0")}:00</span>
                            </div>
                          ))}
                        </div>
                        {total === 0 && (
                          <div className="chart-empty">
                            <span>
                              <ChartNoAxesCombined size={23} />
                            </span>
                            <strong>İlk ziyaretinizle hareketlenecek.</strong>
                            <small>
                              QR menünüzü paylaşın, veriler burada biriksin.
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="chart-footer">
                      <Clock size={14} />
                      <span>
                        Aynı tarayıcı, aynı gün içinde bir kez sayılır.
                      </span>
                    </div>
                  </section>
                  <section className="currency-card">
                    <div className="currency-header">
                      <span className="currency-icon">
                        <Globe size={21} />
                      </span>
                      <span className="pill">
                        {rates
                          ? rates.stale
                            ? "Son bilinen"
                            : "Günlük kur"
                          : "Döviz kurları"}
                      </span>
                    </div>
                    <h2>Menünüz sınır tanımasın.</h2>
                    <p>Misafirleriniz fiyatları kendi para biriminde görsün.</p>
                    <div className="exchange-row">
                      <span>
                        <b>$</b> Amerikan Doları
                      </span>
                      <strong>
                        {rates ? `₺${(1 / rates.USD).toFixed(2)}` : "—"}
                      </strong>
                    </div>
                    <div className="exchange-row">
                      <span>
                        <b>€</b> Euro
                      </span>
                      <strong>
                        {rates ? `₺${(1 / rates.EUR).toFixed(2)}` : "—"}
                      </strong>
                    </div>
                    <div className="currency-source">
                      <span className="status-dot" />
                      {rates
                        ? `ECB · ${rates.date}`
                        : rateError
                          ? "Kur bilgisi şu an alınamıyor"
                          : "Kur bilgisi yükleniyor…"}
                    </div>
                    <span className="currency-foot">
                      Otomatik dönüşüm. Ekstra işlem ücreti yok.
                    </span>
                  </section>
                </div>
              </>
            )}
            {(tab === "overview" || tab === "cafes") && (
              <section className="cafes-section">
                <div className="section-title">
                  <h2>
                    Kafelerim <span>{cafes.length}</span>
                  </h2>
                  {tab === "overview" ? (
                    <button
                      className="text-btn"
                      onClick={() => navigate("cafes")}
                    >
                      Tüm kafeleri gör <ArrowRight size={16} />
                    </button>
                  ) : (
                    <div className="search-input">
                      <Search size={17} />
                      <input
                        placeholder="Kafe ara…"
                        aria-label="Kafe ara"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                {loading ? (
                  <div className="panel loading-state">
                    <LoaderCircle className="spin" /> Kafeleriniz yükleniyor…
                  </div>
                ) : cafes.length === 0 ? (
                  <div className="onboarding-card">
                    <div className="onboarding-copy">
                      <span className="eyebrow">İLK FİNCAN SİZDEN</span>
                      <h2>
                        Yeni nesil menünüzle
                        <br />
                        tanışmaya hazır mısınız?
                      </h2>
                      <p>
                        Kafenizi ekleyin, menünüzü kendinize göre tasarlayın.
                        <br />
                        QR kodunuz gerisini halletsin.
                      </p>
                      <button className="btn primary" onClick={startCreate}>
                        <Plus size={17} /> İlk kafemi oluştur
                      </button>
                      <span className="onboard-note">
                        <Check size={14} /> Ücretsiz QR kod <span>·</span>{" "}
                        Sınırsız kafe
                      </span>
                    </div>
                    <div className="mini-menu-wrap">
                      <div className="mini-menu">
                        <span className="sample-label">ÖRNEK MENÜ</span>
                        <Coffee size={28} />
                        <h3>Mola Coffee</h3>
                        <span>İyi kahve. Güzel bir mola.</span>
                        <div className="mini-rule" />
                        <p>
                          Espresso <b>₺95</b>
                        </p>
                        <p>
                          Caffè Latte <b>₺145</b>
                        </p>
                        <p>
                          Americano <b>₺110</b>
                        </p>
                        <small>Afiyet olsun.</small>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="cafe-grid">
                    {visibleCafes.map((c) => (
                      <article className="cafe-card" key={c.id}>
                        <div
                          className="cafe-card-cover"
                          style={{ background: c.accent }}
                        >
                          {c.logoUrl ? (
                            <img
                              className="cafe-card-logo"
                              src={c.logoUrl}
                              alt={`${c.name} logosu`}
                            />
                          ) : (
                            <Coffee size={36} strokeWidth={1.3} />
                          )}
                          <span
                            className={`cafe-status ${c.published ? "published" : ""}`}
                          >
                            {c.published ? "Yayında" : "Taslak"}
                          </span>
                          <span className="cover-name">{c.name}</span>
                        </div>
                        <div className="cafe-card-body">
                          <h3>{c.name}</h3>
                          <p>
                            {c.location || "Konum eklenmedi"} <span>·</span>{" "}
                            {c.items.length} ürün
                          </p>
                          <div className="cafe-link">
                            <Globe size={14} />
                            <span>/{c.slug}</span>
                            {c.published && (
                              <a
                                href={`/${c.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`${c.name} menüsünü aç`}
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                          <div className="cafe-card-actions">
                            <button
                              className="btn"
                              onClick={() => setCafeDetails(structuredClone(c))}
                            >
                              <Settings size={16} /> Kafe bilgileri
                            </button>
                            <button
                              className="icon-btn qr-button"
                              title="QR kodunu görüntüle"
                              onClick={() => setQr(c)}
                            >
                              <QrCode size={20} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                    <button className="add-cafe-card" onClick={startCreate}>
                      <span>
                        <Plus size={24} />
                      </span>
                      <strong>Yeni bir kafe</strong>
                      <small>Yeni bir hikâye başlatın.</small>
                    </button>
                  </div>
                )}
              </section>
            )}
            {tab === "menus" && (
              <section className="menus-management">
                <div className="section-title">
                  <h2>
                    Dijital menüler <span>{cafes.length}</span>
                  </h2>
                  <div className="search-input">
                    <Search size={17} />
                    <input
                      aria-label="Menü ara"
                      placeholder="Menü ara…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="menu-management-note">
                  <Palette size={19} />
                  <p>
                    Bu bölüm yalnızca menünün görsel tasarımı içindir. Ürün ve
                    kategori içerikleri Ürünler bölümünden; kafe iletişim
                    bilgileri ve QR kodları Kafelerim bölümünden yönetilir.
                  </p>
                </div>
                {cafes.length === 0 ? (
                  <div className="panel menu-list-empty">
                    <BookOpen size={32} />
                    <h3>Önce bir kafe ekleyin.</h3>
                    <p>Her kafe oluşturulduğunda menüsü otomatik hazırlanır.</p>
                    <button className="btn primary" onClick={startCreate}>
                      Kafe oluştur
                    </button>
                  </div>
                ) : (
                  <div className="menu-table">
                    <div className="menu-table-head">
                      <span>MENÜ</span>
                      <span>İÇERİK</span>
                      <span>DURUM</span>
                      <span />
                    </div>
                    {visibleCafes.map((c) => (
                      <article className="menu-table-row" key={c.id}>
                        <div className="menu-row-name">
                          <span style={{ background: c.accent }}>
                            <BookOpen size={21} />
                          </span>
                          <div>
                            <h3>{c.name}</h3>
                            <small>/{c.slug}</small>
                          </div>
                        </div>
                        <div className="menu-row-content">
                          <strong>{c.items.length} ürün</strong>
                          <small>
                            {new Set(c.items.map((i) => i.category)).size}{" "}
                            kategori
                          </small>
                        </div>
                        <span
                          className={`pill ${c.published ? "is-published" : ""}`}
                        >
                          {c.published ? "Yayında" : "Taslak"}
                        </span>
                        <button
                          className="btn primary"
                          onClick={() => openEditor(c)}
                        >
                          Editörü aç <ArrowUpRight size={16} />
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
            {tab === "products" && (
              <ProductsManager
                key={cafes.map((cafe) => cafe.id).join(":")}
                cafes={cafes}
                setCafes={setCafes}
                onCreateCafe={startCreate}
                onError={setError}
                onToast={setToast}
              />
            )}
            {tab === "orders" && (
              <OrdersManager
                cafes={cafes}
                onError={setError}
                onToast={setToast}
              />
            )}
            {tab === "import" && (
              <div className="scan-grid">
                <section className="panel scan-panel">
                  <span className="large-icon">
                    <ScanLine size={26} />
                  </span>
                  <h2>Kâğıttan ekrana, birkaç adımda.</h2>
                  <p>
                    Menü metninizi buraya yapıştırın; ürünler ve fiyatlar
                    otomatik ayrılır.
                  </p>
                  <label>
                    Menü metni
                    <textarea
                      rows={12}
                      placeholder={
                        "Kahveler\nEspresso 95 TL\nCaffè Latte 145 TL"
                      }
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                    />
                  </label>
                  <button
                    className="btn full"
                    disabled={!rawText.trim() || busy}
                    onClick={() => {
                      const parsed = parseMenu(rawText);
                      setImportItems(parsed);
                      if (!parsed.length)
                        setError(
                          "Fiyat bulunamadı. Her satırı “Ürün adı 120 TL” biçiminde düzenleyin.",
                        );
                    }}
                  >
                    Ürünleri metinden ayır <ArrowRight size={16} />
                  </button>
                </section>
                <section className="panel import-panel">
                  <div className="panel-title">
                    <div>
                      <h2>Kontrol edin, sonra aktarın.</h2>
                      <p>Ayrıştırılan fiyatları menünüzle karşılaştırın.</p>
                    </div>
                    <span className="pill">{importItems.length} ürün</span>
                  </div>
                  <label>
                    Aktarılacak kafe
                    <select
                      value={scanCafe}
                      onChange={(e) => setScanCafe(e.target.value)}
                    >
                      <option value="">Kafe seçin</option>
                      {cafes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!importItems.length ? (
                    <div className="import-empty">
                      <BookOpen size={38} strokeWidth={1.3} />
                      <h3>Lezzetler burada sıralanacak.</h3>
                      <p>Menü metnini yapıştırıp ayrıştırın.</p>
                    </div>
                  ) : (
                    <div className="import-list">
                      {importItems.map((item, i) => (
                        <div className="import-row" key={item.id}>
                          <span>{i + 1}</span>
                          <div>
                            <input
                              aria-label={`Ürün ${i + 1} adı`}
                              value={item.name}
                              onChange={(e) =>
                                setImportItems((p) =>
                                  p.map((x) =>
                                    x.id === item.id
                                      ? { ...x, name: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                            />
                            <input
                              aria-label={`Ürün ${i + 1} kategorisi`}
                              value={item.category}
                              onChange={(e) =>
                                setImportItems((p) =>
                                  p.map((x) =>
                                    x.id === item.id
                                      ? { ...x, category: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                            />
                          </div>
                          <input
                            className="price-input"
                            type="number"
                            aria-label={`Ürün ${i + 1} fiyatı`}
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) =>
                              setImportItems((p) =>
                                p.map((x) =>
                                  x.id === item.id
                                    ? { ...x, price: Number(e.target.value) }
                                    : x,
                                ),
                              )
                            }
                          />
                          <button
                            className="icon-btn"
                            aria-label={`${item.name} çıkar`}
                            onClick={() =>
                              setImportItems((p) =>
                                p.filter((x) => x.id !== item.id),
                              )
                            }
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    className="btn primary full"
                    disabled={!importItems.length || !scanCafe || busy}
                    onClick={importMenu}
                  >
                    <Plus size={17} />
                    {busy
                      ? "İşleniyor…"
                      : `${importItems.length} ürünü menüye ekle`}
                  </button>
                  <p className="small-text muted">
                    Mevcut ürünler korunur. Yeni ürünler listenin sonuna
                    eklenir.
                  </p>
                </section>
              </div>
            )}
            {tab === "settings" && (
              <div className="settings-grid">
                <section className="panel settings-panel">
                  <h2>Hesabınız</h2>
                  <p>
                    {signedIn
                      ? `${userName} olarak giriş yaptınız.`
                      : "Kafelerinizi kaydetmek için giriş yapın."}
                  </p>
                  <button className="btn" onClick={logout}>
                    Çıkış yap <LogIn size={16} />
                  </button>
                  <div className="divider" />
                  <h2>Menü bağlantılarınız</h2>
                  <p>
                    Her kafenin sabit bir adresi ve buna bağlı QR kodu vardır.
                    Ürünleri güncellediğinizde QR kodu yeniden basmanız
                    gerekmez.
                  </p>
                  <code>alanadiniz.com/kafe-adi</code>
                  <p className="small-text muted">
                    Özel alan adı henüz bağlı değil. Oluşturulan QR kodlar
                    mevcut uygulama adresini kullanır.
                  </p>
                </section>
                <section className="panel settings-panel">
                  <h2>Maliyet ve veri</h2>
                  <div className="cost-row">
                    <span>QR oluşturma</span>
                    <b>Ücretsiz</b>
                  </div>
                  <div className="cost-row">
                    <span>Tarayıcıda OCR tarama</span>
                    <b>Ücretsiz</b>
                  </div>
                  <div className="cost-row">
                    <span>Günlük döviz verisi</span>
                    <b>Ücretsiz API</b>
                  </div>
                  <p>
                    Barındırma ve veritabanı maliyetleri kullanılan platformun
                    planına ve trafiğe bağlıdır. Kafe sayısı uygulama tarafından
                    sınırlandırılmaz.
                  </p>
                  <div className="divider" />
                  <h3>Ziyaretçi ölçümü</h3>
                  <p>
                    İstatistikler kişisel bilgi içermeyen bir tarayıcı
                    kimliğiyle Türkiye saatine göre günlük tekil açılışları
                    sayar. Çerez veya tarayıcı verisini silmek yeni ziyaretçi
                    olarak sayılabilir.
                  </p>
                  <a
                    className="text-btn"
                    href="https://frankfurter.dev/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Kur veri kaynağı <ExternalLink size={14} />
                  </a>
                </section>
              </div>
            )}
          </>
          <footer className="dashboard-footer">
            <span>
              <Coffee size={14} /> fincan <span>·</span> Küçük işletmeler, büyük
              fikirler.
            </span>
            <span>Sevgiyle demlendi.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {profileOpen && (
        <Modal title="Hesap bilgileri" close={() => setProfileOpen(false)}>
          <div className="account-profile-summary">
            <span className="avatar" aria-hidden="true">
              {userName.slice(0, 1).toUpperCase()}
            </span>
            <strong>{userName}</strong>
          </div>
          <dl className="account-profile-details">
            <div>
              <dt>Hesap adı</dt>
              <dd>{userName}</dd>
            </div>
            <div>
              <dt>E-posta adresi</dt>
              <dd>{userEmail}</dd>
            </div>
          </dl>
        </Modal>
      )}
      {create && (
        <Modal
          title="Yeni kafenize merhaba."
          close={() => {
            if (!busy) setCreate(false);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCafe();
            }}
          >
            <p className="muted">
              Her kafe için menü adresiniz ve QR kodunuz otomatik hazırlanır.
            </p>
            <label>
              Kafe adı
              <input
                autoFocus
                required
                minLength={2}
                maxLength={80}
                placeholder="Örn. Mola Coffee"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setNewSlug(slugify(e.target.value));
                }}
              />
            </label>
            <label>
              Menü adresi
              <div className="slug-field">
                <span>/</span>
                <input
                  required
                  pattern="[a-z][a-z0-9-]{2,59}"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="mola-coffee"
                />
              </div>
              <small className="muted">
                QR kodun çalışmaya devam etmesi için adres sabit kalır.
              </small>
            </label>
            <label>
              Konum
              <input
                placeholder="Kadıköy, İstanbul"
                maxLength={150}
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={withSample}
                onChange={(e) => setWithSample(e.target.checked)}
              />{" "}
              Örnek ürünlerle başla (sonradan düzenlenebilir)
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="btn primary full" disabled={busy}>
              {busy ? (
                <LoaderCircle size={18} className="spin" />
              ) : (
                <Plus size={18} />
              )}{" "}
              Kafeyi oluştur
            </button>
          </form>
        </Modal>
      )}
      {cafeDetails && (
        <Modal
          title="Kafe bilgileri"
          close={() => {
            if (!detailsBusy) setCafeDetails(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveCafeDetails();
            }}
          >
            <label>
              Kafe adı
              <input
                required
                minLength={2}
                maxLength={80}
                value={cafeDetails.name}
                onChange={(e) =>
                  setCafeDetails({ ...cafeDetails, name: e.target.value })
                }
              />
            </label>
            <label>
              Konum
              <input
                maxLength={150}
                value={cafeDetails.location}
                onChange={(e) =>
                  setCafeDetails({ ...cafeDetails, location: e.target.value })
                }
              />
            </label>
            <label>
              Menü adresi
              <input readOnly value={`/${cafeDetails.slug}`} />
              <small className="muted">
                QR kodunuzu korumak için bu adres sabittir.
              </small>
            </label>
            <label>
              Masa sayısı
              <input
                type="number"
                min={0}
                max={200}
                value={cafeDetails.tableCount || 0}
                onChange={(e) =>
                  setCafeDetails({
                    ...cafeDetails,
                    tableCount: Math.max(
                      0,
                      Math.min(200, Number(e.target.value) || 0),
                    ),
                  })
                }
              />
              <small className="muted">
                Sıfırdan büyükse QR indirme ekranından her masa için ayrı QR
                yazdırabilirsiniz (?table=1 … ?table=N).
              </small>
            </label>
            <p className="small-text muted">
              Sosyal hesaplar, WhatsApp sipariş hattı, web sitesi ve Google
              yorum bağlantısı isteğe bağlıdır. Doldurulan bağlantılar müşteri
              menüsünde görünür.
            </p>
            {socialFields.map((field) => (
              <label key={field.key}>
                {field.label} <small className="muted">(İsteğe bağlı)</small>
                <input
                  type={field.key === "whatsapp" ? "tel" : "text"}
                  maxLength={500}
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={field.placeholder}
                  value={
                    field.key === "whatsapp"
                      ? (cafeDetails.socialLinks?.whatsapp || "").replace(
                          /^https:\/\/wa\.me\//,
                          "+",
                        )
                      : cafeDetails.socialLinks?.[field.key] || ""
                  }
                  onChange={(e) =>
                    setCafeDetails({
                      ...cafeDetails,
                      socialLinks: {
                        ...cafeDetails.socialLinks,
                        [field.key]: e.target.value,
                      },
                    })
                  }
                />
                {field.key === "whatsapp" && (
                  <small className="muted">
                    WhatsApp kullanan numarayı ülke koduyla girin. Türkiye
                    numaraları 05XX biçiminde de yazılabilir.
                  </small>
                )}
                {field.key === "googleReviews" && (
                  <small className="muted">
                    Google işletme profilinizdeki yorum isteme bağlantısını
                    yapıştırın. Menünün altında değerlendirme düğmesi olarak
                    görünür.
                  </small>
                )}
              </label>
            ))}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn primary full" disabled={detailsBusy}>
              <Save size={16} />
              {detailsBusy ? "Kaydediliyor…" : "Bilgileri kaydet"}
            </button>
          </form>
        </Modal>
      )}
      {qr && (
        <Modal title="Bir taramayla menünüz." close={() => setQr(null)}>
          <div className="qr-modal">
            <h3>{qr.name}</h3>
            {qrUrl ? (
              <img
                src={qrUrl}
                alt={`${qr.name} menüsüne ait QR kod`}
                width={240}
                height={240}
              />
            ) : (
              <LoaderCircle className="spin" />
            )}
            <p>/{qr.slug}</p>
            {!qr.published && (
              <p className="form-error">
                Menünüz taslak. Misafirlerinizin görebilmesi için editörden
                yayınlayın.
              </p>
            )}
            <div className="heading-actions">
              <a
                className={`btn primary ${!qrUrl ? "disabled" : ""}`}
                href={qrUrl || undefined}
                download={`${qr.slug}-qr.png`}
              >
                <Download size={17} /> QR kodu indir
              </a>
              <button
                className="btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `${window.location.origin}/${qr.slug}`,
                    );
                    setToast("Menü bağlantısı kopyalandı.");
                  } catch {
                    setError("Bağlantı kopyalanamadı.");
                  }
                }}
              >
                <Copy size={16} /> Linki kopyala
              </button>
            </div>
            <p className="small-text muted">
              Baskıya uygun PNG · QR kodunuz ürün güncellemelerinde değişmez.
            </p>
            <button
              className="btn full"
              disabled={!qrUrl}
              onClick={() =>
                setQrTables({
                  id: qr.id,
                  slug: qr.slug,
                  tableCount: qr.tableCount || 0,
                  name: qr.name,
                })
              }
            >
              <Printer size={16} /> Masa QR kâğıtları yazdır
            </button>
          </div>
        </Modal>
      )}
      {qrTables && (
        <Modal
          title="Masa QR kâğıtları"
          close={() => {
            setQrTables(null);
            setQrTableImages([]);
          }}
        >
          <div className="qr-modal qr-sheets">
            <h3>{qrTables.name}</h3>
            {qrTables.tableCount < 1 ? (
              <>
                <p className="form-error">
                  Bu kafede masa QR kodu yok. Kafe bilgilerinden masa sayısını
                  ayarlayın.
                </p>
                <button
                  className="btn full"
                  onClick={() => {
                    setQrTables(null);
                    setQr(null);
                    setCafeDetails(
                      cafes.find((c) => c.id === qrTables.id) || null,
                    );
                  }}
                >
                  <Store size={16} /> Kafe bilgilerini aç
                </button>
              </>
            ) : qrTableImages.length === qrTables.tableCount ? (
              <>
                <p className="muted small-text">
                  Her QR kendi masasının numarasını taşır. Sayfayı yazdırıp
                  kodları masalara yapıştırın.
                </p>
                <div className="qr-print-grid">
                  {qrTableImages.map((url, i) => (
                    <div className="qr-print-card" key={i}>
                      <img src={url} alt={`Masa ${i + 1} QR kodu`} />
                      <strong>Masa {i + 1}</strong>
                      <span>
                        {qrTables.name} · masa {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="heading-actions">
                  <button
                    className="btn primary full"
                    onClick={() => window.print()}
                  >
                    <Printer size={17} /> Yazdır
                  </button>
                  <button
                    className="btn full"
                    onClick={() => setQrTables(null)}
                  >
                    Kapat
                  </button>
                </div>
              </>
            ) : (
              <LoaderCircle className="spin" />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
