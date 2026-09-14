import { createClient, type SupabaseClient } from "supabase-js";

let service: SupabaseClient | undefined;

function requireEnv(name: string): string {
  const globals = globalThis as unknown as Record<string, string | undefined>;
  const value = process.env[name] ?? globals[`FINCAN_${name}`];
  if (!value)
    throw new Error(
      `${name} is not configured. Add it via wrangler secret put (prod) or .dev.vars (local).`,
    );
  return value;
}

export function projectUrl(): string {
  const globals = globalThis as unknown as Record<string, string | undefined>;
  const value =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    globals.FINCAN_SUPABASE_URL ??
    globals.FINCAN_NEXT_PUBLIC_SUPABASE_URL;
  if (!value) return requireEnv("SUPABASE_URL");
  return value.replace(/\/+$/, "");
}

function publishableKey(): string {
  const globals = globalThis as unknown as Record<string, string | undefined>;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    globals.FINCAN_SUPABASE_PUBLISHABLE_KEY ??
    globals.FINCAN_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    globals.FINCAN_NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("SUPABASE_PUBLISHABLE_KEY is not configured.");
  return key;
}

/** Service client (secret key) — bypasses RLS; server-only. */
export function svc(): SupabaseClient {
  service ??= createClient(projectUrl(), requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return service;
}

/** User-scoped client: publishable apikey + the caller's JWT (RLS enforced). */
export function asUser(jwt: string): SupabaseClient {
  return createClient(projectUrl(), publishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

/** PostgREST unique-violation → 409 helper. */
export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}
