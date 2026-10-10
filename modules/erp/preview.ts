import type { ErpData } from "./types";
import { sampleItems } from "@/lib/menu";
import { turkeyDay } from "./report";
export function erpPreview(): ErpData {
  const now = new Date(),
    year = now.getFullYear(),
    cafe = "00000000-0000-4000-8000-000000000001",
    milk = "00000000-0000-4000-8000-000000000002",
    coffee = "00000000-0000-4000-8000-000000000003";
  return {
    year,
    cafe: { id: cafe, name: "Mola Coffee · Örnek işletme", items: sampleItems },
    inventory: [
      {
        id: milk,
        cafe_id: cafe,
        name: "Süt",
        unit: "L",
        quantity: 99.75,
        unit_cost: 40,
        threshold: 10,
        updated_at: now.toISOString(),
      },
      {
        id: coffee,
        cafe_id: cafe,
        name: "Kahve çekirdeği",
        unit: "kg",
        quantity: 2.8,
        unit_cost: 800,
        threshold: 3,
        updated_at: now.toISOString(),
      },
    ],
    recipes: [
      { product_id: "latte", ingredient_id: milk, quantity: 0.25 },
      { product_id: "latte", ingredient_id: coffee, quantity: 0.018 },
    ],
    sales: Array.from({ length: 60 }, (_, index) => {
      const date = new Date(now.getTime() - index * 86400000);
      const qty = index < 30 ? 8 : 5;
      return {
        order_id: crypto.randomUUID(),
        completed_at: date.toISOString(),
        total: qty * 145,
        material_cost: qty * 24.4,
        cost_complete: true,
        lines: [
          {
            id: "latte",
            name: "Caffè Latte",
            quantity: qty,
            unitPrice: 145,
            materialCost: qty * 24.4,
            costComplete: true,
          },
        ],
      };
    }).filter((s) => turkeyDay(s.completed_at).startsWith(String(year))),
    expenses: [
      {
        id: crypto.randomUUID(),
        day: turkeyDay(now),
        category: "rent",
        description: "Aylık kira · örnek",
        amount: 12000,
      },
    ],
    movements: [
      {
        id: crypto.randomUUID(),
        ingredient_id: milk,
        kind: "sale",
        delta: -0.25,
        unit_cost: 40,
        note: "Caffè Latte",
        created_at: now.toISOString(),
      },
    ],
  };
}
