"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client-api";
import { supabase } from "@/lib/supabase-browser";
import { playOrderChime } from "@/lib/order-notifications-client";
import type { CafeOrder } from "@/lib/orders";

export function useOrderFeed(
  cafe: string,
  onError: (message: string) => void,
  onToast: (message: string) => void,
  enabled = true,
) {
  const [orders, setOrders] = useState<CafeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const soundRef = useRef(false);
  const loadRef = useRef<(() => Promise<void>) | null>(null);
  const revision = useRef(0);
  const callbacks = useRef({ onError, onToast });
  useEffect(() => {
    callbacks.current = { onError, onToast };
  }, [onError, onToast]);

  useEffect(() => {
    if (!cafe || !enabled) return;
    let active = true,
      busy = false,
      again = false,
      baseline = false,
      connected = false;
    let timer: ReturnType<typeof setTimeout>;
    let lastError = "";
    const seen = new Set<string>();
    revision.current++;
    async function load() {
      if (!active) return;
      if (busy) {
        again = true;
        return;
      }
      busy = true;
      const version = revision.current;
      try {
        const rows = await api<CafeOrder[]>(`/api/orders?cafe=${cafe}`);
        if (!active || version !== revision.current) return;
        const arrivals = baseline
          ? rows.filter((order) => !seen.has(order.id))
          : [];
        rows.forEach((order) => seen.add(order.id));
        baseline = true;
        setOrders(rows);
        lastError = "";
        if (arrivals.length && document.visibilityState === "visible") {
          callbacks.current.onToast(`${arrivals.length} yeni sipariş geldi.`);
          if (soundRef.current && audio.current?.state === "running")
            playOrderChime(audio.current);
        }
      } catch (error) {
        if (active && lastError !== (error as Error).message) {
          lastError = (error as Error).message;
          callbacks.current.onError(lastError);
        }
      } finally {
        busy = false;
        if (active) setLoading(false);
        if (active && again) {
          again = false;
          void load();
        }
      }
    }
    loadRef.current = load;
    async function tick() {
      if (!active) return;
      if (document.visibilityState === "visible") await load();
      if (active) timer = setTimeout(tick, connected ? 10000 : 1000);
    }
    const initial = setTimeout(() => {
      setLoading(true);
      setOrders([]);
      setLive(false);
      void tick();
    }, 0);
    const reload = () => {
      if (document.visibilityState === "visible") {
        revision.current++;
        void load();
      }
    };
    const push = (event: MessageEvent) => {
      event.ports[0]?.postMessage({
        sound:
          event.data?.cafeId === cafe &&
          document.visibilityState === "visible" &&
          soundRef.current &&
          audio.current?.state === "running",
      });
      if (event.data?.type === "ORDER_PUSH" && event.data.cafeId === cafe)
        reload();
    };
    document.addEventListener("visibilitychange", reload);
    window.addEventListener("focus", reload);
    navigator.serviceWorker?.addEventListener("message", push);
    const client = supabase();
    const channel = client
      .channel(`orders-${cafe}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `cafe=eq.${cafe}`,
        },
        reload,
      )
      .subscribe((status) => {
        if (!active) return;
        connected = status === "SUBSCRIBED";
        setLive(connected);
        if (connected) reload();
      });
    return () => {
      active = false;
      loadRef.current = null;
      clearTimeout(initial);
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", reload);
      window.removeEventListener("focus", reload);
      navigator.serviceWorker?.removeEventListener("message", push);
      void client.removeChannel(channel);
    };
  }, [cafe, enabled]);

  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  const refresh = useCallback(async () => {
    revision.current++;
    await loadRef.current?.();
  }, []);
  async function toggleSound() {
    if (soundRef.current) {
      soundRef.current = false;
      setSound(false);
      return;
    }
    if (!audio.current || audio.current.state === "closed")
      audio.current = new AudioContext();
    await audio.current.resume();
    if (audio.current.state !== "running")
      throw new Error(
        "Sipariş sesi başlatılamadı. Tarayıcı ses iznini kontrol edin.",
      );
    soundRef.current = true;
    setSound(true);
    playOrderChime(audio.current);
  }
  return { orders, setOrders, loading, refresh, live, sound, toggleSound };
}
