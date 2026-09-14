"use client";
import { createClient, type SupabaseClient } from "supabase-js";

let client: SupabaseClient | undefined;

/** Browser Supabase client (PKCE, session in localStorage). */
export function supabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon)
    throw new Error(
      "Supabase yapılandırması eksik. NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY gerekli.",
    );
  client ??= createClient(url, anon, {
    auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true },
  });
  return client;
}