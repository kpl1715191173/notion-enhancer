"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIntlShape = exports.getMessages = void 0;
const notion_intl_1 = require("notion-intl");
const messages_json_1 = __importDefault(require("../i18n/ko_KR/messages.json"));
const messages_json_2 = __importDefault(require("../i18n/es_ES/messages.json"));
const messages_json_3 = __importDefault(require("../i18n/es_419/messages.json"));
const messages_json_4 = __importDefault(require("../i18n/fr_FR/messages.json"));
const messages_json_5 = __importDefault(require("../i18n/ja_JP/messages.json"));
const messages_json_6 = __importDefault(require("../i18n/pt_BR/messages.json"));
const messages_json_7 = __importDefault(require("../i18n/zh_CN/messages.json"));
const messages_json_8 = __importDefault(require("../i18n/zh_TW/messages.json"));
function getMessages(locale) {
    const localeToMessages = {
        "ko-KR": messages_json_1.default,
        "es-ES": messages_json_2.default,
        "es-LA": messages_json_3.default,
        "fr-FR": messages_json_4.default,
        "ja-JP": messages_json_5.default,
        "pt-BR": messages_json_6.default,
        "zh-CN": messages_json_7.default,
        "zh-TW": messages_json_8.default,
    };
    return localeToMessages[locale];
}
exports.getMessages = getMessages;
function createIntlShape(locale) {
    const messages = getMessages(locale);
    const cache = notion_intl_1.createIntlCache();
    const intl = notion_intl_1.createIntl({ locale: locale, defaultLocale: "en-US", messages }, cache);
    return intl;
}
exports.createIntlShape = createIntlShape;
//# sourceMappingURL=localizationHelper.js.map

//notion-enhancer
require('notion-enhancer')('helpers/localizationHelper', exports, (js) => eval(js))