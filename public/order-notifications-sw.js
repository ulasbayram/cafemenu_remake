/* No offline caching: authenticated pages and API responses stay private. */
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload;
      try {
        payload = event.data?.json();
      } catch {
        payload = null;
      }
      if (!payload?.orderId) return;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const replies = await Promise.all(
        windows.map(
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
      const foreground = replies.some(Boolean);
      await self.registration.showNotification(
        payload.title || "Fincan · Yeni sipariş",
        {
          body: payload.body || "İşletmenize yeni bir sipariş geldi.",
          icon: "/pwa-icon-192.png",
          badge: "/pwa-icon-192.png",
          tag: `order-${payload.orderId}`,
          renotify: false,
          data: { url: payload.url || "/?view=orders" },
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
          await client.navigate(target.href);
          return client.focus();
        }
      }
      return self.clients.openWindow(target.href);
    })(),
  );
});
