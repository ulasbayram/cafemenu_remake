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

const { menuItemRows, staleMenuItemIds } = await import("../lib/menu-items.ts");

// Pure mapping: position = array index, price preserved.
const rows = menuItemRows("cafe-1", [
  {
    id: "a",
    name: "A",
    description: "d",
    price: 12.34,
    category: "Cat",
    available: true,
  },
  {
    id: "b",
    name: "B",
    description: "",
    price: 5,
    category: "Cat",
    available: false,
  },
]);
assert.equal(rows.length, 2);
assert.equal(rows[0].position, 0);
assert.equal(rows[1].position, 1);
assert.equal(rows[0].price, 12.34);
assert.equal(rows[1].available, false);
assert.equal(rows[0].cafe, "cafe-1");
assert.deepEqual(staleMenuItemIds(["a", "b", "c"], ["b", "c", "d"]), ["a"]);

const db = new PGlite();
try {
  await db.exec(`create schema auth; create table auth.users(id uuid primary key);
    create role anon; create role authenticated; create role service_role;
    create or replace function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create table public.cafes(id uuid primary key, owner uuid references auth.users(id), data jsonb);`);
  const user = crypto.randomUUID();
  const withItems = crypto.randomUUID();
  const empty = crypto.randomUUID();
  await db.query("insert into auth.users values($1)", [user]);
  await db.query("insert into cafes values($1,$2,$3),($4,$2,'{}')", [
    withItems,
    user,
    JSON.stringify({
      items: [
        {
          id: "latte",
          name: "Latte",
          description: "",
          price: 145,
          category: "Kahveler",
          available: true,
        },
        {
          id: "su",
          name: "Su",
          description: "soğuk",
          price: 15.5,
          category: "İçecek",
          available: false,
        },
      ],
    }),
    empty,
  ]);
  const migration = readFileSync(
    new URL("../supabase/migrations/0008_menu_items.sql", import.meta.url),
    "utf8",
  );
  await db.exec(migration);

  // Backfill produced rows only for the cafe that has items.
  const backfilled = (
    await db.query("select * from menu_items where cafe=$1 order by position", [
      withItems,
    ])
  ).rows;
  assert.equal(backfilled.length, 2);
  assert.equal(backfilled[0].id, "latte");
  assert.equal(backfilled[0].price, "145.00");
  assert.equal(backfilled[0].position, 0);
  assert.equal(backfilled[1].id, "su");
  assert.equal(backfilled[1].available, false);
  assert.equal(
    (await db.query("select count(*) from menu_items where cafe=$1", [empty]))
      .rows[0].count,
    0,
  );

  // Money is typed at 2dp: 12.345 rounds on insert.
  await db.query("insert into menu_items(cafe,id,name,price,category) values($1,'x','X',12.345,'C')", [
    withItems,
  ]);
  assert.equal(
    (await db.query("select price from menu_items where cafe=$1 and id='x'", [withItems]))
      .rows[0].price,
    "12.35",
  );

  // Primary key rejects a duplicate (cafe,id).
  await assert.rejects(
    db.query("insert into menu_items(cafe,id,name,price,category) values($1,'latte','Dup',1,'C')", [
      withItems,
    ]),
  );

  // Backfill is idempotent: re-running changes nothing.
  const before = (await db.query("select count(*) from menu_items")).rows[0].count;
  await db.exec(migration);
  assert.equal(
    (await db.query("select count(*) from menu_items")).rows[0].count,
    before,
  );

  console.log(
    "PASS: menu_items row mapping, stale diff, backfill from blob (2 rows / 0 rows), numeric(12,2) rounding, duplicate rejection, idempotent backfill",
  );
} finally {
  await db.close();
}
