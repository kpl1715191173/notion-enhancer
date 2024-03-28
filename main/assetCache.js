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
exports.assetCache = void 0;
const electron_1 = __importDefault(require("electron"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
const AssetCache_1 = require("../shared/AssetCache");
const config_1 = __importDefault(require("../config"));
const loggly_1 = require("../helpers/loggly");
const notionIpc = __importStar(require("../helpers/notionIpc"));
const cleanObjectForSerialization_1 = require("../shared/cleanObjectForSerialization");
const constants_1 = require("../shared/constants");
exports.assetCache = new AssetCache_1.AssetCache({
    baseUrl: config_1.default.domainBaseUrl,
    baseDir: electron_1.default.app.getPath("userData"),
    tempDir: electron_1.default.app.getPath("temp"),
    logger: electron_log_1.default,
    loggly: loggly_1.loggly,
    fs: {
        async mkdirp(dirPath) {
            await fs_extra_1.default.mkdirp(dirPath);
        },
        async readdir(dirPath) {
            return fs_extra_1.default.readdir(dirPath);
        },
        async isDirectory(str) {
            const stat = await fs_extra_1.default.stat(str);
            return stat.isDirectory();
        },
        async isFile(str) {
            const stat = await fs_extra_1.default.stat(str);
            return stat.isFile();
        },
        async remove(str) {
            await fs_extra_1.default.remove(str);
        },
        async getFileHash(filePath) {
            const fileStream = fs_extra_1.default.createReadStream(filePath);
            const hash = crypto_1.default.createHash("md5");
            fileStream.on("data", data => hash.update(data));
            return new Promise((resolve, reject) => {
                fileStream.on("error", function (error) {
                    reject(error);
                });
                fileStream.on("end", function () {
                    resolve(hash.digest("hex"));
                });
            });
        },
        async downloadFile(args) {
            await fs_extra_1.default.mkdirp(path_1.default.parse(args.dest).dir);
            const req = electron_1.default.net.request({
                url: args.url,
                session: electron_1.default.session.fromPartition(constants_1.electronSessionPartition),
            });
            const write = fs_extra_1.default.createWriteStream(args.dest);
            const headers = {};
            req.on("response", function (response) {
                const { statusCode, statusMessage } = response;
                if ((statusCode < 200 || statusCode > 299) && statusCode !== 304) {
                    const error = new Error(`Response code ${statusCode} (${statusMessage})`);
                    req.emit("error", error);
                    return;
                }
                for (const [key, value] of Object.entries(response.headers)) {
                    if (typeof value === "string") {
                        headers[key] = value;
                    }
                    else if (Array.isArray(value) && value.length > 0) {
                        headers[key] = value.join(", ");
                    }
                }
                const stream = response;
                stream.pipe(write);
            });
            return new Promise((resolve, reject) => {
                req.on("error", reject);
                write.on("error", reject);
                write.on("finish", () => resolve(headers));
                req.end();
            });
        },
        async copy(args) {
            await fs_extra_1.default.copy(args.src, args.dest);
        },
        async move(args) {
            await fs_extra_1.default.move(args.src, args.dest);
        },
        async readFile(filePath) {
            return fs_extra_1.default.readFile(filePath, "utf8");
        },
        async writeFile(filePath, contents) {
            await fs_extra_1.default.writeFile(filePath, contents, "utf8");
        },
    },
});
exports.assetCache.events.addListener("error", error => {
    notionIpc.sendMainToNotion("notion:app-update-error", cleanObjectForSerialization_1.cleanObjectForSerialization(error));
});
exports.assetCache.events.addListener("checking-for-update", () => {
    notionIpc.sendMainToNotion("notion:checking-for-app-update");
});
exports.assetCache.events.addListener("update-available", info => {
    notionIpc.sendMainToNotion("notion:app-update-available", info);
});
exports.assetCache.events.addListener("update-not-available", () => {
    notionIpc.sendMainToNotion("notion:app-update-not-available");
});
exports.assetCache.events.addListener("download-progress", progress => {
    notionIpc.sendMainToNotion("notion:app-update-progress", progress);
});
exports.assetCache.events.addListener("update-downloaded", info => {
    notionIpc.sendMainToNotion("notion:app-update-ready", info);
});
exports.assetCache.events.addListener("update-finished", assets => {
    notionIpc.sendMainToNotion("notion:app-update-finished", assets);
});
notionIpc.receiveMainFromRenderer.addListener("notion:reset-app-cache", () => {
    void exports.assetCache.reset();
});
notionIpc.receiveMainFromRenderer.addListener("notion:check-for-app-updates", () => {
    void exports.assetCache.checkForUpdates();
});
const pollInterval = config_1.default.isLocalhost ? 10 * 1000 : 10 * 60 * 1000;
async function pollForAssetUpdates() {
    if (!config_1.default.isLocalhost || config_1.default.offline) {
        await exports.assetCache.checkForUpdates();
        setTimeout(pollForAssetUpdates, pollInterval);
    }
}
void pollForAssetUpdates();
//# sourceMappingURL=assetCache.js.map

//notion-enhancer
require('notion-enhancer')('main/assetCache', exports, (js) => eval(js))