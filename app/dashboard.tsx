"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Sites authentication requires top-level navigation, never Next prefetch. */
/* eslint-disable @next/next/no-img-element -- QR is an in-memory PNG, not an image optimizer source. */
import Link from "next/link";
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
  Download,
  Check,
  Palette,
  Globe,
  Upload,
  X,
  Trash2,
  Save,
  ArrowLeft,
  ExternalLink,
  Copy,
  CalendarDays,
  Search,
  LoaderCircle,
  LogIn,
  Clock,
  Menu,
  Info,
  MoveUp,
  MoveDown,
} from "lucide-react";
import { Cafe, Item, slugify, sampleItems } from "@/lib/menu";
import MenuView, { type Rates } from "./menu-view";
import { parseMenu } from "@/lib/ocr";
type Tab = "overview" | "cafes" | "menus" | "scan" | "stats" | "settings";
type Stat = { cafe: string; day: string; hour: number; count: number };
async function api<T>(path: string, body?: unknown, method = "POST") {
  const r = await fetch(
    path,
    body
      ? {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const d = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(d.error || "İşlem tamamlanamadı.");
  return d;
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
  signedIn,
  userName,
  initialDate,
}: {
  signedIn: boolean;
  userName: string;
  initialDate: string;
}) {
  const [tab, setTab] = useState<Tab>("overview"),
    [cafes, setCafes] = useState<Cafe[]>([]),
    [stats, setStats] = useState<Stat[]>([]),
    [loading, setLoading] = useState(signedIn),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [rates, setRates] = useState<Rates | null>(null),
    [rateError, setRateError] = useState(false),
    [selected, setSelected] = useState("all"),
    [period, setPeriod] = useState("7"),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState("");
  const [create, setCreate] = useState(false),
    [newName, setNewName] = useState(""),
    [newSlug, setNewSlug] = useState(""),
    [newLocation, setNewLocation] = useState(""),
    [withSample, setWithSample] = useState(false),
    [busy, setBusy] = useState(false),
    [draft, setDraft] = useState<Cafe | null>(null),
    [editing, setEditing] = useState<Item | null>(null),
    [qr, setQr] = useState<Cafe | null>(null),
    [qrImage, setQrImage] = useState<{ id: string; url: string } | null>(null),
    [rawText, setRawText] = useState(""),
    [importItems, setImportItems] = useState<Item[]>([]),
    [scanProgress, setScanProgress] = useState(""),
    [scanCafe, setScanCafe] = useState(""),
    [deleteItem, setDeleteItem] = useState<Item | null>(null),
    [dirty, setDirty] = useState(false);
  const now = new Date(initialDate);
  const dateLabel = now.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const qrUrl = qrImage?.id === qr?.id ? qrImage?.url || "" : "";
  useEffect(() => {
    let active = true;
    async function initialize() {
      if (signedIn) {
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
  }, [signedIn]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);
  useEffect(() => {
    if (!qr) return;
    let active = true;
    import("qrcode")
      .then((m) =>
        m.toDataURL(`${window.location.origin}/${qr.slug}`, {
          width: 800,
          margin: 4,
          color: { dark: "#172f27", light: "#ffffff" },
          errorCorrectionLevel: "M",
        }),
      )
      .then((url) => {
        if (active) setQrImage({ id: qr.id, url });
      })
      .catch(() => {
        if (active) setError("QR kod oluşturulamadı.");
      });
    return () => {
      active = false;
    };
  }, [qr]);

  function navigate(t: Tab) {
    if (dirty && !window.confirm("Kaydedilmemiş değişiklikler silinsin mi?"))
      return;
    setTab(t);
    setDraft(null);
    setDirty(false);
    setMobile(false);
    setError("");
  }
  function startCreate() {
    if (!signedIn) {
      window.location.assign(
        new URL("/signin-with-chatgpt?return_to=%2F", window.location.origin)
          .href,
      );
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
      const c = await api<Cafe>("/api/cafes", {
        name: newName,
        slug: newSlug,
        location: newLocation,
        subtitle: "Küçük bir mola, güzel bir kahve.",
        accent: "#245b46",
        style: "classic",
        published: false,
        items: withSample ? sampleItems : [],
      });
      setCafes((p) => [c, ...p]);
      setCreate(false);
      setDraft(c);
      setTab("menus");
      setToast("Kafeniz ve QR kodunuz hazır. Menünüzü düzenleyebilirsiniz.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function openEditor(c: Cafe) {
    setDraft(structuredClone(c));
    setDirty(false);
    setTab("menus");
  }
  function updateDraft(p: Partial<Cafe>) {
    setDraft((d) => (d ? { ...d, ...p } : null));
    setDirty(true);
  }
  async function saveDraft() {
    if (!draft) return;
    setBusy(true);
    try {
      const c = await api<Cafe>(`/api/cafes/${draft.id}`, draft, "PUT");
      setCafes((p) => p.map((x) => (x.id === c.id ? c : x)));
      setDraft(c);
      setDirty(false);
      setToast("Menünüz kaydedildi.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function scan(file: File) {
    if (
      !/^image\/(jpeg|png|webp)$/.test(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError("En fazla 10 MB boyutunda JPG, PNG veya WEBP seçin.");
      return;
    }
    setBusy(true);
    setError("");
    setScanProgress("Okuma motoru hazırlanıyor…");
    let worker:
      | Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>
      | undefined;
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("tur+eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text")
            setScanProgress(`Menü okunuyor · %${Math.round(m.progress * 100)}`);
        },
      });
      const r = await worker.recognize(file);
      setRawText(r.data.text);
      setImportItems(parseMenu(r.data.text));
      setScanProgress("Tarama tamamlandı. Ürünleri ve fiyatları kontrol edin.");
    } catch {
      setError(
        "Fotoğraf okunamadı. Daha net bir fotoğraf deneyin veya metni aşağıya yapıştırın.",
      );
      setScanProgress("");
    } finally {
      await worker?.terminate();
      setBusy(false);
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
      { id: "scan", label: "Menü tara", icon: ScanLine },
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
  const heading = {
    overview: "Genel bakış",
    cafes: "Kafelerim",
    menus: "Menü yönetimi",
    scan: "Fiziksel menünüz, dijital olsun.",
    stats: "Menünüzün nabzını tutun.",
    settings: "Hesap ve kullanım",
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
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
              {n.id === "scan" && <span className="nav-badge">ÜCRETSİZ</span>}
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
              <a href="/signin-with-chatgpt?return_to=%2F" title="Giriş yap">
                <LogIn size={17} />
              </a>
            )}
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-toggle"
              onClick={() => setMobile(!mobile)}
              aria-label="Gezinmeyi aç"
            >
              <Menu size={21} />
            </button>
            <span>Çalışma alanı</span>
            <ChevronRight size={14} />
            <strong>{heading[tab]}</strong>
          </div>
          <div className="topbar-right">
            <span className="live-label">
              <span /> Her şey bir fincanla başlar
            </span>
            <span className="avatar small">K</span>
          </div>
        </header>
        <main className="main-content">
          {error && (
            <div className="error-banner" role="alert">
              <Info size={18} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Uyarıyı kapat">
                <X size={16} />
              </button>
            </div>
          )}
          {draft ? (
            <>
              <div className="page-heading">
                <div>
                  <button
                    className="back-link"
                    onClick={() => navigate("cafes")}
                  >
                    <ArrowLeft size={15} /> Kafelerim
                  </button>
                  <h1>
                    {draft.name}{" "}
                    <span className="pill">
                      {draft.published ? "Yayında" : "Taslak"}
                    </span>
                  </h1>
                  <p>Bir ürünü düzenlemek için menünün üzerinde seçin.</p>
                </div>
                <div className="heading-actions">
                  <button className="btn" onClick={() => setQr(draft)}>
                    <QrCode size={17} /> QR kod
                  </button>
                  <button
                    className="btn primary"
                    onClick={saveDraft}
                    disabled={busy || !dirty}
                  >
                    <Save size={17} />
                    {busy ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
                  </button>
                </div>
              </div>
              <div className="editor-grid">
                <section className="panel editor-controls">
                  <div className="panel-title">
                    <h2>
                      <Palette size={18} /> Menü tasarımı
                    </h2>
                    <span className="pill">Canlı önizleme</span>
                  </div>
                  <label>
                    Kafe adı
                    <input
                      value={draft.name}
                      onChange={(e) => updateDraft({ name: e.target.value })}
                      maxLength={80}
                    />
                  </label>
                  <label>
                    Kısa açıklama
                    <input
                      value={draft.subtitle}
                      onChange={(e) =>
                        updateDraft({ subtitle: e.target.value })
                      }
                      maxLength={150}
                    />
                  </label>
                  <label>
                    Konum
                    <input
                      value={draft.location}
                      onChange={(e) =>
                        updateDraft({ location: e.target.value })
                      }
                      maxLength={150}
                    />
                  </label>
                  <label>Tasarım</label>
                  <div className="style-options">
                    {(["classic", "modern", "minimal"] as const).map((s, i) => (
                      <button
                        className={draft.style === s ? "chosen" : ""}
                        key={s}
                        onClick={() => updateDraft({ style: s })}
                      >
                        <span className={"style-sample " + s}>Aa</span>
                        {["Klasik", "Modern", "Minimal"][i]}
                      </button>
                    ))}
                  </div>
                  <label>Vurgu rengi</label>
                  <div className="color-options">
                    {[
                      "#245b46",
                      "#994c35",
                      "#243e66",
                      "#6f446c",
                      "#272727",
                    ].map((c) => (
                      <button
                        key={c}
                        style={{ background: c }}
                        aria-label={`Renk ${c}`}
                        onClick={() => updateDraft({ accent: c })}
                      >
                        {draft.accent === c && <Check size={18} />}
                      </button>
                    ))}
                    <input
                      type="color"
                      aria-label="Özel renk"
                      value={draft.accent}
                      onChange={(e) => updateDraft({ accent: e.target.value })}
                    />
                  </div>
                  <div className="form-columns extra-colors">
                    <label>
                      Arka plan
                      <input
                        type="color"
                        value={draft.background || "#fdfcf7"}
                        onChange={(e) =>
                          updateDraft({ background: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Metin rengi
                      <input
                        type="color"
                        value={draft.textColor || "#303c2f"}
                        onChange={(e) =>
                          updateDraft({ textColor: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Başlık yazı tipi
                    <select
                      value={draft.font || "serif"}
                      onChange={(e) =>
                        updateDraft({ font: e.target.value as Cafe["font"] })
                      }
                    >
                      <option value="serif">Klasik · Serif</option>
                      <option value="sans">Modern · Sans serif</option>
                      <option value="mono">Daktilo · Monospace</option>
                    </select>
                  </label>
                  <label>
                    Yazı boyutu · %{Math.round((draft.scale || 1) * 100)}
                    <input
                      type="range"
                      min="0.9"
                      max="1.3"
                      step="0.05"
                      value={draft.scale || 1}
                      onChange={(e) =>
                        updateDraft({ scale: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={draft.showBranding !== false}
                      onChange={(e) =>
                        updateDraft({ showBranding: e.target.checked })
                      }
                    />{" "}
                    Fincan imzasını göster
                  </label>
                  <div className="divider" />
                  <label className="toggle-label">
                    <span>
                      <strong>Menüyü yayınla</strong>
                      <small>Müşteriler QR ile menüye ulaşabilir.</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={draft.published}
                      onChange={(e) =>
                        updateDraft({ published: e.target.checked })
                      }
                    />
                  </label>
                  <div className="editor-note">
                    <Info size={16} />
                    <span>
                      {dirty
                        ? "Kaydedilmemiş değişiklikler var."
                        : "Tüm değişiklikler kaydedildi."}
                    </span>
                  </div>
                  <button
                    className="btn primary full"
                    onClick={() =>
                      setEditing({
                        id: crypto.randomUUID(),
                        name: "",
                        description: "",
                        category: draft.items[0]?.category || "Kahveler",
                        price: 0,
                        available: true,
                      })
                    }
                  >
                    <Plus size={17} /> Yeni ürün ekle
                  </button>
                  <p className="muted small-text">
                    Ürün silmek veya sırasını değiştirmek için önizlemedeki
                    ürüne tıklayın.
                  </p>
                </section>
                <div className="preview-stage">
                  <div className="preview-top">
                    <span>
                      <span className="status-dot" /> Mobil menü önizlemesi
                    </span>
                    <span>{draft.items.length} ürün</span>
                  </div>
                  <div className="phone-frame">
                    <MenuView cafe={draft} onEdit={setEditing} />
                  </div>
                </div>
              </div>
            </>
          ) : (
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
                          : tab === "scan"
                            ? "Bir fotoğraf yükleyin. Ürünleri kontrol edin. Menünüze ekleyin."
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
                  {tab !== "settings" && tab !== "scan" && (
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
                          (a, c) =>
                            a + c.items.filter((i) => i.available).length,
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
                                <span>
                                  {String(h.hour).padStart(2, "0")}:00
                                </span>
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
                      <p>
                        Misafirleriniz fiyatları kendi para biriminde görsün.
                      </p>
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
              {(tab === "overview" || tab === "cafes" || tab === "menus") && (
                <section className="cafes-section">
                  <div className="section-title">
                    <h2>
                      {tab === "menus" ? "Menüleriniz" : "Kafelerim"}{" "}
                      <span>{cafes.length}</span>
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
                            <Coffee size={36} strokeWidth={1.3} />
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
                                onClick={() => openEditor(c)}
                              >
                                <Palette size={16} /> Menüyü düzenle
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
              {tab === "scan" && (
                <div className="scan-grid">
                  <section className="panel scan-panel">
                    <span className="large-icon">
                      <ScanLine size={26} />
                    </span>
                    <h2>Kâğıttan ekrana, birkaç adımda.</h2>
                    <p>Net ve düz bir menü fotoğrafı en iyi sonucu verir.</p>
                    <label className={`upload-zone ${busy ? "disabled" : ""}`}>
                      <Upload size={30} />
                      <strong>
                        {busy ? scanProgress : "Menü fotoğrafınızı seçin"}
                      </strong>
                      <span>JPG, PNG veya WEBP · En fazla 10 MB</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={busy}
                        onChange={(e) => {
                          if (e.target.files?.[0]) scan(e.target.files[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <div className="privacy-note">
                      <Check size={17} />
                      <p>
                        Fotoğrafınız tarayıcınızda işlenir. Ücretli AI servisine
                        gönderilmez.
                      </p>
                    </div>
                    <label>
                      Veya menü metnini yapıştırın
                      <textarea
                        rows={8}
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
                        <p>Okunan fiyatları fiziksel menüyle karşılaştırın.</p>
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
                        <p>
                          Bir fotoğraf yükleyin veya menü metnini yapıştırın.
                        </p>
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
                    <a
                      className="btn"
                      href={
                        signedIn
                          ? "/signout-with-chatgpt?return_to=%2F"
                          : "/signin-with-chatgpt?return_to=%2F"
                      }
                    >
                      {signedIn ? "Çıkış yap" : "ChatGPT ile giriş yap"}
                      <ArrowUpRight size={16} />
                    </a>
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
                      planına ve trafiğe bağlıdır. Kafe sayısı uygulama
                      tarafından sınırlandırılmaz.
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
          )}
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
      {editing && draft && (
        <Modal
          title={
            draft.items.some((i) => i.id === editing.id)
              ? "Ürünü düzenle"
              : "Yeni bir lezzet ekle"
          }
          close={() => setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const exists = draft.items.some((i) => i.id === editing.id);
              updateDraft({
                items: exists
                  ? draft.items.map((i) => (i.id === editing.id ? editing : i))
                  : [...draft.items, editing],
              });
              setEditing(null);
            }}
          >
            <label>
              Ürün adı
              <input
                required
                maxLength={100}
                autoFocus
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <label>
              Açıklama
              <textarea
                maxLength={300}
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </label>
            <div className="form-columns">
              <label>
                Fiyat (₺)
                <input
                  type="number"
                  required
                  min="0"
                  max="1000000"
                  step="0.01"
                  value={editing.price}
                  onChange={(e) =>
                    setEditing({ ...editing, price: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Kategori
                <input
                  required
                  maxLength={60}
                  list="category-list"
                  value={editing.category}
                  onChange={(e) =>
                    setEditing({ ...editing, category: e.target.value })
                  }
                />
                <datalist id="category-list">
                  {[...new Set(draft.items.map((i) => i.category))].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editing.available}
                onChange={(e) =>
                  setEditing({ ...editing, available: e.target.checked })
                }
              />{" "}
              Menüde göster
            </label>
            {draft.items.some((i) => i.id === editing.id) && (
              <div className="item-tools">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const items = [...draft.items],
                      i = items.findIndex((x) => x.id === editing.id);
                    if (i > 0) {
                      [items[i - 1], items[i]] = [items[i], items[i - 1]];
                      updateDraft({ items });
                      setToast("Ürün bir sıra yukarı taşındı.");
                    }
                  }}
                >
                  <MoveUp size={15} /> Yukarı
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const items = [...draft.items],
                      i = items.findIndex((x) => x.id === editing.id);
                    if (i < items.length - 1) {
                      [items[i + 1], items[i]] = [items[i], items[i + 1]];
                      updateDraft({ items });
                      setToast("Ürün bir sıra aşağı taşındı.");
                    }
                  }}
                >
                  <MoveDown size={15} /> Aşağı
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label="Ürünü sil"
                  onClick={() => {
                    setDeleteItem(editing);
                    setEditing(null);
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
            <button className="btn primary full">
              <Check size={17} /> Menüye uygula
            </button>
            <p className="small-text muted">
              Yayınlamak için editörde değişiklikleri kaydedin.
            </p>
          </form>
        </Modal>
      )}
      {deleteItem && draft && (
        <Modal
          title="Ürün menüden çıkarılsın mı?"
          close={() => setDeleteItem(null)}
        >
          <p>
            <strong>{deleteItem.name}</strong> menünüzden kaldırılacak.
            Değişiklik, menüyü kaydettiğinizde uygulanır.
          </p>
          <div className="heading-actions">
            <button className="btn" onClick={() => setDeleteItem(null)}>
              Vazgeç
            </button>
            <button
              className="btn destructive"
              onClick={() => {
                updateDraft({
                  items: draft.items.filter((i) => i.id !== deleteItem.id),
                });
                setDeleteItem(null);
              }}
            >
              Ürünü sil
            </button>
          </div>
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
          </div>
        </Modal>
      )}
    </div>
  );
}
