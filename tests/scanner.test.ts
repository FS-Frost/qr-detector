import { describe, expect, test } from "bun:test";
import { codeFromName } from "../src/lib/scanner/errors.ts";
import { fromNative, fromZxing, isProductFormat } from "../src/lib/scanner/formats.ts";
import { visibleRect } from "../src/lib/scanner/loop.ts";

describe("codeFromName", () => {
    test("maps getUserMedia errors", () => {
        expect(codeFromName("NotAllowedError")).toBe("denied");
        expect(codeFromName("SecurityError")).toBe("denied");
        expect(codeFromName("NotFoundError")).toBe("no-camera");
        expect(codeFromName("OverconstrainedError")).toBe("no-camera");
        expect(codeFromName("NotReadableError")).toBe("in-use");
        expect(codeFromName("TypeError")).toBe("unknown");
        expect(codeFromName("")).toBe("unknown");
    });
});

describe("formats", () => {
    test("zxing names and variants", () => {
        expect(fromZxing("QRCode")).toBe("qr_code");
        expect(fromZxing("QRCodeModel2")).toBe("qr_code");
        expect(fromZxing("MicroQRCode")).toBe("micro_qr_code");
        expect(fromZxing("RMQRCode")).toBe("rm_qr_code");
        expect(fromZxing("CompactPDF417")).toBe("pdf417");
        expect(fromZxing("Code39Std")).toBe("code_39");
        expect(fromZxing("ISBN")).toBe("ean_13");
        expect(fromZxing("ITF14")).toBe("itf");
        expect(fromZxing("MaxiCode")).toBeNull();
    });
    test("native names", () => {
        expect(fromNative("ean_13")).toBe("ean_13");
        expect(fromNative("unknown")).toBeNull();
    });
    test("product formats", () => {
        expect(isProductFormat("upc_a")).toBe(true);
        expect(isProductFormat("qr_code")).toBe(false);
    });
});

describe("visibleRect", () => {
    test("landscape frame in a portrait screen crops the sides", () => {
        // 1920x1080 in 400x800: scale = max(400/1920, 800/1080) = 0.7407 → 540x1080 visible
        const r = visibleRect(1920, 1080, 400, 800);
        expect(r.h).toBe(1080);
        expect(Math.round(r.w)).toBe(540);
        expect(Math.round(r.x)).toBe(690);
        expect(r.y).toBe(0);
    });
    test("same aspect shows everything", () => {
        expect(visibleRect(1280, 720, 640, 360)).toEqual({ x: 0, y: 0, w: 1280, h: 720 });
    });
    test("unsized element falls back to the full frame", () => {
        expect(visibleRect(1280, 720, 0, 0)).toEqual({ x: 0, y: 0, w: 1280, h: 720 });
    });
});
