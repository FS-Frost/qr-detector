// Scan loop: grabs the part of the video frame that is visible on screen (the <video> uses object-fit: cover),
// scales it down and hands it to the decoder, one frame at a time, at most ~12 times per second.
import type { Decoder, Detection } from "./decoder.ts";

const MAX_SIDE = 1024;
const MIN_INTERVAL_MS = 80;

export type Rect = { x: number; y: number; w: number; h: number };

/** Part of a `vw`×`vh` frame shown in an `ew`×`eh` element with object-fit: cover. Pure: tested. */
export function visibleRect(vw: number, vh: number, ew: number, eh: number): Rect {
    if (!ew || !eh) return { x: 0, y: 0, w: vw, h: vh };
    const scale = Math.max(ew / vw, eh / vh);
    const w = Math.min(vw, ew / scale);
    const h = Math.min(vh, eh / scale);
    return { x: (vw - w) / 2, y: (vh - h) / 2, w, h };
}

type FrameVideo = HTMLVideoElement & { requestVideoFrameCallback?(cb: () => void): number };

/**
 * Runs until `signal` aborts or a code is accepted: `onHit` returning false ignores that read and keeps scanning.
 * Decoder errors on single frames are ignored (the next frame retries); `onError` gets repeated failures.
 */
export function scanLoop(
    video: HTMLVideoElement,
    decoder: Decoder,
    onHit: (d: Detection) => boolean,
    signal: AbortSignal,
    onError?: (e: unknown) => void,
) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const v = video as FrameVideo;
    let last = 0;
    let failures = 0;

    const next = () => {
        if (signal.aborted) return;
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(tick);
        else requestAnimationFrame(tick);
    };

    async function tick() {
        if (signal.aborted) return;
        const now = performance.now();
        if (now - last < MIN_INTERVAL_MS || !video.videoWidth || video.paused) return next();
        last = now;
        const r = visibleRect(video.videoWidth, video.videoHeight, video.clientWidth, video.clientHeight);
        const scale = Math.min(1, MAX_SIDE / Math.max(r.w, r.h));
        canvas.width = Math.round(r.w * scale);
        canvas.height = Math.round(r.h * scale);
        ctx.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
        try {
            const hit = await decoder.frame(ctx.getImageData(0, 0, canvas.width, canvas.height));
            failures = 0;
            if (hit && !signal.aborted && onHit(hit)) return;
        } catch (e) {
            if (++failures === 10) onError?.(e);
        }
        next();
    }

    next();
}
