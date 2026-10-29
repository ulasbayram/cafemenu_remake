"use client";
import { useEffect } from "react";
import { prepareOrderWorker } from "@/lib/order-push-registration";
import { setInstallPrompt, type InstallPrompt } from "@/lib/pwa-install";
export default function PwaBootstrap() {
  useEffect(() => {
    const prompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPrompt);
    };
    const installed = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", installed);
    // Prepare before the permission button is tapped; Safari needs a live worker
    // and a direct user gesture. This worker has no fetch/offline cache handler.
    if (window.isSecureContext && "serviceWorker" in navigator)
      void prepareOrderWorker().catch(() => {});
    return () => {
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  return null;
}
