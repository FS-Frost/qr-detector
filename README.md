# qr-detector

PWA QR detector because my phone can't read them natively and I don't want to upgrade it.

[https://fs-frost.github.io/qr-detector](https://fs-frost.github.io/qr-detector)

## Features

- Full-screen camera scanner for QR codes and barcodes (QR, Micro QR, rMQR, Data Matrix, Aztec, PDF417, EAN-8/13, UPC-A/E, Code 39/93/128, ITF, Codabar, DataBar).
- Uses the browser's built-in `BarcodeDetector` when it supports QR (Android Chrome, Safari), otherwise [zxing-wasm](https://github.com/Sec-ant/zxing-wasm).
- Scan from an image (gallery, screenshots).
- Actions per content type: open link (http/https only, domain shown first), copy the Wi-Fi password, add a contact (.vcf), call, SMS, email, open in maps, search a product code, copy, share.
- History of the last 100 scans, stored only on the device.
- Flashlight, zoom and camera switch when the device supports them.
- Works offline once loaded (installable PWA), with a notice when a new version is published.
- English and Spanish, following the device language. Light/dark theme.
- Nothing leaves your device.

## Built with

- [SvelteKit](https://svelte.dev/docs/kit) (static SPA) + [Svelte 5](https://svelte.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Bun](https://bun.sh/)

## Run locally

Requires Bun 1.4.4.

```shell
bun install
bun run dev
```

Go to http://localhost:5173. The camera only works on `localhost` or HTTPS.

Other commands:

```shell
bun test        # unit tests
bun run check   # svelte-check (0 errors, 0 warnings)
bun run build   # static site in build/
```

Pushing to `main` deploys to GitHub Pages (`.github/workflows/main.yml`).
