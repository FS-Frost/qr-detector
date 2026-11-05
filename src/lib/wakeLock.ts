// Keeps the screen on (Screen Wake Lock) while scanning. The browser drops it when the tab is hidden: it is
// requested again on return. Without support it does nothing. (From ../sensei.)

type Sentinel = { release(): Promise<void>; released: boolean };
type WakeLockApi = { request(type: "screen"): Promise<Sentinel> };

let holders = 0;
let sentinel: Sentinel | null = null;

const api = () => (typeof navigator !== "undefined" ? (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock : undefined);

async function acquire() {
    const wl = api();
    if (!wl || holders === 0 || document.visibilityState !== "visible" || (sentinel && !sentinel.released)) return;
    try {
        sentinel = await wl.request("screen");
    } catch {
        /* refused (low battery, iframe…): the screen dims as usual */
    }
}

function onVisible() {
    if (document.visibilityState === "visible") void acquire();
}

/** Keeps the screen on until the returned function is called (counted: nested holders don't clash). */
export function keepAwake(): () => void {
    if (!api()) return () => {};
    if (holders++ === 0) document.addEventListener("visibilitychange", onVisible);
    void acquire();
    let done = false;
    return () => {
        if (done) return;
        done = true;
        if (--holders > 0) return;
        document.removeEventListener("visibilitychange", onVisible);
        void sentinel?.release().catch(() => {});
        sentinel = null;
    };
}
