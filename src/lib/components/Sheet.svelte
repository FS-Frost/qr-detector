<script lang="ts" module>
    // Stack of open sheets: only the topmost reacts to Escape.
    const stack: symbol[] = [];
</script>

<script lang="ts">
    // Modal surface: a bottom sheet (results) or a full-screen panel (history, about). Not a native <dialog>: its top
    // layer would cover the toasts. The page behind gets `inert` from the caller while any sheet is open.
    // Close with ✕, Escape, the backdrop, or (sheet) dragging the header down.
    import type { Snippet } from "svelte";
    import { fade, fly } from "svelte/transition";
    import Icon from "./Icon.svelte";
    import { t } from "../i18n/index.ts";

    let {
        variant = "sheet",
        label,
        onclose,
        header,
        children,
        footer,
    }: {
        variant?: "sheet" | "panel";
        label: string;
        onclose: () => void;
        header: Snippet;
        children: Snippet;
        footer?: Snippet;
    } = $props();

    let el: HTMLElement;
    const id = Symbol();

    $effect(() => {
        const previous = document.activeElement as HTMLElement | null;
        stack.push(id);
        el.focus({ preventScroll: true });
        return () => {
            stack.splice(stack.indexOf(id), 1);
            previous?.focus?.({ preventScroll: true });
        };
    });

    function onkeydown(e: KeyboardEvent) {
        if (e.key === "Escape" && stack.at(-1) === id) {
            e.preventDefault();
            onclose();
        }
    }

    // ---------- Drag down to close (sheet only) ----------
    let dragY = $state(0);
    let dragging = $state(false);
    let startY = 0;

    function down(e: PointerEvent) {
        if (variant !== "sheet" || e.button > 0 || (e.target as HTMLElement).closest("button, a")) return;
        dragging = true;
        startY = e.clientY;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    function move(e: PointerEvent) {
        if (dragging) dragY = Math.max(0, e.clientY - startY);
    }
    function up() {
        if (!dragging) return;
        dragging = false;
        if (dragY > 90) onclose();
        dragY = 0;
    }
</script>

<svelte:window {onkeydown} />

<button class="backdrop" tabindex="-1" aria-hidden="true" onclick={onclose} transition:fade={{ duration: 150 }}></button>
<div
    class="surface {variant}"
    class:dragging
    role="dialog"
    aria-modal="true"
    aria-label={label}
    tabindex="-1"
    bind:this={el}
    style:transform={dragY ? `translateY(${dragY}px)` : undefined}
    transition:fly={{ y: variant === "sheet" ? 60 : 24, duration: 200 }}
>
    <div class="head" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} role="presentation">
        {#if variant === "sheet"}<span class="grip" aria-hidden="true"></span>{/if}
        <div class="title">{@render header()}</div>
        <button class="ghost close" onclick={onclose} aria-label={t("action.close")}><Icon name="close" /></button>
    </div>
    <div class="content">{@render children()}</div>
    {#if footer}<div class="foot">{@render footer()}</div>{/if}
</div>

<style>
    .backdrop {
        position: fixed;
        inset: 0;
        z-index: 40;
        background: rgb(0 0 0 / 0.5);
        border: none;
        border-radius: 0;
        padding: 0;
        cursor: default;
    }
    .backdrop:active {
        transform: none;
    }
    .surface {
        position: fixed;
        z-index: 41;
        display: flex;
        flex-direction: column;
        background: var(--bg);
        color: var(--text);
        box-shadow: 0 -8px 40px var(--shadow);
        outline: none;
        transition: transform 0.2s;
    }
    .surface.dragging {
        transition: none;
    }
    .sheet {
        left: 50%;
        bottom: 0;
        translate: -50% 0;
        width: min(560px, 100vw);
        max-height: min(85dvh, 760px);
        border-radius: var(--radius) var(--radius) 0 0;
        padding-bottom: var(--safe-bottom);
    }
    .panel {
        inset: 0;
        padding-top: var(--safe-top);
        padding-bottom: var(--safe-bottom);
    }
    @media (min-width: 720px) {
        .panel {
            inset: 2rem auto 2rem 50%;
            translate: -50% 0;
            width: 600px;
            border-radius: var(--radius);
            padding: 0;
            overflow: hidden;
        }
    }
    .head {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 0.5rem 0.6rem 1.1rem;
        border-bottom: 1px solid var(--line);
        touch-action: none;
    }
    .sheet .head {
        padding-top: 1.35rem;
        cursor: grab;
    }
    .grip {
        position: absolute;
        top: 0.5rem;
        left: 50%;
        translate: -50% 0;
        width: 40px;
        height: 4px;
        border-radius: 2px;
        background: var(--line);
    }
    .title {
        flex: 1;
        min-width: 0;
    }
    .close {
        flex-shrink: 0;
        color: var(--text-2);
        padding: 0.5rem;
    }
    .content {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 1rem 1.1rem;
    }
    .foot {
        display: flex;
        gap: 0.6rem;
        padding: 0.75rem 1.1rem 1rem;
        border-top: 1px solid var(--line);
    }
</style>
