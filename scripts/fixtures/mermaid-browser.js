'use strict';

(async () => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  try {
    // The extension integration fixture loads this from the page with a CSP
    // nonce. Wait for the separate isolated-world bootstrap to inject the hook.
    for (let attempt = 0; !globalThis.__notionEnhancerMermaid && attempt < 100; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert(globalThis.__notionEnhancerMermaid, 'Page hook missing after 10 seconds');
    const modules = {}, cache = {};
    let originalRenderCount = 0;
    const preloaded = globalThis.__notionEnhancerMermaidTestRuntime;
    const require = (id) => {
      if (!cache[id]) {
        const module = cache[id] = { exports: {} };
        modules[id](module, module.exports, require);
      }
      return cache[id].exports;
    };
    require.d = (exports, getters) => {
      for (const [key, get] of Object.entries(getters)) Object.defineProperty(exports, key, { get });
    };
    const queue = preloaded ? [] : globalThis.rspackChunknotion_next;
    const previous = queue.push.bind(queue);
    queue.push = (chunk) => {
      Object.assign(modules, chunk[1]);
      return previous(chunk);
    };
    queue.push([[86505], { 74731(module, exports, require) {
      const library = {
        mermaidAPI:{}, registerExternalDiagrams() {}, initialize() {},
        render() { originalRenderCount++; throw new Error('Original renderer must not run'); }
      };
      require.d(exports, { default: () => library });
    } }]);
    const mermaid = preloaded ? preloaded.imported : require(74731).default;
    // Cache references and initialize BEFORE the isolated settings arrive.
    const initialize = mermaid.initialize;
    const render = mermaid.render;
    const requestedLayout = new URL(location.href).searchParams.get('layout');
    initialize({ theme: 'default', startOnLoad: true, ...(requestedLayout ? { layout: requestedLayout } : {}) });
    document.documentElement.setAttribute('data-notion-enhancer-mermaid-settings',
      JSON.stringify({ enabled: true, profile: 'test' }));
    await Promise.resolve();
    // A failure must retain its stack even if a later render succeeds.
    try { await render('invalid-regression', 'not-a-mermaid-diagram'); } catch {}
    assert(globalThis.__notionEnhancerMermaid.lastFailure?.stack, 'Failure stack not captured');
    const source = `%%{init: {'theme':'default', 'themeVariables': {'fontSize': '14px'}}}%%
mindmap
  root(("阅读理解"))
    sug["\`**刷题建议**\`"]
      s1["第一遍：限时20min/篇"]
      s2["第二遍：不限时"]
      s3["第三遍：听课"]
      s4["第四遍：跟别人讲「复述」"]
    theory["\`**思维理论**\`"]
      th1["精准定位"]
        th1a["S形定位方法"]
      th2["选项比错"]
      th3["\`精准定位+选项比错综合 → **通用解法**\`"]
      th4["选择题固有缺陷"]
    types["\`**题型分类**\`"]
      t1["例证题"]
      t2["推断题"]
      t3["态度题"]
      t4["词汇题"]
      t5["句子题"]`;
    const result = await render('injected-mindmap', source);
    assert(result.svg.includes('<svg'), 'SVG was not generated');
    assert(result.svg.includes('阅读理解'), 'Root label missing');
    originalRenderCount = preloaded ? preloaded.originalRenderCount : originalRenderCount;
    assert(originalRenderCount === 0, 'Original renderer was called');
    const status = globalThis.__notionEnhancerMermaid;
    assert(status.officialLoaded && status.renderSuccess === 1, 'Official rendering was not tracked');
    const elkRequested = /^elk(?:\.|$)/.test(requestedLayout || '');
    assert(status.renderErrors === (elkRequested ? 2 : 1) && status.lastFailure.stack,
      'Failure diagnostics were lost after success');
    if (elkRequested) {
      assert(status.layoutFallbacks === 1 && status.lastFallback.succeeded, 'ELK failure was not recovered');
      assert(mermaid.mermaidAPI.getSiteConfig().layout === requestedLayout, 'Fallback changed the site layout');
    }
    if (preloaded) assert(status.recoveredCachedModule, 'The cached module was not recovered');
    assert(mermaid.mermaidAPI.getConfig().startOnLoad === false, 'Automatic page scan enabled');
    document.getElementById('diagram').innerHTML = result.svg;
    document.getElementById('results').textContent = JSON.stringify({
      passed: true, svgLength: result.svg.length, originalRenderCount, ...status
    }, null, 2);
  } catch (error) {
    document.getElementById('results').textContent = JSON.stringify({
      passed: false, error: error.message, stack: error.stack,
      status: globalThis.__notionEnhancerMermaid
    }, null, 2);
  }
})();
