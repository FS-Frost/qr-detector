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

## Conventions

- 4-space indent, double quotes.
- Code, comments and docs in English. UI text only through `t()` (i18n, es/en).
- localStorage keys prefixed `qr.`.
