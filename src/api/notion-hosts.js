"use strict";

// Shared by browser init scripts and the MV3 worker (classic script contexts).
globalThis.__enhancerNotionHosts = {
  matches: [
    "https://*.notion.so/*",
    "https://*.notion.site/*",
    "https://app.notion.com/*",
    "https://*.app.notion.com/*",
  ],
  isNotionUrl(value) {
    try {
      const { protocol, hostname } = new URL(value);
      return protocol === "https:" && (
        hostname === "notion.so" || hostname.endsWith(".notion.so") ||
        hostname === "notion.site" || hostname.endsWith(".notion.site") ||
        hostname === "app.notion.com" || hostname.endsWith(".app.notion.com")
      );
    } catch {
      return false;
    }
  },
};
