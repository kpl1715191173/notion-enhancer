/**
 * notion-enhancer
 * (c) 2023 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

export default (async () => {
  Object.assign((globalThis.__enhancerApi ??= {}), {
    ...(globalThis.__getEnhancerApi?.() ?? {}),
  });

  // prettier-ignore
  const { enhancerUrl, platform } = globalThis.__enhancerApi,
    IS_MENU = location.href.startsWith(enhancerUrl("core/menu/index.html")),
    IS_TABS = /\.webpack\/renderer\/tabs\/index.html$/.test(location.href),
    IS_ELECTRON = ['linux', 'win32', 'darwin'].includes(platform),
    CORE_LOADED = new Promise((res, rej) => {
      const onLoad = globalThis.__enhancerApi.onLoad;
      globalThis.__enhancerApi.onLoad = () => (onLoad?.(), res());
    }),
    MODS_LOADED = new Promise((res, rej) => {
      const onReady = globalThis.__enhancerApi.onReady;
      globalThis.__enhancerApi.onReady = () => (onReady?.(), res());
    });
  Object.assign((globalThis.__enhancerApi ??= {}), {
    CORE_LOADED,
    MODS_LOADED,
    IS_TABS,
  });

  if (!IS_MENU && !IS_TABS) {
    // Current workspace routes and public notion.site pages do not share the
    // old page-ID URL pattern or the signed-in localStorage marker.
    console.log("notion-enhancer: loading...");
  }

  // in electron, iframes cannot access node
  // => relevant functionality can be provided
  // by setting contentWindow.__enhancerApi from
  // the preload.js parent script thanks to the
  // notion:// protocol csp bypass

  // in browser, extensions run in an isolated
  // execution context => __enhancerApi modules
  // can't be passed from the parent script and
  // must be re-imported. this is fine, since
  // extension:// pages can access chrome apis

  // in both situations, modules that attach to
  // the dom must be re-imported

  await Promise.all([
    IS_ELECTRON || import(enhancerUrl("api/registry.js")),
    import(enhancerUrl("api/interface.mjs")),
    import(enhancerUrl("api/state.js")),
  ]);

  const { getMods, isEnabled, modDatabase } = globalThis.__enhancerApi;
  for (const mod of await getMods()) {
    if (!(await isEnabled(mod.id))) continue;
    const isCore = mod._src === "core",
      isTheme = mod._src.startsWith("themes/");
    if (IS_MENU && !(isCore || isTheme)) continue;

    // clientStyles
    for (let stylesheet of mod.clientStyles ?? []) {
      const $stylesheet = document.createElement("link");
      $stylesheet.rel = "stylesheet";
      $stylesheet.href = enhancerUrl(`${mod._src}/${stylesheet}`);
      document.head.append($stylesheet);
    }

    // clientScripts
    if (IS_MENU || IS_TABS) continue;
    const db = await modDatabase(mod.id);
    for (let script of mod.clientScripts ?? []) {
      // execute mod scripts after core has
      // loaded and api is ready to use
      Promise.resolve(isCore || CORE_LOADED)
        .then(() => import(enhancerUrl(`${mod._src}/${script}`)))
        .then((script) => script.default(globalThis.__enhancerApi, db))
        .then(() => !isCore || globalThis.__enhancerApi.onLoad?.())
        .catch((err) => console.error(err));
    }
  }

  if (IS_MENU || IS_TABS) {
    globalThis.__enhancerApi.onLoad?.();
    globalThis.__enhancerApi.onReady?.();
  }
  return CORE_LOADED.then(() => {
    if (IS_MENU) console.log("notion-enhancer: ready");
    return globalThis.__enhancerApi;
  });
})();
