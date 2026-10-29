"use client";
let preparation: Promise<ServiceWorkerRegistration> | null = null;

/** Use this registration's active worker, not serviceWorker.ready (which may
 * refer to an old/different registration). No authenticated response is cached. */
export function prepareOrderWorker() {
  if (preparation) return preparation;
  preparation = (async () => {
    if (!window.isSecureContext || !("serviceWorker" in navigator))
      throw new Error(
        "HTTPS üzerinden destekleyen bir tarayıcı kullanın. Kod: PUSH_WORKER_UNSUPPORTED",
      );
    const registration = await navigator.serviceWorker.register(
      "/order-notifications-sw.js",
      { scope: "/", updateViaCache: "none" },
    );
    if (registration.active?.state === "activated") return registration;
    await new Promise<void>((resolve, reject) => {
      const workers = new Set<ServiceWorker>();
      const cleanup = () => {
        clearTimeout(timer);
        registration.removeEventListener("updatefound", watch);
        workers.forEach((w) => w.removeEventListener("statechange", check));
      };
      const check = () => {
        if (registration.active?.state === "activated") {
          cleanup();
          resolve();
        } else if (
          [...workers].length &&
          [...workers].every((w) => w.state === "redundant")
        ) {
          cleanup();
          reject(
            new Error(
              "Bildirim hizmeti başlatılamadı. Sayfayı yenileyin. Kod: PUSH_WORKER_REDUNDANT",
            ),
          );
        }
      };
      const watch = () => {
        for (const w of [
          registration.installing,
          registration.waiting,
          registration.active,
        ])
          if (w && !workers.has(w)) {
            workers.add(w);
            w.addEventListener("statechange", check);
          }
        registration.waiting?.postMessage({ type: "SKIP_WAITING" });
        check();
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            "Bildirim hizmeti zamanında başlatılamadı. Bağlantıyı kontrol edip tekrar deneyin. Kod: PUSH_WORKER_TIMEOUT",
          ),
        );
      }, 12000);
      registration.addEventListener("updatefound", watch);
      watch();
    });
    return registration;
  })().catch((error) => {
    preparation = null;
    throw error;
  });
  return preparation;
}
