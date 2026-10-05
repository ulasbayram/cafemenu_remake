import { z } from "zod";

export const allergenLabels = {
  gluten: "Gluten",
  milk: "Süt",
  eggs: "Yumurta",
  peanuts: "Yer fıstığı",
  nuts: "Sert kabuklu yemişler",
  soy: "Soya",
  sesame: "Susam",
  fish: "Balık",
  crustaceans: "Kabuklu deniz ürünleri",
  molluscs: "Yumuşakçalar",
  celery: "Kereviz",
  mustard: "Hardal",
  lupin: "Acı bakla",
  sulphites: "Sülfitler",
} as const;

export const dietaryLabels = {
  vegan: "Vegan",
  vegetarian: "Vejetaryen",
  "gluten-free": "Glutensiz",
  "lactose-free": "Laktozsuz",
  "no-added-sugar": "Şeker ilavesiz",
} as const;

export const generalLabels = {
  spicy: "Acı",
  "mildly-spicy": "Az acı",
  "extra-spicy": "Çok acı",
  seasoned: "Baharatlı",
  hot: "Sıcak",
  cold: "Soğuk",
  iced: "Buzlu",
  caffeinated: "Kafeinli",
  decaf: "Kafeinsiz",
  homemade: "Ev yapımı",
  daily: "Günlük",
  fresh: "Taze",
  organic: "Organik",
  new: "Yeni",
  special: "Özel",
  popular: "Popüler",
  favourite: "Çok sevilen",
} as const;

export type Allergen = keyof typeof allergenLabels;
export type DietaryTag = keyof typeof dietaryLabels;
export type GeneralTag = keyof typeof generalLabels;
export type ItemLabelData = {
  allergens?: Allergen[];
  dietaryTags?: DietaryTag[];
  generalTags?: GeneralTag[];
  tags?: string[];
};

const allergenSchema = z.enum([
  "gluten",
  "milk",
  "eggs",
  "peanuts",
  "nuts",
  "soy",
  "sesame",
  "fish",
  "crustaceans",
  "molluscs",
  "celery",
  "mustard",
  "lupin",
  "sulphites",
]);
const dietarySchema = z.enum([
  "vegan",
  "vegetarian",
  "gluten-free",
  "lactose-free",
  "no-added-sugar",
]);
export const itemLabelFields = {
  generalTags: z
    .array(
      z.enum([
        "spicy",
        "mildly-spicy",
        "extra-spicy",
        "seasoned",
        "hot",
        "cold",
        "iced",
        "caffeinated",
        "decaf",
        "homemade",
        "daily",
        "fresh",
        "organic",
        "new",
        "special",
        "popular",
        "favourite",
      ]),
    )
    .max(17)
    .transform((values) => [...new Set(values)])
    .optional(),
  allergens: z
    .array(allergenSchema)
    .max(14)
    .transform((values) => [...new Set(values)])
    .optional(),
  dietaryTags: z
    .array(dietarySchema)
    .max(5)
    .transform((values) => [...new Set(values)])
    .optional(),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(24, "Etiketler en fazla 24 karakter olabilir."),
    )
    .max(8, "En fazla 8 özel etiket ekleyebilirsiniz.")
    .transform((values) => [...new Set(values)])
    .optional(),
};

export function productLabels(item: ItemLabelData) {
  const labels = [
    ...[...new Set(item.dietaryTags ?? [])]
      .filter((tag) => tag in dietaryLabels)
      .map((tag) => ({
        key: `diet:${tag}`,
        text: dietaryLabels[tag],
        kind: "dietary",
      })),
    ...[...new Set(item.allergens ?? [])]
      .filter((tag) => tag in allergenLabels)
      .map((tag) => ({
        key: `allergen:${tag}`,
        text: `${allergenLabels[tag]} içerir`,
        kind: "allergen",
      })),
    ...[...new Set(item.generalTags ?? [])]
      .filter((tag) => tag in generalLabels)
      .map((tag) => ({
        key: `general:${tag}`,
        text: generalLabels[tag],
        kind: "general",
      })),
    ...[...new Set(item.tags ?? [])].map((tag) => ({
      key: `tag:${tag}`,
      text: tag,
      kind: "custom",
    })),
  ];
  const seen = new Set<string>();
  return labels.filter((label) => {
    const normalized = label.text.trim().toLocaleLowerCase("tr");
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
