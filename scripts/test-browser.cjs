'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
assert.ok(globalThis.WebSocket, 'Browser tests require Node.js 22 or newer');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const temporary = fs.mkdtempSync(path.join(root, 'dist/.browser-test-'));
const extension = path.join(temporary, 'extension');
const profile = path.join(temporary, 'profile');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  fs.mkdirSync(extension);
  fs.cpSync(path.join(root, 'src'), extension, { recursive: true });
  const browser = spawn(process.argv[2] || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      '--remote-debugging-port=0', `--user-data-dir=${profile}`,
      `--disable-extensions-except=${extension}`, `--load-extension=${extension}`, 'about:blank'],
    { windowsHide: true, stdio: 'ignore' });
  const deadline = setTimeout(() => { console.error('Browser verification timed out'); browser.kill(); process.exitCode = 1; }, 45000);
  let socket;
  try {
    const activePort = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; !fs.existsSync(activePort) && i < 100; i++) await delay(100);
    assert.ok(fs.existsSync(activePort), 'Browser CDP did not start');
    console.log('Browser CDP started');
    let connection;
    for (let i = 0; !connection && i < 30; i++) {
      try {
        const contents = fs.readFileSync(activePort, 'utf8').trim().split(/\r?\n/);
        if (contents[1]) connection = contents;
      } catch {}
      if (!connection) await delay(100);
    }
    assert.ok(connection, 'Could not read CDP connection');
    const [port, endpoint] = connection;
    socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let sequence = 0;
    const pending = new Map();
    socket.addEventListener('message', ({ data }) => {
      const result = JSON.parse(data);
      if (result.method === 'Runtime.exceptionThrown') console.error(JSON.stringify(result.params.exceptionDetails));
      if (!pending.has(result.id)) return;
      const { resolve, reject } = pending.get(result.id);
      pending.delete(result.id);
      result.error ? reject(new Error(JSON.stringify(result.error))) : resolve(result.result);
    });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
    let worker;
    for (let i = 0; !worker && i < 50; i++) {
      worker = (await send('Target.getTargets')).targetInfos.find((t) =>
        t.type === 'service_worker' && t.url.endsWith('/worker.js'));
      if (!worker) await delay(100);
    }
    assert.ok(worker, 'MV3 worker did not load');
    console.log('MV3 worker loaded');
    // URL.origin is "null" for chrome-extension: in some Node versions.
    const base = worker.url.slice(0, worker.url.lastIndexOf('/') + 1);
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Runtime.enable', {}, sessionId);
    await send('Page.enable', {}, sessionId);
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `const originalFetch = window.fetch;
      window.fetch = (url, ...args) => String(url).startsWith('https://api.github.com/')
        ? Promise.resolve(new Response(JSON.stringify({tag_name: '0.11.1'}), {headers:{'Content-Type':'application/json'}}))
        : originalFetch(url, ...args);` }, sessionId);
    await send('Page.navigate', { url: `${base}core/menu/index.html` }, sessionId);
    console.log('New menu opened');
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
      assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    let ready;
    for (let i = 0; !ready && i < 100; i++) {
      ready = await evaluate('Boolean(document.querySelector("main") && !document.getElementById("skeleton"))');
      if (!ready) await delay(100);
    }
    if (!ready) console.error(await evaluate('document.body.innerHTML.slice(0, 1000)'));
    assert.ok(ready, 'New standalone menu did not render under MV3 CSP');
    console.log('New standalone MV3 menu rendered');
    const registry = await evaluate(`(async () => {
      const mods = await __enhancerApi.getMods();
      return { count: mods.length,
        mermaid: mods.some((m) => m.id === '9f44bd58-8f2b-47ee-aefb-6e6906e53210') };
    })()`);
    assert.equal(registry.count, 15);
    assert.equal(registry.mermaid, true);
    const result = await evaluate(`(async () => {
      const api = __enhancerApi;
      const id = 'd61dc8a7-b195-465b-935f-53eea9efe74e';
      await api.initDatabase().set('agreedToTerms', api.version);
      await api.initDatabase().set('activeProfile', 'migration-test');
      const db = await api.modDatabase(id);
      await db.set('numberSingleLines', false);
      await db.set('decorationStyle', 'Border');
      await api.setEnabled(id, true);
      const options = [await db.get('numberSingleLines'), await db.get('decorationStyle'), await api.isEnabled(id)];
      const fixture = document.createElement('div');
      fixture.innerHTML = '<div class="notion-code-block" style="display:flex;width:400px"><div class="notranslate" contenteditable="true" style="white-space:pre-wrap;font:16px monospace;line-height:24px;padding:34px 32px">first line<br>second line</div></div>';
      document.body.append(fixture);
      const client = (await import('../../extensions/line-numbers/client.mjs')).default;
      await client(api, db);
      const code = fixture.querySelector('.notranslate');
      const nums = fixture.querySelector('.notion-enhancer--line-numbers');
      const read = () => [...nums.children].map(row => row.textContent);
      const initial = read();
      code.innerHTML = 'single line';
      await new Promise((resolve) => setTimeout(resolve, 150));
      const single = nums.style.display;
      code.innerHTML = 'very long first line '.repeat(8) + '<br>x';
      await new Promise((resolve) => setTimeout(resolve, 150));
      const wrapped = parseFloat(nums.firstElementChild.style.height);
      code.firstChild.data = 'short';
      await new Promise((resolve) => setTimeout(resolve, 150));
      const edited = read();
      code.innerHTML = 'a<br>b<br>c';
      await new Promise((resolve) => setTimeout(resolve, 150));
      const added = read();
      code.innerHTML = 'very long first line '.repeat(8) + '<br>x';
      await new Promise((resolve) => setTimeout(resolve, 150));
      const beforeResize = parseFloat(nums.firstElementChild.style.height);
      code.parentElement.style.width = '800px';
      await new Promise((resolve) => setTimeout(resolve, 150));
      const afterResize = parseFloat(nums.firstElementChild.style.height);
      return { options, initial, single, wrapped, edited, added, beforeResize, afterResize,
        removedCount: nums.children.length, lineHeight: nums.style.lineHeight };
    })()`);
    assert.deepEqual(result.options, [false, 'Border', true]);
    assert.deepEqual(result.initial, ['1', '2']);
    assert.equal(result.single, 'none');
    assert.ok(result.wrapped > 24, 'Wrapped first line must have extra spacing');
    assert.deepEqual(result.edited, ['1', '2'], 'Typing in an existing text node must refresh numbers');
    assert.deepEqual(result.added, ['1', '2', '3']);
    assert.equal(result.removedCount, 2);
    assert.ok(result.beforeResize > result.afterResize, 'Block resize must refresh wrapped heights');
    assert.equal(result.lineHeight, '24px');
    const sidebar = await evaluate(`(async () => {
      const api = __enhancerApi, core = (await api.getMods()).find(mod => mod._src === 'core');
      const fixture = document.createElement('div');
      fixture.innerHTML = '<div class="notion-app-inner"><aside class="notion-sidebar-container"><div class="notion-sidebar"></div></aside></div>';
      document.body.append(fixture);
      await (await import('../client.mjs')).default(api, await api.modDatabase(core.id));
      const initial = !!fixture.querySelector('.notion-sidebar .notion-enhancer--menu-button');
      fixture.querySelector('.notion-sidebar').remove();
      const replacement = document.createElement('div'); replacement.className = 'notion-sidebar';
      fixture.querySelector('.notion-sidebar-container').append(replacement);
      await new Promise(resolve => setTimeout(resolve, 300));
      return { initial, restored: !!replacement.querySelector('.notion-enhancer--menu-button') };
    })()`);
    assert.deepEqual(sidebar, { initial: true, restored: true });
    console.log('Passed: new MV3 menu, registry, profile options, single/multiline code, wrapping, resize and live text edits');
    console.log('Passed: sidebar fallback and restoration after remount');
    await send('Browser.close');
  } finally {
    clearTimeout(deadline);
    socket?.close(); browser.kill();
    await delay(500);
    assert.equal(path.dirname(temporary), path.join(root, 'dist'));
    fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
