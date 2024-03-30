"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function asyncThrottle(fn) {
    let runningPromise;
    let queuedPromise;
    let nextArgs;
    return async (...args) => {
        if (runningPromise) {
            nextArgs = args;
            if (queuedPromise) {
                return queuedPromise;
            }
            else {
                queuedPromise = runningPromise.then(() => {
                    queuedPromise = undefined;
                    runningPromise = fn(...nextArgs);
                    return runningPromise;
                });
                return queuedPromise;
            }
        }
        else {
            runningPromise = fn(...args);
            return runningPromise;
        }
    };
}
exports.default = asyncThrottle;
//# sourceMappingURL=asyncThrottle.js.map

//notion-enhancer
require('notion-enhancer')('shared/asyncThrottle', exports, (js) => eval(js))