import type { Logger } from "../logger";
import type { AudioRule } from "../audioRule";

export class XhrHook {
    constructor(
        private readonly audioRule: AudioRule,
        private readonly logger: Logger,
        private readonly stats: Stats,
    ) {}

    install() {
        this.hookFetch();
        this.hookXhr();
    }

    private hookFetch() {
        const currentFetch = window.fetch as typeof window.fetch & { __LOL_AUDIO_REPLACER_HOOKED?: boolean };
        if (!currentFetch || currentFetch.__LOL_AUDIO_REPLACER_HOOKED) {
            return;
        }

        const originalFetch = window.fetch.bind(window);
        const self = this;

        window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
            const originalUrl = self.safeRequestUrl(input);
            const method = init?.method || (input instanceof Request ? input.method : "GET");
            let nextInput = input;

            if (originalUrl) {
                try {
                    const result = self.audioRule.rewriteUrl(originalUrl, "fetch", "url", { method });

                    if (result.changed) {
                        self.stats.fetches += 1;
                        nextInput = self.rewriteFetchInput(input, result.value);
                    }
                }
                catch (err) {
                    self.logger.error("XhrHook.fetch", err, { url: originalUrl });
                }
            }

            return originalFetch(nextInput, init);
        } as typeof window.fetch;

        Object.defineProperty(window.fetch, "__LOL_AUDIO_REPLACER_HOOKED", {
            value: true,
            configurable: true,
        });

        this.logger.info("XhrHook", "hooked fetch");
    }

    private hookXhr() {
        const prototype = XMLHttpRequest.prototype as XMLHttpRequest & {
            open: typeof XMLHttpRequest.prototype.open & { __LOL_AUDIO_REPLACER_HOOKED?: boolean };
        };

        if (prototype.open.__LOL_AUDIO_REPLACER_HOOKED) {
            return;
        }

        const originalOpen = prototype.open;
        const self = this;

        prototype.open = function (...args: unknown[]) {
            const method = String(args[0] ?? "GET");
            const originalUrl = self.safeUrl(args[1]);

            if (originalUrl) {
                try {
                    const result = self.audioRule.rewriteUrl(originalUrl, "XMLHttpRequest", "url", { method });
                    if (result.changed) {
                        self.stats.xhrs += 1;
                        args[1] = result.value;
                    }
                }
                catch (err) {
                    self.logger.error("XhrHook.xhr", err, { url: originalUrl });
                }
            }

            return (originalOpen as Function).apply(this, args);
        } as typeof XMLHttpRequest.prototype.open & { __LOL_AUDIO_REPLACER_HOOKED?: boolean };

        Object.defineProperty(prototype.open, "__LOL_AUDIO_REPLACER_HOOKED", {
            value: true,
            configurable: true,
        });

        this.logger.info("XhrHook", "hooked XMLHttpRequest.open");
    }

    private rewriteFetchInput(input: RequestInfo | URL, nextUrl: string): RequestInfo | URL {
        if (typeof input === "string") return nextUrl;
        if (input instanceof URL) return nextUrl;

        if (input instanceof Request) {
            try {
                return new Request(nextUrl, input);
            }
            catch (err) {
                this.logger.error("XhrHook.fetch", err, { url: nextUrl });
                return input;
            }
        }

        return input;
    }

    private safeRequestUrl(input: RequestInfo | URL) {
        if (typeof input === "string") return input;
        if (input instanceof URL) return input.toString();
        if (input instanceof Request) return input.url;
        return this.safeUrl(input);
    }

    private safeUrl(value: unknown) {
        try {
            return String(value || "");
        }
        catch {
            return "";
        }
    }
}
