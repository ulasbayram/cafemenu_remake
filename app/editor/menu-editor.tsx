"use client";
/* eslint-disable @next/next/no-img-element -- The uploaded logo is already optimized locally; no image service is needed. */
import { useEffect, useState, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Palette,
  Type,
  Layers,
  ChevronRight,
  LockKeyhole,
  Smartphone,
  Monitor,
  MousePointer2,
  Check,
  Undo2,
  Redo2,
  X,
  LoaderCircle,
} from "lucide-react";
import { type Cafe } from "@/lib/menu";
import { api } from "@/lib/client-api";
import { useAdminApi } from "@/lib/admin-api";
import MenuView, { type MenuBlock } from "../menu-view";
import ThemeToggle from "../theme-toggle";
import { prepareLogo } from "@/lib/logo";
import { uploadImage } from "@/lib/storage";
import { useMenuTheme } from "../use-menu-theme";
import { useHistory } from "./use-history";
export default function MenuEditor({
  initialCafe,
  access = "owner",
}: {
  initialCafe: Cafe;
  access?: "owner" | "admin";
}) {
  const router = useRouter();
  const adminApi = useAdminApi();
  const {
    value: cafe,
    update: setCafe,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory(initialCafe);
  const [saved, setSaved] = useState(initialCafe),
    [requestedSelection, setSelection] = useState<MenuBlock>("theme"),
    [busy, setBusy] = useState(false),
    [logoBusy, setLogoBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [wide, setWide] = useState(false),
    [inspector, setInspector] = useState(true);
  const dirty = JSON.stringify(cafe) !== JSON.stringify(saved);
  const { theme: customerTheme } = useMenuTheme(cafe.defaultTheme);
  const [previewTheme, setPreviewTheme] = useState("auto");
  const selection: MenuBlock = ["theme", "header", "footer"].includes(
    requestedSelection,
  )
    ? requestedSelection
    : "theme";
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        busy ||
        logoBusy ||
        target.closest('input, textarea, select, [contenteditable="true"]') ||
        !(e.ctrlKey || e.metaKey)
      )
        return;
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [busy, logoBusy, undo, redo]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const select = useCallback((block: MenuBlock) => {
    setSelection(
      ["theme", "header", "footer"].includes(block) ? block : "theme",
    );
    setInspector(true);
    setError("");
  }, []);
  function change(p: Partial<Cafe>) {
    setCafe((c) => ({ ...c, ...p }));
  }
  async function uploadLogo(file?: File) {
    if (!file) return;
    setLogoBusy(true);
    setError("");
    try {
      const { blob, palette, defaultTheme, logoSurface } =
        await prepareLogo(file);
      const logoUrl = await uploadImage(blob, "logos");
      change({
        logoUrl,
        logoPalette: palette,
        defaultTheme,
        logoSurface,
        ...palette,
      });
      setToast(
        "Logo eklendi; logoya uygun renkler uygulandı. Kaydetmeyi unutmayın.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Logo okunamadı.");
    } finally {
      setLogoBusy(false);
    }
  }
  async function reanalyzeLogo() {
    if (!cafe.logoUrl) return;
    setLogoBusy(true);
    try {
      const blob = await (await fetch(cafe.logoUrl)).blob();
      await uploadLogo(new File([blob], "kafe-logosu", { type: blob.type }));
    } catch {
      setError("Logo analiz edilemedi. Görseli yeniden yükleyebilirsiniz.");
    } finally {
      setLogoBusy(false);
    }
  }
  async function save() {
    const submitted = cafe;
    setBusy(true);
    setError("");
    try {
      const data =
        access === "admin"
          ? await adminApi<Cafe>(`/api/admin/cafes/${cafe.id}`, {
              body: cafe,
              method: "PUT",
            })
          : await api<Cafe>(`/api/cafes/${cafe.id}`, cafe, "PUT");
      setCafe((current) =>
        JSON.stringify(current) === JSON.stringify(submitted) ? data : current,
      );
      setSaved(data);
      setToast("Menünüz kaydedildi.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function back() {
    if (dirty && !window.confirm("Kaydedilmemiş değişiklikler silinsin mi?"))
      return;
    router.push(access === "admin" ? "/admin" : "/?view=menus");
  }
  return (
    <div className="menu-studio">
      <header className="studio-header">
        <div className="studio-heading">
          <button
            className="icon-btn"
            aria-label={
              access === "admin" ? "Admin paneline dön" : "Menü yönetimine dön"
            }
            onClick={back}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <strong>{cafe.name}</strong>
            <span>
              {access === "admin"
                ? "Canlı destek düzenlemesi"
                : "Menü tasarım stüdyosu"}{" "}
              <ChevronRight size={11} /> /{cafe.slug}
            </span>
          </div>
          <span className="studio-draft">
            {dirty ? "Kaydedilmedi" : cafe.published ? "Yayında" : "Taslak"}
          </span>
        </div>
        <div className="studio-actions">
          <ThemeToggle />
          <button
            className="btn"
            disabled={!canUndo || busy || logoBusy}
            onClick={undo}
            title="Son değişikliği geri al"
          >
            <Undo2 size={16} /> Geri al
          </button>
          <button
            className="btn"
            disabled={!canRedo || busy || logoBusy}
            onClick={redo}
            title="Geri alınan değişikliği yinele"
          >
            <Redo2 size={16} /> İleri al
          </button>
          <button
            className="btn primary"
            disabled={!dirty || busy || logoBusy}
            onClick={save}
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Save size={17} />
            )}
            <span>{busy ? "Kaydediliyor…" : "Kaydet"}</span>
          </button>
        </div>
      </header>
      {access === "admin" && (
        <div className="support-mode-banner" role="status">
          <LockKeyhole size={16} />
          <span>
            <strong>Yönetici destek modu</strong> — Kaydettiğiniz değişiklikler
            kafenin canlı menüsüne uygulanır.
          </span>
        </div>
      )}
      <div className="studio-layout">
        <aside className="studio-layers">
          <div className="studio-panel-title">
            <Layers size={17} />
            <h2>Menü blokları</h2>
          </div>
          <p>
            Menünün görsel bloklarını seçin. Ürün ve kategoriler
            dashboard&apos;daki Ürünler bölümünden yönetilir.
          </p>
          <button
            className={`layer-row ${selection === "theme" ? "selected" : ""}`}
            onClick={() => select("theme")}
          >
            <Palette size={17} /> Genel görünüm
          </button>
          <button
            className={`layer-row ${selection === "header" ? "selected" : ""}`}
            onClick={() => select("header")}
          >
            <Type size={17} /> Menü başlığı
          </button>
          <div className="layer-divider" />
          <button
            className={`layer-row ${selection === "footer" ? "selected" : ""}`}
            onClick={() => select("footer")}
          >
            <LockKeyhole size={16} /> Fincan imzası
          </button>
          <div className="studio-save-note">
            <Check size={14} />
            <span>İmzamız her menüde yer alır.</span>
          </div>
        </aside>
        <main className={`studio-canvas ${wide ? "wide-preview" : ""}`}>
          <div className="canvas-toolbar">
            <span>
              <MousePointer2 size={14} /> Düzenlemek için bir bloğa tıklayın
            </span>
            <div className="device-toggle">
              <button
                className={!wide ? "active" : ""}
                aria-label="Mobil önizleme"
                onClick={() => setWide(false)}
              >
                <Smartphone size={16} />
              </button>
              <button
                className={wide ? "active" : ""}
                aria-label="Geniş önizleme"
                onClick={() => setWide(true)}
              >
                <Monitor size={16} />
              </button>
            </div>
            <select
              aria-label="Menü önizleme teması"
              className="preview-theme-select"
              value={previewTheme}
              onChange={(e) => setPreviewTheme(e.target.value)}
            >
              <option value="auto">
                Müşteri görünümü ({customerTheme === "dark" ? "Koyu" : "Açık"})
              </option>
              <option value="light">Açık tema önizlemesi</option>
              <option value="dark">Koyu tema önizlemesi</option>
            </select>
            <button
              className="inspector-toggle"
              onClick={() => setInspector(!inspector)}
            >
              <SettingsIcon />
              {inspector ? "Paneli gizle" : "Ayarları aç"}
            </button>
          </div>
          <div
            className="canvas-scroll"
            onClick={(e) => {
              if (e.target === e.currentTarget) select("theme");
            }}
          >
            <div
              className="studio-menu-frame"
              data-menu-theme={
                previewTheme === "auto" ? customerTheme : previewTheme
              }
              style={{ "--public-brand": cafe.accent } as CSSProperties}
            >
              <MenuView
                cafe={cafe}
                onSelectBlock={select}
                selectedBlock={selection}
                blockScope="design"
              />
            </div>
            <p className="canvas-footnote">
              Gerçek menünüz · Değişiklikler kaydettiğinizde yayınlanır.
            </p>
          </div>
        </main>
        <aside className={`studio-inspector ${inspector ? "open" : ""}`}>
          <div className="studio-panel-title">
            <h2>
              {selection === "header"
                ? "Başlık ayarları"
                : selection === "footer"
                  ? "Fincan imzası"
                  : "Genel görünüm"}
            </h2>
            <button
              className="icon-btn close-inspector"
              aria-label="Ayar panelini kapat"
              onClick={() => setInspector(false)}
            >
              <X size={17} />
            </button>
          </div>
          <div className="inspector-content">
            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
            {(selection === "theme" || selection === "header") &&
              cafe.logoPalette && (
                <div className="logo-palette">
                  <strong>Logonuzdan önerilen renkler</strong>
                  <div className="logo-swatches">
                    {Object.entries(cafe.logoPalette).map(([key, color]) => (
                      <span
                        key={key}
                        style={{ background: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => change({ ...cafe.logoPalette })}
                  >
                    {cafe.accent === cafe.logoPalette.accent &&
                    cafe.background === cafe.logoPalette.background &&
                    cafe.textColor === cafe.logoPalette.textColor
                      ? "✓ Önerilen renkler seçili"
                      : "Önerilen renkleri uygula"}
                  </button>
                  <p className="inspector-hint">
                    {cafe.defaultTheme && (
                      <>
                        Logonuzun renk ağırlığına göre varsayılan müşteri
                        teması:{" "}
                        <strong>
                          {cafe.defaultTheme === "dark" ? "Koyu" : "Açık"}
                        </strong>
                        .{" "}
                      </>
                    )}
                    Renkleri Genel görünüm bölümünden değiştirebilirsiniz.
                  </p>
                </div>
              )}
            {selection === "theme" && (
              <>
                <span className="inspector-kicker">MENÜNÜZÜN KARAKTERİ</span>
                <label>
                  Tasarım
                  <div className="style-options">
                    {(["classic", "modern", "minimal"] as const).map((s, i) => (
                      <button
                        key={s}
                        className={cafe.style === s ? "chosen" : ""}
                        onClick={() => change({ style: s })}
                      >
                        <span className={`style-sample ${s}`}>Aa</span>
                        {["Klasik", "Modern", "Minimal"][i]}
                      </button>
                    ))}
                  </div>
                </label>
                <label>
                  Vurgu rengi
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
                        aria-label={`Vurgu rengi ${c}`}
                        onClick={() => change({ accent: c })}
                      >
                        {cafe.accent === c && <Check size={16} />}
                      </button>
                    ))}
                    <input
                      type="color"
                      aria-label="Özel vurgu rengi"
                      value={cafe.accent}
                      onChange={(e) => change({ accent: e.target.value })}
                    />
                  </div>
                </label>
                <div className="form-columns extra-colors">
                  <label>
                    Arka plan
                    <input
                      type="color"
                      value={cafe.background || "#fdfcf7"}
                      onChange={(e) => change({ background: e.target.value })}
                    />
                  </label>
                  <label>
                    Metin rengi
                    <input
                      type="color"
                      value={cafe.textColor || "#303c2f"}
                      onChange={(e) => change({ textColor: e.target.value })}
                    />
                  </label>
                </div>
                <label>
                  Yazı boyutu · %{Math.round((cafe.scale || 1) * 100)}
                  <input
                    type="range"
                    min="0.9"
                    max="1.3"
                    step="0.05"
                    value={cafe.scale || 1}
                    onChange={(e) => change({ scale: Number(e.target.value) })}
                  />
                </label>
                <div className="divider" />
                <label className="toggle-label">
                  <span>
                    <strong>Menü yayında</strong>
                    <small>QR kod ile erişilebilir.</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={cafe.published}
                    onChange={(e) => change({ published: e.target.checked })}
                  />
                </label>
                <p className="inspector-hint">
                  Panelin koyu teması misafirlerinizin menü tasarımını
                  değiştirmez.
                </p>
              </>
            )}
            {selection === "header" && (
              <>
                <span className="inspector-kicker">İLK KARŞILAMA</span>
                {cafe.logoUrl && (
                  <label>
                    Logo boyutu
                    <select
                      value={cafe.logoSize || "medium"}
                      onChange={(e) =>
                        change({
                          logoSize: e.target.value as
                            "small" | "medium" | "large",
                        })
                      }
                    >
                      <option value="small">Küçük</option>
                      <option value="medium">Orta</option>
                      <option value="large">Büyük</option>
                    </select>
                  </label>
                )}
                <div className="logo-controls">
                  <label>
                    Kafe logosu
                    {cafe.logoUrl && (
                      <button
                        className="btn btn-secondary"
                        disabled={logoBusy}
                        onClick={() => void reanalyzeLogo()}
                      >
                        Logoyu yeniden analiz et
                      </button>
                    )}
                    {cafe.logoUrl && (
                      <img
                        className="logo-thumbnail"
                        src={cafe.logoUrl}
                        alt="Yüklenen kafe logosu"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={logoBusy}
                      onChange={(e) => {
                        void uploadLogo(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <p className="inspector-hint">
                    {logoBusy
                      ? "Logo hazırlanıyor…"
                      : "PNG, JPG veya WebP · En fazla 5 MB. Logonuzdan renkler otomatik seçilir; Kaydet ile yayınlanır."}
                  </p>
                  {cafe.logoUrl && (
                    <button
                      className="btn btn-secondary"
                      disabled={logoBusy}
                      onClick={() =>
                        change({
                          logoUrl: null,
                          logoPalette: null,
                          logoSurface: null,
                          defaultTheme: null,
                        })
                      }
                    >
                      Varsayılan simgeye dön
                    </button>
                  )}
                </div>
                <label>
                  Menü başlığı
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={cafe.name}
                    onChange={(e) => change({ name: e.target.value })}
                  />
                </label>
                <label>
                  Kısa açıklama
                  <textarea
                    maxLength={150}
                    rows={3}
                    value={cafe.subtitle}
                    onChange={(e) => change({ subtitle: e.target.value })}
                  />
                </label>
                <label>
                  Konum
                  <input
                    maxLength={150}
                    value={cafe.location}
                    onChange={(e) => change({ location: e.target.value })}
                  />
                </label>
                <label>
                  Başlık yazı tipi
                  <select
                    value={cafe.font || "serif"}
                    onChange={(e) =>
                      change({ font: e.target.value as Cafe["font"] })
                    }
                  >
                    <option value="serif">Klasik · Serif</option>
                    <option value="sans">Modern · Sans serif</option>
                    <option value="mono">Daktilo · Monospace</option>
                  </select>
                </label>
                <p className="inspector-hint">
                  Misafirlerinizin gördüğü başlığı ve karşılama metnini buradan
                  düzenleyin.
                </p>
              </>
            )}
            {selection === "footer" && (
              <div className="locked-block">
                <span>
                  <LockKeyhole size={28} />
                </span>
                <h3>Her menüde Fincan imzası.</h3>
                <p>
                  “fincan ile hazırlandı” imzası tüm menülerin altında görünür.
                  Kaldırılamaz veya gizlenemez.
                </p>
                <small>İmza açık ve koyu menülerde okunaklı kalır.</small>
              </div>
            )}
          </div>
        </aside>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function SettingsIcon() {
  return <Palette size={14} />;
}
