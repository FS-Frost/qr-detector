<script lang="ts">
    // Scanner screen: full-screen camera with a viewfinder, floating controls, and overlays for the result,
    // the history and the about panel. States: starting → live ⇄ suspended (tab hidden) · error.
    import { onMount } from "svelte";
    import Icon from "#lib/components/Icon.svelte";
    import ResultSheet from "#lib/components/ResultSheet.svelte";
    import HistoryPanel from "#lib/components/HistoryPanel.svelte";
    import InfoPanel from "#lib/components/InfoPanel.svelte";
    import { Camera, Superseded, type CameraInfo, type Capabilities } from "#lib/scanner/camera.ts";
    import { createDecoder, decodeFile, type Decoder, type Detection } from "#lib/scanner/decoder.ts";
    import { ScanError, toScanError, type ScanErrorCode } from "#lib/scanner/errors.ts";
    import { scanLoop } from "#lib/scanner/loop.ts";
    import { addToHistory, history, removeFromHistory, type Entry } from "#lib/history.svelte.ts";
    import { vibrate } from "#lib/actions.ts";
    import { keepAwake } from "#lib/wakeLock.ts";
    import { toast } from "#lib/toast.svelte.ts";
    import { t } from "#lib/i18n/index.ts";

    type Phase = "starting" | "live" | "suspended" | "error";

    const camera = new Camera();
    let video: HTMLVideoElement;
    let fileInput: HTMLInputElement;

    let phase = $state<Phase>("starting");
    let errorCode = $state<ScanErrorCode>("unknown");
    let decoder = $state.raw<Decoder | null>(null);
    let caps = $state<Capabilities>({ torch: false, zoom: null });
    let torchOn = $state(false);
    let zoom = $state(1);
    let cameras = $state<CameraInfo[]>([]);
    let readingImage = $state(false);
    /** Open result. `frozen` = it came from the live camera, which stays paused on that frame until closed. */
    let current = $state<{ entry: Entry; fromHistory: boolean; frozen: boolean } | null>(null);
    let panel = $state<"history" | "info" | null>(null);

    const overlayOpen = $derived(current !== null || panel !== null);
    /** Retrying can't help when the page/browser itself can't use a camera. */
    const canRetry = $derived(errorCode !== "insecure" && errorCode !== "unsupported");

    async function start(deviceId?: string) {
        phase = "starting";
        torchOn = false;
        try {
            const [c, d] = await Promise.all([camera.start(video, deviceId), decoder ?? createDecoder()]);
            caps = c;
            zoom = c.zoom?.value ?? 1;
            decoder = d;
            phase = "live";
            cameras = await Camera.list();
        } catch (e) {
            if (e instanceof Superseded) return; // a newer start/stop took over
            camera.stop(video);
            errorCode = toScanError(e).code;
            phase = "error";
            console.error("[qr] camera/decoder start failed", e);
        }
    }

    function suspend() {
        camera.stop(video);
        phase = "suspended";
    }

    /** After closing a result, the same code (likely still in front of the camera) is ignored for a moment. */
    const REPEAT_COOLDOWN_MS = 3000;
    let lastClosed: { text: string; until: number } | null = null;

    function onHit(d: Detection): boolean {
        if (lastClosed && d.text === lastClosed.text && performance.now() < lastClosed.until) return false;
        vibrate();
        video.pause();
        current = { entry: addToHistory(d.text, d.format), fromHistory: false, frozen: true };
        return true;
    }

    function closeResult() {
        const wasFrozen = current?.frozen;
        if (current) lastClosed = { text: current.entry.text, until: performance.now() + REPEAT_COOLDOWN_MS };
        current = null;
        if (wasFrozen && phase === "live") void video.play().catch(() => {});
    }

    function deleteCurrent() {
        if (!current) return;
        const undo = removeFromHistory(current.entry.id);
        current = null;
        toast.info(t("toast.entryDeleted"), { key: "history-undo", actions: [{ label: t("action.undo"), run: undo }] });
    }

    async function toggleTorch() {
        try {
            await camera.setTorch(!torchOn);
            torchOn = !torchOn;
        } catch {
            toast.error(t("toast.torchFailed"));
        }
    }

    async function applyZoom(value: number) {
        zoom = value;
        try {
            await camera.setZoom(value);
        } catch {
            toast.error(t("toast.zoomFailed"), { key: "zoom" });
        }
    }

    function switchCamera() {
        if (cameras.length < 2) return;
        const i = cameras.findIndex((c) => c.deviceId === camera.deviceId);
        void start(cameras[(i + 1) % cameras.length].deviceId);
    }

    async function onFile(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        input.value = ""; // picking the same file again must fire change again
        if (!file) return;
        readingImage = true;
        try {
            const hit = await decodeFile(file);
            if (hit) {
                vibrate();
                current = { entry: addToHistory(hit.text, hit.format), fromHistory: false, frozen: false };
            } else toast.warn(t("toast.noCodeInImage"), { detail: t("toast.noCodeInImageDetail") });
        } catch (err) {
            if (err instanceof ScanError && err.code === "decoder") toast.error(t("error.decoder.title"), { detail: t("error.decoder.help") });
            else toast.error(t("toast.imageFailed"));
            console.error("[qr] image decode failed", err);
        } finally {
            readingImage = false;
        }
    }

    // Scan only while the camera is live and nothing covers it.
    $effect(() => {
        if (phase !== "live" || !decoder || overlayOpen || readingImage) return;
        const ctrl = new AbortController();
        scanLoop(video, decoder, onHit, ctrl.signal, (err) => {
            console.error("[qr] repeated decode failures", err);
            toast.warn(t("toast.scanTrouble"), { key: "scan-trouble" });
        });
        return () => ctrl.abort();
    });

    // Screen stays on while scanning.
    $effect(() => {
        if (phase === "live") return keepAwake();
    });

    onMount(() => {
        // Release the camera when the tab is hidden (battery, privacy, other apps); reopen on return.
        const onVisibility = () => {
            if (document.hidden) {
                if (phase === "live" || phase === "starting") suspend();
            } else if (phase === "suspended") void start();
        };
        document.addEventListener("visibilitychange", onVisibility);
        void start();
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            camera.stop(video);
        };
    });
</script>

<main class="scanner" inert={overlayOpen}>
    <!-- svelte-ignore a11y_media_has_caption (live camera preview, no audio) -->
    <video bind:this={video} class:visible={phase === "live"} playsinline muted autoplay></video>

    {#if phase === "live"}
        <div class="finder" aria-hidden="true">
            <div class="window"><span class="line"></span></div>
        </div>
        <p class="hint">{t("scan.hint")}</p>
    {:else if phase === "starting" || phase === "suspended"}
        <div class="center">
            <span class="spinner" aria-hidden="true"></span>
            <p>{t("scan.starting")}</p>
        </div>
    {:else}
        <div class="center error" role="alert">
            <Icon name="cameraOff" size={48} />
            <h1>{t(`error.${errorCode}.title`)}</h1>
            <p>{t(`error.${errorCode}.help`)}</p>
            <div class="error-actions">
                {#if canRetry}<button class="primary" onclick={() => start()}><Icon name="retry" />{t("action.retry")}</button>{/if}
                <button onclick={() => fileInput.click()}><Icon name="image" />{t("action.fromImage")}</button>
            </div>
        </div>
    {/if}

    {#if readingImage}
        <div class="center reading">
            <span class="spinner" aria-hidden="true"></span>
            <p>{t("scan.reading")}</p>
        </div>
    {/if}

    <header class="bar top">
        <span class="brand">{t("app.title")}</span>
        <div class="group">
            <button class="fab" onclick={() => (panel = "history")} aria-label={t("action.history")}>
                <Icon name="history" />
                {#if history.list.length}<span class="badge">{history.list.length}</span>{/if}
            </button>
            <button class="fab" onclick={() => (panel = "info")} aria-label={t("action.info")}><Icon name="info" /></button>
        </div>
    </header>

    <footer class="bar bottom" hidden={phase === "error"}>
        {#if phase === "live" && caps.zoom}
            <label class="zoom">
                <span class="sr-only">{t("action.zoom")}</span>
                <input
                    type="range"
                    min={caps.zoom.min}
                    max={caps.zoom.max}
                    step={caps.zoom.step}
                    value={zoom}
                    oninput={(e) => applyZoom(Number(e.currentTarget.value))}
                />
                <span class="zoom-value">{zoom.toFixed(1)}×</span>
            </label>
        {/if}
        <div class="controls">
            <div class="slot">
                {#if phase === "live" && caps.torch}
                    <button class="fab" class:on={torchOn} onclick={toggleTorch} aria-pressed={torchOn} aria-label={torchOn ? t("action.torchOff") : t("action.torchOn")}>
                        <Icon name={torchOn ? "torchOff" : "torch"} />
                    </button>
                {/if}
            </div>
            <button class="fab big" onclick={() => fileInput.click()} disabled={readingImage} aria-label={t("action.fromImage")} title={t("action.fromImage")}>
                <Icon name="image" size={26} />
            </button>
            <div class="slot">
                {#if phase === "live" && cameras.length > 1}
                    <button class="fab" onclick={switchCamera} aria-label={t("action.switchCamera")}><Icon name="switch" /></button>
                {/if}
            </div>
        </div>
    </footer>

    <input bind:this={fileInput} type="file" accept="image/*" hidden onchange={onFile} />
</main>

{#if panel === "history"}
    <HistoryPanel onclose={() => (panel = null)} onopen={(entry) => (current = { entry, fromHistory: true, frozen: false })} />
{:else if panel === "info"}
    <InfoPanel engine={decoder?.engine ?? null} onclose={() => (panel = null)} />
{/if}

{#if current}
    {#key current.entry.id}
        <ResultSheet entry={current.entry} fromHistory={current.fromHistory} onclose={closeResult} ondelete={deleteCurrent} />
    {/key}
{/if}

<style>
    .scanner {
        position: fixed;
        inset: 0;
        overflow: hidden;
        background: #000;
        color: #fff;
        --fab-bg: rgb(20 20 24 / 0.55);
    }
    video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        transition: opacity 0.25s;
    }
    video.visible {
        opacity: 1;
    }

    /* Viewfinder: a clear square, the rest dimmed by a huge box-shadow. */
    .finder {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        pointer-events: none;
    }
    .window {
        --size: min(72vw, 52dvh, 340px);
        position: relative;
        width: var(--size);
        height: var(--size);
        border-radius: 22px;
        box-shadow: 0 0 0 100vmax rgb(0 0 0 / 0.45);
        overflow: hidden;
        /* Corner brackets */
        background:
            linear-gradient(#fff, #fff) top left / 34px 4px no-repeat,
            linear-gradient(#fff, #fff) top left / 4px 34px no-repeat,
            linear-gradient(#fff, #fff) top right / 34px 4px no-repeat,
            linear-gradient(#fff, #fff) top right / 4px 34px no-repeat,
            linear-gradient(#fff, #fff) bottom left / 34px 4px no-repeat,
            linear-gradient(#fff, #fff) bottom left / 4px 34px no-repeat,
            linear-gradient(#fff, #fff) bottom right / 34px 4px no-repeat,
            linear-gradient(#fff, #fff) bottom right / 4px 34px no-repeat;
    }
    .line {
        position: absolute;
        left: 8%;
        right: 8%;
        height: 2px;
        border-radius: 1px;
        background: var(--accent);
        box-shadow: 0 0 12px 2px var(--accent);
        animation: sweep 2.4s ease-in-out infinite alternate;
    }
    @keyframes sweep {
        from {
            top: 10%;
        }
        to {
            top: 90%;
        }
    }
    .hint {
        position: absolute;
        left: 0;
        right: 0;
        top: calc(50% + min(36vw, 26dvh, 170px) + 1rem);
        margin: 0;
        text-align: center;
        font-weight: 600;
        text-shadow: 0 1px 4px rgb(0 0 0 / 0.8);
        pointer-events: none;
    }

    .center {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        padding: 6rem 1.5rem;
        text-align: center;
    }
    .center p {
        margin: 0;
        max-width: 26rem;
        color: rgb(255 255 255 / 0.8);
    }
    .center.reading {
        background: rgb(0 0 0 / 0.6);
    }
    .error h1 {
        margin: 0.4rem 0 0;
        font-size: 1.3rem;
        max-width: 26rem;
    }
    .error :global(svg) {
        color: rgb(255 255 255 / 0.6);
    }
    .error-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.6rem;
        margin-top: 1rem;
    }
    .error-actions button:not(.primary) {
        background: var(--fab-bg);
        border-color: rgb(255 255 255 / 0.25);
        color: #fff;
    }
    .spinner {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid rgb(255 255 255 / 0.25);
        border-top-color: #fff;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .bar {
        position: absolute;
        left: 0;
        right: 0;
        display: flex;
        padding-inline: max(1rem, env(safe-area-inset-left)) max(1rem, env(safe-area-inset-right));
    }
    .top {
        top: 0;
        align-items: center;
        justify-content: space-between;
        padding-top: calc(0.75rem + var(--safe-top));
        background: linear-gradient(rgb(0 0 0 / 0.55), transparent);
        padding-bottom: 1.5rem;
    }
    .brand {
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-size: 0.95rem;
        text-shadow: 0 1px 4px rgb(0 0 0 / 0.6);
    }
    .group {
        display: flex;
        gap: 0.5rem;
    }
    .bottom {
        bottom: 0;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding-top: 2rem;
        padding-bottom: calc(1.25rem + var(--safe-bottom));
        background: linear-gradient(transparent, rgb(0 0 0 / 0.6));
    }
    .controls {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        width: min(100%, 360px);
    }
    .slot {
        display: flex;
        justify-content: center;
    }
    .fab {
        position: relative;
        width: 48px;
        height: 48px;
        min-height: 0;
        padding: 0;
        border-radius: 50%;
        border: 1px solid rgb(255 255 255 / 0.18);
        background: var(--fab-bg);
        color: #fff;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
    }
    .fab.big {
        width: 68px;
        height: 68px;
        background: rgb(255 255 255 / 0.92);
        color: #111;
        border: 4px solid rgb(255 255 255 / 0.35);
        background-clip: padding-box;
    }
    .fab.on {
        background: #ffd84d;
        color: #111;
    }
    .badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 20px;
        height: 20px;
        padding: 0 5px;
        border-radius: 10px;
        background: var(--accent);
        color: var(--accent-ink);
        font-size: 0.72rem;
        font-weight: 800;
        line-height: 20px;
    }
    .zoom {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        width: min(100%, 320px);
        padding: 0.35rem 0.8rem;
        border-radius: 999px;
        background: var(--fab-bg);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
    }
    .zoom input {
        flex: 1;
        accent-color: #fff;
    }
    .zoom-value {
        font-variant-numeric: tabular-nums;
        font-size: 0.85rem;
        min-width: 2.6rem;
        text-align: right;
    }
</style>
