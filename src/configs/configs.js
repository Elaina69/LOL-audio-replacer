export default {
    enabled: true,
    debug: true,
    rules: [
        // mode guide:
        //
        // "filename"
        // - Use when you only know the audio file name.
        // - Easiest option and usually good for quick replacement.
        // - Example: match: "sfx-lobby-button-find-match-hover.ogg"
        // - It matches any path ending with that file name, including query/hash.
        // - Risk: may replace multiple sounds if Riot reuses the same file name in different folders.
        //
        // "contains"
        // - Use when you know a stable part of the URL/path.
        // - Recommended when the file name may appear in more than one folder.
        // - Example: match: "/fe/lol-parties/sfx-lobby-button-find-match-hover.ogg"
        // - It matches if the loaded URL contains this text.
        //
        // "exact"
        // - Use when you want the strictest match.
        // - Best for one known full path that should not affect anything else.
        // - Example: match: "/fe/lol-parties/sfx-lobby-button-find-match-hover.ogg"
        // - It must match the normalized URL exactly, so it can miss URLs with extra query/path changes.
        //
        // "regex"
        // - Use only when one rule needs to match many variants.
        // - Most flexible, but easiest to write too broadly.
        // - Example: match: "sfx-.*find-match.*\\.ogg$", flags: "i"
        //
        // replaceWith:
        // - Put your replacement audio file inside this plugin's assets folder.
        // - Use only the file name, for example: "my-audio.ogg".
        // - Subfolders are supported, for example: "aram/my-audio.ogg".
        // {
        //     enabled: true,
        //     mode: "filename",
        //     match: "",
        //     replaceWith: "put-your-audio-file.ogg",
        // },
        {
            // ARAM - Ready Check Sound
            enabled: true,
            mode: "filename",
            match: "sfx-readycheck-ha-portal.ogg",
            replaceWith: "CJ_ah-shit-here-we-go-again.ogg",
        },
        {
            // ARAM - Champion Select Music
            enabled: true,
            mode: "filename",
            match: "music-cs-allrandom-howlingabyss.ogg",
            replaceWith: "Howling Abyss - Champion Select - Season 3.ogg",
        },
        {
            // SR - Ready Check Sound
            enabled: true,
            mode: "filename",
            match: "sfx-readycheck-sr-portal.ogg",
            replaceWith: "CJ_ah-shit-here-we-go-again.ogg",
        },
        {
            // SR - Champion Select - Blind Pick Music
            enabled: true,
            mode: "filename",
            match: "music-cs-blindpick-default.ogg",
            replaceWith: "Summoner's Rift Champion Select - Draft Pick - Season 1.ogg",
        },
        {
            // SR - Pregame lobby music
            enabled: true,
            mode: "filename",
            match: "sfx-ambience-loop-summonersrift.ogg",
            replaceWith: "",
        },
    ],
};
