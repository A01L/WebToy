/* WebToy - app bootstrap: host element, sidebar manager, tool routing */
(() => {
  'use strict';
  if (window.__WT_LOADED__) return;
  window.__WT_LOADED__ = true;
  if (window.top !== window) return;
  if (!(document.documentElement instanceof HTMLElement)) return; // skip XML/SVG documents

  const WT = window.WT;
  const { h } = WT;

  const TOOL_META = {
    gallery: { title: 'Галерея', icon: 'gallery', color: 'var(--gal)', mod: () => WT.Gallery },
    fonts: { title: 'Шрифты', icon: 'fonts', color: 'var(--fon)', mod: () => WT.Fonts }
  };

  const App = (WT.App = {
    sidebarTool: null,
    sidebarEl: null,
    visible: false,

    async init() {
      await WT.loadSettings();

      const host = document.createElement('webtoy-root');
      host.setAttribute('style', 'all:initial!important;position:fixed!important;top:0!important;left:0!important;width:0!important;height:0!important;z-index:2147483647!important;display:block!important;pointer-events:none!important;');
      const shadow = host.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = WT.CSS;
      const layer = h('div', { class: 'wt' });
      const toastBox = h('div', { class: 'toasts' });
      layer.append(toastBox);
      shadow.append(style, layer);

      WT.host = host;
      WT.shadow = shadow;
      WT.layer = layer;
      WT.toastBox = toastBox;

      layer.append(WT.Nav.create());
      this.applyTheme();
      WT.Nav.layout();

      // Put the UI into the browser top layer (popover API) so no page z-index
      // (YouTube masthead/guide, sticky headers…) can cover it or steal clicks.
      try { host.setAttribute('popover', 'manual'); } catch (e) {}
      WT.raise = () => {
        if (!host.isConnected || typeof host.showPopover !== 'function') return;
        try {
          if (host.matches(':popover-open')) host.hidePopover();
          host.showPopover();
        } catch (e) {}
      };
      const mount = () => {
        if (!host.isConnected) {
          document.documentElement.appendChild(host);
          WT.raise();
        }
      };
      mount();
      // Some SPAs wipe <html> children - keep our host attached.
      new MutationObserver(WT.debounce(mount, 300)).observe(document.documentElement, { childList: true });

      this.applyVisibility();

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;
        for (const k in changes) WT.settings[k] = changes[k].newValue;
        this.applyTheme();
        WT.Nav.layout();
        this.applyVisibility();
        if (WT.Picker && WT.Picker.onSettings) WT.Picker.onSettings();
      });

      chrome.runtime.onMessage.addListener((msg, _s, send) => {
        if (msg && msg.type === 'open') {
          this.ensureVisibleForTool();
          this.openTool(msg.tool);
          send({ ok: true });
        } else if (msg && msg.type === 'ping') {
          send({ ok: true, visible: this.visible });
        }
      });

      window.addEventListener('resize', WT.throttle(() => {
        WT.Nav.applyPosition();
        this.updateShift();
        if (WT.Picker) WT.Picker.reposition && WT.Picker.reposition();
      }, 100));

      window.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (WT._menu) return WT.closeMenu();
        if (WT.Gallery && WT.Gallery.closeLightbox && WT.Gallery.lightbox) return WT.Gallery.closeLightbox();
        if (WT.Picker && WT.Picker.isOpen) return WT.Picker.close();
        if (this.sidebarTool) return this.closeSidebar();
      }, true);

      const mq = matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener && mq.addEventListener('change', () => this.applyTheme());
    },

    siteDisabled() {
      return (WT.settings.disabledSites || []).includes(location.hostname);
    },

    applyVisibility() {
      const v = !!WT.settings.enabled && !this.siteDisabled();
      this.visible = v;
      WT.Nav.setVisible(v);
      if (!v) {
        this.closeSidebar();
        if (WT.Picker && WT.Picker.isOpen) WT.Picker.close();
      }
    },

    // Opening a tool via hotkey/popup works even if the nav is hidden
    ensureVisibleForTool() {},

    applyTheme() {
      let t = WT.settings.theme || 'dark';
      if (t === 'auto') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      WT.layer.dataset.theme = t;
    },

    refreshActive() {
      const list = [];
      if (WT.Picker && WT.Picker.isOpen) list.push('picker');
      if (this.sidebarTool) list.push(this.sidebarTool);
      WT.Nav.setActive(list);
    },

    toggleTool(id) {
      if (id === 'picker') {
        WT.Picker.toggle();
        return;
      }
      if (this.sidebarTool === id) this.closeSidebar();
      else this.openSidebar(id);
    },

    openTool(id) {
      if (id === 'picker') {
        if (!WT.Picker.isOpen) WT.Picker.open();
        return;
      }
      if (this.sidebarTool !== id) this.openSidebar(id);
    },

    /* ---------- Sidebar ---------- */
    buildSidebar(id) {
      const meta = TOOL_META[id];
      const sub = h('small', { text: location.hostname || document.title });
      const actions = h('div', { style: { display: 'flex', gap: '2px' } });
      const sb = h(
        'aside',
        { class: 'sidebar', 'aria-label': meta.title },
        h(
          'div',
          { class: 'sb-head' },
          h('div', { class: 'chip-ico', style: { '--c': meta.color } }, WT.svg(meta.icon, 22)),
          h('div', { class: 'sb-title' }, h('b', { text: meta.title }), sub),
          actions,
          WT.iconBtn('close', 'Закрыть (Esc)', () => this.closeSidebar())
        )
      );
      sb.querySelector('.chip-ico').style.setProperty('--c', meta.color);
      sb.style.setProperty('--c', meta.color);
      return { sb, sub, actions };
    },

    openSidebar(id) {
      const meta = TOOL_META[id];
      if (!meta) return;
      const prevTool = this.sidebarTool;
      const prevEl = this.sidebarEl;
      if (prevTool) {
        meta && TOOL_META[prevTool].mod().unmount && TOOL_META[prevTool].mod().unmount();
        prevEl.classList.remove('open');
        setTimeout(() => prevEl.remove(), 500);
      }
      const parts = this.buildSidebar(id);
      this.sidebarEl = parts.sb;
      this.sidebarTool = id;
      WT.layer.append(parts.sb);
      WT.raise && WT.raise();
      meta.mod().mount(parts);
      // double rAF so the transition runs
      requestAnimationFrame(() => requestAnimationFrame(() => parts.sb.classList.add('open')));
      this.updateShift();
      this.refreshActive();
    },

    closeSidebar() {
      if (!this.sidebarTool) return;
      const mod = TOOL_META[this.sidebarTool].mod();
      mod.unmount && mod.unmount();
      const el = this.sidebarEl;
      el.classList.remove('open');
      setTimeout(() => el.remove(), 500);
      this.sidebarTool = null;
      this.sidebarEl = null;
      this.updateShift();
      this.refreshActive();
    },

    sidebarWidth() {
      return this.sidebarEl ? Math.min(420, innerWidth * 0.94) : 0;
    },

    updateShift() {
      WT.Nav.setShift(this.sidebarWidth());
      if (WT.Picker && WT.Picker.reposition) WT.Picker.reposition();
    }
  });

  const start = () => App.init().catch((e) => console.warn('[WebToy]', e));
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
