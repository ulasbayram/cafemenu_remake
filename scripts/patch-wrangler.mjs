/** Post-build: inject rate-limit bindings into the generated wrangler.json.
 * Runs after vinext+CF-plugin asset emission, so ordering is guaranteed. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), "dist/server/wrangler.json");
if (!existsSync(path)) process.exit(0);
const cfg = JSON.parse(readFileSync(path, "utf8"));
cfg.ratelimits = [
  {
    name: "ORDER_PER_TABLE",
    namespace_id: "1001",
    simple: { limit: 15, period: "thirty_minutes" },
  },
  {
    name: "ORDER_PER_VISITOR",
    namespace_id: "1002",
    simple: { limit: 5, period: "minute" },
  },
];
writeFileSync(path, JSON.stringify(cfg));

// Bridge the worker env (bindings) into route handlers via globalThis.
const indexPath = resolve(process.cwd(), "dist/server/index.js");
if (existsSync(indexPath)) {
  const idx = readFileSync(indexPath, "utf8");
  if (!idx.includes("FINCAN_WORKER_ENV")) {
    writeFileSync(
      indexPath,
      idx.replace(
        "async fetch(e,t,n){",
        "async fetch(e,t,n){globalThis.FINCAN_WORKER_ENV=t;",
      ),
    );
  }
}
console.log("[patch-wrangler] ratelimits + env bridge patched");
