/* No offline caching: authenticated pages and API responses stay private. */
self.addEventListener("install", (event) =>
  event.waitUntil(self.skipWaiting()),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload;
      try {
        payload = event.data?.json();
      } catch {
        payload = null;
      }
      payload = payload && typeof payload === "object" ? payload : {};
      // A suspended/failed client must never prevent a visible notification.
      const windows = await self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .catch(() => []);
      const replies = await Promise.allSettled(
        windows
          .filter(
            (client) => client.visibilityState === "visible" && client.focused,
          )
          .map(
            (client) =>
              new Promise((resolve) => {
                const channel = new MessageChannel();
                const finish = (sound) => {
                  channel.port1.close();
                  resolve(sound);
                };
                const timer = setTimeout(() => finish(false), 300);
                channel.port1.onmessage = (event) => {
                  clearTimeout(timer);
                  finish(event.data?.sound === true);
                };
                try {
                  client.postMessage(
                    {
                      type: "ORDER_PUSH",
                      orderId: payload.orderId,
                      cafeId: payload.cafeId,
                    },
                    [channel.port2],
                  );
                } catch {
                  clearTimeout(timer);
                  finish(false);
                }
              }),
          ),
      );
      // Only silence the OS sound when a visible order screen has its own
      // chime running. Other pages, hidden tabs and locked phones still alert.
      const foreground = replies.some(
        (result) => result.status === "fulfilled" && result.value === true,
      );
      await self.registration.showNotification(
        payload.title || "Fincan · Yeni sipariş",
        {
          body: payload.body || "İşletmenize yeni bir sipariş geldi.",
          icon: "/pwa-icon-192.png",
          badge: "/pwa-icon-192.png",
          tag: payload.orderId
            ? `order-${payload.orderId}`
            : payload.type === "test"
              ? "fincan-test"
              : "fincan-notice",
          renotify: false,
          data: { url: payload.url || "/?view=orders" },
          ...(payload.createdAt &&
          Number.isFinite(Date.parse(payload.createdAt))
            ? { timestamp: Date.parse(payload.createdAt) }
            : {}),
          ...(foreground ? {} : { vibrate: [180, 80, 180] }),
          silent: foreground,
        },
      );
    })(),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const target = new URL(
        event.notification.data?.url || "/?view=orders",
        self.location.origin,
      );
      if (target.origin !== self.location.origin) return;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (
          new URL(client.url).origin === self.location.origin &&
          "focus" in client
        ) {
          const path = new URL(client.url).pathname;
          if (
            path !== "/" &&
            !path.startsWith("/enterprise/") &&
            !path.startsWith("/modules/")
          )
            continue;
          try {
            await client.navigate(target.href);
            return await client.focus();
          } catch {
            /* Try another app window or open a new one. */
          }
        }
      }
      return self.clients.openWindow(target.href);
    })(),
  );
});
