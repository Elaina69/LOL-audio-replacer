import { LOLAudioReplacerApp } from "./src/app";

const app = new LOLAudioReplacerApp();

export function init(context: PenguContext) {
    app.init(context);
}

export function load() {
    app.load();
}
