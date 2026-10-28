/* WebToy - Fonts: every font used on the page, live preview, download as file or CDN */
(() => {
  'use strict';
  const WT = window.WT;
  const { h } = WT;

  const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong', '-apple-system', 'blinkmacsystemfont', 'inherit', 'initial']);
  const WEIGHT_NAMES = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };

  const clean = (f) => f.trim().replace(/^['"]|['"]$/g, '').trim();
  const keyOf = (f) => clean(f).toLowerCase();
  const splitFamilies = (s) => {
    const out = [];
    let cur = '', q = null;
    for (const ch of s || '') {
      if (q) { if (ch === q) q = null; else cur += ch; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; }
      if (ch === ',') { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  };
  const normWeight = (w) => {
    if (!w) return '400';
    w = String(w).trim();
    if (w === 'normal') return '400';
    if (w === 'bold') return '700';
    return w;
  };
  const slug = (f) => f.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /* ---------- local availability via canvas metrics ---------- */
  const availCache = new Map();
  let mctx;
  function isInstalled(family) {
    const k = keyOf(family);
    if (availCache.has(k)) return availCache.get(k);
    mctx = mctx || document.createElement('canvas').getContext('2d');
    const text = 'mmmmmmmmmmlli1WQ@#Жжё';
    let res = false;
    for (const base of ['monospace', 'serif', 'sans-serif']) {
      mctx.font = `72px ${base}`;
      const w0 = mctx.measureText(text).width;
      mctx.font = `72px "${clean(family)}", ${base}`;
      if (mctx.measureText(text).width !== w0) { res = true; break; }
    }
    availCache.set(k, res);
    return res;
  }

  /* ---------- @font-face rules ---------- */
  function parseSrc(src, base) {
    const out = [];
    const re = /url\(\s*(['"]?)(.*?)\1\s*\)(?:\s*format\(\s*['"]?([^'")]+)['"]?\s*\))?/g;
    let m;
    while ((m = re.exec(src || ''))) {
      if (!m[2] || m[2].startsWith('#')) continue;
      out.push({ url: m[2].startsWith('data:') ? m[2] : WT.absUrl(m[2], base), format: (m[3] || '').toLowerCase() });
    }
    return out;
  }

  function faceFromDecl(get, base) {
    const family = clean(get('font-family') || '');
    if (!family) return null;
    return {
      family,
      weight: normWeight(get('font-weight')),
      style: (get('font-style') || 'normal').trim(),
      range: (get('unicode-range') || '').trim(),
      srcs: parseSrc(get('src'), base),
      base
    };
  }

  function parseCssText(text, base) {
    const faces = [];
    const imports = [];
    const noComments = text.replace(/\/\*[\s\S]*?\*\//g, '');
    const fre = /@font-face\s*\{([^}]*)\}/gi;
    let m;
    while ((m = fre.exec(noComments))) {
      const body = m[1];
      const get = (prop) => {
        const r = new RegExp('(?:^|;|\\s)' + prop + '\\s*:\\s*([^;]+)', 'i').exec(body);
        return r ? r[1].trim() : '';
      };
      const f = faceFromDecl(get, base);
      if (f) faces.push(f);
    }
    const ire = /@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)['"]?\s*\)?[^;]*;/gi;
    while ((m = ire.exec(noComments))) imports.push(WT.absUrl(m[1], base));
    return { faces, imports };
  }

  async function collectFaces() {
    const faces = [];
    const sheetsCss = [];
    const remote = new Set();
    const visitRules = (rules, base) => {
      for (const r of rules) {
        if (r.type === CSSRule.FONT_FACE_RULE) {
          const f = faceFromDecl((p) => r.style.getPropertyValue(p), base);
          if (f) faces.push(f);
        } else if (r.type === CSSRule.IMPORT_RULE) {
          visitSheet(r.styleSheet, r.href ? WT.absUrl(r.href, base) : base);
        } else if (r.cssRules) {
          visitRules(r.cssRules, base);
        }
      }
    };
    const visitSheet = (sheet, hrefFallback) => {
      if (!sheet) { if (hrefFallback) remote.add(hrefFallback); return; }
      const base = sheet.href || hrefFallback || location.href;
      if (sheet.href) sheetsCss.push(sheet.href);
      let rules;
      try { rules = sheet.cssRules; } catch (e) { if (sheet.href) remote.add(sheet.href); return; }
      if (rules) visitRules(rules, base);
    };
    for (const s of document.styleSheets) visitSheet(s);
    try { for (const s of document.adoptedStyleSheets || []) visitSheet(s); } catch (e) {}

    // cross-origin sheets → fetch through the extension background
    const done = new Set();
    let queue = [...remote];
    for (let depth = 0; depth < 3 && queue.length; depth++) {
      const next = [];
      await Promise.all(queue.slice(0, 40).map(async (url) => {
        if (done.has(url)) return;
        done.add(url);
        const r = await WT.send({ type: 'fetchText', url });
        if (!r.ok) return;
        const p = parseCssText(r.text, url);
        faces.push(...p.faces);
        next.push(...p.imports);
      }));
      queue = next;
    }
    return { faces, sheets: [...sheetsCss, ...remote] };
  }

  /* ---------- used families ---------- */
  function collectUsage() {
    const usage = new Map();
    const loadedFaces = new Map(); // key → Set of 'weight style'
    try {
      document.fonts.forEach((ff) => {
        const k = keyOf(ff.family);
        if (!loadedFaces.has(k)) loadedFaces.set(k, { status: new Set(), variants: new Set() });
        const o = loadedFaces.get(k);
        o.status.add(ff.status);
        o.variants.add(normWeight(ff.weight) + ' ' + ff.style);
      });
    } catch (e) {}

    const resolve = (stack) => {
      for (const f of splitFamilies(stack)) {
        const k = keyOf(f);
        if (GENERIC.has(k)) return { family: k === '-apple-system' || k === 'blinkmacsystemfont' ? 'system-ui' : clean(f), generic: true };
        const lf = loadedFaces.get(k);
        if (lf && (lf.status.has('loaded') || lf.status.has('loading'))) return { family: clean(f), web: true };
        if (isInstalled(f)) return { family: clean(f), web: !!lf };
      }
      return { family: 'serif', generic: true };
    };

    const stackCache = new Map();
    for (const el of WT.walkElements(document.body || document.documentElement, 30000)) {
      const tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE' || tag === 'SVG') continue;
      let hasText = false;
      for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { hasText = true; break; }
      const isField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT';
      if (!hasText && !isField) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const stack = cs.fontFamily;
      let res = stackCache.get(stack);
      if (!res) { res = resolve(stack); stackCache.set(stack, res); }
      const k = keyOf(res.family);
      let u = usage.get(k);
      if (!u) {
        u = { family: res.family, generic: !!res.generic, web: !!res.web, count: 0, weights: new Map(), styles: new Set(), stacks: new Set(), sizes: new Set(), els: [] };
        usage.set(k, u);
      }
      u.count++;
      const w = normWeight(cs.fontWeight);
      u.weights.set(w, (u.weights.get(w) || 0) + 1);
      u.styles.add(cs.fontStyle);
      u.stacks.add(stack);
      u.sizes.add(Math.round(parseFloat(cs.fontSize)));
      if (u.els.length < 300) u.els.push(el);
    }
    return { usage, loadedFaces };
  }

  const Fonts = (WT.Fonts = {
    list: [],
    cdnCache: new Map(),

    mount({ sb, sub, actions }) {
      this.sb = sb;
      this.sub = sub;
      sb.style.setProperty('--c', 'var(--fon)');
      actions.append(WT.iconBtn('refresh', 'Пересканировать', () => this.scan()));

      const ta = h('textarea', { rows: 1, spellcheck: 'false', placeholder: 'Введите текст…' });
      ta.value = WT.settings.previewText || WT.DEFAULTS.previewText;
      const size = h('input', { type: 'range', class: 'range', min: 12, max: 96, value: WT.settings.previewSize || 32 });
      const sizeVal = h('span', { style: { fontFamily: 'var(--mono)', width: '38px', textAlign: 'right' }, text: size.value + 'px' });
      const saveText = WT.debounce((v) => WT.saveSetting('previewText', v), 500);
      const saveSize = WT.debounce((v) => WT.saveSetting('previewSize', v), 500);
      ta.addEventListener('input', () => { this.applyPreview(); saveText(ta.value); });
      size.addEventListener('input', () => { sizeVal.textContent = size.value + 'px'; this.applyPreview(); saveSize(+size.value); });
      // keep page hotkeys from firing while typing
      ['keydown', 'keyup', 'keypress'].forEach((ev) => ta.addEventListener(ev, (e) => { if (e.key !== 'Escape') e.stopPropagation(); }));
      this.ta = ta;
      this.size = size;

      const search = h('input', { placeholder: 'Поиск шрифта', spellcheck: 'false' });
      ['keydown', 'keyup', 'keypress'].forEach((ev) => search.addEventListener(ev, (e) => { if (e.key !== 'Escape') e.stopPropagation(); }));
      search.addEventListener('input', () => this.filter(search.value));
      this.search = search;

      const preview = h('div', { class: 'f-preview' }, ta, h('div', { class: 'f-row' }, h('span', { text: 'Размер' }), size, sizeVal));
      const tools = h('div', { class: 'sb-tools' }, h('div', { class: 'f-search' }, WT.svg('search', 15), search));
      this.listEl = h('div', { class: 'f-list' });
      this.body = h('div', { class: 'sb-body' }, h('div', { class: 'spinner' }), this.listEl);
      sb.append(preview, tools, this.body);
      setTimeout(() => this.scan(), 30);
    },

    unmount() {
      this.sb = null;
    },

    previewText() {
      return (this.ta && this.ta.value) || ' ';
    },

    applyPreview() {
      if (!this.listEl) return;
      const t = this.previewText();
      const px = this.size.value + 'px';
      this.listEl.querySelectorAll('.f-sample').forEach((s) => {
        s.textContent = t;
        s.style.fontSize = px;
      });
      this.listEl.querySelectorAll('.fv-s').forEach((s) => (s.textContent = t));
    },

    filter(q) {
      q = q.trim().toLowerCase();
      this.listEl.querySelectorAll('.font').forEach((c) => {
        c.style.display = !q || c.dataset.family.toLowerCase().includes(q) ? '' : 'none';
      });
    },

    async scan() {
      if (!this.sb) return;
      this.listEl.replaceChildren();
      const sp = this.body.querySelector('.spinner') || h('div', { class: 'spinner' });
      this.body.prepend(sp);
      await (document.fonts && document.fonts.ready);
      const [{ faces }, { usage, loadedFaces }] = await Promise.all([collectFaces(), Promise.resolve(collectUsage())]);
      if (!this.sb) return;
      sp.remove();

      // group faces by family
      const facesBy = new Map();
      for (const f of faces) {
        const k = keyOf(f.family);
        if (!facesBy.has(k)) facesBy.set(k, []);
        const arr = facesBy.get(k);
        if (!arr.some((x) => x.weight === f.weight && x.style === f.style && x.range === f.range && x.srcs[0]?.url === f.srcs[0]?.url)) arr.push(f);
      }

      const used = [...usage.values()].sort((a, b) => b.count - a.count);
      const usedKeys = new Set(used.map((u) => keyOf(u.family)));
      const unused = [];
      for (const [k, arr] of facesBy) {
        if (usedKeys.has(k)) continue;
        if (!arr.some((f) => f.srcs.length)) continue;
        const lf = loadedFaces.get(k);
        unused.push({ family: arr[0].family, generic: false, web: true, count: 0, weights: new Map(arr.map((f) => [f.weight, 0])), styles: new Set(arr.map((f) => f.style)), stacks: new Set(), sizes: new Set(), els: [], loaded: lf && lf.status.has('loaded') });
      }

      this.list = used.concat(unused).map((u) => ({ ...u, faces: facesBy.get(keyOf(u.family)) || [] }));
      this.sub.textContent = `${used.length} используется · ${location.hostname}`;

      if (!used.length && !unused.length) {
        this.listEl.append(h('div', { class: 'empty' }, WT.svg('fonts', 26), h('b', { text: 'Шрифты не найдены' }), h('span', { text: 'На странице нет текста' })));
        return;
      }
      used.forEach((u, i) => this.listEl.append(this.card(this.list[i], i)));
      if (unused.length) {
        this.listEl.append(h('div', { class: 'sect' }, h('span', { text: 'Подключены, но не используются' }), h('span', { text: unused.length })));
        unused.forEach((u, i) => this.listEl.append(this.card(this.list[used.length + i], used.length + i)));
      }
      this.applyPreview();
      if (this.search.value) this.filter(this.search.value);
    },

    sourceOf(f) {
      if (f.generic) return { label: 'Системный', cls: '' };
      const urls = f.faces.flatMap((x) => x.srcs.map((s) => s.url));
      if (urls.some((u) => /fonts\.gstatic\.com/.test(u))) return { label: 'Google Fonts', cls: 'c' };
      if (urls.length) return { label: 'Веб-шрифт', cls: 'c' };
      if (f.web) return { label: 'Веб-шрифт', cls: 'c' };
      return { label: 'Локальный', cls: '' };
    },

    fontCss(f) {
      const generic = [...f.stacks][0] ? splitFamilies([...f.stacks][0]).find((x) => GENERIC.has(keyOf(x))) : null;
      return `font-family: ${/\s/.test(f.family) ? `"${f.family}"` : f.family}${generic ? ', ' + generic : f.generic ? '' : ', sans-serif'};`;
    },

    card(f, i) {
      const topWeight = [...f.weights.entries()].sort((a, b) => b[1] - a[1])[0];
      const fam = f.generic ? f.family : `"${f.family}", ${f.family.toLowerCase().includes('mono') ? 'monospace' : 'sans-serif'}`;
      const src = this.sourceOf(f);
      const weights = [...f.weights.keys()].sort((a, b) => parseFloat(a) - parseFloat(b));

      const sample = h('div', { class: 'f-sample' });
      sample.style.fontFamily = fam;
      sample.style.fontWeight = topWeight ? topWeight[0] : '400';
      if (f.styles.has('italic') && f.styles.size === 1) sample.style.fontStyle = 'italic';

      const fileBtn = WT.iconBtn('file', 'Скачать файлом', (e) => this.fileMenu(f, e.currentTarget), 'sm');
      const cdnBtn = WT.iconBtn('cloud', 'Подключить через CDN', (e) => this.cdnMenu(f, e.currentTarget), 'sm');
      const locate = f.els.length ? WT.iconBtn('target', 'Показать на странице', () => WT.highlight(f.els, '#39d0e3'), 'sm') : null;

      const meta = h('div', { class: 'f-meta' },
        h('div', { class: 'f-name' },
          h('b', { text: f.generic ? f.family : f.family, title: f.family }),
          h('span', { class: 'badge ' + src.cls, text: src.label }),
          h('small', { text: f.count ? `${weights.join(' · ')} · ${f.count} эл.` : weights.join(' · ') })
        ),
        h('div', { class: 'f-acts' }, locate, WT.iconBtn('copy', 'Копировать font-family', () => WT.copy(this.fontCss(f), 'CSS'), 'sm'), fileBtn, cdnBtn)
      );
      meta.querySelectorAll('.badge.c').forEach((b) => b.style.setProperty('--c', 'var(--fon)'));

      // details: variants
      const variants = new Map();
      for (const w of weights) variants.set(w + ' normal', { w, s: 'normal' });
      for (const fc of f.faces) variants.set(fc.weight + ' ' + fc.style, { w: fc.weight, s: fc.style });
      const detail = h('div', { class: 'f-detail' },
        [...variants.values()].sort((a, b) => parseFloat(a.w) - parseFloat(b.w) || (a.s > b.s ? 1 : -1)).map((v) => {
          const s = h('div', { class: 'fv-s' });
          s.style.fontFamily = fam;
          s.style.fontWeight = v.w;
          s.style.fontStyle = v.s;
          const nm = (WEIGHT_NAMES[Math.round(parseFloat(v.w) / 100) * 100] || v.w) + (v.s !== 'normal' ? ' ' + v.s : '');
          return h('div', { class: 'f-var' }, h('span', { class: 'fv-w', text: `${v.w} ${nm}` }), s);
        }),
        h('div', { class: 'f-stack', text: [...f.stacks][0] ? `font-family: ${[...f.stacks][0]}` + (f.sizes.size ? `\nразмеры: ${[...f.sizes].sort((a, b) => a - b).slice(0, 12).join(', ')}px` : '') : this.fontCss(f) })
      );
      detail.lastChild.style.whiteSpace = 'pre-wrap';

      const card = h('div', { class: 'font', dataset: { family: f.family } }, sample, meta, detail);
      card.style.animationDelay = Math.min(i, 12) * 30 + 'ms';
      sample.addEventListener('click', () => card.classList.toggle('open'));
      return card;
    },

    /* ---------- Download as file ---------- */
    fileName(f, face, idx, total, url) {
      let ext = (face.srcs[idx] && face.srcs[idx].format) || '';
      ext = { 'woff2': 'woff2', 'woff': 'woff', 'truetype': 'ttf', 'opentype': 'otf', 'embedded-opentype': 'eot', 'svg': 'svg' }[ext] || '';
      if (!ext) {
        const m = /\.(woff2|woff|ttf|otf|eot)(?:[?#]|$)/i.exec(url || '');
        ext = m ? m[1].toLowerCase() : 'woff2';
      }
      return `${f.family.replace(/\s+/g, '')}-${face.weight}${face.style !== 'normal' ? '-' + face.style : ''}${total > 1 ? '-' + (idx + 1) : ''}.${ext}`;
    },

    // pick best src per face (prefer woff2)
    bestFiles(f) {
      const groups = new Map();
      for (const fc of f.faces) {
        if (!fc.srcs.length) continue;
        const order = ['woff2', 'woff', 'truetype', 'opentype', ''];
        const best = fc.srcs.slice().sort((a, b) => order.indexOf(a.format) - order.indexOf(b.format))[0];
        const key = fc.weight + ' ' + fc.style;
        if (!groups.has(key)) groups.set(key, []);
        const arr = groups.get(key);
        if (!arr.some((x) => x.url === best.url)) arr.push({ face: fc, url: best.url, format: best.format, range: fc.range });
      }
      const files = [];
      for (const [, arr] of groups) arr.forEach((x, i) => files.push({ ...x, name: this.fileName(f, { ...x.face, srcs: [{ format: x.format }] }, i, arr.length, x.url) }));
      return files.sort((a, b) => parseFloat(a.face.weight) - parseFloat(b.face.weight));
    },

    async googleFiles(f) {
      const weights = [...f.weights.keys()].map((w) => Math.round(parseFloat(w) / 100) * 100).filter((w) => w >= 100 && w <= 900);
      const uniq = [...new Set(weights.length ? weights : [400])].sort((a, b) => a - b);
      const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family).replace(/%20/g, '+')}:wght@${uniq.join(';')}&display=swap`;
      let r = await WT.send({ type: 'fetchText', url });
      if (!r.ok) {
        r = await WT.send({ type: 'fetchText', url: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family).replace(/%20/g, '+')}&display=swap` });
        if (!r.ok) return [];
      }
      const p = parseCssText(r.text, url);
      return this.bestFiles({ ...f, faces: p.faces });
    },

    async fileMenu(f, anchor) {
      let files = this.bestFiles(f);
      let fromGoogle = false;
      if (!files.length && !f.generic) {
        WT.toast('Ищу шрифт на Google Fonts…');
        files = await this.googleFiles(f);
        fromGoogle = files.length > 0;
      }
      if (!files.length) {
        WT.menu(anchor, [
          { icon: 'file', label: f.generic ? 'Системное семейство' : 'Файл недоступен', hint: f.generic ? 'Это общий системный шрифт - файла нет' : 'Шрифт установлен в системе и не найден на Google Fonts', disabled: true, action() {} },
          { icon: 'external', label: 'Найти на Google Fonts', action: () => WT.send({ type: 'openTab', url: 'https://fonts.google.com/?query=' + encodeURIComponent(f.family) }) }
        ]);
        return;
      }
      const items = [];
      items.push({
        icon: 'download', label: `Скачать все (${files.length})`, hint: fromGoogle ? 'из Google Fonts' : 'исходные файлы сайта',
        action: async () => {
          for (const x of files) await WT.download(x.url, f.family.replace(/\s+/g, '') + '/' + x.name);
        }
      });
      items.push('-');
      files.slice(0, 14).forEach((x) => {
        const wn = WEIGHT_NAMES[Math.round(parseFloat(x.face.weight) / 100) * 100] || x.face.weight;
        items.push({ icon: 'file', label: `${wn} ${x.face.weight}${x.face.style !== 'normal' ? ' · ' + x.face.style : ''}`, hint: x.name + (x.range ? ' · ' + x.range.slice(0, 26) : ''), action: () => WT.download(x.url, x.name) });
      });
      if (files.length > 14) items.push({ icon: 'file', label: `…ещё ${files.length - 14}`, hint: 'используйте «Скачать все»', disabled: true, action() {} });
      WT.menu(anchor, items);
    },

    /* ---------- CDN ---------- */
    async cdnInfo(f) {
      const k = keyOf(f.family);
      if (this.cdnCache.has(k)) return this.cdnCache.get(k);
      const fam = encodeURIComponent(f.family).replace(/%20/g, '+');
      const withTimeout = (p) => Promise.race([p, new Promise((r) => setTimeout(() => r({ ok: false }), 5000))]);
      const [g, fs] = await Promise.all([
        withTimeout(WT.send({ type: 'urlExists', url: `https://fonts.googleapis.com/css2?family=${fam}&display=swap` })),
        withTimeout(WT.send({ type: 'urlExists', url: `https://cdn.jsdelivr.net/npm/@fontsource/${slug(f.family)}/index.css` }))
      ]);
      const info = { google: !!(g.ok && g.exists), fontsource: !!(fs.ok && fs.exists) };
      if (info.google || info.fontsource) this.cdnCache.set(k, info);
      return info;
    },

    async cdnMenu(f, anchor) {
      if (f.generic) {
        WT.menu(anchor, [{ icon: 'cloud', label: 'Системный шрифт', hint: 'Подключать через CDN не нужно', disabled: true, action() {} },
          { icon: 'copy', label: 'Копировать font-family', action: () => WT.copy(this.fontCss(f), 'CSS') }]);
        return;
      }
      anchor.classList.add('loading');
      const info = await this.cdnInfo(f);
      anchor.classList.remove('loading');
      const weights = [...new Set([...f.weights.keys()].map((w) => Math.round(parseFloat(w) / 100) * 100).filter((w) => w >= 100 && w <= 900))].sort((a, b) => a - b);
      const famQ = encodeURIComponent(f.family).replace(/%20/g, '+');
      const gUrl = `https://fonts.googleapis.com/css2?family=${famQ}${weights.length ? ':wght@' + weights.join(';') : ''}&display=swap`;
      const gLink = `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="${gUrl}" rel="stylesheet">`;
      const fsSlug = slug(f.family);
      const fsCss = (weights.length ? weights : [400]).map((w) => `@import url('https://cdn.jsdelivr.net/npm/@fontsource/${fsSlug}/${w}.css');`).join('\n');
      const files = this.bestFiles(f);
      const faceCss = () => {
        const byFace = new Map();
        for (const fc of f.faces) {
          if (!fc.srcs.length) continue;
          const key = fc.weight + fc.style + fc.range + fc.srcs[0].url;
          if (byFace.has(key)) continue;
          byFace.set(key, `@font-face {\n  font-family: "${f.family}";\n  font-style: ${fc.style};\n  font-weight: ${fc.weight};\n  font-display: swap;\n  src: ${fc.srcs.map((s) => `url("${s.url}")${s.format ? ` format("${s.format}")` : ''}`).join(',\n       ')};${fc.range ? `\n  unicode-range: ${fc.range};` : ''}\n}`);
        }
        return [...byFace.values()].join('\n\n');
      };
      WT.menu(anchor, [
        { icon: 'cloud', label: 'Google Fonts - <link>', hint: info.google ? 'вставьте в <head>' : 'нет в Google Fonts', disabled: !info.google, action: () => WT.copy(gLink, 'Google Fonts <link>') },
        { icon: 'code', label: 'Google Fonts - @import', hint: info.google ? 'для CSS-файла' : 'нет в Google Fonts', disabled: !info.google, action: () => WT.copy(`@import url('${gUrl}');`, '@import') },
        { icon: 'code', label: 'Fontsource · jsDelivr', hint: info.fontsource ? `@fontsource/${fsSlug}` : 'нет в Fontsource', disabled: !info.fontsource, action: () => WT.copy(fsCss, 'Fontsource CDN') },
        { icon: 'code', label: 'npm install', hint: info.fontsource ? `npm i @fontsource/${fsSlug}` : 'нет в Fontsource', disabled: !info.fontsource, action: () => WT.copy(`npm i @fontsource/${fsSlug}`, 'npm') },
        '-',
        { icon: 'file', label: '@font-face с URL сайта', hint: files.length ? `${files.length} файл(ов) с сервера сайта` : 'нет исходных файлов', disabled: !files.length, action: () => WT.copy(faceCss(), '@font-face') },
        { icon: 'copy', label: 'Копировать font-family', hint: this.fontCss(f), action: () => WT.copy(this.fontCss(f), 'CSS') }
      ]);
    }
  });
})();
