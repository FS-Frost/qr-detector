import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

// Site base: "" locally; "/<repo>" on GitHub Pages (CI sets BASE_PATH).
const base = (process.env.BASE_PATH ?? "") as "" | `/${string}`;
// Version = short commit sha (GITHUB_SHA in Actions); "dev" locally.
const version = process.env.GITHUB_SHA?.slice(0, 7) || "dev";

export default defineConfig({
    plugins: [
        sveltekit({
            compilerOptions: {
                runes: ({ filename }) => (filename.split(/[/\\]/).includes("node_modules") ? undefined : true),
            },
            // SPA: 404.html serves any deep route on GitHub Pages (CI copies it to index.html).
            adapter: adapter({ pages: "build", assets: "build", fallback: "404.html", precompress: false, strict: false }),
            paths: { base, relative: false },
            // Registered manually in production only (src/lib/pwa.ts).
            serviceWorker: { register: false },
            // `updated` ($app/state) polls _app/version.json: see components/UpdateNotice.svelte.
            version: { name: version, pollInterval: version === "dev" ? 0 : 5 * 60_000 },
        }),
    ],
    // zxing-wasm loads its .wasm by URL: do not pre-bundle it.
    optimizeDeps: { exclude: ["zxing-wasm"] },
    server: { port: Number(process.env.PORT ?? 5173), strictPort: true },
});
