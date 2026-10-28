/* WebToy - Pipette & Procreate-style color panel */
(() => {
  'use strict';
  const WT = window.WT;
  const { h, Color: C } = WT;
  const DPR = () => Math.min(2, window.devicePixelRatio || 1);

  /* ---------- generic draggable 1D/2D pad ---------- */
  function pad(el, onMove, { onStart, onEnd } = {}) {
    let pid = null;
    const handle = (e) => {
      const r = el.getBoundingClientRect();
      onMove((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, e, r);
    };
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      pid = e.pointerId;
      el.setPointerCapture(pid);
      el.classList.add('drag');
      onStart && onStart(e);
      handle(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId === pid) handle(e);
    });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      el.classList.remove('drag');
      onEnd && onEnd(e);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function slider(cls, onT, opts) {
    const knob = h('div', { class: 'pk-knob' });
    const el = h('div', { class: 'pk-slider ' + (cls || '') }, knob);
    pad(el, (x) => onT(WT.clamp(x, 0, 1)), opts);
    el.set = (t, bg, knobColor) => {
      knob.style.left = WT.clamp(t, 0, 1) * 100 + '%';
      if (bg != null) el.style.background = bg;
      if (knobColor) knob.style.background = knobColor;
    };
    return el;
  }

  function makeCanvas(w, hgt) {
    const c = document.createElement('canvas');
    const d = DPR();
    c.width = Math.round(w * d);
    c.height = Math.round(hgt * d);
    c.style.width = w + 'px';
    c.style.height = hgt + 'px';
    return c;
  }

  const hueGradient = 'linear-gradient(90deg,#f00 0%,#ff0 16.66%,#0f0 33.33%,#0ff 50%,#00f 66.66%,#f0f 83.33%,#f00 100%)';

  /* square ↔ disc mapping (elliptical grid mapping) */
  const discToSquare = (u, v) => {
    const u2 = u * u, v2 = v * v, t = 2 * Math.SQRT2;
    const sx = 0.5 * Math.sqrt(Math.max(0, 2 + u2 - v2 + t * u)) - 0.5 * Math.sqrt(Math.max(0, 2 + u2 - v2 - t * u));
    const sy = 0.5 * Math.sqrt(Math.max(0, 2 - u2 + v2 + t * v)) - 0.5 * Math.sqrt(Math.max(0, 2 - u2 + v2 - t * v));
    return [WT.clamp(sx, -1, 1), WT.clamp(sy, -1, 1)];
  };
  const squareToDisc = (x, y) => [x * Math.sqrt(1 - (y * y) / 2), y * Math.sqrt(1 - (x * x) / 2)];

  const HARMONIES = {
    complementary: { label: 'Комплементарная', offs: [180] },
    split: { label: 'Сплит-комплементарная', offs: [150, 210] },
    analogous: { label: 'Аналоговая', offs: [-30, 30] },
    triadic: { label: 'Триада', offs: [120, 240] },
    tetradic: { label: 'Тетрада', offs: [90, 180, 270] }
  };

  const Picker = (WT.Picker = {
    isOpen: false,
    el: null,
    hsv: { h: 262, s: 0.52, v: 1 },
    a: 1,
    prev: null,
    tab: 'disc',
    harmony: 'complementary',
    userPos: null,
    history: [],
    palettes: [],
    sitePalette: null,

    async load() {
      if (this._loaded) return;
      this._loaded = true;
      const st = await WT.local.get('wt_color', null);
      if (st && st.hsv) {
        this.hsv = st.hsv;
        this.a = st.a == null ? 1 : st.a;
        this.prev = st.prev || null;
        this.tab = st.tab || 'disc';
        this.harmony = st.harmony || 'complementary';
      }
      this.history = await WT.local.get('wt_history', []);
      this.palettes = await WT.local.get('wt_palettes', [{ name: 'Моя палитра', colors: [] }]);
      if (!this.palettes.length) this.palettes = [{ name: 'Моя палитра', colors: [] }];
    },

    persist: WT.debounce(function () {
      WT.local.set('wt_color', { hsv: Picker.hsv, a: Picker.a, prev: Picker.prev, tab: Picker.tab, harmony: Picker.harmony });
    }, 300),

    rgb() {
      return C.hsvToRgb(this.hsv.h, this.hsv.s, this.hsv.v);
    },
    hex() {
      const c = this.rgb();
      return C.rgbToHex(c.r, c.g, c.b);
    },

    async toggle() {
      this.isOpen ? this.close() : this.open();
    },

    async open() {
      await this.load();
      if (this.isOpen) return;
      this.isOpen = true;
      this.build();
      WT.layer.append(this.el);
      WT.raise && WT.raise();
      this.reposition(true);
      requestAnimationFrame(() => requestAnimationFrame(() => this.el && this.el.classList.add('in')));
      WT.App.refreshActive();
    },

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      const el = this.el;
      el.classList.remove('in');
      setTimeout(() => el.remove(), 250);
      this.el = null;
      WT.App.refreshActive();
    },

    onSettings() {
      if (this.isOpen) {
        this.renderOutputs();
        this.reposition(true);
      }
    },

    reposition(recenter) {
      if (!this.el) return;
      const w = 316;
      const hgt = this.el.offsetHeight || 520;
      let x, y;
      if (this.userPos) {
        x = this.userPos.x;
        y = this.userPos.y;
      } else {
        const nr = WT.Nav.el.getBoundingClientRect();
        const right = WT.settings.side === 'right';
        x = right ? innerWidth - 64 - 16 - w : WT.App.sidebarWidth() + 64 + 16;
        if (this.autoY == null || recenter) this.autoY = nr.top + nr.height / 2 - hgt / 2;
        y = this.autoY;
        this.el.style.transformOrigin = right ? '100% 50%' : '0 50%';
      }
      this.el.style.left = WT.clamp(x, 8, innerWidth - w - 8) + 'px';
      this.el.style.top = WT.clamp(y, 8, Math.max(8, innerHeight - hgt - 8)) + 'px';
    },

    /* ---------- set color ---------- */
    setHSV(hh, s, v, src) {
      if (hh != null) this.hsv.h = ((hh % 360) + 360) % 360;
      if (s != null) this.hsv.s = WT.clamp(s, 0, 1);
      if (v != null) this.hsv.v = WT.clamp(v, 0, 1);
      this.update(src);
    },
    setRGB(rgb, src, keepPrev) {
      if (!keepPrev) this.prev = this.hex();
      const hsv = C.rgbToHsv(rgb.r, rgb.g, rgb.b);
      if (hsv.s < 0.001 || hsv.v < 0.001) hsv.h = this.hsv.h; // keep hue for greys
      this.hsv = hsv;
      if (rgb.a != null) this.a = rgb.a;
      this.update(src);
    },
    commitPrev() {
      // called when a drag interaction starts → remember the color before change
      this.prev = this.hex();
      this.renderSwatch();
    },

    update(src) {
      if (!this.el) return;
      this.renderSwatch();
      this.renderOutputs();
      if (this.view && this.view.update) this.view.update(src);
      this.persist();
    },

    /* ---------- build UI ---------- */
    build() {
      const swCur = h('i');
      const swPrev = h('i', {
        title: 'Предыдущий цвет - нажмите, чтобы вернуть',
        onclick: () => {
          if (!this.prev) return;
          const p = C.hexToRgb(this.prev);
          this.setRGB(p);
        }
      });
      this.swCur = swCur;
      this.swPrev = swPrev;

      const head = h(
        'div',
        { class: 'pk-head' },
        h('div', { class: 't', text: 'Цвета' }),
        h('div', { class: 'pk-sw', title: 'Текущий / предыдущий' }, swCur, swPrev),
        h('button', { class: 'pk-drop', title: 'Взять цвет с экрана', onclick: () => this.pickFromScreen() }, WT.svg('pipette', 20)),
        WT.iconBtn('close', 'Закрыть', () => this.close(), 'sm')
      );
      this.bindPanelDrag(head);

      this.viewBox = h('div', { class: 'pk-view' });
      this.out = h('div', { class: 'pk-out' });

      const tabs = [
        ['disc', 'Диск', 't-disc'],
        ['classic', 'Классика', 't-classic'],
        ['harmony', 'Гармония', 't-harm'],
        ['values', 'Значения', 't-val'],
        ['palettes', 'Палитры', 't-pal']
      ];
      this.tabBtns = tabs.map(([id, label, cls]) =>
        h('button', { class: cls + (this.tab === id ? ' on' : ''), onclick: () => this.setTab(id) }, h('i'), label)
      );
      const tabBar = h('div', { class: 'pk-tabs' }, this.tabBtns);

      this.el = h('div', { class: 'picker', role: 'dialog', 'aria-label': 'Пипетка' }, head, this.viewBox, this.out, tabBar);
      this.setTab(this.tab, true);
      this.renderSwatch();
      this.renderOutputs();
    },

    bindPanelDrag(handle) {
      let sx, sy, ox, oy, pid = null;
      handle.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        pid = e.pointerId;
        handle.setPointerCapture(pid);
        const r = this.el.getBoundingClientRect();
        sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      });
      handle.addEventListener('pointermove', (e) => {
        if (e.pointerId !== pid) return;
        this.userPos = { x: ox + e.clientX - sx, y: oy + e.clientY - sy };
        this.reposition();
      });
      const end = (e) => { if (e.pointerId === pid) pid = null; };
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
      handle.addEventListener('dblclick', () => { this.userPos = null; this.reposition(true); });
    },

    setTab(id, initial) {
      this.tab = id;
      this.tabBtns.forEach((b, i) => b.classList.toggle('on', ['disc', 'classic', 'harmony', 'values', 'palettes'][i] === id));
      this.viewBox.textContent = '';
      const V = { disc: DiscView, classic: ClassicView, harmony: HarmonyView, values: ValuesView, palettes: PalettesView }[id];
      this.view = V.create();
      this.viewBox.append(this.view.el);
      this.view.update && this.view.update();
      if (!initial) {
        this.persist();
        requestAnimationFrame(() => this.reposition());
      }
    },

    renderSwatch() {
      if (!this.swCur) return;
      const c = this.rgb();
      this.swCur.style.background = `rgba(${c.r},${c.g},${c.b},${this.a})`;
      this.swPrev.style.background = this.prev || 'transparent';
      this.el.style.setProperty('--cur', `rgb(${c.r},${c.g},${c.b})`);
    },

    renderOutputs() {
      if (!this.out) return;
      const f = C.formats(this.rgb(), this.a);
      const pref = WT.settings.colorFormat || 'hex';
      this.out.textContent = '';
      for (const k of ['hex', 'rgb', 'hsl', 'oklch']) {
        this.out.append(
          h('button', { class: k === pref ? 'pref' : '', title: 'Копировать', onclick: () => WT.copy(f[k], f[k]) }, h('small', { text: k }), h('span', { text: f[k] }))
        );
      }
    },

    /* ---------- palettes / history ---------- */
    async addHistory(hex) {
      this.history = [hex, ...this.history.filter((x) => x !== hex)].slice(0, 30);
      await WT.local.set('wt_history', this.history);
    },
    async savePalettes() {
      await WT.local.set('wt_palettes', this.palettes);
    },

    extractSiteColors() {
      const counts = new Map();
      const add = (str, w) => {
        if (!str || str === 'transparent' || str === 'none') return;
        const c = C.parse(str);
        if (!c || c.a < 0.15) return;
        const k = C.rgbToHex(c.r, c.g, c.b);
        counts.set(k, (counts.get(k) || 0) + w);
      };
      let n = 0;
      for (const el of WT.walkElements(document.body || document.documentElement, 5000)) {
        if (++n > 5000) break;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const hasText = el.childNodes.length && [...el.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim());
        if (hasText) add(cs.color, 2);
        add(cs.backgroundColor, 3);
        if (parseFloat(cs.borderTopWidth) > 0) add(cs.borderTopColor, 1);
        if (el instanceof SVGElement) {
          add(cs.fill, 1);
          add(cs.stroke, 1);
        }
      }
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      const out = [];
      for (const [hex] of sorted) {
        const c = C.hexToRgb(hex);
        if (out.some((o) => Math.abs(o.r - c.r) + Math.abs(o.g - c.g) + Math.abs(o.b - c.b) < 18)) continue;
        out.push({ ...c, hex });
        if (out.length >= 30) break;
      }
      return out.map((x) => x.hex);
    },

    /* ---------- pick from screen ---------- */
    async pickFromScreen() {
      if ('EyeDropper' in window) {
        try {
          const res = await new window.EyeDropper().open();
          this.applyPicked(res.sRGBHex);
          return;
        } catch (e) {
          if (e && e.name === 'AbortError') return;
        }
      }
      this.loupePick();
    },

    applyPicked(hexStr) {
      const c = C.parse(hexStr);
      if (!c) return;
      this.setRGB({ r: c.r, g: c.g, b: c.b, a: 1 });
      const hex = this.hex();
      this.addHistory(hex);
      const f = C.formats(this.rgb(), 1);
      WT.copy(f[WT.settings.colorFormat || 'hex'], f[WT.settings.colorFormat || 'hex']);
      if (this.tab === 'palettes') this.setTab('palettes');
    },

    /* Fallback: screenshot + magnifier loupe */
    async loupePick() {
      WT.layer.style.visibility = 'hidden';
      await new Promise((r) => setTimeout(r, 60));
      const res = await WT.send({ type: 'capture' });
      WT.layer.style.visibility = '';
      if (!res.ok) {
        WT.toast('Пипетка недоступна на этой странице', 'err');
        return;
      }
      const img = new Image();
      img.src = res.dataUrl;
      await img.decode();
      const full = document.createElement('canvas');
      full.width = img.naturalWidth;
      full.height = img.naturalHeight;
      const fctx = full.getContext('2d', { willReadFrequently: true });
      fctx.drawImage(img, 0, 0);
      const scale = img.naturalWidth / innerWidth;

      const lc = document.createElement('canvas');
      lc.width = lc.height = 11;
      const lctx = lc.getContext('2d');
      lctx.imageSmoothingEnabled = false;
      const loupe = h('div', { class: 'loupe' }, lc);
      const tag = h('div', { class: 'loupe-tag' });
      const layer = h('div', { class: 'loupe-layer' });
      layer.style.background = `url(${res.dataUrl}) 0 0 / 100% 100%`;
      WT.layer.append(layer, loupe, tag);

      let cur = null;
      const move = (e) => {
        const px = Math.floor(e.clientX * scale), py = Math.floor(e.clientY * scale);
        lctx.clearRect(0, 0, 11, 11);
        lctx.drawImage(full, px - 5, py - 5, 11, 11, 0, 0, 11, 11);
        lctx.strokeStyle = 'rgba(255,255,255,.95)';
        lctx.lineWidth = 0.12;
        lctx.strokeRect(5, 5, 1, 1);
        const d = fctx.getImageData(px, py, 1, 1).data;
        cur = C.rgbToHex(d[0], d[1], d[2]);
        loupe.style.left = e.clientX - 66 + 'px';
        loupe.style.top = e.clientY - 66 + 'px';
        tag.textContent = cur;
        tag.style.left = e.clientX - 30 + 'px';
        tag.style.top = e.clientY + 74 + 'px';
        tag.style.borderLeft = `14px solid ${cur}`;
      };
      const cleanup = () => {
        layer.remove(); loupe.remove(); tag.remove();
        window.removeEventListener('keydown', esc, true);
      };
      const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); cleanup(); } };
      window.addEventListener('keydown', esc, true);
      layer.addEventListener('pointermove', move);
      layer.addEventListener('pointerdown', (e) => {
        move(e);
        cleanup();
        if (cur) this.applyPicked(cur);
      });
    }
  });

  /* =================== VIEWS =================== */

  /* --- Disc: hue ring + inner saturation/brightness disc --- */
  const DiscView = {
    create() {
      const S = 248, RO = S / 2, RI = RO - 28, RD = RI - 10;
      const ring = makeCanvas(S, S);
      const disc = makeCanvas(RD * 2, RD * 2);
      disc.style.position = 'absolute';
      disc.style.left = disc.style.top = RO - RD + 'px';
      disc.style.borderRadius = '50%';
      const kRing = h('div', { class: 'pk-knob' });
      const kDisc = h('div', { class: 'pk-knob' });
      const wrap = h('div', { class: 'pk-canvas-wrap', style: { width: S + 'px', height: S + 'px' } }, ring, disc, kRing, kDisc);

      // ring
      const d = DPR();
      const rc = ring.getContext('2d');
      rc.scale(d, d);
      const g = rc.createConicGradient(-Math.PI / 2, RO, RO);
      for (let i = 0; i <= 12; i++) g.addColorStop(i / 12, `hsl(${i * 30},100%,50%)`);
      rc.beginPath();
      rc.arc(RO, RO, RO - 1, 0, Math.PI * 2);
      rc.arc(RO, RO, RI, 0, Math.PI * 2, true);
      rc.fillStyle = g;
      rc.fill('evenodd');

      let mode = null;
      const P = Picker;
      pad(
        wrap,
        (x, y, e, r) => {
          const px = x * S - RO, py = y * S - RO;
          if (mode === 'ring') {
            const ang = (Math.atan2(py, px) * 180) / Math.PI + 90;
            P.setHSV(ang, null, null, 'ring');
          } else if (mode === 'disc') {
            let u = px / RD, v = py / RD;
            const len = Math.hypot(u, v);
            if (len > 1) { u /= len; v /= len; }
            const [sx, sy] = discToSquare(u, v);
            P.setHSV(null, (sx + 1) / 2, 1 - (sy + 1) / 2, 'disc');
          }
        },
        {
          onStart: (e) => {
            const r = wrap.getBoundingClientRect();
            const dist = Math.hypot(e.clientX - r.left - RO, e.clientY - r.top - RO);
            mode = dist > RI - 2 ? 'ring' : 'disc';
            P.commitPrev();
          },
          onEnd: () => P.addHistory(P.hex())
        }
      );

      let lastHue = null;
      const drawDisc = () => {
        const W = disc.width, ctx = disc.getContext('2d');
        const img = ctx.createImageData(W, W);
        const data = img.data;
        const hue = P.hsv.h;
        for (let j = 0; j < W; j++) {
          const v = (j / (W - 1)) * 2 - 1;
          for (let i = 0; i < W; i++) {
            const u = (i / (W - 1)) * 2 - 1;
            const idx = (j * W + i) * 4;
            const l2 = u * u + v * v;
            if (l2 > 1.0) { data[idx + 3] = 0; continue; }
            const [sx, sy] = discToSquare(u, v);
            const c = C.hsvToRgb(hue, (sx + 1) / 2, 1 - (sy + 1) / 2);
            data[idx] = c.r; data[idx + 1] = c.g; data[idx + 2] = c.b;
            data[idx + 3] = l2 > 0.985 ? Math.max(0, (1 - l2) / 0.015) * 255 : 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      };

      return {
        el: wrap,
        update() {
          const { h: hue, s, v } = P.hsv;
          if (lastHue !== hue) { drawDisc(); lastHue = hue; }
          const a = ((hue - 90) * Math.PI) / 180, rr = (RO + RI) / 2;
          kRing.style.left = RO + Math.cos(a) * rr + 'px';
          kRing.style.top = RO + Math.sin(a) * rr + 'px';
          const hc = C.hsvToRgb(hue, 1, 1);
          kRing.style.background = `rgb(${hc.r},${hc.g},${hc.b})`;
          const [u, vv] = squareToDisc(s * 2 - 1, (1 - v) * 2 - 1);
          kDisc.style.left = RO + u * RD + 'px';
          kDisc.style.top = RO + vv * RD + 'px';
          kDisc.style.background = P.hex();
        }
      };
    }
  };

  /* --- Classic: SV square + hue + alpha --- */
  const ClassicView = {
    create() {
      const P = Picker;
      const W = 284, H = 196;
      const sq = h('div', { class: 'pk-canvas-wrap', style: { width: W + 'px', height: H + 'px', borderRadius: '14px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' } });
      const knob = h('div', { class: 'pk-knob' });
      sq.append(knob);
      pad(sq, (x, y) => P.setHSV(null, WT.clamp(x, 0, 1), 1 - WT.clamp(y, 0, 1), 'sq'), { onStart: () => P.commitPrev(), onEnd: () => P.addHistory(P.hex()) });
      const hue = slider('', (t) => P.setHSV(t * 360, null, null, 'hue'), { onStart: () => P.commitPrev() });
      const alpha = slider('alpha', (t) => { P.a = +t.toFixed(3); P.update('alpha'); });
      const lh = h('div', { class: 'pk-lbl' }, h('span', { text: 'Тон' }), h('span'));
      const la = h('div', { class: 'pk-lbl' }, h('span', { text: 'Непрозрачность' }), h('span'));
      return {
        el: h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', width: W + 'px' } }, sq, lh, hue, la, alpha),
        update() {
          const { h: hh, s, v } = P.hsv;
          const hc = C.hsvToRgb(hh, 1, 1);
          sq.style.background = `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,rgb(${hc.r},${hc.g},${hc.b}))`;
          knob.style.left = s * 100 + '%';
          knob.style.top = (1 - v) * 100 + '%';
          knob.style.background = P.hex();
          hue.set(hh / 360, hueGradient, `rgb(${hc.r},${hc.g},${hc.b})`);
          alpha.set(P.a, null, P.hex());
          lh.lastChild.textContent = Math.round(hh) + '°';
          la.lastChild.textContent = Math.round(P.a * 100) + '%';
        }
      };
    }
  };

  /* --- Harmony: hue/sat wheel with harmony points --- */
  const HarmonyView = {
    create() {
      const P = Picker;
      const S = 220, R0 = S / 2;
      const wheel = makeCanvas(S, S);
      wheel.style.borderRadius = '50%';
      const shade = h('div', { style: { position: 'absolute', inset: '0', borderRadius: '50%', background: '#000', pointerEvents: 'none' } });
      const main = h('div', { class: 'pk-knob' });
      const dotsBox = h('div', { style: { position: 'absolute', inset: '0', pointerEvents: 'none' } });
      const wrap = h('div', { class: 'pk-canvas-wrap', style: { width: S + 'px', height: S + 'px' } }, wheel, shade, dotsBox, main);

      // draw wheel once: conic hue + radial white center
      const d = DPR();
      const ctx = wheel.getContext('2d');
      ctx.scale(d, d);
      const g = ctx.createConicGradient(-Math.PI / 2, R0, R0);
      for (let i = 0; i <= 12; i++) g.addColorStop(i / 12, `hsl(${i * 30},100%,50%)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(R0, R0, R0, 0, Math.PI * 2); ctx.fill();
      const rg = ctx.createRadialGradient(R0, R0, 0, R0, R0, R0);
      rg.addColorStop(0, 'rgba(255,255,255,1)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(R0, R0, R0, 0, Math.PI * 2); ctx.fill();

      pad(wrap, (x, y) => {
        const px = x * S - R0, py = y * S - R0;
        const ang = (Math.atan2(py, px) * 180) / Math.PI + 90;
        P.setHSV(ang, Math.min(1, Math.hypot(px, py) / R0), null, 'wheel');
      }, { onStart: () => P.commitPrev(), onEnd: () => P.addHistory(P.hex()) });

      const sel = h('select', { class: 'pk-sel' }, Object.entries(HARMONIES).map(([k, v]) => h('option', { value: k, text: v.label })));
      sel.value = P.harmony;
      sel.addEventListener('change', () => { P.harmony = sel.value; P.update(); });
      const bri = slider('', (t) => P.setHSV(null, null, t, 'bri'), { onStart: () => P.commitPrev() });
      const sw = h('div', { class: 'pk-harm-sw' });

      return {
        el: h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '284px' } }, sel, wrap, bri, sw),
        update() {
          const { h: hh, s, v } = P.hsv;
          shade.style.opacity = 1 - v;
          const pos = (hue, sat) => {
            const a = ((hue - 90) * Math.PI) / 180;
            return [R0 + Math.cos(a) * sat * R0, R0 + Math.sin(a) * sat * R0];
          };
          const [mx, my] = pos(hh, s);
          main.style.left = mx + 'px';
          main.style.top = my + 'px';
          main.style.background = P.hex();
          const offs = HARMONIES[P.harmony].offs;
          dotsBox.textContent = '';
          sw.textContent = '';
          const colors = [hh, ...offs.map((o) => hh + o)];
          colors.forEach((hue, i) => {
            const c = C.hsvToRgb(hue, s, v);
            const hex = C.rgbToHex(c.r, c.g, c.b);
            if (i > 0) {
              const [x, y] = pos(((hue % 360) + 360) % 360, s);
              const k = h('div', { class: 'pk-knob sm' });
              k.style.left = x + 'px'; k.style.top = y + 'px'; k.style.background = hex;
              dotsBox.append(k);
            }
            sw.append(h('button', { title: hex + ' - нажмите, чтобы скопировать', style: { background: hex }, onclick: () => WT.copy(hex, hex), oncontextmenu: (e) => { e.preventDefault(); P.setRGB(c); } }));
          });
          bri.set(v, `linear-gradient(90deg,#000,${C.rgbToHex(...Object.values(C.hsvToRgb(hh, s, 1)))})`, P.hex());
        }
      };
    }
  };

  /* --- Values: HSB / RGB sliders, hex, contrast --- */
  const ValuesView = {
    create() {
      const P = Picker;
      const rows = {};
      const mk = (key, label, max, onT) => {
        const num = h('input', { type: 'number', min: 0, max });
        const sl = slider('', (t) => onT(t * max), { onStart: () => P.commitPrev() });
        num.addEventListener('change', () => onT(WT.clamp(+num.value || 0, 0, max)));
        rows[key] = { num, sl, max };
        return h('div', { class: 'pk-vrow' }, h('b', { text: label }), sl, num);
      };
      const setRgbPart = (k, val) => { const c = P.rgb(); c[k] = Math.round(val); P.setRGB(c, 'val', true); };
      const hex = h('input', { class: 'pk-hex', maxlength: 9, spellcheck: 'false' });
      hex.addEventListener('change', () => {
        const c = C.hexToRgb(hex.value);
        if (c) P.setRGB(c);
        else WT.toast('Неверный HEX', 'err');
      });
      const contrast = h('div', { class: 'pk-contrast' });
      const el = h(
        'div',
        { class: 'pk-vals' },
        h('div', { class: 'pk-hexrow' }, hex, WT.iconBtn('copy', 'Копировать HEX', () => WT.copy(P.hex(), P.hex()), 'sm')),
        mk('h', 'H', 360, (v) => P.setHSV(v, null, null, 'val')),
        mk('s', 'S', 100, (v) => P.setHSV(null, v / 100, null, 'val')),
        mk('b', 'B', 100, (v) => P.setHSV(null, null, v / 100, 'val')),
        mk('r', 'R', 255, (v) => setRgbPart('r', v)),
        mk('g', 'G', 255, (v) => setRgbPart('g', v)),
        mk('bl', 'B', 255, (v) => setRgbPart('b', v)),
        mk('a', 'A', 100, (v) => { P.a = +(v / 100).toFixed(3); P.update('val'); }),
        contrast
      );
      return {
        el,
        update() {
          const { h: hh, s, v } = P.hsv;
          const c = P.rgb();
          const set = (k, val, bg) => {
            const r = rows[k];
            r.sl.set(val / r.max, bg, P.hex());
            if (WT.shadow.activeElement !== r.num) r.num.value = Math.round(val);
          };
          const hsvHex = (a, b, cc) => { const x = C.hsvToRgb(a, b, cc); return C.rgbToHex(x.r, x.g, x.b); };
          set('h', hh, hueGradient);
          set('s', s * 100, `linear-gradient(90deg,${hsvHex(hh, 0, v)},${hsvHex(hh, 1, v)})`);
          set('b', v * 100, `linear-gradient(90deg,#000,${hsvHex(hh, s, 1)})`);
          set('r', c.r, `linear-gradient(90deg,${C.rgbToHex(0, c.g, c.b)},${C.rgbToHex(255, c.g, c.b)})`);
          set('g', c.g, `linear-gradient(90deg,${C.rgbToHex(c.r, 0, c.b)},${C.rgbToHex(c.r, 255, c.b)})`);
          set('bl', c.b, `linear-gradient(90deg,${C.rgbToHex(c.r, c.g, 0)},${C.rgbToHex(c.r, c.g, 255)})`);
          set('a', P.a * 100, `linear-gradient(90deg,transparent,${P.hex()}), var(--check)`);
          if (WT.shadow.activeElement !== hex) hex.value = C.rgbToHex(c.r, c.g, c.b, P.a);
          contrast.textContent = '';
          for (const bg of [{ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }]) {
            const ratio = C.contrast(c, bg);
            const grade = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA18' : '✕';
            const box = h('div', { title: 'Контраст WCAG' }, 'Aa', h('small', { text: `${ratio.toFixed(2)} · ${grade}` }));
            box.style.background = `rgb(${bg.r},${bg.g},${bg.b})`;
            box.style.color = P.hex();
            contrast.append(box);
          }
        }
      };
    }
  };

  /* --- Palettes: history, site colors, user palettes --- */
  const PalettesView = {
    create() {
      const P = Picker;
      const box = h('div', { class: 'pk-palscroll scroll' });
      const swatch = (hex, onRemove) =>
        h('button', {
          style: { background: hex },
          title: `${hex}\nЛКМ - выбрать · ПКМ - ${onRemove ? 'удалить' : 'копировать'}`,
          onclick: () => { P.setRGB(C.hexToRgb(hex)); },
          oncontextmenu: (e) => { e.preventDefault(); onRemove ? onRemove() : WT.copy(hex, hex); }
        });
      const grid = (colors, opts = {}) => {
        const g = h('div', { class: 'pk-swatches' });
        colors.forEach((hex, i) => g.append(swatch(hex, opts.removable ? () => opts.remove(i) : null)));
        if (opts.add) g.append(h('button', { class: 'add', title: 'Добавить текущий цвет', onclick: opts.add }, WT.svg('plus', 12)));
        const min = opts.minCells || 0;
        for (let i = colors.length + (opts.add ? 1 : 0); i < min; i++) g.append(h('div', { class: 'ph' }));
        return g;
      };
      const section = (title, actions, content) =>
        h('div', { class: 'pk-pal' }, h('div', { class: 'pk-pal-h' }, h('span', { text: title }), h('span', { style: { display: 'flex', gap: '10px' } }, actions)), content);

      const render = () => {
        box.textContent = '';
        // user palettes
        P.palettes.forEach((pal, pi) => {
          const more = h('button', { text: '•••', title: 'Действия' });
          more.onclick = () =>
            WT.menu(more, [
              { icon: 'copy', label: 'Копировать как CSS-переменные', action: () => WT.copy(pal.colors.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n').replace(/^/, ':root {\n') + '\n}', 'CSS') },
              { icon: 'code', label: 'Копировать как JSON', action: () => WT.copy(JSON.stringify(pal.colors), 'JSON') },
              { icon: 'download', label: 'Скачать .json', action: () => WT.download('data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ name: pal.name, colors: pal.colors }, null, 2)), (pal.name || 'palette') + '.json') },
              '-',
              { icon: 'trash', label: 'Удалить палитру', disabled: P.palettes.length < 2, action: () => { P.palettes.splice(pi, 1); P.savePalettes(); render(); } }
            ]);
          box.append(
            section(pal.name, [more], grid(pal.colors, {
              removable: true,
              remove: (i) => { pal.colors.splice(i, 1); P.savePalettes(); render(); },
              add: () => { if (!pal.colors.includes(P.hex())) pal.colors.push(P.hex()); P.savePalettes(); render(); },
              minCells: 10
            }))
          );
        });
        const newBtn = h('button', { text: '+ Новая палитра', onclick: () => {
          P.palettes.push({ name: 'Палитра ' + (P.palettes.length + 1), colors: [P.hex()] });
          P.savePalettes();
          render();
        } });
        box.append(h('div', { class: 'pk-pal-h', style: { justifyContent: 'flex-end' } }, newBtn));

        // history
        const clearH = h('button', { text: 'Очистить', onclick: () => { P.history = []; WT.local.set('wt_history', []); render(); } });
        box.append(section('Недавние', P.history.length ? [clearH] : [], P.history.length ? grid(P.history) : h('div', { class: 'pk-pal-h', text: 'Возьмите цвет пипеткой' })));

        // site colors
        if (!P.sitePalette) P.sitePalette = P.extractSiteColors();
        const refresh = h('button', { text: 'Обновить', onclick: () => { P.sitePalette = P.extractSiteColors(); render(); } });
        const saveSite = h('button', { text: 'Сохранить', onclick: () => {
          P.palettes.push({ name: location.hostname || 'Сайт', colors: P.sitePalette.slice() });
          P.savePalettes(); render(); WT.toast('Палитра сайта сохранена');
        } });
        box.append(section('Цвета сайта', [saveSite, refresh], grid(P.sitePalette)));
      };
      render();
      return { el: box, update() {} };
    }
  };
})();
