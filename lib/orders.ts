export type OrderStatus = "waiting" | "delivered" | "completed";

export type OrderLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  complimentaryQuantity?: number;
  discountAmount?: number;
  /** Net line revenue, including its share of the receipt discount. */
  netTotal?: number;
};

/** Canonical order money. Rounds each line to kuruş before summing, so two
 *  writers of `orders.total` can never disagree. Every total computation
 *  must call this (undiscounted orders) or priceOrder (settlement). */
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
  paymentMethod?: PaymentMethod | null;
  receiptDiscount?: number;
};

export type PaymentMethod = "cash" | "card";
export const paymentMethodLabel = { cash: "Nakit", card: "Kredi kartı" };

export type LineAdjustment = {
  id: string;
  complimentaryQuantity: number;
  discountAmount: number;
};

/** Integer kuruş calculations; receipt discounts are allocated without losing a kuruş.
 * Quantities remain unchanged so complimentary items still consume stock. */
export function priceOrder(lines: OrderLine[], receiptDiscount = 0) {
  const cents = (value: number) => Math.round(value * 100);
  if (!Number.isFinite(receiptDiscount) || receiptDiscount < 0)
    throw new Error("Fiş indirimi geçersiz.");
  const base = lines.map((line) => {
    const free = line.complimentaryQuantity ?? 0,
      discount = line.discountAmount ?? 0;
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      !Number.isFinite(line.unitPrice) ||
      line.unitPrice < 0 ||
      !Number.isInteger(free) ||
      free < 0 ||
      free > line.quantity ||
      !Number.isFinite(discount) ||
      discount < 0
    )
      throw new Error("Ürün indirimi veya ikram adedi geçersiz.");
    const gross = cents(line.unitPrice) * line.quantity;
    const net = gross - cents(line.unitPrice) * free - cents(discount);
    if (net < 0) throw new Error(`${line.name}: indirim ürün tutarını aşamaz.`);
    return { line, gross, net };
  });
  const subtotal = base.reduce((s, l) => s + l.gross, 0);
  const lineNet = base.reduce((s, l) => s + l.net, 0),
    receipt = cents(receiptDiscount);
  if (receipt > lineNet) throw new Error("Fiş indirimi kalan tutarı aşamaz.");
  let allocated = 0;
  const items = base.map(({ line, net }) => {
    const share = lineNet
      ? Number((BigInt(receipt) * BigInt(net)) / BigInt(lineNet))
      : 0;
    allocated += share;
    return {
      ...line,
      complimentaryQuantity: line.complimentaryQuantity ?? 0,
      discountAmount: cents(line.discountAmount ?? 0) / 100,
      netTotal: (net - share) / 100,
    };
  });
  // Allocate the remaining kuruş only to lines with positive revenue.
  let remainder = receipt - allocated;
  for (const line of items) {
    const take = Math.min(cents(line.netTotal), remainder);
    line.netTotal = (cents(line.netTotal) - take) / 100;
    remainder -= take;
  }
  return {
    items,
    subtotal: subtotal / 100,
    total: (lineNet - receipt) / 100,
    discountTotal: (subtotal - lineNet + receipt) / 100,
    receiptDiscount: receipt / 100,
  };
}

export const orderStatusLabel: Record<OrderStatus, string> = {
  waiting: "Bekleniyor",
  delivered: "Teslim edildi",
  completed: "Tamamlandı",
};
