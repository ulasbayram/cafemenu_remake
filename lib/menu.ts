import { z } from "zod";
import { socialLinksSchema } from "./social-links";

/** Per-cafe ordering policy. token = signed QR links only (default);
 * token+daily = QR plus a daily code shown in the dashboard; open = any
 * menu visitor may order for a valid table number. */
export const orderPolicySchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(["token", "token+daily", "open"]).optional(),
});
export type OrderPolicy = {
  enabled?: boolean;
  mode?: "token" | "token+daily" | "open";
};
/** Defaults applied at read time — schema fields stay optional. */
export function resolveOrderPolicy(
  policy?: Partial<OrderPolicy> | null,
): Required<OrderPolicy> {
  return {
    enabled: policy?.enabled ?? true,
    mode: policy?.mode ?? "token",
  };
}

export const itemSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(300),
  price: z.number().finite().min(0).max(1000000),
  category: z.string().trim().min(1).max(60),
  available: z.boolean(),
  photo: z.string().url().max(500).nullable().optional(),
});
export const cafeSchema = z.object({
  tableCount: z.number().int().min(0).max(200).optional(),
  orderPolicy: orderPolicySchema.optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  socialLinks: socialLinksSchema.optional(),
  defaultTheme: z.enum(["light", "dark"]).nullable().optional(),
  logoSize: z.enum(["small", "medium", "large"]).optional(),
  logoSurface: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  name: z.string().trim().min(2).max(80),
  // Slugs live under /menu/{slug} — no route collisions to dodge, so only
  // shape is enforced: lowercase alphanumerics/hyphens, letter-or-digit start.
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,59}$/),
  subtitle: z.string().max(150),
  location: z.string().max(150),
  logoUrl: z.string().url().max(500).nullable().optional(),
  logoPalette: z
    .object({
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    })
    .nullable()
    .optional(),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  style: z.enum(["classic", "modern", "minimal"]),
  background: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  textColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  font: z.enum(["serif", "sans", "mono"]).optional(),
  scale: z.number().min(0.9).max(1.3).optional(),
  published: z.boolean(),
  items: z.array(itemSchema).max(1000),
  categories: z.array(z.string().trim().min(1).max(60)).max(1000).optional(),
});
export type CafeData = z.infer<typeof cafeSchema>;
export function menuCategories(
  cafe: Pick<CafeData, "items" | "categories">,
): string[] {
  return [
    ...new Set([
      ...(cafe.categories || []),
      ...cafe.items.map((i) => i.category),
    ]),
  ];
}
export type Cafe = CafeData & {
  id: string;
  createdAt: string;
  tableCount: number;
};
export type Item = z.infer<typeof itemSchema>;
export const sampleItems: Item[] = [
  {
    id: "espresso",
    name: "Espresso",
    description: "Yoğun gövdeli, taze çekilmiş kahve.",
    price: 95,
    category: "Kahveler",
    available: true,
  },
  {
    id: "latte",
    name: "Caffè Latte",
    description: "Espresso ve ipeksi süt köpüğü.",
    price: 145,
    category: "Kahveler",
    available: true,
  },
  {
    id: "americano",
    name: "Americano",
    description: "Dengeli ve yumuşak bir klasik.",
    price: 110,
    category: "Kahveler",
    available: true,
  },
  {
    id: "matcha",
    name: "Iced Matcha Latte",
    description: "Matcha, soğuk süt ve buz.",
    price: 175,
    category: "Soğuk İçecekler",
    available: true,
  },
  {
    id: "lemonade",
    name: "Ev Yapımı Limonata",
    description: "Taze limon, nane ve bol ferahlık.",
    price: 120,
    category: "Soğuk İçecekler",
    available: true,
  },
  {
    id: "san-sebastian",
    name: "San Sebastian",
    description: "Karamelize kabuk, yumuşacık bir kalp.",
    price: 220,
    category: "Tatlılar",
    available: true,
  },
];
export const exampleCafe: Cafe = {
  id: "example",
  createdAt: "",
  name: "Mola Coffee",
  slug: "mola-coffee",
  subtitle: "İyi kahve. Güzel bir mola.",
  location: "Kadıköy, İstanbul",
  accent: "#245b46",
  style: "classic",
  published: false,
  tableCount: 0,
  items: sampleItems,
};
export function slugify(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** Normalizes a typed name/slug into a valid slug under /menu/{slug}.
 * Only length guards remain — digit-first slugs are fine now that cafe pages
 * live in their own namespace. */
export function cafeSlug(input: string, cafeName = ""): string {
  let value = slugify(input) || slugify(cafeName);
  if (!value) value = "kafe";
  if (value.length < 3) value = `${value}-kafe`;
  return value.slice(0, 60).replace(/-+$/, "");
}
