"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";

/** Supabase redirects here with the OAuth/PKCE code in the URL hash. */
export default function AuthCallback() {
  useEffect(() => {
    supabase()
      .auth.exchangeCodeForSession(window.location.href)
      .then(({ error }) => {
        window.location.assign(
          new URL(error ? "/login" : "/", window.location.origin).href,
        );
      })
      .catch(() => {
        window.location.assign(new URL("/login", window.location.origin).href);
      });
  }, []);
  return (
    <main className="auth-page">
      <div className="auth-story">
        <div className="brand">
          <span>☕</span> fincan.
        </div>
      </div>
      <div className="auth-main">
        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
          <h2>Giriş yapılıyor…</h2>
          <p>Oturumunuz doğrulanıyor, birazdan yönetim paneline
          yönlendirileceksiniz.</p>
        </form>
      </div>
    </main>
  );
}