import { Logger } from "./logger";
import { PluginPathResolver } from "./pluginPathResolver";
import { extractAudioCandidates, getBasename, isAbsoluteReplacement, normalizeForCompare } from "./utils";

export class AudioRule {
    public rules: NormalizedRule[] = [];

    constructor(
        private config: AudioReplacerConfig,
        private readonly resolver: PluginPathResolver,
        private readonly logger: Logger,
    ) {
        this.setConfig(config);
    }

    setConfig(config: AudioReplacerConfig) {
        this.config = config;
        this.rules = config.rules
            .map((rule, index) => this.normalizeRule(rule, index))
            .filter((rule): rule is NormalizedRule => rule !== null);
    }

    rewriteText(value: string, source: string, path: string, meta?: Record<string, unknown>): RewriteResult {
        const matches: RewriteMatch[] = [];

        if (!this.config.enabled) {
            return { value, changed: false, matches };
        }

        const candidates = extractAudioCandidates(value)
            .filter((candidate) => !this.isOwnAssetUrl(candidate));

        if (candidates.length === 0) {
            return { value, changed: false, matches };
        }

        let nextValue = value;

        for (const candidate of candidates) {
            this.logger.detected(source, path, candidate, meta);

            const rule = this.findRule(candidate);
            if (!rule) {
                this.logger.skipped(source, path, candidate, meta);
                matches.push({ original: candidate, replacement: null, rule: null });
                continue;
            }

            nextValue = candidate === nextValue
                ? rule.replacementUrl
                : nextValue.split(candidate).join(rule.replacementUrl);

            this.logger.replaced(source, path, candidate, rule.replacementUrl, rule, meta);
            matches.push({ original: candidate, replacement: rule.replacementUrl, rule });
        }

        return {
            value: nextValue,
            changed: nextValue !== value,
            matches,
        };
    }

    rewriteUrl(url: string, source: string, path = "url", meta?: Record<string, unknown>) {
        return this.rewriteText(url, source, path, meta);
    }

    private normalizeRule(rule: AudioRuleConfig, index: number): NormalizedRule | null {
        if (!rule || rule.enabled === false) return null;

        const mode = rule.mode || "contains";
        const match = String(rule.match || "").trim();
        const replaceWith = String(rule.replaceWith || "").trim();

        if (!match || !replaceWith) {
            return null;
        }

        let regex: RegExp | null = null;
        const flags = String(rule.flags || "");

        if (mode === "regex") {
            try {
                regex = new RegExp(match, flags);
            }
            catch (err) {
                this.logger.error("AudioRule", err, { ruleIndex: index, match });
                return null;
            }
        }

        return {
            enabled: true,
            mode,
            match,
            replaceWith,
            flags,
            label: String(rule.label || `${mode}:${match}`),
            index,
            regex,
            replacementUrl: this.resolveReplacement(replaceWith),
        };
    }

    private resolveReplacement(replaceWith: string) {
        if (isAbsoluteReplacement(replaceWith)) {
            return replaceWith;
        }

        const assetPath = replaceWith.replace(/^assets[\\/]/i, "");
        return this.resolver.pluginUrl("assets", assetPath);
    }

    private findRule(candidate: string) {
        return this.rules.find((rule) => this.matchesRule(candidate, rule)) || null;
    }

    private matchesRule(candidate: string, rule: NormalizedRule) {
        const normalizedCandidate = normalizeForCompare(candidate);
        const normalizedMatch = normalizeForCompare(rule.match);

        if (rule.mode === "exact") {
            return normalizedCandidate === normalizedMatch;
        }

        if (rule.mode === "filename") {
            return normalizeForCompare(getBasename(candidate)) === normalizeForCompare(getBasename(rule.match));
        }

        if (rule.mode === "regex") {
            if (!rule.regex) return false;
            rule.regex.lastIndex = 0;
            return rule.regex.test(candidate);
        }

        return normalizedCandidate.includes(normalizedMatch);
    }

    private isOwnAssetUrl(value: string) {
        const normalizedValue = normalizeForCompare(value);
        const ownAssets = normalizeForCompare(this.resolver.pluginUrl("assets"));
        return normalizedValue.includes(ownAssets);
    }
}
