"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Coffee, LoaderCircle } from "lucide-react";
import { api } from "@/lib/client-api";
import type { Cafe } from "@/lib/menu";
import MenuEditor from "./menu-editor";

/** Fetches the authed cafe for /editor/:id, then renders the studio. */
export default function MenuEditorLoader() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    let active = true;
    api<Cafe>(`/api/cafes/${id}`, undefined, "GET")
      .then((c) => {
        if (active) setCafe(c);
      })
      .catch((e) => {
        if (!active) return;
        const message = (e as Error).message || "";
        setError(message || "Kafe yüklenemedi.");
        if (message === "Devam etmek için giriş yapın.")
          window.location.assign(
            new URL("/login", window.location.origin).href,
          );
      });
    return () => {
      active = false;
    };
  }, [params?.id]);

  if (error)
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
            <h2>Kafe açılamadı.</h2>
            <p>{error}</p>
            <button className="btn primary full" onClick={() => router.push("/?view=menus")}>
              Menü yönetimine dön
            </button>
          </form>
        </div>
      </main>
    );

  if (!cafe)
    return (
      <main className="auth-page" style={{ display: "grid", placeItems: "center" }}>
        <LoaderCircle className="spin" size={28} />
      </main>
    );

  return <MenuEditor initialCafe={cafe} />;
}