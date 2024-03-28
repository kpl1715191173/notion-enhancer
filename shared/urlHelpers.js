"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryUrl = exports.getWorkspaceDomainFromHostname = exports.removeUrlFromString = exports.sanitizeUrlStrict = exports.sanitizeUrl = exports.addQueryParams = exports.removeQueryParam = exports.resolve = exports.replacePathname = exports.setBaseUrl = exports.isRelativeUrl = exports.removeBaseUrl = exports.makeUrl = exports.format = exports.parse = void 0;
const url_1 = __importDefault(require("url"));
function parse(str, args = {}) {
    try {
        return url_1.default.parse(str, true, args.slashesDenoteHost);
    }
    catch (err) {
        try {
            const result = url_1.default.parse(str);
            return Object.assign(Object.assign({}, result), { query: {} });
        }
        catch (err) {
            return url_1.default.parse("", true);
        }
    }
}
exports.parse = parse;
function format(args) {
    return url_1.default.format(args);
}
exports.format = format;
function makeUrl(args) {
    const parsed = parse(args.url);
    parsed.search = null;
    parsed.query = args.query || {};
    parsed.hash = args.hash || null;
    return format(parsed);
}
exports.makeUrl = makeUrl;
function removeBaseUrl(str) {
    const parsed = parse(str);
    parsed.protocol = null;
    parsed.host = null;
    parsed.hostname = null;
    parsed.slashes = false;
    return format(parsed);
}
exports.removeBaseUrl = removeBaseUrl;
function isRelativeUrl(relativeUrl) {
    const parsed = parse(relativeUrl);
    return Boolean(!parsed.host && !parsed.hostname);
}
exports.isRelativeUrl = isRelativeUrl;
function setBaseUrl(args) {
    const parsed = parse(args.relativeUrl);
    const baseUrlParsed = parse(args.baseUrl);
    parsed.protocol = baseUrlParsed.protocol;
    parsed.host = baseUrlParsed.host;
    parsed.hostname = baseUrlParsed.hostname;
    return format(parsed);
}
exports.setBaseUrl = setBaseUrl;
function replacePathname(args) {
    const parsed = parse(args.url);
    parsed.path = null;
    parsed.pathname = args.pathname;
    return format(parsed);
}
exports.replacePathname = replacePathname;
function resolve(baseUrl, pathname) {
    return replacePathname({ url: baseUrl, pathname });
}
exports.resolve = resolve;
function removeQueryParam(str, param) {
    const parsed = parse(str);
    parsed.search = null;
    delete parsed.query[param];
    return format(parsed);
}
exports.removeQueryParam = removeQueryParam;
function addQueryParams(str, query) {
    const parsed = parse(str);
    parsed.search = null;
    parsed.query = Object.assign(Object.assign({}, parsed.query), query);
    return format(parsed);
}
exports.addQueryParams = addQueryParams;
const hostBlacklist = {
    "thumpmagical.top": true,
    "geoloc8.com": true,
    "kutabminaj.top": true,
    "cutisbuhano.xyz": true,
    "bhapurimillat.xyz": true,
    "kingoffightermens.top": true,
    "boxgeneral.xyz": true,
    "ahnd.ga": true,
    "steptossmessage.top": true,
    "earthdiscover.xyz": true,
    "sopecasniteroi.com.br": true,
    "clangchapshop.xyz": true,
};
const allowedProtocols = ["http:", "https:", "mailto:", "itms-apps:", "tel:"];
function sanitizeUrl(args) {
    const { str, allowNoProtocol } = args;
    if (!str || typeof str !== "string") {
        return;
    }
    try {
        const parsed = parse(str);
        if (parsed.host && hostBlacklist[parsed.host]) {
            return;
        }
        if (parsed.protocol && parsed.host) {
            return sanitizeUrlStrict(str);
        }
        if (!parsed.protocol) {
            try {
                const { host } = new URL(`stub:${str}`);
                if (hostBlacklist[host]) {
                    return;
                }
            }
            catch (_a) { }
            try {
                const { host } = new URL(`stub://${str}`);
                if (hostBlacklist[host]) {
                    return;
                }
            }
            catch (_b) { }
        }
        if ((parsed.protocol && allowedProtocols.includes(parsed.protocol)) ||
            (allowNoProtocol && !parsed.protocol)) {
            return str;
        }
    }
    catch (err) {
        return;
    }
}
exports.sanitizeUrl = sanitizeUrl;
function sanitizeUrlStrict(url) {
    if (!url) {
        return;
    }
    try {
        const parsed = new URL(url);
        if (hostBlacklist[parsed.host]) {
            return;
        }
        if (allowedProtocols.includes(parsed.protocol)) {
            return parsed.href;
        }
    }
    catch (_a) { }
}
exports.sanitizeUrlStrict = sanitizeUrlStrict;
function removeUrlFromString(str) {
    return (str || "").replace(/(?:https?|ftp):\/\/[\n\S]+/g, "");
}
exports.removeUrlFromString = removeUrlFromString;
function getWorkspaceDomainFromHostname({ publicDomainName }, hostname) {
    const publicSuffixes = Array.from(new Set([publicDomainName, publicDomainName.split(":")[0]]).values());
    for (const suffix of publicSuffixes) {
        if (hostname.endsWith(`.${suffix}`)) {
            return hostname.substring(0, hostname.length - suffix.length - 1);
        }
    }
}
exports.getWorkspaceDomainFromHostname = getWorkspaceDomainFromHostname;
function tryUrl(url) {
    try {
        return new URL(url);
    }
    catch (_a) {
        return undefined;
    }
}
exports.tryUrl = tryUrl;
//# sourceMappingURL=urlHelpers.js.map

//notion-enhancer
require('notion-enhancer')('shared/urlHelpers', exports, (js) => eval(js))