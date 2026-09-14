"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, ShieldAlert } from "lucide-react";
import { useAdminApi } from "@/lib/admin-api";
import { supabase } from "@/lib/supabase-browser";
import type { Cafe } from "@/lib/menu";
import MenuEditor from "../editor/menu-editor";

export default function AdminCafeEditorLoader() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const api = useAdminApi();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [error, setError] = useState("");

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

  return <MenuEditor initialCafe={cafe} access="admin" />;
}
