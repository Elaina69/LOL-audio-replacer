export function now() {
    return new Date().toISOString();
}

export function toErrorMessage(err: unknown) {
    return err instanceof Error ? err.message : String(err);
}

export function pushLimited<T>(list: T[], item: T) {
    list.push(item);
    if (list.length > 500) list.shift();
    return item;
}

export function safeDecodeUrlSegment(segment: string) {
    try {
        return decodeURIComponent(segment);
    }
    catch {
        return segment;
    }
}

export function splitPath(path: unknown) {
    return String(path ?? "")
        .replace(/\\/g, "/")
        .split("/")
        .filter(Boolean);
}

export function encodeUrlPathSegment(segment: unknown) {
    const rawSegment = String(segment ?? "");
    if (!rawSegment || rawSegment === "." || rawSegment === ".." || /[\u0000-\u001f\u007f]/.test(rawSegment)) {
        return "";
    }

    return encodeURIComponent(rawSegment)
        .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
        .replace(/%40/g, "@");
}

export function stripQueryAndHash(value: string) {
    return String(value).split(/[?#]/)[0] || "";
}

export function getBasename(value: string) {
    return stripQueryAndHash(value).replace(/\\/g, "/").split("/").pop() || "";
}

export function normalizeForCompare(value: string) {
    return safeDecodeUrlSegment(String(value))
        .replace(/\\/g, "/")
        .replace(/^https?:/i, "")
        .replace(/^\/+/, "")
        .toLowerCase();
}

export function isAbsoluteReplacement(value: string) {
    return /^(?:https?:)?\/\//i.test(value) ||
        value.startsWith("/") ||
        value.startsWith("data:") ||
        value.startsWith("blob:");
}

export function isAudioLikeString(value: unknown) {
    if (typeof value !== "string") return false;
    const extensionRegex = /\.(?:ogg|mp3|wav|opus|m4a)(?:[?#][^"'<>)]*)?$/i;
    return extensionRegex.test(value.trim());
}

export function uniqueStrings(values: string[]) {
    return Array.from(new Set(values.filter(Boolean)));
}

export function extractAudioCandidates(value: string) {
    const text = String(value);
    const matches: string[] = [];

    if (isAudioLikeString(text)) {
        matches.push(text);
    }

    const audioTokenRegex = /(?:(?:https?:)?\/\/|\/)?(?:lol-game-data\/assets\/|fe\/lol-|plugins\/|assets\/content\/src\/LeagueClient\/)[^\s"',<>)}\]]+\.(?:ogg|mp3|wav|opus|m4a)(?:\?[^\s"',<>)}\]]*)?(?:#[^\s"',<>)}\]]*)?/gi;
    const genericAudioTokenRegex = /[A-Za-z0-9_@%./~:+-]+\.(?:ogg|mp3|wav|opus|m4a)(?:\?[^\s"',<>)}\]]*)?(?:#[^\s"',<>)}\]]*)?/gi;

    for (const pattern of [audioTokenRegex, genericAudioTokenRegex]) {
        pattern.lastIndex = 0;
        for (const match of text.matchAll(pattern)) {
            if (isAudioLikeString(match[0])) {
                matches.push(match[0]);
            }
        }
    }

    return uniqueStrings(matches);
}

export function isSkippableObject(value: object) {
    return (typeof Response !== "undefined" && value instanceof Response) ||
        (typeof Request !== "undefined" && value instanceof Request) ||
        (typeof Element !== "undefined" && value instanceof Element) ||
        (typeof Window !== "undefined" && value instanceof Window) ||
        value instanceof ArrayBuffer ||
        ArrayBuffer.isView(value);
}

export function normalizeConfig(rawConfig: Partial<AudioReplacerConfig> | undefined): AudioReplacerConfig {
    const raw = rawConfig ?? {};

    return {
        enabled: raw.enabled !== false,
        debug: raw.debug !== false,
        rules: Array.isArray(raw.rules) ? raw.rules : [],
    };
}
