export type OrderStatus = "waiting" | "delivered" | "completed";

export type OrderLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

/** Canonical order money. Rounds each line to kuruş before summing, so two
 *  writers of `orders.total` can never disagree. Every total computation
 *  must call this. */
export function orderTotal(
  lines: { unitPrice: number; quantity: number }[],
): number {
  return (
    lines.reduce(
      (sum, line) => sum + Math.round(line.unitPrice * 100) * line.quantity,
      0,
    ) / 100
  );
}

export type CafeOrder = {
  id: string;
  cafeId: string;
  cafeName: string;
  tableNo: number;
  status: OrderStatus;
  items: OrderLine[];
  total: number;
  distanceKm: number | null;
  distanceSource: "gps" | "ip" | null;
  createdAt: string;
  updatedAt: string;
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  waiting: "Bekleniyor",
  delivered: "Teslim edildi",
  completed: "Tamamlandı",
};
