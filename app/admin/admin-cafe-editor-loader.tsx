"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, ShieldAlert } from "lucide-react";
import { useAdminApi } from "@/lib/admin-api";
import { supabase } from "@/lib/supabase-browser";
import type { Cafe } from "@/lib/menu";
import MenuEditor from "../editor/menu-editor";
import ProductsManager from "../products-manager";

export default function AdminCafeEditorLoader() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const api = useAdminApi();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"design" | "products">("design");
  const [toast, setToast] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase().auth.getSession();
      if (!data.session) {
        router.replace("/login?next=%2Fadmin");
        return;
      }
      try {
        const result = await api<Cafe>(`/api/admin/cafes/${params.id}`);
        if (active) setCafe(result);
      } catch (reason) {
        if (active) setError((reason as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [api, params.id, router]);

  if (error)
    return (
      <main className="admin-editor-error">
        <ShieldAlert size={30} />
        <h1>Kafe açılamadı</h1>
        <p>{error}</p>
        <button
          className="admin-primary-button"
          onClick={() => router.push("/admin")}
        >
          <ArrowLeft size={16} /> Admin paneline dön
        </button>
      </main>
    );

  if (!cafe)
    return (
      <main className="admin-editor-loading">
        <LoaderCircle className="spin" size={30} />
        <span>Destek çalışma alanı hazırlanıyor…</span>
      </main>
    );

  return (
    <main className="admin-editor-workspace">
      <div className="admin-editor-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "design"}
          className={tab === "design" ? "active" : ""}
          onClick={() => setTab("design")}
        >
          Tasarım
        </button>
        <button
          role="tab"
          aria-selected={tab === "products"}
          className={tab === "products" ? "active" : ""}
          onClick={() => setTab("products")}
        >
          Ürünler
        </button>
      </div>
      {toast && (
        <div
          className="admin-editor-toast"
          role="status"
          onAnimationEnd={() => setToast("")}
        >
          {toast}
        </div>
      )}
      {tab === "design" ? (
        <MenuEditor
          key={cafe.id}
          initialCafe={cafe}
          access="admin"
          onSaved={(saved) => setCafe(saved)}
        />
      ) : (
        <ProductsManager
          key={`products-${cafe.id}`}
          cafes={[cafe]}
          setCafes={(updater) => {
            setCafe((current) => {
              if (!current) return current;
              const next =
                typeof updater === "function"
                  ? updater([current])
                  : updater;
              return next[0] ?? current;
            });
          }}
          onCreateCafe={() => setTab("design")}
          onError={setError}
          onToast={setToast}
          access="admin"
        />
      )}
    </main>
  );
}
