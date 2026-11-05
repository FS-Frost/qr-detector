import { describe, expect, test } from "bun:test";
import { addEntry, parseStored, type Entry } from "../src/lib/history-core.ts";

const e = (id: string, text: string, at = 0, format: Entry["format"] = "qr_code"): Entry => ({ id, text, format, at });

describe("addEntry", () => {
    test("newest first", () => {
        expect(addEntry([e("1", "a")], e("2", "b")).map((x) => x.id)).toEqual(["2", "1"]);
    });
    test("same content moves up instead of duplicating", () => {
        const list = [e("1", "a"), e("2", "b"), e("3", "c")];
        expect(addEntry(list, e("4", "b")).map((x) => x.id)).toEqual(["4", "1", "3"]);
    });
    test("same text with another format is a different entry", () => {
        expect(addEntry([e("1", "123", 0, "ean_13")], e("2", "123", 0, "code_128"))).toHaveLength(2);
    });
    test("caps the length", () => {
        let list: Entry[] = [];
        for (let i = 0; i < 105; i++) list = addEntry(list, e(String(i), `t${i}`));
        expect(list).toHaveLength(100);
        expect(list[0].id).toBe("104");
        expect(list[99].id).toBe("5");
    });
});

describe("parseStored", () => {
    test("empty, invalid JSON or non-arrays give an empty list", () => {
        expect(parseStored(null)).toEqual([]);
        expect(parseStored("{")).toEqual([]);
        expect(parseStored('{"a":1}')).toEqual([]);
    });
    test("drops invalid rows and unknown formats", () => {
        const raw = JSON.stringify([e("1", "a", 5), { id: 2, text: "x", at: 1 }, null, { id: "3", text: "b", at: 6, format: "weird" }]);
        expect(parseStored(raw)).toEqual([e("1", "a", 5), { id: "3", text: "b", at: 6, format: null }]);
    });
});
