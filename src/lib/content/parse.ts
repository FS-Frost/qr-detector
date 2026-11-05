// What a scanned code contains, so the UI can offer the right actions. Pure (no DOM): tested in tests/parse.test.ts.
//
// Security: only http(s) URLs ever become links. Any other scheme (javascript:, data:, intent:, file:…) is plain text.
import { isProductFormat, type FormatId } from "../scanner/formats.ts";

export type Contact = {
    name: string;
    phones: string[];
    emails: string[];
    org: string;
    url: string;
    /** vCard 3.0 text, for "add to contacts" (.vcf download). */
    vcard: string;
};

export type Content =
    | { kind: "url"; url: string; host: string }
    | { kind: "wifi"; ssid: string; password: string; security: string; hidden: boolean }
    | ({ kind: "contact" } & Contact)
    | { kind: "email"; to: string; subject: string; body: string }
    | { kind: "phone"; number: string }
    | { kind: "sms"; number: string; body: string }
    | { kind: "geo"; lat: number; lon: number; query: string }
    | { kind: "product"; code: string }
    | { kind: "text"; text: string };

export type ContentKind = Content["kind"];

export function parseContent(raw: string, format: FormatId | null = null): Content {
    const text = raw.trim();
    if (isProductFormat(format) && /^\d{6,14}$/.test(text)) return { kind: "product", code: text };
    return url(text) ?? wifi(text) ?? vcard(text) ?? mecard(text) ?? email(text) ?? phone(text) ?? sms(text) ?? geo(text) ?? { kind: "text", text: raw };
}

// ---------- URL ----------

/** Absolute http(s) URL, or null. Bare "www.example.com/…" is treated as https. */
export function safeHttpUrl(s: string): URL | null {
    const candidate = /^www\.[^\s/]+\.[a-z]{2,}(?:[/?#]\S*)?$/i.test(s) ? `https://${s}` : s;
    if (!/^https?:\/\/\S+$/i.test(candidate)) return null;
    try {
        const u = new URL(candidate);
        return (u.protocol === "http:" || u.protocol === "https:") && u.hostname ? u : null;
    } catch {
        return null;
    }
}

function url(s: string): Content | null {
    const u = safeHttpUrl(s);
    return u ? { kind: "url", url: u.href, host: u.hostname } : null;
}

// ---------- WiFi: WIFI:T:WPA;S:name;P:pass;H:true;; (\ escapes ; , : \ ") ----------

const unescape = (s: string) => s.replace(/\\([\s\S])/g, "$1");

/** `K:value;K2:value;;` → map of upper-cased key → values (repeated keys keep every value). */
function fields(body: string): Map<string, string[]> {
    const map = new Map<string, string[]>();
    // Keep the escapes until each field is split from its key, so "\:" inside values survives.
    const parts: string[] = [];
    let cur = "";
    for (let i = 0; i < body.length; i++) {
        const c = body[i];
        if (c === "\\" && i + 1 < body.length) {
            cur += c + body[++i];
        } else if (c === ";") {
            parts.push(cur);
            cur = "";
        } else cur += c;
    }
    parts.push(cur);
    for (const p of parts) {
        const at = p.indexOf(":");
        if (at <= 0) continue;
        const key = p.slice(0, at).toUpperCase();
        const value = unescape(p.slice(at + 1));
        map.set(key, [...(map.get(key) ?? []), value]);
    }
    return map;
}

function wifi(s: string): Content | null {
    if (!/^WIFI:/i.test(s)) return null;
    const f = fields(s.slice(5));
    const ssid = f.get("S")?.[0] ?? "";
    if (!ssid) return null;
    const security = (f.get("T")?.[0] ?? "").toUpperCase();
    return {
        kind: "wifi",
        ssid,
        password: f.get("P")?.[0] ?? "",
        security: security === "NOPASS" ? "" : security,
        hidden: (f.get("H")?.[0] ?? "").toLowerCase() === "true",
    };
}

// ---------- Contacts ----------

function buildVcard(c: Omit<Contact, "vcard">): string {
    const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
    const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${esc(c.name)}`];
    if (c.org) lines.push(`ORG:${esc(c.org)}`);
    for (const p of c.phones) lines.push(`TEL:${esc(p)}`);
    for (const e of c.emails) lines.push(`EMAIL:${esc(e)}`);
    if (c.url) lines.push(`URL:${esc(c.url)}`);
    lines.push("END:VCARD");
    return lines.join("\r\n");
}

function unescapeVcard(v: string): string {
    return v.replace(/\\([nN,;\\])/g, (_, c: string) => (c === "n" || c === "N" ? "\n" : c));
}

function vcard(s: string): Content | null {
    if (!/^BEGIN:VCARD/i.test(s)) return null;
    // Unfold continuation lines (CRLF/LF followed by a space or tab).
    const lines = s.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
    const c = { name: "", phones: [] as string[], emails: [] as string[], org: "", url: "" };
    let structured = "";
    for (const line of lines) {
        const at = line.indexOf(":");
        if (at <= 0) continue;
        // "item1.TEL;TYPE=CELL" → "TEL"
        const prop = line.slice(0, at).split(";")[0].replace(/^[^.]*\./, "").toUpperCase();
        const value = line.slice(at + 1).trim();
        if (!value) continue;
        if (prop === "FN") c.name = unescapeVcard(value);
        else if (prop === "N") structured = value;
        else if (prop === "TEL") c.phones.push(value);
        else if (prop === "EMAIL") c.emails.push(value);
        else if (prop === "ORG") c.org = unescapeVcard(value.split(/(?<!\\);/).filter(Boolean).join(", "));
        else if (prop === "URL" && !c.url) c.url = value;
    }
    if (!c.name && structured) {
        const [last = "", first = ""] = structured.split(/(?<!\\);/).map(unescapeVcard);
        c.name = [first, last].filter(Boolean).join(" ");
    }
    return { kind: "contact", ...c, vcard: s.replace(/\r?\n/g, "\r\n") };
}

function mecard(s: string): Content | null {
    if (!/^MECARD:/i.test(s)) return null;
    const f = fields(s.slice(7));
    const n = f.get("N")?.[0] ?? "";
    // MECARD N is "Last,First".
    const [last, first] = n.includes(",") ? n.split(",", 2) : [n, ""];
    const c = {
        name: [first.trim(), last.trim()].filter(Boolean).join(" "),
        phones: f.get("TEL") ?? [],
        emails: f.get("EMAIL") ?? [],
        org: f.get("ORG")?.[0] ?? "",
        url: f.get("URL")?.[0] ?? "",
    };
    return { kind: "contact", ...c, vcard: buildVcard(c) };
}

// ---------- Email, phone, SMS, geo ----------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function email(s: string): Content | null {
    if (/^mailto:/i.test(s)) {
        const [addr, query = ""] = s.slice(7).split("?", 2);
        const q = new URLSearchParams(query);
        const to = decodeURIComponentSafe(addr);
        return to ? { kind: "email", to, subject: q.get("subject") ?? "", body: q.get("body") ?? "" } : null;
    }
    if (/^MATMSG:/i.test(s)) {
        const f = fields(s.slice(7));
        const to = f.get("TO")?.[0] ?? "";
        return to ? { kind: "email", to, subject: f.get("SUB")?.[0] ?? "", body: f.get("BODY")?.[0] ?? "" } : null;
    }
    return EMAIL_RE.test(s) ? { kind: "email", to: s, subject: "", body: "" } : null;
}

const PHONE_RE = /^\+?[\d\s().-]{3,}$/;

function phone(s: string): Content | null {
    if (!/^tel:/i.test(s)) return null;
    const number = decodeURIComponentSafe(s.slice(4)).trim();
    return PHONE_RE.test(number) ? { kind: "phone", number } : null;
}

function sms(s: string): Content | null {
    // SMSTO:number:body
    let m = /^SMSTO:([^:]*):?([\s\S]*)$/i.exec(s);
    if (m) return PHONE_RE.test(m[1]) ? { kind: "sms", number: m[1].trim(), body: m[2] } : null;
    // sms:number?body=…  (also "smsto:")
    m = /^sms(?:to)?:([^?]*)(?:\?([\s\S]*))?$/i.exec(s);
    if (!m) return null;
    const number = decodeURIComponentSafe(m[1]).trim();
    return PHONE_RE.test(number) ? { kind: "sms", number, body: new URLSearchParams(m[2] ?? "").get("body") ?? "" } : null;
}

function geo(s: string): Content | null {
    const m = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,[^?;]*)?(?:;[^?]*)?(?:\?([\s\S]*))?$/i.exec(s);
    if (!m) return null;
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return { kind: "geo", lat, lon, query: new URLSearchParams(m[3] ?? "").get("q") ?? "" };
}

function decodeURIComponentSafe(s: string): string {
    try {
        return decodeURIComponent(s);
    } catch {
        return s;
    }
}

// ---------- Links for actions (only well-known schemes, values encoded) ----------

export const mapsUrl = (lat: number, lon: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
export const searchUrl = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
export const telHref = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;
export const smsHref = (n: string, body: string) => `sms:${n.replace(/[^\d+]/g, "")}${body ? `?body=${encodeURIComponent(body)}` : ""}`;
export function mailtoHref(to: string, subject: string, body: string) {
    const q = new URLSearchParams();
    if (subject) q.set("subject", subject);
    if (body) q.set("body", body);
    const qs = q.toString().replace(/\+/g, "%20");
    return `mailto:${encodeURIComponent(to).replace(/%40/g, "@")}${qs ? `?${qs}` : ""}`;
}
