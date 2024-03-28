"use strict";
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchAsyncIterable = exports.Waitable = exports.timeAll = exports.retryTimeout = exports.raceWithTimeout = exports.requestTimeout = exports.deferred = exports.race = exports.timeoutResolve = exports.timeout = exports.allBatched = exports.batch = void 0;
const lodash_1 = __importDefault(require("lodash"));
const TimeSource_1 = require("./TimeSource");
function batch(tasks, batchSize, processTasks) {
    return new Promise((resolve, reject) => {
        let currentIndex = 0;
        const evalNext = () => {
            const currentTasks = lodash_1.default.slice(tasks, currentIndex, currentIndex + batchSize);
            currentIndex += batchSize;
            if (currentTasks.length > 0) {
                processTasks(currentTasks)
                    .then(() => {
                    setImmediate(evalNext);
                })
                    .catch(reject);
            }
            else {
                resolve();
            }
        };
        evalNext();
    });
}
exports.batch = batch;
async function allBatched(tasks, batchSize, createPromise) {
    const results = [];
    if (batchSize <= 0) {
        throw new Error(`Invalid batch size: ${batchSize}`);
    }
    let currentIndex = 0;
    while (currentIndex < tasks.length) {
        const currentTasks = tasks.slice(currentIndex, currentIndex + batchSize);
        currentIndex += batchSize;
        const values = await Promise.all(currentTasks.map(task => createPromise(task)));
        for (const value of values) {
            results.push(value);
        }
    }
    return results;
}
exports.allBatched = allBatched;
function timeout(time, timeSource = TimeSource_1.SYSTEM_TIME_SOURCE) {
    return new Promise(resolve => {
        timeSource.setTimeout(() => {
            resolve();
        }, time);
    });
}
exports.timeout = timeout;
function timeoutResolve(time, value) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(value);
        }, time);
    });
}
exports.timeoutResolve = timeoutResolve;
async function race(promises) {
    const defer = deferred();
    const rest = Promise.all(promises.map(async (promise, index) => {
        await promise;
        defer.resolve(index);
    }));
    const winner = await defer.promise;
    return { winner, rest };
}
exports.race = race;
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {
        resolve: resolve,
        reject: reject,
        promise,
    };
}
exports.deferred = deferred;
function requestTimeout(arg, time) {
    return new Promise((resolve, reject) => {
        void timeout(time).then(() => resolve({ result: undefined, timeout: true }));
        arg.then(result => resolve({ result, timeout: false })).catch(reject);
    });
}
exports.requestTimeout = requestTimeout;
async function raceWithTimeout(maxTimeoutMs, promises) {
    const promiseTimeout = deferred();
    const timerId = setTimeout(() => {
        promiseTimeout.resolve({ result: undefined, timeout: true });
    }, maxTimeoutMs);
    const firstResponse = await Promise.race([
        promiseTimeout.promise,
        Promise.race(promises).then(result => ({
            result,
            timeout: false,
        })),
    ]);
    clearTimeout(timerId);
    return firstResponse;
}
exports.raceWithTimeout = raceWithTimeout;
async function retryTimeout(tries, time, fn) {
    const result = await requestTimeout(fn(), time);
    if (tries <= 1 || !result.timeout) {
        return result;
    }
    return retryTimeout(tries - 1, time, fn);
}
exports.retryTimeout = retryTimeout;
const timeAll = async function (promises) {
    const start = Date.now();
    const mapped = promises.map(async (promise) => {
        if (promise) {
            await promise;
            return Date.now() - start;
        }
        else {
            return 0;
        }
    });
    return Promise.all(mapped);
};
exports.timeAll = timeAll;
class Waitable {
    constructor(timeSource = TimeSource_1.SYSTEM_TIME_SOURCE) {
        this.timeSource = timeSource;
        this.deferredPromise = deferred();
        this.isCompleted = false;
    }
    async wait(minDelay, maxDelay) {
        if (minDelay > 0) {
            await timeout(minDelay, this.timeSource);
        }
        const remainingDelay = maxDelay - minDelay;
        if (remainingDelay > 0) {
            await Promise.race([
                this.deferredPromise.promise,
                timeout(remainingDelay, this.timeSource),
            ]);
        }
        if (!this.isCompleted) {
            this.isCompleted = true;
            this.deferredPromise.resolve(undefined);
        }
    }
    trigger() {
        if (!this.isCompleted) {
            this.deferredPromise.resolve(undefined);
        }
        this.isCompleted = true;
    }
}
exports.Waitable = Waitable;
function batchAsyncIterable(maxConcurrency, input, transform) {
    return __asyncGenerator(this, arguments, function* batchAsyncIterable_1() {
        let batch = [];
        let inputIteratorDone = false;
        while (!inputIteratorDone) {
            while (batch.length < maxConcurrency) {
                const next = yield __await(input.next());
                const { value, done } = next;
                if (done === true) {
                    inputIteratorDone = true;
                    break;
                }
                batch.push(transform(value));
            }
            const completedTransforms = yield __await(Promise.all(batch));
            batch = [];
            for (const out of completedTransforms) {
                yield yield __await(out);
            }
        }
    });
}
exports.batchAsyncIterable = batchAsyncIterable;
//# sourceMappingURL=PromiseUtils.js.map

//notion-enhancer
require('notion-enhancer')('shared/PromiseUtils', exports, (js) => eval(js))