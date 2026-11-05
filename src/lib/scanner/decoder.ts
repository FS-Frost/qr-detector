// Barcode decoding: native BarcodeDetector when the browser has it (Android Chrome, macOS/iOS Safari), otherwise
// zxing-wasm, loaded on demand. The .wasm ships with the app (Vite asset, precached by the service worker) instead of
// zxing-wasm's default jsDelivr URL, so scanning works offline.
import { ScanError } from "./errors.ts";
import { fromNative, fromZxing, NATIVE_FORMATS, ZXING_FORMATS, type FormatId } from "./formats.ts";

export type Detection = { text: string; format: FormatId | null };

type NativeResult = { rawValue: string; format: string };
type NativeDetector = { detect(src: ImageBitmapSource): Promise<NativeResult[]> };
type NativeDetectorClass = {
    new (o: { formats: string[] }): NativeDetector;
    getSupportedFormats(): Promise<string[]>;
};

export type Decoder = {
    engine: "native" | "zxing";
    /** A camera frame (already cropped/scaled by the caller). */
    frame(img: ImageData): Promise<Detection | null>;
};

let zxing: Promise<typeof import("zxing-wasm/reader")> | null = null;

/** Loads zxing-wasm (JS + .wasm) once. Throws ScanError("decoder") if it can't (e.g. offline before the first cache). */
function loadZxing() {
    zxing ??= (async () => {
        const [mod, { default: wasmUrl }] = await Promise.all([
            import("zxing-wasm/reader"),
            import("zxing-wasm/reader/zxing_reader.wasm?url"),
        ]);
        await mod.prepareZXingModule({
            overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path) },
            fireImmediately: true,
        });
        return mod;
    })().catch((e) => {
        zxing = null; // allow a retry later (connection back)
        throw new ScanError("decoder", e);
    });
    return zxing;
}

async function zxingRead(input: ImageData | Blob, tryHarder: boolean): Promise<Detection | null> {
    const mod = await loadZxing();
    const [r] = await mod.readBarcodes(input, { formats: [...ZXING_FORMATS], tryHarder, maxNumberOfSymbols: 1 });
    return r?.isValid && r.text ? { text: r.text, format: fromZxing(r.format) } : null;
}

async function nativeDetector(): Promise<NativeDetector | null> {
    const BD = (globalThis as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
    if (!BD) return null;
    try {
        const supported = new Set(await BD.getSupportedFormats());
        const formats = NATIVE_FORMATS.filter((f) => supported.has(f));
        // Without QR support the native detector is not worth it: zxing reads everything.
        return formats.includes("qr_code") ? new BD({ formats }) : null;
    } catch {
        return null;
    }
}

const fromNativeResult = (r: NativeResult | undefined): Detection | null =>
    r?.rawValue ? { text: r.rawValue, format: fromNative(r.format) } : null;

/** Picks the engine. With zxing the module is loaded now, so a load failure shows up before scanning starts. */
export async function createDecoder(): Promise<Decoder> {
    const native = await nativeDetector();
    if (native) return { engine: "native", frame: async (img) => fromNativeResult((await native.detect(img))[0]) };
    await loadZxing();
    return { engine: "zxing", frame: (img) => zxingRead(img, false) };
}

/** Decodes an image file (gallery/screenshot). Tries the native detector first, then zxing with tryHarder. */
export async function decodeFile(file: Blob): Promise<Detection | null> {
    const native = await nativeDetector();
    if (native) {
        try {
            const bitmap = await createImageBitmap(file);
            try {
                const hit = fromNativeResult((await native.detect(bitmap))[0]);
                if (hit) return hit;
            } finally {
                bitmap.close();
            }
        } catch {
            /* undecodable by the native path: fall back to zxing */
        }
    }
    return zxingRead(file, true);
}
