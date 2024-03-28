"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSystemMenu = void 0;
const electron_1 = require("electron");
const fs_extra_1 = __importDefault(require("fs-extra"));
const createWindow_1 = require("./createWindow");
const config_1 = __importDefault(require("../config"));
const notion_intl_1 = require("notion-intl");
const localizationHelper_1 = require("../helpers/localizationHelper");
const menuMessages = notion_intl_1.defineMessages({
    fileMenuTitle: {
        id: "desktopTopbar.fileMenu.title",
        defaultMessage: "File",
    },
    editMenuTitle: {
        id: "desktopTopbar.editMenu.title",
        defaultMessage: "Edit",
    },
    viewMenuTitle: {
        id: "desktopTopbar.viewMenu.title",
        defaultMessage: "View",
    },
    windowMenuTitle: {
        id: "desktopTopbar.windowMenu.title",
        defaultMessage: "Window",
    },
    helpTitle: {
        id: "desktopTopbar.helpMenu.title",
        defaultMessage: "Help",
    },
    newWindow: {
        id: "desktopTopbar.fileMenu.newWindow",
        defaultMessage: "New Window",
    },
    closeWindow: {
        id: "desktopTopbar.fileMenu.close",
        defaultMessage: "Close Window",
    },
    quit: {
        id: "desktopTopbar.fileMenu.quit",
        defaultMessage: "Exit",
    },
    undo: {
        id: "desktopTopbar.editMenu.undo",
        defaultMessage: "Undo",
    },
    redo: {
        id: "desktopTopbar.editMenu.redo",
        defaultMessage: "Redo",
    },
    cut: {
        id: "desktopTopbar.editMenu.cut",
        defaultMessage: "Cut",
    },
    copy: {
        id: "desktopTopbar.editMenu.copy",
        defaultMessage: "Copy",
    },
    paste: {
        id: "desktopTopbar.editMenu.paste",
        defaultMessage: "Paste",
    },
    selectAll: {
        id: "desktopTopbar.editMenu.selectAll",
        defaultMessage: "Select All",
    },
    startSpeaking: {
        id: "desktopTopbar.editMenu.speech.startSpeaking",
        defaultMessage: "Start Speaking",
    },
    stopSpeaking: {
        id: "desktopTopbar.editMenu.speech.stopSpeaking",
        defaultMessage: "Stop Speaking",
    },
    speech: {
        id: "desktopTopbar.editMenu.speech",
        defaultMessage: "Speech",
    },
    reload: {
        id: "desktopTopbar.viewMenu.reload",
        defaultMessage: "Reload",
    },
    togglefullscreen: {
        id: "desktopTopbar.viewMenu.togglefullscreen",
        defaultMessage: "Toggle Full Screen",
    },
    toggleDevTools: {
        id: "desktopTopbar.toggleDevTools",
        defaultMessage: "Toggle Developer Tools",
    },
    toggleWindowDevTools: {
        id: "desktopTopbar.toggleWindowDevTools",
        defaultMessage: "Toggle Window Developer Tools",
    },
    maximize: {
        id: "desktopTopbar.windowMenu.maximize",
        defaultMessage: "Maximize",
    },
    minimize: {
        id: "desktopTopbar.windowMenu.minimize",
        defaultMessage: "Minimize",
    },
    zoom: {
        id: "desktopTopbar.windowMenu.zoom",
        defaultMessage: "Zoom",
    },
    front: {
        id: "desktopTopbar.windowMenu.front",
        defaultMessage: "Front",
    },
    close: {
        id: "desktopTopbar.windowMenu.close",
        defaultMessage: "Close",
    },
    help: {
        id: "desktopTopbar.helpMenu.openHelpAndSupport",
        defaultMessage: "Open Help & Support",
    },
    reset: {
        id: "desktopTopbar.appMenu.resetAppAndClearData",
        defaultMessage: "Reset App & Clear Local Data",
    },
    about: { id: "desktopTopbar.appMenu.about", defaultMessage: "About Notion" },
    services: {
        id: "desktopTopbar.appMenu.services",
        defaultMessage: "Services",
    },
    hide: { id: "desktopTopbar.appMenu.hide", defaultMessage: "Hide Notion" },
    hideOthers: {
        id: "desktopTopbar.appMenu.hideOthers",
        defaultMessage: "Hide Others",
    },
    unhide: { id: "desktopTopbar.appMenu.unhide", defaultMessage: "Show All" },
    quitMac: { id: "desktopTopbar.appMenu.quit", defaultMessage: "Quit" },
});
function escapeAmpersand(message) {
    return message.replace(/&/g, "&&");
}
function setupSystemMenu(locale) {
    const isElectronMac = process.platform === "darwin";
    const intl = localizationHelper_1.createIntlShape(locale);
    const fileMenu = {
        role: "fileMenu",
        label: escapeAmpersand(intl.formatMessage(menuMessages.fileMenuTitle)),
        submenu: isElectronMac
            ? [
                {
                    label: escapeAmpersand(intl.formatMessage(menuMessages.newWindow)),
                    accelerator: "CmdOrCtrl+Shift+N",
                    click: () => createWindow_1.createWindow(),
                },
                {
                    role: "close",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.closeWindow)),
                },
            ]
            : [
                {
                    label: escapeAmpersand(intl.formatMessage(menuMessages.newWindow)),
                    accelerator: "CmdOrCtrl+Shift+N",
                    click: () => createWindow_1.createWindow(),
                },
                {
                    role: "quit",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.quit)),
                },
            ],
    };
    const editMenu = {
        role: "editMenu",
        label: escapeAmpersand(intl.formatMessage(menuMessages.editMenuTitle)),
        submenu: isElectronMac
            ? [
                {
                    role: "undo",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.undo)),
                },
                {
                    role: "redo",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.redo)),
                },
                { type: "separator" },
                {
                    role: "cut",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.cut)),
                },
                {
                    role: "copy",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.copy)),
                },
                {
                    role: "paste",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.paste)),
                },
                {
                    role: "selectAll",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.selectAll)),
                },
                { type: "separator" },
                {
                    label: escapeAmpersand(intl.formatMessage(menuMessages.speech)),
                    submenu: [
                        {
                            role: "startSpeaking",
                            label: escapeAmpersand(intl.formatMessage(menuMessages.startSpeaking)),
                        },
                        {
                            role: "stopSpeaking",
                            label: escapeAmpersand(intl.formatMessage(menuMessages.stopSpeaking)),
                        },
                    ],
                },
            ]
            : [
                {
                    role: "undo",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.undo)),
                },
                {
                    role: "redo",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.redo)),
                },
                { type: "separator" },
                {
                    role: "cut",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.cut)),
                },
                {
                    role: "copy",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.copy)),
                },
                {
                    role: "paste",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.paste)),
                },
                { type: "separator" },
                {
                    role: "selectAll",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.selectAll)),
                },
            ],
    };
    const viewMenu = {
        role: "viewMenu",
        label: escapeAmpersand(intl.formatMessage(menuMessages.viewMenuTitle)),
        submenu: [
            {
                label: escapeAmpersand(intl.formatMessage(menuMessages.reload)),
                accelerator: "CmdOrCtrl+R",
                click() {
                    const focusedWebContents = electron_1.webContents.getFocusedWebContents();
                    if (focusedWebContents) {
                        if (focusedWebContents.hostWebContents) {
                            for (const webContentsInstance of electron_1.webContents.getAllWebContents()) {
                                if (webContentsInstance.hostWebContents ===
                                    focusedWebContents.hostWebContents) {
                                    webContentsInstance.reload();
                                }
                            }
                        }
                        else {
                            focusedWebContents.reload();
                        }
                    }
                },
            },
            {
                label: escapeAmpersand(intl.formatMessage(menuMessages.toggleDevTools)),
                accelerator: isElectronMac ? "Alt+Command+I" : "Ctrl+Shift+I",
                click() {
                    let focusedWebContents = electron_1.webContents.getFocusedWebContents();
                    if (focusedWebContents) {
                        const focusedWebContentsUrl = focusedWebContents.getURL();
                        if (focusedWebContentsUrl.startsWith("file://") &&
                            focusedWebContentsUrl.endsWith("/search.html")) {
                            const notionWebviewWebContents = electron_1.webContents
                                .getAllWebContents()
                                .find(webContentsInstance => webContentsInstance.hostWebContents ===
                                focusedWebContents.hostWebContents &&
                                webContentsInstance !== focusedWebContents);
                            if (notionWebviewWebContents) {
                                focusedWebContents = notionWebviewWebContents;
                            }
                        }
                        focusedWebContents.toggleDevTools();
                    }
                },
            },
            {
                label: escapeAmpersand(intl.formatMessage(menuMessages.toggleWindowDevTools)),
                accelerator: isElectronMac ? "Shift+Alt+Command+I" : "Alt+Ctrl+Shift+I",
                visible: false,
                click(menuItem, focusedWindow) {
                    if (focusedWindow) {
                        focusedWindow.webContents.toggleDevTools();
                    }
                },
            },
            { type: "separator" },
            {
                role: "togglefullscreen",
                label: escapeAmpersand(intl.formatMessage(menuMessages.togglefullscreen)),
            },
        ],
    };
    const windowMenu = {
        role: "windowMenu",
        label: escapeAmpersand(intl.formatMessage(menuMessages.windowMenuTitle)),
        submenu: isElectronMac
            ? [
                {
                    role: "minimize",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.minimize)),
                },
                {
                    role: "zoom",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.zoom)),
                },
                { type: "separator" },
                {
                    role: "front",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.front)),
                },
            ]
            : [
                {
                    role: "minimize",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.minimize)),
                },
                {
                    label: escapeAmpersand(intl.formatMessage(menuMessages.maximize)),
                    click(item, focusedWindow) {
                        if (focusedWindow) {
                            if (focusedWindow.isMaximized()) {
                                focusedWindow.unmaximize();
                            }
                            else {
                                focusedWindow.maximize();
                            }
                        }
                    },
                },
                {
                    role: "close",
                    label: escapeAmpersand(intl.formatMessage(menuMessages.close)),
                },
            ],
    };
    const helpMenu = {
        role: "help",
        label: escapeAmpersand(intl.formatMessage(menuMessages.helpTitle)),
        submenu: [
            {
                label: escapeAmpersand(intl.formatMessage(menuMessages.help)),
                click() {
                    void electron_1.shell.openExternal(`${config_1.default.domainBaseUrl}/help`);
                },
            },
        ],
    };
    const appMenu = {
        role: "appMenu",
        submenu: [
            {
                role: "about",
                label: escapeAmpersand(intl.formatMessage(menuMessages.about)),
            },
            { type: "separator" },
            {
                label: escapeAmpersand(intl.formatMessage(menuMessages.reset)),
                async click(item, focusedWindow) {
                    await fs_extra_1.default.remove(electron_1.app.getPath("userData"));
                    electron_1.app.relaunch();
                    electron_1.app.exit();
                },
            },
            { type: "separator" },
            {
                role: "services",
                label: escapeAmpersand(intl.formatMessage(menuMessages.services)),
            },
            { type: "separator" },
            {
                role: "hide",
                label: escapeAmpersand(intl.formatMessage(menuMessages.hide)),
            },
            {
                role: "hideOthers",
                label: escapeAmpersand(intl.formatMessage(menuMessages.hideOthers)),
            },
            {
                role: "unhide",
                label: escapeAmpersand(intl.formatMessage(menuMessages.unhide)),
            },
            { type: "separator" },
            {
                role: "quit",
                label: escapeAmpersand(intl.formatMessage(menuMessages.quitMac)),
            },
        ],
    };
    const template = [
        fileMenu,
        editMenu,
        viewMenu,
        windowMenu,
        helpMenu,
    ];
    if (isElectronMac) {
        template.unshift(appMenu);
    }
    const menu = electron_1.Menu.buildFromTemplate(template);
    electron_1.Menu.setApplicationMenu(menu); return template;
}
exports.setupSystemMenu = setupSystemMenu;
//# sourceMappingURL=systemMenu.js.map

//notion-enhancer
require('notion-enhancer')('main/systemMenu', exports, (js) => eval(js))