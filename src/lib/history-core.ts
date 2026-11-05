// History list logic, pure (tested in tests/history.test.ts). State + storage live in history.svelte.ts.
import { fromNative, type FormatId } from "./scanner/formats.ts";

export const MAX_ENTRIES = 100;

export type Entry = { id: string; text: string; format: FormatId | null; at: number };

/** Adds an entry at the top. The same content (text + format) is moved up instead of duplicated. */
export function addEntry(list: Entry[], e: Entry, max = MAX_ENTRIES): Entry[] {
    return [e, ...list.filter((x) => !(x.text === e.text && x.format === e.format))].slice(0, max);
}

/** Validates what was stored (it may be from another version or edited by hand). Invalid rows are dropped. */
export function parseStored(raw: string | null): Entry[] {
    if (!raw) return [];
    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return [];
    }
    if (!Array.isArray(data)) return [];
    const out: Entry[] = [];
    for (const r of data) {
        if (!r || typeof r !== "object") continue;
        const { id, text, format, at } = r as Record<string, unknown>;
        if (typeof id !== "string" || typeof text !== "string" || typeof at !== "number") continue;
        out.push({ id, text, at, format: typeof format === "string" ? fromNative(format) : null });
    }
    return out.slice(0, MAX_ENTRIES);
}
