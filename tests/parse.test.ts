import { describe, expect, test } from "bun:test";
import { mailtoHref, parseContent, safeHttpUrl, smsHref, telHref } from "../src/lib/content/parse.ts";

describe("url", () => {
    test("http(s) becomes a link with its host", () => {
        expect(parseContent("https://example.com/a?b=1")).toEqual({ kind: "url", url: "https://example.com/a?b=1", host: "example.com" });
        expect(parseContent("  HTTP://Example.com  ")).toMatchObject({ kind: "url", host: "example.com" });
    });
    test("bare www. is treated as https", () => {
        expect(parseContent("www.example.org/x")).toMatchObject({ kind: "url", url: "https://www.example.org/x" });
    });
    test("dangerous or unknown schemes stay text", () => {
        for (const s of ["javascript:alert(1)", "data:text/html,<b>x</b>", "intent://x#Intent;end", "file:///etc/passwd", "ftp://x.com"])
            expect(parseContent(s).kind).toBe("text");
        expect(safeHttpUrl("https://")).toBeNull();
        expect(safeHttpUrl("https://exa mple.com")).toBeNull();
    });
    test("punycode host is kept as-is (shown to the user)", () => {
        expect(parseContent("https://xn--pple-43d.com")).toMatchObject({ host: "xn--pple-43d.com" });
    });
});

describe("wifi", () => {
    test("standard payload", () => {
        expect(parseContent("WIFI:T:WPA;S:Home Net;P:s3cret;;")).toEqual({
            kind: "wifi",
            ssid: "Home Net",
            password: "s3cret",
            security: "WPA",
            hidden: false,
        });
    });
    test("escapes, field order, hidden and open networks", () => {
        expect(parseContent("WIFI:S:my\\;net\\:1;P:a\\\\b\\,c;H:true;T:WEP;;")).toMatchObject({
            ssid: "my;net:1",
            password: "a\\b,c",
            security: "WEP",
            hidden: true,
        });
        expect(parseContent("WIFI:T:nopass;S:Cafe;;")).toMatchObject({ security: "", password: "" });
    });
    test("without SSID it is just text", () => {
        expect(parseContent("WIFI:T:WPA;P:x;;").kind).toBe("text");
    });
});

describe("contacts", () => {
    test("vCard with folded lines, params and escapes", () => {
        const c = parseContent(
            "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Doe;Jane;;;\r\nFN:Jane\r\n  Doe\r\nORG:ACME\\, Inc.\r\nitem1.TEL;TYPE=CELL:+1 555 0100\r\nTEL:+1 555 0101\r\nEMAIL;TYPE=INTERNET:jane@acme.com\r\nURL:https://acme.com\r\nEND:VCARD",
        );
        expect(c).toMatchObject({
            kind: "contact",
            name: "Jane Doe",
            org: "ACME, Inc.",
            phones: ["+1 555 0100", "+1 555 0101"],
            emails: ["jane@acme.com"],
            url: "https://acme.com",
        });
    });
    test("vCard without FN uses N", () => {
        expect(parseContent("BEGIN:VCARD\nN:Perez;Ana\nEND:VCARD")).toMatchObject({ name: "Ana Perez" });
    });
    test("MECARD becomes a vCard", () => {
        const c = parseContent("MECARD:N:Doe,John;TEL:123456;EMAIL:j@x.io;;");
        expect(c).toMatchObject({ kind: "contact", name: "John Doe", phones: ["123456"], emails: ["j@x.io"] });
        if (c.kind !== "contact") throw new Error();
        expect(c.vcard).toContain("BEGIN:VCARD");
        expect(c.vcard).toContain("TEL:123456");
    });
});

describe("email, phone, sms, geo", () => {
    test("mailto and MATMSG and bare address", () => {
        expect(parseContent("mailto:a@b.com?subject=Hi%20there&body=Yo")).toEqual({ kind: "email", to: "a@b.com", subject: "Hi there", body: "Yo" });
        expect(parseContent("MATMSG:TO:a@b.com;SUB:S;BODY:B;;")).toEqual({ kind: "email", to: "a@b.com", subject: "S", body: "B" });
        expect(parseContent("a@b.com")).toMatchObject({ kind: "email", to: "a@b.com" });
    });
    test("tel", () => {
        expect(parseContent("tel:+56 9 1234 5678")).toEqual({ kind: "phone", number: "+56 9 1234 5678" });
        expect(parseContent("tel:abc").kind).toBe("text");
    });
    test("sms forms", () => {
        expect(parseContent("SMSTO:+123456:hello")).toEqual({ kind: "sms", number: "+123456", body: "hello" });
        expect(parseContent("sms:+123456?body=hi%20you")).toEqual({ kind: "sms", number: "+123456", body: "hi you" });
    });
    test("geo", () => {
        expect(parseContent("geo:-33.45,-70.66?q=Santiago")).toEqual({ kind: "geo", lat: -33.45, lon: -70.66, query: "Santiago" });
        expect(parseContent("geo:91,0").kind).toBe("text");
    });
});

describe("product and text", () => {
    test("EAN digits are a product only for retail formats", () => {
        expect(parseContent("7801234567890", "ean_13")).toEqual({ kind: "product", code: "7801234567890" });
        expect(parseContent("7801234567890", "qr_code")).toEqual({ kind: "text", text: "7801234567890" });
    });
    test("plain text keeps the raw value", () => {
        expect(parseContent("  hello\nworld ")).toEqual({ kind: "text", text: "  hello\nworld " });
    });
});

describe("action links", () => {
    test("are built from encoded values", () => {
        expect(telHref("+1 (555) 01-00")).toBe("tel:+15550100");
        expect(smsHref("+1 555", "a b&c")).toBe("sms:+1555?body=a%20b%26c");
        expect(mailtoHref("a@b.com", "x y", "")).toBe("mailto:a@b.com?subject=x%20y");
    });
});
