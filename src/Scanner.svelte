<script lang="ts">
    import { onMount } from "svelte";
    import * as qr from "html5-qrcode";

    let html5QrcodeScanner: qr.Html5QrcodeScanner;

    function onScanSuccess(decodedText: string, decodedResult: unknown) {
        // handle the scanned code as you like, for example:
        console.log(`Code matched = ${decodedText}`, decodedResult);
    }

    function onScanFailure(error: unknown) {
        // handle scan failure, usually better to ignore and keep scanning.
        // for example:
        console.warn(`Code scan error = ${error}`);
    }

    onMount(() => {
        const elementId = "reader";
        const verbose = false;
        html5QrcodeScanner = new qr.Html5QrcodeScanner(
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
            },
            verbose,
        );

        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    });
</script>

<div class="scanner">
    <div id="reader"></div>
</div>

<style>
    .scanner {
        margin: 5%;
    }
</style>
