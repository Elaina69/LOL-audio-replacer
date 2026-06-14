import { Logger } from "./logger";
import { PluginPathResolver } from "./pluginPathResolver";
import { normalizeConfig } from "./utils";

export class ConfigLoader {
    private loading: Promise<AudioReplacerConfig> | null = null;

    constructor(
        private readonly resolver: PluginPathResolver,
        private readonly logger: Logger,
    ) {}

    load(force = false) {
        if (this.loading && !force) return this.loading;

        this.loading = this.importConfig();

        return this.loading;
    }

    reload() {
        this.loading = null;
        return this.load(true);
    }

    private importConfig() {
        const configUrl = `${this.resolver.pluginUrl("configs", "configs.js")}?t=${Date.now()}`;

        return import(configUrl)
            .then((configModule) => {
                const typedConfigModule = configModule as {
                    default?: Partial<AudioReplacerConfig>;
                };

                this.logger.info("ConfigLoader", "config module loaded", { url: configUrl });
                return normalizeConfig(typedConfigModule.default);
            })
            .catch((err) => {
                this.logger.error("ConfigLoader", err, { url: configUrl });
                return normalizeConfig(undefined);
            });
    }
}
