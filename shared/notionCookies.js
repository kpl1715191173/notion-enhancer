"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTION_PUBLIC_DOMAIN_USER_ID_COOKIE = exports.NOTION_PUBLIC_DOMAIN_FIRST_VISIT_COOKIE = exports.NOTION_GHOST_ADMIN_USER_ID_COOKIE = exports.NOTION_EXTERNAL_AUTH_PROXY_CSRF_COOKIE = exports.NOTION_USERS_COOKIE = exports.NOTION_USER_ID_COOKIE = exports.NEXT_LOCALE_COOKIE = exports.NOTION_LOCALE_COOKIE = exports.NOTION_BROWSER_ID_COOKIE = void 0;
exports.NOTION_BROWSER_ID_COOKIE = "notion_browser_id";
exports.NOTION_LOCALE_COOKIE = "notion_locale";
exports.NEXT_LOCALE_COOKIE = "NEXT_LOCALE";
exports.NOTION_USER_ID_COOKIE = "notion_user_id";
exports.NOTION_USERS_COOKIE = "notion_users";
exports.NOTION_EXTERNAL_AUTH_PROXY_CSRF_COOKIE = "eap_csrf";
exports.NOTION_GHOST_ADMIN_USER_ID_COOKIE = "notion_ghost_admin_user_id";
exports.NOTION_PUBLIC_DOMAIN_FIRST_VISIT_COOKIE = "notion_public_domain_first_visit";
exports.NOTION_PUBLIC_DOMAIN_USER_ID_COOKIE = "notion_public_domain_user_id";
//# sourceMappingURL=notionCookies.js.map

//notion-enhancer
require('notion-enhancer')('shared/notionCookies', exports, (js) => eval(js))