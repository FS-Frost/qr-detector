<script lang="ts" module>
    // Stroke icons, 24×24 grid. Circles are written as two arcs so every icon is a list of path strings.
    const c = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

    const ICONS = {
        close: ["M18 6 6 18", "M6 6l12 12"],
        history: [c(12, 12, 9), "M12 7v5l3 2"],
        info: [c(12, 12, 9), "M12 16v-5", "M12 8h.01"],
        torch: ["M13 2 4 14h7l-1 8 9-12h-7l1-8z"],
        torchOff: ["M13 2 4 14h7l-1 8 9-12h-7l1-8z", "M3 3l18 18"],
        image: ["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", c(8.5, 8.5, 1.5), "M21 15l-5-5L5 21"],
        switch: ["M20 4v5h-5", "M4 20v-5h5", "M5.1 9a7 7 0 0 1 12.4-2.5L20 9", "M18.9 15a7 7 0 0 1-12.4 2.5L4 15"],
        copy: ["M10 9h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z", "M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"],
        share: [c(18, 5, 3), c(6, 12, 3), c(18, 19, 3), "M8.6 13.5l6.8 4", "M15.4 6.5l-6.8 4"],
        external: ["M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", "M15 3h6v6", "M10 14 21 3"],
        url: ["M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7", "M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"],
        wifi: ["M5 12.5a11 11 0 0 1 14 0", "M1.5 9a16 16 0 0 1 21 0", "M8.5 16a6 6 0 0 1 7 0", "M12 20h.01"],
        contact: [c(12, 8, 4), "M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"],
        email: ["M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M22 7l-10 7L2 7"],
        phone: ["M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M12 18h.01"],
        sms: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
        geo: ["M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z", c(12, 10, 3)],
        product: ["M3 5v14", "M7 5v14", "M10 5v14", "M14 5v14", "M17 5v14", "M21 5v14"],
        text: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M16 13H8", "M16 17H8", "M10 9H8"],
        trash: ["M3 6h18", "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6", "M10 11v6", "M14 11v6", "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"],
        search: [c(11, 11, 7), "M20 20l-4-4"],
        cameraOff: ["M2 2l20 20", "M9 4h6l2 3h3a2 2 0 0 1 2 2v9", "M21 20H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3", "M14.1 14.1a3 3 0 0 1-4.2-4.2"],
        retry: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5"],
        github: ["M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.4 6.4-1.5 6.4-7a5.4 5.4 0 0 0-1.5-3.7 5 5 0 0 0-.1-3.8s-1.2-.3-3.9 1.5a13.4 13.4 0 0 0-7 0C6.3 1.7 5.1 2 5.1 2a5 5 0 0 0-.1 3.8A5.4 5.4 0 0 0 3.5 9.5c0 5.4 3.3 6.6 6.4 7a3.4 3.4 0 0 0-.9 2.6V23"],
    } as const;

    export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
    let { name, size = 22 }: { name: IconName; size?: number } = $props();
</script>

<svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
>
    {#each ICONS[name] as d (d)}<path {d} />{/each}
</svg>
