'use strict';

// Test fixture: this nonce-authorized inline code runs BEFORE the page hook.
(() => {
  const modules = {}, cache = {};
  const state = globalThis.__notionEnhancerMermaidTestRuntime = { originalRenderCount: 0 };
  const require = (id) => {
    if (!cache[id]) {
      const module = cache[id] = { exports: {} };
      modules[id](module, module.exports, require);
    }
    return cache[id].exports;
  };
  require.m = modules;
  require.d = (exports, getters) => {
    for (const [key, get] of Object.entries(getters)) Object.defineProperty(exports, key, { get });
  };
  const queue = globalThis.rspackChunknotion_next = [];
  queue.push = (chunk) => {
    Object.assign(modules, chunk[1]);
    chunk[2]?.(require);
    return Array.prototype.push.call(queue, chunk);
  };
  queue.push([[86505], { 74731(module, exports, require) {
    const library = {
      mermaidAPI:{}, registerExternalDiagrams() {},
      initialize(config) { library.config = config; },
      render() { state.originalRenderCount++; throw new Error('Cached original renderer must not run'); }
    };
    library.mermaidAPI.getSiteConfig = () => library.config;
    require.d(exports, { default: () => library });
  } }]);
  state.imported = require(74731).default;
  state.imported.initialize({ theme: 'default', startOnLoad: true });
})();
