import type { Item } from "./menu";
export function parseMenu(text: string): Item[] {
  let category = "Menü";
  const items: Item[] = [];
  for (const line of text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    const match = line.match(
      /^(.+?)\s+(?:₺\s*)?((?:\d{1,3}(?:\.\d{3})+|\d{1,6})(?:[.,]\d{1,2})?)\s*(?:₺|TL|TRY)?\s*$/i,
    );
    if (match) {
      const rawPrice = match[2];
      const normalized = rawPrice.includes(",")
        ? rawPrice.replace(/\./g, "").replace(",", ".")
        : /^\d{1,3}(?:\.\d{3})+$/.test(rawPrice)
          ? rawPrice.replace(/\./g, "")
          : rawPrice;
      const price = Number(normalized);
      const name = match[1].replace(/[.·…\s]+$/, "").trim();
      if (name && price >= 0)
        items.push({
          id: crypto.randomUUID(),
          name,
          price,
          description: "",
          category,
          available: true,
        });
    } else if (line.length < 60 && !/\d/.test(line)) category = line;
  }
  return items;
}
