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

export default function ItemLabels({ item }: { item: ItemLabelData }) {
  const labels = productLabels(item);
  if (!labels.length) return null;
  return (
    <span className="item-labels" aria-label="Ürün etiketleri">
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
            {label.text}
          </span>
        );
      })}
    </span>
  );
}
