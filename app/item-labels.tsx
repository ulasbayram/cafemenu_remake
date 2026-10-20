import { productLabels, type ItemLabelData } from "@/lib/item-labels";
import {
  Flame,
  Coffee,
  ChefHat,
  Snowflake,
  Star,
  Sparkles,
  Leaf,
  WheatOff,
  MilkOff,
  CandyOff,
  Tag,
  type LucideIcon,
} from "lucide-react";

const dietaryIcons: Record<string, LucideIcon> = {
  "diet:vegan": Leaf,
  "diet:vegetarian": Leaf,
  "diet:gluten-free": WheatOff,
  "diet:lactose-free": MilkOff,
  "diet:no-added-sugar": CandyOff,
};
const generalIcons: Record<string, LucideIcon> = {
  acı: Flame,
  "az acı": Flame,
  "çok acı": Flame,
  baharatlı: Flame,
  sıcak: Flame,
  soğuk: Snowflake,
  buzlu: Snowflake,
  kafeinli: Coffee,
  kafeinsiz: Coffee,
  "ev yapımı": ChefHat,
  günlük: ChefHat,
  taze: Leaf,
  organik: Leaf,
  yeni: Sparkles,
  özel: Sparkles,
  popüler: Star,
  "çok sevilen": Star,
};

export function GeneralLabelIcon({ label }: { label: string }) {
  const Icon =
    generalIcons[label.trim().toLocaleLowerCase("tr").replace(/\s+/g, " ")] ??
    Tag;
  return (
    <Icon
      className="item-label-icon"
      size={14}
      strokeWidth={1.7}
      aria-hidden="true"
    />
  );
}

const englishLabels: Record<string, string> = {
  "allergen:gluten": "Contains gluten",
  "allergen:milk": "Contains milk",
  "allergen:eggs": "Contains eggs",
  "allergen:peanuts": "Contains peanuts",
  "allergen:nuts": "Contains nuts",
  "allergen:soy": "Contains soy",
  "allergen:sesame": "Contains sesame",
  "allergen:fish": "Contains fish",
  "allergen:crustaceans": "Contains crustaceans",
  "allergen:molluscs": "Contains molluscs",
  "allergen:celery": "Contains celery",
  "allergen:mustard": "Contains mustard",
  "allergen:lupin": "Contains lupin",
  "allergen:sulphites": "Contains sulphites",
  "diet:vegan": "Vegan",
  "diet:vegetarian": "Vegetarian",
  "diet:gluten-free": "Gluten-free",
  "diet:lactose-free": "Lactose-free",
  "diet:no-added-sugar": "No added sugar",
  "general:spicy": "Spicy",
  "general:mildly-spicy": "Mildly spicy",
  "general:extra-spicy": "Extra spicy",
  "general:seasoned": "Seasoned",
  "general:hot": "Hot",
  "general:cold": "Cold",
  "general:iced": "Iced",
  "general:caffeinated": "Caffeinated",
  "general:decaf": "Decaf",
  "general:homemade": "Homemade",
  "general:daily": "Made daily",
  "general:fresh": "Fresh",
  "general:organic": "Organic",
  "general:new": "New",
  "general:special": "Special",
  "general:popular": "Popular",
  "general:favourite": "Favourite",
};
export default function ItemLabels({
  item,
  language = "tr",
}: {
  item: ItemLabelData;
  language?: "tr" | "en";
}) {
  const labels = productLabels(item);
  if (!labels.length) return null;
  return (
    <span
      className="item-labels"
      aria-label={language === "en" ? "Product labels" : "Ürün etiketleri"}
    >
      {labels.map((label) => {
        const Icon =
          label.kind === "custom" || label.kind === "general"
            ? (generalIcons[
                label.text.trim().toLocaleLowerCase("tr").replace(/\s+/g, " ")
              ] ?? Tag)
            : dietaryIcons[label.key];
        return (
          <span key={label.key} className={`item-label ${label.kind}`}>
            {Icon && (
              <Icon
                className="item-label-icon"
                size={12}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            )}
            {language === "en"
              ? (englishLabels[label.key] ?? label.text)
              : label.text}
          </span>
        );
      })}
    </span>
  );
}
