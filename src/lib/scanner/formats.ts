// Barcode formats: one canonical id (BarcodeDetector's names) for both engines, plus a human label.

export const FORMATS = {
    qr_code: "QR Code",
    micro_qr_code: "Micro QR",
    rm_qr_code: "rMQR",
    data_matrix: "Data Matrix",
    aztec: "Aztec",
    pdf417: "PDF417",
    ean_13: "EAN-13",
    ean_8: "EAN-8",
    upc_a: "UPC-A",
    upc_e: "UPC-E",
    code_128: "Code 128",
    code_39: "Code 39",
    code_93: "Code 93",
    itf: "ITF",
    codabar: "Codabar",
    databar: "DataBar",
} as const;

export type FormatId = keyof typeof FORMATS;

/** Formats requested from the native BarcodeDetector (those it knows). */
export const NATIVE_FORMATS: FormatId[] = [
    "qr_code",
    "data_matrix",
    "aztec",
    "pdf417",
    "ean_13",
    "ean_8",
    "upc_a",
    "upc_e",
    "code_128",
    "code_39",
    "code_93",
    "itf",
    "codabar",
];

/** Formats requested from zxing-wasm (its names). */
export const ZXING_FORMATS = [
    "QRCode",
    "MicroQRCode",
    "RMQRCode",
    "DataMatrix",
    "Aztec",
    "PDF417",
    "EAN13",
    "EAN8",
    "UPCA",
    "UPCE",
    "Code128",
    "Code39",
    "Code93",
    "ITF",
    "Codabar",
    "DataBar",
] as const;

/** zxing output names (including variants such as "QRCodeModel2" or "Code39Std") → canonical id. */
export function fromZxing(name: string): FormatId | null {
    const rules: [RegExp, FormatId][] = [
        [/^MicroQR/, "micro_qr_code"],
        [/^RMQR/, "rm_qr_code"],
        [/^QRCode/, "qr_code"],
        [/^DataMatrix/, "data_matrix"],
        [/^Aztec/, "aztec"],
        [/PDF417$/, "pdf417"],
        [/^EAN13$|^ISBN$/, "ean_13"],
        [/^EAN8$/, "ean_8"],
        [/^UPCA$/, "upc_a"],
        [/^UPCE$/, "upc_e"],
        [/^Code128/, "code_128"],
        [/^Code39/, "code_39"],
        [/^Code93/, "code_93"],
        [/^ITF/, "itf"],
        [/^Codabar/, "codabar"],
        [/^DataBar/, "databar"],
    ];
    return rules.find(([re]) => re.test(name))?.[1] ?? null;
}

export function fromNative(name: string): FormatId | null {
    return name in FORMATS ? (name as FormatId) : null;
}

export const formatLabel = (id: FormatId | null) => (id ? FORMATS[id] : "?");

/** Retail product codes (show "search product" instead of treating the digits as text). */
export const isProductFormat = (id: FormatId | null) => id === "ean_13" || id === "ean_8" || id === "upc_a" || id === "upc_e";
