/**
 * notion-enhancer
 * (c) 2022 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

"use strict";

(async () => {
  // prettier-ignore
  const { enhancerUrl } = globalThis.__enhancerApi,
    isMenu = location.href.startsWith(enhancerUrl("/core/menu/index.html")),
    pageLoaded = /(^\/$)|((-|\/)[0-9a-f]{32}((\?.+)|$))/.test(location.pathname),
    signedIn = localStorage["LRU:KeyValueStore2:current-user-id"];
  if (!isMenu && !(signedIn && pageLoaded)) return;

  await import("./vendor/twind.min.js");
  await import("./vendor/lucide.min.js");
  await import("./vendor/htm.min.js");
  await import("./api/interface.js");
  await import("./api/events.js");
  await import("./api/mods.js");
  const { getMods, getProfile } = globalThis.__enhancerApi,
    { isEnabled, optionDefaults, initDatabase } = globalThis.__enhancerApi;

  for (const mod of await getMods()) {
    if (!(await isEnabled(mod.id))) continue;

    // clientStyles
    for (let stylesheet of mod.clientStyles ?? []) {
      const $stylesheet = document.createElement("link");
      $stylesheet.rel = "stylesheet";
      $stylesheet.href = enhancerUrl(`${mod._src}/${stylesheet}`);
      document.head.appendChild($stylesheet);
    }
    if (isMenu) continue;

    // clientScripts
    const options = await optionDefaults(mod.id),
      db = initDatabase([await getProfile(), mod.id], options);
    for (let script of mod.clientScripts ?? []) {
      script = await import(enhancerUrl(`${mod._src}/${script}`));
      script.default(globalThis.__enhancerApi, db);
    }
  }
})();
