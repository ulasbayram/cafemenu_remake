import type { Cafe } from "@/lib/menu";
import type { OrderLine } from "@/lib/orders";
export type EnterpriseVisit = {
  cafe: string;
  day: string;
  hour: number;
  count: number;
};
export type EnterpriseOrder = {
  id: string;
  cafe: string;
  table: number;
  total: number;
  status: "waiting" | "delivered" | "completed";
  createdAt: string;
  updatedAt: string;
  items: OrderLine[];
};
export type PackageAData = {
  cafe: Cafe;
  visits: EnterpriseVisit[];
  orders: EnterpriseOrder[];
  today: string;
};
