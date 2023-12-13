<script lang="ts">
    import Scanner from "./Scanner.svelte";
</script>

<main>
    <h1 class="title"><a href="/">QR Scanner</a></h1>

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
