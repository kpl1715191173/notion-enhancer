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
const electron_1 = require("electron");
electron_1.app.commandLine.appendSwitch("--no-sandbox");
require("isomorphic-fetch");
require("./crashReporter");
const autoUpdater_1 = require("./autoUpdater");
const systemMenu_1 = require("./systemMenu");
require("./security");
const schemeHandler_1 = require("./schemeHandler");
const createWindow_1 = require("./createWindow");
const createPopup_1 = require("./createPopup");
const createGoogleDrivePicker_1 = require("./createGoogleDrivePicker");
const config_1 = __importDefault(require("../config"));
const notionIpc = __importStar(require("../helpers/notionIpc"));
const loggly_1 = require("../helpers/loggly");
const assetCache_1 = require("./assetCache");
const schemeHelpers = __importStar(require("../shared/schemeHelpers"));
const urlHelpers = __importStar(require("../shared/urlHelpers"));
const fs_1 = __importDefault(require("fs"));
const localizationHelper_1 = require("../helpers/localizationHelper");
const notion_intl_1 = require("notion-intl");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const electron_log_1 = __importDefault(require("electron-log"));
const get_port_1 = __importDefault(require("get-port"));
const crypto_1 = __importDefault(require("crypto"));
const urlHelpers_1 = require("../helpers/urlHelpers");
const logglyHelpers_1 = require("../shared/logglyHelpers");
const Sentry = __importStar(require("./sentry"));
const desktopLocaleHelpers_1 = require("../shared/desktopLocaleHelpers");
electron_1.dialog.showErrorBox = function (title, content) { };
function makeRelativeUrl(url) {
    try {
        new URL(url);
    }
    catch (error) {
        return;
    }
    const fixedUrl = schemeHelpers.fixSchemeUrl({
        url: url,
        protocol: config_1.default.protocol,
        baseUrl: config_1.default.domainBaseUrl,
    });
    const httpUrl = schemeHelpers.getHttpUrl({
        schemeUrl: fixedUrl,
        baseUrl: config_1.default.domainBaseUrl,
    });
    const relativeUrl = urlHelpers.removeBaseUrl(httpUrl);
    return relativeUrl;
}
function handleActivate(relativeUrl) {
    const allWindows = electron_1.BrowserWindow.getAllWindows();
    const { isLocalhost, env } = config_1.default;
    const isLocal = env === "local" || isLocalhost;
    if (allWindows.length === 1 && allWindows[0].isVisible()) {
        const win = allWindows[0];
        if (relativeUrl) {
            void win.webContents.loadURL(urlHelpers_1.getIndexUrl(relativeUrl));
        }
        win.focus();
    }
    else {
        const win = createWindow_1.createWindow(relativeUrl, { isLocalhost: isLocal });
        if (isLocal) {
            win.minimize();
        }
        else {
            win.focus();
        }
    }
}
async function handleReady() {
    const locale = desktopLocaleHelpers_1.externalLocaleToNotionLocale(electron_1.app.getLocale(), config_1.default.env === "production");
    const intl = localizationHelper_1.createIntlShape(locale);
    const messages = notion_intl_1.defineMessages({
        invalidInstallMessage: {
            id: "desktopInstaller.invalidInstallDialog.title",
            defaultMessage: "Invalid Install",
        },
        invalidInstallDetail: {
            id: "desktopInstaller.invalidInstallDialog.message",
            defaultMessage: "Your Notion application is not installed properly. You need to move your Notion app into your Applications folder.",
        },
        okButton: {
            id: "desktopInstaller.invalidInstallDialog.okButton.label",
            defaultMessage: "OK",
        },
    });
    if (isOpenedFromNonWritableDirectory()) {
        await electron_1.dialog.showMessageBox({
            type: "error",
            buttons: [intl.formatMessage(messages.okButton)],
            message: intl.formatMessage(messages.invalidInstallMessage),
            detail: [intl.formatMessage(messages.invalidInstallDetail)].join("\n"),
        });
        const helpUrl = locale === "ko-KR"
            ? "https://www.notion.so/fe244a58c73b4174a89effb4828b86c5"
            : "https://www.notion.so/b2be23041a0b4b948aa675184abc9165";
        await electron_1.shell.openExternal(helpUrl);
        electron_1.app.quit();
        return;
    }
    let relativeUrl;
    if (process.platform !== "darwin") {
        const { argv } = process;
        const url = argv.find(arg => arg.startsWith(`${config_1.default.protocol}:`));
        if (url) {
            relativeUrl = makeRelativeUrl(url);
        }
    }
    void startup(relativeUrl);
}
let serverProcess;
let serverProcessPort;
const authToken = crypto_1.default.randomBytes(20).toString("hex");
async function assignServerProcessPort() {
    serverProcessPort = await get_port_1.default({ host: "127.0.0.1" });
}
async function startupServer() {
    const userDataPath = electron_1.app.getPath("userData");
    const executorPath = path_1.default.join(__dirname, "sqlite", "SqliteServer.js");
    await assignServerProcessPort();
    if (!serverProcessPort) {
        throw new Error("No process port assigned.");
    }
    const process = child_process_1.fork(executorPath, [userDataPath, serverProcessPort.toString(), authToken], {
        stdio: ["pipe", "inherit", "pipe", "ipc"],
    });
    return process;
}
async function startup(relativeUrl) {
    Sentry.initialize(electron_1.app);
    autoUpdater_1.initializeAutoUpdater();
    const locale = desktopLocaleHelpers_1.externalLocaleToNotionLocale(electron_1.app.getLocale(), config_1.default.env === "production");
    systemMenu_1.setupSystemMenu(locale);
    await schemeHandler_1.migrateCookies();
    await assetCache_1.assetCache.initialize();
    if (!serverProcess) {
        serverProcess = await startupServer();
    }
    schemeHandler_1.registerUrlSchemeProxy();
    handleActivate(relativeUrl);
    await schemeHandler_1.wipeTransientCsrfCookie();
}
electron_1.app.on("ready", handleReady);
electron_1.app.setAppUserModelId(config_1.default.desktopAppId);
electron_1.app.setAsDefaultProtocolClient(config_1.default.protocol);
electron_1.app.on("open-url", (event, url) => {
    event.preventDefault();
    const relativeUrl = makeRelativeUrl(url);
    if (electron_1.app.isReady()) {
        const focusedWindow = electron_1.BrowserWindow.getFocusedWindow();
        const allWindows = electron_1.BrowserWindow.getAllWindows();
        const targetWindow = (() => {
            if (focusedWindow && focusedWindow.isVisible()) {
                return focusedWindow;
            }
            if (allWindows.length > 0) {
                return allWindows[0];
            }
        })();
        if (targetWindow && relativeUrl) {
            notionIpc.sendMainToNotionWindow(targetWindow, "notion:navigate-to-url", relativeUrl);
            targetWindow.focus();
        }
        else {
            const win = createWindow_1.createWindow(relativeUrl);
            win.focus();
        }
    }
    else {
        electron_1.app.removeListener("ready", handleReady);
        electron_1.app.on("ready", async () => startup(relativeUrl));
    }
});
if (electron_1.app.requestSingleInstanceLock()) {
    electron_1.app.on("second-instance", (_event, argv, workingDirectory) => {
        if (process.platform !== "darwin") {
            const url = argv.find(arg => arg.startsWith(`${config_1.default.protocol}:`));
            const urlPath = url && makeRelativeUrl(url);
            handleActivate(urlPath);
        }
    });
}
else {
    electron_1.app.quit();
}
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("before-quit", () => {
    electron_log_1.default.info("Quitting...");
    if (serverProcess) {
        electron_log_1.default.info("Killing child process");
        serverProcess.kill("SIGTERM");
        serverProcess = undefined;
    }
});
electron_1.app.on("activate", (_event, hasVisibleWindows) => {
    if (!hasVisibleWindows) {
        createWindow_1.createWindow();
    }
});
let refreshInterval;
electron_1.app.on("browser-window-blur", () => {
    clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        if (!electron_1.BrowserWindow.getFocusedWindow()) {
            if (Math.random() <= 0.0005) {
                notionIpc.sendMainToNotion("notion:app-update-install");
            }
            else {
                notionIpc.sendMainToNotion("notion:windows-backgrounded");
            }
        }
    }, 10 * 1000);
});
electron_1.app.on("browser-window-focus", () => {
    clearInterval(refreshInterval);
});
notionIpc.receiveMainFromRenderer.addListener("notion:create-window", (_event, urlPath) => {
    createWindow_1.createWindow(urlPath);
});
notionIpc.receiveMainFromRenderer.addListener("notion:create-popup", (_event, args) => {
    createPopup_1.createPopup(args);
});
notionIpc.receiveMainFromRenderer.addListener("notion:create-google-drive-picker", (_event, args) => {
    createGoogleDrivePicker_1.createGoogleDrivePicker(args);
});
notionIpc.addMainHandler("notion:get-sqlite-meta", _event => {
    if (!serverProcessPort) {
        throw new Error("Port not yet assigned, should not be possible.");
    }
    return { value: { serverProcessPort, authToken } };
});
notionIpc.receiveMainFromRenderer.addListener("notion:broadcast", (_event, args) => {
    notionIpc.sendMainToNotion("notion:broadcast", args);
});
process.on("uncaughtException", error => {
    Sentry.capture(error);
    void loggly_1.loggly.log({
        level: "error",
        from: "main",
        type: "uncaughtException",
        error: logglyHelpers_1.convertErrorToLog(error),
    });
});
process.on("unhandledRejection", error => {
    Sentry.capture(error);
    void loggly_1.loggly.log({
        level: "error",
        from: "main",
        type: "unhandledRejection",
        error: logglyHelpers_1.convertErrorToLog(error),
    });
});
function isOpenedFromNonWritableDirectory() {
    if (process.platform === "darwin") {
        try {
            fs_1.default.accessSync(electron_1.app.getPath("exe"), fs_1.default.constants.W_OK);
            return false;
        }
        catch (error) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=main.js.map

//notion-enhancer
require('notion-enhancer')('main/main', exports, (js) => eval(js))