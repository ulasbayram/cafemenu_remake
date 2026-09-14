import { createClient, type SupabaseClient } from "supabase-js";

let service: SupabaseClient | undefined;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `${name} is not configured. Add it via wrangler secret put (prod) or .dev.vars (local).`,
    );
  return value;
}

export function projectUrl(): string {
  return requireEnv("SUPABASE_URL").replace(/\/+$/, "");
}

function publishableKey(): string {
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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