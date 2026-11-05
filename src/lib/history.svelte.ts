// Scan history, persisted in localStorage["qr.history"] (last MAX_ENTRIES, newest first).
import { addEntry, parseStored, type Entry } from "./history-core.ts";
import type { FormatId } from "./scanner/formats.ts";
import { t } from "./i18n/index.ts";
import { toast } from "./toast.svelte.ts";

export type { Entry };

const KEY = "qr.history";

export const history = $state<{ list: Entry[] }>({ list: [] });

let warned = false;

function save() {
    try {
        localStorage.setItem(KEY, JSON.stringify(history.list));
    } catch {
        // Private mode / quota / blocked storage: keep working in memory, tell the user once.
        if (!warned) toast.warn(t("toast.storageFailed"));
        warned = true;
    }
}

export function loadHistory() {
    try {
        history.list = parseStored(localStorage.getItem(KEY));
    } catch {
        history.list = [];
    }
}

export function addToHistory(text: string, format: FormatId | null): Entry {
    const e: Entry = { id: crypto.randomUUID(), text, format, at: Date.now() };
    history.list = addEntry(history.list, e);
    save();
    return e;
}

/** Removes one entry; returns a function that puts it back (for "Undo"). */
export function removeFromHistory(id: string): () => void {
    const before = history.list;
    history.list = before.filter((e) => e.id !== id);
    save();
    return () => {
        history.list = before;
        save();
    };
}

/** Empties the history; returns a function that restores it (for "Undo"). */
export function clearHistory(): () => void {
    const before = history.list;
    history.list = [];
    save();
    return () => {
        history.list = before;
        save();
    };
}
