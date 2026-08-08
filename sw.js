// Kill-switch: this path previously served the SwipeDict PWA (Workbox). Returning visitors
// still have that worker registered at scope "/", which would serve the old app shell
// cache-first forever. This replacement unregisters itself and drops every cache, so the
// next load fetches the landing page from the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clientList = await self.clients.matchAll({ type: 'window' });
    clientList.forEach((client) => client.navigate(client.url));
  })());
});
