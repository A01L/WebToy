/* WebToy - core helpers (shared namespace inside the content-script world) */
(() => {
  'use strict';
  if (window.__WT_LOADED__) return;
  const WT = (window.WT = window.WT || {});

  WT.DEFAULTS = {
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
  WT.settings = { ...WT.DEFAULTS };

  /* ---------- DOM ---------- */
  WT.h = function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  };

  WT.svg = function svg(name, size = 20) {
    const p = WT.ICONS[name] || '';
    const span = document.createElement('span');
    span.className = 'ico';
    span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
    return span;
  };

  /* Flat solid icons for the edge nav */
  WT.FILLED = {
    pipette: '<path d="M16.4 3.6a3 3 0 0 1 4.2 4.2l-2.2 2.2.7.7a1.1 1.1 0 0 1-1.55 1.55l-.6-.6-7.2 7.2a2.3 2.3 0 0 1-1.1.62l-2.4.55-1.25 1.25a1.1 1.1 0 0 1-1.55-1.55l1.25-1.25.55-2.4a2.3 2.3 0 0 1 .62-1.1l7.2-7.2-.6-.6a1.1 1.1 0 0 1 1.55-1.55l.7.7z"/>',
    gallery: '<rect x="3" y="3" width="8" height="8" rx="2.6"/><rect x="13" y="3" width="8" height="8" rx="2.6"/><rect x="3" y="13" width="8" height="8" rx="2.6"/><circle cx="17" cy="17" r="4.1"/>',
    fonts: '<path fill-rule="evenodd" d="M8.6 4h1.8c.5 0 .9.3 1.1.8l5.2 14a1.1 1.1 0 0 1-2.1.8L13.4 16.6H5.6l-1.2 3a1.1 1.1 0 0 1-2.1-.8l5.2-14c.2-.5.6-.8 1.1-.8zM6.4 14.4h6.2L9.5 6.2z"/><path fill-rule="evenodd" d="M19.2 10.2c-2.2 0-3.9 1.7-3.9 3.9s1.7 3.9 3.9 3.9c.7 0 1.3-.2 1.8-.5a1.05 1.05 0 0 0 2-.4v-3c0-2.2-1.6-3.9-3.8-3.9zm0 2c1.1 0 1.9.9 1.9 1.9s-.8 1.9-1.9 1.9-1.9-.8-1.9-1.9.8-1.9 1.9-1.9z"/>'
  };
  WT.svgFill = function svgFill(name, size = 24) {
    const span = document.createElement('span');
    span.className = 'ico';
    span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${WT.FILLED[name] || ''}</svg>`;
    return span;
  };

  WT.ICONS = {
    pipette: '<path d="M19.4 4.6a2.6 2.6 0 0 0-3.7 0l-2.3 2.3-1-1-1.6 1.6 1 1-7 7c-.4.4-.6.9-.6 1.4v1.6L3 20.5l.5.5 2-1.2h1.6c.5 0 1-.2 1.4-.6l7-7 1 1 1.6-1.6-1-1 2.3-2.3a2.6 2.6 0 0 0 0-3.7z"/><path d="M8.6 12.4h6"/>',
    gallery: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><path d="M13.5 19.5l2.6-3 1.8 2 1.3-1.4 1.8 2.4"/>',
    fonts: '<path d="M4 19l5-14h1l5 14"/><path d="M6 14h7"/><path d="M20 11.5v7.5"/><circle cx="17.6" cy="16.2" r="2.6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    download: '<path d="M12 4v11"/><path d="M7 10.5l5 5 5-5"/><path d="M5 20h14"/>',
    external: '<path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
    target: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 13h9l1-13"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.5a4.5 4.5 0 0 1-.5 10z"/><path d="M12 11v6M9.5 14.5L12 17l2.5-2.5"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9.5 14.5L12 17l2.5-2.5"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    swap: '<path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/>'
  };

  WT.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  WT.debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };
  WT.throttle = (fn, ms) => {
    let last = 0, t;
    return (...a) => {
      const now = Date.now();
      clearTimeout(t);
      if (now - last >= ms) {
        last = now;
        fn(...a);
      } else {
        t = setTimeout(() => {
          last = Date.now();
          fn(...a);
        }, ms - (now - last));
      }
    };
  };
  WT.escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  WT.formatBytes = (n) => {
    if (!n && n !== 0) return '';
    if (n < 1024) return n + ' Б';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' КБ';
    return (n / 1048576).toFixed(1) + ' МБ';
  };

  /* ---------- Messaging ---------- */
  WT.send = (msg) =>
    new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (res) => {
          if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
          else resolve(res || { ok: false });
        });
      } catch (e) {
        resolve({ ok: false, error: String(e) });
      }
    });

  /* ---------- Storage ---------- */
  WT.loadSettings = async () => {
    try {
      const s = await chrome.storage.sync.get(null);
      WT.settings = { ...WT.DEFAULTS, ...s };
    } catch (e) {}
    return WT.settings;
  };
  WT.saveSetting = async (key, value) => {
    WT.settings[key] = value;
    try {
      await chrome.storage.sync.set({ [key]: value });
    } catch (e) {}
  };
  WT.local = {
    async get(key, def) {
      try {
        const r = await chrome.storage.local.get(key);
        return r[key] === undefined ? def : r[key];
      } catch (e) {
        return def;
      }
    },
    async set(key, value) {
      try {
        await chrome.storage.local.set({ [key]: value });
      } catch (e) {}
    }
  };

  /* ---------- Clipboard ---------- */
  WT.copy = async (text, label) => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.documentElement.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch (_) {}
      ta.remove();
    }
    WT.toast(ok ? (label ? `Скопировано: ${label}` : 'Скопировано') : 'Не удалось скопировать', ok ? 'ok' : 'err');
    return ok;
  };

  /* ---------- Downloads ---------- */
  WT.download = async (url, filename) => {
    if (!url) return;
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'webtoy-file';
      document.documentElement.appendChild(a);
      a.click();
      a.remove();
      WT.toast('Загрузка начата', 'ok');
      return;
    }
    const r = await WT.send({ type: 'download', url, filename });
    WT.toast(r.ok ? 'Загрузка начата' : 'Ошибка загрузки: ' + (r.error || ''), r.ok ? 'ok' : 'err');
  };

  WT.fileNameFromUrl = (url, fallback = 'file') => {
    try {
      if (url.startsWith('data:')) {
        const m = /^data:([^;,]+)/.exec(url);
        const ext = m ? (m[1].split('/')[1] || 'bin').replace('svg+xml', 'svg').replace('jpeg', 'jpg') : 'bin';
        return `${fallback}.${ext}`;
      }
      const u = new URL(url, location.href);
      let name = decodeURIComponent(u.pathname.split('/').pop() || '') || fallback;
      return name.slice(0, 100);
    } catch (e) {
      return fallback;
    }
  };

  WT.absUrl = (url, base) => {
    try {
      return new URL(url, base || location.href).href;
    } catch (e) {
      return url;
    }
  };

  /* ---------- Toasts ---------- */
  WT.toast = (text, kind = 'ok') => {
    if (!WT.layer) return;
    const t = WT.h('div', { class: `toast ${kind}` }, WT.svg(kind === 'err' ? 'close' : 'check', 16), WT.h('span', { text }));
    WT.toastBox.append(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => {
      t.classList.remove('in');
      setTimeout(() => t.remove(), 300);
    }, 2200);
  };

  /* ---------- Small reusable controls ---------- */
  WT.toggle = (checked, onChange, label) => {
    const input = WT.h('input', { type: 'checkbox' });
    input.checked = !!checked;
    input.addEventListener('change', () => onChange(input.checked));
    return WT.h('label', { class: 'switch' }, input, WT.h('i'), label ? WT.h('span', { text: label }) : null);
  };

  WT.iconBtn = (icon, title, onClick, extra = '') =>
    WT.h('button', { class: `ibtn ${extra}`, title, 'aria-label': title, onclick: onClick }, WT.svg(icon, 18));

  /* Dropdown menu anchored to a button */
  WT.menu = (anchor, items) => {
    WT.closeMenu();
    const r = anchor.getBoundingClientRect();
    const m = WT.h(
      'div',
      { class: 'menu' },
      items.map((it) =>
        it === '-'
          ? WT.h('div', { class: 'menu-sep' })
          : WT.h(
              'button',
              {
                class: 'menu-item' + (it.disabled ? ' disabled' : ''),
                onclick: (e) => {
                  e.stopPropagation();
                  if (it.disabled) return;
                  WT.closeMenu();
                  it.action();
                }
              },
              it.icon ? WT.svg(it.icon, 16) : null,
              WT.h('span', { class: 'menu-txt' }, WT.h('b', { text: it.label }), it.hint ? WT.h('small', { text: it.hint }) : null)
            )
      )
    );
    WT.layer.append(m);
    const mw = m.offsetWidth, mh = m.offsetHeight;
    let left = r.right - mw;
    if (left < 8) left = r.left;
    let top = r.bottom + 6;
    if (top + mh > innerHeight - 8) top = r.top - mh - 6;
    m.style.left = WT.clamp(left, 8, innerWidth - mw - 8) + 'px';
    m.style.top = WT.clamp(top, 8, innerHeight - mh - 8) + 'px';
    requestAnimationFrame(() => m.classList.add('in'));
    WT._menu = m;
    setTimeout(() => {
      WT._menuClose = (e) => {
        if (!e.composedPath().includes(m)) WT.closeMenu();
      };
      window.addEventListener('pointerdown', WT._menuClose, true);
    });
  };
  WT.closeMenu = () => {
    if (WT._menu) WT._menu.remove();
    WT._menu = null;
    if (WT._menuClose) window.removeEventListener('pointerdown', WT._menuClose, true);
    WT._menuClose = null;
  };

  /* Walk all elements including open shadow roots */
  WT.walkElements = function* (root = document.documentElement, limit = 25000) {
    let count = 0;
    const stack = [root];
    while (stack.length) {
      const node = stack.pop();
      if (!node || node === WT.host) continue;
      if (node.nodeType === 1) {
        yield node;
        if (++count > limit) return;
        if (node.shadowRoot && node.shadowRoot.mode === 'open') {
          const ch = node.shadowRoot.children;
          for (let i = ch.length - 1; i >= 0; i--) stack.push(ch[i]);
        }
      }
      const ch = node.children;
      if (ch) for (let i = ch.length - 1; i >= 0; i--) stack.push(ch[i]);
    }
  };

  WT.isInViewport = (el) => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    return r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  };

  /* Temporary on-page highlight of elements */
  WT.highlight = (els, color = '#8b7bff') => {
    const list = (Array.isArray(els) ? els : [els]).filter((e) => e && e.isConnected);
    if (!list.length) return;
    list[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    setTimeout(() => {
      const boxes = list.slice(0, 60).map((el) => {
        const r = el.getBoundingClientRect();
        const b = WT.h('div', { class: 'hl' });
        Object.assign(b.style, {
          left: r.left - 4 + 'px',
          top: r.top - 4 + 'px',
          width: r.width + 8 + 'px',
          height: r.height + 8 + 'px',
          '--hl': color
        });
        b.style.setProperty('--hl', color);
        WT.layer.append(b);
        return b;
      });
      setTimeout(() => boxes.forEach((b) => b.classList.add('out')), 1400);
      setTimeout(() => boxes.forEach((b) => b.remove()), 1900);
    }, 380);
  };
})();
