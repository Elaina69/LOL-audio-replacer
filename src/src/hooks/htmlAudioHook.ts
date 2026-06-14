import type { Logger } from "../logger";
import type { AudioRule } from "../audioRule";

export class HtmlAudioHook {
    private observer: MutationObserver | null = null;
    private readonly mediaSelector = "audio[src], video[src], source[src]";

    constructor(
        private readonly audioRule: AudioRule,
        private readonly logger: Logger,
        private readonly stats: Stats,
    ) {}

    install() {
        this.hookMediaSrcProperty();
        this.hookSetAttribute();
        this.hookAudioConstructor();
        this.startObserverWhenReady();
    }

    private hookMediaSrcProperty() {
        const prototype = HTMLMediaElement.prototype as HTMLMediaElement & {
            __LOL_AUDIO_REPLACER_SRC_HOOKED?: boolean;
        };

        if (prototype.__LOL_AUDIO_REPLACER_SRC_HOOKED) {
            return;
        }

        const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
        if (!descriptor?.set || !descriptor.get) {
            return;
        }

        const self = this;

        Object.defineProperty(HTMLMediaElement.prototype, "src", {
            configurable: true,
            enumerable: descriptor.enumerable,
            get() {
                return descriptor.get!.call(this);
            },
            set(value: string) {
                const nextValue = self.rewriteHtmlUrl(value, "HTMLMediaElement.src", this);
                return descriptor.set!.call(this, nextValue);
            },
        });

        Object.defineProperty(prototype, "__LOL_AUDIO_REPLACER_SRC_HOOKED", {
            value: true,
            configurable: true,
        });

        this.logger.info("HtmlAudioHook", "hooked HTMLMediaElement.src");
    }

    private hookSetAttribute() {
        const prototype = Element.prototype as Element & {
            setAttribute: typeof Element.prototype.setAttribute & { __LOL_AUDIO_REPLACER_HOOKED?: boolean };
        };

        if (prototype.setAttribute.__LOL_AUDIO_REPLACER_HOOKED) {
            return;
        }

        const originalSetAttribute = prototype.setAttribute;
        const self = this;

        prototype.setAttribute = function (qualifiedName: string, value: string) {
            let nextValue = value;

            if (String(qualifiedName).toLowerCase() === "src" && self.isMediaSourceElement(this)) {
                nextValue = self.rewriteHtmlUrl(value, "Element.setAttribute", this);
            }

            return originalSetAttribute.call(this, qualifiedName, nextValue);
        } as typeof Element.prototype.setAttribute & { __LOL_AUDIO_REPLACER_HOOKED?: boolean };

        Object.defineProperty(prototype.setAttribute, "__LOL_AUDIO_REPLACER_HOOKED", {
            value: true,
            configurable: true,
        });

        this.logger.info("HtmlAudioHook", "hooked Element.setAttribute(src)");
    }

    private hookAudioConstructor() {
        const originalAudio = window.Audio as typeof Audio & { __LOL_AUDIO_REPLACER_HOOKED?: boolean };
        if (!originalAudio || originalAudio.__LOL_AUDIO_REPLACER_HOOKED) {
            return;
        }

        const self = this;
        const AudioReplacement = function (this: HTMLAudioElement, src?: string) {
            const nextSrc = typeof src === "string"
                ? self.rewriteHtmlUrl(src, "Audio", null)
                : src;

            return new originalAudio(nextSrc);
        };

        AudioReplacement.prototype = originalAudio.prototype;
        Object.setPrototypeOf(AudioReplacement, originalAudio);

        Object.defineProperty(AudioReplacement, "__LOL_AUDIO_REPLACER_HOOKED", {
            value: true,
            configurable: true,
        });

        window.Audio = AudioReplacement as unknown as typeof Audio;
        this.logger.info("HtmlAudioHook", "hooked Audio constructor");
    }

    private startObserverWhenReady() {
        if (this.observer) return;

        const start = () => {
            if (!document.documentElement || this.observer) {
                return;
            }

            this.scanNode(document.documentElement);

            this.observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of Array.from(mutation.addedNodes)) {
                        this.scanNode(node);
                    }

                    if (mutation.type === "attributes" && mutation.attributeName === "src") {
                        this.scanNode(mutation.target);
                    }
                }
            });

            this.observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["src"],
            });

            this.logger.info("HtmlAudioHook", "started MutationObserver");
        };

        if (document.documentElement) {
            start();
            return;
        }

        window.addEventListener("DOMContentLoaded", start, { once: true });
    }

    private scanNode(node: Node) {
        if (!(node instanceof Element)) return;

        if (this.isMediaSourceElement(node)) {
            this.rewriteElementSource(node);
        }

        node.querySelectorAll?.(this.mediaSelector).forEach((element) => {
            this.rewriteElementSource(element);
        });
    }

    private rewriteElementSource(element: Element) {
        const src = element.getAttribute("src");
        if (!src) return;

        const nextSrc = this.rewriteHtmlUrl(src, "MutationObserver", element);
        if (nextSrc !== src) {
            element.setAttribute("src", nextSrc);
        }
    }

    private rewriteHtmlUrl(value: string, source: string, element: Element | null) {
        try {
            const result = this.audioRule.rewriteUrl(value, source, "src", {
                tagName: element?.tagName,
                className: element instanceof Element ? element.className : "",
            });

            if (result.changed) {
                this.stats.htmlPatches += 1;
                return result.value;
            }
        }
        catch (err) {
            this.logger.error(`HtmlAudioHook.${source}`, err, { value });
        }

        return value;
    }

    private isMediaSourceElement(element: Element) {
        const tagName = element.tagName.toLowerCase();
        return tagName === "audio" ||
            tagName === "video" ||
            tagName === "source" ||
            element instanceof HTMLMediaElement;
    }
}
