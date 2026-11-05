// UI language follows the device (navigator.language): Spanish for "es*", English otherwise. No manual override.
// app.html sets <html lang> before first paint with the same rule.
import { en, type MessageKey } from "./en.ts";
import { es } from "./es.ts";

export type Lang = "es" | "en";
export type { MessageKey };

export function detectLang(language: string | undefined): Lang {
    return /^es\b/i.test(language ?? "") ? "es" : "en";
}

export const lang: Lang = detectLang(typeof navigator === "undefined" ? undefined : navigator.language);

const messages: Record<Lang, Record<MessageKey, string>> = { en, es };

/** Translated text; `{name}` placeholders are replaced from `params`. */
export function translate(l: Lang, key: MessageKey, params?: Record<string, string | number>): string {
    const text = messages[l][key] ?? en[key] ?? key;
    return params ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : text;
}

export const t = (key: MessageKey, params?: Record<string, string | number>) => translate(lang, key, params);

/** "5 min ago" / "hace 5 min", or a date for anything older than a week. */
export function relativeTime(at: number, now = Date.now(), l: Lang = lang): string {
    const s = Math.round((at - now) / 1000);
    const rtf = new Intl.RelativeTimeFormat(l, { numeric: "auto", style: "short" });
    const abs = Math.abs(s);
    if (abs < 60) return rtf.format(s, "second");
    if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
    if (abs < 7 * 86400) return rtf.format(Math.round(s / 86400), "day");
    return new Intl.DateTimeFormat(l, { dateStyle: "medium", timeStyle: "short" }).format(at);
}
