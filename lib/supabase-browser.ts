"use client";
import { createClient, type SupabaseClient } from "supabase-js";

let client: SupabaseClient | undefined;

/**
 * Public Supabase key: prefer the new `sb_publishable_…` key, fall back to
 * the legacy JWT-format anon key. Both are safe for browser exposure and
 * behave identically to supabase-js.
 */
function publicKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Browser Supabase client (PKCE, session in localStorage). */
export function supabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicKey();
  if (!url || !key)
    throw new Error(
      "Supabase yapılandırması eksik. NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (veya eski ANON_KEY) gerekli.",
    );
  client ??= createClient(url, key, {
    auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true },
  });
  return client;
}