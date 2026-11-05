// Camera: open/close the stream, list devices, torch and zoom (only when the track reports them).
import { cameraUnavailable, ScanError, toScanError } from "./errors.ts";

export type Zoom = { min: number; max: number; step: number; value: number };
export type CameraInfo = { deviceId: string; label: string };
export type Capabilities = { torch: boolean; zoom: Zoom | null };

/** Thrown by `start` when a newer `start`/`stop` replaced it while it waited: not an error to show. */
export class Superseded extends Error {
    constructor() {
        super("superseded");
        this.name = "Superseded";
    }
}

/** Non-standard (but widely shipped) image-capture constraints, missing from TS's DOM lib. */
type ExtCapabilities = MediaTrackCapabilities & { torch?: boolean; zoom?: { min: number; max: number; step?: number } };
type ExtSettings = MediaTrackSettings & { zoom?: number; torch?: boolean };

const DEVICE_KEY = "qr.camera";

function savedDevice(): string | undefined {
    try {
        return localStorage.getItem(DEVICE_KEY) ?? undefined;
    } catch {
        return undefined;
    }
}

function saveDevice(id: string | undefined) {
    try {
        if (id) localStorage.setItem(DEVICE_KEY, id);
    } catch {
        /* storage blocked: the camera is simply not remembered */
    }
}

function constraints(deviceId?: string): MediaStreamConstraints {
    const video: MediaTrackConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 } };
    if (deviceId) video.deviceId = { exact: deviceId };
    else video.facingMode = { ideal: "environment" };
    return { video, audio: false };
}

const stopStream = (s: MediaStream) => s.getTracks().forEach((t) => t.stop());

export class Camera {
    stream: MediaStream | null = null;
    /** Bumped by every start/stop, so a slow getUserMedia that lost the race releases its stream. */
    private generation = 0;

    get track(): MediaStreamTrack | null {
        return this.stream?.getVideoTracks()[0] ?? null;
    }

    get deviceId(): string | undefined {
        return this.track?.getSettings().deviceId;
    }

    private async open(deviceId: string | undefined, gen: number): Promise<MediaStream> {
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints(deviceId));
        } catch (e) {
            if (gen !== this.generation) throw new Superseded();
            const err = toScanError(e);
            // A remembered camera that no longer exists: fall back to "any rear camera".
            if (!deviceId || err.code !== "no-camera") throw err;
            return this.open(undefined, gen);
        }
        if (gen !== this.generation) {
            stopStream(stream);
            throw new Superseded();
        }
        return stream;
    }

    /** Opens the camera into `video`. `deviceId` undefined = the remembered one, or the rear camera. */
    async start(video: HTMLVideoElement, deviceId = savedDevice()): Promise<Capabilities> {
        const why = cameraUnavailable();
        if (why) throw new ScanError(why);
        this.stop(video);
        const gen = this.generation;
        this.stream = await this.open(deviceId, gen);
        video.srcObject = this.stream;
        try {
            await video.play();
        } catch (e) {
            if (gen !== this.generation) throw new Superseded();
            // play() is interrupted if the source changes meanwhile; anything else is a real failure.
            if (!(e instanceof DOMException && e.name === "AbortError")) throw toScanError(e);
        }
        saveDevice(this.deviceId);
        return this.capabilities();
    }

    stop(video?: HTMLVideoElement) {
        this.generation++;
        if (this.stream) stopStream(this.stream);
        this.stream = null;
        if (video) video.srcObject = null;
    }

    capabilities(): Capabilities {
        const track = this.track;
        if (!track?.getCapabilities) return { torch: false, zoom: null };
        const caps = track.getCapabilities() as ExtCapabilities;
        const settings = track.getSettings() as ExtSettings;
        const zoom =
            caps.zoom && caps.zoom.max > caps.zoom.min
                ? { min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1, value: settings.zoom ?? caps.zoom.min }
                : null;
        return { torch: caps.torch === true, zoom };
    }

    async setTorch(on: boolean) {
        await this.track?.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
    }

    async setZoom(value: number) {
        await this.track?.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] });
    }

    /** Video inputs. Labels are empty until permission is granted. */
    static async list(): Promise<CameraInfo[]> {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices
                .filter((d) => d.kind === "videoinput" && d.deviceId)
                .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
        } catch {
            return [];
        }
    }
}
