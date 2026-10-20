import type { Sale } from "./types";
import { paymentBreakdown } from "./report";
import { paymentMethodLabel } from "@/lib/orders";
import styles from "./dashboard.module.css";
const money = (n: number) =>
  n.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
export default function PaymentSummary({ sales }: { sales: Sale[] }) {
  const groups = paymentBreakdown(sales);
  const products = new Map<
    string,
    { name: string; cash: number; card: number; unknown: number; free: number }
  >();
  for (const s of sales)
    for (const l of s.lines) {
      const p = products.get(l.id) ?? {
        name: l.name,
        cash: 0,
        card: 0,
        unknown: 0,
        free: 0,
      };
      const paid =
        Number(l.netTotal ?? l.unitPrice * l.quantity) > 0
          ? l.quantity - (l.complimentaryQuantity ?? 0)
          : 0;
      p[s.payment_method ?? "unknown"] += paid;
      p.free += l.quantity - paid;
      products.set(l.id, p);
    }
  return (
    <div style={{ margin: "22px 0" }}>
      <h3>Ödeme dağılımı</h3>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Yöntem</th>
              <th>Fiş</th>
              <th>Ödenen ürün</th>
              <th>İkram / bedelsiz</th>
              <th>İndirim</th>
              <th>Tahsilat</th>
            </tr>
          </thead>
          <tbody>
            {groups
              .filter((g) => g.method !== "unknown" || g.orders > 0)
              .map((g) => (
                <tr key={g.method}>
                  <td>
                    {g.method === "unknown"
                      ? "Yöntemi kaydedilmemiş"
                      : paymentMethodLabel[g.method]}
                  </td>
                  <td>{g.orders}</td>
                  <td>{g.units}</td>
                  <td>{g.served - g.units}</td>
                  <td>{money(g.discounts)}</td>
                  <td>{money(g.revenue)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p>
        İkramlar stok tüketimine dahildir. İndirimler düşüldükten sonraki
        tahsilat gösterilir; geçmiş kayıtların ödeme yöntemi varsayılmaz.
      </p>
      {products.size > 0 && (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Nakit · adet</th>
                <th>Kart · adet</th>
                <th>Belirtilmemiş · adet</th>
                <th>İkram / bedelsiz</th>
              </tr>
            </thead>
            <tbody>
              {[...products].map(([id, p]) => (
                <tr key={id}>
                  <td>{p.name}</td>
                  <td>{p.cash}</td>
                  <td>{p.card}</td>
                  <td>{p.unknown}</td>
                  <td>{p.free}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
