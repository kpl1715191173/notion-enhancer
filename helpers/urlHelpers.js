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
exports.getIndexUrl = void 0;
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../config"));
const schemeHelpers_1 = require("../shared/schemeHelpers");
const urlHelpers = __importStar(require("../shared/urlHelpers"));
function getIndexUrl(relativeUrl) {
    if (relativeUrl.startsWith("/")) {
        relativeUrl = relativeUrl.slice(1);
    }
    return urlHelpers.format({
        pathname: path_1.default.resolve(__dirname, "../renderer/index.html"),
        protocol: "file:",
        slashes: true,
        query: {
            path: `${schemeHelpers_1.getSchemeUrl({
                httpUrl: config_1.default.domainBaseUrl,
                protocol: config_1.default.protocol,
            })}/${relativeUrl}`,
        },
    });
}
exports.getIndexUrl = getIndexUrl;
//# sourceMappingURL=urlHelpers.js.map

//notion-enhancer
require('notion-enhancer')('helpers/urlHelpers', exports, (js) => eval(js))