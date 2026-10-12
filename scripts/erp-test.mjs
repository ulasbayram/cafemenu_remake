import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
const root = new URL("../", import.meta.url);
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/"))
      return next(new URL(specifier.slice(2) + ".ts", root).href, context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".ts") && !url.includes("node_modules"))
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
          },
        }).outputText,
      };
    return next(url, context);
  },
});
const { erpInput } = await import("../modules/erp/schema.ts");
const { erpReport, recommendations } = await import("../modules/erp/report.ts");
const db = new PGlite();
const uuid = () => crypto.randomUUID(),
  user = uuid(),
  otherUser = uuid(),
  cafe = uuid(),
  otherCafe = uuid();
const q = (sql, params = []) => db.query(sql, params);
try {
  await db.exec(`create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role;
    create table public.cafes(id uuid primary key, owner uuid references auth.users(id),data jsonb);
    create table public.orders(id uuid primary key,cafe uuid references public.cafes(id),status text,items jsonb,total numeric(12,2));
    create function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;`);
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/0006_admin_access_assignments.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      new URL("../supabase/migrations/0007_erp.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/0009_erp_trigger_safety.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await q("insert into auth.users values($1),($2)", [user, otherUser]);
  const menu = JSON.stringify({
    items: [
      { id: "latte", name: "Latte" },
      { id: "unknown", name: "Unknown" },
      { id: "brokenprod", name: "Kırılgan" },
    ],
  });
  await q("insert into cafes values($1,$2,$3),($4,$5,$3)", [
    cafe,
    user,
    menu,
    otherCafe,
    otherUser,
  ]);
  await q(
    "insert into account_module_grants(user_id,module_key) values($1,'erp'),($2,'erp')",
    [user, otherUser],
  );
  const mutate = (input, request = uuid(), uid = user, cafeId = cafe) =>
    q("select public.erp_mutate($1,$2,$3,$4)", [
      uid,
      cafeId,
      request,
      JSON.stringify(input),
    ]);
  await mutate({
    action: "ingredient",
    name: "Süt",
    unit: "L",
    quantity: 100,
    unitCost: 40,
    threshold: 10,
  });
  await mutate({
    action: "ingredient",
    name: "Kahve",
    unit: "kg",
    quantity: 10,
    unitCost: 800,
    threshold: 1,
  });
  const rows = (
    await q("select * from erp_inventory where cafe_id=$1 order by name", [
      cafe,
    ])
  ).rows;
  const milk = rows.find((r) => r.name === "Süt").id,
    coffee = rows.find((r) => r.name === "Kahve").id;
  await mutate({
    action: "recipe",
    productId: "latte",
    parts: [
      { ingredientId: milk, quantity: 0.25 },
      { ingredientId: coffee, quantity: 0.018 },
    ],
  });
  const order = uuid();
  await q("insert into orders values($1,$2,'waiting',$3,145)", [
    order,
    cafe,
    JSON.stringify([
      { id: "latte", name: "Latte", quantity: 1, unitPrice: 145 },
    ]),
  ]);
  await q("update orders set status='delivered' where id=$1", [order]);
  assert.equal(
    (await q("select quantity from erp_inventory where id=$1", [milk])).rows[0]
      .quantity,
    "100.000000",
  );
  await q("update orders set status='completed' where id=$1", [order]);
  assert.equal(
    (await q("select quantity from erp_inventory where id=$1", [milk])).rows[0]
      .quantity,
    "99.750000",
  );
  assert.equal(
    (await q("select material_cost from erp_sales where order_id=$1", [order]))
      .rows[0].material_cost,
    "24.400000",
  );
  await q("update orders set status='completed' where id=$1", [order]);
  await q("update orders set status='waiting' where id=$1", [order]);
  await q("update orders set status='completed' where id=$1", [order]);
  assert.equal(
    (await q("select quantity from erp_inventory where id=$1", [milk])).rows[0]
      .quantity,
    "99.750000",
  );
  assert.equal((await q("select count(*) from erp_sales")).rows[0].count, 1);
  const purchase = {
      action: "purchase",
      ingredientId: milk,
      quantity: 100,
      unitCost: 60,
      note: "Alış",
    },
    request = uuid();
  await mutate(purchase, request);
  await mutate(purchase, request);
  assert.equal(
    (await q("select quantity from erp_inventory where id=$1", [milk])).rows[0]
      .quantity,
    "199.750000",
  );
  assert.ok(
    Math.abs(
      Number(
        (await q("select unit_cost from erp_inventory where id=$1", [milk]))
          .rows[0].unit_cost,
      ) - 50.012516,
    ) < 0.000001,
  );
  assert.equal(
    (await q("select material_cost from erp_sales where order_id=$1", [order]))
      .rows[0].material_cost,
    "24.400000",
  );
  const otherRequest = uuid();
  await mutate(
    {
      action: "ingredient",
      name: "Other milk",
      unit: "L",
      quantity: 500,
      unitCost: 50,
      threshold: 0,
    },
    otherRequest,
    otherUser,
    otherCafe,
  );
  const otherMilk = (
    await q("select id from erp_inventory where cafe_id=$1", [otherCafe])
  ).rows[0].id;
  await assert.rejects(
    mutate({
      action: "recipe",
      productId: "latte",
      parts: [{ ingredientId: otherMilk, quantity: 0.25 }],
    }),
    (e) => e.code === "23503",
  );
  assert.equal(
    (await q("select count(*) from erp_recipes where cafe_id=$1", [cafe]))
      .rows[0].count,
    2,
  ); // rollback also restores old recipe
  await assert.rejects(
    mutate(purchase, uuid(), otherUser, cafe),
    (e) => e.code === "42501",
  );
  await assert.rejects(
    mutate({
      action: "count",
      ingredientId: milk,
      quantity: 200,
      note: "Sayım",
      expectedUpdatedAt: "2020-01-01T00:00:00Z",
    }),
    (e) => e.code === "40001",
  );
  await mutate({
    action: "purchase",
    ingredientId: milk,
    quantity: 1,
    unitCost: null,
    note: "Fiyat bilinmiyor",
  });
  assert.equal(
    (await q("select unit_cost from erp_inventory where id=$1", [milk])).rows[0]
      .unit_cost,
    null,
  );
  const missing = uuid();
  await q("insert into orders values($1,$2,'completed',$3,20)", [
    missing,
    cafe,
    JSON.stringify([
      { id: "unknown", name: "Unknown", quantity: 1, unitPrice: 20 },
    ]),
  ]);
  assert.equal(
    (
      await q("select cost_complete from erp_sales where order_id=$1", [
        missing,
      ])
    ).rows[0].cost_complete,
    false,
  );
  const countTime = (
    await q("select updated_at from erp_inventory where id=$1", [milk])
  ).rows[0].updated_at;
  await mutate({
    action: "count",
    ingredientId: milk,
    quantity: 0,
    note: "Sayım",
    expectedUpdatedAt: new Date(countTime).toISOString(),
  });
  const shortage = uuid();
  await q("insert into orders values($1,$2,'completed',$3,290)", [
    shortage,
    cafe,
    JSON.stringify([
      { id: "latte", name: "Latte", quantity: 2, unitPrice: 145 },
    ]),
  ]);
  assert.equal(
    (await q("select quantity from erp_inventory where id=$1", [milk])).rows[0]
      .quantity,
    "-0.500000",
  );
  assert.equal(
    (
      await q("select cost_complete from erp_sales where order_id=$1", [
        shortage,
      ])
    ).rows[0].cost_complete,
    false,
  );
  await q(
    "update account_module_grants set status='revoked' where user_id=$1",
    [user],
  );
  await assert.rejects(mutate(purchase), (e) => e.code === "42501");
  await q("insert into orders values($1,$2,'completed',$3,145)", [
    uuid(),
    cafe,
    JSON.stringify([
      { id: "latte", name: "Latte", quantity: 1, unitPrice: 145 },
    ]),
  ]);
  assert.equal(
    (await q("select quantity from erp_inventory where id=$1", [milk])).rows[0]
      .quantity,
    "-0.500000",
  );
  await db.exec("set role authenticated");
  await assert.rejects(
    q("select * from erp_inventory"),
    (e) => e.code === "42501",
  );
  await assert.rejects(mutate(purchase), (e) => e.code === "42501");
  await db.exec("reset role");
  await mutate(
    {
      action: "ingredient",
      name: "Hazır ürün",
      unit: "adet",
      quantity: 10,
      unitCost: 5,
      threshold: 2,
      productId: "unknown",
    },
    uuid(),
    otherUser,
    otherCafe,
  );
  const ready = (
    await q(
      "select id from erp_inventory where cafe_id=$1 and name='Hazır ürün'",
      [otherCafe],
    )
  ).rows[0].id;
  await q("insert into orders values($1,$2,'completed',$3,40)", [
    uuid(),
    otherCafe,
    JSON.stringify([
      { id: "unknown", name: "Hazır ürün", quantity: 2, unitPrice: 20 },
    ]),
  ]);
  assert.equal(
    (await q("select quantity from erp_inventory where id=$1", [ready])).rows[0]
      .quantity,
    "8.000000",
  );
  const expenseInput = {
    action: "expense",
    day: "2026-10-11",
    category: "rent",
    description: "Rent",
    amount: 500,
  };
  await mutate(expenseInput, uuid(), otherUser, otherCafe);
  const expenseId = (
    await q("select id from erp_expenses where cafe_id=$1", [otherCafe])
  ).rows[0].id;
  await assert.rejects(
    mutate({ action: "deleteExpense", id: expenseId }, uuid(), otherUser, cafe),
    (e) => e.code === "42501",
  );
  await mutate(
    { action: "deleteExpense", id: expenseId },
    uuid(),
    otherUser,
    otherCafe,
  );
  assert.equal((await q("select count(*) from erp_expenses")).rows[0].count, 0);
  await q(
    "update account_module_grants set expires_at='2020-01-01' where user_id=$1",
    [otherUser],
  );
  await assert.rejects(
    mutate(expenseInput, uuid(), otherUser, otherCafe),
    (e) => e.code === "42501",
  );
  assert.equal(
    erpInput.safeParse({
      action: "recipe",
      productId: "latte",
      parts: [
        { ingredientId: milk, quantity: 0.25 },
        { ingredientId: milk, quantity: 0.5 },
      ],
    }).success,
    false,
  );
  assert.equal(
    erpInput.safeParse({
      action: "expense",
      day: "2026-02-30",
      category: "rent",
      description: "rent",
      amount: 5,
    }).success,
    false,
  );
  const reportData = {
    year: 2026,
    cafe: { id: cafe, name: "Test", items: [] },
    inventory: [],
    recipes: [],
    movements: [],
    sales: [
      {
        order_id: order,
        completed_at: "2026-10-01T22:30:00Z",
        total: 145,
        material_cost: 24.4,
        cost_complete: true,
        lines: [
          {
            id: "latte",
            name: "Latte",
            quantity: 1,
            unitPrice: 145,
            materialCost: 24.4,
            costComplete: true,
          },
        ],
      },
    ],
    expenses: [
      {
        id: uuid(),
        day: "2026-10-02",
        category: "rent",
        description: "rent",
        amount: 50,
      },
      {
        id: uuid(),
        day: "2026-10-03",
        category: "rent",
        description: "rent",
        amount: 25,
      },
    ],
  };
  const report = erpReport(reportData, "10", "2026-10-02");
  assert.equal(report.day.units, 1);
  assert.equal(report.day.profit, 70.6);
  assert.equal(report.summary.profit, 45.6);
  assert.equal(report.daily.length, 2);
  const insightData = {
    ...reportData,
    sales: [
      ...reportData.sales,
      {
        ...reportData.sales[0],
        completed_at: "2026-09-10T10:00:00Z",
        lines: [
          {
            id: "latte",
            name: "Latte",
            quantity: 10,
            unitPrice: 145,
            materialCost: 244,
            costComplete: true,
          },
        ],
      },
    ],
  };
  assert.ok(
    recommendations(insightData, new Date("2026-10-11T12:00:00Z")).some(
      (r) => r.title === "Satışı azalan ürün",
    ),
  );
  // A malformed quantity must not roll back order completion (0009 wrapper).
  // Dedicated ingredient+recipe so the cast path is exercised regardless of
  // earlier test state (which revokes/expires the module grant).
  await q(
    "update account_module_grants set status='active', expires_at=null where user_id=$1",
    [user],
  );
  await mutate({
    action: "ingredient",
    name: "Kırılgan",
    unit: "kg",
    quantity: 5,
    unitCost: 10,
    threshold: 0,
  });
  const fragile = (
    await q("select id from erp_inventory where cafe_id=$1 and name='Kırılgan'", [
      cafe,
    ])
  ).rows[0].id;
  await mutate({
    action: "recipe",
    productId: "brokenprod",
    parts: [{ ingredientId: fragile, quantity: 0.5 }],
  });
  const brokenOrder = uuid();
  await q("insert into orders values($1,$2,'waiting',$3,10)", [
    brokenOrder,
    cafe,
    JSON.stringify([
      { id: "brokenprod", name: "Kırılgan", quantity: "x", unitPrice: 10 },
    ]),
  ]);
  await q("update orders set status='completed' where id=$1", [brokenOrder]);
  assert.equal(
    (await q("select status from orders where id=$1", [brokenOrder])).rows[0]
      .status,
    "completed",
  );
  assert.equal(
    (await q("select count(*) from erp_sales where order_id=$1", [brokenOrder]))
      .rows[0].count,
    0,
  );
  console.log(
    "PASS: real Postgres migration/trigger, 100 L → 99.75 L, paid-only deduction, idempotency, recipe rollback, tenant isolation, weighted costs, historical snapshots, missing costs, shortages, revoke, private tables/RPC, Istanbul day/profit/insights, ERP fault does not block order completion",
  );
} finally {
  await db.close();
}
