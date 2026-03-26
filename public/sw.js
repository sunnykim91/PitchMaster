const CACHE_NAME = "pitchmaster-v4";
const PRECACHE_URLS = ["/dashboard", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ── Push Notifications ── */
self.addEventListener("push", (event) => {
  let data = { title: "PitchMaster", body: "새로운 알림이 있습니다.", url: "/notifications" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // fallback to defaults
  }
  const baseUrl = self.location.origin;
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: baseUrl + "/icons/icon-192.png",
      badge: baseUrl + "/icons/icon-192.png",
      tag: "pitchmaster-" + Date.now(),
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url },
    }).then(() => {
      if (self.navigator && "setAppBadge" in self.navigator) {
        self.navigator.setAppBadge();
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (self.navigator && "clearAppBadge" in self.navigator) {
    self.navigator.clearAppBadge();
  }
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip non-same-origin requests
  if (url.origin !== location.origin) return;

  // Skip API routes and auth routes
  if (url.pathname.startsWith("/api/")) return;

  // 정적 에셋 (_next/static) → 캐시 우선, 없으면 네트워크
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 페이지 네비게이션 → Network-First (네트워크 우선, 실패 시 캐시)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return caches.match("/offline");
          });
        })
    );
    return;
  }

  // 기타 GET 요청 → 네트워크 우선, 캐시 폴백
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
