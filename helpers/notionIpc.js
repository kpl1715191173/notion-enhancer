"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcast = exports.receiveIndexFromSearch = exports.receiveIndexFromNotion = exports.sendNotionToIndex = exports.sendSearchToIndex = exports.receiveSearchFromIndex = exports.sendIndexToSearch = exports.receiveNotionFromIndex = exports.sendIndexToNotion = exports.receiveMainFromRenderer = exports.sendToMainListeners = exports.addMainHandler = exports.invokeMainHandler = exports.proxyAllMainToNotion = exports.receiveNotionFromMain = exports.sendMainToNotionWindow = exports.sendMainToNotion = void 0;
const electron_1 = __importDefault(require("electron"));
function sendMainToNotion(eventName, ...args) {
    electron_1.default.BrowserWindow.getAllWindows().forEach(window => {
        sendMainToNotionWindow(window, eventName, ...args);
    });
}
exports.sendMainToNotion = sendMainToNotion;
function sendMainToNotionWindow(window, eventName, ...args) {
    window.webContents.send(eventName, ...args);
}
exports.sendMainToNotionWindow = sendMainToNotionWindow;
exports.receiveNotionFromMain = {
    addListener(eventName, fn) {
        electron_1.default.ipcRenderer.addListener(eventName, fn);
    },
    removeListener(eventName, fn) {
        electron_1.default.ipcRenderer.removeListener(eventName, fn);
    },
};
function proxyMainToNotion(notionWebView, eventName) {
    electron_1.default.ipcRenderer.addListener(eventName, (event, arg) => {
        electron_1.default.remote.webContents
            .fromId(notionWebView.getWebContentsId())
            .send(eventName, arg);
    });
}
const mainToNotionIpcMap = {
    "notion:update-error": true,
    "notion:checking-for-update": true,
    "notion:update-available": true,
    "notion:update-not-available": true,
    "notion:update-progress": true,
    "notion:update-ready": true,
    "notion:app-update-finished": true,
    "notion:app-update-error": true,
    "notion:checking-for-app-update": true,
    "notion:app-update-available": true,
    "notion:app-update-not-available": true,
    "notion:app-update-progress": true,
    "notion:app-update-ready": true,
    "notion:app-update-install": true,
    "notion:popup-callback": true,
    "notion:broadcast": true,
    "notion:google-drive-picker-callback": true,
    "notion:navigate-to-url": true,
    "notion:windows-backgrounded": true,
};
const mainToNotionIpcEvents = Object.keys(mainToNotionIpcMap);
function proxyAllMainToNotion(notionWebView) {
    for (const eventName of mainToNotionIpcEvents) {
        proxyMainToNotion(notionWebView, eventName);
    }
}
exports.proxyAllMainToNotion = proxyAllMainToNotion;
function invokeMainHandler(eventName, ...args) {
    return electron_1.default.ipcRenderer.invoke(eventName, ...args);
}
exports.invokeMainHandler = invokeMainHandler;
function addMainHandler(eventName, fn) {
    electron_1.default.ipcMain.handle(eventName, fn);
}
exports.addMainHandler = addMainHandler;
function sendToMainListeners(eventName, ...args) {
    electron_1.default.ipcRenderer.send(eventName, ...args);
}
exports.sendToMainListeners = sendToMainListeners;
exports.receiveMainFromRenderer = {
    addListener(eventName, fn) {
        electron_1.default.ipcMain.addListener(eventName, fn);
    },
    removeListener(eventName, fn) {
        electron_1.default.ipcMain.removeListener(eventName, fn);
    },
};
function sendIndexToNotion(notionWebView, eventName, ...args) {
    electron_1.default.remote.webContents
        .fromId(notionWebView.getWebContentsId())
        .send(eventName, ...args);
}
exports.sendIndexToNotion = sendIndexToNotion;
exports.receiveNotionFromIndex = {
    addListener(eventName, fn) {
        electron_1.default.ipcRenderer.addListener(eventName, fn);
    },
    removeListener(eventName, fn) {
        electron_1.default.ipcRenderer.removeListener(eventName, fn);
    },
};
function sendIndexToSearch(searchWebView, eventName, ...args) {
    electron_1.default.remote.webContents
        .fromId(searchWebView.getWebContentsId())
        .send(eventName, ...args);
}
exports.sendIndexToSearch = sendIndexToSearch;
exports.receiveSearchFromIndex = {
    addListener(eventName, fn) {
        electron_1.default.ipcRenderer.addListener(eventName, fn);
    },
    removeListener(eventName, fn) {
        electron_1.default.ipcRenderer.removeListener(eventName, fn);
    },
};
function sendSearchToIndex(eventName, ...args) {
    electron_1.default.ipcRenderer.sendToHost(eventName, ...args);
}
exports.sendSearchToIndex = sendSearchToIndex;
function sendNotionToIndex(eventName, ...args) {
    electron_1.default.ipcRenderer.sendToHost(eventName, ...args);
}
exports.sendNotionToIndex = sendNotionToIndex;
const receiveIndexFromNotionFnMap = new Map();
exports.receiveIndexFromNotion = {
    addListener(notionWebView, eventName, fn) {
        const listener = (event) => {
            if (event && event.channel === eventName) {
                const arg = event.args && event.args[0];
                fn(...[arg]);
            }
        };
        receiveIndexFromNotionFnMap.set(fn, listener);
        notionWebView.addEventListener("ipc-message", listener);
    },
    removeListener(notionWebView, eventName, fn) {
        const listener = receiveIndexFromNotionFnMap.get(fn);
        if (listener) {
            notionWebView.removeEventListener("ipc-message", listener);
            receiveIndexFromNotionFnMap.delete(fn);
        }
    },
};
const receiveIndexFromSearchFnMap = new Map();
exports.receiveIndexFromSearch = {
    addListener(searchWebView, eventName, fn) {
        const listener = (event) => {
            if (event && event.channel === eventName) {
                const arg = event.args && event.args[0];
                fn(...[arg]);
            }
        };
        receiveIndexFromSearchFnMap.set(fn, listener);
        searchWebView.addEventListener("ipc-message", listener);
    },
    removeListener(searchWebView, eventName, fn) {
        const listener = receiveIndexFromSearchFnMap.get(fn);
        if (listener) {
            searchWebView.removeEventListener("ipc-message", listener);
            receiveIndexFromSearchFnMap.delete(fn);
        }
    },
};
const broadcastListenerMap = new Map();
exports.broadcast = {
    emit(channel, ...args) {
        sendToMainListeners("notion:broadcast", {
            windowId: electron_1.default.remote.getCurrentWindow().id,
            channel: channel,
            args: args,
        });
    },
    addListener(channel, fn) {
        const callback = (sender, payload) => {
            if (payload.windowId !== electron_1.default.remote.getCurrentWindow().id &&
                payload.channel === channel) {
                fn(...payload.args);
            }
        };
        broadcastListenerMap.set(fn, callback);
        exports.receiveNotionFromMain.addListener("notion:broadcast", callback);
    },
    removeListener(eventName, fn) {
        const callback = broadcastListenerMap.get(fn);
        if (callback) {
            exports.receiveNotionFromMain.removeListener("notion:broadcast", callback);
            broadcastListenerMap.delete(fn);
        }
    },
};
//# sourceMappingURL=notionIpc.js.map

//notion-enhancer
require('notion-enhancer')('helpers/notionIpc', exports, (js) => eval(js))