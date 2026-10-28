/* WebToy - service worker */
'use strict';

const DEFAULTS = {
  enabled: true,
  disabledSites: [],
  side: 'left',
  offsetY: 50,
  autoCollapse: true,
  theme: 'dark',
  previewText: 'Здравствуй, Friend!',
  previewSize: 32,
  colorFormat: 'hex',
  showLabels: true
};

chrome.runtime.onInstalled.addListener(async (details) => {
  const cur = await chrome.storage.sync.get(null);
  const merged = { ...DEFAULTS, ...cur };
  await chrome.storage.sync.set(merged);
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage().catch(() => {});
  }
});

function safeName(name) {
  return String(name || 'file')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'file';
}

async function fetchText(url) {
  const r = await fetch(url, { credentials: 'omit' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return await r.text();
}

async function urlExists(url) {
  try {
    const r = await fetch(url, { method: 'GET', credentials: 'omit' });
    return r.ok;
  } catch (e) {
    return false;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg && msg.type) {
        case 'download': {
          const opts = { url: msg.url, saveAs: !!msg.saveAs, conflictAction: 'uniquify' };
          if (msg.filename) {
            const parts = String(msg.filename).split('/').map(safeName).filter((p) => p && p !== '.' && p !== '..');
            opts.filename = ['WebToy', ...parts].join('/');
          }
          const id = await chrome.downloads.download(opts);
          sendResponse({ ok: true, id });
          break;
        }
        case 'fetchText': {
          sendResponse({ ok: true, text: await fetchText(msg.url) });
          break;
        }
        case 'urlExists': {
          sendResponse({ ok: true, exists: await urlExists(msg.url) });
          break;
        }
        case 'capture': {
          const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
          sendResponse({ ok: true, dataUrl });
          break;
        }
        case 'openOptions': {
          await chrome.runtime.openOptionsPage();
          sendResponse({ ok: true });
          break;
        }
        case 'openTab': {
          await chrome.tabs.create({ url: msg.url, index: sender.tab ? sender.tab.index + 1 : undefined });
          sendResponse({ ok: true });
          break;
        }
        default:
          sendResponse({ ok: false, error: 'unknown message' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e && e.message || e) });
    }
  })();
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  if (command === 'toggle-nav') {
    const { enabled = true } = await chrome.storage.sync.get('enabled');
    await chrome.storage.sync.set({ enabled: !enabled });
    return;
  }
  const map = { 'open-picker': 'picker', 'open-gallery': 'gallery', 'open-fonts': 'fonts' };
  if (map[command]) {
    chrome.tabs.sendMessage(tab.id, { type: 'open', tool: map[command] }).catch(() => {});
  }
});
