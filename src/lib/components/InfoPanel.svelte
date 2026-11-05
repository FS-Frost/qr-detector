<script lang="ts">
    // About: what the app does, version, active decoder, theme, and the repository link (replaces the old ribbon).
    import { version } from "$app/env";
    import Sheet from "./Sheet.svelte";
    import Icon from "./Icon.svelte";
    import { t } from "../i18n/index.ts";
    import { setTheme, theme, type ThemeMode } from "../theme.svelte.ts";
    import type { Decoder } from "../scanner/decoder.ts";

    let { engine, onclose }: { engine: Decoder["engine"] | null; onclose: () => void } = $props();

    const REPO = "https://github.com/FS-Frost/qr-detector";
    const MODES: ThemeMode[] = ["system", "light", "dark"];
</script>

<Sheet variant="panel" label={t("info.title")} {onclose}>
    {#snippet header()}
        <h2>{t("info.title")}</h2>
    {/snippet}

    <p class="lead">{t("info.description")}</p>

    <dl>
        <dt>{t("info.version")}</dt>
        <dd class="mono">{version}</dd>
        <dt>{t("info.engine")}</dt>
        <dd>{engine ? t(`engine.${engine}`) : t("engine.none")}</dd>
    </dl>

    <h3>{t("info.theme")}</h3>
    <div class="seg" role="radiogroup" aria-label={t("info.theme")}>
        {#each MODES as m (m)}
            <button role="radio" aria-checked={theme.mode === m} class:on={theme.mode === m} onclick={() => setTheme(m)}>{t(`theme.${m}`)}</button>
        {/each}
    </div>

    <p class="note">{t("info.language")}</p>

    <a class="btn repo" href={REPO} target="_blank" rel="noopener noreferrer"><Icon name="github" />{t("info.source")}</a>
</Sheet>

<style>
    h2 {
        margin: 0;
        font-size: 1.2rem;
    }
    h3 {
        margin: 1.4rem 0 0.5rem;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-2);
    }
    .lead {
        margin: 0 0 1rem;
        color: var(--text);
    }
    dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.4rem 1rem;
        margin: 0;
    }
    dt {
        color: var(--text-2);
    }
    dd {
        margin: 0;
    }
    .mono {
        font-family: var(--mono);
    }
    .seg {
        display: flex;
        padding: 3px;
        border-radius: var(--radius-sm);
        background: var(--bg-3);
    }
    .seg button {
        flex: 1;
        border: none;
        background: transparent;
        min-height: 38px;
        color: var(--text-2);
    }
    .seg button.on {
        background: var(--bg-2);
        color: var(--text);
        box-shadow: 0 1px 3px var(--shadow);
    }
    .note {
        color: var(--text-2);
        font-size: 0.88rem;
        margin: 1rem 0 1.4rem;
    }
    .repo {
        width: 100%;
    }
</style>
