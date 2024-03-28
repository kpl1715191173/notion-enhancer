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
exports.createPopup = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../config"));
const notionIpc = __importStar(require("../helpers/notionIpc"));
const urlHelpers = __importStar(require("../shared/urlHelpers"));
const constants_1 = require("../shared/constants");
function createPopup(args) {
    const { url, title, width, height } = args;
    const rect = {
        x: undefined,
        y: undefined,
        width: width,
        height: height,
    };
    const focusedWindow = electron_1.BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        const [winX, winY] = focusedWindow.getPosition();
        const [winWidth, winHeight] = focusedWindow.getSize();
        rect.x = Math.round(winX + winWidth / 2 - width / 2);
        rect.y = Math.round(winY + winHeight / 2 - height / 2);
        rect.width = width;
        rect.height = height;
    }
    const baseURLDomain = urlHelpers.parse(config_1.default.domainBaseUrl).hostname;
    if (!baseURLDomain) {
        throw new Error("No base URL domain.");
    }
    const window = new electron_1.BrowserWindow(Object.assign(Object.assign({}, rect), { title: title, webPreferences: {
            preload: path_1.default.join(__dirname, "../renderer/popupPreload.js"),
            nodeIntegration: false,
            session: electron_1.session.fromPartition(constants_1.electronSessionPartition),
        } }));
    const handlePostMessage = (event, data) => {
        if (data && data.type === "popup-callback") {
            notionIpc.receiveMainFromRenderer.removeListener("notion:post-message", handlePostMessage);
            window.removeListener("close", handleClose);
            window.close();
            notionIpc.sendMainToNotion("notion:popup-callback", data.url);
        }
    };
    const handleClose = () => {
        notionIpc.receiveMainFromRenderer.removeListener("notion:post-message", handlePostMessage);
        window.removeListener("close", handleClose);
        notionIpc.sendMainToNotion("notion:popup-callback", undefined);
    };
    notionIpc.receiveMainFromRenderer.addListener("notion:post-message", handlePostMessage);
    window.addListener("close", handleClose);
    void window.loadURL(url);
}
exports.createPopup = createPopup;
//# sourceMappingURL=createPopup.js.map

//notion-enhancer
require('notion-enhancer')('main/createPopup', exports, (js) => eval(js))