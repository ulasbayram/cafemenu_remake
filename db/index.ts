import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;

/**
 * Supabase Postgres pooler connection (server-only).
 * Set DATABASE_URL to the Supabase "Connection string → Pooler" URI, port 6543.
 * prepare:false is required on Supavisor transaction mode.
 */
export function db() {
  const url = (globalThis as { FINCAN_DATABASE_URL?: string })
    .FINCAN_DATABASE_URL;
  if (!url)
    throw new Error(
      "DATABASE_URL is not configured. Add the Supabase pooler connection string to .dev.vars or wrangler secrets.",
    );
  client ??= postgres(url, {
    prepare: false,
    max: 8,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: "prefer",
  });
  return client;
}

export type Database = ReturnType<typeof db>;

/** Escape a string for safe inclusion in a Postgres JSON literal. */
function jsonLiteral(value: unknown): string {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return `'${s.replace(/'/g, "''")}'`;
}

export type Sql = ReturnType<typeof db>;

export { jsonLiteral };