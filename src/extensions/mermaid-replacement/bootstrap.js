'use strict';

// Isolated content script compatible with MV3. Insert an actual page script rather
// than relying on the manifest's world field being supported by the browser.
(() => {
  const modId = '9f44bd58-8f2b-47ee-aefb-6e6906e53210';
  const settingsAttribute = 'data-notion-enhancer-mermaid-settings';
  const statusAttribute = 'data-notion-enhancer-mermaid-status';
  const loaderAttribute = 'data-notion-enhancer-mermaid-loader';
  const source = chrome.runtime.getURL('extensions/mermaid-replacement/main-world.js');
  const loader = {
    version: '1.4.0', extensionId: chrome.runtime.id, source,
    phase: 'waiting-for-document', attempts: 0, nonceUsed: false,
    settingsLoaded: false, enabled: false, error: null
  };
  let settings, revision = 0, lastNonce, timeout;
  const publish = () => {
    const root = document.documentElement;
    if (!root) return;
    if (settings) root.setAttribute(settingsAttribute, JSON.stringify(settings));
    root.setAttribute(loaderAttribute, JSON.stringify(loader));
  };
  const acknowledge = () => {
    if (!document.documentElement?.getAttribute(statusAttribute)) return false;
    loader.phase = 'page-script-executed';
    loader.error = null;
    publish();
    clearTimeout(timeout);
    observer.disconnect();
    return true;
  };
  const inject = () => {
    const root = document.documentElement;
    if (!root) return;
    publish();
    if (acknowledge()) return;
    // Notion may enforce nonce-based CSP. Read the .nonce property: browsers
    // deliberately hide nonce values from getAttribute(). Retry when the
    // parser adds a nonce-bearing script after document_start.
    const nonce = [...document.querySelectorAll('script[nonce]')]
      .map((script) => script.nonce).find(Boolean) || '';
    if (loader.attempts && nonce === lastNonce) return;
    lastNonce = nonce;
    loader.attempts++;
    loader.nonceUsed = Boolean(nonce);
    loader.phase = 'loading-page-script';
    loader.error = null;
    publish();
    const script = document.createElement('script');
    script.id = 'notion-enhancer-mermaid-page-script';
    script.async = false;
    if (nonce) script.nonce = nonce;
    script.onload = () => {
      script.remove();
      if (!acknowledge()) {
        loader.phase = 'execution-failed';
        loader.error = 'Script loaded but no page-runtime handshake; inspect the console for an execution error.';
        publish();
      }
    };
    script.onerror = () => {
      script.remove();
      if (acknowledge()) return;
      loader.phase = 'load-failed';
      loader.error = 'Page script could not load. Check CSP errors and extension resource access; waiting for a page nonce.';
      publish();
      console.warn('[notion-enhancer/mermaid] page script load failed', source);
    };
    try {
      script.src = source;
      (document.head || root).appendChild(script);
    } catch (error) {
      loader.phase = 'injection-failed';
      loader.error = error.message;
      publish();
    }
  };
  const observer = new MutationObserver(inject);
  observer.observe(document, {
    subtree: true, childList: true, attributes: true,
    attributeFilter: ['nonce', statusAttribute]
  });
  timeout = setTimeout(() => {
    if (acknowledge()) return;
    loader.phase = 'timeout';
    loader.error = loader.error || 'No page-runtime handshake after 15 seconds; inspect the console and extension errors.';
    publish();
    observer.disconnect();
    console.error('[notion-enhancer/mermaid] injection timeout', loader);
  }, 15000);
  inject();

  const readSettings = async () => {
    const current = ++revision;
    try {
      const values = await chrome.storage.local.get(['activeProfile', 'profileIds', 'agreedToTerms']);
      const profile = values.activeProfile ?? values.profileIds?.[0] ?? 'default';
      const key = profile + '__enabledMods__' + modId;
      const enabled = (await chrome.storage.local.get(key))[key] === true &&
        values.agreedToTerms === chrome.runtime.getManifest().version;
      if (current !== revision) return;
      settings = { enabled, profile, error: null };
    } catch (error) {
      if (current !== revision) return;
      settings = { enabled: false, profile: 'default', error: error.message };
    }
    loader.settingsLoaded = true;
    loader.enabled = settings.enabled;
    if (settings.error) loader.error = settings.error;
    publish();
  };
  readSettings();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && Object.keys(changes).some((key) =>
      ['activeProfile', 'profileIds', 'agreedToTerms'].includes(key) || key.endsWith('__enabledMods__' + modId))) readSettings();
  });
})();
