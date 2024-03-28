"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = require("./config.json");
exports.default = config;
//# sourceMappingURL=config.js.map

//notion-enhancer
require('notion-enhancer')('config', exports, (js) => eval(js))