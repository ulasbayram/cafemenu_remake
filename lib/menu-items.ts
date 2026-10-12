import type { SupabaseClient } from "supabase-js";
import type { Item } from "@/lib/menu";
import { missingAccessTable } from "@/lib/grant-status";

export type MenuItemRow = {
  cafe: string;
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  photo: string | null;
  position: number;
};

/** Pure mapping: items array → typed rows (position = array index). */
export function menuItemRows(cafeId: string, items: Item[]): MenuItemRow[] {
  return items.map((item, index) => ({
    cafe: cafeId,
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    price: item.price,
    category: item.category,
    available: item.available,
    photo: item.photo ?? null,
    position: index,
  }));
}

/** Pure diff: ids present in the table but absent from the incoming array. */
export function staleMenuItemIds(
  existing: string[],
  incoming: string[],
): string[] {
  const keep = new Set(incoming);
  return existing.filter((id) => !keep.has(id));
}

/** Make menu_items match `items` for one cafe: delete stale rows, upsert all. */
export async function syncMenuItems(
  client: SupabaseClient,
  cafeId: string,
  items: Item[],
): Promise<void> {
  const rows = menuItemRows(cafeId, items);
  const { data: existing, error: readError } = await client
    .from("menu_items")
    .select("id")
    .eq("cafe", cafeId);
  // Blob is the read source and is already written; treat a not-yet-migrated
  // menu_items table as "nothing to reconcile" until 0008 is applied.
  if (missingAccessTable(readError)) return;
  if (readError) throw readError;
  const stale = staleMenuItemIds(
    (existing ?? []).map((r) => String(r.id)),
    rows.map((r) => r.id),
  );
  if (stale.length) {
    const { error } = await client
      .from("menu_items")
      .delete()
      .eq("cafe", cafeId)
      .in("id", stale);
    if (error) throw error;
  }
  if (rows.length) {
    const { error } = await client
      .from("menu_items")
      .upsert(rows, { onConflict: "cafe,id" });
    if (error) throw error;
  }
}
