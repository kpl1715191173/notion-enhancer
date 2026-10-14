'use strict';

// Exercise the actual isolated-world bootstrap and page-script bridge in a
// temporary MV3 harness (current installed browsers no longer load MV2).
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const workspace = path.resolve(__dirname, '..');
assert.ok(globalThis.WebSocket, 'Browser tests require Node.js 22 or newer');
fs.mkdirSync(path.join(workspace, 'dist'), { recursive: true });
const temporary = fs.mkdtempSync(path.join(workspace, 'dist/.mermaid-browser-test-'));
const extension = path.join(temporary, 'extension');
const profile = path.join(temporary, 'profile');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  fs.mkdirSync(path.join(extension, 'extensions/mermaid-replacement'), { recursive: true });
  for (const file of ['bootstrap.js', 'main-world.js']) {
    fs.copyFileSync(path.join(workspace, 'src/extensions/mermaid-replacement', file), path.join(extension, 'extensions/mermaid-replacement', file));
  }
  fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify({
    manifest_version: 3, name: 'Mermaid injection regression harness', version: '1.0.0',
    permissions: ['storage'],
    background: { service_worker: 'worker.js' },
    content_scripts: [{ matches: ['http://127.0.0.1/*'],
      js: ['extensions/mermaid-replacement/bootstrap.js'], run_at: 'document_start' }],
    web_accessible_resources: [{ resources: ['extensions/mermaid-replacement/main-world.js'],
      matches: ['http://127.0.0.1/*'] }]
  }));
  fs.writeFileSync(path.join(extension, 'worker.js'), 'chrome.runtime.onInstalled.addListener(() => {});');
  const server = http.createServer((request, response) => {
    if (request.url === '/browser-test.js') {
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      response.end(fs.readFileSync(path.join(__dirname, 'fixtures/mermaid-browser.js')));
      return;
    }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Content-Security-Policy',
      "script-src 'nonce-ne-regression' 'strict-dynamic'; style-src 'unsafe-inline'; object-src 'none'");
    response.end('<!doctype html><html><head><meta charset="utf-8">' +
      '<script nonce="ne-regression">' + fs.readFileSync(path.join(__dirname, 'fixtures/preloaded-runtime.js'), 'utf8') + '</script>' +
      '<script nonce="ne-regression" src="/browser-test.js" defer></script>' +
      '</head><body><pre id="results">RUNNING</pre><div id="diagram"></div></body></html>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browserPath = process.argv[2] || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const activePort = path.join(profile, 'DevToolsActivePort');
  if (fs.existsSync(activePort)) fs.unlinkSync(activePort);
  const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    for (let attempt = 0; !fs.existsSync(activePort) && attempt < 100; attempt++) await delay(100);
    assert.ok(fs.existsSync(activePort), 'Browser did not start CDP');
    const [port, endpoint] = fs.readFileSync(activePort, 'utf8').trim().split(/\r?\n/);
    socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let sequence = 0;
    const pending = new Map();
    socket.addEventListener('message', ({ data }) => {
      const result = JSON.parse(data);
      if (result.id && pending.has(result.id)) {
        const { resolve, reject } = pending.get(result.id);
        pending.delete(result.id);
        result.error ? reject(new Error(JSON.stringify(result.error))) : resolve(result.result);
      }
    });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
    let worker;
    for (let attempt = 0; !worker && attempt < 50; attempt++) {
      worker = (await send('Target.getTargets')).targetInfos.find((target) =>
        target.type === 'service_worker' && target.url.endsWith('/worker.js'));
      if (!worker) await delay(100);
    }
    assert.ok(worker, 'Settings worker did not load');
    const { sessionId: workerSession } = await send('Target.attachToTarget', { targetId: worker.targetId, flatten: true });
    await send('Runtime.enable', {}, workerSession);
    let storageReady;
    for (let attempt = 0; !storageReady && attempt < 50; attempt++) {
      const result = await send('Runtime.evaluate', { expression: 'typeof chrome !== "undefined" && Boolean(chrome.storage)', returnByValue: true }, workerSession);
      storageReady = result.result.value;
      if (!storageReady) await delay(100);
    }
    assert.ok(storageReady, 'Extension storage API did not initialize');
    const settings = await send('Runtime.evaluate', { expression: `chrome.storage.local.set({
      agreedToTerms: '1.0.0', 'default__enabledMods__9f44bd58-8f2b-47ee-aefb-6e6906e53210': true
    })`, awaitPromise: true, returnByValue: true }, workerSession);
    assert.ok(!settings.exceptionDetails, JSON.stringify(settings.exceptionDetails));
    const { targetId } = await send('Target.createTarget', {
      url: `http://127.0.0.1:${server.address().port}/?${process.argv[3] || 'layout=elk'}`
    });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    let outcome;
    for (let attempt = 0; attempt < 40; attempt++) {
      await delay(500);
      const evaluation = await send('Runtime.evaluate', { expression: `JSON.stringify({
        result: document.getElementById('results')?.textContent,
        loader: document.documentElement?.getAttribute('data-notion-enhancer-mermaid-loader'),
        status: window.__notionEnhancerMermaid
      })`, returnByValue: true }, sessionId);
      if (!evaluation.result.value) continue;
      outcome = JSON.parse(evaluation.result.value);
      if (outcome.result && outcome.result !== 'RUNNING') break;
    }
    const loader = JSON.parse(outcome?.loader || 'null');
    const result = outcome?.result && outcome.result !== 'RUNNING' ? JSON.parse(outcome.result) : null;
    if (!result?.passed) console.error(JSON.stringify({ loader, result }, null, 2));
    assert.equal(result?.passed, true, 'Page bridge or actual mindmap render failed');
    assert.equal(loader?.phase, 'page-script-executed');
    assert.equal(loader?.enabled, true, 'Actual profile setting must enable Mermaid');
    assert.equal(loader?.nonceUsed, true, 'Nonce-based CSP was not exercised');
    assert.equal(result?.recoveredCachedModule, true);
    console.log('Passed: MV3 profile bridge, nonce CSP injection, cached-module recovery, Chinese mindmap and layout fallback');
    await send('Browser.close');
  } finally {
    socket?.close();
    browser.kill();
    server.close();
    await delay(500);
    assert.equal(path.dirname(temporary), path.join(workspace, 'dist'));
    fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
