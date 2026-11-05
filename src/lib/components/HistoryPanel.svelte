<script lang="ts">
    // Full-screen list of past scans (newest first). Tap opens the entry; delete per row or everything, with Undo.
    import Sheet from "./Sheet.svelte";
    import Icon from "./Icon.svelte";
    import { clearHistory, history, removeFromHistory, type Entry } from "../history.svelte.ts";
    import { MAX_ENTRIES } from "../history-core.ts";
    import { parseContent, type Content } from "../content/parse.ts";
    import { formatLabel } from "../scanner/formats.ts";
    import { relativeTime, t } from "../i18n/index.ts";
    import { toast } from "../toast.svelte.ts";

    let { onclose, onopen }: { onclose: () => void; onopen: (e: Entry) => void } = $props();

    let confirming = $state(false);
    let confirmTimer: ReturnType<typeof setTimeout> | undefined;

    function preview(c: Content, raw: string): string {
        switch (c.kind) {
            case "url":
                return c.url.replace(/^https?:\/\//, "");
            case "wifi":
                return c.ssid;
            case "contact":
                return c.name || c.phones[0] || c.emails[0] || raw;
            case "email":
                return c.to;
            case "phone":
            case "sms":
                return c.number;
            case "geo":
                return c.query || `${c.lat}, ${c.lon}`;
            case "product":
                return c.code;
            default:
                return raw.trim().replace(/\s+/g, " ");
        }
    }

    function remove(e: Entry) {
        const undo = removeFromHistory(e.id);
        toast.info(t("toast.entryDeleted"), { key: "history-undo", actions: [{ label: t("action.undo"), run: undo }] });
    }

    function clearAll() {
        if (!confirming) {
            confirming = true;
            clearTimeout(confirmTimer);
            confirmTimer = setTimeout(() => (confirming = false), 3000);
            return;
        }
        clearTimeout(confirmTimer);
        confirming = false;
        const undo = clearHistory();
        toast.info(t("toast.historyCleared"), { key: "history-undo", duration: 8000, actions: [{ label: t("action.undo"), run: undo }] });
    }

    $effect(() => () => clearTimeout(confirmTimer));
</script>

<Sheet variant="panel" label={t("history.title")} {onclose}>
    {#snippet header()}
        <h2>{t("history.title")}</h2>
        {#if history.list.length}<div class="count">{t("history.count", { n: history.list.length, max: MAX_ENTRIES })}</div>{/if}
    {/snippet}

    {#if history.list.length === 0}
        <div class="empty">
            <Icon name="history" size={40} />
            <p>{t("history.empty")}</p>
        </div>
    {:else}
        <ul>
            {#each history.list as e (e.id)}
                {@const c = parseContent(e.text, e.format)}
                <li>
                    <button class="row ghost" onclick={() => onopen(e)}>
                        <span class="icon"><Icon name={c.kind} size={20} /></span>
                        <span class="txt">
                            <span class="main">{preview(c, e.text)}</span>
                            <span class="sub">{t(`kind.${c.kind}`)} · {formatLabel(e.format)} · {relativeTime(e.at)}</span>
                        </span>
                    </button>
                    <button class="ghost del" onclick={() => remove(e)} aria-label={t("action.delete")}><Icon name="trash" size={18} /></button>
                </li>
            {/each}
        </ul>
    {/if}

    {#snippet footer()}
        {#if history.list.length}
            <button class="danger grow" class:confirming onclick={clearAll}>
                <Icon name="trash" />{confirming ? t("action.confirmClear") : t("action.clearHistory")}
            </button>
        {/if}
    {/snippet}
</Sheet>

<style>
    h2 {
        margin: 0;
        font-size: 1.2rem;
    }
    .count {
        color: var(--text-2);
        font-size: 0.82rem;
    }
    .empty {
        display: grid;
        place-items: center;
        gap: 0.5rem;
        padding: 3rem 1rem;
        color: var(--text-3);
        text-align: center;
    }
    .empty p {
        margin: 0;
        color: var(--text-2);
    }
    ul {
        list-style: none;
        margin: -0.5rem -0.6rem;
        padding: 0;
    }
    li {
        display: flex;
        align-items: center;
        border-bottom: 1px solid var(--line);
    }
    li:last-child {
        border-bottom: none;
    }
    .row {
        flex: 1;
        min-width: 0;
        justify-content: flex-start;
        gap: 0.8rem;
        padding: 0.7rem 0.6rem;
        text-align: left;
        font-weight: 400;
        border-radius: var(--radius-sm);
    }
    .row:hover {
        background: var(--bg-2);
    }
    .icon {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border-radius: 10px;
        flex-shrink: 0;
        background: var(--bg-3);
        color: var(--text-2);
    }
    .txt {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }
    .main,
    .sub {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .main {
        font-weight: 600;
    }
    .sub {
        color: var(--text-2);
        font-size: 0.82rem;
    }
    .del {
        color: var(--text-3);
        flex-shrink: 0;
    }
    .grow {
        flex: 1;
    }
    .confirming {
        background: var(--bad);
        border-color: var(--bad);
        color: #fff;
    }
</style>
