'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const read = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8');
const attribute = 'data-notion-enhancer-mermaid-settings';
const mod = JSON.parse(read('mod.json'));

function environment(enabled, prepare) {
  const observers = [];
  const attributes = new Map();
  if (enabled !== undefined) attributes.set(attribute, JSON.stringify({ enabled, profile: 'default' }));
  const root = {
    getAttribute: (key) => attributes.get(key) ?? null,
    setAttribute: (key, value) => {
      attributes.set(key, value);
      observers.filter((observer) => observer.active && observer.options.attributeFilter.includes(key))
        .forEach((observer) => queueMicrotask(() => { if (observer.active) observer.callback(); }));
    }
  };
  const context = vm.createContext({
    console: { info() {}, error() {} }, setTimeout, clearTimeout, TextEncoder,
    TextDecoder, structuredClone, URL, performance,
    document: { documentElement: root }, window: { addEventListener() {} },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; }
      observe(_target, options) { this.active = true; this.options = options; observers.push(this); }
      disconnect() { this.active = false; }
    }
  });
  prepare?.(context);
  vm.runInContext(read('main-world.js'), context, { timeout: 10000 });
  return { context, async setEnabled(value) {
    root.setAttribute(attribute, JSON.stringify({ enabled: value, profile: 'default' }));
    await new Promise(setImmediate);
  } };
}

function runtime(context) {
  const modules = {}, cache = {};
  const require = (id) => {
    if (!cache[id]) {
      const module = cache[id] = { exports: {} };
      modules[id](module, module.exports, require);
    }
    return cache[id].exports;
  };
  require.d = (target, getters) => {
    for (const [key, get] of Object.entries(getters)) Object.defineProperty(target, key, { get });
  };
  require.m = modules;
  const queue = context.rspackChunknotion_next;
  const previous = queue.push.bind(queue);
  queue.push = (chunk) => {
    Object.assign(modules, chunk[1]);
    chunk[2]?.(require);
    return previous(chunk);
  };
  queue.forEach((chunk) => Object.assign(modules, chunk[1]));
  return require;
}

// The signature resembles the real entry; original renders are easy to distinguish.
function originalFactory(module, exports, require) {
  const library = { mermaidAPI:{}, registerExternalDiagrams() {},
    initialize(config) { library.config = config; },
    detectType() { return 'original'; },
    render() { return Promise.resolve({ svg: 'original' }); }
  };
  library.mermaidAPI.initialize = library.initialize;
  library.mermaidAPI.render = library.render;
  library.mermaidAPI.getSiteConfig = () => library.config;
  require.d(exports, { default: () => library });
}

async function main() {
  const enabled = environment(true);
  const require = runtime(enabled.context);
  const unrelated = () => {};
  const chunk = [[86505], { 74731: originalFactory, 123: unrelated }];
  enabled.context.rspackChunknotion_next.push(chunk);
  assert.equal(chunk[1][123], unrelated);
  const factory = chunk[1][74731];
  enabled.context.rspackChunknotion_next.push(chunk);
  assert.equal(chunk[1][74731], factory, 'do not wrap again via the previous push');
  const mermaid = require(74731).default;
  mermaid.initialize({ theme: 'dark' });
  assert.equal(mermaid.detectType('mindmap\n  root'), 'mindmap');
  assert.equal(mermaid.mermaidAPI.getConfig().theme, 'dark');
  assert.equal(mermaid.mermaidAPI.getConfig().startOnLoad, false);
  assert.ok(enabled.context.__notionEnhancerMermaid.officialLoaded);
  assert.ok(enabled.context.__notionEnhancerMermaid.moduleReplaced);
  assert.equal(enabled.context.mermaid, undefined, 'vendor stays scoped');

  const delayed = environment();
  const delayedRequire = runtime(delayed.context);
  delayed.context.rspackChunknotion_next.push([[86505], { 74731: originalFactory }]);
  const facade = delayedRequire(74731).default;
  facade.initialize({ theme: 'forest' });
  const capturedMethod = facade.detectType;
  assert.equal(capturedMethod('mindmap'), 'original');
  assert.equal((await facade.render()).svg, 'original');
  assert.equal(delayed.context.__notionEnhancerMermaid.officialLoaded, false);
  await delayed.setEnabled(true);
  assert.equal(capturedMethod('mindmap\n  root'), 'mindmap', 'cached methods follow late settings');
  assert.equal(facade.mermaidAPI.getConfig().theme, 'forest', 'retain site initialization');
  await delayed.setEnabled(false);
  assert.equal(capturedMethod('mindmap'), 'original');
  assert.equal((await facade.render()).svg, 'original');

  const reassigned = environment(true);
  reassigned.context.rspackChunknotion_next = [];
  const reRequire = runtime(reassigned.context);
  reassigned.context.rspackChunknotion_next.push([[86505], { 74731: originalFactory }]);
  assert.equal(reRequire(74731).default.detectType('mindmap\n  root'), 'mindmap');
  const wrong = environment(true);
  const otherFactory = () => {};
  const other = [[86505], { 74731: otherFactory }];
  wrong.context.rspackChunknotion_next.push(other);
  assert.equal(other[1][74731], otherFactory, 'do not replace unrelated code with the same ID');

  let imported;
  const preloaded = environment(true, (context) => {
    context.rspackChunknotion_next = [];
    const earlyRequire = runtime(context);
    context.rspackChunknotion_next.push([[86505], { 74731: originalFactory }]);
    imported = earlyRequire(74731).default;
    imported.initialize({ theme: 'forest' });
  });
  assert.equal(imported.detectType('mindmap\n  root'), 'mindmap', 'recover an already cached default object');
  assert.equal(imported.mermaidAPI.getConfig().theme, 'forest');
  assert.equal(preloaded.context.__notionEnhancerMermaid.recoveredCachedModule, true);
  await preloaded.setEnabled(false);
  assert.equal(imported.detectType('mindmap'), 'original');

  let changeListener;
  let values = { agreedToTerms: '0.11.1', ['default__enabledMods__' + mod.id]: true };
  wrong.context.chrome = {
    storage: { local: { get: async () => values },
      onChanged: { addListener: (callback) => { changeListener = callback; } } },
    runtime: { id: 'test', getURL: (file) => `chrome-extension://test/${file}`, getManifest: () => ({ version: '0.11.1' }) }
  };
  vm.runInContext(read('bootstrap.js'), wrong.context);
  await new Promise(setImmediate);
  assert.equal(wrong.context.__notionEnhancerMermaid.enabled, true);
  values.activeProfile = 'other';
  changeListener({ activeProfile: {} }, 'local');
  await new Promise(setImmediate);
  assert.equal(wrong.context.__notionEnhancerMermaid.enabled, false);

  const manifest = JSON.parse(read('../../manifest.json'));
  const registration = manifest.content_scripts.find((item) => item.js.includes('extensions/mermaid-replacement/bootstrap.js'));
  assert.equal(registration.run_at, 'document_start');
  assert.equal(manifest.content_scripts.some((item) => item.world === 'MAIN'), false);
  assert.ok(manifest.web_accessible_resources.some((item) => item.resources.includes('/*') && item.matches.includes('https://app.notion.com/*')));
  assert.equal(manifest.permissions.includes('webRequestBlocking'), false);
  const sources = JSON.parse(read('sources.json'));
  assert.equal(crypto.createHash('sha256').update(read('vendor/dist/mermaid.min.js')).digest('hex'),
    sources.vendorSha256);
  console.log('Passed: Rspack callbacks, guards, disabled mode, late settings, cached-module recovery and profile bridge');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
