"use client";
import { supabase } from "@/lib/supabase-browser";

/** fetch() that attaches the Supabase access token and unwraps { error }. */
export async function api<T>(
  path: string,
  body?: unknown,
  method?: "GET" | "POST" | "PUT",
): Promise<T> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  const verb = method ?? (body !== undefined ? "POST" : "GET");
  const r = await fetch(path, {
    method: verb,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const d = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(d.error || "İşlem tamamlanamadı.");
  return d;
}