/* WebToy - edge navigation (the curved side panel) */
(() => {
  'use strict';
  const WT = window.WT;
  const { h } = WT;

  const W = 64;          // expanded width
  const WC = 16;         // collapsed width
  const R = 92;          // liquid fillet height (long, soft transition into the edge)
  const PAD = 6;         // vertical padding inside the bulge

  const TOOLS = [
    { id: 'picker', label: 'Пипетка', icon: 'pipette', color: 'var(--pip)' },
    { id: 'gallery', label: 'Галерея', icon: 'gallery', color: 'var(--gal)' },
    { id: 'fonts', label: 'Шрифты', icon: 'fonts', color: 'var(--fon)' }
  ];
  WT.TOOLS = TOOLS;

  /* Liquid profile: x(y) rises from the screen edge with a long smootherstep ramp
     (C2-continuous, no visible corners) - like a drop of liquid sticking to glass. */
  const smoother = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
  function shapePath(w, hgt, side) {
    const H = hgt + R * 2;
    const pts = [];
    const steps = Math.ceil(H / 1.5);
    for (let i = 0; i <= steps; i++) {
      const y = (i / steps) * H;
      const x = w * Math.min(smoother(y / R), smoother((H - y) / R));
      pts.push([side === 'right' ? w - x : x, y]);
    }
    const edge = side === 'right' ? w : 0;
    let d = `M${edge} 0 ` + pts.map(([x, y]) => `L${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + ` L${edge} ${H} Z`;
    return { d, H };
  }

  const Nav = (WT.Nav = {
    el: null,
    active: null,
    shift: 0,
    pinnedOpen: false,

    create() {
      const items = TOOLS.map((t) => {
        const b = h(
          'button',
          {
            class: 'item',
            'data-tool': t.id,
            'aria-label': t.label,
            style: { '--c': t.color },
            onclick: (e) => {
              e.stopPropagation();
              WT.App.toggleTool(t.id);
            }
          },
          WT.svgFill(t.icon, 24),
          h('span', { class: 'label', text: t.label })
        );
        b.style.setProperty('--c', t.color);
        return b;
      });

      const innerH = TOOLS.length * 46 + (TOOLS.length - 1) * 14 + PAD * 2;
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'shape');
      const path = document.createElementNS(svgNS, 'path');
      const rim = document.createElementNS(svgNS, 'path');
      rim.setAttribute('class', 'rim');
      svg.append(path, rim);

      const grip = h('div', { class: 'grip' }, TOOLS.map(() => h('i')));
      const itemsWrap = h('div', { class: 'items' }, items);

      const el = h('div', { class: 'nav collapsed', role: 'toolbar', 'aria-label': 'WebToy' }, svg, grip, itemsWrap);
      this.el = el;
      this.svg = svg;
      this.path = path;
      this.rim = rim;
      this.innerH = innerH;
      this.items = items;
      this.itemsWrap = itemsWrap;

      this.bindHover();
      this.bindDrag();
      return el;
    },

    layout() {
      const side = WT.settings.side === 'right' ? 'right' : 'left';
      const { d, H } = shapePath(W, this.innerH, side);
      this.svg.setAttribute('width', W);
      this.svg.setAttribute('height', H);
      this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      this.path.setAttribute('d', d);
      this.rim.setAttribute('d', d);
      this.el.style.height = H + 'px';
      this.itemsWrap.style.paddingTop = R + PAD + 'px';
      this.el.classList.toggle('right', side === 'right');
      this.el.classList.toggle('nolabels', !WT.settings.showLabels);
      this.applyCollapsed();
      this.applyPosition();
    },

    applyPosition() {
      const y = WT.clamp(+WT.settings.offsetY || 50, 4, 96);
      const H = this.innerH + R * 2;
      const top = WT.clamp((innerHeight * y) / 100, H / 2 + 4, innerHeight - H / 2 - 4);
      this.el.style.top = top + 'px';
      const right = WT.settings.side === 'right';
      this.el.style.left = right ? 'auto' : this.shift + 'px';
      this.el.style.right = right ? '0px' : 'auto';
    },

    setShift(px) {
      this.shift = WT.settings.side === 'right' ? 0 : px;
      this.applyPosition();
    },

    isCollapsed() {
      return WT.settings.autoCollapse && !this.hovering && !this.active && !this.pinnedOpen;
    },

    applyCollapsed() {
      const c = this.isCollapsed();
      this.el.classList.toggle('collapsed', c);
      this.el.style.width = (c ? WC + 4 : W) + 'px';
      this.svg.style.setProperty('--sx', c ? WC / W : 1);
    },

    bindHover() {
      let t;
      this.el.addEventListener('pointerenter', () => {
        clearTimeout(t);
        this.hovering = true;
        this.applyCollapsed();
      });
      this.el.addEventListener('pointerleave', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.hovering = false;
          this.applyCollapsed();
        }, 650);
      });
    },

    bindDrag() {
      let startY = 0, startTop = 0, moved = false, pid = null;
      this.el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest && e.target.closest('.item')) return;
        pid = e.pointerId;
        startY = e.clientY;
        startTop = parseFloat(this.el.style.top) || innerHeight / 2;
        moved = false;
        this.el.setPointerCapture(pid);
      });
      this.el.addEventListener('pointermove', (e) => {
        if (pid !== e.pointerId) return;
        const dy = e.clientY - startY;
        if (!moved && Math.abs(dy) < 4) return;
        moved = true;
        this.el.classList.add('dragging');
        const H = this.innerH + R * 2;
        const top = WT.clamp(startTop + dy, H / 2 + 4, innerHeight - H / 2 - 4);
        this.el.style.top = top + 'px';
      });
      const end = (e) => {
        if (pid !== e.pointerId) return;
        pid = null;
        this.el.classList.remove('dragging');
        if (moved) {
          const y = (parseFloat(this.el.style.top) / innerHeight) * 100;
          WT.saveSetting('offsetY', +y.toFixed(2));
        } else if (this.isCollapsed()) {
          // tap on the collapsed strip (touch devices) → expand
          this.hovering = true;
          this.applyCollapsed();
        }
      };
      this.el.addEventListener('pointerup', end);
      this.el.addEventListener('pointercancel', end);
    },

    setActive(tools) {
      const list = (Array.isArray(tools) ? tools : [tools]).filter(Boolean);
      this.active = list.length ? list : null;
      this.items.forEach((b) => b.classList.toggle('active', list.includes(b.dataset.tool)));
      this.applyCollapsed();
    },

    setVisible(v) {
      this.el.classList.toggle('hidden', !v);
    }
  });
})();
