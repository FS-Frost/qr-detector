<script lang="ts">
    import "../app.css";
    import Toaster from "#lib/components/Toaster.svelte";
    import UpdateNotice from "#lib/components/UpdateNotice.svelte";
    import { initTheme } from "#lib/theme.svelte.ts";
    import { loadHistory } from "#lib/history.svelte.ts";

    let { children } = $props();

    initTheme();
    loadHistory();
</script>

{@render children()}
<Toaster />
<UpdateNotice />
