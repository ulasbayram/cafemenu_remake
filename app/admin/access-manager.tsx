"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Crown,
  Puzzle,
  Plus,
  X,
  LoaderCircle,
  RefreshCw,
  Info,
} from "lucide-react";
import { useAdminApi } from "@/lib/admin-api";
import {
  grantActive,
  type AccessCatalogResponse,
  type AccessGrant,
} from "@/lib/access-catalog";
import styles from "./access-manager.module.css";
import AdminSelect from "./admin-select";

type CafeAccount = {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string | null;
};
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("tr-TR", {
        timeZone: "Europe/Istanbul",
      })
    : "Süresiz";
export default function AdminAccessManager({ cafe }: { cafe?: CafeAccount }) {
  const api = useAdminApi();
  const [data, setData] = useState<AccessCatalogResponse | null>(null),
    [cafes, setCafes] = useState<CafeAccount[]>([]);
  const [cafeId, setCafeId] = useState(cafe?.id ?? ""),
    [packageKey, setPackageKey] = useState("package-a"),
    [moduleKey, setModuleKey] = useState("erp");
  const [packageDate, setPackageDate] = useState(""),
    [moduleDate, setModuleDate] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const selected = cafe ?? cafes.find((entry) => entry.id === cafeId);
  const load = useCallback(async () => {
    const [access, accounts] = await Promise.all([
      api<AccessCatalogResponse>("/api/admin/entitlements"),
      cafe ? Promise.resolve([cafe]) : api<CafeAccount[]>("/api/admin/cafes"),
    ]);
    return { access, accounts };
  }, [api, cafe]);
  useEffect(() => {
    let active = true;
    load()
      .then(({ access, accounts }) => {
        if (active) {
          setData(access);
          setCafes(accounts);
          setCafeId((current) => current || accounts[0]?.id || "");
          setError("");
        }
      })
      .catch((error) => {
        if (active) setError((error as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const result = await load();
      setData(result.access);
      setCafes(result.accounts);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function assign(kind: "enterprise" | "module") {
    if (!selected) return;
    const inputDate = kind === "enterprise" ? packageDate : moduleDate;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/admin/entitlements", {
        body: {
          action: "assign",
          kind,
          cafeId: selected.id,
          key: kind === "enterprise" ? packageKey : moduleKey,
          expiresAt: inputDate
            ? new Date(`${inputDate}T23:59:59+03:00`).toISOString()
            : null,
        },
      });
      const result = await load();
      setData(result.access);
      setMessage(
        kind === "enterprise"
          ? `${selected.name} için Enterprise paketi atandı.`
          : "İşletme sahibinin hesabına modül atandı.",
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function revoke(kind: "enterprise" | "module", grant: AccessGrant) {
    if (!window.confirm("Bu atama kaldırılsın mı? İlgili erişim kapanacak."))
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/admin/entitlements", {
        body: { action: "revoke", kind, id: grant.id },
      });
      const result = await load();
      setData(result.access);
      setMessage("Atama kaldırıldı.");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const packages = (data?.enterprise ?? []).filter(
    (grant) => !cafe || grant.cafeId === cafe.id,
  );
  const modules = (data?.modulesAssigned ?? []).filter(
    (grant) => !cafe || grant.userId === cafe.ownerId,
  );
  function rows(kind: "enterprise" | "module", grants: AccessGrant[]) {
    return (
      <div className={styles.list}>
        {grants.length ? (
          grants.map((grant) => {
            const account = cafes.find((entry) =>
              kind === "enterprise"
                ? entry.id === grant.cafeId
                : entry.ownerId === grant.userId,
            );
            const title =
              kind === "enterprise"
                ? data?.packages.find((entry) => entry.key === grant.key)?.title
                : data?.modules.find((entry) => entry.key === grant.key)?.title;
            const active = grantActive({
              status: grant.status,
              expires_at: grant.expiresAt,
            });
            const ownerChanged =
              kind === "enterprise" &&
              account &&
              grant.userId !== account.ownerId;
            return (
              <article key={grant.id}>
                <div>
                  <strong>{title ?? grant.key}</strong>
                  <span>
                    {kind === "enterprise"
                      ? (account?.name ?? "İşletme kaydı")
                      : (account?.ownerEmail ??
                        `Hesap ${grant.userId.slice(0, 8)}`)}
                  </span>
                  <small>
                    {date(grant.expiresAt)} ·{" "}
                    {grant.status === "revoked"
                      ? "Kaldırıldı"
                      : ownerChanged
                        ? "Hesap sahibi değişmiş · Yeniden atayın"
                        : active
                          ? "Aktif"
                          : "Süresi doldu"}
                    {kind === "module" &&
                    !data?.modules.find((entry) => entry.key === grant.key)
                      ?.available
                      ? " · Modül henüz hazır değil"
                      : ""}
                  </small>
                </div>
                {grant.status !== "revoked" && (
                  <button
                    disabled={busy}
                    aria-label={`${title ?? grant.key} atamasını kaldır`}
                    onClick={() => void revoke(kind, grant)}
                  >
                    <X size={14} />
                    Kaldır
                  </button>
                )}
              </article>
            );
          })
        ) : (
          <p>Henüz atama yok.</p>
        )}
      </div>
    );
  }
  return (
    <section className={styles.manager}>
      <header>
        <div>
          <span>ERİŞİM YÖNETİMİ</span>
          <h2>
            {cafe ? "Paketler ve modüller" : "Enterprise ve modül atamaları"}
          </h2>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading || busy}
          aria-label="Atamaları yenile"
        >
          <RefreshCw size={16} />
        </button>
      </header>
      {loading && !data ? (
        <p className={styles.notice}>
          <LoaderCircle className="spin" size={16} />
          Atamalar yükleniyor…
        </p>
      ) : (
        <>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className={styles.notice} role="status">
              {message}
            </p>
          )}
          {data && !data.configured && (
            <p className={styles.notice}>
              <Info size={18} />
              Atama sistemi için bir defalık kurulum gerekiyor:
              0006_admin_access_assignments.sql. Kurulumdan sonra tüm işlemler
              bu ekrandan yapılır.
            </p>
          )}
          {!cafe && (
            <label className={styles.accountSelect}>
              Atama yapılacak işletme
              <AdminSelect
                value={cafeId}
                onChange={setCafeId}
                label="Atama yapılacak işletme"
                placeholder="İşletme seçin"
                options={cafes.map((entry) => ({
                  value: entry.id,
                  label: entry.name,
                  description: entry.ownerEmail ?? "Hesap sahibi",
                }))}
                disabled={busy}
              />
            </label>
          )}
          {selected && (
            <p className={styles.recipient}>
              Hesap: <strong>{selected.ownerEmail ?? "İşletme sahibi"}</strong>{" "}
              · İşletme: <strong>{selected.name}</strong>
            </p>
          )}
          <div className={styles.forms}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void assign("enterprise");
              }}
            >
              <h3>
                <Crown size={17} />
                Enterprise paketi
              </h3>
              <p>Yalnızca seçilen işletme için özel ekranları açar.</p>
              <label>
                Paket ekleyin
                <AdminSelect
                  value={packageKey}
                  onChange={setPackageKey}
                  label="Paket ekleyin"
                  options={(data?.packages ?? []).map((entry) => ({
                    value: entry.key,
                    label: entry.title,
                  }))}
                  disabled={busy}
                />
              </label>
              <label>
                Geçerlilik tarihi
                <input
                  type="date"
                  value={packageDate}
                  onChange={(event) => setPackageDate(event.target.value)}
                />
                <small>Boş bırakırsanız süresiz.</small>
              </label>
              <button disabled={busy || !data?.configured || !selected}>
                <Plus size={15} />
                Paket ekle / güncelle
              </button>
            </form>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void assign("module");
              }}
            >
              <h3>
                <Puzzle size={17} />
                Ek modül
              </h3>
              <p>Hesaba atanır; sahibinin bütün işletmeleri için geçerlidir.</p>
              <label>
                Modül ekleyin
                <AdminSelect
                  value={moduleKey}
                  onChange={setModuleKey}
                  label="Modül ekleyin"
                  options={(data?.modules ?? []).map((entry) => ({
                    value: entry.key,
                    label: entry.title,
                    description: entry.available
                      ? undefined
                      : "Hazırlanıyor · Atama önceden yapılabilir",
                  }))}
                  disabled={busy}
                />
              </label>
              <label>
                Geçerlilik tarihi
                <input
                  type="date"
                  value={moduleDate}
                  onChange={(event) => setModuleDate(event.target.value)}
                />
                <small>Boş bırakırsanız süresiz.</small>
              </label>
              <button disabled={busy || !data?.configured || !selected}>
                <Plus size={15} />
                Modül ekle / güncelle
              </button>
              <small>
                ERP ataması stok, reçete ve finans ekranlarını açar.
                İşletmelerin verileri ayrı tutulur.
              </small>
            </form>
          </div>
          <div className={styles.sectionTitle}>
            <Crown size={16} />
            <h3>Enterprise atamaları</h3>
          </div>
          {rows("enterprise", packages)}
          <div className={styles.sectionTitle}>
            <Puzzle size={16} />
            <h3>Modül atamaları</h3>
          </div>
          {rows("module", modules)}
        </>
      )}
    </section>
  );
}
