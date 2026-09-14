/**
 * Build-time env for the CLIENT bundle:
 * - Loads .env, inlines NEXT_PUBLIC_* into process.env / import.meta.env
 * - Server runtime env comes from wrangler secrets (prod) or .dev.vars (local),
 *   read via process.env inside workerd (nodejs_compat). No build-time emission.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
const env = {};
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
  }
}

const plugin = {
  name: "fincan-env",
  config(config) {
    const define = {};
    // Only public vars are inlined into the client bundle.
    for (const [k, v] of Object.entries(env)) {
      if (!k.startsWith("NEXT_PUBLIC_")) continue;
      define[`process.env.${k}`] = JSON.stringify(v);
      define[`import.meta.env.${k}`] = JSON.stringify(v);
    }
    config.define = { ...config.define, ...define };
    return config;
  },
};

export default plugin;
export { env as loadEnv };