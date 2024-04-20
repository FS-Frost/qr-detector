<script lang="ts">
    import { onMount } from "svelte";
    import * as qr from "html5-qrcode";

    let scanner: qr.Html5QrcodeScanner;
    let result: string = "";
    let isPaused: boolean = false;

    function onScanSuccess(decodedText: string, decodedResult: unknown): void {
        result = decodedText;
        if (result.length > 0) {
            scanner.pause();
            isPaused = true;
        }
    }

    function onScanFailure(error: unknown): void {
        result = "";
    }

    function resume(): void {
        scanner.resume();
        isPaused = false;
    }

    function pause(): void {
        scanner.pause();
        isPaused = true;
    }

    function openAsUrl(): void {
        const a = document.createElement("a");
        a.href = result;
        a.target = "_blank";
        a.click();
    }

    async function copyToClipboard(): Promise<void> {
        try {
            await navigator.clipboard.writeText(result);
            alert("Copied to clipboard!");
        } catch (error) {
            console.error("ERROR: copy to clipboard", error);
            alert("Could not copy to clipboard");
        }
    }

    onMount(() => {
        const elementId = "reader";
        const verbose = false;
        scanner = new qr.Html5QrcodeScanner(
            elementId,
            {
                fps: 60,
                qrbox: {
                    width: 250,
                    height: 250,
                },
                videoConstraints: {
                    facingMode: "environment",
                },
                rememberLastUsedCamera: true,
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true,
            },
            verbose
        );

        scanner.render(onScanSuccess, onScanFailure);
    });
</script>

<div class="scanner">
    {#if result.length > 0}
        <div class="result">
            <p>{result}</p>
        </div>

        <button class="button is-success is-fullwidth mb-2" on:click={() => openAsUrl()}>Open as URL</button>

        <button class="button is-success is-fullwidth mb-2" on:click={() => copyToClipboard()}>Copy to clipboard</button>
    {/if}

    {#if isPaused}
        <button class="button is-info is-fullwidth mb-2" on:click={() => resume()}>Resume</button>
    {:else}
        <button class="button is-info is-fullwidth mb-2" on:click={() => pause()}>Pause</button>
    {/if}

    <div id="reader"></div>
</div>

<style>
    .scanner {
        margin: 5%;
    }

    .result p {
        font-weight: 500;
        text-align: center;
    }

    button {
        font-weight: 500;
    }
</style>
