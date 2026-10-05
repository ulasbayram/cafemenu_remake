"use client";

import {
  allergenLabels,
  dietaryLabels,
  generalLabels,
} from "@/lib/item-labels";
import type { Item } from "@/lib/menu";
import ItemLabels, { GeneralLabelIcon } from "./item-labels";

export default function ItemLabelEditor({
  item,
  onChange,
}: {
  item: Item;
  onChange: (item: Item) => void;
}) {
  return (
    <section className="item-label-editor" aria-label="Ürün etiketleri">
      <header>
        <h3>Ürün etiketleri</h3>
        <p>
          Etiketleri ürünün içeriğine göre seçin. Birden fazla seçim
          yapabilirsiniz.
        </p>
      </header>
      <fieldset>
        <legend>Alerjenler</legend>
        <p>Ürünün içerdiği alerjenleri belirtin.</p>
        <div className="item-label-options">
          {(Object.keys(allergenLabels) as (keyof typeof allergenLabels)[]).map(
            (value) => (
              <label
                key={value}
                className={`item-label-option allergen ${(item.allergens ?? []).includes(value) ? "selected" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={(item.allergens ?? []).includes(value)}
                  onChange={(event) =>
                    onChange({
                      ...item,
                      allergens: event.target.checked
                        ? [...(item.allergens ?? []), value]
                        : (item.allergens ?? []).filter((tag) => tag !== value),
                    })
                  }
                />
                <span>{allergenLabels[value]}</span>
              </label>
            ),
          )}
        </div>
      </fieldset>
      <fieldset>
        <legend>Beslenme tercihleri</legend>
        <div className="item-label-options">
          {(Object.keys(dietaryLabels) as (keyof typeof dietaryLabels)[]).map(
            (value) => (
              <label
                key={value}
                className={`item-label-option dietary ${(item.dietaryTags ?? []).includes(value) ? "selected" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={(item.dietaryTags ?? []).includes(value)}
                  onChange={(event) =>
                    onChange({
                      ...item,
                      dietaryTags: event.target.checked
                        ? [...(item.dietaryTags ?? []), value]
                        : (item.dietaryTags ?? []).filter(
                            (tag) => tag !== value,
                          ),
                    })
                  }
                />
                <span>{dietaryLabels[value]}</span>
              </label>
            ),
          )}
        </div>
      </fieldset>
      <fieldset>
        <legend>Genel etiketler</legend>
        <p>Ürünün özelliklerini hazır ikonlu etiketlerle belirtin.</p>
        <div className="item-label-options">
          {(Object.keys(generalLabels) as (keyof typeof generalLabels)[]).map(
            (value) => (
              <label
                key={value}
                className={`item-label-option general ${(item.generalTags ?? []).includes(value) ? "selected" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={(item.generalTags ?? []).includes(value)}
                  onChange={(event) =>
                    onChange({
                      ...item,
                      generalTags: event.target.checked
                        ? [...(item.generalTags ?? []), value]
                        : (item.generalTags ?? []).filter(
                            (tag) => tag !== value,
                          ),
                    })
                  }
                />
                <GeneralLabelIcon label={generalLabels[value]} />
                <span>{generalLabels[value]}</span>
              </label>
            ),
          )}
        </div>
      </fieldset>
      <label className="item-custom-tags">
        Diğer etiketler
        <input
          key={item.id}
          type="text"
          maxLength={220}
          defaultValue={(item.tags ?? []).join(", ")}
          placeholder="Ev yapımı, Acı, Kafeinli"
          onChange={(event) => {
            const tags = [
              ...new Set(
                event.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              ),
            ];
            event.currentTarget.setCustomValidity(
              tags.length > 8
                ? "En fazla 8 özel etiket ekleyebilirsiniz."
                : tags.some((tag) => tag.length > 24)
                  ? "Etiketler en fazla 24 karakter olabilir."
                  : "",
            );
            onChange({ ...item, tags });
          }}
        />
        <small>
          Virgülle ayırın. En fazla 8 etiket; her biri en fazla 24 karakter.
        </small>
      </label>
      <div className="item-label-preview">
        <span>Menüdeki görünüm</span>
        {productHasLabels(item) ? (
          <ItemLabels item={item} />
        ) : (
          <p>Seçtiğiniz etiketler burada görünecek.</p>
        )}
      </div>
    </section>
  );
}

function productHasLabels(item: Item) {
  return !!(
    item.allergens?.length ||
    item.dietaryTags?.length ||
    item.generalTags?.length ||
    item.tags?.length
  );
}
