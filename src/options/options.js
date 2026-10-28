'use strict';
const DEFAULTS = {
  enabled: true, disabledSites: [], side: 'left', offsetY: 50, autoCollapse: true,
  theme: 'dark', previewText: 'Здравствуй, Friend!', previewSize: 32, colorFormat: 'hex', showLabels: true
};
const $ = (s) => document.querySelector(s);
let savedT;
const flash = () => {
  const el = $('#saved');
  el.classList.add('in');
  clearTimeout(savedT);
  savedT = setTimeout(() => el.classList.remove('in'), 1200);
};
const save = async (obj) => {
  await chrome.storage.sync.set(obj);
  flash();
};

(async () => {
  $('#ver').textContent = chrome.runtime.getManifest().version;
  const s = { ...DEFAULTS, ...(await chrome.storage.sync.get(null)) };

  document.querySelectorAll('input[type=checkbox][data-key]').forEach((el) => {
    el.checked = !!s[el.dataset.key];
    el.addEventListener('change', () => save({ [el.dataset.key]: el.checked }));
  });
  document.querySelectorAll('.seg[data-key]').forEach((seg) => {
    const key = seg.dataset.key;
    const paint = (v) => seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    paint(s[key]);
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      paint(b.dataset.v);
      save({ [key]: b.dataset.v });
    });
  });
  const off = $('input[data-key=offsetY]');
  off.value = s.offsetY;
  $('#offsetVal').textContent = Math.round(s.offsetY) + '%';
  off.addEventListener('input', () => ($('#offsetVal').textContent = off.value + '%'));
  off.addEventListener('change', () => save({ offsetY: +off.value }));

  const pt = $('input[data-key=previewText]');
  pt.value = s.previewText;
  let t;
  pt.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => save({ previewText: pt.value || DEFAULTS.previewText }), 500);
  });

  // disabled sites
  const renderSites = (list) => {
    const box = $('#sites');
    box.textContent = '';
    if (!list.length) {
      box.innerHTML = '<span class="empty">Навигация работает на всех сайтах. Отключить её для отдельного сайта можно в меню расширения.</span>';
      return;
    }
    list.forEach((host) => {
      const chip = document.createElement('span');
      chip.className = 'site';
      chip.textContent = host;
      const x = document.createElement('button');
      x.title = 'Включить снова';
      x.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      x.onclick = async () => {
        const cur = (await chrome.storage.sync.get({ disabledSites: [] })).disabledSites.filter((h) => h !== host);
        await save({ disabledSites: cur });
        renderSites(cur);
      };
      chip.append(x);
      box.append(chip);
    });
  };
  renderSites(s.disabledSites || []);

  // palettes info
  const paintPal = async () => {
    const { wt_palettes = [], wt_history = [] } = await chrome.storage.local.get(['wt_palettes', 'wt_history']);
    const n = wt_palettes.reduce((a, p) => a + (p.colors || []).length, 0);
    $('#palInfo').textContent = `${wt_palettes.length} палитр(ы) · ${n} цветов · ${wt_history.length} в истории`;
    return { wt_palettes, wt_history };
  };
  await paintPal();
  $('#exportPal').onclick = async () => {
    const data = await paintPal();
    const blob = new Blob([JSON.stringify({ palettes: data.wt_palettes, history: data.wt_history }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'webtoy-palettes.json';
    a.click();
  };
  $('#clearPal').onclick = async () => {
    if (!confirm('Удалить все сохранённые палитры и историю цветов?')) return;
    await chrome.storage.local.set({ wt_palettes: [{ name: 'Моя палитра', colors: [] }], wt_history: [] });
    paintPal();
    flash();
  };

  // shortcuts
  const cmds = await chrome.commands.getAll();
  const keys = $('#keys');
  cmds.forEach((c) => {
    if (!c.description) return;
    const label = document.createElement('span');
    label.textContent = c.description;
    const k = document.createElement('kbd');
    k.textContent = c.shortcut || 'не назначено';
    keys.append(label, k);
  });
  $('#shortcuts').onclick = () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });

  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === 'sync' && ch.disabledSites) renderSites(ch.disabledSites.newValue || []);
    if (area === 'sync' && ch.offsetY) { off.value = ch.offsetY.newValue; $('#offsetVal').textContent = Math.round(ch.offsetY.newValue) + '%'; }
  });
})();
