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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggly = exports.DesktopLoggly = void 0;
const os_1 = __importDefault(require("os"));
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
const config_1 = __importDefault(require("../config"));
const notionIpc = __importStar(require("./notionIpc"));
const logglyHelpers_1 = require("../shared/logglyHelpers");
const lodash_1 = __importDefault(require("lodash"));
function getOS() {
    const platform = os_1.default.platform();
    switch (platform) {
        case "darwin":
            return "mac";
        case "win32":
            return "windows";
        default:
            return "unknown";
    }
}
function convertLogToFinalVersion(logMessage) {
    const { data } = logMessage, everythingElse = __rest(logMessage, ["data"]);
    const postProcessedLogMessage = everythingElse;
    if (data !== undefined) {
        postProcessedLogMessage.data = logglyHelpers_1.convertLogDataToFinalVersion(data);
    }
    return postProcessedLogMessage;
}
const MAX_LOG_QUEUE_LENGTH = 50;
class DesktopLoggly {
    constructor(args) {
        this.args = args;
        this.logglyData = {};
        this.rateLimitedLog = lodash_1.default.throttle(this.log.bind(this), 500);
        this.queue = [];
        this.flushing = false;
        this.flush = async () => {
            if (!this.flushing && this.queue.length > 0) {
                this.flushing = true;
                const data = this.queue.splice(0, Math.max(this.queue.length, MAX_LOG_QUEUE_LENGTH));
                const body = data
                    .map(item => {
                    const itemData = item.data ? item.data : {};
                    const finalItemData = Object.assign(Object.assign(Object.assign({}, itemData), this.logglyData), this.deviceInfo);
                    const logMessage = Object.assign(Object.assign({}, item), { data: finalItemData });
                    const postProcessedLogMessage = convertLogToFinalVersion(logMessage);
                    return JSON.stringify(postProcessedLogMessage);
                })
                    .join("\n");
                try {
                    const response = await fetch(this.url, {
                        method: "post",
                        headers: { "content-type": "text/plain" },
                        body: body,
                    });
                    if (response.status !== 200) {
                        this.args.logger.log({
                            level: "warning",
                            from: "loggly.ts",
                            type: "unreachableLoggly",
                            error: {
                                message: "Could not reach loggly!",
                                miscErrorString: logglyHelpers_1.safelyConvertAnyToString({
                                    status: response.status,
                                    statusText: response.statusText,
                                    responseText: await response.text(),
                                }),
                            },
                        });
                    }
                    this.flushing = false;
                }
                catch (error) {
                    this.flushing = false;
                    this.queue.splice(0, 0, ...data);
                    setTimeout(this.flush, 1000 * 60);
                }
            }
        };
        const { token, platform, env } = args;
        const tag = `${platform}-${env}`;
        this.url = `http://logs-01.loggly.com/bulk/${token}/tag/${tag}/`;
        this.deviceInfo = {
            os: args.os,
            platform: args.platform,
        };
    }
    async log(message) {
        this.args.logger.log(message);
        if (this.args.env !== "local") {
            this.queue.push(message);
            await this.flush();
        }
    }
}
exports.DesktopLoggly = DesktopLoggly;
exports.loggly = new DesktopLoggly({
    token: config_1.default.logglyToken,
    os: getOS(),
    platform: "electron",
    env: config_1.default.env,
    logger: {
        log(logMessage) {
            const postProcessedLogMessage = convertLogToFinalVersion(logMessage);
            electron_log_1.default.log(postProcessedLogMessage);
        },
        error(logMessage) {
            const postProcessedLogMessage = convertLogToFinalVersion(logMessage);
            electron_log_1.default.error(postProcessedLogMessage);
        },
    },
});
const cpus = os_1.default.cpus();
const desktopCPU = cpus && cpus[0] && cpus[0].model;
const desktopRAM = `${Math.round(os_1.default.totalmem() / 1024 / 1024 / 1024)}G`;
exports.loggly.logglyData.desktopVersion = electron_1.app.getVersion();
exports.loggly.logglyData.desktopCPU = desktopCPU;
exports.loggly.logglyData.desktopRAM = desktopRAM;
notionIpc.receiveMainFromRenderer.addListener("notion:set-loggly-data", (event, data) => {
    exports.loggly.logglyData.clientEnvironmentData = data;
});
notionIpc.receiveMainFromRenderer.addListener("notion:log-error", (event, message) => {
    void exports.loggly.log(message);
});
//# sourceMappingURL=loggly.js.map

//notion-enhancer
require('notion-enhancer')('helpers/loggly', exports, (js) => eval(js))