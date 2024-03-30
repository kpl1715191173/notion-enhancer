"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propertyOf = exports.isObject = exports.makeTypeGuard = exports.unreachable = exports.catchErrors = exports.unwrap = exports.SuccessOrFail = exports.nullableToUndefinable = exports.isDefined = exports.isNotNull = exports.arrayIncludes = exports.objectEntries = exports.objectKeys = void 0;
exports.objectKeys = Object.keys;
exports.objectEntries = Object.entries;
const arrayIncludes = (array, item) => array.includes(item);
exports.arrayIncludes = arrayIncludes;
function isNotNull(value) {
    return value !== null;
}
exports.isNotNull = isNotNull;
function isDefined(value) {
    if (value !== undefined) {
        return true;
    }
    return false;
}
exports.isDefined = isDefined;
function nullableToUndefinable(value) {
    return isNotNull(value) ? value : undefined;
}
exports.nullableToUndefinable = nullableToUndefinable;
exports.SuccessOrFail = {
    isSuccess(result) {
        return !("error" in result);
    },
    isFail(result) {
        return "error" in result;
    },
};
function unwrap(result) {
    if ("error" in result) {
        throw result.error;
    }
    else {
        return result.value;
    }
}
exports.unwrap = unwrap;
function isPromiseLike(value) {
    switch (typeof value) {
        case "undefined":
        case "string":
        case "bigint":
        case "symbol":
        case "boolean":
            return false;
        case "function":
        case "object":
            return Boolean(value && "then" in value && typeof value["then"] === "function");
    }
    return false;
}
function catchErrors(block) {
    try {
        const result = block();
        if (isPromiseLike(result)) {
            return Promise.resolve(result.then(value => ({ value }), error => ({ error })));
        }
        return { value: result };
    }
    catch (error) {
        return { error };
    }
}
exports.catchErrors = catchErrors;
function unreachable(never) {
    throw new Error(`Expected value to never occur: ${JSON.stringify(never)}`);
}
exports.unreachable = unreachable;
const makeTypeGuard = (typeGuard) => (value) => "true" in typeGuard(value);
exports.makeTypeGuard = makeTypeGuard;
function isObject(value) {
    return typeof value === "object" && value !== null;
}
exports.isObject = isObject;
function propertyOf(name) {
    return name.toString();
}
exports.propertyOf = propertyOf;
const DeprecatedAPI = Symbol("deprecated api name");
const UnsafeAPI = Symbol("abstracted api name");
const Info = Symbol("info message");
const Warning = Symbol("warning message");
//# sourceMappingURL=typeUtils.js.map

//notion-enhancer
require('notion-enhancer')('shared/typeUtils', exports, (js) => eval(js))