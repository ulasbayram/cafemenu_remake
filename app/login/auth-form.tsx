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
} from "lucide-react";
import ThemeToggle from "../theme-toggle";
export default function AuthForm() {
  const [register, setRegister] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/auth/${register ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(register ? { name } : {}),
        }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(d.error);
      window.location.assign(new URL("/", window.location.origin).href);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
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
        <form onSubmit={submit} className="auth-form">
          <span className="auth-lock">
            <LockKeyhole size={24} />
          </span>
          <h2>
            {register ? "Yeni bir hikâye başlatın." : "Tekrar hoş geldiniz."}
          </h2>
          <p>
            {register
              ? "Kafelerinizi yönetmek için hesabınızı oluşturun."
              : "Kafelerinize ve menülerinize kaldığınız yerden devam edin."}
          </p>
          <div className="auth-tabs">
            <button
              type="button"
              className={!register ? "active" : ""}
              onClick={() => {
                setRegister(false);
                setError("");
              }}
            >
              Giriş yap
            </button>
            <button
              type="button"
              className={register ? "active" : ""}
              onClick={() => {
                setRegister(true);
                setError("");
              }}
            >
              Hesap oluştur
            </button>
          </div>
          {register && (
            <label>
              Adınız
              <input
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Adınız Soyadınız"
              />
            </label>
          )}
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
                autoComplete={register ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={register ? "En az 12 karakter" : "Şifreniz"}
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
            {register ? "Hesabımı oluştur" : "Giriş yap"}
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
