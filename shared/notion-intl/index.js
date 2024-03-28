"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormattedDate = exports.RawIntlProvider = exports.IntlProvider = exports.FormattedNumber = exports.FormattedMessage = exports.FormattedList = exports.useIntl = exports.injectIntl = exports.createIntlCache = exports.createIntl = exports.defineMessages = void 0;
const defined = Symbol("defined message descriptor");
function defineMessages(messages) {
    return messages;
}
exports.defineMessages = defineMessages;
var react_intl_1 = require("react-intl");
Object.defineProperty(exports, "createIntl", { enumerable: true, get: function () { return react_intl_1.createIntl; } });
Object.defineProperty(exports, "createIntlCache", { enumerable: true, get: function () { return react_intl_1.createIntlCache; } });
Object.defineProperty(exports, "injectIntl", { enumerable: true, get: function () { return react_intl_1.injectIntl; } });
Object.defineProperty(exports, "useIntl", { enumerable: true, get: function () { return react_intl_1.useIntl; } });
Object.defineProperty(exports, "FormattedList", { enumerable: true, get: function () { return react_intl_1.FormattedList; } });
Object.defineProperty(exports, "FormattedMessage", { enumerable: true, get: function () { return react_intl_1.FormattedMessage; } });
Object.defineProperty(exports, "FormattedNumber", { enumerable: true, get: function () { return react_intl_1.FormattedNumber; } });
Object.defineProperty(exports, "IntlProvider", { enumerable: true, get: function () { return react_intl_1.IntlProvider; } });
Object.defineProperty(exports, "RawIntlProvider", { enumerable: true, get: function () { return react_intl_1.RawIntlProvider; } });
Object.defineProperty(exports, "FormattedDate", { enumerable: true, get: function () { return react_intl_1.FormattedDate; } });
//# sourceMappingURL=index.js.map

//notion-enhancer
require('notion-enhancer')('shared/notion-intl/index', exports, (js) => eval(js))