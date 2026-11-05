// Site base without trailing slash: "" locally, "/<repo>" on GitHub Pages (Kit paths.base → Vite base).
// Kit 3 no longer exports `base` from $app/paths.
export const base = import.meta.env.BASE_URL.replace(/\/$/, "");
