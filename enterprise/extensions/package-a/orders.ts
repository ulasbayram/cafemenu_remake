import { z } from "zod";
import type { Item } from "@/lib/menu";
import type { OrderLine } from "@/lib/orders";

export const manualOrderSchema = z.object({
  cafe: z.string().uuid(),
  table: z.number().int().min(1).max(200),
  status: z.enum(["waiting", "delivered"]).default("waiting"),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        quantity: z.number().int().min(1).max(99),
        unitPrice: z.number().finite().min(0).max(1000000).optional(),
      }),
    )
    .min(1)
    .max(50)
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
      "Aynı ürün birden fazla satırda olamaz.",
    ),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
});

/** Only catalog products or existing order snapshots can be selected.
 * Existing lines keep their original prices when the catalog price changes. */
export function manualOrderLines(
  input: z.infer<typeof manualOrderSchema>,
  products: Item[],
  existing: OrderLine[] = [],
) {
  return input.items.map((line) => {
    const previous = existing.find((item) => item.id === line.id);
    const product = products.find((item) => item.id === line.id);
    if (!previous && !product) throw new Error("UNKNOWN_PRODUCT");
    const unitPrice =
      Math.round(
        (line.unitPrice ?? previous?.unitPrice ?? product!.price) * 100,
      ) / 100;
    return {
      id: line.id,
      name: previous?.name ?? product!.name,
      quantity: line.quantity,
      unitPrice,
    };
  });
}
