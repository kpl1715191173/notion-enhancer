"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const config_1 = __importDefault(require("../config"));
const url_1 = require("url");
const constants_1 = require("../shared/constants");
const configProtocol = `${config_1.default.protocol}:`;
const configBaseOrigin = config_1.default.domainBaseUrl;
const configBaseOriginFuture = configBaseOrigin.replace(/\.so$/, ".com");
const allowedNavigationOrigins = [
    configBaseOrigin,
    configBaseOriginFuture,
    "https://accounts.google.com",
    "https://app.asana.com",
    "https://trello.com",
    "https://www.evernote.com",
    "https://docs.google.com",
    "https://slack.com",
    "https://login.microsoftonline.com",
    "https://connect.wustl.edu",
];
const allowedSubdomainsOnDomain = [
    ".okta.com",
    ".onelogin.com",
    ".jumpcloud.com",
    ".slack.com",
];
const allowedUrlPrefixes = [
    "https://www.google.com/accounts/",
];
electron_1.app.on("web-contents-created", (event, contents) => {
    contents.on("will-attach-webview", (event, webPreferences, params) => {
        params.partition = constants_1.electronSessionPartition;
        const pref = webPreferences;
        if (pref.preloadURL) {
            if (!pref.preloadURL.startsWith("file://")) {
                delete pref.preloadURL;
            }
        }
        if (webPreferences.preload) {
            if (!webPreferences.preload.startsWith("file://")) {
                delete webPreferences.preload;
            }
        }
        delete webPreferences.preload;
        webPreferences.nodeIntegration = false;
        webPreferences.webSecurity = true;
        webPreferences.allowRunningInsecureContent = false;
        webPreferences.experimentalFeatures = false;
        webPreferences.enableBlinkFeatures = undefined;
        let protocol;
        try {
            protocol = new url_1.URL(params.src).protocol;
        }
        catch (error) { }
        if ("file:" !== protocol && configProtocol !== protocol) {
            event.preventDefault();
        }
    });
});
electron_1.app.on("ready", () => {
    electron_1.session
        .fromPartition(constants_1.electronSessionPartition)
        .setPermissionRequestHandler((webContents, permission, callback, details) => {
        const url = details.requestingUrl;
        const { protocol } = new url_1.URL(url);
        if (protocol === configProtocol) {
            callback(true);
        }
        else {
            callback(false);
        }
    });
});
electron_1.app.on("web-contents-created", (event, webContents) => {
    webContents.on("will-navigate", (event, url) => {
        const { protocol, origin } = new url_1.URL(url);
        if (protocol !== configProtocol &&
            !allowedNavigationOrigins.includes(origin) &&
            !allowedSubdomainsOnDomain.find(domain => origin.startsWith("https://") && origin.endsWith(domain)) &&
            !allowedUrlPrefixes.find(prefix => url.startsWith(prefix))) {
            event.preventDefault();
            if (protocol === "https:" || protocol === "http:") {
                void electron_1.shell.openExternal(url);
            }
        }
    });
    webContents.on("will-redirect", (event, url, isInPlace, isMainFrame) => {
        const { protocol, origin } = new url_1.URL(url);
        if (isMainFrame &&
            protocol !== configProtocol &&
            !allowedNavigationOrigins.includes(origin) &&
            !allowedSubdomainsOnDomain.find(domain => origin.startsWith("https://") && origin.endsWith(domain)) &&
            !allowedUrlPrefixes.find(prefix => url.startsWith(prefix))) {
            event.preventDefault();
        }
    });
    webContents.on("new-window", (event, url) => {
        const { protocol } = new url_1.URL(url);
        if (protocol !== configProtocol) {
            event.preventDefault();
        }
    });
    webContents.on("will-prevent-unload", event => {
        event.preventDefault();
    });
});
//# sourceMappingURL=security.js.map

//notion-enhancer
require('notion-enhancer')('main/security', exports, (js) => eval(js))