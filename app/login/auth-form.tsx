"use client";
import { useState } from "react";
import {
  Coffee,
  ArrowRight,
  LockKeyhole,
  Eye,
  EyeOff,
  Check,
  LoaderCircle,
  Mail,
} from "lucide-react";
import ThemeToggle from "../theme-toggle";
import { supabase } from "@/lib/supabase-browser";
type Mode = "signin" | "register" | "magic";
export default function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState("");
  function client() {
    try {
      return supabase();
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }
  function translate(message: string) {
    if (/Invalid login credentials/i.test(message))
      return "E-posta veya şifre hatalı.";
    if (/already registered|already exists/i.test(message))
      return "Bu e-posta ile bir hesap zaten var. Giriş yapabilirsiniz.";
    if (/at least/i.test(message) && /character/i.test(message))
      return "Şifreniz en az 12 karakter olmalı.";
    if (/rate limit/i.test(message))
      return "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.";
    if (/confirm/i.test(message))
      return "E-postanızı onaylamanız gerekiyor. Gelen kutunuzu kontrol edin.";
    if (/signup requires a valid password|Password should be/i.test(message))
      return "Şifreniz en az 12 karakter olmalı.";
    if (/Failed to fetch/i.test(message))
      return "Bağlantı kurulamadı. İnternetinizi kontrol edin.";
    return message;
  }
  async function passwordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const sb = client();
      if (!sb) return;
      if (mode === "register") {
        const { error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        setSent(
          "Onay bağlantısı e-postanıza gönderildi. Onayladıktan sonra giriş yapabilirsiniz.",
        );
      } else {
        const { error } = await sb.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        const requested = new URLSearchParams(window.location.search).get(
          "next",
        );
        const destination =
          requested?.startsWith("/") && !requested.startsWith("//")
            ? requested
            : "/";
        window.location.assign(
          new URL(destination, window.location.origin).href,
        );
      }
    } catch (e) {
      setError(translate((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  async function magicSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const sb = client();
      if (!sb) return;
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setSent("Giriş bağlantısı e-postanıza gönderildi.");
    } catch (e) {
      setError(translate((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    setError("");
    try {
      const sb = client();
      if (!sb) return;
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (e) {
      setError(translate((e as Error).message));
      setBusy(false);
    }
  }
  if (sent)
    return (
      <main className="auth-page">
        <div className="auth-story">
          <div className="brand">
            <span>
              <Coffee size={25} />
            </span>
            fincan.
          </div>
        </div>
        <div className="auth-main">
          <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
            <span className="auth-lock">
              <Mail size={24} />
            </span>
            <h2>E-postanızı kontrol edin.</h2>
            <p>{sent}</p>
            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
            <button className="btn primary full" onClick={() => setSent("")}>
              Geri dön
            </button>
          </form>
        </div>
      </main>
    );
  return (
    <main className="auth-page">
      <div className="auth-story">
        <div className="brand">
          <span>
            <Coffee size={25} />
          </span>
          fincan.
        </div>
        <div>
          <span className="eyebrow">KAFENİZİN DİJİTAL KÖŞESİ</span>
          <h1>
            Güzel menüler.
            <br />
            Size ait bir alan.
          </h1>
          <p>
            Menünüzü hazırlayın, QR kodunuzu paylaşın.
            <br />
            Misafirlerinize güzel bir deneyim sunun.
          </p>
          <ul>
            <li>
              <Check size={17} /> Tek hesapta tüm kafeleriniz
            </li>
            <li>
              <Check size={17} /> Kafenizin ruhuna uygun menüler
            </li>
            <li>
              <Check size={17} /> Gerçek ziyaretçi istatistikleri
            </li>
          </ul>
        </div>
        <span className="auth-story-footer">
          Küçük işletmeler, büyük fikirler.
        </span>
      </div>
      <div className="auth-main">
        <div className="auth-theme">
          <ThemeToggle />
        </div>
        <form
          onSubmit={mode === "magic" ? magicSubmit : passwordSubmit}
          className="auth-form"
        >
          <span className="auth-lock">
            <LockKeyhole size={24} />
          </span>
          <h2>
            {mode === "register"
              ? "Yeni bir hikâye başlatın."
              : "Tekrar hoş geldiniz."}
          </h2>
          <p>
            {mode === "register"
              ? "Kafelerinizi yönetmek için hesabınızı oluşturun."
              : "Kafelerinize ve menülerinize kaldığınız yerden devam edin."}
          </p>
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "signin" ? "active" : ""}
              onClick={() => {
                setMode("signin");
                setError("");
              }}
            >
              Giriş yap
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Hesap oluştur
            </button>
            <button
              type="button"
              className={mode === "magic" ? "active" : ""}
              onClick={() => {
                setMode("magic");
                setError("");
              }}
            >
              Bağlantıyla gir
            </button>
          </div>
          {mode !== "magic" ? (
            <>
              <label>
                E-posta adresi
                <input
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="siz@kafeniz.com"
                />
              </label>
              <label>
                Şifre
                <div className="password-field">
                  <input
                    type={show ? "text" : "password"}
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete={
                      mode === "register" ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "register" ? "En az 12 karakter" : "Şifreniz"
                    }
                  />
                  <button
                    type="button"
                    aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            </>
          ) : (
            <label>
              E-posta adresi
              <input
                type="email"
                required
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="siz@kafeniz.com"
              />
            </label>
          )}
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <button className="btn primary full" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <ArrowRight size={18} />
            )}{" "}
            {mode === "register"
              ? "Hesabımı oluştur"
              : mode === "magic"
                ? "Giriş bağlantısı gönder"
                : "Giriş yap"}
          </button>
          <div className="auth-divider">
            <span>veya</span>
          </div>
          <button
            type="button"
            className="btn outline full google-btn"
            onClick={google}
            disabled={busy}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
              />
            </svg>
            Google ile devam et
          </button>
          <p className="auth-note">
            <LockKeyhole size={13} /> Kafeleriniz yalnızca sizin hesabınızdan
            yönetilir.
          </p>
        </form>
      </div>
    </main>
  );
}
