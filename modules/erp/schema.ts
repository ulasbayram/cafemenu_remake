import { z } from "zod";
const quantity = z.number().finite().min(0).max(100000000).multipleOf(0.000001);
const price = z.number().finite().min(0).max(1000000).nullable();
export const erpInput = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("ingredient"),
    name: z.string().trim().min(1).max(100),
    unit: z.enum(["L", "kg", "adet"]),
    quantity,
    unitCost: price,
    threshold: quantity,
    productId: z.string().min(1).max(80).optional(),
  }),
  z.object({
    action: z.literal("purchase"),
    ingredientId: z.string().uuid(),
    quantity: quantity.refine((v) => v > 0),
    unitCost: price,
    note: z.string().trim().max(200),
  }),
  z.object({
    action: z.literal("count"),
    ingredientId: z.string().uuid(),
    quantity,
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    note: z.string().trim().min(1).max(200),
  }),
  z.object({
    action: z.literal("recipe"),
    productId: z.string().min(1).max(80),
    parts: z
      .array(
        z.object({
          ingredientId: z.string().uuid(),
          quantity: quantity.refine((v) => v > 0),
        }),
      )
      .max(100)
      .refine(
        (parts) =>
          new Set(parts.map((p) => p.ingredientId)).size === parts.length,
      ),
  }),
  z.object({
    action: z.literal("expense"),
    day: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (day) =>
          !Number.isNaN(Date.parse(day)) &&
          new Date(day).toISOString().slice(0, 10) === day,
      ),
    category: z.enum(["rent", "salary", "utilities", "other"]),
    description: z.string().trim().min(1).max(200),
    amount: z.number().finite().positive().max(100000000).multipleOf(0.01),
  }),
  z.object({ action: z.literal("deleteExpense"), id: z.string().uuid() }),
]);
