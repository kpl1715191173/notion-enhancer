"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertLogDataToFinalVersion = exports.convertErrorToLog = exports.safelyConvertAnyToString = exports.trimActorDataForLogging = exports.isStringifiedLogglyMessage = exports.fromStringifiedLogglyMessage = exports.shouldLog = void 0;
const cleanObjectForSerialization_1 = require("./cleanObjectForSerialization");
const logLevelOrder = [
    "silent",
    "error",
    "warning",
    "info",
    "debug",
];
function shouldLog(args) {
    return (logLevelOrder.indexOf(args.messageLevel) <=
        logLevelOrder.indexOf(args.loggerLevel));
}
exports.shouldLog = shouldLog;
function fromStringifiedLogglyMessage(logglyMessage, jsonParse) {
    const { data, error } = logglyMessage, shared = __rest(logglyMessage, ["data", "error"]);
    const result = shared;
    if (data) {
        result.data = jsonParse(data.asJSON);
    }
    if (error) {
        const parsedJSON = error.asJSON ? jsonParse(error.asJSON) : {};
        result.error = Object.assign({ name: error.name, message: error.message, stack: error.stack }, parsedJSON);
    }
    return result;
}
exports.fromStringifiedLogglyMessage = fromStringifiedLogglyMessage;
function isStringifiedLogglyMessage(message) {
    return ((typeof message.data === "object" &&
        typeof message.data.asJSON === "string") ||
        (typeof message.error === "object" &&
            typeof message.error.asJSON === "string"));
}
exports.isStringifiedLogglyMessage = isStringifiedLogglyMessage;
function trimActorDataForLogging(actor) {
    if (actor === undefined) {
        return undefined;
    }
    const { table } = actor;
    const { id, email, parent_table, name, type } = actor.value;
    const actorForLogging = {
        id,
        table,
        email,
        parent_table,
        name,
        type,
    };
    Object.keys(actorForLogging).forEach(key => {
        if (actorForLogging[key] === undefined || actorForLogging[key] === null) {
            delete actorForLogging[key];
        }
    });
    return actorForLogging;
}
exports.trimActorDataForLogging = trimActorDataForLogging;
function safelyConvertAnyToString(toConvert, stringify = JSON.stringify) {
    try {
        if (typeof toConvert === "object" && toConvert !== null) {
            return stringify(cleanObjectForSerialization_1.cleanObjectForSerialization(toConvert, 10));
        }
        else {
            return String(toConvert);
        }
    }
    catch (e) {
        return `Unable to safely convert to string: "${e.stack ? e.stack : ""}"`;
    }
}
exports.safelyConvertAnyToString = safelyConvertAnyToString;
function convertErrorToLog(toConvert, stringify = JSON.stringify) {
    try {
        if (typeof toConvert === "object" && toConvert !== null) {
            const temp1 = toConvert;
            const { statusCode, name, message, data, error, stack, body, reason } = temp1;
            const result = {};
            if (statusCode) {
                result.statusCode = Number(statusCode);
            }
            if (name) {
                result.name = String(name);
            }
            if (message) {
                result.message = String(message);
            }
            if (reason && !result.message) {
                result.message = String(reason);
            }
            if (data) {
                result.miscDataString = safelyConvertAnyToString(data, stringify);
            }
            if (error) {
                result.miscErrorString = safelyConvertAnyToString(error, stringify);
            }
            if (stack) {
                result.stack = String(stack);
            }
            if (body) {
                result.body = {};
                if (typeof body === "object" && body !== null) {
                    const temp2 = body;
                    const { errorId, name, message, clientData } = temp2;
                    if (errorId) {
                        result.body.errorId = String(errorId);
                    }
                    if (name) {
                        result.body.name = String(name);
                    }
                    if (message) {
                        result.body.message = String(message);
                    }
                    if (clientData) {
                        result.body.clientDataString = safelyConvertAnyToString(clientData, stringify);
                    }
                }
                else {
                    result.body.message = safelyConvertAnyToString(body, stringify);
                }
            }
            return result;
        }
        else {
            return {
                miscErrorString: safelyConvertAnyToString(toConvert, stringify),
            };
        }
    }
    catch (e) {
        return {
            miscErrorString: `Unable to safely convert error to log: "${e.stack ? e.stack : ""}"`,
        };
    }
}
exports.convertErrorToLog = convertErrorToLog;
function convertLogDataToFinalVersion(data, stringify = JSON.stringify) {
    const { miscDataToConvertToString } = data, everythingElse = __rest(data, ["miscDataToConvertToString"]);
    const postProcessedData = everythingElse;
    if (miscDataToConvertToString !== undefined) {
        postProcessedData.miscDataString = safelyConvertAnyToString(miscDataToConvertToString, stringify);
    }
    return postProcessedData;
}
exports.convertLogDataToFinalVersion = convertLogDataToFinalVersion;
//# sourceMappingURL=logglyHelpers.js.map

//notion-enhancer
require('notion-enhancer')('shared/logglyHelpers', exports, (js) => eval(js))