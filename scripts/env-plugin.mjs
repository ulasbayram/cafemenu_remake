/**
 * Build-time env injection for vinext/Workers:
 * - Loads .env (public NEXT_PUBLIC_* + server secrets)
 * - Defines import.meta.env / process.env for the client bundle
 * - Emits dist/server/env-vars.json consumed by sites-env.mjs at runtime
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
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
    for (const [k, v] of Object.entries(env)) {
      define[`process.env.${k}`] = JSON.stringify(v);
      define[`import.meta.env.${k}`] = JSON.stringify(v);
    }
    config.define = { ...config.define, ...define };
    config.env = { ...config.env, ...env };
    return config;
  },
  closeBundle() {
    try {
      mkdirSync(resolve(process.cwd(), "dist/server"), { recursive: true });
      // Runtime server env (Workers secrets come from wrangler; local from .env)
      writeFileSync(
        resolve(process.cwd(), "dist/server/env-vars.json"),
        JSON.stringify(env),
      );
    } catch {
      // dist may not exist in non-build contexts
    }
  },
};

export default plugin;
export { env as loadEnv };