self.addEventListener("install", (event) => {
    // console.log("Service Worker installing.");
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    // console.log("Service Worker activating.");
    event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
    // console.log("Fetching:", event.request.url);
    // Simple fetch handler to satisfy PWA requirements
    event.respondWith(fetch(event.request));
});
