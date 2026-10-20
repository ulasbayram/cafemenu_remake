import { z } from "zod";
import { priceOrder, type OrderLine } from "@/lib/orders";
export const settlementSchema = z.object({
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  paymentMethod: z.enum(["cash", "card"]).optional(),
  receiptDiscount: z.number().finite().min(0).max(100000000).default(0),
  adjustments: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        complimentaryQuantity: z.number().int().min(0).max(99),
        discountAmount: z.number().finite().min(0).max(100000000),
      }),
    )
    .max(50)
    .refine((a) => new Set(a.map((l) => l.id)).size === a.length)
    .default([]),
});
export function settleLines(
  lines: OrderLine[],
  input: z.infer<typeof settlementSchema>,
) {
  if (input.adjustments.some((a) => !lines.some((l) => l.id === a.id)))
    throw new Error("Siparişte olmayan ürüne indirim uygulanamaz.");
  return priceOrder(
    lines.map((line) => ({
      ...line,
      ...input.adjustments.find((a) => a.id === line.id),
    })),
    input.receiptDiscount,
  );
}
