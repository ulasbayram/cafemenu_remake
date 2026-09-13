"use client";
/* eslint-disable @next/next/no-img-element -- The uploaded logo is already optimized locally; no image service is needed. */
import { useEffect, useState, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Plus,
  Palette,
  Type,
  Layers,
  ChevronRight,
  LockKeyhole,
  MoveUp,
  MoveDown,
  Trash2,
  Smartphone,
  Monitor,
  MousePointer2,
  Check,
  Eye,
  Undo2,
  Redo2,
  GripVertical,
  X,
  LoaderCircle,
} from "lucide-react";
import type { Cafe, Item } from "@/lib/menu";
import MenuView, { type MenuBlock } from "../menu-view";
import ThemeToggle from "../theme-toggle";
import { prepareLogo } from "@/lib/logo";
import { useMenuTheme } from "../use-menu-theme";
import { useHistory } from "./use-history";
import { reorderItems } from "@/lib/editor-state";
export default function MenuEditor({ initialCafe }: { initialCafe: Cafe }) {
  const router = useRouter();
  const {
    value: cafe,
    update: setCafe,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory(initialCafe);
  const [dragged, setDragged] = useState<{
    kind: "category" | "item";
    id: string;
  } | null>(null);
  const [saved, setSaved] = useState(initialCafe),
    [requestedSelection, setSelection] = useState<MenuBlock>("theme"),
    [busy, setBusy] = useState(false),
    [logoBusy, setLogoBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [wide, setWide] = useState(false),
    [inspector, setInspector] = useState(true),
    [categoryName, setCategoryName] = useState(""),
    [deleteId, setDeleteId] = useState<string | null>(null);
  const dirty = JSON.stringify(cafe) !== JSON.stringify(saved);
  const { theme: customerTheme } = useMenuTheme(cafe.defaultTheme);
  const [previewTheme, setPreviewTheme] = useState("auto");
  const categories = [...new Set(cafe.items.map((i) => i.category))];
  const selection: MenuBlock =
    (requestedSelection.startsWith("item:") &&
      !cafe.items.some((i) => i.id === requestedSelection.slice(5))) ||
    (requestedSelection.startsWith("category:") &&
      !cafe.items.some((i) => i.category === requestedSelection.slice(9)))
      ? "theme"
      : requestedSelection;
  const item = selection.startsWith("item:")
    ? cafe.items.find((i) => i.id === selection.slice(5))
    : undefined;
  const category = selection.startsWith("category:") ? selection.slice(9) : "";
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
    setSelection(block);
    setInspector(true);
    if (block.startsWith("category:")) setCategoryName(block.slice(9));
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
      const { logo, palette, defaultTheme, logoSurface } =
        await prepareLogo(file);
      change({
        logo,
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
    if (!cafe.logo) return;
    setLogoBusy(true);
    try {
      const blob = await (await fetch(cafe.logo)).blob();
      await uploadLogo(new File([blob], "kafe-logosu", { type: blob.type }));
    } catch {
      setError("Logo analiz edilemedi. Görseli yeniden yükleyebilirsiniz.");
    } finally {
      setLogoBusy(false);
    }
  }
  function changeItem(p: Partial<Item>) {
    if (item)
      change({
        items: cafe.items.map((i) => (i.id === item.id ? { ...i, ...p } : i)),
      });
  }
  function addItem() {
    const next = {
      id: crypto.randomUUID(),
      name: "Yeni ürün",
      description: "",
      price: 0,
      category: category || item?.category || categories[0] || "Kahveler",
      available: true,
    };
    change({ items: [...cafe.items, next] });
    select(`item:${next.id}`);
  }
  function moveItem(direction: number) {
    if (!item) return;
    const list = [...cafe.items],
      inCategory = list.filter((i) => i.category === item.category),
      index = inCategory.findIndex((i) => i.id === item.id),
      other = inCategory[index + direction];
    if (!other) return;
    const a = list.findIndex((i) => i.id === item.id),
      b = list.findIndex((i) => i.id === other.id);
    [list[a], list[b]] = [list[b], list[a]];
    change({ items: list });
  }
  function moveCategory(direction: number) {
    const index = categories.indexOf(category),
      other = categories[index + direction];
    if (!other) return;
    const order = [...categories];
    [order[index], order[index + direction]] = [
      order[index + direction],
      order[index],
    ];
    change({
      items: order.flatMap((cat) =>
        cafe.items.filter((i) => i.category === cat),
      ),
    });
  }
  function renameCategory() {
    const name = categoryName.trim();
    if (!name) {
      setError("Kategori adı boş olamaz.");
      return;
    }
    if (name !== category && categories.includes(name)) {
      setError("Bu isimde bir kategori zaten var.");
      return;
    }
    change({
      items: cafe.items.map((i) =>
        i.category === category ? { ...i, category: name } : i,
      ),
    });
    select(`category:${name}`);
  }
  async function save() {
    const submitted = cafe;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/cafes/${cafe.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cafe),
      });
      const data = (await r.json()) as Cafe & { error?: string };
      if (!r.ok) throw new Error(data.error);
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
    router.push("/?view=menus");
  }
  return (
    <div className="menu-studio">
      <header className="studio-header">
        <div className="studio-heading">
          <button
            className="icon-btn"
            aria-label="Menü yönetimine dön"
            onClick={back}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <strong>{cafe.name}</strong>
            <span>
              Menü tasarım stüdyosu <ChevronRight size={11} /> /{cafe.slug}
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
      <div className="studio-layout">
        <aside className="studio-layers" data-dragging={dragged?.kind}>
          <div className="studio-panel-title">
            <Layers size={17} />
            <h2>Menü blokları</h2>
          </div>
          <p>
            Bir blok seçerek düzenleyin. Tutamaçtan sürükleyip hedefin önüne
            bırakın.
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
          <span className="layer-caption">KATEGORİLER VE ÜRÜNLER</span>
          {categories.map((cat) => (
            <div className="layer-category" key={cat}>
              <button
                className={`layer-row category ${selection === `category:${cat}` ? "selected" : ""}`}
                onClick={() => select(`category:${cat}`)}
                onDragOver={(e) => {
                  if (dragged?.kind === "category") e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragged?.kind === "category")
                    change({
                      items: reorderItems(
                        cafe.items,
                        dragged.id,
                        cat,
                        "category",
                      ),
                    });
                  setDragged(null);
                }}
              >
                <span
                  className="drag-handle"
                  draggable
                  title="Kategoriyi sürükleyerek sırala"
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", cat);
                    e.dataTransfer.effectAllowed = "move";
                    setDragged({ kind: "category", id: cat });
                  }}
                  onDragEnd={() => setDragged(null)}
                >
                  <GripVertical size={15} />
                </span>
                <span>{cat}</span>
                <small>
                  {cafe.items.filter((i) => i.category === cat).length}
                </small>
              </button>
              {cafe.items
                .filter((i) => i.category === cat)
                .map((i) => (
                  <button
                    className={`layer-row layer-product ${selection === `item:${i.id}` ? "selected" : ""}`}
                    key={i.id}
                    onClick={() => select(`item:${i.id}`)}
                    onDragOver={(e) => {
                      if (dragged?.kind === "item") e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragged?.kind === "item")
                        change({
                          items: reorderItems(
                            cafe.items,
                            dragged.id,
                            i.id,
                            "item",
                          ),
                        });
                      setDragged(null);
                    }}
                  >
                    <span
                      className="drag-handle"
                      draggable
                      title="Ürünü sürükleyerek sırala"
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", i.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragged({ kind: "item", id: i.id });
                      }}
                      onDragEnd={() => setDragged(null)}
                    >
                      <GripVertical size={13} />
                    </span>
                    <span>{i.name || "Yeni ürün"}</span>
                    {!i.available && <Eye size={11} />}
                  </button>
                ))}
            </div>
          ))}
          <button className="layer-add" onClick={addItem}>
            <Plus size={16} /> Ürün ekle
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
              {item
                ? "Ürün ayarları"
                : category
                  ? "Kategori ayarları"
                  : selection === "header"
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
                {cafe.logo && (
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
                    {cafe.logo && (
                      <button
                        className="btn btn-secondary"
                        disabled={logoBusy}
                        onClick={() => void reanalyzeLogo()}
                      >
                        Logoyu yeniden analiz et
                      </button>
                    )}
                    {cafe.logo && (
                      <img
                        className="logo-thumbnail"
                        src={cafe.logo}
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
                  {cafe.logo && (
                    <button
                      className="btn btn-secondary"
                      disabled={logoBusy}
                      onClick={() =>
                        change({
                          logo: null,
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
            {category && (
              <>
                <span className="inspector-kicker">KATEGORİ</span>
                <label>
                  Kategori adı
                  <input
                    maxLength={60}
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        renameCategory();
                      }
                    }}
                  />
                </label>
                <button
                  className="btn full"
                  onClick={renameCategory}
                  disabled={categoryName === category}
                >
                  Adı uygula <Check size={15} />
                </button>
                <div className="divider" />
                <h3>Kategori sırası</h3>
                <div className="inspector-row">
                  <button
                    className="btn"
                    disabled={categories.indexOf(category) === 0}
                    onClick={() => moveCategory(-1)}
                  >
                    <MoveUp size={15} /> Yukarı
                  </button>
                  <button
                    className="btn"
                    disabled={
                      categories.indexOf(category) === categories.length - 1
                    }
                    onClick={() => moveCategory(1)}
                  >
                    <MoveDown size={15} /> Aşağı
                  </button>
                </div>
                <button className="btn primary full" onClick={addItem}>
                  <Plus size={16} /> Kategoriye ürün ekle
                </button>
                <p className="inspector-hint">
                  Bu kategoride{" "}
                  {cafe.items.filter((i) => i.category === category).length}{" "}
                  ürün var. Adı değiştirdiğinizde hepsi güncellenir.
                </p>
              </>
            )}
            {item && (
              <>
                <span className="inspector-kicker">ÜRÜN İÇERİĞİ</span>
                <label>
                  Ürün adı
                  <input
                    maxLength={100}
                    value={item.name}
                    onChange={(e) => changeItem({ name: e.target.value })}
                  />
                </label>
                <label>
                  Açıklama
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={item.description}
                    onChange={(e) =>
                      changeItem({ description: e.target.value })
                    }
                  />
                </label>
                <label>
                  Fiyat (₺)
                  <input
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    value={item.price}
                    onChange={(e) =>
                      changeItem({ price: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Kategori
                  <input
                    list="studio-categories"
                    maxLength={60}
                    value={item.category}
                    onChange={(e) => changeItem({ category: e.target.value })}
                  />
                  <datalist id="studio-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </label>
                <label className="toggle-label">
                  <span>
                    <strong>Menüde göster</strong>
                    <small>Gizli ürünler misafirlere görünmez.</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={item.available}
                    onChange={(e) =>
                      changeItem({ available: e.target.checked })
                    }
                  />
                </label>
                <div className="divider" />
                <h3>Kategori içindeki sıra</h3>
                <div className="inspector-row">
                  <button
                    className="btn"
                    disabled={
                      cafe.items.filter((i) => i.category === item.category)[0]
                        ?.id === item.id
                    }
                    onClick={() => moveItem(-1)}
                  >
                    <MoveUp size={15} /> Yukarı
                  </button>
                  <button
                    className="btn"
                    disabled={
                      cafe.items
                        .filter((i) => i.category === item.category)
                        .at(-1)?.id === item.id
                    }
                    onClick={() => moveItem(1)}
                  >
                    <MoveDown size={15} /> Aşağı
                  </button>
                </div>
                <button
                  className="btn danger-outline full"
                  onClick={() => setDeleteId(item.id)}
                >
                  <Trash2 size={16} /> Ürünü sil
                </button>
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
      {deleteId && (
        <div className="confirm-overlay">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="confirm-card"
          >
            <h2 id="delete-title">Ürün silinsin mi?</h2>
            <p>
              {cafe.items.find((i) => i.id === deleteId)?.name} menüden
              kaldırılacak. Değişiklik kaydettiğinizde uygulanır.
            </p>
            <div className="heading-actions">
              <button
                className="btn"
                autoFocus
                onClick={() => setDeleteId(null)}
              >
                Vazgeç
              </button>
              <button
                className="btn destructive"
                onClick={() => {
                  change({
                    items: cafe.items.filter((i) => i.id !== deleteId),
                  });
                  setDeleteId(null);
                  select("theme");
                }}
              >
                Ürünü sil
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function SettingsIcon() {
  return <Palette size={14} />;
}
