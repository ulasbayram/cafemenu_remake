import type { ErpData, Sale } from "./types";
export const turkeyDay = (date: string | Date) =>
  new Date(date).toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
export function totals(sales: Sale[], expenses: ErpData["expenses"]) {
  const revenue = sales.reduce((s, r) => s + Number(r.total), 0);
  const material = sales.reduce((s, r) => s + Number(r.material_cost), 0);
  const expense = expenses.reduce((s, r) => s + Number(r.amount), 0);
  return {
    revenue,
    material,
    expense,
    profit: Math.round((revenue - material - expense) * 100) / 100,
    units: sales.reduce(
      (s, r) => s + r.lines.reduce((a, l) => a + Number(l.quantity), 0),
      0,
    ),
    orders: sales.length,
    incomplete: sales.filter((r) => !r.cost_complete).length,
  };
}
export function erpReport(data: ErpData, month: string, day: string) {
  const prefix = month === "all" ? String(data.year) : `${data.year}-${month}`;
  const sales = data.sales.filter((s) =>
    turkeyDay(s.completed_at).startsWith(prefix),
  );
  const expenses = data.expenses.filter((e) => e.day.startsWith(prefix));
  const daily = new Map<string, Sale[]>();
  for (const sale of sales) {
    const date = turkeyDay(sale.completed_at);
    daily.set(date, [...(daily.get(date) ?? []), sale]);
  }
  // Include expense-only days so the result cannot hide losses on a closed day.
  for (const expense of expenses)
    if (!daily.has(expense.day)) daily.set(expense.day, []);
  const products = new Map<
    string,
    {
      id: string;
      name: string;
      quantity: number;
      revenue: number;
      cost: number;
      complete: boolean;
    }
  >();
  for (const sale of sales)
    for (const line of sale.lines) {
      const p = products.get(line.id) ?? {
        id: line.id,
        name: line.name,
        quantity: 0,
        revenue: 0,
        cost: 0,
        complete: true,
      };
      p.quantity += Number(line.quantity);
      p.revenue += Number(line.quantity) * Number(line.unitPrice);
      p.cost += Number(line.materialCost);
      p.complete = p.complete && line.costComplete;
      products.set(line.id, p);
    }
  return {
    summary: totals(sales, expenses),
    year: totals(data.sales, data.expenses),
    daily: [...daily]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, rows]) => ({
        day: date,
        ...totals(
          rows,
          expenses.filter((e) => e.day === date),
        ),
      })),
    products: [...products.values()].sort((a, b) => b.quantity - a.quantity),
    day: totals(
      data.sales.filter((s) => turkeyDay(s.completed_at) === day),
      data.expenses.filter((e) => e.day === day),
    ),
    daySales: data.sales.filter((s) => turkeyDay(s.completed_at) === day),
    expenses,
  };
}
export function recommendations(data: ErpData, reference = new Date()) {
  const end =
    new Date(turkeyDay(reference) + "T00:00:00+03:00").getTime() + 86400000;
  const start = end - 30 * 86400000,
    previous = start - 30 * 86400000;
  const current = new Map<string, { name: string; qty: number }>(),
    prior = new Map<string, number>();
  for (const s of data.insightSales ?? data.sales) {
    const t = Date.parse(s.completed_at);
    for (const l of s.lines) {
      if (t >= start && t < end) {
        const p = current.get(l.id) ?? { name: l.name, qty: 0 };
        p.qty += Number(l.quantity);
        current.set(l.id, p);
      } else if (t >= previous && t < start)
        prior.set(l.id, (prior.get(l.id) ?? 0) + Number(l.quantity));
    }
  }
  const cards: { title: string; body: string }[] = [];
  const best = [...current.values()].sort((a, b) => b.qty - a.qty)[0];
  if (best)
    cards.push({
      title: "Son 30 günün favorisi",
      body: `${best.name}, ${best.qty} adet ile en çok satılan ürün. Talebe göre stok seviyesini gözden geçirin.`,
    });
  const declining = [...prior]
    .map(([id, qty]) => ({ id, qty, now: current.get(id)?.qty ?? 0 }))
    .filter((p) => p.qty >= 5 && p.now <= p.qty * 0.7)
    .sort((a, b) => a.now / a.qty - b.now / b.qty)[0];
  if (declining)
    cards.push({
      title: "Satışı azalan ürün",
      body: `${current.get(declining.id)?.name ?? data.cafe.items.find((i) => i.id === declining.id)?.name ?? "Ürün"}: önceki 30 günde ${declining.qty}, son 30 günde ${declining.now} adet. Sunum ve görünürlüğü gözden geçirebilirsiniz.`,
    });
  const low = data.inventory.filter(
    (i) => Number(i.quantity) <= Number(i.threshold),
  );
  if (low.length)
    cards.push({
      title: "Stok takviyesi zamanı",
      body: `${low
        .map((i) => i.name)
        .slice(0, 4)
        .join(", ")} için stok uyarı seviyesine ulaşıldı.`,
    });
  if (!cards.length)
    cards.push({
      title: "Verilerle birlikte şekillenir",
      body: "Tamamlanan siparişler geldikçe satış eğilimleri ve stok önerileri burada görünecek.",
    });
  return cards;
}
