import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
const root = new URL("../", import.meta.url);
const user = "00000000-0000-4000-8000-000000000001",
  cafe = "00000000-0000-4000-8000-000000000002",
  admin = "00000000-0000-4000-8000-000000000003";
const state = {
  admin: true,
  missing: false,
  writes: 0,
  rows: {
    cafes: [{ id: cafe, owner: user, name: "Test Kafe" }],
    enterprise_assignments: [],
    account_module_grants: [],
  },
};
function from(table) {
  const filters = [];
  let operation = "read",
    values,
    start = 0,
    end = 999;
  const execute = () => {
    if (state.missing && table !== "cafes")
      return { data: null, error: { code: "42P01" } };
    let rows = state.rows[table];
    if (operation === "upsert") {
      let row = rows.find((entry) =>
        table === "enterprise_assignments"
          ? entry.cafe_id === values.cafe_id &&
            entry.package_key === values.package_key
          : entry.user_id === values.user_id &&
            entry.module_key === values.module_key,
      );
      if (row) Object.assign(row, values);
      else {
        row = {
          id: crypto.randomUUID(),
          updated_at: new Date().toISOString(),
          ...values,
        };
        rows.push(row);
      }
      state.writes++;
    } else if (operation === "update") {
      for (const row of rows.filter((row) =>
        filters.every(([key, value]) => row[key] === value),
      ))
        Object.assign(row, values);
      state.writes++;
    }
    return {
      data: rows
        .filter((row) => filters.every(([key, value]) => row[key] === value))
        .slice(start, end + 1),
      error: null,
    };
  };
  const chain = {
    select() {
      return chain;
    },
    eq(key, value) {
      filters.push([key, value]);
      return chain;
    },
    order() {
      return chain;
    },
    range(a, b) {
      start = a;
      end = b;
      return chain;
    },
    upsert(input) {
      operation = "upsert";
      values = input;
      return chain;
    },
    update(input) {
      operation = "update";
      values = input;
      return chain;
    },
    async maybeSingle() {
      const result = execute();
      return { ...result, data: result.data?.[0] ?? null };
    },
    then(resolve, reject) {
      return Promise.resolve(execute()).then(resolve, reject);
    },
  };
  return chain;
}
globalThis.accessTest = {
  client: { from },
  admin: () => (state.admin ? { id: admin } : null),
};
const stubs = {
  "@/db":
    "export const svc=()=>globalThis.accessTest.client;export const asUser=()=>globalThis.accessTest.client;",
  "@/lib/jwt":
    "export const verifyAdmin=async()=>globalThis.accessTest.admin();",
  "@/lib/server":
    "export const sameOrigin=r=>r.headers.get('origin')===new URL(r.url).origin;export const fail=e=>Response.json({error:e.message},{status:500});",
};
registerHooks({
  resolve(specifier, context, next) {
    if (stubs[specifier])
      return next(
        `data:text/javascript,${encodeURIComponent(stubs[specifier])}`,
        context,
      );
    if (specifier.startsWith("@/")) {
      let url = new URL(`${specifier.slice(2)}.ts`, root);
      if (!existsSync(url))
        url = new URL(`${specifier.slice(2)}/index.ts`, root);
      return next(url.href, context);
    }
    if (
      specifier.startsWith(".") &&
      context.parentURL?.endsWith(".ts") &&
      !specifier.endsWith(".ts")
    ) {
      const url = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(url)) return next(url.href, context);
    }
    return next(specifier, context);
  },
});
const { GET, POST } = await import("../app/api/admin/entitlements/route.ts");
const { enterpriseAssignment } = await import("../enterprise/server.ts");
const { hasAccountModule } = await import("../lib/module-access.ts");
const request = (body, origin = "https://example.com") =>
  new Request(
    "https://example.com/api/admin/entitlements",
    body
      ? {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
const input = {
  action: "assign",
  kind: "enterprise",
  key: "package-a",
  cafeId: cafe,
  expiresAt: null,
};
state.admin = false;
assert.equal((await GET(request())).status, 403);
assert.equal((await POST(request(input))).status, 403);
assert.equal(state.writes, 0);
state.admin = true;
assert.equal((await POST(request(input, "https://evil.example"))).status, 403);
assert.equal((await POST(request({ ...input, key: "unknown" }))).status, 400);
assert.equal(
  (await POST(request({ ...input, expiresAt: "2020-01-01T00:00:00Z" }))).status,
  400,
);
assert.equal(
  (
    await POST(
      request({ ...input, cafeId: "00000000-0000-4000-8000-000000000099" }),
    )
  ).status,
  404,
);
assert.equal(
  (await POST(request({ ...input, userId: "someone-else" }))).status,
  200,
);
assert.equal(state.rows.enterprise_assignments[0].user_id, user);
assert.equal(state.rows.enterprise_assignments[0].updated_by, admin);
assert.ok(await enterpriseAssignment("package-a", user, "test", cafe));
assert.equal(
  (await POST(request({ ...input, kind: "module", key: "erp" }))).status,
  200,
);
assert.equal(state.rows.account_module_grants[0].user_id, user);
assert.equal(await hasAccountModule(user, "erp"), true);
const summary = await (await GET(request())).json();
assert.equal(summary.configured, true);
assert.equal(summary.enterprise.length, 1);
assert.equal(summary.modulesAssigned.length, 1);
const id = state.rows.enterprise_assignments[0].id;
assert.equal(
  (await POST(request({ action: "revoke", kind: "enterprise", id }))).status,
  200,
);
assert.equal(await enterpriseAssignment("package-a", user, "test", cafe), null);
assert.equal(state.rows.account_module_grants[0].status, "active");
assert.equal((await POST(request(input))).status, 200);
assert.equal(state.rows.enterprise_assignments.length, 1);
assert.equal(state.rows.enterprise_assignments[0].id, id);
state.rows.enterprise_assignments[0].expires_at = "2020-01-01T00:00:00Z";
assert.equal(await enterpriseAssignment("package-a", user, "test", cafe), null);
state.missing = true;
assert.equal((await (await GET(request())).json()).configured, false);
assert.equal((await POST(request(input))).status, 503);
assert.equal(await enterpriseAssignment("package-a", user, "test", cafe), null);
console.log(
  "PASS: admin-only grants, CSRF, catalog validation, expiration, trusted cafe owner, independent module grant, revoke/reassign, immediate access checks, setup-required response",
);
