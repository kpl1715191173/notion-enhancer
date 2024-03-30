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
exports.capture = exports.initialize = void 0;
const Sentry = __importStar(require("@sentry/electron"));
const config_1 = __importDefault(require("../config"));
const assetCache_1 = require("./assetCache");
function initialize(app) {
    if (config_1.default.env === "local") {
        return;
    }
    Sentry.init({
        dsn: "https://66b2079e34884cb5808c0b1fea463206@o324374.ingest.sentry.io/5701708",
        environment: config_1.default.env,
        release: app.getVersion(),
    });
    Sentry.configureScope(scope => {
        scope.setExtra("assetJsVersionAtLaunchTime", assetCache_1.assetCache.version);
    });
}
exports.initialize = initialize;
function capture(error) {
    if (config_1.default.env === "local") {
        return;
    }
    Sentry.captureException(error, {
        extra: {
            assetsJsVersionAtErrorTime: assetCache_1.assetCache.version,
        },
    });
}
exports.capture = capture;
//# sourceMappingURL=sentry.js.map

//notion-enhancer
require('notion-enhancer')('main/sentry', exports, (js) => eval(js))