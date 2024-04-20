<script lang="ts">
    import { onMount } from "svelte";
    import Scanner from "./Scanner.svelte";

    onMount(() => {
        navigator.serviceWorker &&
            navigator.serviceWorker.register("/js/worker.js").then(function (registration) {
                console.log("Service worker registered with scope: ", registration.scope);
            });
    });
</script>

<main>
    <h1 class="title"><a href="/">QR Detector</a></h1>

    <Scanner />
</main>

<style>
    main {
        padding: 1em;
        margin: 0 auto;
    }

    .title {
        text-transform: uppercase;
        text-align: center;
    }

    .title a {
        color: #343434;
        text-decoration: none;
    }

    .title a:hover {
        color: #0a58ca;
    }

    @media (min-width: 640px) {
        main {
            max-width: none;
        }

        .title {
            font-size: 1.6em;
        }
    }
</style>
