"use client";
import PaymentSummary from "./payment-summary";
import { paymentMethodLabel } from "@/lib/orders";
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import NavLink from "@/components/nav-link";
import { useRouter } from "next/navigation";
import {
  PackageOpen,
  BookOpen,
  ChartNoAxesCombined,
  Wallet,
  ArrowLeft,
  Plus,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  Trash2,
  Check,
  ShoppingBag,
} from "lucide-react";
import AppSelect from "@/components/app-select";
import ModuleNavigation from "@/modules/navigation";
import ThemeToggle from "@/app/theme-toggle";
import { api } from "@/lib/client-api";
import { supabase } from "@/lib/supabase-browser";
import type { Cafe } from "@/lib/menu";
import type { ErpData, Ingredient } from "./types";
import { erpReport, recommendations, turkeyDay } from "./report";
import styles from "./dashboard.module.css";
const money = (v: number) =>
  v.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
const decimal = (v: number) =>
  Number(v).toLocaleString("tr-TR", { maximumFractionDigits: 6 });
const tabs = [
  { id: "stock", label: "Stok", icon: PackageOpen },
  { id: "recipes", label: "Ürün reçeteleri", icon: BookOpen },
  { id: "finance", label: "Ciro ve kâr", icon: ChartNoAxesCombined },
  { id: "expenses", label: "Giderler", icon: Wallet },
] as const;
const categories = [
  { value: "rent", label: "Kira" },
  { value: "salary", label: "Personel" },
  { value: "utilities", label: "Fatura" },
  { value: "other", label: "Diğer" },
];
const kinds: Record<string, string> = {
  opening: "Açılış",
  purchase: "Alış",
  count: "Sayım",
  sale: "Sipariş",
};
const numeric = (form: FormData, key: string) =>
  Number(String(form.get(key) ?? "").replace(",", "."));
const cost = (form: FormData) =>
  String(form.get("unitCost") ?? "").trim() === ""
    ? null
    : numeric(form, "unitCost");

export default function ErpDashboard({
  preview,
  initialData,
}: {
  preview: boolean;
  initialData: ErpData | null;
}) {
  const router = useRouter();
  const [cafes, setCafes] = useState<Pick<Cafe, "id" | "name">[]>(
      initialData ? [initialData.cafe] : [],
    ),
    [cafeId, setCafeId] = useState(initialData?.cafe.id ?? "");
  const [data, setData] = useState<ErpData | null>(initialData),
    [tab, setTab] = useState<(typeof tabs)[number]["id"]>("stock");
  const [year, setYear] = useState(new Date().getFullYear()),
    [month, setMonth] = useState(
      String(new Date().getMonth() + 1).padStart(2, "0"),
    );
  const [day, setDay] = useState(turkeyDay(new Date())),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(!preview);
  const [create, setCreate] = useState(false),
    [unit, setUnit] = useState("L"),
    [movement, setMovement] = useState<Ingredient | null>(null),
    [movementKind, setMovementKind] = useState("purchase");
  const [product, setProduct] = useState(""),
    [parts, setParts] = useState<{ ingredientId: string; quantity: string }[]>(
      [],
    ),
    [category, setCategory] = useState("rent");
  const revision = useRef(0);
  const [trackedProduct, setTrackedProduct] = useState("");
  const pending = useRef<{ key: string; id: string } | null>(null);
  useEffect(() => {
    if (preview) return;
    let active = true;
    (async () => {
      const { data: session } = await supabase().auth.getSession();
      if (!active) return;
      if (!session.session) {
        router.replace("/login?next=%2Fmodules%2Ferp");
        return;
      }
      const [access, rows] = await Promise.all([
        api<{ modules: { erp: boolean } }>("/api/access"),
        api<Cafe[]>("/api/cafes"),
      ]);
      if (!active) return;
      if (!access.modules.erp)
        throw new Error(
          "Bu hesabın aktif ERP Modülü erişimi yok. Admin panelinden modül ataması yapılabilir.",
        );
      setCafes(rows);
      setCafeId(rows[0]?.id ?? "");
      if (!rows.length) setLoading(false);
    })().catch((e) => {
      if (active) {
        setError(e.message);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [preview, router]);
  const refresh = useCallback(async () => {
    if (preview || !cafeId) return;
    const version = ++revision.current;
    try {
      const value = await api<ErpData>(
        `/api/modules/erp?cafe=${encodeURIComponent(cafeId)}&year=${year}`,
      );
      if (version === revision.current) {
        setData(value);
        setError("");
      }
    } catch (e) {
      if (version === revision.current) setError((e as Error).message);
    } finally {
      if (version === revision.current) setLoading(false);
    }
  }, [preview, cafeId, year]);
  const invalidate = useCallback(() => {
    revision.current++;
  }, []);
  useEffect(() => {
    if (preview) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizes remote ERP data; state writes in refresh follow the awaited API response.
    void refresh();
    return invalidate;
  }, [refresh, preview, invalidate]);
  function switchCafe(id: string) {
    setLoading(true);
    setTrackedProduct("");
    invalidate();
    setData(null);
    setCafeId(id);
    setProduct("");
    setParts([]);
    setMovement(null);
    setCreate(false);
    setNotice("");
  }
  useEffect(() => {
    if (preview) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [refresh, preview]);
  async function save(input: Record<string, unknown>, after?: () => void) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (preview)
        throw new Error(
          "Bu ekran örnek verilerle önizlemedir. Kayıt işlemleri için modülü gerçek hesaba atayın.",
        );
      const key = JSON.stringify({ cafeId, input });
      if (pending.current?.key !== key)
        pending.current = { key, id: crypto.randomUUID() };
      await api("/api/modules/erp", {
        cafeId,
        input,
        requestId: pending.current.id,
      });
      pending.current = null;
      after?.();
      setNotice("Kaydedildi.");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const report = data ? erpReport(data, month, day) : null;
  const recipeMissing =
    data?.cafe.items.filter(
      (i) => !data.recipes.some((r) => r.product_id === i.id),
    ).length ?? 0;
  function chooseProduct(id: string) {
    setProduct(id);
    setParts(
      (data?.recipes.filter((r) => r.product_id === id) ?? []).map((r) => ({
        ingredientId: r.ingredient_id,
        quantity: String(r.quantity),
      })),
    );
  }
  function submitIngredient(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    void save(
      {
        action: "ingredient",
        name: trackedProduct
          ? data?.cafe.items.find((i) => i.id === trackedProduct)?.name
          : form.get("name"),
        unit,
        quantity: numeric(form, "quantity"),
        unitCost: cost(form),
        threshold: numeric(form, "threshold"),
        ...(trackedProduct ? { productId: trackedProduct } : {}),
      },
      () => {
        setCreate(false);
        setTrackedProduct("");
      },
    );
  }
  function submitMovement(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (!movement) return;
    void save(
      {
        action: movementKind,
        ingredientId: movement.id,
        quantity: numeric(form, "quantity"),
        unitCost: cost(form),
        note: form.get("note"),
        expectedUpdatedAt: movement.updated_at,
      },
      () => setMovement(null),
    );
  }
  function submitExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const element = e.currentTarget,
      form = new FormData(element);
    void save(
      {
        action: "expense",
        day: form.get("day"),
        category,
        description: form.get("description"),
        amount: numeric(form, "amount"),
      },
      () => element.reset(),
    );
  }
  const summary = report?.summary;
  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <NavLink href="/?view=overview" className={styles.brand}>
          fincan <span>ERP</span>
        </NavLink>
        <div className={styles.workspace}>
          <PackageOpen size={20} />
          <div>
            <strong>İşletme kaynakları</strong>
            <small>Stok ve finans yönetimi</small>
          </div>
        </div>
        <nav aria-label="ERP bölümleri">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? styles.active : ""}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={18} />
              {t.label}
            </button>
          ))}
        </nav>
        <ModuleNavigation />
        <NavLink href="/?view=overview" className={styles.back}>
          <ArrowLeft size={16} />
          Ana panele dön
        </NavLink>
      </aside>
      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>ERP MODÜLÜ</span>
            <h1>{tabs.find((t) => t.id === tab)?.label}</h1>
            <p>Malzemeden satışa, işletmenizin günlük akışı.</p>
          </div>
          <ThemeToggle />
        </header>
        <div className={styles.toolbar}>
          <label>
            İşletme
            <AppSelect
              label="İşletme"
              value={cafeId}
              onValueChange={switchCafe}
              disabled={busy || preview}
              options={cafes.map((c) => ({ value: c.id, label: c.name }))}
            />
          </label>
          <button
            className="btn secondary"
            disabled={loading || preview || busy}
            onClick={() => {
              setLoading(true);
              void refresh();
            }}
          >
            <RefreshCw size={16} />
            Yenile
          </button>
        </div>
        {preview && (
          <p className={styles.notice}>
            Önizleme · Örnek veriler kullanılıyor. Canlı stok ve siparişler
            etkilenmez.
          </p>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className={styles.notice}>
            <Check size={16} />
            {notice}
          </p>
        )}
        {loading && !data ? (
          <div className={styles.empty}>Veriler yükleniyor…</div>
        ) : !data ? (
          <div className={styles.empty}>
            ERP’yi kullanmak için bir işletme ve aktif modül ataması gerekli.
          </div>
        ) : (
          <>
            <div className={styles.insights}>
              {recommendations(data).map((card) => (
                <article key={card.title}>
                  <Lightbulb size={19} />
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.body}</p>
                  </div>
                </article>
              ))}
            </div>
            {tab === "stock" && (
              <>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2>Malzeme stoğu</h2>
                    <p>
                      Menü ürünlerinizi reçetelerde bu malzemelerle eşleştirin.
                    </p>
                  </div>
                  <button
                    className="btn"
                    onClick={() => {
                      setCreate(!create);
                      setMovement(null);
                    }}
                  >
                    <Plus size={16} />
                    Malzeme ekle
                  </button>
                </div>
                {create && (
                  <form className={styles.card} onSubmit={submitIngredient}>
                    <h3>Yeni malzeme</h3>
                    <label>
                      Menü ürününü doğrudan takip et (isteğe bağlı)
                      <AppSelect
                        label="Doğrudan stok ürünü"
                        value={trackedProduct}
                        onValueChange={(v) => {
                          setTrackedProduct(v);
                          if (v) setUnit("adet");
                        }}
                        options={[
                          { value: "", label: "Malzeme ekliyorum" },
                          ...data.cafe.items
                            .filter(
                              (i) =>
                                !data.recipes.some(
                                  (r) => r.product_id === i.id,
                                ),
                            )
                            .map((i) => ({ value: i.id, label: i.name })),
                        ]}
                      />
                    </label>
                    <div className={styles.formGrid}>
                      <label>
                        Malzeme adı
                        <input
                          name="name"
                          key={trackedProduct}
                          defaultValue={
                            trackedProduct
                              ? data.cafe.items.find(
                                  (i) => i.id === trackedProduct,
                                )?.name
                              : undefined
                          }
                          required
                          maxLength={100}
                          placeholder="Örn. Süt"
                          disabled={!!trackedProduct}
                        />
                      </label>
                      <label>
                        Birim
                        <AppSelect
                          label="Malzeme birimi"
                          value={unit}
                          onValueChange={setUnit}
                          disabled={!!trackedProduct}
                          options={[
                            { value: "L", label: "Litre (L)" },
                            { value: "kg", label: "Kilogram (kg)" },
                            { value: "adet", label: "Adet" },
                          ]}
                        />
                      </label>
                      <label>
                        Açılış miktarı
                        <input
                          name="quantity"
                          type="number"
                          min="0"
                          max="100000000"
                          step="0.000001"
                          defaultValue="0"
                          required
                        />
                      </label>
                      <label>
                        Birim alış fiyatı · ₺ / {unit}
                        <input
                          name="unitCost"
                          type="number"
                          min="0"
                          max="1000000"
                          step="0.000001"
                          placeholder="İsteğe bağlı"
                        />
                      </label>
                      <label>
                        Düşük stok uyarı miktarı
                        <input
                          name="threshold"
                          type="number"
                          min="0"
                          step="0.000001"
                          defaultValue="0"
                          required
                        />
                      </label>
                    </div>
                    <button className="btn" disabled={busy}>
                      Malzemeyi kaydet
                    </button>
                  </form>
                )}
                {movement && (
                  <form
                    className={styles.card}
                    key={movement.id}
                    onSubmit={submitMovement}
                  >
                    <div className={styles.sectionHeader}>
                      <h3>
                        {movement.name} · {decimal(movement.quantity)}{" "}
                        {movement.unit}
                      </h3>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => setMovement(null)}
                      >
                        Kapat
                      </button>
                    </div>
                    <div className={styles.formGrid}>
                      <label>
                        İşlem
                        <AppSelect
                          label="Stok işlemi"
                          value={movementKind}
                          onValueChange={setMovementKind}
                          options={[
                            { value: "purchase", label: "Stok alışı / giriş" },
                            { value: "count", label: "Sayım düzeltmesi" },
                          ]}
                        />
                      </label>
                      <label>
                        {movementKind === "purchase"
                          ? "Eklenecek miktar"
                          : "Sayılan toplam miktar"}{" "}
                        · {movement.unit}
                        <input
                          name="quantity"
                          type="number"
                          min={movementKind === "purchase" ? "0.000001" : "0"}
                          step="0.000001"
                          required
                        />
                      </label>
                      {movementKind === "purchase" && (
                        <label>
                          Birim alış fiyatı · ₺ / {movement.unit}
                          <input
                            name="unitCost"
                            type="number"
                            min="0"
                            step="0.000001"
                            placeholder="İsteğe bağlı"
                          />
                        </label>
                      )}
                      <label>
                        Açıklama
                        <input
                          name="note"
                          required={movementKind === "count"}
                          maxLength={200}
                          placeholder={
                            movementKind === "count"
                              ? "Sayım nedeni"
                              : "Tedarikçi / fatura notu"
                          }
                        />
                      </label>
                    </div>
                    <p>
                      Alışlarda ağırlıklı ortalama maliyet güncellenir. Sayım
                      düzeltmesi alış veya gider sayılmaz.
                    </p>
                    <button className="btn" disabled={busy}>
                      Stoğu güncelle
                    </button>
                  </form>
                )}
                <div className={styles.stockGrid}>
                  {data.inventory.map((i) => (
                    <article
                      className={`${styles.card} ${Number(i.quantity) <= Number(i.threshold) ? styles.low : ""}`}
                      key={i.id}
                    >
                      <div className={styles.sectionHeader}>
                        <h3>{i.name}</h3>
                        {Number(i.quantity) <= Number(i.threshold) && (
                          <span className={styles.badge}>
                            <AlertTriangle size={13} />
                            {Number(i.quantity) < 0 ? "Stok açığı" : "Azalıyor"}
                          </span>
                        )}
                      </div>
                      <div className={styles.quantity}>
                        {decimal(i.quantity)} <span>{i.unit}</span>
                      </div>
                      <div className={styles.meta}>
                        <span>Birim maliyet</span>
                        <strong>
                          {i.unit_cost === null
                            ? "Girilmedi"
                            : money(Number(i.unit_cost))}
                        </strong>
                      </div>
                      <div className={styles.meta}>
                        <span>Uyarı seviyesi</span>
                        <strong>
                          {decimal(i.threshold)} {i.unit}
                        </strong>
                      </div>
                      <button
                        className="btn secondary"
                        onClick={() => {
                          setMovement(i);
                          setMovementKind("purchase");
                          setCreate(false);
                        }}
                      >
                        <Plus size={15} />
                        Giriş / sayım
                      </button>
                    </article>
                  ))}
                </div>
                {!data.inventory.length && (
                  <div className={styles.empty}>
                    <PackageOpen size={28} />
                    <h3>İlk malzemenizi ekleyin</h3>
                    <p>
                      Sütü litre, kahve çekirdeğini kilogram, paketli ürünleri
                      adet olarak takip edebilirsiniz.
                    </p>
                  </div>
                )}
                <section className={styles.card}>
                  <h2>Son stok hareketleri</h2>
                  <div className={styles.tableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th>Malzeme / tarih</th>
                          <th>İşlem</th>
                          <th>Miktar</th>
                          <th>Açıklama</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.movements.map((m) => {
                          const i = data.inventory.find(
                            (i) => i.id === m.ingredient_id,
                          );
                          return (
                            <tr key={m.id}>
                              <td>
                                {i?.name}
                                <small>
                                  {new Date(m.created_at).toLocaleString(
                                    "tr-TR",
                                    { timeZone: "Europe/Istanbul" },
                                  )}
                                </small>
                              </td>
                              <td>{kinds[m.kind]}</td>
                              <td>
                                {Number(m.delta) > 0 ? "+" : ""}
                                {decimal(m.delta)} {i?.unit}
                              </td>
                              <td>{m.note || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {!data.movements.length && <p>Henüz stok hareketi yok.</p>}
                  </div>
                  <p>En son 100 hareket gösterilir.</p>
                </section>
              </>
            )}
            {tab === "recipes" && (
              <>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2>Her ürünün malzeme reçetesi</h2>
                    <p>
                      Bir adet ürün için kullanılan miktarları girin. 250 ml süt
                      = 0,25 L; 18 g kahve = 0,018 kg.
                    </p>
                  </div>
                </div>
                {recipeMissing > 0 && (
                  <p className={styles.notice}>
                    <AlertTriangle size={16} />
                    {recipeMissing} ürünün reçetesi eksik. Bu ürünlerin maliyeti
                    tam hesaplanamaz.
                  </p>
                )}
                <section className={styles.card}>
                  <label>
                    Menü ürünü
                    <AppSelect
                      label="Reçete ürünü"
                      value={product}
                      onValueChange={chooseProduct}
                      placeholder="Ürün seçin"
                      options={data.cafe.items.map((i) => ({
                        value: i.id,
                        label: i.name,
                        description: data.recipes.some(
                          (r) => r.product_id === i.id,
                        )
                          ? "Reçete tanımlı"
                          : "Reçete eksik",
                      }))}
                    />
                  </label>
                  {product && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void save({
                          action: "recipe",
                          productId: product,
                          parts: parts.map((p) => ({
                            ingredientId: p.ingredientId,
                            quantity: Number(p.quantity.replace(",", ".")),
                          })),
                        });
                      }}
                    >
                      <div className={styles.recipeRows}>
                        {parts.map((part, index) => {
                          const i = data.inventory.find(
                            (i) => i.id === part.ingredientId,
                          );
                          return (
                            <div className={styles.recipeRow} key={index}>
                              <label>
                                Malzeme
                                <AppSelect
                                  label={`Malzeme ${index + 1}`}
                                  value={part.ingredientId}
                                  onValueChange={(v) =>
                                    setParts((old) =>
                                      old.map((p, j) =>
                                        j === index
                                          ? { ...p, ingredientId: v }
                                          : p,
                                      ),
                                    )
                                  }
                                  placeholder="Malzeme seçin"
                                  options={data.inventory.map((i) => ({
                                    value: i.id,
                                    label: `${i.name} · ${i.unit}`,
                                    disabled: parts.some(
                                      (p, j) =>
                                        j !== index && p.ingredientId === i.id,
                                    ),
                                  }))}
                                  required
                                />
                              </label>
                              <label>
                                Bir ürün için · {i?.unit ?? "miktar"}
                                <input
                                  type="number"
                                  min="0.000001"
                                  max="100000000"
                                  step="0.000001"
                                  required
                                  value={part.quantity}
                                  onChange={(e) =>
                                    setParts((old) =>
                                      old.map((p, j) =>
                                        j === index
                                          ? { ...p, quantity: e.target.value }
                                          : p,
                                      ),
                                    )
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                className="icon-btn"
                                aria-label={`Malzeme ${index + 1} kaldır`}
                                onClick={() =>
                                  setParts((old) =>
                                    old.filter((_, j) => j !== index),
                                  )
                                }
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className={styles.actions}>
                        <button
                          className="btn secondary"
                          type="button"
                          disabled={
                            !data.inventory.length || parts.length >= 100
                          }
                          onClick={() =>
                            setParts((old) => [
                              ...old,
                              { ingredientId: "", quantity: "" },
                            ])
                          }
                        >
                          <Plus size={16} />
                          Malzeme satırı
                        </button>
                        <button
                          className="btn"
                          disabled={busy || parts.some((p) => !p.ingredientId)}
                        >
                          {parts.length ? "Reçeteyi kaydet" : "Reçeteyi kaldır"}
                        </button>
                      </div>
                      <p>
                        Değişiklikler sonraki tamamlanan siparişlere uygulanır.
                        Geçmiş maliyet kayıtları korunur.
                      </p>
                    </form>
                  )}
                  {!data.inventory.length && (
                    <p>Önce Stok bölümünden malzemelerinizi ekleyin.</p>
                  )}
                </section>
              </>
            )}
            {(tab === "finance" || tab === "expenses") && report && summary && (
              <>
                <div className={styles.filters}>
                  <label>
                    Yıl
                    <AppSelect
                      label="Rapor yılı"
                      value={String(year)}
                      onValueChange={(v) => {
                        setYear(Number(v));
                        setData(null);
                        setLoading(true);
                        setDay("");
                      }}
                      options={Array.from(
                        {
                          length: Math.min(10, new Date().getFullYear() - 2019),
                        },
                        (_, i) => ({
                          value: String(new Date().getFullYear() - i),
                          label: String(new Date().getFullYear() - i),
                        }),
                      )}
                      disabled={preview}
                    />
                  </label>
                  <label>
                    Dönem
                    <AppSelect
                      label="Rapor dönemi"
                      value={month}
                      onValueChange={setMonth}
                      options={[
                        { value: "all", label: "Tüm yıl" },
                        ...Array.from({ length: 12 }, (_, i) => ({
                          value: String(i + 1).padStart(2, "0"),
                          label: new Date(2024, i).toLocaleString("tr-TR", {
                            month: "long",
                          }),
                        })),
                      ]}
                    />
                  </label>
                </div>
                <div className={styles.metrics}>
                  <article>
                    <span>Tamamlanan satış cirosu</span>
                    <strong>{money(summary.revenue)}</strong>
                    <small>
                      {summary.orders} sipariş · {summary.units} ürün
                    </small>
                  </article>
                  <article>
                    <span>Bilinen malzeme maliyeti</span>
                    <strong>{money(summary.material)}</strong>
                    <small>Tamamlanma anındaki maliyet</small>
                  </article>
                  <article>
                    <span>İşletme giderleri</span>
                    <strong>{money(summary.expense)}</strong>
                    <small>Kira, personel, faturalar</small>
                  </article>
                  <article>
                    <span>
                      {summary.incomplete
                        ? "Kısmi faaliyet sonucu"
                        : "Tahmini faaliyet kârı"}
                    </span>
                    <strong>{money(summary.profit)}</strong>
                    <small>Ciro − malzeme − gider</small>
                  </article>
                </div>
                <p className={styles.notice}>
                  Rapor, ERP aktifken tamamlanan siparişleri kapsar. Vergi,
                  amortisman ve girilmeyen giderler dahil değildir.{" "}
                  {summary.incomplete > 0
                    ? `${summary.incomplete} siparişin reçetesi veya alış maliyeti eksik; gösterilen sonuç tam kâr değildir.`
                    : "Alış tutarları ayrıca gider yazılmaz; satılan malzemenin maliyeti hesapta kullanılır."}
                </p>
                {tab === "finance" && (
                  <>
                    <section className={styles.card}>
                      <div className={styles.sectionHeader}>
                        <div>
                          <h2>Gün sonu özeti</h2>
                          <p>Türkiye saatine göre ödeme tamamlanan gün.</p>
                        </div>
                        <label>
                          Gün
                          <input
                            type="date"
                            value={day}
                            onChange={(e) => setDay(e.target.value)}
                            min={`${year}-01-01`}
                            max={`${year}-12-31`}
                          />
                        </label>
                      </div>
                      <div className={styles.dayMetrics}>
                        <span>
                          <strong>{report.day.units}</strong>satılan ürün
                        </span>
                        <span>
                          <strong>{money(report.day.revenue)}</strong>ciro
                        </span>
                        <span>
                          <strong>{money(report.day.profit)}</strong>
                          {report.day.incomplete
                            ? "kısmi sonuç"
                            : "tahmini kâr"}
                        </span>
                      </div>
                      <PaymentSummary sales={report.daySales} />
                      <div className={styles.tableWrap}>
                        <table>
                          <thead>
                            <tr>
                              <th>Ödeme saati</th>
                              <th>Yöntem</th>
                              <th>Ürünler</th>
                              <th>Tutar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.daySales.map((s) => (
                              <tr key={s.order_id}>
                                <td>
                                  {new Date(s.completed_at).toLocaleTimeString(
                                    "tr-TR",
                                    {
                                      timeZone: "Europe/Istanbul",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </td>
                                <td>
                                  {s.payment_method
                                    ? paymentMethodLabel[s.payment_method]
                                    : "Belirtilmemiş"}
                                </td>
                                <td>
                                  {s.lines
                                    .map((l) => `${l.quantity} × ${l.name}`)
                                    .join(", ")}
                                </td>
                                <td>{money(Number(s.total))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {!report.daySales.length && (
                          <p>Bu gün için kayıtlı tamamlanan satış yok.</p>
                        )}
                      </div>
                    </section>
                    <div className={styles.twoColumns}>
                      <section className={styles.card}>
                        <h2>Günlük satışlar</h2>
                        <div className={styles.tableWrap}>
                          <table>
                            <thead>
                              <tr>
                                <th>Gün</th>
                                <th>Ürün</th>
                                <th>Ciro</th>
                                <th>Sonuç</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.daily.map((d) => (
                                <tr key={d.day}>
                                  <td>
                                    <button
                                      className={styles.textButton}
                                      onClick={() => setDay(d.day)}
                                    >
                                      {new Date(
                                        d.day + "T12:00:00+03:00",
                                      ).toLocaleDateString("tr-TR")}
                                    </button>
                                  </td>
                                  <td>{d.units}</td>
                                  <td>{money(d.revenue)}</td>
                                  <td>
                                    {money(d.profit)}
                                    {d.incomplete > 0 && (
                                      <small>Maliyet eksik</small>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {!report.daily.length && (
                            <p>Seçilen dönemde kayıt yok.</p>
                          )}
                        </div>
                      </section>
                      <section className={styles.card}>
                        <h2>Ürün satış dağılımı</h2>
                        <div className={styles.tableWrap}>
                          <table>
                            <thead>
                              <tr>
                                <th>Ürün</th>
                                <th>Adet</th>
                                <th>Ciro</th>
                                <th>Malzeme</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.products.map((p) => (
                                <tr key={p.id}>
                                  <td>{p.name}</td>
                                  <td>{p.quantity}</td>
                                  <td>{money(p.revenue)}</td>
                                  <td>
                                    {money(p.cost)}
                                    {!p.complete && (
                                      <small>Maliyet eksik</small>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </div>
                    <div className={styles.card}>
                      <h3>{year} yılı toplamı</h3>
                      <p>
                        {money(report.year.revenue)} ciro · {report.year.units}{" "}
                        ürün · {money(report.year.expense)} gider ·{" "}
                        {money(report.year.profit)}{" "}
                        {report.year.incomplete
                          ? "kısmi faaliyet sonucu"
                          : "tahmini faaliyet kârı"}
                      </p>
                    </div>
                  </>
                )}
                {tab === "expenses" && (
                  <>
                    <form className={styles.card} onSubmit={submitExpense}>
                      <h2>İşletme gideri ekle</h2>
                      <p>
                        Malzeme alımlarını Stok ekranından girin. Aynı alış
                        tutarını burada tekrar kaydetmeyin.
                      </p>
                      <div className={styles.formGrid}>
                        <label>
                          Tarih
                          <input
                            name="day"
                            type="date"
                            defaultValue={turkeyDay(new Date())}
                            required
                          />
                        </label>
                        <label>
                          Kategori
                          <AppSelect
                            label="Gider kategorisi"
                            value={category}
                            onValueChange={setCategory}
                            options={categories}
                          />
                        </label>
                        <label>
                          Açıklama
                          <input
                            name="description"
                            required
                            maxLength={200}
                            placeholder="Örn. Ekim ayı kirası"
                          />
                        </label>
                        <label>
                          Tutar · ₺
                          <input
                            name="amount"
                            type="number"
                            min="0.01"
                            max="100000000"
                            step="0.01"
                            required
                          />
                        </label>
                      </div>
                      <button className="btn" disabled={busy}>
                        <Plus size={16} />
                        Gideri kaydet
                      </button>
                    </form>
                    <section className={styles.card}>
                      <h2>Dönem giderleri</h2>
                      <div className={styles.tableWrap}>
                        <table>
                          <thead>
                            <tr>
                              <th>Tarih</th>
                              <th>Gider</th>
                              <th>Tutar</th>
                              <th>İşlem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.expenses
                              .slice()
                              .sort((a, b) => b.day.localeCompare(a.day))
                              .map((e) => (
                                <tr key={e.id}>
                                  <td>
                                    {new Date(
                                      e.day + "T12:00:00+03:00",
                                    ).toLocaleDateString("tr-TR")}
                                  </td>
                                  <td>
                                    {e.description}
                                    <small>
                                      {
                                        categories.find(
                                          (c) => c.value === e.category,
                                        )?.label
                                      }
                                    </small>
                                  </td>
                                  <td>{money(Number(e.amount))}</td>
                                  <td>
                                    <button
                                      className="icon-btn"
                                      aria-label={`${e.description} giderini sil`}
                                      disabled={busy}
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            "Bu gider kaydı silinsin mi?",
                                          )
                                        )
                                          void save({
                                            action: "deleteExpense",
                                            id: e.id,
                                          });
                                      }}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {!report.expenses.length && (
                          <p>Bu dönemde gider kaydı yok.</p>
                        )}
                      </div>
                    </section>
                  </>
                )}
              </>
            )}
            <footer className={styles.footer}>
              <ShoppingBag size={14} />
              Stok yalnızca ücreti alınan, tamamlanan siparişlerde düşer. Eksi
              stok miktarları sayım veya stok girişiyle düzeltilebilir.
            </footer>
          </>
        )}
      </section>
    </main>
  );
}
