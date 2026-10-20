import type { Cafe, Item } from "./menu";
export type MenuLanguage = "tr" | "en";
export const itemName = (item: Item, lang: MenuLanguage) =>
  lang === "en" && item.nameEn?.trim() ? item.nameEn : item.name;
export const itemDescription = (item: Item, lang: MenuLanguage) =>
  lang === "en" && item.descriptionEn?.trim()
    ? item.descriptionEn
    : item.description;
export function categoryName(cafe: Cafe, category: string, lang: MenuLanguage) {
  return lang === "en"
    ? cafe.items.find((i) => i.category === category && i.categoryEn?.trim())
        ?.categoryEn || category
    : category;
}
