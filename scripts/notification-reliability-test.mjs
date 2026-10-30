import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const root = new URL("../", import.meta.url);
const state = {
  env: {},
  offline: false,
  records: [],
  user: "owner-a",
  denied: false,
  dbError: null,
  fetches: [],
  status: 201,
};
function query() {
  let op = "read",
    value;
  const filters = [];
  const run = () => {
    if (state.dbError) return { data: null, error: state.dbError };
    const matches = (r) => filters.every(([k, v]) => r[k] === v);
    if (op === "upsert") {
      state.records = state.records.filter(
        (r) => r.endpoint !== value.endpoint,
      );
      state.records.push(value);
    }
    if (op === "delete")
      state.records = state.records.filter((r) => !matches(r));
    return { data: state.records.filter(matches), error: null };
  };
  const chain = {
    select() {
      return chain;
    },
    eq(k, v) {
      filters.push([k, v]);
      return chain;
    },
    limit() {
      return chain;
    },
    upsert(v) {
      op = "upsert";
      value = v;
      return chain;
    },
    delete() {
      op = "delete";
      return chain;
    },
    async maybeSingle() {
      const r = run();
      return { ...r, data: r.data?.[0] ?? null };
    },
    then(resolve, reject) {
      return Promise.resolve(run()).then(resolve, reject);
    },
  };
  return chain;
}
globalThis.notificationTest = {
  state,
  query,
  api: async () => {
    if (state.offline) throw new Error("Temporary network failure");
    return { ok: true };
  },
};
const virtual = {
  "@/db": "export const svc=()=>({from:globalThis.notificationTest.query});",
  "@/lib/jwt": "export const env=k=>globalThis.notificationTest.state.env[k];",
  "@/lib/server": `export const owner=async()=>{if(globalThis.notificationTest.state.denied)throw Error('UNAUTHORIZED');return globalThis.notificationTest.state.user;};export const sameOrigin=r=>!r.headers.get('origin')||r.headers.get('origin')===new URL(r.url).origin;export const fail=e=>Response.json({error:e.message},{status:e.message==='UNAUTHORIZED'?401:500});`,
};
registerHooks({
  resolve(s, c, next) {
    if (
      s === "./client-api" &&
      c.parentURL?.includes("order-notifications-client")
    )
      return next(
        "data:text/javascript,export const api=(...a)=>globalThis.notificationTest.api(...a);",
        c,
      );
    if (virtual[s])
      return next("data:text/javascript," + encodeURIComponent(virtual[s]), c);
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
const b64 = (b) => Buffer.from(b).toString("base64url");
const pair = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);
const publicKey = b64(await crypto.subtle.exportKey("raw", pair.publicKey));
const privateKey = (await crypto.subtle.exportKey("jwk", pair.privateKey)).d;
state.env = {
  VAPID_PUBLIC_KEY: publicKey,
  VAPID_PRIVATE_KEY: privateKey,
  VAPID_SUBJECT: "https://example.com",
};
const { allowedPushEndpoint, validPushConfiguration } =
  await import("../lib/order-push.ts");
assert.equal(allowedPushEndpoint("https://region.push.apple.com/token"), true);
assert.equal(
  allowedPushEndpoint("https://region.push.apple.com.evil.example/token"),
  false,
);
assert.equal(
  await validPushConfiguration({
    publicKey,
    privateKey,
    subject: "https://example.com",
  }),
  true,
);
assert.equal(
  await validPushConfiguration({
    publicKey,
    privateKey,
    subject: "https://localhost",
  }),
  false,
);
const other = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);
assert.equal(
  await validPushConfiguration({
    publicKey,
    privateKey: (await crypto.subtle.exportKey("jwk", other.privateKey)).d,
    subject: "https://example.com",
  }),
  false,
);
const browser = await crypto.subtle.generateKey(
  { name: "ECDH", namedCurve: "P-256" },
  true,
  ["deriveBits"],
);
const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/test-device",
  keys: {
    p256dh: b64(await crypto.subtle.exportKey("raw", browser.publicKey)),
    auth: b64(crypto.getRandomValues(new Uint8Array(16))),
  },
};
const route = await import("../app/api/order-notifications/route.ts");
const req = (body, origin = "https://example.com") =>
  new Request("https://example.com/api/order-notifications", {
    method: body ? "POST" : "GET",
    headers: { origin, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
let r = await route.GET(req());
assert.equal(r.status, 200);
const configuration = await r.json();
assert.equal(configuration.configured, true);
assert.equal(JSON.stringify(configuration).includes(privateKey), false);
state.dbError = { code: "42P01" };
assert.equal(
  (await (await route.GET(req())).json()).reason,
  "PUSH_DATABASE_MISSING",
);
state.dbError = null;
state.denied = true;
assert.equal((await route.POST(req(subscription))).status, 401);
state.denied = false;
assert.equal(
  (await route.POST(req(subscription, "https://evil.example"))).status,
  403,
);
assert.equal(
  (await route.POST(req({ ...subscription, endpoint: "https://127.0.0.1" })))
    .status,
  400,
);
assert.equal((await route.POST(req(subscription))).status, 200);
assert.equal(state.records[0].user_id, "owner-a");
const originalFetch = globalThis.fetch;
globalThis.fetch = async (endpoint, options) => {
  state.fetches.push({
    endpoint,
    headers: new Headers(options.headers),
    redirect: options.redirect,
  });
  // Cloudflare Workers throws on redirect:"error" at runtime; assert the
  // request only ever uses a mode the edge accepts.
  if (options.redirect !== undefined && !["follow", "manual"].includes(options.redirect))
    throw new TypeError(
      `Invalid redirect value ${JSON.stringify(options.redirect)}; Workers accepts only "follow" or "manual"`,
    );
  return new Response(null, { status: state.status });
};
try {
  state.user = "owner-b";
  assert.equal(
    (await route.POST(req({ action: "test", endpoint: subscription.endpoint })))
      .status,
    404,
  );
  assert.equal(state.fetches.length, 0);
  state.user = "owner-a";
  assert.equal(
    (await route.POST(req({ action: "test", endpoint: subscription.endpoint })))
      .status,
    200,
  );
  assert.equal(state.fetches.length, 1);
  assert.equal(state.fetches[0].headers.get("urgency"), "high");
  assert.equal(state.fetches[0].headers.get("ttl"), "3600");
  state.status = 403;
  assert.equal(
    (await route.POST(req({ action: "test", endpoint: subscription.endpoint })))
      .status,
    502,
  );
  // 403/401 mean the server's VAPID credentials no longer match this
  // subscription. The row is unusable and must be dropped, not preserved.
  assert.equal(
    state.records.length,
    0,
    "403 must delete the unusable row",
  );
  // Re-register, then prove a 401 is handled the same way as 403.
  assert.equal((await route.POST(req(subscription))).status, 200);
  assert.equal(state.records.length, 1);
  state.status = 401;
  const stale = await route.POST(
    req({ action: "test", endpoint: subscription.endpoint }),
  );
  assert.equal(stale.status, 502);
  assert.match(
    (await stale.json()).error,
    /PUSH_TEST_STALE/,
    "401 must be reported as a stale registration, not a generic failure",
  );
  assert.equal(
    state.records.length,
    0,
    "a stale registration must be deleted so the device re-registers",
  );
  assert.equal((await route.POST(req(subscription))).status, 200);
  state.status = 410;
  assert.equal(
    (await route.POST(req({ action: "test", endpoint: subscription.endpoint })))
      .status,
    502,
  );
  assert.equal(state.records.length, 0);

  // The real order path (notifyNewOrder) must apply the same lifecycle rules.
  // Mocked svc() + mocked fetch: nothing leaves this process.
  const { notifyNewOrder } = await import("../lib/order-push.ts");
  const order = {
    id: "order-1",
    cafeId: "cafe-1",
    cafeName: "Test Kafe",
    ownerId: "owner-a",
    tableNo: 3,
    total: 120,
  };
  // The table stores the subscription object as jsonb (written by POST).
  const row = () => ({
    endpoint: subscription.endpoint,
    subscription,
    user_id: "owner-a",
  });

  state.records = [row()];
  state.status = 201;
  const before = state.fetches.length;
  await notifyNewOrder(order);
  assert.equal(
    state.fetches.length - before,
    1,
    "an order attempts exactly one delivery per subscription",
  );
  assert.equal(
    state.records.length,
    1,
    "an accepted delivery keeps the subscription",
  );

  state.status = 410;
  await notifyNewOrder(order);
  assert.equal(state.records.length, 0, "410 removes the subscription");

  // 401 (VAPID key mismatch) is the production failure: it must also remove
  // the row, otherwise the device stays broken forever.
  state.records = [row()];
  state.status = 401;
  await notifyNewOrder(order);
  assert.equal(
    state.records.length,
    0,
    "401 (VAPID mismatch) removes the subscription so the device re-registers",
  );

  // A transient provider error must NOT destroy a valid subscription.
  state.records = [row()];
  state.status = 500;
  await notifyNewOrder(order);
  assert.equal(
    state.records.length,
    1,
    "a transient provider error keeps the subscription",
  );
} finally {
  globalThis.fetch = originalFetch;
  state.records = [];
}

// Real client implementation, with simulated browser services. Never subscribes
// the host computer or sends anything to a real push provider.
const events = [];
let unsubscribed = 0,
  nativeSubscription = null,
  subscribeError = null;
const native = (key) => ({
  endpoint: subscription.endpoint,
  options: { applicationServerKey: key },
  toJSON: () => subscription,
  unsubscribe: async () => {
    unsubscribed++;
    nativeSubscription = null;
    return true;
  },
});
const registration = {
  active: { state: "activated" },
  pushManager: {
    getSubscription: async () => nativeSubscription,
    subscribe: async (options) => {
      events.push("subscribe");
      if (subscribeError) throw subscribeError;
      nativeSubscription = native(options.applicationServerKey);
      return nativeSubscription;
    },
  },
};
const notification = {
  permission: "default",
  requestPermission: async () => {
    events.push("permission");
    notification.permission = "granted";
    return "granted";
  },
};
globalThis.window = {
  isSecureContext: true,
  Notification: notification,
  PushManager: function () {},
  matchMedia: () => ({ matches: false }),
};
globalThis.Notification = notification;
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    userAgent: "Chrome Android",
    platform: "Linux",
    maxTouchPoints: 1,
    serviceWorker: {
      register: async () => {
        events.push("worker");
        return registration;
      },
      getRegistration: async () => registration,
    },
  },
});
const client = await import("../lib/order-notifications-client.ts");
await client.enableOrderPush(publicKey);
assert.ok(events.indexOf("permission") < events.indexOf("worker"));
assert.ok(nativeSubscription);
state.offline = true;
await assert.rejects(() => client.enableOrderPush(publicKey), /PUSH_SAVE/);
assert.equal(unsubscribed, 0);
assert.ok(nativeSubscription);
await assert.rejects(() => client.syncOrderPush(publicKey));
assert.equal(unsubscribed, 0);
state.offline = false;
assert.equal(await client.syncOrderPush(publicKey), true);
const newKey = b64(await crypto.subtle.exportKey("raw", other.publicKey));
await client.enableOrderPush(newKey);
assert.equal(unsubscribed, 1);
assert.equal(
  client.matchesPushKey(
    nativeSubscription,
    client.applicationServerKey(newKey),
  ),
  true,
);
notification.permission = "denied";
const oldEvents = events.length;
await assert.rejects(
  () => client.enableOrderPush(newKey),
  /PUSH_PERMISSION_DENIED/,
);
assert.equal(events.length, oldEvents);
notification.permission = "granted";
nativeSubscription = null;
subscribeError = Object.assign(
  new Error("Registration failed - push service error"),
  { name: "AbortError" },
);
await assert.rejects(
  () => client.enableOrderPush(newKey),
  /PUSH_SUBSCRIBE_ABORTERROR/,
);
subscribeError = null;
await assert.rejects(() => client.enableOrderPush("bad"), /PUSH_CONFIG_KEY/);
delete window.Notification;
assert.equal(client.supportsOrderPush(), false);
await assert.rejects(() => client.enableOrderPush(newKey), /PUSH_UNSUPPORTED/);
const { orderPushDevice } = await import("../lib/pwa-install.ts");
navigator.userAgent = "iPhone Safari";
navigator.standalone = false;
assert.deepEqual(orderPushDevice(), { ios: true, installed: false });
navigator.standalone = true;
assert.equal(orderPushDevice().installed, true);

// Activation waits for this worker instead of an unrelated global ready promise.
const registrationSource = ts.transpileModule(
  readFileSync(
    new URL("../lib/order-push-registration.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
function workerContext() {
  let timeout, listener;
  const worker = {
    state: "installing",
    addEventListener: (name, fn) => {
      listener = fn;
    },
    removeEventListener() {},
  };
  const reg = {
    active: null,
    installing: worker,
    addEventListener() {},
    removeEventListener() {},
  };
  const exports = {};
  runInNewContext(registrationSource, {
    exports,
    window: { isSecureContext: true },
    navigator: { serviceWorker: { register: async () => reg } },
    setTimeout: (fn) => {
      timeout = fn;
      return 1;
    },
    clearTimeout() {},
  });
  return {
    exports,
    reg,
    worker,
    stateChanged: () => listener?.(),
    timeout: () => timeout?.(),
  };
}
let context = workerContext();
let activation = context.exports.prepareOrderWorker();
await new Promise(setImmediate);
context.worker.state = "activated";
context.reg.active = context.worker;
context.stateChanged();
assert.equal(await activation, context.reg);
context = workerContext();
activation = context.exports.prepareOrderWorker();
await new Promise(setImmediate);
context.timeout();
await assert.rejects(() => activation, /PUSH_WORKER_TIMEOUT/);

// Execute the shipped worker: locked/unfocused/failed pages never suppress the
// OS alert; malformed payloads still get a visible notification (Safari rule).
const handlers = {},
  shown = [],
  opened = [];
let windows = [],
  enumerationFails = false,
  skip = 0,
  claim = 0;
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
      addEventListener: (n, fn) => (handlers[n] = fn),
      skipWaiting: async () => skip++,
      clients: {
        claim: async () => claim++,
        matchAll: async () => {
          if (enumerationFails) throw Error("suspended");
          return windows;
        },
        openWindow: async (url) => opened.push(url),
      },
      registration: {
        showNotification: async (title, options) =>
          shown.push({ title, options }),
      },
    },
  },
);
async function dispatch(name, fields = {}) {
  let job;
  handlers[name]({ ...fields, waitUntil: (p) => (job = p) });
  await job;
}
await dispatch("install");
await dispatch("activate");
assert.equal(skip, 1);
assert.equal(claim, 1);
assert.equal(handlers.fetch, undefined);
const data = {
  json: () => ({
    orderId: "new-order",
    cafeId: "cafe-a",
    title: "Order",
    url: "/?view=orders",
  }),
};
windows = [
  {
    visibilityState: "hidden",
    focused: false,
    postMessage: () => {
      throw Error("must not query a suspended window");
    },
  },
];
await dispatch("push", { data });
assert.equal(shown.at(-1).options.silent, false);
windows = [{ visibilityState: "visible", focused: false }];
await dispatch("push", { data });
assert.equal(shown.at(-1).options.silent, false);
enumerationFails = true;
await dispatch("push", { data });
assert.equal(shown.at(-1).options.silent, false);
enumerationFails = false;
await dispatch("push", {
  data: {
    json: () => {
      throw Error("invalid json");
    },
  },
});
assert.ok(shown.at(-1).title);
windows = [
  {
    visibilityState: "visible",
    focused: true,
    postMessage: (message, ports) => {
      ports[0].postMessage({ sound: true });
      ports[0].close();
    },
  },
];
await dispatch("push", { data });
assert.equal(shown.at(-1).options.silent, true);
windows = [
  {
    url: "https://example.com/menu/customer",
    focus: async () => {
      throw Error("do not take over a guest menu");
    },
  },
  {
    url: "https://example.com/?view=orders",
    navigate: async () => {
      throw Error("window closed");
    },
    focus: async () => {},
  },
];
await dispatch("notificationclick", {
  notification: { close() {}, data: { url: "/?view=orders" } },
});
assert.equal(opened.length, 1);
console.log(
  "PASS: push activation/timeout, gesture order, transient-error subscription preservation, VAPID rotation/pair validation, per-account test sends, provider expiry, iOS installation detection, locked/unfocused worker alerts and safe click fallback",
);
