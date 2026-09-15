"use client";

/* eslint-disable @next/next/no-img-element -- Product photos use public Supabase Storage URLs. */
import {
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/client-api";
import { menuCategories, type Cafe, type Item } from "@/lib/menu";
import { preparePhoto } from "@/lib/logo";
import { uploadImage } from "@/lib/storage";

type Props = {
  cafes: Cafe[];
  setCafes: Dispatch<SetStateAction<Cafe[]>>;
  onCreateCafe: () => void;
  onError: (message: string) => void;
  onToast: (message: string) => void;
};

const emptyItem = (category: string): Item => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  price: 0,
  category,
  available: true,
  photo: null,
});

export default function ProductsManager({
  cafes,
  setCafes,
  onCreateCafe,
  onError,
  onToast,
}: Props) {
  const [cafeId, setCafeId] = useState(cafes[0]?.id ?? "");
  const source = cafes.find((cafe) => cafe.id === cafeId) ?? cafes[0] ?? null;
  const [draft, setDraft] = useState<Cafe | null>(
    source ? structuredClone(source) : null,
  );
  const [category, setCategory] = useState("all");
  const [newCategory, setNewCategory] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const categories = draft ? menuCategories(draft) : [];
  const dirty =
    !!draft && !!source && JSON.stringify(draft) !== JSON.stringify(source);
  const visibleItems = useMemo(() => {
    if (!draft) return [];
    const normalized = query.trim().toLocaleLowerCase("tr");
    return draft.items.filter(
      (item) =>
        (category === "all" || item.category === category) &&
        (!normalized ||
          item.name.toLocaleLowerCase("tr").includes(normalized) ||
          item.description.toLocaleLowerCase("tr").includes(normalized)),
    );
  }, [category, draft, query]);

  function chooseCafe(id: string) {
    if (
      dirty &&
      !window.confirm("Kaydedilmemiş ürün değişiklikleri silinsin mi?")
    )
      return;
    const next = cafes.find((cafe) => cafe.id === id);
    setCafeId(id);
    setDraft(next ? structuredClone(next) : null);
    setCategory("all");
    setEditing(null);
  }

  function updateItem(item: Item) {
    setDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.some((entry) => entry.id === item.id)
              ? current.items.map((entry) =>
                  entry.id === item.id ? item : entry,
                )
              : [...current.items, item],
          }
        : current,
    );
    setEditing(null);
  }

  function addCategory(event: FormEvent) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!draft || !name) return;
    if (categories.includes(name)) {
      onError("Bu isimde bir kategori zaten var.");
      return;
    }
    setDraft({ ...draft, categories: [...categories, name] });
    setNewCategory("");
    setCategory(name);
  }

  function renameCategory(oldName: string) {
    const name = renameValue.trim();
    if (!draft || !name || name === oldName) {
      setRenaming(null);
      return;
    }
    if (categories.includes(name)) {
      onError("Bu isimde bir kategori zaten var.");
      return;
    }
    setDraft({
      ...draft,
      categories: categories.map((entry) => (entry === oldName ? name : entry)),
      items: draft.items.map((item) =>
        item.category === oldName ? { ...item, category: name } : item,
      ),
    });
    if (category === oldName) setCategory(name);
    setRenaming(null);
  }

  function removeCategory(name: string) {
    if (!draft) return;
    const count = draft.items.filter((item) => item.category === name).length;
    const message = count
      ? `${name} kategorisi ve içindeki ${count} ürün silinsin mi?`
      : `${name} kategorisi silinsin mi?`;
    if (!window.confirm(message)) return;
    setDraft({
      ...draft,
      categories: categories.filter((entry) => entry !== name),
      items: draft.items.filter((item) => item.category !== name),
    });
    if (category === name) setCategory("all");
  }

  function moveItem(id: string, direction: -1 | 1) {
    if (!draft) return;
    const list = [...draft.items];
    const index = list.findIndex((item) => item.id === id);
    const current = list[index];
    if (!current) return;
    const sameCategory = list
      .map((item, itemIndex) => ({ item, itemIndex }))
      .filter(({ item }) => item.category === current.category);
    const position = sameCategory.findIndex(({ item }) => item.id === id);
    const target = sameCategory[position + direction];
    if (!target) return;
    [list[index], list[target.itemIndex]] = [
      list[target.itemIndex],
      list[index],
    ];
    setDraft({ ...draft, items: list });
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    onError("");
    try {
      const updated = await api<Cafe>(`/api/cafes/${draft.id}`, draft, "PUT");
      setCafes((current) =>
        current.map((cafe) => (cafe.id === updated.id ? updated : cafe)),
      );
      setDraft(structuredClone(updated));
      onToast("Ürün ve kategori değişiklikleri kaydedildi.");
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!draft)
    return (
      <section className="panel product-empty-state">
        <Package size={34} />
        <h2>Ürün eklemek için önce bir kafe oluşturun.</h2>
        <p>Kategoriler ve ürünler oluşturduğunuz kafeye bağlanır.</p>
        <button className="btn primary" onClick={onCreateCafe}>
          <Plus size={17} /> Kafe oluştur
        </button>
      </section>
    );

  return (
    <section className="products-workspace">
      <div className="products-toolbar">
        <label>
          Çalışılan kafe
          <select
            value={draft.id}
            onChange={(event) => chooseCafe(event.target.value)}
          >
            {cafes.map((cafe) => (
              <option key={cafe.id} value={cafe.id}>
                {cafe.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className={`product-save-status ${dirty ? "dirty" : ""}`}>
            {dirty
              ? "Kaydedilmemiş değişiklikler"
              : "Tüm değişiklikler kayıtlı"}
          </span>
          <button
            className="btn primary"
            disabled={!dirty || busy}
            onClick={save}
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Save size={17} />
            )}
            {busy ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
          </button>
        </div>
      </div>

      <div className="products-layout">
        <aside className="category-manager panel">
          <header>
            <div>
              <span>KATEGORİLER</span>
              <h2>Menü düzeni</h2>
            </div>
            <b>{categories.length}</b>
          </header>
          <button
            className={category === "all" ? "active" : ""}
            onClick={() => setCategory("all")}
          >
            <span>Tüm ürünler</span>
            <small>{draft.items.length}</small>
          </button>
          {categories.map((name) => (
            <div
              className={`category-manager-row ${category === name ? "active" : ""}`}
              key={name}
            >
              {renaming === name ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    renameCategory(name);
                  }}
                >
                  <input
                    autoFocus
                    maxLength={60}
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                  />
                  <button aria-label="Kategori adını kaydet">
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Vazgeç"
                    onClick={() => setRenaming(null)}
                  >
                    <X size={15} />
                  </button>
                </form>
              ) : (
                <>
                  <button onClick={() => setCategory(name)}>
                    <span>{name}</span>
                    <small>
                      {
                        draft.items.filter((item) => item.category === name)
                          .length
                      }
                    </small>
                  </button>
                  <button
                    aria-label={`${name} kategorisini yeniden adlandır`}
                    onClick={() => {
                      setRenaming(name);
                      setRenameValue(name);
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    aria-label={`${name} kategorisini sil`}
                    onClick={() => removeCategory(name)}
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          ))}
          <form className="category-add-form" onSubmit={addCategory}>
            <input
              maxLength={60}
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="Yeni kategori"
            />
            <button className="btn" disabled={!newCategory.trim()}>
              <Plus size={15} /> Ekle
            </button>
          </form>
        </aside>

        <div className="product-list-panel panel">
          <header>
            <div>
              <span className="eyebrow">ÜRÜNLER</span>
              <h2>{category === "all" ? "Tüm ürünler" : category}</h2>
            </div>
            <div className="product-list-actions">
              <label className="search-input">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ürün ara…"
                />
              </label>
              <button
                className="btn primary"
                onClick={() =>
                  setEditing(
                    emptyItem(
                      category === "all" ? categories[0] || "Genel" : category,
                    ),
                  )
                }
              >
                <CirclePlus size={17} /> Ürün ekle
              </button>
            </div>
          </header>
          {visibleItems.length === 0 ? (
            <div className="product-list-empty">
              <Package size={28} />
              <strong>Bu bölümde ürün yok.</strong>
              <span>İlk ürünü ekleyerek başlayın.</span>
            </div>
          ) : (
            <div className="product-rows">
              {visibleItems.map((item) => {
                const categoryItems = draft.items.filter(
                  (entry) => entry.category === item.category,
                );
                const position = categoryItems.findIndex(
                  (entry) => entry.id === item.id,
                );
                return (
                  <article
                    key={item.id}
                    className={!item.available ? "unavailable" : ""}
                  >
                    <span className="product-row-photo">
                      {item.photo ? (
                        <img src={item.photo} alt="" />
                      ) : (
                        <Camera size={18} />
                      )}
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.description || "Açıklama eklenmemiş"}</small>
                      <em>{item.category}</em>
                    </div>
                    <b>
                      {item.price.toLocaleString("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                      })}
                    </b>
                    <span
                      className={`product-availability ${item.available ? "active" : ""}`}
                    >
                      {item.available ? "Görünür" : "Gizli"}
                    </span>
                    <div className="product-row-actions">
                      <button
                        disabled={position === 0}
                        aria-label="Yukarı taşı"
                        onClick={() => moveItem(item.id, -1)}
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        disabled={position === categoryItems.length - 1}
                        aria-label="Aşağı taşı"
                        onClick={() => moveItem(item.id, 1)}
                      >
                        <ChevronDown size={15} />
                      </button>
                      <button
                        aria-label={`${item.name} ürününü düzenle`}
                        onClick={() => setEditing(structuredClone(item))}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        aria-label={`${item.name} ürününü sil`}
                        onClick={() => {
                          if (window.confirm(`${item.name} ürünü silinsin mi?`))
                            setDraft({
                              ...draft,
                              items: draft.items.filter(
                                (entry) => entry.id !== item.id,
                              ),
                            });
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div
          className="product-editor-overlay"
          onMouseDown={() => !photoBusy && setEditing(null)}
        >
          <form
            className="product-editor"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              updateItem(editing);
            }}
          >
            <header>
              <div>
                <span className="eyebrow">ÜRÜN BİLGİLERİ</span>
                <h2>
                  {draft.items.some((item) => item.id === editing.id)
                    ? "Ürünü düzenle"
                    : "Yeni ürün"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setEditing(null)}
              >
                <X size={19} />
              </button>
            </header>
            <label>
              Ürün fotoğrafı
              <div className="product-photo-editor">
                <span>
                  {editing.photo ? (
                    <img src={editing.photo} alt="" />
                  ) : (
                    <Camera size={22} />
                  )}
                </span>
                <div>
                  <label className="btn">
                    {photoBusy
                      ? "Yükleniyor…"
                      : editing.photo
                        ? "Değiştir"
                        : "Fotoğraf yükle"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={photoBusy}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        setPhotoBusy(true);
                        try {
                          const blob = await preparePhoto(file);
                          const photo = await uploadImage(blob, "photos");
                          setEditing((current) =>
                            current ? { ...current, photo } : current,
                          );
                        } catch (error) {
                          onError((error as Error).message);
                        } finally {
                          setPhotoBusy(false);
                        }
                      }}
                    />
                  </label>
                  {editing.photo && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setEditing({ ...editing, photo: null })}
                    >
                      Kaldır
                    </button>
                  )}
                </div>
              </div>
            </label>
            <label>
              Ürün adı
              <input
                autoFocus
                required
                maxLength={100}
                value={editing.name}
                onChange={(event) =>
                  setEditing({ ...editing, name: event.target.value })
                }
              />
            </label>
            <label>
              Açıklama
              <textarea
                rows={3}
                maxLength={300}
                value={editing.description}
                onChange={(event) =>
                  setEditing({ ...editing, description: event.target.value })
                }
              />
            </label>
            <div className="form-columns">
              <label>
                Fiyat (₺)
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  required
                  value={editing.price}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      price: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                Kategori
                <select
                  value={editing.category}
                  onChange={(event) =>
                    setEditing({ ...editing, category: event.target.value })
                  }
                >
                  {(categories.length ? categories : [editing.category]).map(
                    (name) => (
                      <option key={name}>{name}</option>
                    ),
                  )}
                </select>
              </label>
            </div>
            <label className="toggle-label">
              <span>
                <strong>Menüde göster</strong>
                <small>Kapalı ürünler müşterilere görünmez.</small>
              </span>
              <input
                type="checkbox"
                checked={editing.available}
                onChange={(event) =>
                  setEditing({ ...editing, available: event.target.checked })
                }
              />
            </label>
            <footer>
              <button
                type="button"
                className="btn"
                onClick={() => setEditing(null)}
              >
                Vazgeç
              </button>
              <button className="btn primary" disabled={photoBusy}>
                <Check size={16} /> Ürünü uygula
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
