import type { Item } from "@/lib/menu";
export type Ingredient = {
  id: string;
  cafe_id: string;
  name: string;
  unit: "L" | "kg" | "adet";
  quantity: number;
  unit_cost: number | null;
  threshold: number;
  updated_at: string;
};
export type RecipePart = {
  product_id: string;
  ingredient_id: string;
  quantity: number;
};
export type Sale = {
  order_id: string;
  completed_at: string;
  total: number;
  material_cost: number;
  cost_complete: boolean;
  lines: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    materialCost: number;
    costComplete: boolean;
  }[];
};
export type Expense = {
  id: string;
  day: string;
  category: string;
  description: string;
  amount: number;
};
export type Movement = {
  id: string;
  ingredient_id: string;
  kind: string;
  delta: number;
  unit_cost: number | null;
  note: string;
  created_at: string;
};
export type ErpData = {
  cafe: { id: string; name: string; items: Item[] };
  inventory: Ingredient[];
  recipes: RecipePart[];
  sales: Sale[];
  insightSales?: Sale[];
  expenses: Expense[];
  movements: Movement[];
  year: number;
};
