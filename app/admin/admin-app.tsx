"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Store,
  Users,
  ChartNoAxesCombined,
  LogOut,
  LoaderCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import { useAdminApi } from "@/lib/admin-api";

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
  published: boolean;
  tableCount: number;
  ownerEmail: string | null;
  visitsTotal: number;
  lastVisit: string | null;
  createdAt: string;
};
type AdminUser = {
  id: string;
  email: string;
  cafes: number;
  createdAt: string;
};

export default function AdminApp() {
  const api = useAdminApi();
  const [tab, setTab] = useState<"overview" | "cafes" | "users">("overview");
  const [email, setEmail] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [cafes, setCafes] = useState<AdminCafe[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase().auth.getSession();
        const user = data.session?.user;
        if (!user) {
          window.location.assign(
            new URL("/login", window.location.origin).href,
          );
          return;
        }
        const role = (user.app_metadata as Record<string, unknown>)?.role;
        if (role !== "admin") {
          window.location.assign(new URL("/", window.location.origin).href);
          return;
        }
        if (!cancelled) setEmail(user.email ?? "");
      } catch {
        window.location.assign(
          new URL("/login", window.location.origin).href,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!email) return;
    let active = true;
    async function load() {
      setLoading(true);
      try {
        if (tab === "overview" && !overview)
          setOverview(await api<Overview>("/api/admin/overview"));
        if (tab === "cafes")
          setCafes(
            await api<AdminCafe[]>(
              `/api/admin/cafes${query ? `?search=${encodeURIComponent(query)}` : ""}`,
            ),
          );
        if (tab === "users") setUsers(await api<AdminUser[]>("/api/admin/users"));
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }
    const t = setTimeout(load, query ? 300 : 0);
    return () => {
      active = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, email, query]);

  if (!email)
    return (
      <main className="admin-shell">
        <LoaderCircle className="spin" size={28} />
      </main>
    );

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div className="admin-brand">
          <span>
            <LayoutDashboard size={20} />
          </span>
          fincan admin
        </div>
        <nav className="admin-nav">
          <button
            className={tab === "overview" ? "active" : ""}
            onClick={() => setTab("overview")}
          >
            <ChartNoAxesCombined size={16} /> Genel bakış
          </button>
          <button
            className={tab === "cafes" ? "active" : ""}
            onClick={() => setTab("cafes")}
          >
            <Store size={16} /> Kafeler
          </button>
          <button
            className={tab === "users" ? "active" : ""}
            onClick={() => setTab("users")}
          >
            <Users size={16} /> Kullanıcılar
          </button>
        </nav>
        <div className="admin-actions">
          <Link href="/">Uygulamaya dön</Link>
          <button
            onClick={async () => {
              await supabase().auth.signOut();
              window.location.assign("/login");
            }}
          >
            <LogOut size={15} /> Çıkış
          </button>
        </div>
      </header>
      <span className="admin-user">{email}</span>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {loading && !overview && tab === "overview" ? (
        <LoaderCircle className="spin" size={24} />
      ) : tab === "overview" && overview ? (
        <section className="admin-grid">
          {[
            ["Kafe", `${overview.cafes}`],
            ["Yayında", `${overview.publishedCafes}`],
            ["Son 7 gün yeni kafe", `${overview.newCafes7d}`],
            ["Toplam ziyaret", `${overview.visitsTotal}`],
            ["Ziyaret (7g)", `${overview.visits7d}`],
            ["Ziyaret (30g)", `${overview.visits30d}`],
            ["Aktif kafe (30g)", `${overview.activeCafes30d}`],
            ["Kullanıcı", `${overview.users}`],
            ["Yeni kullanıcı (7g)", `${overview.newUsers7d}`],
          ].map(([label, value]) => (
            <div className="admin-kpi" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
          <div className="admin-note">
            Kur önbelleği son güncelleme:{" "}
            {overview.ratesFetchedAt
              ? new Date(overview.ratesFetchedAt).toLocaleString("tr-TR")
              : "henüz yok"}
          </div>
          <div className="admin-chart">
            <h3>Son 30 gün ziyaretleri</h3>
            <div className="admin-bars">
              {overview.series.map((d) => (
                <div key={d.day} title={`${d.day}: ${d.count}`}>
                  <i style={{ height: `${Math.min(100, d.count * 4)}%` }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : tab === "cafes" ? (
        <section>
          <input
            className="admin-search"
            placeholder="Kafe adı, adres veya sahip e-postası ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <table className="admin-table">
            <thead>
              <tr>
                <th>Kafe</th>
                <th>Adres</th>
                <th>Sahip</th>
                <th>Durum</th>
                <th>Masa</th>
                <th>Ziyaret</th>
                <th>Son ziyaret</th>
              </tr>
            </thead>
            <tbody>
              {cafes.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <a href={`/${c.slug}`} target="_blank" rel="noreferrer">
                      /{c.slug}
                    </a>
                  </td>
                  <td>{c.ownerEmail || "—"}</td>
                  <td>{c.published ? "Yayında" : "Taslak"}</td>
                  <td>{c.tableCount}</td>
                  <td>{c.visitsTotal}</td>
                  <td>{c.lastVisit || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>E-posta</th>
              <th>Kafe sayısı</th>
              <th>Kayıt tarihi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.cafes}</td>
                <td>{new Date(u.createdAt).toLocaleDateString("tr-TR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}