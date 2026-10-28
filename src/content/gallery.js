/* WebToy - Gallery: every image of the page (img, backgrounds, covers, svg, posters…) */
(() => {
  'use strict';
  const WT = window.WT;
  const { h } = WT;

  const KIND_LABEL = { img: 'IMG', bg: 'ФОН', svg: 'SVG', poster: 'ВИДЕО', canvas: 'CANVAS', icon: 'ИКОНКА', meta: 'META', css: 'CSS' };
  const URL_RE = /url\(\s*(['"]?)(.*?)\1\s*\)/g;

  function urlsFromCss(value) {
    const out = [];
    if (!value || value === 'none' || value.indexOf('url(') < 0) return out;
    let m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(value))) {
      const u = m[2].trim();
      if (u && !u.startsWith('#')) out.push(u);
    }
    return out;
  }

  function svgToDataUrl(svg) {
    try {
      const clone = svg.cloneNode(true);
      const cs = getComputedStyle(svg);
      const r = svg.getBoundingClientRect();
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      if (!clone.getAttribute('width') && r.width) clone.setAttribute('width', Math.round(r.width));
      if (!clone.getAttribute('height') && r.height) clone.setAttribute('height', Math.round(r.height));
      clone.style.color = cs.color;
      if (!clone.getAttribute('fill') && cs.fill && cs.fill !== 'none') clone.setAttribute('fill', cs.fill);
      // inline <use href="#sprite-id"> references so sprite icons render standalone
      const uses = clone.querySelectorAll('use');
      if (uses.length) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const seen = new Set();
        uses.forEach((u) => {
          const ref = u.getAttribute('href') || u.getAttribute('xlink:href') || '';
          if (!ref.startsWith('#') || seen.has(ref)) return;
          seen.add(ref);
          const target = document.getElementById(ref.slice(1));
          if (target) defs.append(target.cloneNode(true));
        });
        if (defs.childNodes.length) clone.prepend(defs);
      }
      const str = new XMLSerializer().serializeToString(clone);
      if (str.length > 400000) return null;
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
    } catch (e) {
      return null;
    }
  }

  function collect() {
    const items = new Map();
    const add = (rawUrl, kind, el, extra) => {
      if (!rawUrl) return;
      let url = rawUrl;
      if (!url.startsWith('data:') && !url.startsWith('blob:')) url = WT.absUrl(url);
      if (url.startsWith('data:') && url.length < 80 && !url.startsWith('data:image')) return;
      if (/^data:image\/gif;base64,R0lGODlhAQABA/i.test(url)) return; // 1×1 spacer gifs
      let it = items.get(url);
      if (!it) {
        it = { key: url, url, kind, els: [], w: 0, h: 0, alt: '' };
        items.set(url, it);
      }
      if (el && !it.els.includes(el)) it.els.push(el);
      if (extra) Object.assign(it, Object.fromEntries(Object.entries(extra).filter(([, v]) => v)));
    };

    const root = document.body || document.documentElement;
    for (const el of WT.walkElements(root, 30000)) {
      const tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE' || tag === 'HEAD') continue;

      if (tag === 'IMG') {
        const src = el.currentSrc || el.src;
        const lazy = el.getAttribute('data-src') || el.getAttribute('data-lazy-src') || el.getAttribute('data-original');
        if (src) add(src, 'img', el, { w: el.naturalWidth, h: el.naturalHeight, alt: el.alt });
        if (lazy && (!src || src.startsWith('data:'))) add(lazy, 'img', el, { alt: el.alt });
      } else if (tag === 'VIDEO' && el.poster) {
        add(el.poster, 'poster', el);
      } else if (tag === 'INPUT' && el.type === 'image' && el.src) {
        add(el.src, 'img', el);
      } else if (tag === 'CANVAS') {
        if (el.width >= 32 && el.height >= 32) {
          try {
            add(el.toDataURL('image/png'), 'canvas', el, { w: el.width, h: el.height });
          } catch (e) {}
        }
      } else if (tag.toLowerCase() === 'svg' && !(el.parentElement && el.parentElement.closest('svg'))) {
        const r = el.getBoundingClientRect();
        if (r.width >= 12 && r.height >= 12) {
          const data = svgToDataUrl(el);
          if (data) add(data, 'svg', el, { w: Math.round(r.width), h: Math.round(r.height), alt: el.getAttribute('aria-label') || '' });
        }
        continue;
      } else if (tag.toLowerCase() === 'image' && el instanceof SVGElement) {
        const href = el.getAttribute('href') || el.getAttribute('xlink:href');
        if (href) add(href, 'img', el);
      }

      // CSS images: background, pseudo elements, border-image, list markers, content
      const cs = getComputedStyle(el);
      for (const u of urlsFromCss(cs.backgroundImage)) add(u, 'bg', el);
      if (cs.borderImageSource !== 'none') for (const u of urlsFromCss(cs.borderImageSource)) add(u, 'css', el);
      if (cs.listStyleImage !== 'none') for (const u of urlsFromCss(cs.listStyleImage)) add(u, 'css', el);
      if (cs.maskImage && cs.maskImage !== 'none') for (const u of urlsFromCss(cs.maskImage)) add(u, 'css', el);
      for (const pseudo of ['::before', '::after']) {
        const ps = getComputedStyle(el, pseudo);
        if (ps.content === 'none' && ps.backgroundImage === 'none') continue;
        for (const u of urlsFromCss(ps.backgroundImage)) add(u, 'bg', el);
        for (const u of urlsFromCss(ps.content)) add(u, 'css', el);
      }
    }

    // <html> / <body> backgrounds
    for (const el of [document.documentElement, document.body]) {
      if (!el) continue;
      for (const u of urlsFromCss(getComputedStyle(el).backgroundImage)) add(u, 'bg', el);
    }

    // meta images & icons (not tied to a visible element)
    document.querySelectorAll('meta[property="og:image"], meta[name="og:image"], meta[name="twitter:image"], meta[property="twitter:image"]').forEach((m) => {
      if (m.content) add(m.content, 'meta', null, { alt: 'Обложка (Open Graph)' });
    });
    document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="mask-icon"]').forEach((l) => {
      if (l.href) add(l.href, 'icon', null, { alt: 'Иконка сайта' });
    });
    return [...items.values()];
  }

  const Gallery = (WT.Gallery = {
    items: [],
    tiles: new Map(),
    onlyVisible: false,
    filter: 'all',
    lightbox: null,

    async mount({ sb, sub, actions }) {
      this.onlyVisible = await WT.local.get('wt_gal_visible', false);
      this.sb = sb;
      this.sub = sub;
      this.tiles = new Map();

      actions.append(
        WT.iconBtn('download', 'Скачать все показанные', () => this.downloadAll()),
        WT.iconBtn('refresh', 'Пересканировать', () => this.scan(true))
      );

      const segBtns = {};
      const seg = h('div', { class: 'seg' }, [
        ['all', 'Все'], ['img', 'IMG'], ['bg', 'Фоны'], ['svg', 'SVG']
      ].map(([k, l]) => (segBtns[k] = h('button', { class: this.filter === k ? 'on' : '', text: l, onclick: () => {
        this.filter = k;
        Object.entries(segBtns).forEach(([kk, b]) => b.classList.toggle('on', kk === k));
        this.render();
      } }))));

      const tgl = WT.toggle(this.onlyVisible, (v) => {
        this.onlyVisible = v;
        WT.local.set('wt_gal_visible', v);
        this.render();
      }, 'Только в зоне видимости');
      tgl.style.setProperty('--c', 'var(--gal)');

      const tools = h('div', { class: 'sb-tools' }, h('div', { class: 'g-filters' }, tgl), h('div', { class: 'g-filters', style: { marginTop: '10px' } }, seg, this.countEl = h('span', { class: 'g-count' })));
      tools.style.flexDirection = 'column';
      tools.style.alignItems = 'stretch';
      this.grid = h('div', { class: 'grid' });
      this.body = h('div', { class: 'sb-body' }, h('div', { class: 'spinner', style: { '--c': 'var(--gal)' } }), this.grid);
      sb.append(tools, this.body);

      this.onScroll = WT.throttle(() => this.onlyVisible && this.render(), 160);
      window.addEventListener('scroll', this.onScroll, { passive: true, capture: true });
      window.addEventListener('resize', this.onScroll, { passive: true });
      this.mo = new MutationObserver(WT.debounce((recs) => this.scan(), 900));
      this.mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'srcset', 'style', 'class', 'poster'] });
      this.loadHandler = WT.debounce(() => this.scan(), 600);
      document.addEventListener('load', this.loadHandler, true);

      setTimeout(() => this.scan(true), 30);
    },

    unmount() {
      window.removeEventListener('scroll', this.onScroll, { capture: true });
      window.removeEventListener('resize', this.onScroll);
      document.removeEventListener('load', this.loadHandler, true);
      this.mo && this.mo.disconnect();
      this.closeLightbox();
      this.sb = null;
    },

    scan(force) {
      if (!this.sb) return;
      this.items = collect();
      const sp = this.body.querySelector('.spinner');
      if (sp) sp.remove();
      this.render(force);
    },

    visibleList() {
      let list = this.items;
      if (this.filter !== 'all') list = list.filter((it) => (this.filter === 'bg' ? it.kind === 'bg' || it.kind === 'css' : this.filter === 'img' ? ['img', 'poster', 'canvas', 'meta', 'icon'].includes(it.kind) : it.kind === this.filter));
      if (this.onlyVisible) {
        list = list.filter((it) => it.els.some((el) => WT.isInViewport(el)));
        // order by position on screen
        list = list.slice().sort((a, b) => {
          const ra = a.els.find(WT.isInViewport).getBoundingClientRect(), rb = b.els.find(WT.isInViewport).getBoundingClientRect();
          return ra.top - rb.top || ra.left - rb.left;
        });
      }
      return list;
    },

    render(force) {
      if (!this.sb) return;
      const list = this.visibleList();
      const sig = list.map((x) => x.key).join('\n');
      this.current = list;
      this.countEl.innerHTML = `<b>${list.length}</b> из ${this.items.length}`;
      this.sub.textContent = `${this.items.length} изображений · ${location.hostname}`;
      if (!force && sig === this.lastSig) return;
      this.lastSig = sig;

      if (!list.length) {
        this.grid.replaceChildren();
        if (!this.emptyEl) {
          this.emptyEl = h('div', { class: 'empty' }, WT.svg('image', 26), h('b'), h('span', { class: 'etxt' }));
        }
        this.emptyEl.querySelector('b').textContent = this.onlyVisible ? 'В зоне видимости пусто' : 'Изображений не найдено';
        this.emptyEl.querySelector('.etxt').textContent = this.onlyVisible ? 'Прокрутите страницу или выключите фильтр' : 'Попробуйте пересканировать страницу';
        this.grid.after(this.emptyEl);
        return;
      }
      if (this.emptyEl) this.emptyEl.remove();
      const frag = list.map((it, i) => this.tile(it, i));
      this.grid.replaceChildren(...frag);
    },

    tile(it) {
      let t = this.tiles.get(it.key);
      if (t) {
        t._item = it;
        return t;
      }
      const img = h('img', { loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer-when-downgrade', alt: it.alt || '', draggable: 'false' });
      const dim = h('div', { class: 'tdim' });
      const setDim = () => {
        const w = it.w || img.naturalWidth, hh = it.h || img.naturalHeight;
        if (w) dim.textContent = `${w}×${hh}`;
      };
      img.addEventListener('load', () => {
        if (!it.w) { it.w = img.naturalWidth; it.h = img.naturalHeight; }
        setDim();
        if (img.naturalWidth < 64 && img.naturalHeight < 64) t.classList.add('contain');
      });
      img.addEventListener('error', () => {
        // retry once without referrer policy tweaks; otherwise hide broken tile
        if (!img._retry) { img._retry = true; img.removeAttribute('referrerpolicy'); img.src = it.url; return; }
        t.classList.add('broken');
      });
      img.src = it.url;
      if (it.kind === 'svg' || it.kind === 'icon') t && t.classList.add('contain');
      const acts = h('div', { class: 'tacts' },
        h('button', { title: 'Скачать', onclick: (e) => { e.stopPropagation(); this.downloadItem(t._item); } }, WT.svg('download', 14)),
        h('button', { title: 'Копировать ссылку', onclick: (e) => { e.stopPropagation(); this.copyUrl(t._item); } }, WT.svg('copy', 14)),
        it.els.length ? h('button', { title: 'Показать на странице', onclick: (e) => { e.stopPropagation(); WT.highlight(t._item.els, '#c95cf5'); } }, WT.svg('target', 14)) : null
      );
      t = h('div', { class: 'tile' + (it.kind === 'svg' || it.kind === 'icon' ? ' contain' : ''), title: it.alt || WT.fileNameFromUrl(it.url, 'image'), onclick: () => this.openLightbox(t._item) },
        img, h('span', { class: 'tbadge', text: KIND_LABEL[it.kind] || 'IMG' }), dim, acts);
      t._item = it;
      setDim();
      this.tiles.set(it.key, t);
      return t;
    },

    fileName(it) {
      let name = WT.fileNameFromUrl(it.url, (location.hostname || 'image') + '-' + it.kind);
      if (!/\.[a-z0-9]{2,5}$/i.test(name)) {
        const ext = it.kind === 'svg' ? 'svg' : it.kind === 'canvas' ? 'png' : 'jpg';
        name += '.' + ext;
      }
      return name;
    },

    downloadItem(it) {
      WT.download(it.url, this.fileName(it));
    },

    copyUrl(it) {
      if (it.url.startsWith('data:image/svg')) {
        WT.copy(decodeURIComponent(it.url.split(',')[1]), 'SVG-код');
      } else WT.copy(it.url, 'ссылка');
    },

    async downloadAll() {
      const list = this.current || [];
      if (!list.length) return WT.toast('Нечего скачивать', 'err');
      WT.toast(`Скачиваю ${list.length} файл(ов)…`);
      for (const it of list) {
        if (it.url.startsWith('data:') || it.url.startsWith('blob:')) WT.download(it.url, this.fileName(it));
        else await WT.send({ type: 'download', url: it.url, filename: (location.hostname || 'site') + '/' + this.fileName(it) });
      }
    },

    /* ---------- Lightbox ---------- */
    openLightbox(it) {
      this.closeLightbox(true);
      const list = this.current || [it];
      let idx = Math.max(0, list.indexOf(it));
      const img = h('img', { class: 'lb-img' });
      const name = h('b');
      const meta = h('small');
      const locateBtn = h('button', { class: 'btn', onclick: () => { const cur = list[idx]; this.closeLightbox(); WT.highlight(cur.els, '#c95cf5'); } }, WT.svg('target', 15), 'На странице');
      const show = () => {
        const cur = list[idx];
        img.src = cur.url;
        name.textContent = cur.alt || WT.fileNameFromUrl(cur.url, 'image');
        meta.textContent = `${KIND_LABEL[cur.kind] || 'IMG'} · ${cur.w ? cur.w + '×' + cur.h : '…'} · ${idx + 1}/${list.length}`;
        locateBtn.style.display = cur.els.length ? '' : 'none';
      };
      img.addEventListener('load', () => {
        const cur = list[idx];
        if (!cur.w) { cur.w = img.naturalWidth; cur.h = img.naturalHeight; }
        meta.textContent = `${KIND_LABEL[cur.kind] || 'IMG'} · ${img.naturalWidth}×${img.naturalHeight} · ${idx + 1}/${list.length}`;
      });
      const go = (d) => { idx = (idx + d + list.length) % list.length; show(); };
      const bar = h('div', { class: 'lb-bar' },
        h('div', { class: 'lb-meta' }, name, meta),
        locateBtn,
        h('button', { class: 'btn', onclick: () => this.copyUrl(list[idx]) }, WT.svg('copy', 15), 'Ссылка'),
        h('button', { class: 'btn', onclick: () => WT.send({ type: 'openTab', url: list[idx].url }) }, WT.svg('external', 15), 'Открыть'),
        h('button', { class: 'btn primary', style: { '--c': 'var(--gal)' }, onclick: () => this.downloadItem(list[idx]) }, WT.svg('download', 15), 'Скачать')
      );
      bar.lastChild.style.setProperty('--c', 'var(--gal)');
      const lb = h('div', { class: 'lightbox', onclick: (e) => { if (e.target === lb) this.closeLightbox(); } },
        img, bar,
        h('button', { class: 'lb-close', title: 'Закрыть', onclick: () => this.closeLightbox() }, WT.svg('close', 20)),
        list.length > 1 ? h('button', { class: 'lb-nav prev', onclick: () => go(-1) }, WT.svg('chevron', 22)) : null,
        list.length > 1 ? h('button', { class: 'lb-nav next', onclick: () => go(1) }, WT.svg('chevron', 22)) : null
      );
      this.lbKeys = (e) => {
        if (e.key === 'ArrowLeft') { e.stopPropagation(); go(-1); }
        if (e.key === 'ArrowRight') { e.stopPropagation(); go(1); }
      };
      window.addEventListener('keydown', this.lbKeys, true);
      show();
      WT.layer.append(lb);
      WT.raise && WT.raise();
      this.lightbox = lb;
      requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('in')));
    },

    closeLightbox(instant) {
      const lb = this.lightbox;
      if (!lb) return;
      this.lightbox = null;
      window.removeEventListener('keydown', this.lbKeys, true);
      if (instant) return lb.remove();
      lb.classList.remove('in');
      setTimeout(() => lb.remove(), 250);
    }
  });
})();
