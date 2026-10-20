import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { registerHooks } from "node:module";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
const root = new URL("../", import.meta.url);
registerHooks({
  resolve(s, c, next) {
    if (s.startsWith("@/"))
      return next(new URL(s.slice(2) + ".ts", root).href, c);
    if (s.startsWith(".") && !/\.[a-z]+$/.test(s)) {
      const u = new URL(s + ".ts", c.parentURL);
      if (existsSync(u)) return next(u.href, c);
    }
    return next(s, c);
  },
  load(u, c, next) {
    if (u.endsWith(".ts") && !u.includes("node_modules"))
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(u), "utf8"), {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
          },
        }).outputText,
      };
    return next(u, c);
  },
});
const { priceOrder } = await import("../lib/orders.ts");
const { settleLines, settlementSchema } =
  await import("../lib/order-settlement.ts");
const { publicCafeData } = await import("../lib/menu-wifi.ts");
const { itemName, itemDescription, categoryName } =
  await import("../lib/menu-language.ts");
const { paymentBreakdown, erpReport } =
  await import("../modules/erp/report.ts");
const tea = { id: "tea", name: "Çay", quantity: 3, unitPrice: 10 };
const result = priceOrder([{ ...tea, complimentaryQuantity: 1 }], 5);
assert.equal(result.total, 15);
assert.equal(result.discountTotal, 15);
assert.equal(result.items[0].quantity, 3);
assert.equal(result.items[0].netTotal, 15);
assert.throws(() => priceOrder([{ ...tea, complimentaryQuantity: 4 }]));
assert.throws(() => priceOrder([{ ...tea, discountAmount: 31 }]));
assert.throws(() => priceOrder([tea], 31));
assert.throws(() => priceOrder([tea], NaN));
assert.throws(() =>
  settleLines([tea], {
    adjustments: [
      { id: "foreign", discountAmount: 1, complimentaryQuantity: 0 },
    ],
    receiptDiscount: 0,
  }),
);
assert.equal(
  settlementSchema.safeParse({
    expectedUpdatedAt: new Date().toISOString(),
    adjustments: [
      { id: "tea", discountAmount: 0, complimentaryQuantity: 0 },
      { id: "tea", discountAmount: 0, complimentaryQuantity: 0 },
    ],
  }).success,
  false,
);
// Proportional allocations always balance and never put revenue on a free line.
for (let discount = 0; discount <= 21; discount++) {
  const r = priceOrder(
    [
      { ...tea, quantity: 1, unitPrice: 0.11 },
      { ...tea, id: "tea2", quantity: 1, unitPrice: 0.1 },
      {
        ...tea,
        id: "free",
        quantity: 1,
        unitPrice: 1,
        complimentaryQuantity: 1,
      },
    ],
    discount / 100,
  );
  assert.equal(
    r.items.reduce((s, l) => s + Math.round(l.netTotal * 100), 0),
    Math.round(r.total * 100),
  );
  assert.ok(r.items.every((l) => l.netTotal >= 0));
  assert.equal(r.items[2].netTotal, 0);
}
const wifi = {
  wifi: {
    ssid: "Guest",
    password: "never-preload-me",
    visibility: "after-order",
  },
};
assert.equal(
  JSON.stringify(publicCafeData(wifi, false)).includes("never-preload-me"),
  false,
);
assert.equal(publicCafeData(wifi, true).wifi.password, "never-preload-me");
assert.equal(
  publicCafeData({ wifi: { ...wifi.wifi, visibility: "everyone" } }, false).wifi
    .password,
  "never-preload-me",
);
const translated = {
  ...tea,
  nameEn: "Tea",
  description: "Taze çay",
  descriptionEn: "Fresh tea",
  category: "İçecekler",
  categoryEn: "Drinks",
};
assert.equal(itemName(translated, "en"), "Tea");
assert.equal(itemName(tea, "en"), "Çay");
assert.equal(itemDescription(translated, "en"), "Fresh tea");
assert.equal(
  categoryName({ items: [translated] }, "İçecekler", "en"),
  "Drinks",
);
const db = new PGlite();
const uid = crypto.randomUUID(),
  cafe = crypto.randomUUID(),
  order = crypto.randomUUID(),
  legacy = crypto.randomUUID();
try {
  await db.exec(`create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role;
 create table cafes(id uuid primary key,owner uuid references auth.users(id),data jsonb);
 create table orders(id uuid primary key,cafe uuid references cafes(id),status text,items jsonb,total numeric(12,2));
 create function public.touch_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end $$;
 grant update(status) on orders to authenticated;`);
  for (const f of [
    "0006_admin_access_assignments.sql",
    "0007_erp.sql",
    "0009_erp_trigger_safety.sql",
  ])
    await db.exec(
      readFileSync(
        new URL("../supabase/migrations/" + f, import.meta.url),
        "utf8",
      ),
    );
  await db.query("insert into auth.users values($1)", [uid]);
  await db.query("insert into cafes values($1,$2,$3)", [
    cafe,
    uid,
    JSON.stringify({ items: [{ id: "tea", name: "Çay" }] }),
  ]);
  await db.query("insert into orders values($1,$2,'completed',$3,30)", [
    legacy,
    cafe,
    JSON.stringify([tea]),
  ]);
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/0010_order_settlement.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(
    (await db.query("select payment_method from orders where id=$1", [legacy]))
      .rows[0].payment_method,
    null,
  );
  assert.equal(
    (
      await db.query(
        "select has_column_privilege('authenticated','orders','status','UPDATE') as allowed",
      )
    ).rows[0].allowed,
    false,
  );
  await db.query(
    "insert into account_module_grants(user_id,module_key) values($1,'erp')",
    [uid],
  );
  const mutate = (input) =>
    db.query("select erp_mutate($1,$2,$3,$4)", [
      uid,
      cafe,
      crypto.randomUUID(),
      JSON.stringify(input),
    ]);
  await mutate({
    action: "ingredient",
    name: "Çay",
    unit: "adet",
    quantity: 100,
    unitCost: 1,
    threshold: 5,
  });
  const ingredient = (await db.query("select id from erp_inventory")).rows[0]
    .id;
  await mutate({
    action: "recipe",
    productId: "tea",
    parts: [{ ingredientId: ingredient, quantity: 1 }],
  });
  await db.query(
    "insert into orders(id,cafe,status,items,total) values($1,$2,'waiting',$3,30)",
    [order, cafe, JSON.stringify([tea])],
  );
  await assert.rejects(() =>
    db.query(
      "update orders set status='completed',payment_method='cash' where id=$1",
      [order],
    ),
  );
  await db.query("update orders set status='delivered' where id=$1", [order]);
  await assert.rejects(() =>
    db.query("update orders set status='completed' where id=$1", [order]),
  );
  await assert.rejects(() =>
    db.query("update orders set total=0 where id=$1", [order]),
  );
  await db.query(
    "update orders set items=$2,total=$3,receipt_discount=5 where id=$1",
    [order, JSON.stringify(result.items), result.total],
  );
  assert.equal(
    Number(
      (await db.query("select quantity from erp_inventory")).rows[0].quantity,
    ),
    100,
  );
  await db.query(
    "update orders set status='completed',payment_method='cash' where id=$1",
    [order],
  );
  const sale = (
    await db.query("select * from erp_sales where order_id=$1", [order])
  ).rows[0];
  assert.equal(sale.payment_method, "cash");
  assert.equal(Number(sale.total), 15);
  assert.equal(Number(sale.discount_total), 15);
  assert.equal(Number(sale.material_cost), 3);
  assert.equal(sale.lines[0].netTotal, 15);
  assert.equal(
    Number(
      (await db.query("select quantity from erp_inventory")).rows[0].quantity,
    ),
    97,
  );
  const card = crypto.randomUUID();
  await db.query(
    "insert into orders(id,cafe,status,items,total) values($1,$2,'delivered',$3,30)",
    [card, cafe, JSON.stringify([tea])],
  );
  await db.query(
    "update orders set status='completed',payment_method='card' where id=$1",
    [card],
  );
  const cardSale = (
    await db.query("select * from erp_sales where order_id=$1", [card])
  ).rows[0];
  assert.equal(cardSale.payment_method, "card");
  assert.equal(paymentBreakdown([sale, cardSale])[1].units, 3);
  assert.equal(paymentBreakdown([sale, cardSale])[1].revenue, 30);
  await assert.rejects(() =>
    db.query("update orders set total=15 where id=$1", [order]),
  );
  const payments = paymentBreakdown([sale]);
  assert.equal(payments[0].units, 2);
  assert.equal(payments[0].served, 3);
  assert.equal(payments[0].revenue, 15);
  const year = Number(
    new Date()
      .toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" })
      .slice(0, 4),
  );
  assert.equal(
    erpReport({ sales: [sale], expenses: [], year }, "all", "").products[0]
      .revenue,
    15,
  );
  console.log(
    "PASS: discounts/complimentary stock and net ledger, cash/card grouping, kuruş allocations, immutable receipts, DB payment validation, revoked direct updates, Wi-Fi pre-order redaction and bilingual fallback",
  );
} finally {
  await db.close();
}
