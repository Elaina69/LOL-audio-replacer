import { AudioRule } from "./audioRule";
import { isSkippableObject } from "./utils";

export class ObjectAudioPatcher {
    constructor(
        private readonly audioRule: AudioRule,
    ) {}

    patch(
        value: unknown,
        source: string,
        meta?: Record<string, unknown>,
        path = "$",
        seen = new WeakMap<object, unknown>(),
        depth = 0,
        budget = { visited: 0 },
    ): PatchResult {
        if (budget.visited++ > 15000 || depth > 50) {
            return { value, changed: false, patches: [] };
        }

        if (typeof value === "string") {
            const result = this.audioRule.rewriteText(value, source, path, meta);
            return {
                value: result.value,
                changed: result.changed,
                patches: result.changed ? [{
                    path,
                    before: value,
                    after: result.value,
                }] : [],
            };
        }

        if (!value || typeof value !== "object") {
            return { value, changed: false, patches: [] };
        }

        if (seen.has(value)) {
            return { value: seen.get(value), changed: false, patches: [] };
        }

        if (isSkippableObject(value)) {
            return { value, changed: false, patches: [] };
        }

        if (Array.isArray(value)) {
            const output: unknown[] = [];
            seen.set(value, output);

            let changed = false;
            const patches: PatchRecord[] = [];

            value.forEach((item, index) => {
                const result = this.patch(item, source, meta, `${path}[${index}]`, seen, depth + 1, budget);
                output[index] = result.value;
                changed ||= result.changed;
                patches.push(...result.patches);
            });

            return {
                value: changed ? output : value,
                changed,
                patches,
            };
        }

        const output: Record<string, unknown> = {};
        seen.set(value, output);

        let changed = false;
        const patches: PatchRecord[] = [];

        for (const key of Object.keys(value)) {
            let current: unknown;
            try {
                current = (value as Record<string, unknown>)[key];
            }
            catch {
                continue;
            }

            const result = this.patch(current, source, meta, `${path}.${key}`, seen, depth + 1, budget);
            output[key] = result.value;
            changed ||= result.changed;
            patches.push(...result.patches);
        }

        return {
            value: changed ? output : value,
            changed,
            patches,
        };
    }
}
