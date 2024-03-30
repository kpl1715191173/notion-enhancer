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
const electron_1 = __importDefault(require("electron"));
const electron_log_1 = __importDefault(require("electron-log"));
const url_1 = __importDefault(require("url"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../config"));
const schemeHelpers_1 = require("../shared/schemeHelpers");
const notionIpc = __importStar(require("../helpers/notionIpc"));
const react_1 = __importDefault(require("react"));
const react_dom_1 = __importDefault(require("react-dom"));
const constants_1 = require("../shared/constants");
const notion_intl_1 = require("notion-intl");
const localizationHelper_1 = require("../helpers/localizationHelper");
const cleanObjectForSerialization_1 = require("../shared/cleanObjectForSerialization");
const desktopLocaleHelpers_1 = require("../shared/desktopLocaleHelpers");
const indexMessages = notion_intl_1.defineMessages({
    documentTitle: {
        id: "desktop.documentTitle",
        defaultMessage: "Notion Desktop",
    },
});
class Index extends react_1.default.PureComponent {
    constructor() {
        super(...arguments);
        this.state = {
            error: false,
            searching: false,
            searchingPeekView: false,
            zoomFactor: 1,
        };
        this.notionElm = null;
        this.handleNotionRef = (notionElm) => {
            this.notionElm = notionElm;
        };
        this.searchElm = null;
        this.handleSearchRef = (searchElm) => {
            this.searchElm = searchElm;
        };
        this.firstQuery = true;
        this.handleReload = () => {
            this.setState({ error: false });
            setTimeout(() => {
                if (this.notionElm) {
                    this.notionElm.reload();
                }
            }, 50);
        };
    }
    componentDidMount() {
        const searchElm = this.searchElm;
        const notionElm = this.notionElm;
        if (!searchElm || !notionElm) {
            return;
        }
        notionElm.addEventListener("did-fail-load", error => {
            electron_log_1.default.info("Failed to load:", cleanObjectForSerialization_1.cleanObjectForSerialization(error));
            if (error.errorCode === -3) {
                return;
            }
            if (!error.validatedURL.startsWith(schemeHelpers_1.getSchemeUrl({
                httpUrl: config_1.default.domainBaseUrl,
                protocol: config_1.default.protocol,
            }))) {
                return;
            }
            this.setState({ error: true });
        });
        notionIpc.receiveIndexFromNotion.addListener(notionElm, "search:start", isPeekView => {
            this.setState({
                searching: true,
                searchingPeekView: isPeekView,
            });
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            searchElm.focus();
            notionIpc.sendIndexToSearch(searchElm, "search:start");
            notionIpc.sendIndexToNotion(searchElm, "search:started");
        });
        notionIpc.receiveIndexFromNotion.addListener(notionElm, "search:stop", () => {
            notionIpc.sendIndexToSearch(searchElm, "search:reset");
            this.setState({
                searching: false,
            });
            this.firstQuery = true;
            electron_1.default.remote.webContents
                .fromId(notionElm.getWebContentsId())
                .stopFindInPage("clearSelection");
            notionIpc.sendIndexToNotion(notionElm, "search:stopped");
        });
        notionIpc.receiveIndexFromSearch.addListener(searchElm, "search:next", query => {
            electron_1.default.remote.webContents
                .fromId(notionElm.getWebContentsId())
                .findInPage(query, {
                forward: true,
                findNext: !this.firstQuery,
            });
            this.firstQuery = false;
        });
        notionIpc.receiveIndexFromSearch.addListener(searchElm, "search:prev", query => {
            electron_1.default.remote.webContents
                .fromId(notionElm.getWebContentsId())
                .findInPage(query, {
                forward: false,
                findNext: !this.firstQuery,
            });
            this.firstQuery = false;
        });
        notionIpc.receiveIndexFromSearch.addListener(searchElm, "search:clear", () => {
            this.firstQuery = true;
            electron_1.default.remote.webContents
                .fromId(notionElm.getWebContentsId())
                .stopFindInPage("clearSelection");
        });
        notionIpc.receiveIndexFromSearch.addListener(searchElm, "search:stop", () => {
            this.firstQuery = true;
            electron_1.default.remote.webContents
                .fromId(notionElm.getWebContentsId())
                .stopFindInPage("clearSelection");
            this.setState({ searching: false });
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            notionElm.focus();
            notionIpc.sendIndexToNotion(notionElm, "search:stopped");
        });
        notionElm.addEventListener("dom-ready", () => {
            electron_1.default.remote.webContents
                .fromId(notionElm.getWebContentsId())
                .addListener("found-in-page", (event, result) => {
                const matches = result
                    ? { count: result.matches, index: result.activeMatchOrdinal }
                    : { count: 0, index: 0 };
                notionIpc.sendIndexToSearch(searchElm, "search:result", matches);
            });
            notionIpc.proxyAllMainToNotion(notionElm);
        });
        notionIpc.receiveIndexFromNotion.addListener(notionElm, "search:set-theme", theme => {
            notionIpc.sendIndexToSearch(searchElm, "search:set-theme", theme);
        });
        notionIpc.receiveIndexFromNotion.addListener(notionElm, "zoom", zoomFactor => {
            electron_1.default.remote.webContents
                .fromId(notionElm.getWebContentsId())
                .setZoomFactor(zoomFactor);
            electron_1.default.remote.webContents
                .fromId(searchElm.getWebContentsId())
                .setZoomFactor(zoomFactor);
            this.setState({ zoomFactor });
        });
        let electronWindow;
        try {
            electronWindow = electron_1.default.remote.getCurrentWindow();
        }
        catch (error) {
            notionIpc.sendToMainListeners("notion:log-error", {
                level: "error",
                from: "index",
                type: "GetCurrentWindowError",
                error: {
                    message: error.message,
                },
            });
        }
        if (!electronWindow) {
            this.setState({ error: true });
            return;
        }
        electronWindow.on("focus", (e) => {
            notionElm.focus();
        });
        notionElm.addEventListener("dom-ready", function () {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            notionElm.blur();
            notionElm.focus();
        });
        electronWindow.addListener("app-command", (e, cmd) => {
            const webContents = electron_1.default.remote.webContents.fromId(notionElm.getWebContentsId());
            if (cmd === "browser-backward" && webContents.canGoBack()) {
                webContents.goBack();
            }
            else if (cmd === "browser-forward" && webContents.canGoForward()) {
                webContents.goForward();
            }
        });
        electronWindow.addListener("swipe", (e, dir) => {
            const webContents = electron_1.default.remote.webContents.fromId(notionElm.getWebContentsId());
            if (dir === "left" && webContents.canGoBack()) {
                webContents.goBack();
            }
            else if (dir === "right" && webContents.canGoForward()) {
                webContents.goForward();
            }
        });
        const sendFullScreenChangeEvent = () => {
            notionIpc.sendIndexToNotion(notionElm, "notion:full-screen-changed");
        };
        electronWindow.addListener("enter-full-screen", sendFullScreenChangeEvent);
        electronWindow.addListener("leave-full-screen", sendFullScreenChangeEvent);
        electronWindow.addListener("enter-html-full-screen", sendFullScreenChangeEvent);
        electronWindow.addListener("leave-html-full-screen", sendFullScreenChangeEvent);
    }
    renderSearchContainer() {
        return (react_1.default.createElement("div", { style: this.getSearchContainerStyle() },
            react_1.default.createElement("webview", { id: "search", style: this.getSearchWebviewStyle(), ref: this.handleSearchRef, partition: constants_1.electronSessionPartition, preload: `file://${path_1.default.join(__dirname, "search.js")}`, src: `file://${path_1.default.join(__dirname, "search.html")}`, webpreferences: "spellcheck=no, enableremotemodule=yes" })));
    }
    renderNotionContainer() {
        return (react_1.default.createElement("div", { style: this.getNotionContainerStyle() },
            react_1.default.createElement("webview", { id: "notion", style: Index.notionWebviewStyle, ref: this.handleNotionRef, partition: constants_1.electronSessionPartition, preload: `file://${path_1.default.join(__dirname, "preload.js")}`, src: this.props.notionUrl, webpreferences: "spellcheck=yes, enableremotemodule=yes" })));
    }
    renderErrorContainer() {
        return (react_1.default.createElement("div", { style: this.getErrorContainerStyle() },
            react_1.default.createElement("img", { style: Index.frontImageStyle, src: "./onboarding-offline.png" }),
            react_1.default.createElement("div", { style: Index.frontMessageStyle },
                react_1.default.createElement("div", null,
                    react_1.default.createElement(notion_intl_1.FormattedMessage, { id: "desktopLogin.offline.title", defaultMessage: "Welcome to <strong>Notion</strong>!", values: {
                            strong: (...chunks) => (react_1.default.createElement("strong", null, chunks)),
                        } })),
                react_1.default.createElement("div", null,
                    react_1.default.createElement(notion_intl_1.FormattedMessage, { id: "desktopLogin.offline.message", defaultMessage: "Connect to the internet to get started." }))),
            react_1.default.createElement("div", null,
                react_1.default.createElement("button", { style: Index.reloadButtonStyle, onClick: this.handleReload },
                    react_1.default.createElement(notion_intl_1.FormattedMessage, { id: "desktopLogin.offline.retryConnectingToInternetButton.label", defaultMessage: "Try again" })))));
    }
    renderDragRegion() {
        return react_1.default.createElement("div", { style: Index.dragRegionStyle });
    }
    render() {
        const locale = desktopLocaleHelpers_1.externalLocaleToNotionLocale(window.navigator.language, config_1.default.env === "production");
        const messages = localizationHelper_1.getMessages(locale);
        return (react_1.default.createElement(notion_intl_1.IntlProvider, { locale: locale, messages: messages },
            this.renderDragRegion(),
            this.renderNotionContainer(),
            this.renderSearchContainer(),
            this.renderErrorContainer()));
    }
    getNotionContainerStyle() {
        const style = {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: this.state.error ? "none" : "block",
        };
        return style;
    }
    getErrorContainerStyle() {
        const style = {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: this.state.error ? "flex" : "none",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            paddingBottom: "8vh",
        };
        return style;
    }
    getSearchWebviewStyle() {
        const style = {
            width: "100%",
            height: "100%",
            transition: "transform 70ms ease-in",
            transform: "translateY(-100%)",
            pointerEvents: "none",
        };
        if (this.state.searching) {
            style.transition = "transform 70ms ease-out";
            style.transform = "translateY(0%)";
            style.pointerEvents = "auto";
        }
        return style;
    }
    getSearchContainerStyle() {
        const style = {
            position: "fixed",
            overflow: "hidden",
            pointerEvents: "none",
            padding: "0 20px",
            top: (this.state.searchingPeekView
                ? 0
                : process.platform === "darwin"
                    ? 37
                    : 45) * this.state.zoomFactor,
            right: (48 - 24) * this.state.zoomFactor,
            width: 440 * this.state.zoomFactor,
            height: 72 * this.state.zoomFactor,
        };
        return style;
    }
}
Index.frontMessageStyle = {
    paddingTop: 16,
    paddingBottom: 16,
    textAlign: "center",
    lineHeight: 1.4,
    fontSize: 17,
    letterSpacing: "-0.01em",
    color: "#424241",
    fontWeight: 500,
};
Index.reloadButtonStyle = {
    background: "#fefaf8",
    border: "1px solid #f1cbca",
    boxSizing: "border-box",
    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.1)",
    borderRadius: 3,
    lineHeight: "normal",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "-0.03em",
    color: "#d8615c",
    paddingLeft: 12,
    paddingRight: 12,
    height: 36,
};
Index.frontImageStyle = {
    width: 300,
    maxWidth: "100%",
};
Index.notionWebviewStyle = {
    width: "100%",
    height: "100%",
};
Index.dragRegionStyle = {
    position: "absolute",
    zIndex: 9999,
    top: 0,
    left: 0,
    right: 0,
    height: 34,
    pointerEvents: "none",
    WebkitAppRegion: "drag",
};
window["openDevTools"] = () => {
    if (document) {
        const el = document.getElementById("notion");
        el.openDevTools();
    }
};
window["__start"] = () => {
    const parsed = url_1.default.parse(window.location.href, true);
    const notionUrl = parsed.query.path ||
        schemeHelpers_1.getSchemeUrl({ httpUrl: config_1.default.domainBaseUrl, protocol: config_1.default.protocol });
    parsed.search = null;
    parsed.query = {};
    const plainUrl = url_1.default.format(parsed);
    window.history.replaceState(undefined, undefined, plainUrl);
    const locale = desktopLocaleHelpers_1.externalLocaleToNotionLocale(window.navigator.language, config_1.default.env === "production");
    const intl = localizationHelper_1.createIntlShape(locale);
    document.title = intl.formatMessage(indexMessages.documentTitle);
    const rootElm = document.getElementById("root");
    react_dom_1.default.render(react_1.default.createElement(Index, { notionUrl: notionUrl }), rootElm);
};
function onUncaughtError(e) {
    notionIpc.sendToMainListeners("notion:log-error", {
        level: "error",
        from: "index",
        type: "RendererWindowError",
        error: {
            message: e.message,
        },
    });
}
function onPromiseRejection(e) {
    notionIpc.sendToMainListeners("notion:log-error", {
        level: "error",
        from: "index",
        type: "RendererWindowPromiseRejection",
        error: {
            message: e.reason,
        },
    });
}
window.addEventListener("error", onUncaughtError);
window.addEventListener("unhandledrejection", onPromiseRejection);
//# sourceMappingURL=index.js.map

//notion-enhancer
require('notion-enhancer')('renderer/index', exports, (js) => eval(js))