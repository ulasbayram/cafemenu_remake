import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import ts from "typescript";

const root = new URL("../", import.meta.url);
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/"))
      return next(new URL(specifier.slice(2) + ".ts", root).href, context);
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.[a-z]+$/.test(specifier)
    ) {
      const base = new URL(specifier, context.parentURL ?? root.href);
      const ts = new URL(specifier + ".ts", context.parentURL ?? root.href);
      const idx = new URL(specifier + "/index.ts", context.parentURL ?? root.href);
      for (const candidate of [base, ts, idx]) {
        try {
          readFileSync(candidate);
          return next(candidate.href, context);
        } catch {}
      }
    }
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

const menu = await import("../lib/menu.ts");
const orders = await import("../lib/orders.ts");
const visits = await import("../lib/visit-stats.ts");
const grants = await import("../lib/grant-status.ts");

// ── order money ─────────────────────────────────────────────────────────────
// Per-line kuruş rounding: a naive float sum would yield 20.009999….
assert.equal(
  orders.orderTotal([
    { unitPrice: 10.005, quantity: 1 },
    { unitPrice: 10.005, quantity: 1 },
  ]),
  20.02,
);
assert.equal(orders.orderTotal([{ unitPrice: 12.34, quantity: 3 }]), 37.02);
assert.equal(orders.orderTotal([{ unitPrice: 0.004, quantity: 2 }]), 0);
assert.equal(orders.orderTotal([]), 0);
assert.equal(orders.orderTotal([{ unitPrice: 1000000, quantity: 20 }]), 20000000);
assert.deepEqual(orders.orderStatusLabel, {
  waiting: "Bekleniyor",
  delivered: "Teslim edildi",
  completed: "Tamamlandı",
});

// ── item / menu schema ──────────────────────────────────────────────────────
const priced = menu.itemSchema.parse({
  id: "x",
  name: "X",
  description: "",
  price: 12.345,
  category: "C",
  available: true,
});
assert.equal(priced.price, 12.35, "price normalizes to kuruş at the boundary");
assert.throws(() =>
  menu.itemSchema.parse({
    id: "x",
    name: "X",
    description: "",
    price: -1,
    category: "C",
    available: true,
  }),
);
assert.throws(() =>
  menu.itemSchema.parse({
    id: "x",
    name: "X",
    description: "",
    price: 1000001,
    category: "C",
    available: true,
  }),
);

assert.deepEqual(
  menu.menuCategories({
    items: [{ category: "B" }, { category: "A" }, { category: "B" }],
    categories: ["A", "Z"],
  }),
  ["A", "Z", "B"],
  "explicit categories first, then item categories, de-duplicated",
);

assert.deepEqual(menu.resolveOrderPolicy(), { enabled: true, mode: "token" });
assert.deepEqual(menu.resolveOrderPolicy({ mode: "open" }), {
  enabled: true,
  mode: "open",
});
assert.deepEqual(menu.resolveOrderPolicy({ enabled: false }), {
  enabled: false,
  mode: "token",
});

// Slug normalization is load-bearing: printed QRs depend on it staying stable.
assert.equal(menu.slugify("Café & Co."), "cafe-co");
assert.equal(menu.slugify("Şişli Kahve"), "sisli-kahve");
assert.equal(menu.cafeSlug("ab"), "ab-kafe", "too-short slug gets a suffix");
assert.equal(menu.cafeSlug("", "Mola Coffee"), "mola-coffee");
assert.equal(menu.cafeSlug("123"), "123", "digit-first slugs are valid now");
assert.ok(menu.exampleCafe.items.length > 0);
assert.ok(menu.sampleItems.every((i) => i.price >= 0 && i.name.length > 0));

// ── visit aggregation / Istanbul day boundary ───────────────────────────────
assert.deepEqual(
  visits.aggregateVisits([
    { cafe: "c", day: "2026-01-01", hour: 1 },
    { cafe: "c", day: "2026-01-01", hour: 1 },
    { cafe: "c", day: "2026-01-01", hour: 2 },
  ]),
  [
    { cafe: "c", day: "2026-01-01", hour: 1, count: 2 },
    { cafe: "c", day: "2026-01-01", hour: 2, count: 1 },
  ],
);
// 21:30 UTC is the next calendar day in Istanbul (+3).
assert.equal(
  visits.istanbulDay(new Date("2026-01-01T21:30:00Z")),
  "2026-01-02",
);
assert.equal(
  visits.istanbulDay(new Date("2026-01-01T20:30:00Z")),
  "2026-01-01",
);

// ── grant status ────────────────────────────────────────────────────────────
assert.equal(grants.grantActive({ status: "active", expires_at: null }), true);
assert.equal(grants.grantActive({ status: "revoked", expires_at: null }), false);
assert.equal(
  grants.grantActive({ status: "active", expires_at: "2000-01-01T00:00:00Z" }),
  false,
);
assert.equal(
  grants.grantActive(
    { status: "active", expires_at: "2030-01-01T00:00:00Z" },
    Date.parse("2026-01-01T00:00:00Z"),
  ),
  true,
);
assert.equal(grants.missingAccessTable({ code: "42P01" }), true);
assert.equal(grants.missingAccessTable({ code: "PGRST205" }), true);
assert.equal(grants.missingAccessTable({ code: "23505" }), false);
assert.equal(grants.missingAccessTable(null), false);

// ── table QR tokens (scan → order) ──────────────────────────────────────────
process.env.TABLE_QR_SECRET = "test-secret-value";
const tokens = await import("../lib/table-order-token.ts");
const cafe = "11111111-1111-1111-1111-111111111111";
const signed = await tokens.signTableOrder(cafe, 7);
assert.match(signed, /^[A-Za-z0-9_-]{12}$/, "12-char base64url token");
assert.equal(await tokens.verifyTableOrder(cafe, 7, signed), true);
assert.equal(await tokens.verifyTableOrder(cafe, 8, signed), false);
assert.equal(
  await tokens.verifyTableOrder("22222222-2222-2222-2222-222222222222", 7, signed),
  false,
);
assert.equal(
  await tokens.verifyTableOrder(cafe, 7, signed.slice(0, 11) + "X"),
  false,
);
assert.equal(await tokens.verifyTableOrder(cafe, 7, "short"), false);
assert.equal(await tokens.verifyTableOrder(cafe, 7, ""), false);
const code = await tokens.dailyCodeFor(cafe);
assert.equal(typeof code, "string");
assert.ok(code.length >= 3 && code.length <= 8, "daily code length in range");

console.log(
  "PASS: canonical order total, item price kuruş rounding, menu categories, order policy defaults, slug/cafeSlug, visit aggregation + Istanbul day, grant status, missing-table detection, table QR sign/verify + daily code",
);
