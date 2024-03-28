"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EventEmitterMap {
    constructor() {
        this.listeners = {};
    }
    addListener(key, callback) {
        let set = this.listeners[key];
        if (!set) {
            set = new Set();
            this.listeners[key] = set;
        }
        set.add(callback);
    }
    addOnceListener(key, callback) {
        const wrappedCallback = (...args) => {
            this.removeListener(key, wrappedCallback);
            callback(...args);
        };
        this.addListener(key, wrappedCallback);
    }
    removeListener(key, callback) {
        const set = this.listeners[key];
        if (set) {
            set.delete(callback);
            if (set.size === 0) {
                delete this.listeners[key];
            }
        }
    }
    emit(key, ...args) {
        const set = this.listeners[key];
        if (set) {
            set.forEach(callback => callback(...args));
        }
    }
    listenerCount(key) {
        const set = this.listeners[key];
        if (set) {
            return set.size;
        }
        else {
            return 0;
        }
    }
}
exports.default = EventEmitterMap;
//# sourceMappingURL=EventEmitterMap.js.map

//notion-enhancer
require('notion-enhancer')('shared/EventEmitterMap', exports, (js) => eval(js))