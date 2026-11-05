<script lang="ts">
    // Renders the toasts (toast.svelte.ts) at the top center, above everything.
    import { fly } from "svelte/transition";
    import { flip } from "svelte/animate";
    import { dismiss, toasts, type Toast } from "../toast.svelte.ts";
    import { t } from "../i18n/index.ts";

    const ICON: Record<Toast["kind"], string> = { success: "✓", info: "i", warn: "!", error: "✕" };

    async function act(toast: Toast, run: () => void | Promise<void>, keep?: boolean) {
        await run();
        if (!keep) dismiss(toast.id);
    }
</script>

<div class="toaster" aria-live="polite">
    {#each toasts.list as toast (toast.id)}
        <div
            class="toast {toast.kind}"
            role={toast.kind === "error" || toast.kind === "warn" ? "alert" : "status"}
            in:fly={{ y: -16, duration: 180 }}
            out:fly={{ y: -10, duration: 150 }}
            animate:flip={{ duration: 180 }}
        >
            <span class="icon" aria-hidden="true">{ICON[toast.kind]}</span>
            <div class="body">
                <div class="msg">{toast.message}</div>
                {#if toast.detail}<div class="detail">{toast.detail}</div>{/if}
                {#if toast.actions?.length}
                    <div class="actions">
                        {#each toast.actions as a, i (a.label)}
                            <button class="small" class:primary={i === 0} onclick={() => act(toast, a.run, a.keep)}>{a.label}</button>
                        {/each}
                    </div>
                {/if}
            </div>
            <button class="close ghost small" onclick={() => dismiss(toast.id)} aria-label={t("action.close")}>✕</button>
        </div>
    {/each}
</div>

<style>
    .toaster {
        position: fixed;
        top: calc(0.75rem + var(--safe-top));
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: min(460px, calc(100vw - 1.5rem));
        pointer-events: none;
    }
    .toast {
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        padding: 0.65rem 0.6rem 0.65rem 0.75rem;
        border-radius: var(--radius-sm);
        background: var(--bg-2);
        color: var(--text);
        border: 1px solid var(--line);
        border-left: 4px solid var(--tone);
        box-shadow: 0 8px 28px var(--shadow);
        font-size: 0.92rem;
    }
    .success {
        --tone: var(--ok);
    }
    .info {
        --tone: var(--info);
    }
    .warn {
        --tone: var(--warn);
    }
    .error {
        --tone: var(--bad);
    }
    .icon {
        flex-shrink: 0;
        width: 1.35rem;
        height: 1.35rem;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 0.75rem;
        font-weight: 700;
        color: #fff;
        background: var(--tone);
        margin-top: 0.05rem;
    }
    .body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }
    .msg {
        line-height: 1.4;
        overflow-wrap: anywhere;
    }
    .detail {
        color: var(--text-2);
        font-size: 0.84rem;
    }
    .actions {
        display: flex;
        gap: 0.4rem;
        margin-top: 0.25rem;
    }
    .close {
        flex-shrink: 0;
        min-height: 28px;
        padding: 0 0.45rem;
        color: var(--text-2);
    }
</style>
