import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { buildPushPayload } from "@block65/webcrypto-web-push";

const root = new URL("../", import.meta.url);
const cafeId = "00000000-0000-4000-8000-000000000001";
const orderId = "00000000-0000-4000-8000-000000000002";
const userId = "00000000-0000-4000-8000-000000000003";
const timestamp = "2026-10-11T08:00:00.000Z";
const item = {
  id: "coffee",
  name: "Kahve",
  price: 19.99,
  available: true,
  category: "Kahveler",
  description: "",
};
const state = {
  packageEnabled: true,
  denied: false,
  cafeOwner: userId,
  order: null,
  inserted: null,
  notifications: 0,
  pushLookupError: false,
};

function query(table) {
  const conditions = [];
  let operation = "read",
    values;
  const execute = () => {
    if (table === "order_push_subscriptions")
      return { data: null, error: { code: "42P01" } };
    if (table === "cafes")
      return {
        data:
          state.cafeOwner === userId
            ? {
                id: cafeId,
                owner: userId,
                name: "Test",
                table_count: 4,
                data: { items: [item] },
              }
            : null,
        error: null,
      };
    if (operation === "insert") {
      state.inserted = values;
      return {
        data: { id: orderId, status: values.status, created_at: timestamp },
        error: null,
      };
    }
    if (operation === "update") {
      const matches = conditions.every(([kind, key, value]) =>
        kind === "eq"
          ? state.order?.[key] === value
          : state.order?.[key] !== value,
      );
      if (!matches) return { data: null, error: null };
      state.order = {
        ...state.order,
        ...values,
        updated_at: "2026-10-11T08:01:00.000Z",
      };
      return { data: state.order, error: null };
    }
    return { data: state.order, error: null };
  };
  const chain = {
    select() {
      return chain;
    },
    limit() {
      return chain;
    },
    eq(key, value) {
      conditions.push(["eq", key, value]);
      return chain;
    },
    neq(key, value) {
      conditions.push(["neq", key, value]);
      return chain;
    },
    insert(input) {
      operation = "insert";
      values = input;
      return chain;
    },
    update(input) {
      operation = "update";
      values = input;
      return chain;
    },
    maybeSingle: async () => execute(),
    single: async () => execute(),
    then(resolve, reject) {
      const result = execute();
      if (table === "orders" && operation === "read")
        result.data = state.order ? [state.order] : [];
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return chain;
}
globalThis.orderTest = {
  packageAllowed: (cafe) =>
    state.packageEnabled && cafe === cafeId ? { cafeId } : null,
  client: { from: query },
  owner: async () => {
    if (state.denied) throw new Error("UNAUTHORIZED");
    return userId;
  },
  notify: async () => {
    state.notifications++;
  },
  env: {},
};
const virtual = {
  "@/enterprise/server":
    "export const enterpriseAssignment=async(k,u,j,c)=>globalThis.orderTest.packageAllowed(c);",
  "@/db": "export const svc=()=>globalThis.orderTest.client;",
  "@/lib/server": `export const asUser=()=>globalThis.orderTest.client; export const owner=r=>globalThis.orderTest.owner(r); export const userJwt=()=>"test"; export const sameOrigin=r=>!r.headers.get("origin")||r.headers.get("origin")===new URL(r.url).origin; export const fail=e=>Response.json({error:e.message},{status:e.message==="UNAUTHORIZED"?401:500});`,
  "@/lib/order-push":
    "export const notifyNewOrder=o=>globalThis.orderTest.notify(o);",
  "@/lib/jwt": "export const env=k=>globalThis.orderTest.env[k];",
};
registerHooks({
  resolve(specifier, context, next) {
    if (virtual[specifier])
      return next(
        `data:text/javascript,${encodeURIComponent(virtual[specifier])}`,
        context,
      );
    if (specifier.startsWith("@/")) {
      let url = new URL(`${specifier.slice(2)}.ts`, root);
      if (!existsSync(url))
        url = new URL(`${specifier.slice(2)}/index.ts`, root);
      return next(url.href, context);
    }
    return next(specifier, context);
  },
});

const { manualOrderSchema, manualOrderLines } =
  await import("../enterprise/extensions/package-a/orders.ts");
const { orderTotal } = await import("../lib/orders.ts");
const { POST } =
  await import("../app/api/enterprise/package-a/orders/manual/route.ts");
const defaultRoute = await import("../app/api/orders/[id]/route.ts");
const { PUT } = defaultRoute;
assert.equal(typeof defaultRoute.PATCH, "function"); // Discounts only; never manual product edits.
const { PATCH } =
  await import("../app/api/enterprise/package-a/orders/[id]/route.ts");
const { allowedPushEndpoint, notifyNewOrder } =
  await import("../lib/order-push.ts");
const input = { cafe: cafeId, table: 2, items: [{ id: item.id, quantity: 3 }] };
const req = (body, method = "POST", origin = "https://example.com") =>
  new Request("https://example.com/api/orders/manual", {
    method,
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
const context = { params: Promise.resolve({ id: orderId }) };

assert.equal(
  orderTotal(manualOrderLines(manualOrderSchema.parse(input), [item])),
  59.97,
);
assert.equal(
  manualOrderSchema.safeParse({
    ...input,
    items: [...input.items, ...input.items],
  }).success,
  false,
);
assert.equal(
  manualOrderSchema.safeParse({
    ...input,
    items: [{ id: item.id, quantity: 0 }],
  }).success,
  false,
);
assert.equal(
  manualOrderSchema.safeParse({
    ...input,
    items: [{ id: item.id, quantity: 1, unitPrice: -1 }],
  }).success,
  false,
);
const historical = [
  { id: "removed", name: "Eski ürün", quantity: 1, unitPrice: 8.5 },
];
assert.equal(
  manualOrderLines(
    { ...input, items: [{ id: "removed", quantity: 2 }] },
    [],
    historical,
  )[0].unitPrice,
  8.5,
);
assert.throws(
  () =>
    manualOrderLines({ ...input, items: [{ id: "unknown", quantity: 1 }] }, [
      item,
    ]),
  /UNKNOWN_PRODUCT/,
);
state.denied = true;
assert.equal((await POST(req(input))).status, 401);
state.denied = false;
state.packageEnabled = false;
assert.equal((await POST(req(input))).status, 403);
assert.equal(
  (
    await PATCH(
      req({ ...input, expectedUpdatedAt: timestamp }, "PATCH"),
      context,
    )
  ).status,
  403,
);
state.packageEnabled = true;
assert.equal(
  (await POST(req({ ...input, cafe: "00000000-0000-4000-8000-000000000099" })))
    .status,
  403,
);
state.cafeOwner = "someone-else";
assert.equal((await POST(req(input))).status, 404);
state.cafeOwner = userId;
assert.equal(
  (await POST(req(input, "POST", "https://evil.example"))).status,
  403,
);
assert.equal((await POST(req({ ...input, table: 5 }))).status, 400);
assert.equal((await POST(req(input))).status, 201);
assert.equal(state.inserted.total, 59.97);
assert.equal(state.notifications, 1);
state.order = {
  id: orderId,
  cafe: cafeId,
  status: "waiting",
  items: [item],
  updated_at: timestamp,
};
const edit = {
  ...input,
  status: "delivered",
  expectedUpdatedAt: timestamp,
  items: [{ id: item.id, quantity: 2, unitPrice: 10.15 }],
};
assert.equal((await PATCH(req(edit, "PATCH"), context)).status, 200);
assert.equal(state.order.total, 20.3);
assert.equal((await PATCH(req(edit, "PATCH"), context)).status, 409);
state.order.status = "completed";
assert.equal(
  (
    await PATCH(
      req({ ...edit, expectedUpdatedAt: state.order.updated_at }, "PATCH"),
      context,
    )
  ).status,
  409,
);
assert.equal(
  (await PUT(req({ status: "delivered" }, "PUT"), context)).status,
  409,
);
// Settlement is a separate shared operation, not a backdoor for manual edits.
state.order = {
  id: orderId,
  cafe: cafeId,
  status: "delivered",
  items: [{ id: item.id, name: item.name, quantity: 3, unitPrice: 10 }],
  total: 30,
  updated_at: timestamp,
};
assert.equal(
  (
    await PUT(
      req({ status: "completed", expectedUpdatedAt: timestamp }, "PUT"),
      context,
    )
  ).status,
  400,
);
assert.equal(
  (
    await defaultRoute.PATCH(
      req({ expectedUpdatedAt: timestamp, receiptDiscount: 31 }, "PATCH"),
      context,
    )
  ).status,
  400,
);
assert.equal(
  (
    await defaultRoute.PATCH(
      req(
        {
          expectedUpdatedAt: timestamp,
          adjustments: [
            { id: "foreign", complimentaryQuantity: 0, discountAmount: 1 },
          ],
        },
        "PATCH",
      ),
      context,
    )
  ).status,
  400,
);
assert.equal(
  (
    await defaultRoute.PATCH(
      req(
        {
          expectedUpdatedAt: timestamp,
          items: [{ id: "forged", quantity: 99, unitPrice: 0 }],
          total: 0,
          receiptDiscount: 5,
        },
        "PATCH",
      ),
      context,
    )
  ).status,
  200,
);
assert.equal(state.order.total, 25);
assert.equal(state.order.items[0].id, item.id);
assert.equal(
  (
    await PUT(
      req(
        {
          status: "completed",
          paymentMethod: "card",
          expectedUpdatedAt: timestamp,
        },
        "PUT",
      ),
      context,
    )
  ).status,
  409,
);
assert.equal(
  (
    await PUT(
      req(
        {
          status: "completed",
          paymentMethod: "card",
          expectedUpdatedAt: state.order.updated_at,
          receiptDiscount: 5,
          adjustments: [
            { id: item.id, complimentaryQuantity: 1, discountAmount: 0 },
          ],
        },
        "PUT",
      ),
      context,
    )
  ).status,
  200,
);
assert.equal(state.order.total, 15);
assert.equal(state.order.payment_method, "card");
assert.equal(state.order.items[0].quantity, 3);
assert.equal(
  (
    await defaultRoute.PATCH(
      req({ expectedUpdatedAt: state.order.updated_at }, "PATCH"),
      context,
    )
  ).status,
  409,
);
assert.equal(
  allowedPushEndpoint("https://fcm.googleapis.com/fcm/send/test"),
  true,
);
assert.equal(
  allowedPushEndpoint(
    "https://updates.push.services.mozilla.com/wpush/v2/test",
  ),
  true,
);
for (const endpoint of [
  "http://fcm.googleapis.com/test",
  "https://127.0.0.1/test",
  "https://fcm.googleapis.com.evil.example/test",
  "https://user:pass@web.push.apple.com/test",
  "https://web.push.apple.com:8443/test",
])
  assert.equal(allowedPushEndpoint(endpoint), false);
globalThis.orderTest.env = {
  VAPID_PUBLIC_KEY: "test",
  VAPID_PRIVATE_KEY: "test",
  VAPID_SUBJECT: "https://example.com",
};
await assert.doesNotReject(() =>
  notifyNewOrder({
    id: orderId,
    cafeId,
    ownerId: userId,
    cafeName: "Test",
    tableNo: 2,
    total: 1,
  }),
);
const vapidPair = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);
const browserPair = await crypto.subtle.generateKey(
  { name: "ECDH", namedCurve: "P-256" },
  true,
  ["deriveBits"],
);
const key64 = async (key) =>
  Buffer.from(await crypto.subtle.exportKey("raw", key)).toString("base64url");
const encrypted = await buildPushPayload(
  {
    data: JSON.stringify({ title: "Yeni sipariş", orderId }),
    options: { ttl: 300, urgency: "high" },
  },
  {
    endpoint: "https://fcm.googleapis.com/fcm/send/test",
    expirationTime: null,
    keys: {
      p256dh: await key64(browserPair.publicKey),
      auth: Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString(
        "base64url",
      ),
    },
  },
  {
    publicKey: await key64(vapidPair.publicKey),
    privateKey: (await crypto.subtle.exportKey("jwk", vapidPair.privateKey)).d,
    subject: "https://example.com",
  },
);
const headers = new Headers(encrypted.headers);
assert.equal(headers.get("content-encoding"), "aes128gcm");
assert.ok(headers.get("authorization").startsWith("vapid "));
assert.equal(headers.get("urgency"), "high");

// Actual service-worker code, without contacting a device or creating orders.
const handlers = {},
  notifications = [],
  opened = [];
runInNewContext(
  readFileSync(
    new URL("../public/order-notifications-sw.js", import.meta.url),
    "utf8",
  ),
  {
    URL,
    setTimeout,
    clearTimeout,
    MessageChannel,
    self: {
      location: { origin: "https://example.com" },
      addEventListener: (name, handler) => {
        handlers[name] = handler;
      },
      clients: {
        matchAll: async () => [],
        openWindow: async (url) => opened.push(url),
      },
      registration: {
        showNotification: async (title, options) =>
          notifications.push({ title, options }),
      },
    },
  },
);
let pending;
handlers.push({
  data: {
    json: () => ({
      title: "Test · Yeni sipariş",
      body: "Masa 2",
      orderId,
      cafeId,
      url: `/?view=orders&cafe=${cafeId}`,
    }),
  },
  waitUntil: (job) => {
    pending = job;
  },
});
await pending;
assert.equal(notifications[0].options.silent, false);
assert.equal(notifications[0].options.tag, `order-${orderId}`);
handlers.notificationclick({
  notification: { close() {}, data: notifications[0].options.data },
  waitUntil: (job) => {
    pending = job;
  },
});
await pending;
assert.ok(opened[0].includes(`cafe=${cafeId}`));
handlers.notificationclick({
  notification: { close() {}, data: { url: "https://evil.example" } },
  waitUntil: (job) => {
    pending = job;
  },
});
await pending;
assert.equal(opened.length, 1);
console.log(
  "PASS: order totals, legacy prices, invalid/duplicate lines, ownership, CSRF, manual save, edit conflicts, completed lock, push endpoint validation, graceful notification failure, encrypted Web Push, background notification and click routing",
);
