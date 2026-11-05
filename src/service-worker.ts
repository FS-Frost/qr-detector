/// <reference lib="webworker" />
// Service worker (PWA): the app opens and scans offline. Precaches the shell, every built file (including the
// zxing .wasm, emitted by Vite under _app/immutable) and the static assets.
import { immutable, assets } from "$app/manifest";
import { version } from "$app/env";

const sw = self as unknown as ServiceWorkerGlobalScope;

// Served at `<base>/service-worker.js`: the site base comes from there.
const BASE = sw.location.pathname.replace(/\/service-worker\.js$/, "");
const SHELL = `${BASE}/`;
const CACHE = `qr-${version}`;

const url = (p: string) => `${BASE}/${p.replace(/^\//, "")}`;
const PRECACHE = [...immutable.map((f) => url(f.path)), ...assets.map((f) => url(f.path))];
const PRECACHED = new Set(PRECACHE);

sw.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([...PRECACHE, SHELL])));
    // No skipWaiting here: the page asks for it (src/lib/pwa.ts → applyUpdate) right before reloading, so an old
    // tab never loses the cache it is still loading lazy chunks from.
});

sw.addEventListener("message", (event) => {
    if (event.data === "SKIP_WAITING") void sw.skipWaiting();
});

sw.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            for (const key of await caches.keys()) if (key.startsWith("qr-") && key !== CACHE) await caches.delete(key);
            await sw.clients.claim();
        })(),
    );
});

sw.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;
    const u = new URL(req.url);
    if (u.origin !== sw.location.origin) return;

    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE);
            // Hashed build files and static assets: cache first.
            if (PRECACHED.has(u.pathname) || u.pathname.startsWith(`${BASE}/_app/immutable/`)) {
                const hit = await cache.match(u.pathname);
                if (hit) return hit;
            }
            // Navigation (SPA): network first; offline, the cached shell.
            if (req.mode === "navigate") {
                try {
                    return await fetch(req);
                } catch {
                    return (await cache.match(SHELL)) ?? Response.error();
                }
            }
            // Anything else (e.g. _app/version.json): network, falling back to the cache.
            try {
                const res = await fetch(req);
                if (res.ok && res.type === "basic") void cache.put(req, res.clone());
                return res;
            } catch {
                return (await cache.match(req)) ?? Response.error();
            }
        })(),
    );
});
