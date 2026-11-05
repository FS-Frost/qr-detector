// Toasts at the top of the screen (adapted from ../sensei). For confirmations and transient failures:
//   toast.success(t("toast.copied"))                          // closes by itself
//   toast.error(t("toast.imageFailed"), { detail })            // stays until closed
//   toast.info(msg, { duration: null, actions: [{ label, run }] })
// Rendered by components/Toaster.svelte.
import { untrack } from "svelte";

export type ToastKind = "success" | "info" | "warn" | "error";

export type ToastAction = { label: string; run: () => void | Promise<void>; /** Keep the toast open after running. */ keep?: boolean };

export type ToastOptions = {
    detail?: string;
    /** ms until it closes; null = until closed by hand. Default per kind (DURATIONS). */
    duration?: number | null;
    actions?: ToastAction[];
    /** A new toast with the same key replaces the old one. */
    key?: string;
};

export type Toast = Omit<ToastOptions, "duration"> & { duration: number | null; id: number; kind: ToastKind; message: string };

export const DURATIONS: Record<ToastKind, number | null> = { success: 2500, info: 5000, warn: 7000, error: 9000 };
export const MAX_TOASTS = 3;

export const toasts = $state<{ list: Toast[] }>({ list: [] });

let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export function show(kind: ToastKind, message: string, opts: ToastOptions = {}): number {
    // untrack: called from effects, reading the list would re-trigger them.
    return untrack(() => {
        const duration = opts.duration === undefined ? DURATIONS[kind] : opts.duration;
        if (opts.key) for (const old of toasts.list.filter((x) => x.key === opts.key)) dismiss(old.id);
        const t: Toast = { ...opts, id: nextId++, kind, message, duration };
        toasts.list = [...toasts.list, t].slice(-MAX_TOASTS);
        if (duration != null) timers.set(t.id, setTimeout(() => dismiss(t.id), duration));
        return t.id;
    });
}

export function dismiss(id: number) {
    clearTimeout(timers.get(id));
    timers.delete(id);
    toasts.list = toasts.list.filter((t) => t.id !== id);
}

export const toast = {
    success: (message: string, opts?: ToastOptions) => show("success", message, opts),
    info: (message: string, opts?: ToastOptions) => show("info", message, opts),
    warn: (message: string, opts?: ToastOptions) => show("warn", message, opts),
    error: (message: string, opts?: ToastOptions) => show("error", message, opts),
    dismiss,
};
