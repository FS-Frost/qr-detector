<script lang="ts">
    // A scanned (or history) entry: what it is, its fields, and the actions that fit its kind.
    import Sheet from "./Sheet.svelte";
    import Icon from "./Icon.svelte";
    import { mailtoHref, mapsUrl, parseContent, searchUrl, smsHref, telHref } from "../content/parse.ts";
    import { formatLabel } from "../scanner/formats.ts";
    import { relativeTime, t } from "../i18n/index.ts";
    import { canShare, copyText, downloadText, shareContent } from "../actions.ts";
    import type { Entry } from "../history.svelte.ts";

    let {
        entry,
        fromHistory = false,
        onclose,
        ondelete,
    }: { entry: Entry; fromHistory?: boolean; onclose: () => void; ondelete?: () => void } = $props();

    const content = $derived(parseContent(entry.text, entry.format));
    const share = canShare();

    function shareIt() {
        void shareContent(content.kind === "url" ? { url: content.url } : { text: entry.text });
    }

    function saveContact() {
        if (content.kind !== "contact") return;
        const name = (content.name || "contact").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 60);
        downloadText(content.vcard, `${name}.vcf`, "text/vcard");
    }
</script>

<Sheet label={t(`kind.${content.kind}`)} {onclose}>
    {#snippet header()}
        <div class="hdr">
            <span class="kind-icon"><Icon name={content.kind} /></span>
            <div>
                <div class="kind">{t(`kind.${content.kind}`)}</div>
                <div class="meta">{formatLabel(entry.format)} · {relativeTime(entry.at)}</div>
            </div>
        </div>
    {/snippet}

    {#if content.kind === "url"}
        <div class="label">{t("field.site")}</div>
        <div class="big">{content.host}</div>
        <div class="mono break">{content.url}</div>
    {:else if content.kind === "wifi"}
        <dl>
            <dt>{t("field.network")}</dt>
            <dd class="big">{content.ssid}</dd>
            <dt>{t("field.password")}</dt>
            <dd class="mono break">{content.password || "—"}</dd>
            <dt>{t("field.security")}</dt>
            <dd>{content.security || t("field.openNetwork")}{content.hidden ? ` · ${t("field.hidden")}` : ""}</dd>
        </dl>
    {:else if content.kind === "contact"}
        <div class="big">{content.name || "—"}</div>
        <dl>
            {#if content.org}<dt>{t("field.org")}</dt><dd>{content.org}</dd>{/if}
            {#each content.phones as p (p)}<dt>{t("field.phone")}</dt><dd><a href={telHref(p)}>{p}</a></dd>{/each}
            {#each content.emails as m (m)}<dt>{t("field.email")}</dt><dd class="break"><a href={mailtoHref(m, "", "")}>{m}</a></dd>{/each}
            {#if content.url}<dt>URL</dt><dd class="mono break">{content.url}</dd>{/if}
        </dl>
    {:else if content.kind === "email"}
        <dl>
            <dt>{t("field.to")}</dt>
            <dd class="big break">{content.to}</dd>
            {#if content.subject}<dt>{t("field.subject")}</dt><dd>{content.subject}</dd>{/if}
            {#if content.body}<dt>{t("field.message")}</dt><dd class="pre">{content.body}</dd>{/if}
        </dl>
    {:else if content.kind === "phone"}
        <div class="big">{content.number}</div>
    {:else if content.kind === "sms"}
        <dl>
            <dt>{t("field.phone")}</dt>
            <dd class="big">{content.number}</dd>
            {#if content.body}<dt>{t("field.message")}</dt><dd class="pre">{content.body}</dd>{/if}
        </dl>
    {:else if content.kind === "geo"}
        <dl>
            <dt>{t("field.coords")}</dt>
            <dd class="big mono">{content.lat}, {content.lon}</dd>
            {#if content.query}<dd>{content.query}</dd>{/if}
        </dl>
    {:else if content.kind === "product"}
        <div class="label">{t("field.code")}</div>
        <div class="big mono">{content.code}</div>
    {:else}
        <div class="pre text">{content.text}</div>
    {/if}

    {#if content.kind !== "text" && content.kind !== "product" && !(content.kind === "url" && content.url === entry.text.trim())}
        <details>
            <summary>{t("field.raw")}</summary>
            <div class="pre mono raw">{entry.text}</div>
        </details>
    {/if}

    <div class="actions">
        {#if content.kind === "url"}
            <a class="btn primary" href={content.url} target="_blank" rel="noopener noreferrer"><Icon name="external" />{t("action.open")}</a>
        {:else if content.kind === "wifi" && content.password}
            <button class="primary" onclick={() => copyText(content.password)}><Icon name="copy" />{t("action.copyPassword")}</button>
        {:else if content.kind === "contact"}
            <button class="primary" onclick={saveContact}><Icon name="contact" />{t("action.addContact")}</button>
        {:else if content.kind === "email"}
            <a class="btn primary" href={mailtoHref(content.to, content.subject, content.body)}><Icon name="email" />{t("action.sendEmail")}</a>
        {:else if content.kind === "phone"}
            <a class="btn primary" href={telHref(content.number)}><Icon name="phone" />{t("action.call")}</a>
        {:else if content.kind === "sms"}
            <a class="btn primary" href={smsHref(content.number, content.body)}><Icon name="sms" />{t("action.sendSms")}</a>
        {:else if content.kind === "geo"}
            <a class="btn primary" href={mapsUrl(content.lat, content.lon)} target="_blank" rel="noopener noreferrer"><Icon name="geo" />{t("action.openMap")}</a>
        {:else if content.kind === "product"}
            <a class="btn primary" href={searchUrl(content.code)} target="_blank" rel="noopener noreferrer"><Icon name="search" />{t("action.searchProduct")}</a>
        {/if}
        <button onclick={() => copyText(content.kind === "url" ? content.url : entry.text)}><Icon name="copy" />{t("action.copy")}</button>
        {#if share}<button onclick={shareIt}><Icon name="share" />{t("action.share")}</button>{/if}
        {#if content.kind === "text" && entry.text.trim().length <= 300}
            <a class="btn" href={searchUrl(entry.text.trim())} target="_blank" rel="noopener noreferrer"><Icon name="search" />{t("action.searchWeb")}</a>
        {/if}
    </div>

    {#snippet footer()}
        {#if fromHistory}
            <button class="danger" onclick={ondelete}><Icon name="trash" />{t("action.delete")}</button>
            <button class="grow" onclick={onclose}>{t("action.close")}</button>
        {:else}
            <button class="grow primary-outline" onclick={onclose}>{t("action.scanAgain")}</button>
        {/if}
    {/snippet}
</Sheet>

<style>
    .hdr {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    .kind-icon {
        display: grid;
        place-items: center;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: color-mix(in srgb, var(--accent) 18%, transparent);
        color: var(--accent);
        flex-shrink: 0;
    }
    .kind {
        font-weight: 700;
        font-size: 1.05rem;
    }
    .meta {
        color: var(--text-2);
        font-size: 0.85rem;
    }
    .label,
    dt {
        color: var(--text-2);
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }
    dl {
        margin: 0;
        display: grid;
        gap: 0.15rem;
    }
    dd {
        margin: 0 0 0.55rem;
    }
    .big {
        font-size: 1.3rem;
        font-weight: 700;
        overflow-wrap: anywhere;
        margin-bottom: 0.3rem;
    }
    .mono {
        font-family: var(--mono);
        font-size: 0.92rem;
    }
    .big.mono {
        font-size: 1.25rem;
    }
    .break {
        overflow-wrap: anywhere;
        word-break: break-word;
    }
    .pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
    .text {
        font-size: 1.05rem;
        max-height: 40dvh;
        overflow-y: auto;
        user-select: text;
    }
    .mono {
        color: var(--text-2);
    }
    .big.mono {
        color: var(--text);
    }
    details {
        margin-top: 0.8rem;
        color: var(--text-2);
        font-size: 0.88rem;
    }
    summary {
        cursor: pointer;
    }
    .raw {
        margin-top: 0.4rem;
        padding: 0.6rem;
        border-radius: var(--radius-sm);
        background: var(--bg-3);
        max-height: 30dvh;
        overflow-y: auto;
        user-select: text;
    }
    .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 1.1rem;
    }
    .actions > :global(.primary) {
        flex-basis: 100%;
    }
    .actions > :global(:not(.primary)) {
        flex: 1;
    }
    .grow {
        flex: 1;
    }
    .primary-outline {
        border-color: var(--accent);
        color: var(--accent);
        background: transparent;
    }
</style>
