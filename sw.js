// Tombstone service worker.
//
// swipedict.github.io used to serve the SwipeDict PWA, which installed a
// precaching service worker at this scope. This origin is now only a marketing
// page, but returning visitors still have that old worker registered and it
// would keep serving the cached app shell offline-first — they would never see
// this site at all.
//
// A service worker cannot be removed by deleting the file: the browser keeps
// running the last installed copy. It has to be replaced by one that shuts
// itself down, which is what this does. Browsers re-fetch the worker script on
// navigation and install it when the bytes differ, so this is picked up on the
// next visit.
//
// Keep this file until it is safe to assume no client still has the PWA
// installed. Removing it too early resurrects the old worker for those clients.

self.addEventListener('install', () => {
    // Take over without waiting for existing tabs to close.
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        // Drop every cache the old worker precached the app into.
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));

        // Unregister, so nothing is left controlling this scope.
        await self.registration.unregister();

        // Reload any open tab still under the old worker's control so it picks
        // up the real page rather than the cached shell it is currently showing.
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
            client.navigate(client.url);
        }
    })());
});
