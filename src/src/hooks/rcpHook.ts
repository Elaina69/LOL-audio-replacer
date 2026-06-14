import type { Logger } from "../logger";
import type { ObjectAudioPatcher } from "../objectAudioPatcher";

export class RcpHook {
    private registered = false;

    constructor(
        private readonly patcher: ObjectAudioPatcher,
        private readonly logger: Logger,
        private readonly stats: Stats,
    ) {}

    install(context?: PenguContext) {
        if (this.registered) return;

        if (!context?.rcp?.postInit) {
            this.logger.error("RcpHook", "missing context.rcp.postInit");
            return;
        }

        this.registered = true;
        context.rcp.postInit("rcp-fe-common-libs", (api: unknown) => {
            try {
                this.hookCommonLibs(api);
            }
            catch (err) {
                this.logger.error("RcpHook", err);
            }
        });

        this.logger.info("RcpHook", "registered rcp-fe-common-libs hook");
    }

    private hookCommonLibs(api: unknown) {
        const commonApi = api as {
            getDataBinding?: (...args: unknown[]) => Promise<unknown> | unknown;
            __LOL_AUDIO_REPLACER_HOOKED?: boolean;
        };

        if (!commonApi?.getDataBinding || commonApi.__LOL_AUDIO_REPLACER_HOOKED) {
            return;
        }

        const originalGetRcp = commonApi.getDataBinding;
        const self = this;

        commonApi.getDataBinding = function (...getRcpArgs: unknown[]) {
            const rcpName = String(getRcpArgs[0] ?? "");
            const originalRcp = originalGetRcp.apply(this, getRcpArgs);
            const hookRcp = (rcp: unknown) => self.hookRcp(rcp, rcpName);

            if (self.isThenable(originalRcp)) {
                return originalRcp.then(hookRcp);
            }

            return hookRcp(originalRcp);
        };

        Object.defineProperty(commonApi, "__LOL_AUDIO_REPLACER_HOOKED", {
            value: true,
            configurable: true,
        });

        this.logger.info("RcpHook", "hooked rcp-fe-common-libs.getDataBinding");
    }

    private hookRcp(originalRcp: unknown, rcpName: string) {
        if (typeof originalRcp !== "function") {
            return originalRcp;
        }

        const self = this;

        const hookedRcp = function (this: unknown, ...rcpBindingArgs: unknown[]) {
            const rcp = originalRcp.apply(this, rcpBindingArgs);
            const basePath = String(rcpBindingArgs[0] ?? "");
            const cache = rcp?.cache;

            if (cache?._triggerResourceObservers && !cache._triggerResourceObservers.__LOL_AUDIO_REPLACER_HOOKED) {
                const originalTriggerResourceObservers = cache._triggerResourceObservers;

                cache._triggerResourceObservers = function (endpoint: string, content: unknown, error: unknown) {
                    self.stats.rcpUpdates += 1;

                    try {
                        const meta = { rcpName, basePath, endpoint };
                        const result = self.patcher.patch(content, "RCP", meta, "content");
                        const nextContent = result.changed ? result.value : content;

                        if (result.changed) {
                            self.stats.rcpPatches += 1;
                            self.logger.info("RcpHook", "patched resource update", {
                                endpoint,
                                patchCount: result.patches.length,
                                patches: result.patches,
                            });
                        }

                        return originalTriggerResourceObservers.apply(this, [endpoint, nextContent, error]);
                    }
                    catch (err) {
                        self.logger.error("RcpHook", err, { endpoint });
                        return originalTriggerResourceObservers.apply(this, arguments as unknown as [string, unknown, unknown]);
                    }
                };

                Object.defineProperty(cache._triggerResourceObservers, "__LOL_AUDIO_REPLACER_HOOKED", {
                    value: true,
                    configurable: true,
                });
            }

            return rcp;
        };

        const originalRcpWithBindTo = originalRcp as Function & {
            bindTo?: (...args: unknown[]) => unknown;
        };

        if (typeof originalRcpWithBindTo.bindTo === "function") {
            hookedRcp.bindTo = function (this: unknown, ...bindToArgs: unknown[]) {
                const result = originalRcpWithBindTo.bindTo!.apply(this, bindToArgs);
                if (result && typeof result === "object") {
                    (result as Record<string, unknown>).dataBinding = hookedRcp;
                }
                return result;
            };
        }

        return hookedRcp;
    }

    private isThenable(value: unknown): value is PromiseLike<unknown> {
        return !!value &&
            (typeof value === "object" || typeof value === "function") &&
            typeof (value as { then?: unknown }).then === "function";
    }
}
