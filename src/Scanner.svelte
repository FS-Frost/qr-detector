<script lang="ts">
    import { onMount } from "svelte";
    import * as qr from "html5-qrcode";

    let scanner: qr.Html5QrcodeScanner;
    let results: string[] = [];
    let isPaused: boolean = false;

    function onScanSuccess(decodedText: string, decodedResult: unknown): void {
        results.push(decodedText);
    }

    function resume(): void {
        scanner.resume();
        isPaused = false;
    }

    function pause(): void {
        scanner.pause();
        isPaused = true;
    }

    function openAsUrl(result: string): void {
        const a = document.createElement("a");
        a.href = result;
        a.target = "_blank";
        a.click();
    }

    async function copyToClipboard(result: string): Promise<void> {
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

        const onScanFailure = () => {};
        scanner.render(onScanSuccess, onScanFailure);
        const btnStartCamera = document.querySelector("#html5-qrcode-button-camera-permission");
        if (btnStartCamera == null || !(btnStartCamera instanceof HTMLButtonElement)) {
            return;
        }

        btnStartCamera.click();
    });
</script>

<div class="scanner">
    <div class="results">
        {#each results as result}
            <div class="result mb-2">
                <p>{result}</p>

                <div class="buttons">
                    <button class="button is-success" on:click={() => openAsUrl(result)}>Open as URL</button>

                    <button class="button is-success" on:click={() => copyToClipboard(result)}>Copy to clipboard</button>
                </div>
            </div>
        {/each}
    </div>

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

    .results {
        height: 12rem;
        overflow: auto;
    }

    .result {
        display: flex;
    }

    .result p {
        width: 50%;
        font-weight: 500;
        text-align: center;
    }

    .result .buttons {
        display: flex;
        width: 50%;
    }

    button {
        font-weight: 500;
    }
</style>
