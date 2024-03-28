"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonStore = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const electron_1 = __importDefault(require("electron"));
const path_1 = __importDefault(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
class JsonStore {
    constructor(name) {
        const userDataPath = electron_1.default.app.getPath("userData");
        this.filePath = path_1.default.join(userDataPath, `${name}.json`);
        this.loadSync();
    }
    get() {
        return this.data;
    }
    async set(value) {
        this.data = value;
        await this.save();
    }
    setSync(value) {
        this.data = value;
        this.saveSync();
    }
    async load() {
        try {
            this.data = await fs_extra_1.default.readJSON(this.filePath);
        }
        catch (error) {
            electron_log_1.default.info(`Error reading ${this.filePath}`, error);
        }
    }
    loadSync() {
        try {
            this.data = fs_extra_1.default.readJSONSync(this.filePath);
        }
        catch (error) {
            electron_log_1.default.info(`Error reading ${this.filePath}`, error);
        }
    }
    async save() {
        try {
            await fs_extra_1.default.writeJSON(this.filePath, this.data);
        }
        catch (error) {
            electron_log_1.default.info(`Error writing ${this.filePath}`, error);
        }
    }
    saveSync() {
        try {
            fs_extra_1.default.writeJSONSync(this.filePath, this.data);
        }
        catch (error) {
            electron_log_1.default.info(`Error writing ${this.filePath}`, error);
        }
    }
}
exports.JsonStore = JsonStore;
//# sourceMappingURL=JsonStore.js.map

//notion-enhancer
require('notion-enhancer')('main/JsonStore', exports, (js) => eval(js))