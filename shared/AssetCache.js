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
exports.AssetCache = void 0;
const urlHelpers = __importStar(require("./urlHelpers"));
const path_1 = __importDefault(require("path"));
const EventEmitterMap_1 = __importDefault(require("./EventEmitterMap"));
const AsyncQueue_1 = require("./AsyncQueue");
const mathUtils_1 = require("./mathUtils");
const logglyHelpers_1 = require("./logglyHelpers");
const electron_1 = require("electron");
const constants_1 = require("./constants");
const desktopLocaleHelpers_1 = require("./desktopLocaleHelpers");
class AssetCache {
    constructor(args) {
        this.args = args;
        this.queue = new AsyncQueue_1.AsyncQueue(1);
        this.events = new EventEmitterMap_1.default();
        this.appActive = true;
        this.lastAppStateChangeTime = 0;
        this.latestVersionFileName = "latestVersion.json";
        this.assetsJsonFileName = "assets.json";
        this.assetHeadersFileName = "headers.json";
        this.assetsDirName = "assets";
        this.assetCacheDirName = "notionAssetCache-v2";
        this.cacheDir = path_1.default.join(this.args.baseDir, this.assetCacheDirName);
        this.latestVersionPath = path_1.default.join(this.cacheDir, this.latestVersionFileName);
    }
    async handleRequest(req) {
        const urlPath = urlHelpers.parse(req.url).pathname || "/";
        const { logger } = this.args;
        if (!this.assetCacheState) {
            return;
        }
        let assetCacheState = this.assetCacheState;
        if (assetCacheState.assetsJson.proxyServerPathPrefixes.some(prefix => urlPath.startsWith(prefix))) {
            return;
        }
        const assetFile = assetCacheState.assetsJson.files.find(file => file.path === urlPath);
        if (assetFile) {
            const currentAssetsDir = this.getAssetsDir(assetCacheState.assetsJson.version);
            const absolutePath = path_1.default.join(currentAssetsDir, assetFile.path);
            logger.info({
                level: "info",
                from: "AssetCache",
                type: "performingFileRequest",
                data: {
                    absolutePath,
                    url: urlPath,
                },
            });
            return {
                absolutePath: absolutePath,
                headers: this.getHeaders(assetFile.path),
            };
        }
        await this.syncVersions();
        assetCacheState = this.assetCacheState;
        if (assetCacheState) {
            const currentAssetsDir = this.getAssetsDir(assetCacheState.assetsJson.version);
            let indexPath = assetCacheState.assetsJson.entry;
            if (assetCacheState.assetsJson.localeHtml) {
                const cookies = electron_1.session.fromPartition(constants_1.electronSessionPartition).cookies;
                const [localeCookie] = await cookies.get({ name: "notion_locale" });
                let locale = "en-US";
                if (localeCookie) {
                    locale = desktopLocaleHelpers_1.getLocaleFromCookie(localeCookie.value);
                }
                const localeIndexPath = assetCacheState.assetsJson.localeHtml[locale];
                if (localeIndexPath) {
                    indexPath = localeIndexPath;
                }
            }
            const indexAssetFile = assetCacheState.assetsJson.files.find(file => file.path === indexPath);
            if (indexAssetFile) {
                if (urlPath.includes(".")) {
                    this.args.loggly.rateLimitedLog({
                        level: "error",
                        from: "AssetCache",
                        type: "requestReturnedAsIndexV2",
                        data: {
                            url: urlPath,
                        },
                    });
                }
                const absolutePath = path_1.default.join(currentAssetsDir, indexAssetFile.path);
                logger.info({
                    level: "info",
                    from: "AssetCache",
                    type: "performingFileRequest2",
                    data: {
                        message: `Performing file request: ${urlPath}, abs path ${absolutePath}`,
                    },
                });
                return {
                    absolutePath: absolutePath,
                    headers: this.getHeaders(indexAssetFile.path),
                };
            }
        }
        this.args.loggly.rateLimitedLog({
            level: "error",
            from: "AssetCache",
            type: "cannotFindIndex",
            data: {
                url: urlPath,
            },
        });

    }
    initialize() {
        if (this.ready) {
            return this.ready;
        }
        this.ready = (async () => {
            const { logger } = this.args;
            logger.info({
                level: "info",
                from: "AssetCache",
                type: "latestVersionPath",
                data: {
                    message: `latestVersion.json path ${this.latestVersionPath}`,
                },
            });
            this.latestVersion = await this.loadJson(this.latestVersionPath);
            logger.info({
                level: "info",
                from: "AssetCache",
                type: "currentVersionLoaded",
                data: {
                    version: this.latestVersion && this.latestVersion.version,
                    hash: this.latestVersion && this.latestVersion.hash,
                },
            });
            await this.syncVersions();
            logger.info({
                level: "info",
                from: "AssetCache",
                type: "currentSyncedAssetsJson",
                data: {
                    version: this.assetCacheState && this.assetCacheState.assetsJson.version,
                },
            });
            await this.cleanOldVersions();
        })();
        return this.ready;
    }
    reset() {
        void this.queue.enqueue(async () => {
            this.assetCacheState = undefined;
            this.latestVersion = undefined;
            await this.cleanOldVersions();
            await this.checkForUpdatesNow();
        });
    }
    get version() {
        return this.latestVersion && this.latestVersion.version;
    }
    checkForUpdates() {
        return this.queue.enqueue(() => this.checkForUpdatesNow());
    }
    async checkForUpdatesNow() {
        const { logger, fs } = this.args;
        const checkForUpdatesNowStart = Date.now();
        logger.info({
            level: "info",
            from: "AssetCache",
            type: "checkingForAppUpdate",
        });
        this.events.emit("checking-for-update");
        const updateAssetsFetchStart = Date.now();
        const assetCacheState = this.assetCacheState;
        const hash = (this.latestVersion && this.latestVersion.hash) ||
            (assetCacheState && assetCacheState.assetsJson.hash) ||
            "";
        let response;
        try {
            response = await fetch(urlHelpers.resolve(this.args.baseUrl, "/api/v3/getAssetsJsonV2"), {
                method: "post",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ hash: hash }),
            });
        }
        catch (error) {
            logger.info({
                level: "info",
                from: "AssetCache",
                type: "noAppUpdateAvailable",
            });
            this.events.emit("update-not-available");
            return;
        }
        if (response.status !== 200) {
            const error = new Error(`${response.status}: ${response.statusText}`);
            this.args.logger.log({
                level: "error",
                from: "assetCache",
                type: "Non200Response",
                error: logglyHelpers_1.convertErrorToLog(error),
                data: Object.assign({}, this.createErrorDataMetrics(updateAssetsFetchStart)),
            });
            this.events.emit("error", error);
            return;
        }
        this.logPerformance("updateAssetsFetch", updateAssetsFetchStart);
        const updateAssetsResponseParseStart = Date.now();
        let newAssetsJson;
        try {
            newAssetsJson = await response.json();
        }
        catch (error) {
            this.args.logger.log({
                level: "error",
                from: "assetCache",
                type: "parseError",
                error: logglyHelpers_1.convertErrorToLog(error),
                data: Object.assign({}, this.createErrorDataMetrics(updateAssetsResponseParseStart)),
            });
            this.events.emit("error", error);
            return;
        }
        this.logPerformance("updateAssetsResponseParse", updateAssetsResponseParseStart);
        const assetJsonStart = Date.now();
        if (!("version" in newAssetsJson) ||
            (this.latestVersion &&
                this.latestVersion.version === newAssetsJson.version)) {
            logger.info({
                level: "info",
                from: "AssetCache",
                type: "noAppUpdateAvailable2",
            });
            this.events.emit("update-not-available");
            return;
        }
        logger.info({
            level: "info",
            from: "AssetCache",
            type: "appUpdateAvailable",
            data: {
                version: newAssetsJson.version,
            },
        });
        this.events.emit("update-available", newAssetsJson);
        const newAssetHeaders = {};
        const newCacheDir = this.getCacheDir(newAssetsJson.version);
        const newAssetsDir = this.getAssetsDir(newAssetsJson.version);
        const newAssetsJsonPath = this.getAssetsJsonPath(newAssetsJson.version);
        const newAssetHeadersPath = this.getAssetHeadersPath(newAssetsJson.version);
        const newCacheDirExists = await this.directoryExists(newCacheDir);
        const copiedFilePaths = new Set();
        if (!newCacheDirExists) {
            try {
                await fs.mkdirp(newCacheDir);
            }
            catch (error) {
                this.args.logger.log({
                    level: "error",
                    from: "assetCache",
                    type: "mkdirpError",
                    error: logglyHelpers_1.convertErrorToLog(error),
                    data: Object.assign({}, this.createErrorDataMetrics(assetJsonStart)),
                });
                this.events.emit("error", error);
                return;
            }
            if (assetCacheState) {
                const currentAssetsJson = assetCacheState.assetsJson;
                const currentAssetHeaders = assetCacheState.assetHeaders;
                const currentAssetsSet = new Set(currentAssetsJson.files.map(assetFile => assetFile.path));
                const filesWithSameFilePaths = newAssetsJson.files.filter(file => currentAssetsSet.has(file.path));
                const currentCacheDir = this.getCacheDir(currentAssetsJson.version);
                const currentAssetsDir = path_1.default.join(currentCacheDir, this.assetsDirName);
                for (const file of filesWithSameFilePaths) {
                    const matchedPath = file.path;
                    const currentAssetPath = path_1.default.join(currentAssetsDir, matchedPath);
                    const newAssetPath = path_1.default.join(newAssetsDir, matchedPath);
                    newAssetHeaders[matchedPath] = currentAssetHeaders[matchedPath];
                    try {
                        await fs.copy({ src: currentAssetPath, dest: newAssetPath });
                        copiedFilePaths.add(matchedPath);
                    }
                    catch (error) {
                        this.args.logger.log({
                            level: "error",
                            from: "assetCache",
                            type: "mkdirpError",
                            error: logglyHelpers_1.convertErrorToLog(error),
                            data: Object.assign({}, this.createErrorDataMetrics(assetJsonStart)),
                        });
                    }
                }
            }
        }
        let lastEmitTime = 0;
        let downloaded = 0;
        const total = newAssetsJson.files.length;
        const emit = () => {
            const emitTime = Date.now();
            if (downloaded === 0 ||
                downloaded === total ||
                emitTime >= lastEmitTime + 5000) {
                lastEmitTime = emitTime;
                this.events.emit("download-progress", {
                    downloaded: downloaded,
                    total: total,
                });
            }
        };
        emit();
        this.logPerformance("assetJson", assetJsonStart);
        const prepareStart = Date.now();
        const queue = new AsyncQueue_1.AsyncQueue(8);
        const errors = [];
        await Promise.all(newAssetsJson.files.map(file => {
            return queue.enqueue(async () => {
                if (copiedFilePaths.has(file.path) &&
                    (await this.verifyAsset(newAssetsDir, file))) {
                    downloaded++;
                    emit();
                    return;
                }
                const newAssetPath = path_1.default.join(newAssetsDir, file.path);
                try {
                    const headers = await this.args.fs.downloadFile({
                        url: urlHelpers.resolve(this.args.baseUrl, file.path),
                        dest: newAssetPath,
                    });
                    newAssetHeaders[file.path] = headers;
                    const newAssetIsValid = await this.verifyAsset(newAssetsDir, file);
                    if (newAssetIsValid) {
                        downloaded++;
                        emit();
                    }
                    else {
                        const error = new Error("Invalid asset hash");
                        error["data"] = { filePath: file.path };
                        errors.push(error);
                    }
                }
                catch (err) {
                    err["data"] = { filePath: file.path };
                    errors.push(err);
                }
            });
        }));
        this.logPerformance("prepare", prepareStart);
        const downloadStart = Date.now();
        if (errors.length > 0) {
            this.args.logger.log({
                level: "error",
                from: "assetCache",
                type: "downloadError",
                error: {
                    message: "found errors",
                    miscErrorString: logglyHelpers_1.safelyConvertAnyToString({
                        errors: errors.slice(0, 100),
                    }),
                },
                data: Object.assign({}, this.createErrorDataMetrics(assetJsonStart)),
            });
            this.events.emit("error", errors[0]);
            return;
        }
        const headersWriteSuccessful = await this.writeJson(newAssetHeadersPath, newAssetHeaders);
        if (!headersWriteSuccessful) {
            this.events.emit("error", new Error("Cannot write headers.json"));
            return;
        }
        const assetsJsonWriteSuccessful = await this.writeJson(newAssetsJsonPath, newAssetsJson);
        if (!assetsJsonWriteSuccessful) {
            this.events.emit("error", new Error("Cannot write assets.json"));
            return;
        }
        const newLatestVersion = {
            version: newAssetsJson.version,
            hash: newAssetsJson.hash,
        };
        const latestVersionWriteSuccessful = await this.writeJson(this.latestVersionPath, newLatestVersion);
        if (!latestVersionWriteSuccessful) {
            this.events.emit("error", new Error("Cannot write latestVersion.json"));
            return;
        }
        this.latestVersion = newLatestVersion;
        this.args.logger.info({
            level: "info",
            from: "AssetCache",
            type: "checkingForAppUpdate2",
        });
        this.args.logger.info({
            level: "info",
            from: "AssetCache",
            type: "appUpdateDownloadComplete",
            data: {
                version: newAssetsJson.version,
            },
        });
        this.events.emit("update-downloaded", newAssetsJson);
        this.args.logger.info({
            level: "info",
            from: "AssetCache",
            type: "installingAppUpdate",
            data: {
                version: newAssetsJson.version,
            },
        });
        this.events.emit("update-finished", newAssetsJson);
        this.logPerformance("download", downloadStart);
        this.logPerformance("checkForUpdatesNow", checkForUpdatesNowStart);
    }
    updateAppState(appActive, lastAppStateChangeTime) {
        this.appActive = appActive;
        this.lastAppStateChangeTime = lastAppStateChangeTime;
    }
    logPerformance(type, start) {
        const end = Date.now();
        if (!this.appActive || start < this.lastAppStateChangeTime) {
            return;
        }
        if (mathUtils_1.randomlySucceedWithPercentage(1)) {
            this.args.logger.log({
                level: "info",
                from: "assetCache",
                type: type,
                data: {
                    duration: end - start,
                },
            });
        }
    }
    createErrorDataMetrics(start) {
        const end = Date.now();
        if (!this.appActive || start < this.lastAppStateChangeTime) {
            return {};
        }
        return {
            duration: end - start,
        };
    }
    async syncVersions() {
        const { logger } = this.args;
        if (!this.latestVersion) {
            logger.info({
                level: "info",
                from: "AssetCache",
                type: "syncVersionEmptyLatestVersion",
            });
            return;
        }
        if (this.assetCacheState &&
            this.latestVersion.version === this.assetCacheState.assetsJson.version) {
            logger.info({
                level: "info",
                from: "AssetCache",
                type: "syncVersionSameSkippingSync",
            });
            return;
        }
        const assetsJsonPath = this.getAssetsJsonPath(this.latestVersion.version);
        const headersJsonPath = this.getAssetHeadersPath(this.latestVersion.version);
        logger.info({
            level: "info",
            from: "AssetCache",
            type: "syncVersions",
            data: {
                message: `Sync versions: assets.json path ${assetsJsonPath} headers.json path ${headersJsonPath}`,
            },
        });
        const assetsJson = await this.loadJson(assetsJsonPath);
        const assetHeaders = await this.loadJson(headersJsonPath);
        if (assetsJson && assetHeaders) {
            this.assetCacheState = { assetsJson, assetHeaders };
        }
    }
    async cleanOldVersions() {
        let subpathsToDelete = await this.readDir(this.cacheDir);
        if (this.assetCacheState && this.latestVersion) {
            const assetCacheState = this.assetCacheState;
            const latestVersion = this.latestVersion.version;
            subpathsToDelete = subpathsToDelete.filter(subpath => subpath !== this.latestVersionFileName &&
                subpath !== assetCacheState.assetsJson.version &&
                subpath !== latestVersion);
        }
        await Promise.all(subpathsToDelete.map(async (subpath) => this.remove(this.getCacheDir(subpath))));
    }
    async verifyAsset(assetDir, file) {
        const filePath = path_1.default.join(assetDir, file.path);
        const hash = await this.getFileHash(filePath);
        if (hash !== file.hash) {
            return false;
        }
        return true;
    }
    getHeaders(assetSubpath) {
        const assetCacheState = this.assetCacheState;
        if (!assetCacheState) {
            return {};
        }
        const headers = assetCacheState.assetHeaders[assetSubpath];
        if (!headers) {
            return {};
        }
        const lowerCaseHeaders = {};
        for (const key in headers) {
            lowerCaseHeaders[key.toLowerCase()] = headers[key];
        }
        const filteredHeaders = {};
        const headersWhitelist = assetCacheState.assetsJson.headersWhitelist;
        for (const key of headersWhitelist) {
            const lowerCaseKey = key.toLowerCase();
            if (lowerCaseHeaders[lowerCaseKey]) {
                filteredHeaders[lowerCaseKey] = lowerCaseHeaders[lowerCaseKey];
            }
        }
        return filteredHeaders;
    }
    async loadJson(absolutePath) {
        try {
            const contents = await this.args.fs.readFile(absolutePath);
            return JSON.parse(contents);
        }
        catch (error) {
            this.args.logger.info({
                level: "info",
                from: "AssetCache",
                type: "errorReadingPath",
                error: logglyHelpers_1.convertErrorToLog(error),
                data: {
                    message: `Error reading ${absolutePath}`,
                },
            });
        }
    }
    async writeJson(absolutePath, contents) {
        try {
            if (contents === undefined) {
                await this.args.fs.remove(absolutePath);
            }
            else {
                await this.args.fs.writeFile(absolutePath, JSON.stringify(contents));
            }
            return true;
        }
        catch (error) {
            const sanitizedError = logglyHelpers_1.convertErrorToLog(error);
            sanitizedError.miscDataString = logglyHelpers_1.safelyConvertAnyToString({
                absolutePath,
            });
            this.args.loggly.log({
                level: "error",
                from: "AssetCache",
                type: "failedToWriteFile",
                error: sanitizedError,
            });
            return false;
        }
    }
    getCacheDir(subpath) {
        return path_1.default.join(this.cacheDir, subpath);
    }
    getAssetsDir(version) {
        return path_1.default.join(this.getCacheDir(version), this.assetsDirName);
    }
    getAssetsJsonPath(version) {
        return path_1.default.join(this.getCacheDir(version), this.assetsJsonFileName);
    }
    getAssetHeadersPath(version) {
        return path_1.default.join(this.getCacheDir(version), this.assetHeadersFileName);
    }
    async directoryExists(dir) {
        try {
            return await this.args.fs.isDirectory(dir);
        }
        catch (error) {
            return false;
        }
    }
    async readDir(dirPath) {
        try {
            const results = await this.args.fs.readdir(dirPath);
            return results;
        }
        catch (error) {
            return [];
        }
    }
    async remove(dirOrFilePath) {
        try {
            await this.args.fs.remove(dirOrFilePath);
        }
        catch (error) { }
    }
    async getFileHash(filePath) {
        try {
            const hash = await this.args.fs.getFileHash(filePath);
            return hash;
        }
        catch (error) { }
    }
}
exports.AssetCache = AssetCache;
//# sourceMappingURL=AssetCache.js.map

//notion-enhancer
require('notion-enhancer')('shared/AssetCache', exports, (js) => eval(js))
