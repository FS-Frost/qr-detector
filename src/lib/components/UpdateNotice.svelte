<script lang="ts">
    // New published version (Kit polls _app/version.json every 5 min): offer it with a toast instead of reloading
    // in the middle of a scan. After the reload, confirm which version is running.
    import { onMount } from "svelte";
    import { updated } from "$app/state";
    import { version } from "$app/env";
    import { applyUpdate, noteVersion, registerServiceWorker } from "../pwa.ts";
    import { toast } from "../toast.svelte.ts";
    import { t } from "../i18n/index.ts";

    onMount(() => {
        void registerServiceWorker();
        if (version !== "dev" && noteVersion(version) !== null) toast.success(t("update.done", { version }), { key: "version" });
    });

    $effect(() => {
        if (updated.current)
            toast.info(t("update.available"), {
                duration: null,
                key: "version",
                actions: [{ label: t("action.update"), run: applyUpdate, keep: true }],
            });
    });
</script>
