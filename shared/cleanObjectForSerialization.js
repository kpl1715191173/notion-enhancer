"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanObjectForSerialization = void 0;
const lodash_1 = __importDefault(require("lodash"));
const nonEnumerableProperties = [
    "name",
    "message",
    "stack",
    "reason",
    "data",
    "info",
];
function cleanObjectForSerialization(object, depth = 10, cycles = new Set()) {
    if (lodash_1.default.isString(object) || lodash_1.default.isNumber(object) || lodash_1.default.isBoolean(object)) {
        return object;
    }
    if (lodash_1.default.isArray(object)) {
        if (cycles.has(object) || depth <= 0) {
            return [{ "@": "…" }];
        }
        cycles.add(object);
        return object.map(item => cleanObjectForSerialization(item, depth - 1, cycles));
    }
    if (lodash_1.default.isError(object) || lodash_1.default.isObjectLike(object)) {
        if (cycles.has(object) || depth <= 0) {
            return { "@": "…" };
        }
        cycles.add(object);
        const serialized = {};
        for (const key of Object.keys(object)) {
            if (serialized[key]) {
                continue;
            }
            if (typeof key === "string" && key.length > 0 && key[0] === "_") {
                serialized[key] = "[omitted]";
                continue;
            }
            const value = object[key];
            serialized[key] = cleanObjectForSerialization(value, depth - 1, cycles);
        }
        for (const key of nonEnumerableProperties) {
            if (serialized[key]) {
                continue;
            }
            const value = object[key];
            if (value) {
                serialized[key] = cleanObjectForSerialization(value, depth - 1, cycles);
            }
        }
        return serialized;
    }
}
exports.cleanObjectForSerialization = cleanObjectForSerialization;
//# sourceMappingURL=cleanObjectForSerialization.js.map

//notion-enhancer
require('notion-enhancer')('shared/cleanObjectForSerialization', exports, (js) => eval(js))