# CLAUDE.md

QR/barcode scanner PWA. **Static site (GitHub Pages)**: SvelteKit 3 SPA (`adapter-static`, `ssr = false`) + Svelte 5 (runes) + TS. Tooling/tests on **Bun** (1.4.4, pinned in CI). Patterns mirror the sibling repo `../sensei`.

## Commands

- `bun run dev` — Vite dev server (port 5173). Camera needs a secure context: `localhost` works; a phone on the LAN needs HTTPS.
- `bun test` — tests in `tests/` (pure logic only, no DOM).
- `bun run check` — svelte-check; keep at 0 errors / 0 warnings.
- `bun run build` — static site in `build/`; `BASE_PATH=/qr-detector` for Pages (Git Bash: prefix `MSYS_NO_PATHCONV=1` or it mangles `/qr-detector`). CI copies `404.html` → `index.html`.
- `bun run preview` — serves `build/`; restart it after each build.
- Deploy: `.github/workflows/main.yml` on push to `main` (check, test, build, push `build/` to `gh-pages`). **Every push to main deploys.**

## SvelteKit 3 specifics

- No `svelte.config.js`: Kit options live in the `sveltekit({...})` plugin in `vite.config.ts`.
- Alias `#lib/*` (package.json `imports`); **imports need file extensions** (`#lib/theme.svelte.ts`).
- `$app/state` (no stores). `$app/paths` has no `base`: use `#lib/base.ts`.
- `tsconfig.json` `types` must include `$app/types`. TypeScript pinned to 6.x (TS 7 breaks svelte-check).

## Architecture

- Single route `src/routes/+page.svelte`: full-screen `<video>` + viewfinder + floating controls. Phases `starting → live ⇄ suspended (tab hidden, camera released) · error`. The scan loop runs (`$effect`) only while `live` and no overlay is open; overlays set `inert` on `<main>`.
- `lib/scanner/`
  - `camera.ts` — `getUserMedia` (rear camera, ideal 1080p), remembers the device in `qr.camera`, torch/zoom via `applyConstraints` only when `getCapabilities()` reports them. A generation counter makes a stale `start` release its stream and throw `Superseded` (ignored by the page).
  - `decoder.ts` — native `BarcodeDetector` if it supports `qr_code`, else `zxing-wasm/reader` (dynamic import; `.wasm` imported with `?url` so it ships with the app and is precached: never the jsDelivr default). `decodeFile` tries native then zxing `tryHarder`.
  - `loop.ts` — `requestVideoFrameCallback` (rAF fallback), ≤ ~12 fps, decodes only the on-screen part of the frame (`visibleRect`, object-fit cover) scaled to ≤ 1024 px. `onHit` returning false ignores a read (used for the 3 s repeat cooldown after closing a result).
  - `errors.ts` — `ScanErrorCode` (`insecure|unsupported|denied|no-camera|in-use|decoder|unknown`); each has `error.<code>.title/help` texts.
  - `formats.ts` — canonical ids = BarcodeDetector names; `fromZxing` maps zxing names/variants.
- `lib/content/parse.ts` — `parseContent(text, format)` → url / wifi / contact (vCard, MECARD) / email (mailto, MATMSG) / phone / sms / geo / product (EAN/UPC only) / text. **Security: only http(s) becomes a link**; other schemes stay text. Action hrefs built with encoding helpers there.
- `lib/history.svelte.ts` (+ pure `history-core.ts`) — `qr.history`, max 100, same text+format moves to the top; remove/clear return an undo function.
- `lib/i18n/` — `en.ts` is the source of keys, `es.ts` typed against it; language = `navigator.language` (`es*` → es), no override. `app.html` sets `<html lang>` early.
- UI pieces: `Sheet.svelte` (own modal, not `<dialog>`: its top layer would hide toasts; Escape closes only the topmost), `ResultSheet`, `HistoryPanel`, `InfoPanel` (version, decoder, theme, repo link), `Toaster` + `toast.svelte.ts`, `Icon` (inline SVG paths).
- `theme.svelte.ts` — `qr.theme` (light|dark|absent = system); the camera screen is always dark, panels follow the theme.
- PWA: `src/service-worker.ts` precaches `$app/manifest` `immutable` + `assets` + shell (cache `qr-<version>`), network-first navigation. Registered in prod by `lib/pwa.ts`; `UpdateNotice.svelte` offers updates (`updated` from `$app/state`) and confirms the version after reload (`qr.version`). The SW file is excluded from the main tsconfig (Kit requirement).

## Testing

- Unit: `tests/*.test.ts` (parse, i18n, history, scanner helpers).
- E2E (manual, not in CI): headless Edge with `--use-fake-device-for-media-stream --use-file-for-fake-video-capture=<qr>.y4m` driven over CDP (`--remote-debugging-port`). A Y4M with a QR can be made from an image with ffmpeg (`-loop 1 -t 2 -pix_fmt yuv420p`). Permission denied: `Browser.setPermission` without `--use-fake-ui-for-media-stream`. Offline: `Network.emulateNetworkConditions` against `bun run preview` (copy `build/404.html` to `build/index.html` first). Edge on Windows has no `BarcodeDetector`, so this exercises zxing.

## Conventions

- 4-space indent, double quotes.
- Code, comments and docs in English. UI text only through `t()` (i18n, es/en).
- localStorage keys prefixed `qr.`.
