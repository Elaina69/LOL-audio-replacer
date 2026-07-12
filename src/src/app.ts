import { now } from "./utils";
import { Logger } from "./logger";
import { AudioRule } from "./audioRule";
import { ConfigLoader } from "./configLoader";
import { RcpHook } from "./hooks/rcpHook";
import { HtmlAudioHook } from "./hooks/htmlAudioHook";
import { XhrHook } from "./hooks/xhrHook";
import { ObjectAudioPatcher } from "./objectAudioPatcher";
import { PluginPathResolver } from "./pluginPathResolver";

export class LOLAudioReplacerApp {
    public config: AudioReplacerConfig = {
        enabled: true,
        debug: true,
        rules: [],
    };

    public readonly stats: Stats = {
        installedAt: now(),
        configLoaded: false,
        detected: 0,
        replaced: 0,
        skipped: 0,
        errors: 0,
        fetches: 0,
        xhrs: 0,
        rcpUpdates: 0,
        rcpPatches: 0,
        htmlPatches: 0,
        lastError: "",
        history: [],
    };

    private readonly resolver = new PluginPathResolver();
    private readonly logger = new Logger(this.stats, () => this.config);
    private readonly configLoader = new ConfigLoader(this.resolver, this.logger);
    private readonly audioRule = new AudioRule(this.config, this.resolver, this.logger);
    
    private readonly patcher = new ObjectAudioPatcher(this.audioRule);

    private readonly rcpHook = new RcpHook(this.patcher, this.logger, this.stats);
    private readonly xhrHook = new XhrHook(this.audioRule, this.logger, this.stats);
    private readonly htmlAudioHook = new HtmlAudioHook(this.audioRule, this.logger, this.stats);

    private ready: Promise<void> | null = null;
    private context: PenguContext | undefined;

    init(context?: PenguContext) {
        this.context = context;
        this.resolver.init(context);

        this.exposeDebugApi();
        this.ensureReady();

        this.rcpHook.install(context);

        this.logger.info("App", "init complete", {
            pluginUrl: this.resolver.pluginUrl(),
            rules: this.audioRule.rules.length,
        });
    }

    load() {
        this.resolver.init(this.context);

        this.exposeDebugApi();
        this.ensureReady();

        this.logger.info("App", "load complete", {
            pluginUrl: this.resolver.pluginUrl(),
            rules: this.audioRule.rules.length,
        });
    }

    reloadConfig() {
        return this.configLoader.reload().then((config) => {
            this.config = config;
            this.stats.configLoaded = true;

            this.audioRule.setConfig(this.config);

            this.exposeDebugApi();

            this.logger.info("App", "config reloaded", { rules: this.audioRule.rules.length });
            return this.config;
        });
    }

    private ensureReady() {
        if (!this.ready) {
            this.ready = this.loadConfigAndInstallHooks();
        }

        return this.ready;
    }

    private loadConfigAndInstallHooks() {
        return this.configLoader.load().then((config) => {
            this.config = config;
            this.stats.configLoaded = true;
            this.audioRule.setConfig(this.config);
            this.exposeDebugApi();

            this.xhrHook.install();
            this.htmlAudioHook.install();
        });
    }

    private exposeDebugApi() {
        const app = this;

        window.LOLAudioReplacer = {
            get config() {
                return app.config;
            },
            get stats() {
                return app.stats;
            },
            get rules() {
                return app.audioRule.rules;
            },
            pluginUrl: (...pathParts: unknown[]) => app.resolver.pluginUrl(...pathParts),
            test: (url: string) => app.audioRule.rewriteUrl(String(url), "debug.test", "url"),
            reloadConfig: () => app.reloadConfig(),
        };
    }
}
