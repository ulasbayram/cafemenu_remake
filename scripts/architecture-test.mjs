import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function importsOf(file) {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
}

// ── Dependency direction: core must not depend on package internals ──────────
// The only allowed core→enterprise/module imports are the documented contract
// surface (the registry, the assignment server, and the two nav mounts). Any
// other edge means package code has leaked into the core app.
const ALLOWED_CORE_TO_PACKAGE = new Set([
  "app/api/admin/entitlements/route.ts",
  "app/api/access/route.ts",
  "app/page.tsx",
  "app/dashboard.tsx",
  "lib/access-catalog.ts",
]);
const PACKAGE_IMPORT = /^@\/(enterprise|modules)\//;

const coreFiles = [
  ...walk(join(root, "app")),
  ...walk(join(root, "lib")),
  ...walk(join(root, "components")),
  ...walk(join(root, "hooks")),
].filter(
  (file) =>
    !file.includes("/app/enterprise/") &&
    !file.includes("/app/modules/") &&
    !file.includes("/app/api/enterprise/") &&
    !file.includes("/app/api/modules/"),
);

for (const file of coreFiles) {
  const rel = relative(root, file);
  if (ALLOWED_CORE_TO_PACKAGE.has(rel)) continue;
  for (const spec of importsOf(file)) {
    assert.ok(
      !PACKAGE_IMPORT.test(spec),
      `${rel} imports ${spec}; core must not depend on package internals`,
    );
  }
}

// ── Isolation: the four package-facing core modules exist and export ─────────
const contract = {
  "lib/orders.ts": ["orderTotal", "orderStatusLabel"],
  "hooks/use-order-feed.ts": ["useOrderFeed"],
  "components/app-select.tsx": ["default"],
  "lib/menu.ts": ["cafeSchema", "itemSchema", "resolveOrderPolicy", "Item"],
};
for (const [rel, exports] of Object.entries(contract)) {
  const source = readFileSync(join(root, rel), "utf8");
  assert.ok(
    /export/.test(source),
    `${rel} must remain an exported contract module`,
  );
  for (const symbol of exports) {
    if (symbol === "default")
      assert.match(
        source,
        /export default/,
        `${rel} must default-export (package components import it)`,
      );
    else
      assert.match(
        source,
        new RegExp(`export (?:type |const |function |async function )?${symbol}\\b`),
        `${rel} must export ${symbol} (packages depend on it)`,
      );
  }
}

// ── Route contracts ─────────────────────────────────────────────────────────
const routes = {
  "app/api/access/route.ts": ["GET"],
  "app/api/enterprise/package-a/route.ts": ["GET"],
  "app/api/enterprise/package-a/orders/manual/route.ts": ["POST"],
  "app/api/enterprise/package-a/orders/[id]/route.ts": ["PATCH"],
  "app/api/orders/route.ts": ["GET", "POST"],
  "app/api/orders/[id]/route.ts": ["PUT"],
  "app/api/order-notifications/route.ts": ["GET", "POST", "DELETE"],
};
for (const [rel, methods] of Object.entries(routes)) {
  const source = readFileSync(join(root, rel), "utf8");
  for (const method of methods)
    assert.match(
      source,
      new RegExp(`export (?:async )?function ${method}\\b`),
      `${rel} must keep exporting ${method}`,
    );
}

// Routes that were consolidated/deleted must stay gone.
for (const gone of [
  "app/api/enterprise/access/route.ts",
  "app/api/modules/access/route.ts",
])
  assert.ok(!existsSync(join(root, gone)), `${gone} was removed; do not re-add`);

// ── Migrations are append-only and numbered ─────────────────────────────────
const migrations = readdirSync(join(root, "supabase/migrations")).sort();
for (const required of [
  "0008_menu_items.sql",
  "0009_erp_trigger_safety.sql",
])
  assert.ok(
    migrations.includes(required),
    `migration ${required} is missing`,
  );
const numbers = migrations.map((f) => Number(f.slice(0, 4)));
assert.ok(
  numbers.every((n, i) => i === 0 || n >= numbers[i - 1]),
  "migration filenames must be in non-decreasing numeric order",
);

// The ERP order trigger must be fault-tolerant: an ERP error cannot roll back
// order completion, so the re-declaration must wrap the body in a handler.
const trigger = readFileSync(
  join(root, "supabase/migrations/0009_erp_trigger_safety.sql"),
  "utf8",
);
assert.match(trigger, /create or replace function public\.erp_complete_order/);
assert.match(
  trigger,
  /exception when others then/,
  "erp_complete_order must swallow faults so orders are never blocked",
);

// ── Deploy wiring: env is forwarded, migrations listable ────────────────────
const sitesEnv = readFileSync(join(root, "scripts/sites-env.mjs"), "utf8");
assert.match(
  sitesEnv,
  /CLOUDFLARE_INCLUDE_PROCESS_ENV/,
  "local server needs process.env forwarded to the Worker",
);
assert.match(sitesEnv, /VAPID_PUBLIC_KEY/, "VAPID env must be forwarded");

console.log(
  "PASS: core→package import boundary, package contract exports, route contracts, deleted routes stay gone, migration numbering + ERP trigger fault tolerance, deploy env wiring",
);
