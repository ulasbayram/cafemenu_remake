"use client";
import { supabase } from "@/lib/supabase-browser";

/** fetch() that attaches the Supabase access token and unwraps { error }. */
export async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  const r = await fetch(path, {
    method: body !== undefined || method !== "GET" ? method : "GET",
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