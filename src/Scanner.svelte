<script lang="ts">
    import { onMount } from "svelte";
    import * as qr from "html5-qrcode";

    let scanner: qr.Html5QrcodeScanner;
    let results: string[] = [];
    let isPaused: boolean = false;

    function onScanSuccess(decodedText: string, decodedResult: unknown): void {
        if (results.length > 0 && results[0] === decodedText) {
            return;
        }

        results = [decodedText, ...results];
    }

    function resume(): void {
        scanner.resume();
        isPaused = false;
    }

    function pause(): void {
        scanner.pause();
        isPaused = true;
    }

    async function copyToClipboard(result: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(result);
            alert(`Copied to clipboard: ${result}`);
        } catch (error) {
            console.error(`ERROR: copy to clipboard: ${result}`, error);
            alert(`Could not copy to clipboard: ${result}`);
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
                <p>
                    {#if result.startsWith("http")}
                        <a href={result} target="_blank">{result}</a>
                    {:else}
                        <span>{result}</span>
                    {/if}
                </p>

                <div class="buttons">
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

    .result p,
    .result a {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 50%;
        font-weight: 500;
        margin-right: 0.5rem;
    }

    .result a {
        text-decoration: underline;
    }

    .result .buttons {
        display: flex;
        width: 50%;
    }

    button {
        font-weight: 500;
    }
</style>
