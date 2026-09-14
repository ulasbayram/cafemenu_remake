"use client";
import { useCallback } from "react";
import { supabase } from "@/lib/supabase-browser";

/** fetch() with the Supabase Bearer token; unwraps { error }. */
export function useAdminApi() {
  return useCallback(async <T,>(
    path: string,
    init?: { body?: unknown; method?: string },
  ): Promise<T> => {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    const r = await fetch(path, {
      method: init?.body !== undefined ? (init.method ?? "POST") : "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(init?.body !== undefined
        ? { body: JSON.stringify(init.body) }
        : {}),
    });
    const d = (await r.json().catch(() => ({}))) as T & { error?: string };
    if (!r.ok) throw new Error(d.error || "İşlem tamamlanamadı.");
    return d;
  }, []);
}