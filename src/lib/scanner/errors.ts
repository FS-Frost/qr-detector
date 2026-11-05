// Camera/decoder failures mapped to a small set of codes the UI can explain (i18n keys `error.<code>.*`).

export type ScanErrorCode =
    | "insecure" // not HTTPS/localhost: getUserMedia is unavailable
    | "unsupported" // browser without mediaDevices
    | "denied" // permission refused (by the user or a policy)
    | "no-camera" // no video input device
    | "in-use" // device busy (another app/tab) or hardware error
    | "decoder" // the barcode engine could not load (e.g. first visit while offline)
    | "unknown";

export class ScanError extends Error {
    constructor(
        readonly code: ScanErrorCode,
        readonly cause?: unknown,
    ) {
        super(code);
        this.name = "ScanError";
    }
}

/** Maps a DOMException/Error name thrown by getUserMedia to a code. Pure: tested in tests/errors.test.ts. */
export function codeFromName(name: string): ScanErrorCode {
    switch (name) {
        case "NotAllowedError":
        case "PermissionDeniedError":
        case "SecurityError":
            return "denied";
        case "NotFoundError":
        case "DevicesNotFoundError":
        case "OverconstrainedError":
        case "ConstraintNotSatisfiedError":
            return "no-camera";
        case "NotReadableError":
        case "TrackStartError":
        case "AbortError":
            return "in-use";
        default:
            return "unknown";
    }
}

export function toScanError(e: unknown): ScanError {
    if (e instanceof ScanError) return e;
    const name = e instanceof Error || e instanceof DOMException ? e.name : "";
    return new ScanError(codeFromName(name), e);
}

/** Why the camera can't even be requested here, or null if it can. */
export function cameraUnavailable(): ScanErrorCode | null {
    if (typeof window !== "undefined" && !window.isSecureContext) return "insecure";
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return "unsupported";
    return null;
}
