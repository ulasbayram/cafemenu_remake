import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
const root = new URL("../", import.meta.url);
const userA = "00000000-0000-4000-8000-000000000001",
  userB = "00000000-0000-4000-8000-000000000002";
const cafeA = "00000000-0000-4000-8000-000000000003",
  cafeB = "00000000-0000-4000-8000-000000000004";
const assignments = [
  { userId: userA, cafeId: cafeA },
  { userId: userB, cafeId: cafeB },
];
const now = new Date(),
  day = now.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
const state = {
  uid: userA,
  denied: false,
  config: JSON.stringify(assignments),
  queries: [],
  rows: {
    cafes: [
      {
        id: cafeA,
        owner: userA,
        name: "Ortak Kafe",
        data: { items: [] },
        table_count: 12,
      },
      {
        id: cafeB,
        owner: userB,
        name: "Nova Kafe",
        data: { items: [] },
        table_count: 8,
      },
    ],
    orders: [
      {
        id: "a",
        cafe: cafeA,
        table_no: 1,
        total: 100,
        status: "waiting",
        created_at: now.toISOString(),
      },
      {
        id: "b",
        cafe: cafeB,
        table_no: 2,
        total: 200,
        status: "waiting",
        created_at: now.toISOString(),
      },
    ],
    visits: [
      { cafe: cafeA, day, hour: 12 },
      { cafe: cafeB, day, hour: 13 },
    ],
  },
};
Object.defineProperty(state.rows, "enterprise_assignments", {
  get: () =>
    JSON.parse(state.config).map((row) => ({
      user_id: row.userId,
      cafe_id: row.cafeId,
      package_key: "package-a",
      status: "active",
      expires_at: null,
    })),
});
function from(table) {
  const filters = [];
  state.queries.push({ table, filters });
  let start = 0,
    end = 999;
  const read = () => ({
    data: state.rows[table]
      .filter((row) => filters.every(([key, value]) => row[key] === value))
      .slice(start, end + 1),
    error: null,
  });
  const chain = {
    select() {
      return chain;
    },
    eq(key, value) {
      filters.push([key, value]);
      return chain;
    },
    gte() {
      return chain;
    },
    lte() {
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
    async maybeSingle() {
      const result = read();
      return { ...result, data: result.data[0] ?? null };
    },
    then(resolve, reject) {
      return Promise.resolve(read()).then(resolve, reject);
    },
  };
  return chain;
}
globalThis.enterpriseTest = {
  client: { from },
  env: () => state.config,
  owner: async () => {
    if (state.denied) throw new Error("UNAUTHORIZED");
    return state.uid;
  },
};
const stubs = {
  "@/db":
    "export const asUser=()=>globalThis.enterpriseTest.client;export const svc=()=>globalThis.enterpriseTest.client;",
  "@/lib/jwt": "export const env=k=>globalThis.enterpriseTest.env(k);",
  "@/lib/server":
    'export const asUser=()=>globalThis.enterpriseTest.client;export const owner=r=>globalThis.enterpriseTest.owner(r);export const userJwt=()=>"test";export const fail=e=>Response.json({error:e.message},{status:e.message==="UNAUTHORIZED"?401:500});',
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
const { extensionAssignments, extensionAssignment } =
  await import("../enterprise/registry.ts");
const { enterpriseAssignment, visibleEnterpriseExtensions } =
  await import("../enterprise/server.ts");
const { GET } = await import("../app/api/enterprise/package-a/route.ts");
const { previewData } =
  await import("../enterprise/extensions/package-a/preview-data.ts");
const records = assignments.map((row) => ({
  user_id: row.userId,
  cafe_id: row.cafeId,
  package_key: "package-a",
  status: "active",
  expires_at: null,
}));
assert.equal(extensionAssignments("package-a", userA, records).length, 1);
assert.equal(extensionAssignment("package-a", userA, cafeB, records), null);
assert.equal(extensionAssignment("package-a", userB, cafeA, records), null);
assert.equal(extensionAssignment("package-a", userA, undefined, []), null);
assert.equal(
  extensionAssignment("package-a", userA, undefined, [
    ...records,
    { ...records[1], user_id: userA },
  ]),
  null,
);
assert.equal(
  extensionAssignment("package-a", userA, cafeA, [
    { ...records[0], status: "revoked" },
  ]),
  null,
);
assert.equal(
  extensionAssignment("package-a", userA, cafeA, [
    { ...records[0], expires_at: "2020-01-01T00:00:00Z" },
  ]),
  null,
);
assert.equal(
  extensionAssignment("package-a", userA, cafeA, records).cafeId,
  cafeA,
);
const request = (id) =>
  new Request(
    `https://example.com/api/enterprise/package-a${id ? `?cafe=${id}` : ""}`,
  );
state.denied = true;
assert.equal((await GET(request(cafeA))).status, 401);
state.denied = false;
assert.equal((await GET(request(cafeB))).status, 403);
let response = await GET(request(cafeA));
assert.equal(response.status, 200);
let payload = await response.json();
assert.equal(payload.cafe.id, cafeA);
assert.ok(payload.orders.every((row) => row.cafe === cafeA));
assert.ok(payload.visits.every((row) => row.cafe === cafeA));
assert.equal(JSON.stringify(payload).includes("Nova Kafe"), false);
for (const query of state.queries.filter((query) =>
  ["orders", "visits"].includes(query.table),
))
  assert.ok(
    query.filters.some(([key, value]) => key === "cafe" && value === cafeA),
  );
assert.equal((await visibleEnterpriseExtensions(userA, "test")).length, 1);
state.config = JSON.stringify([{ userId: userA, cafeId: cafeB }]);
assert.equal(
  await enterpriseAssignment("package-a", userA, "test", cafeB),
  null,
);
assert.equal((await visibleEnterpriseExtensions(userA, "test")).length, 0);
state.config = JSON.stringify(assignments);
state.uid = userB;
response = await GET(request(cafeB));
payload = await response.json();
assert.equal(payload.cafe.id, cafeB);
assert.ok(payload.orders.every((row) => row.cafe === cafeB));
assert.equal(JSON.stringify(payload).includes("Ortak Kafe"), false);
for (const scenario of ["ortak", "nova"]) {
  const data = previewData(scenario);
  assert.equal(data.cafe.id, `preview-${scenario}`);
  assert.ok(data.orders.every((row) => row.cafe === data.cafe.id));
  assert.ok(data.visits.every((row) => row.cafe === data.cafe.id));
}
console.log(
  "PASS: same package with separate cafe scopes, unauthenticated access, cross-customer denial, misassigned ownership, explicit scope on data queries, separate preview accounts",
);
