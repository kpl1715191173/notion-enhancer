"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocaleFromCookie = exports.externalLocaleToNotionLocale = exports.isDevelopmentShortLocale = exports.isPreferredShortLocale = exports.isPreferredLocaleOrigin = exports.isPreferredLocaleExtended = exports.isPreferredLocale = exports.isDevelopmentLocale = exports.isDevelopmentOnlyLocale = exports.VALID_PREFERRED_SHORT_LOCALES_IN_DEVELOPMENT = exports.VALID_PREFERRED_SHORT_LOCALES = exports.shortCodeToPreferredLocaleExtended = exports.countryToPreferredLocale = exports.preferredContentfulLocales = exports.VALID_PREFERRED_LOCALE_ROUTES_IN_DEVELOPMENT = exports.BETA_LOCALE_EXPERIMENTS = exports.VALID_PREFERRED_LOCALES_IN_BETA = exports.VALID_PREFERRED_LOCALES_IN_DEVELOPMENT = exports.VALID_PREFERRED_LOCALES = void 0;
exports.VALID_PREFERRED_LOCALES = ["en-US", "ko-KR", "ja-JP"];
exports.VALID_PREFERRED_LOCALES_IN_DEVELOPMENT = [
    "es-ES",
    "es-LA",
    "fr-FR",
    "pt-BR",
    "zh-CN",
    "zh-TW",
];
exports.VALID_PREFERRED_LOCALES_IN_BETA = ["fr-FR", "ja-JP"];
exports.BETA_LOCALE_EXPERIMENTS = {
    "fr-FR": "beta-language-french",
    "ja-JP": "beta-language-japanese",
};
exports.VALID_PREFERRED_LOCALE_ROUTES_IN_DEVELOPMENT = exports.VALID_PREFERRED_LOCALES_IN_DEVELOPMENT.map((locale) => {
    const key = locale.split("-").join("");
    const value = locale.toLocaleLowerCase();
    return {
        [key]: `/${value}`,
    };
}).reduce((result, current) => Object.assign(result, current), {});
const VALID_PREFERRED_LOCALE_ORIGINS = [
    "autodetect",
    "user_choice",
    "legacy",
    "inferred_from_inviter",
];
exports.preferredContentfulLocales = {
    "es-LA": "es-419",
    "zh-TW": "zh-Hant-TW",
};
exports.countryToPreferredLocale = {
    KR: "ko-KR",
    US: "en-US",
    JA: "ja-JP",
};
exports.shortCodeToPreferredLocaleExtended = {
    ko: "ko-KR",
    en: "en-US",
    es: "es-LA",
    fr: "fr-FR",
    ja: "ja-JP",
    pt: "pt-BR",
    zh: "zh-CN",
};
exports.VALID_PREFERRED_SHORT_LOCALES = ["en", "ko", "ja"];
exports.VALID_PREFERRED_SHORT_LOCALES_IN_DEVELOPMENT = [
    "es",
    "fr",
    "pt",
    "zh",
];
function isDevelopmentOnlyLocale(locale) {
    return exports.VALID_PREFERRED_LOCALES_IN_DEVELOPMENT.includes(locale);
}
exports.isDevelopmentOnlyLocale = isDevelopmentOnlyLocale;
function isDevelopmentLocale(locale) {
    return (isPreferredLocale(locale) ||
        exports.VALID_PREFERRED_LOCALES_IN_DEVELOPMENT.includes(locale));
}
exports.isDevelopmentLocale = isDevelopmentLocale;
function isPreferredLocale(locale) {
    return exports.VALID_PREFERRED_LOCALES.includes(locale);
}
exports.isPreferredLocale = isPreferredLocale;
function isPreferredLocaleExtended(locale) {
    return isPreferredLocale(locale) || isDevelopmentLocale(locale);
}
exports.isPreferredLocaleExtended = isPreferredLocaleExtended;
function isPreferredLocaleOrigin(origin) {
    return VALID_PREFERRED_LOCALE_ORIGINS.includes(origin);
}
exports.isPreferredLocaleOrigin = isPreferredLocaleOrigin;
function isPreferredShortLocale(shortLocale) {
    return exports.VALID_PREFERRED_SHORT_LOCALES.includes(shortLocale);
}
exports.isPreferredShortLocale = isPreferredShortLocale;
function isDevelopmentShortLocale(locale) {
    return (isPreferredShortLocale(locale) ||
        exports.VALID_PREFERRED_SHORT_LOCALES_IN_DEVELOPMENT.includes(locale));
}
exports.isDevelopmentShortLocale = isDevelopmentShortLocale;
function externalLocaleToNotionLocale(externalLocale, onlyProdLanguages) {
    const [shortCode, region] = externalLocale.split("-");
    if (shortCode && !region) {
        if ((Boolean(onlyProdLanguages) && isPreferredShortLocale(shortCode)) ||
            isDevelopmentShortLocale(shortCode)) {
            return exports.shortCodeToPreferredLocaleExtended[shortCode];
        }
    }
    if ((Boolean(onlyProdLanguages) && isPreferredLocale(externalLocale)) ||
        isPreferredLocaleExtended(externalLocale)) {
        return externalLocale;
    }
    return "en-US";
}
exports.externalLocaleToNotionLocale = externalLocaleToNotionLocale;
function getLocaleFromCookie(cookie) {
    if (cookie === "") {
        return "en-US";
    }
    const [localeCookie] = decodeURIComponent(cookie).split("/");
    if (localeCookie && isPreferredLocaleExtended(localeCookie)) {
        return localeCookie;
    }
    return "en-US";
}
exports.getLocaleFromCookie = getLocaleFromCookie;
//# sourceMappingURL=desktopLocaleHelpers.js.map

//notion-enhancer
require('notion-enhancer')('shared/desktopLocaleHelpers', exports, (js) => eval(js))