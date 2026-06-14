import { now, pushLimited, toErrorMessage } from "./utils";

const CONSOLE_STYLE = {
    prefix: `%c [LOL Audio Replacer] `,
    css: "color: #ffffff; background-color: #f77fbe",
};

const createConsoleLogger = (type: "log" | "warn" | "error") => {
    return (message: unknown, ...args: unknown[]) => {
        console[type](CONSOLE_STYLE.prefix + "%c " + String(message), CONSOLE_STYLE.css, "", ...args);
    };
};

export class Logger {
    private readonly log = createConsoleLogger("log");
    private readonly warn = createConsoleLogger("warn");

    constructor(
        private readonly stats: Stats,
        private readonly getConfig: () => AudioReplacerConfig,
    ) {}

    info(source: string, message: string, meta?: Record<string, unknown>) {
        const entry = pushLimited(this.stats.history, {
            at: now(),
            type: "info" as const,
            source,
            path: "",
            value: message,
            meta,
        });

        if (this.getConfig().debug) {
            this.log(`${source}: ${message}`, meta ?? "");
        }

        return entry;
    }

    detected(source: string, path: string, value: string, meta?: Record<string, unknown>) {
        this.stats.detected += 1;

        const entry = pushLimited(this.stats.history, {
            at: now(),
            type: "detected" as const,
            source,
            path,
            value,
            meta,
        });

        if (this.getConfig().debug) {
            this.log("detected audio", entry);
        }
    }

    replaced(source: string, path: string, value: string, replacement: string, rule: NormalizedRule, meta?: Record<string, unknown>) {
        this.stats.replaced += 1;

        const entry = pushLimited(this.stats.history, {
            at: now(),
            type: "replaced" as const,
            source,
            path,
            value,
            replacement,
            rule: rule.label,
            meta,
        });

        if (this.getConfig().debug) {
            this.log("replaced audio", entry);
        }
    }

    skipped(source: string, path: string, value: string, meta?: Record<string, unknown>) {
        this.stats.skipped += 1;

        pushLimited(this.stats.history, {
            at: now(),
            type: "skipped" as const,
            source,
            path,
            value,
            meta,
        });
    }

    error(source: string, err: unknown, meta?: Record<string, unknown>) {
        const message = toErrorMessage(err);
        this.stats.errors += 1;
        this.stats.lastError = message;

        const entry = pushLimited(this.stats.history, {
            at: now(),
            type: "error" as const,
            source,
            path: "",
            error: message,
            meta,
        });

        this.warn(`${source}: ${message}`, meta ?? "");
        return entry;
    }
}
