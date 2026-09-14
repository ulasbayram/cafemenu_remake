import { mkdirSync } from "node:fs";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const runtimeRoot =
  process.env.SITES_RUNTIME_ROOT || path.join(projectRoot, ".sites-runtime");

// Load .env secrets into process.env for local `npm start` (workerd).
const envPath = path.join(projectRoot, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#") && !process.env[m[1]])
      process.env[m[1]] = m[2];
  }
}

// Expose server env to the Workers runtime via globalThis (db/jwt read FINCAN_*).
const g = globalThis;
const envKeys = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DOMAIN_NAME",
  "ADMIN_USER_IDS",
];
// Normalize: if only the legacy anon key is set, expose it as PUBLISHABLE too.
if (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY)
  process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// SUPABASE_URL is the non-prefixed alias of the public project URL; server
// code (jwt.ts) reads it, while the dashboard supplies only NEXT_PUBLIC_.
process.env.SUPABASE_URL ||= process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_PUBLISHABLE_KEY ||=
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
for (const key of envKeys) {
  const value = process.env[key];
  if (value) {
    // Workers code reads FINCAN_<NAME> and plain NEXT_PUBLIC_*.
    if (key.startsWith("NEXT_PUBLIC_"))
      g[`FINCAN_${key.replace("NEXT_PUBLIC_", "")}`] = value;
    g[`FINCAN_${key}`] = value;
    // jwt.ts/env() also checks process.env directly.
  }
}

process.env.CLOUDFLARE_CF_FETCH_ENABLED ||= "false";
process.env.WRANGLER_SEND_METRICS ||= "false";
process.env.WRANGLER_WRITE_LOGS ||= "false";
process.env.WRANGLER_LOG_PATH ||= path.join(runtimeRoot, "wrangler/logs");
process.env.WRANGLER_REGISTRY_PATH ||= path.join(
  runtimeRoot,
  "wrangler/dev-registry",
);
process.env.MINIFLARE_REGISTRY_PATH ||= path.join(
  runtimeRoot,
  "wrangler/registry",
);

process.chdir(projectRoot);
for (const directory of [
  path.dirname(process.env.WRANGLER_LOG_PATH),
  process.env.WRANGLER_REGISTRY_PATH,
  process.env.MINIFLARE_REGISTRY_PATH,
]) {
  mkdirSync(directory, { recursive: true });
}
