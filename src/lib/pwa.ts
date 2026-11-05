// PWA: service worker registration (production only: in dev the cache gets in the way) and update.
// A new SW installs and WAITS; `applyUpdate` activates it and reloads once (offered in components/UpdateNotice.svelte).
import { base } from "./base.ts";

let reg: ServiceWorkerRegistration | undefined;

export async function registerServiceWorker() {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || import.meta.env.DEV) return;
    try {
        reg = await navigator.serviceWorker.register(`${base}/service-worker.js`, { scope: `${base}/` });
        // A waiting SW at startup: this page already came from the network (navigation is network-first), so it is
        // the new version. Activating it is safe and refreshes the offline cache.
        if (reg.waiting && navigator.serviceWorker.controller) reg.waiting.postMessage("SKIP_WAITING");
    } catch (err) {
        console.error("[qr] service worker registration failed", err);
    }
}

/** Resolves when an installing SW finishes (installed or discarded), at most `ms`. */
function installed(w: ServiceWorker, ms = 20_000) {
    return new Promise<ServiceWorker | null>((resolve) => {
        const done = () => {
            if (w.state === "installed" || w.state === "activated") resolve(w);
            else if (w.state === "redundant") resolve(null);
        };
        w.addEventListener("statechange", done);
        setTimeout(() => resolve(null), ms);
        done();
    });
}

let applying = false;

/** Fetches the new SW (if any), activates it and reloads once. */
export async function applyUpdate() {
    if (applying) return;
    applying = true;
    let reloaded = false;
    const reload = () => {
        if (reloaded) return;
        reloaded = true;
        location.reload();
    };
    const r = reg ?? (await navigator.serviceWorker?.getRegistration(`${base}/`).catch(() => undefined));
    if (!r || !navigator.serviceWorker.controller) return reload();
    try {
        await r.update();
    } catch {
        /* offline or server hiccup: reload anyway, network-first navigation decides */
    }
    const next = r.waiting ?? (r.installing ? await installed(r.installing) : null);
    if (!next || next === navigator.serviceWorker.controller) return reload();
    navigator.serviceWorker.addEventListener("controllerchange", reload, { once: true });
    next.postMessage("SKIP_WAITING");
    setTimeout(reload, 4000); // fallback if `controllerchange` never fires
}

const VERSION_KEY = "qr.version";

/** Remembers the running version; returns the previous one if it changed (null on first run or same version). */
export function noteVersion(current: string): string | null {
    try {
        const previous = localStorage.getItem(VERSION_KEY);
        localStorage.setItem(VERSION_KEY, current);
        return previous && previous !== current ? previous : null;
    } catch {
        return null;
    }
}
