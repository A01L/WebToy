'use strict';
const $ = (s) => document.querySelector(s);

(async () => {
  $('#ver').textContent = chrome.runtime.getManifest().version;
  const s = await chrome.storage.sync.get({ enabled: true, disabledSites: [] });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let host = '';
  let supported = false;
  try {
    const u = new URL(tab.url);
    host = u.hostname;
    supported = /^(https?|file):$/.test(u.protocol) && !/^(chrome|microsoftedge|chromewebstore)\.google\.com$/.test(u.hostname) && !u.href.startsWith('https://chromewebstore.google.com');
  } catch (e) {}

  const enabled = $('#enabled');
  const site = $('#site');
  enabled.checked = !!s.enabled;
  site.checked = !s.disabledSites.includes(host);
  $('#host').textContent = host || 'Недоступно';

  const paint = () => {
    $('#globalHint').textContent = enabled.checked ? 'Боковая панель видна на сайтах' : 'Панель выключена везде';
    site.closest('.row').classList.toggle('disabled', !enabled.checked || !supported || !host);
    $('.tools').classList.toggle('disabled', !supported);
    $('#note').hidden = supported;
  };
  paint();

  enabled.addEventListener('change', async () => {
    await chrome.storage.sync.set({ enabled: enabled.checked });
    paint();
  });
  site.addEventListener('change', async () => {
    const cur = (await chrome.storage.sync.get({ disabledSites: [] })).disabledSites;
    const next = site.checked ? cur.filter((x) => x !== host) : [...new Set([...cur, host])];
    await chrome.storage.sync.set({ disabledSites: next });
  });

  document.querySelectorAll('.tool').forEach((b) =>
    b.addEventListener('click', async () => {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'open', tool: b.dataset.tool });
        window.close();
      } catch (e) {
        $('#note').hidden = false;
        $('#note').textContent = 'Обновите страницу (F5), чтобы WebToy подключился к ней.';
      }
    })
  );

  $('#options').addEventListener('click', () => chrome.runtime.openOptionsPage());
})();
