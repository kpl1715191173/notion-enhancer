"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAutoUpdater = void 0;
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
const electron_updater_1 = require("electron-updater");
const config_1 = __importDefault(require("../config"));
const notionIpc = __importStar(require("../helpers/notionIpc"));
const loggly_1 = require("../helpers/loggly");
const isOfflineError_1 = __importDefault(require("../shared/isOfflineError"));
const cleanObjectForSerialization_1 = require("../shared/cleanObjectForSerialization");
const logglyHelpers_1 = require("../shared/logglyHelpers");
const assetCache_1 = require("./assetCache");
electron_log_1.default.transports.file.level = "info";
electron_log_1.default.transports.file.fileName = "log.log";
electron_updater_1.autoUpdater.logger = electron_log_1.default;
let electronUpdateIsAvailable = false;
electron_updater_1.autoUpdater.autoInstallOnAppQuit = process.platform !== "win32";
function initializeAutoUpdater() {
    let inInstallInitializationWindow = true;
    setTimeout(() => {
        inInstallInitializationWindow = false;
    }, 5000);
    electron_updater_1.autoUpdater.on("error", error => {
        electronUpdateIsAvailable = false;
        if (isOfflineError_1.default(error)) {
            electron_log_1.default.info("No electron update -- offline");
            notionIpc.sendMainToNotion("notion:update-not-available");
            return;
        }
        if (error.domain === "NSPOSIXErrorDomain") {
            void loggly_1.loggly.log({
                level: "error",
                from: "autoUpdater",
                type: "NSPOSIXErrorDomainError",
                error: logglyHelpers_1.convertErrorToLog(error),
            });
        }
        else if (error.domain === "SQRLUpdaterErrorDomain") {
            void loggly_1.loggly.log({
                level: "error",
                from: "autoUpdater",
                type: "SQRLUpdaterErrorDomainError",
                error: logglyHelpers_1.convertErrorToLog(error),
            });
        }
        else if (error.domain === "NSCocoaErrorDomain") {
            void loggly_1.loggly.log({
                level: "error",
                from: "autoUpdater",
                type: "NSCocoaErrorDomainError",
                error: logglyHelpers_1.convertErrorToLog(error),
            });
        }
        else if (error.message.startsWith("net::ERR")) {
            void loggly_1.loggly.log({
                level: "info",
                from: "autoUpdater",
                type: "networkError",
                error: logglyHelpers_1.convertErrorToLog(error),
            });
        }
        else if (error.statusCode === 403) {
            void loggly_1.loggly.log({
                level: "warning",
                from: "autoUpdater",
                type: "cloudflareCaptcha",
                error: logglyHelpers_1.convertErrorToLog(error),
            });
        }
        else if (error.statusCode === 503) {
            void loggly_1.loggly.log({
                level: "warning",
                from: "autoUpdater",
                type: "serviceUnavailable",
                error: logglyHelpers_1.convertErrorToLog(error),
            });
        }
        else if (process.platform === "linux") {
            void loggly_1.loggly.log({
                level: "info",
                from: "autoUpdater",
                type: "unsupportedLinuxApp",
                error: logglyHelpers_1.convertErrorToLog(error),
            });
        }
        else if (error.message.indexOf("app-update.yml") !== -1) {
        }
        else {
            void loggly_1.loggly.log({
                level: "error",
                from: "autoUpdater",
                type: "unknownAutoUpdaterError",
                error: logglyHelpers_1.convertErrorToLog(error),
            });
        }
        notionIpc.sendMainToNotion("notion:update-error", cleanObjectForSerialization_1.cleanObjectForSerialization(error));
    });
    electron_updater_1.autoUpdater.on("checking-for-update", () => {
        notionIpc.sendMainToNotion("notion:checking-for-update");
    });
    electron_updater_1.autoUpdater.on("update-available", (info) => {
        electronUpdateIsAvailable = true;
        notionIpc.sendMainToNotion("notion:update-available", info);
    });
    electron_updater_1.autoUpdater.on("update-not-available", () => {
        notionIpc.sendMainToNotion("notion:update-not-available");
    });
    electron_updater_1.autoUpdater.on("download-progress", (progress) => {
        notionIpc.sendMainToNotion("notion:update-progress", progress);
    });
    electron_updater_1.autoUpdater.on("update-downloaded", async (info) => {
        notionIpc.sendMainToNotion("notion:update-ready", info);
        await assetCache_1.assetCache.checkForUpdates();
        if (inInstallInitializationWindow) {
            electron_updater_1.autoUpdater.quitAndInstall();
        }
    });
}
exports.initializeAutoUpdater = initializeAutoUpdater;
notionIpc.receiveMainFromRenderer.addListener("notion:install-update", () => {
    setTimeout(async () => {
        await assetCache_1.assetCache.checkForUpdates();
        if (electronUpdateIsAvailable) {
            electron_updater_1.autoUpdater.quitAndInstall();
        }
        else {
            electron_1.app.relaunch();
            electron_1.app.quit();
        }
    });
});
notionIpc.receiveMainFromRenderer.addListener("notion:check-for-updates", () => {
    void electron_updater_1.autoUpdater.checkForUpdates();
});
const pollInterval = config_1.default.isLocalhost ? 10 * 1000 : 24 * 60 * 60 * 1000;
async function pollForElectronUpdates() {
    while (true) {
        if (!electronUpdateIsAvailable) {
            try {
                await electron_updater_1.autoUpdater.checkForUpdates();
            }
            catch (error) { }
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
}
if (!config_1.default.isLocalhost) {
    void pollForElectronUpdates();
}
//# sourceMappingURL=autoUpdater.js.map

//notion-enhancer
require('notion-enhancer')('main/autoUpdater', exports, (js) => eval(js))