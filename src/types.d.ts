type AudioMatchMode = "exact" | "contains" | "filename" | "regex";

type AudioRuleConfig = {
    enabled?: boolean;
    mode?: AudioMatchMode;
    match?: string;
    replaceWith?: string;
    flags?: string;
    label?: string;
};

type AudioReplacerConfig = {
    enabled: boolean;
    debug: boolean;
    rules: AudioRuleConfig[];
};

type NormalizedRule = Required<Pick<AudioRuleConfig, "enabled" | "mode" | "match" | "replaceWith">> & {
    flags: string;
    label: string;
    index: number;
    regex: RegExp | null;
    replacementUrl: string;
};

type RewriteMatch = {
    original: string;
    replacement: string | null;
    rule: NormalizedRule | null;
};

type RewriteResult = {
    value: string;
    changed: boolean;
    matches: RewriteMatch[];
};

type PatchRecord = {
    path: string;
    before: string;
    after: string;
};

type PatchResult<T = unknown> = {
    value: T;
    changed: boolean;
    patches: PatchRecord[];
};

type LogEntry = {
    at: string;
    type: "detected" | "replaced" | "skipped" | "error" | "info";
    source: string;
    path: string;
    value?: string;
    replacement?: string;
    rule?: string;
    meta?: Record<string, unknown>;
    error?: string;
};

type Stats = {
    installedAt: string;
    configLoaded: boolean;
    detected: number;
    replaced: number;
    skipped: number;
    errors: number;
    fetches: number;
    xhrs: number;
    rcpUpdates: number;
    rcpPatches: number;
    htmlPatches: number;
    lastError: string;
    history: LogEntry[];
};

type PenguContext = {
    meta?: {
        name?: string;
    };
    rcp?: {
        postInit?: (name: string, callback: (api: unknown) => unknown) => void;
    };
};

type DebugApi = {
    readonly config: AudioReplacerConfig;
    readonly stats: Stats;
    readonly rules: NormalizedRule[];
    pluginUrl: (...pathParts: unknown[]) => string;
    test: (url: string) => RewriteResult;
    reloadConfig: () => Promise<AudioReplacerConfig>;
};

declare var Pengu: { plugins?: string[] } | undefined;

interface Window {
    LOLAudioReplacer?: DebugApi;
}
