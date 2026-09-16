"use client";

/* eslint-disable @next/next/no-img-element -- Cafe logos are user-provided public Storage URLs. */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleGauge,
  ExternalLink,
  Eye,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  Printer,
  Search,
  ShieldCheck,
  Store,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import { useAdminApi } from "@/lib/admin-api";

type Tab = "overview" | "cafes" | "users";
type Overview = {
  cafes: number;
  publishedCafes: number;
  newCafes7d: number;
  visitsTotal: number;
  visits7d: number;
  visits30d: number;
  activeCafes30d: number;
  users: number;
  newUsers7d: number;
  series: { day: string; count: number }[];
  ratesFetchedAt: string | null;
};
type AdminCafe = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  location: string;
  logoUrl: string | null;
  published: boolean;
  tableCount: number;
  itemCount: number;
  ownerId: string;
  ownerEmail: string | null;
  visitsTotal: number;
  lastVisit: string | null;
  createdAt: string;
  updatedAt: string;
};
type AdminUser = {
  id: string;
  email: string;
  cafes: number;
  createdAt: string;
  lastSignInAt: string | null;
};

function formatDate(value: string | null, withTime = false) {
  if (!value) return "Henüz yok";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(new Date(value));
}

export default function AdminApp() {
  const api = useAdminApi();
  const router = useRouter();
  const [auth, setAuth] = useState<"loading" | "denied" | "ready">("loading");
  const [adminEmail, setAdminEmail] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [cafes, setCafes] = useState<AdminCafe[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCafe, setSelectedCafe] = useState<AdminCafe | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase().auth.getSession();
        if (!active) return;
        if (!data.session) {
          router.replace("/login?next=%2Fadmin");
          return;
        }
        setAdminEmail(data.session.user.email ?? "Kullanıcı");
        const admin = await api<{ id: string; email: string }>(
          "/api/admin/session",
        );
        if (!active) return;
        setAdminEmail(admin.email || data.session.user.email || "Admin");
        setAuth("ready");
      } catch {
        if (!active) return;
        setAuth("denied");
      }
    })();
    return () => {
      active = false;
    };
  }, [api, router]);

  const loadTab = useCallback(async () => {
    if (auth !== "ready") return;
    setLoading(true);
    setError("");
    try {
      if (tab === "overview")
        setOverview(await api<Overview>("/api/admin/overview"));
      if (tab === "cafes")
        setCafes(
          await api<AdminCafe[]>(
            `/api/admin/cafes${query ? `?search=${encodeURIComponent(query)}` : ""}`,
          ),
        );
      if (tab === "users") setUsers(await api<AdminUser[]>("/api/admin/users"));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, auth, query, tab]);

  useEffect(() => {
    const timer = setTimeout(
      () => void loadTab(),
      tab === "cafes" && query ? 250 : 0,
    );
    return () => clearTimeout(timer);
  }, [loadTab, query, tab]);

  if (auth === "loading")
    return (
      <main className="admin-loading-screen">
        <LoaderCircle className="spin" size={30} />
        <span>Güvenli oturum kontrol ediliyor…</span>
      </main>
    );

  // Non-admins never learn the panel exists: silent redirect, no UI.
  if (auth === "denied") {
    router.replace("/");
    return (
      <main className="admin-console">
        <LoaderCircle className="spin" size={24} />
      </main>
    );
  }

  return (
    <main className="admin-console">
      <aside className="admin-sidebar">
        <div className="admin-wordmark">
          <span>
            <ShieldCheck size={20} />
          </span>
          fincan <b>control</b>
        </div>
        <nav aria-label="Admin navigasyonu">
          <button
            className={tab === "overview" ? "active" : ""}
            onClick={() => setTab("overview")}
          >
            <LayoutDashboard size={18} /> Genel bakış
          </button>
          <button
            className={tab === "cafes" ? "active" : ""}
            onClick={() => setTab("cafes")}
          >
            <Store size={18} /> İşletme hesapları
          </button>
          <button
            className={tab === "users" ? "active" : ""}
            onClick={() => setTab("users")}
          >
            <Users size={18} /> Kullanıcılar
          </button>
        </nav>
        <div className="admin-sidebar-foot">
          <span>{adminEmail}</span>
          <button
            onClick={async () => {
              await supabase().auth.signOut();
              router.push("/login");
            }}
          >
            <LogOut size={16} /> Güvenli çıkış
          </button>
        </div>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <span className="admin-eyebrow">
              {tab === "overview"
                ? "PLATFORM SAĞLIĞI"
                : tab === "cafes"
                  ? "CANLI DESTEK"
                  : "HESAP YÖNETİMİ"}
            </span>
            <h1>
              {tab === "overview"
                ? "Genel bakış"
                : tab === "cafes"
                  ? "İşletme hesapları"
                  : "Kullanıcılar"}
            </h1>
          </div>
          <div className="admin-topbar-actions">
            <span className="admin-live">
              <i /> Sistem aktif
            </span>
            <Link href="/" target="_blank">
              İşletme uygulamasını aç <ExternalLink size={14} />
            </Link>
          </div>
        </header>

        {error && (
          <div className="admin-error" role="alert">
            {error}
            <button onClick={() => void loadTab()}>Tekrar dene</button>
          </div>
        )}
        {loading && (
          <div className="admin-progress">
            <i />
          </div>
        )}

        {tab === "overview" && (
          <OverviewPanel
            overview={overview}
            onOpenCafes={() => setTab("cafes")}
          />
        )}
        {tab === "cafes" && (
          <CafePanel
            cafes={cafes}
            query={query}
            setQuery={setQuery}
            loading={loading}
            onSelect={setSelectedCafe}
          />
        )}
        {tab === "users" && <UsersPanel users={users} />}
      </section>

      {selectedCafe && (
        <CafeDrawer cafe={selectedCafe} onClose={() => setSelectedCafe(null)} />
      )}
    </main>
  );
}

function OverviewPanel({
  overview,
  onOpenCafes,
}: {
  overview: Overview | null;
  onOpenCafes: () => void;
}) {
  const max = Math.max(
    1,
    ...(overview?.series.map((entry) => entry.count) ?? [1]),
  );
  if (!overview)
    return (
      <div className="admin-skeleton-grid">
        <i />
        <i />
        <i />
        <i />
      </div>
    );
  const metrics = [
    {
      label: "Toplam işletme",
      value: overview.cafes,
      note: `${overview.newCafes7d} yeni / 7 gün`,
      icon: Building2,
    },
    {
      label: "Yayındaki menü",
      value: overview.publishedCafes,
      note: `${overview.cafes - overview.publishedCafes} taslak`,
      icon: Eye,
    },
    {
      label: "Son 7 gün ziyaret",
      value: overview.visits7d,
      note: `${overview.visitsTotal} toplam`,
      icon: Activity,
    },
    {
      label: "Aktif işletme",
      value: overview.activeCafes30d,
      note: "son 30 gün",
      icon: CircleGauge,
    },
  ];
  return (
    <div className="admin-overview">
      <section className="admin-metric-grid">
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <article className="admin-metric" key={label}>
            <span>
              <Icon size={19} />
            </span>
            <div>
              <small>{label}</small>
              <strong>{value.toLocaleString("tr-TR")}</strong>
              <p>{note}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="admin-overview-grid">
        <article className="admin-panel admin-chart-panel">
          <header>
            <div>
              <span className="admin-eyebrow">TRAFİK</span>
              <h2>Son 30 gün ziyaretleri</h2>
            </div>
            <strong>{overview.visits30d.toLocaleString("tr-TR")}</strong>
          </header>
          <div
            className="admin-bars"
            aria-label="Son 30 günlük ziyaret grafiği"
          >
            {overview.series.map((entry) => (
              <i
                key={entry.day}
                title={`${formatDate(entry.day)}: ${entry.count}`}
                style={{ height: `${Math.max(4, (entry.count / max) * 100)}%` }}
              />
            ))}
          </div>
        </article>
        <article className="admin-panel admin-quick-panel">
          <span className="admin-eyebrow">OPERASYON</span>
          <h2>Hızlı görünüm</h2>
          <div>
            <span>
              <Users size={17} /> Toplam kullanıcı
            </span>
            <strong>{overview.users}</strong>
          </div>
          <div>
            <span>
              <CalendarDays size={17} /> Yeni kullanıcı · 7 gün
            </span>
            <strong>{overview.newUsers7d}</strong>
          </div>
          <div>
            <span>
              <BarChart3 size={17} /> Kur verisi
            </span>
            <strong>{formatDate(overview.ratesFetchedAt, true)}</strong>
          </div>
          <button onClick={onOpenCafes}>
            İşletme hesaplarını incele <ChevronRight size={16} />
          </button>
        </article>
      </section>
    </div>
  );
}

function CafePanel({
  cafes,
  query,
  setQuery,
  loading,
  onSelect,
}: {
  cafes: AdminCafe[];
  query: string;
  setQuery: (value: string) => void;
  loading: boolean;
  onSelect: (cafe: AdminCafe) => void;
}) {
  return (
    <div className="admin-cafes-view">
      <div className="admin-cafes-toolbar">
        <label className="admin-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="İşletme, adres veya hesap e-postası ara"
          />
        </label>
        <span>{cafes.length} hesap gösteriliyor</span>
      </div>
      {!loading && cafes.length === 0 ? (
        <div className="admin-empty">
          <Store size={28} />
          <h2>İşletme bulunamadı</h2>
          <p>Arama ifadenizi değiştirip tekrar deneyin.</p>
        </div>
      ) : (
        <section className="admin-cafe-grid">
          {cafes.map((cafe) => (
            <article className="admin-cafe-card" key={cafe.id}>
              <div className="admin-cafe-cover">
                <span className="admin-cafe-logo">
                  {cafe.logoUrl ? (
                    <img src={cafe.logoUrl} alt="" />
                  ) : (
                    <Store size={24} />
                  )}
                </span>
                <span
                  className={
                    cafe.published ? "admin-status published" : "admin-status"
                  }
                >
                  <i />
                  {cafe.published ? "Yayında" : "Taslak"}
                </span>
              </div>
              <div className="admin-cafe-body">
                <span className="admin-eyebrow">/{cafe.slug}</span>
                <h2>{cafe.name}</h2>
                <p>
                  <MapPin size={14} /> {cafe.location || "Konum eklenmemiş"}
                </p>
                <div className="admin-cafe-owner">
                  <span>Sahip hesap</span>
                  <strong>{cafe.ownerEmail ?? "Bilinmiyor"}</strong>
                </div>
                <div className="admin-cafe-stats">
                  <span>
                    <b>{cafe.itemCount}</b> ürün
                  </span>
                  <span>
                    <b>{cafe.visitsTotal}</b> ziyaret
                  </span>
                  <span>
                    <b>{cafe.tableCount}</b> masa
                  </span>
                </div>
              </div>
              <footer>
                <button onClick={() => onSelect(cafe)}>
                  Bilgileri gör <Eye size={15} />
                </button>
                <button
                  className="admin-support-link"
                  onClick={() =>
                    window.location.assign(`/admin/editor/${cafe.id}`)
                  }
                >
                  Destek için düzenle <ArrowRight size={15} />
                </button>
              </footer>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function UsersPanel({ users }: { users: AdminUser[] }) {
  return (
    <section className="admin-panel admin-users-panel">
      <header>
        <div>
          <span className="admin-eyebrow">KAYITLI HESAPLAR</span>
          <h2>{users.length} kullanıcı</h2>
        </div>
      </header>
      <div className="admin-users-list">
        {users.map((user) => (
          <article key={user.id}>
            <span className="admin-user-avatar">
              {user.email.slice(0, 1).toLocaleUpperCase("tr")}
            </span>
            <div>
              <strong>{user.email}</strong>
              <small>Kayıt: {formatDate(user.createdAt)}</small>
            </div>
            <span>
              <b>{user.cafes}</b> işletme
            </span>
            <span>
              Son giriş: <b>{formatDate(user.lastSignInAt, true)}</b>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function CafeQrPreview({ cafeId }: { cafeId: string }) {
  const api = useAdminApi();
  const [urls, setUrls] = useState<{ label: string; src: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { slug, links } = await api<{
          slug: string;
          links: { table: number; path: string }[];
        }>(`/api/admin/cafes/${cafeId}/table-links`);
        const { loadFincanLogo, qrPngWithLogo } = await import(
          "@/lib/qr-composite"
        );
        const logo = await loadFincanLogo();
        const rendered: { label: string; src: string }[] = [
          {
            label: "Menü QR",
            src: await qrPngWithLogo(`/menu/${slug}`, logo),
          },
        ];
        for (const link of links) {
          rendered.push({
            label: `Masa ${link.table}`,
            src: await qrPngWithLogo(link.path, logo),
          });
        }
        if (active) setUrls(rendered);
      } catch (reason) {
        if (active) setError((reason as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [api, cafeId]);

  if (loading)
    return (
      <div className="admin-qr-loading">
        <LoaderCircle className="spin" size={18} /> QR kodlar hazırlanıyor…
      </div>
    );
  if (error)
    return (
      <div className="error-banner" role="alert">
        {error}
      </div>
    );
  return (
    <div className="admin-qr-grid">
      {urls.map((qr) => (
        <figure key={qr.label}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.src} alt={qr.label} width={180} height={180} />
          <figcaption>{qr.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function CafeDrawer({
  cafe,
  onClose,
}: {
  cafe: AdminCafe;
  onClose: () => void;
}) {
  const fields = [
    ["Hesap sahibi", cafe.ownerEmail ?? "Bilinmiyor"],
    ["Menü adresi", `/${cafe.slug}`],
    ["Konum", cafe.location || "Eklenmemiş"],
    ["Ürün sayısı", String(cafe.itemCount)],
    ["Masa sayısı", String(cafe.tableCount)],
    ["Toplam ziyaret", String(cafe.visitsTotal)],
    ["Son ziyaret", formatDate(cafe.lastVisit)],
    ["Son güncelleme", formatDate(cafe.updatedAt, true)],
    ["Oluşturulma", formatDate(cafe.createdAt, true)],
  ];
  return (
    <div className="admin-drawer-overlay" onMouseDown={onClose}>
      <aside
        className="admin-drawer"
        onMouseDown={(event) => event.stopPropagation()}
        aria-label={`${cafe.name} hesap bilgileri`}
      >
        <header>
          <span className="admin-cafe-logo">
            {cafe.logoUrl ? (
              <img src={cafe.logoUrl} alt="" />
            ) : (
              <Store size={24} />
            )}
          </span>
          <div>
            <span className="admin-eyebrow">İŞLETME HESABI</span>
            <h2>{cafe.name}</h2>
          </div>
          <button aria-label="Kapat" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <div className="admin-drawer-note">
          <ShieldCheck size={18} />
          <p>
            <strong>Canlı destek erişimi</strong>Menü içeriği, ürünler ve
            tasarım ayarları bu hesap adına düzenlenebilir.
          </p>
        </div>
        <dl>
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="admin-qr-section">
          <h3>QR kodlar</h3>
          <p className="muted small-text">
            Baskı ve çıkartma gönderimi için önizleme.
          </p>
          <CafeQrPreview cafeId={cafe.id} />
        </div>
        <div className="admin-drawer-actions">
          <Link href={`/menu/${cafe.slug}`} target="_blank">
            Canlı menüyü aç <ExternalLink size={15} />
          </Link>
          <Link
            href={`/print/qr-sheet/${cafe.id}`}
            target="_blank"
            rel="noreferrer"
          >
            QR kâğıtlarını aç <Printer size={15} />
          </Link>
          <button
            className="admin-primary-button"
            onClick={() => window.location.assign(`/admin/editor/${cafe.id}`)}
          >
            <UtensilsCrossed size={16} /> Menüyü düzenle
          </button>
        </div>
      </aside>
    </div>
  );
}
