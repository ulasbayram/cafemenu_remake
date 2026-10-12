import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { registerHooks } from "node:module";
import ts from "typescript";

const root = new URL("../", import.meta.url);

const virtual = {
  "next/server": `
    export class NextRequest {}
    export const NextResponse = {
      next: (init) => ({ kind: "next", init, cookies: { set() {} } }),
      redirect: (url) => ({ kind: "redirect", status: 307, location: String(url) }),
    };
  `,
  "@supabase/ssr": `
    export const createServerClient = () => ({
      auth: { getUser: async () => globalThis.gateTest.getUser() },
    });
  `,
};

registerHooks({
  resolve(specifier, context, next) {
    if (virtual[specifier])
      return next(
        `data:text/javascript,${encodeURIComponent(virtual[specifier])}`,
        context,
      );
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

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk_test";

const file = existsSync(new URL("../proxy.ts", import.meta.url))
  ? "../proxy.ts"
  : "../middleware.ts";
const { proxy, middleware, config } = await import(file);
const handler = proxy ?? middleware;
assert.equal(typeof handler, "function", "gate must export proxy/middleware");

// Matcher must cover every protected surface and nothing public.
const matcher = config.matcher.join(" ");
for (const route of [
  "/",
  "/admin/:path*",
  "/editor/:path*",
  "/enterprise/package-a",
  "/modules/erp",
])
  assert.ok(matcher.includes(route), `matcher must protect ${route}`);
for (const open of ["/login", "/landing", "/menu"])
  assert.ok(!matcher.includes(open), `matcher must not gate public ${open}`);

const request = (url) => {
  const nextUrl = new URL(url);
  nextUrl.clone = () => new URL(url);
  return { cookies: { getAll: () => [] }, nextUrl };
};

// Signed out → redirect to /login carrying the original destination.
globalThis.gateTest = { getUser: async () => ({ data: { user: null } }) };
const denied = await handler(request("https://app.example/enterprise/package-a"));
assert.equal(denied.kind, "redirect");
assert.match(denied.location, /\/login\?next=%2Fenterprise%2Fpackage-a/);

const deniedRoot = await handler(request("https://app.example/"));
assert.match(deniedRoot.location, /\/login\?next=%2F$/);

// Signed in → pass through untouched.
globalThis.gateTest = { getUser: async () => ({ data: { user: { id: "u" } } }) };
const allowed = await handler(request("https://app.example/modules/erp"));
assert.equal(allowed.kind, "next");

console.log(
  "PASS: auth gate matcher covers protected routes, signed-out redirect preserves destination, signed-in passes through",
);
