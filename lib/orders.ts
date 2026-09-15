export type OrderStatus = "waiting" | "delivered" | "completed";

export type OrderLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type CafeOrder = {
  id: string;
  cafeId: string;
  cafeName: string;
  tableNo: number;
  status: OrderStatus;
  items: OrderLine[];
  total: number;
  createdAt: string;
  updatedAt: string;
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  waiting: "Bekleniyor",
  delivered: "Teslim edildi",
  completed: "Tamamlandı",
};
