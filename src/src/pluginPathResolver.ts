import { encodeUrlPathSegment, safeDecodeUrlSegment, splitPath } from "./utils";

export class PluginPathResolver {
    private pluginPath: string | null = null;

    init(context?: PenguContext) {
        if (this.pluginPath) return;

        const contextName = typeof context?.meta?.name === "string"
            ? context.meta.name
            : "";

        this.pluginPath = this.resolveFromPengu(contextName) ||
            this.resolveFromStack();
    }

    pluginUrl(...pathParts: unknown[]) {
        const pluginSegments = splitPath(this.pluginPath);
        const extraSegments = pathParts.flatMap(splitPath);
        const encodedSegments = [...pluginSegments, ...extraSegments]
            .map(encodeUrlPathSegment)
            .filter(Boolean);

        return `//plugins/${encodedSegments.join("/")}`;
    }

    private resolveFromPengu(folderName: string) {
        if (typeof Pengu === "undefined" || !Array.isArray(Pengu.plugins)) {
            return null;
        }

        const normalizedPlugins = Pengu.plugins.map((entry) => String(entry).replace(/\\/g, "/"));
        const wanted = safeDecodeUrlSegment(folderName);
        const match = normalizedPlugins.find((entry) => {
            const segments = splitPath(entry);
            const pluginFolder = segments.length >= 2 ? segments[segments.length - 2] : "";
            return safeDecodeUrlSegment(pluginFolder) === wanted;
        });

        if (!match) return null;

        const segments = splitPath(match);
        segments.pop();
        if (segments.length > 0) {
            segments[segments.length - 1] = folderName;
        }

        return segments.join("/");
    }

    private resolveFromStack() {
        const stackTrace = new Error().stack;
        const scriptPath = stackTrace
            ?.match(/(?:http|https):\/\/plugins\/.*?\.(?:js|ts)/g)
            ?.find((url) => !url.includes("/@/"));

        if (!scriptPath) return null;

        try {
            const url = new URL(scriptPath);
            const segments = url.pathname.split("/").filter(Boolean);
            if (segments.length < 2) return null;

            segments.pop();
            return segments.map(safeDecodeUrlSegment).join("/");
        }
        catch {
            return null;
        }
    }
}
