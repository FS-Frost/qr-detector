import { describe, expect, test } from "bun:test";
import { en } from "../src/lib/i18n/en.ts";
import { es } from "../src/lib/i18n/es.ts";
import { detectLang, relativeTime, translate } from "../src/lib/i18n/index.ts";

describe("i18n", () => {
    test("language detection", () => {
        expect(detectLang("es-CL")).toBe("es");
        expect(detectLang("es")).toBe("es");
        expect(detectLang("en-US")).toBe("en");
        expect(detectLang("pt-BR")).toBe("en");
        expect(detectLang("esperanto")).toBe("en");
        expect(detectLang(undefined)).toBe("en");
    });
    test("both dictionaries have the same keys and no empty text", () => {
        expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
        for (const v of [...Object.values(en), ...Object.values(es)]) expect(v.trim()).not.toBe("");
    });
    test("placeholders match between languages", () => {
        const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        for (const k of Object.keys(en) as (keyof typeof en)[]) expect(ph(es[k])).toEqual(ph(en[k]));
    });
    test("interpolation", () => {
        expect(translate("en", "history.count", { n: 3, max: 100 })).toBe("3 saved · last 100");
        expect(translate("es", "update.done", { version: "abc1234" })).toBe("Actualizada a la versión abc1234");
    });
    test("relative time", () => {
        const now = 1_700_000_000_000;
        // Exact wording depends on the ICU version: check the number and the unit only.
        expect(relativeTime(now - 5 * 60_000, now, "en")).toMatch(/^5 min/);
        expect(relativeTime(now - 30 * 86400_000, now, "en")).toContain("2023");
    });
});
