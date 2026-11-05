// Side-effect actions on a result (clipboard, share sheet, file download), reporting outcome with toasts.
import { t } from "./i18n/index.ts";
import { toast } from "./toast.svelte.ts";

export async function copyText(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        toast.success(t("toast.copied"));
    } catch {
        toast.error(t("toast.copyFailed"));
    }
}

export const canShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

export async function shareContent(data: ShareData) {
    try {
        await navigator.share(data);
    } catch (e) {
        // The user closing the share sheet is not an error.
        if (e instanceof DOMException && e.name === "AbortError") return;
        toast.error(t("toast.shareFailed"));
    }
}

/** Saves text as a file (e.g. a .vcf the contacts app picks up). */
export function downloadText(text: string, filename: string, type: string) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Short haptic feedback when a code is read (no-op where unsupported, e.g. iOS). */
export function vibrate() {
    try {
        navigator.vibrate?.(60);
    } catch {
        /* not allowed */
    }
}
