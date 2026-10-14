'use strict';

(() => {
  if (globalThis.__notionEnhancerMermaid) return;
  const statusData = {
    version: '12.1.0', injection: 'page-script/document_start',
    settingsLoaded: false, enabled: false, profile: null,
    hookInstalled: false, moduleReplaced: false, recoveredCachedModule: false, officialLoaded: false,
    renderCount: 0, renderSuccess: 0, renderErrors: 0,
    layoutFallbacks: 0, lastFallback: null,
    lastRender: null, lastFailure: null, lastError: null
  };
  const publishStatus = () => document.documentElement?.setAttribute(
    'data-notion-enhancer-mermaid-status', JSON.stringify(statusData)
  );
  const status = globalThis.__notionEnhancerMermaid = new Proxy(statusData, {
    set(target, key, value) {
      target[key] = value;
      publishStatus();
      return true;
    }
  });
  publishStatus();
  const attribute = 'data-notion-enhancer-mermaid-settings';
  let official, lastConfig;
  const assignments = new Map();
  const configSummary = () => {
    const config = official?.mermaidAPI.getConfig() || lastConfig || {};
    const summary = {
      theme: config.theme, layout: config.layout, look: config.look,
      fontFamily: config.fontFamily, fontSize: config.fontSize, htmlLabels: config.htmlLabels,
      themeVariables: { fontFamily: config.themeVariables?.fontFamily, fontSize: config.themeVariables?.fontSize },
      mindmap: config.mindmap, elk: config.elk
    };
    return JSON.parse(JSON.stringify(summary, (_key, value) =>
      typeof value === 'number' && !Number.isFinite(value) ? String(value) : value));
  };
  const recordFailure = (error, details) => {
    status.renderErrors++;
    status.lastError = error.message;
    status.lastFailure = {
      ...details, config: configSummary(), message: error.message, stack: error.stack || null
    };
    console.error('[notion-enhancer/mermaid] official render failed', status.lastFailure);
  };
  const readSettings = () => {
    const value = document.documentElement?.getAttribute(attribute);
    if (!value) return;
    try {
      const settings = JSON.parse(value);
      const changed = !status.settingsLoaded || status.enabled !== (settings.enabled === true);
      status.settingsLoaded = true;
      status.enabled = settings.enabled === true;
      status.profile = settings.profile;
      if (settings.error) status.lastError = settings.error;
      if (changed) console.info('[notion-enhancer/mermaid]', status.enabled ? 'enabled' : 'disabled', status);
    } catch (error) { status.lastError = error.message; }
  };
  new MutationObserver(readSettings).observe(document, {
    subtree: true, childList: true, attributes: true, attributeFilter: [attribute]
  });
  readSettings();

  /* OFFICIAL_FACTORY */

  const getOfficial = () => {
    if (!official) {
      official = createOfficialMermaid();
      official.initialize({ ...lastConfig, startOnLoad: false });
      for (const [key, value] of assignments) official[key] = value;
      status.officialLoaded = true;
      console.info('[notion-enhancer/mermaid] official Mermaid loaded');
    }
    return official;
  };
  const wrappedFactories = new WeakSet();
  const facades = new WeakSet();
  const replaceModules = (chunk) => {
    const modules = chunk?.[1];
    const factory = modules?.[74731];
    if (typeof factory !== 'function' || wrappedFactories.has(factory)) return;
    const source = Function.prototype.toString.call(factory);
    if (!source.includes('mermaidAPI:') || !source.includes('registerExternalDiagrams')) return;
    const wrapped = function (module, exports, require) {
      let original = module.__notionEnhancerOriginal;
      const getOriginal = () => {
        if (!original) {
          const originalExports = {};
          factory.call(this, module, originalExports, require);
          original = originalExports.default;
        }
        return original;
      };
      const resolve = (scope) => {
        const library = status.enabled ? getOfficial() : getOriginal();
        return scope === 'api' ? library.mermaidAPI : library;
      };
      const proxies = {}, methods = { top: new Map(), api: new Map() };
      const makeProxy = (scope) => new Proxy({}, {
        get(_target, key) {
          if (scope === 'top' && key === 'mermaidAPI') return proxies.api;
          const library = resolve(scope);
          if (typeof library[key] !== 'function') return library[key];
          if (!methods[scope].has(key)) methods[scope].set(key, function (...args) {
            if (key === 'initialize') {
              lastConfig = args[0];
              if (status.enabled) args[0] = { ...args[0], startOnLoad: false };
            }
            const selected = resolve(scope);
            const track = status.enabled && key === 'render';
            let details;
            if (track) {
              status.renderCount++;
              details = {
                call: status.renderCount,
                diagramType: String(args[1] || '').match(/^\s*(mindmap|flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|gantt)\b/m)?.[1] || 'other',
                codeLength: typeof args[1] === 'string' ? args[1].length : null,
                containerProvided: Boolean(args[2]),
                containerConnected: args[2]?.isConnected ?? null,
                config: configSummary()
              };
              status.lastRender = details;
            }
            try {
              const result = Reflect.apply(selected[key], selected, args);
              if (!track) return result;
              const succeeded = (value) => {
                status.renderSuccess++;
                status.lastError = null;
                return value;
              };
              return Promise.resolve(result).then(succeeded, async (error) => {
                recordFailure(error, details);
                const failedLayout = status.lastFailure.config.layout;
                if (
                  details.diagramType !== 'mindmap' ||
                  !/^elk(?:\.|$)/.test(String(failedLayout)) ||
                  !/Cannot read properties of null \(reading ['"]re['"]\)/.test(error.message)
                ) throw error;
                // Mermaid 12.1.0's ELK path fails on this mindmap with a null
                // numeric JSON value. Retry only this diagram using its normal
                // CoSE layout, leaving Notion's site configuration untouched.
                const retryArgs = [...args];
                retryArgs[1] = args[1].replace(/^(\s*)mindmap\b/m,
                  (match) => '%%{init: {"layout":"cose-bilkent"}}%%\n' + match);
                status.lastFallback = {
                  call: details.call, from: failedLayout, to: 'cose-bilkent', succeeded: false
                };
                try {
                  const value = await Reflect.apply(selected[key], selected, retryArgs);
                  status.layoutFallbacks++;
                  status.lastFallback = { ...status.lastFallback, succeeded: true };
                  return succeeded(value);
                } catch (retryError) {
                  recordFailure(retryError, { ...details, retryLayout: 'cose-bilkent' });
                  throw retryError;
                }
              });
            } catch (error) {
              if (track) recordFailure(error, details);
              else status.lastError = error.message;
              throw error;
            }
          });
          return methods[scope].get(key);
        },
        set(_target, key, value) {
          if (!Reflect.set(resolve(scope), key, value)) return false;
          if (scope === 'top') assignments.set(key, value);
          return true;
        },
        has(_target, key) { return key in resolve(scope); },
        ownKeys() { return Reflect.ownKeys(resolve(scope)); },
        getOwnPropertyDescriptor(_target, key) {
          if (key in resolve(scope)) return { enumerable: true, configurable: true };
        }
      });
      proxies.top = makeProxy('top');
      proxies.api = makeProxy('api');
      facades.add(proxies.top);
      require.d(exports, { default: () => proxies.top });
      status.moduleReplaced = true;
      console.info('[notion-enhancer/mermaid] Mermaid module connected');
    };
    wrappedFactories.add(wrapped);
    modules[74731] = wrapped;
  };
  const connectRuntime = (require) => {
    if (typeof require !== 'function' || !require.m?.[74731]) return;
    const modules = require.m;
    replaceModules([[], modules]);
    if (!wrappedFactories.has(modules[74731])) return;
    const library = require(74731).default;
    if (!library || facades.has(library)) return;
    // The external page script can load after Notion has already imported the
    // module. Keep the original default object's identity for existing imports,
    // while forwarding its properties through the same dynamic facade.
    const snapshot = Object.create(Object.getPrototypeOf(library),
      Object.getOwnPropertyDescriptors(library));
    const exported = {};
    modules[74731]({ __notionEnhancerOriginal: snapshot }, exported, require);
    const facade = exported.default;
    if (!lastConfig) lastConfig = snapshot.mermaidAPI?.getSiteConfig?.();
    for (const key of Reflect.ownKeys(snapshot)) {
      if (!Object.getOwnPropertyDescriptor(library, key)?.configurable) continue;
      Object.defineProperty(library, key, {
        configurable: true, enumerable: Object.getOwnPropertyDescriptor(snapshot, key).enumerable,
        get: () => facade[key], set: (value) => { facade[key] = value; }
      });
    }
    status.recoveredCachedModule = true;
  };
  const hookedQueues = new WeakSet();
  const hookQueue = (queue) => {
    if (!Array.isArray(queue) || hookedQueues.has(queue)) return queue;
    hookedQueues.add(queue);
    queue.forEach(replaceModules);
    // Rspack binds the previous push when installing its callback. Capture each
    // delegate separately to avoid recursion when that callback calls it.
    const wrapPush = (delegate) => function (...chunks) {
      chunks.forEach(replaceModules);
      return Reflect.apply(delegate, this, chunks);
    };
    const connect = (delegate) => {
      if (delegate === Array.prototype.push) return;
      try {
        Reflect.apply(delegate, queue, [[['notion-enhancer-mermaid-runtime'], {}, connectRuntime]]);
      } catch (error) {
        status.lastError = error.message;
        console.warn('[notion-enhancer/mermaid] could not connect to the existing runtime', error);
      }
    };
    let push = wrapPush(queue.push);
    const previous = queue.push;
    Object.defineProperty(queue, 'push', {
      configurable: true,
      get: () => push,
      set: (delegate) => { push = wrapPush(delegate); connect(delegate); }
    });
    connect(previous);
    return queue;
  };
  try {
    const name = 'rspackChunknotion_next';
    let queue = hookQueue(globalThis[name] || []);
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get: () => queue,
      set: (value) => { queue = hookQueue(value); }
    });
    status.hookInstalled = true;
  } catch (error) {
    status.lastError = error.message;
    console.error('[notion-enhancer/mermaid] hook installation failed', error);
  }
})();
