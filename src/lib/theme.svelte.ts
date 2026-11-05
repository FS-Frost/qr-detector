// Theme per device (localStorage). "system" = no data-theme attribute: prefers-color-scheme decides (see app.css).
// app.html applies the saved value before first paint. The camera screen is always dark; this affects the panels.
export type ThemeMode = "light" | "dark" | "system";

export const THEME_KEY = "qr.theme";

export const theme = $state({ mode: "system" as ThemeMode });

export function initTheme() {
    try {
        const v = localStorage.getItem(THEME_KEY);
        theme.mode = v === "light" || v === "dark" ? v : "system";
    } catch {
        theme.mode = "system";
    }
}

export function setTheme(mode: ThemeMode) {
    theme.mode = mode;
    const root = document.documentElement;
    if (mode === "system") delete root.dataset.theme;
    else root.dataset.theme = mode;
    try {
        if (mode === "system") localStorage.removeItem(THEME_KEY);
        else localStorage.setItem(THEME_KEY, mode);
    } catch {
        /* storage blocked: applies to this visit only */
    }
}
