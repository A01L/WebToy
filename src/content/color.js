/* WebToy - color math */
(() => {
  'use strict';
  const WT = window.WT;
  const C = (WT.Color = {});

  C.hsvToRgb = (h, s, v) => {
    h = ((h % 360) + 360) % 360;
    const f = (n) => {
      const k = (n + h / 60) % 6;
      return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    };
    return { r: Math.round(f(5) * 255), g: Math.round(f(3) * 255), b: Math.round(f(1) * 255) };
  };

  C.rgbToHsv = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s: max ? d / max : 0, v: max };
  };

  C.rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s, l };
  };

  const hx = (n) => n.toString(16).padStart(2, '0');
  C.rgbToHex = (r, g, b, a = 1) => {
    let s = '#' + hx(r) + hx(g) + hx(b);
    if (a < 1) s += hx(Math.round(a * 255));
    return s.toUpperCase();
  };

  C.hexToRgb = (hex) => {
    let s = String(hex).trim().replace(/^#/, '');
    if (!/^[0-9a-f]{3,8}$/i.test(s) || [5, 7].includes(s.length)) return null;
    if (s.length <= 4) s = s.split('').map((c) => c + c).join('');
    const n = (i) => parseInt(s.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: s.length === 8 ? +(n(6) / 255).toFixed(3) : 1 };
  };

  /* any CSS color → {r,g,b,a} using the browser parser */
  let ctx;
  C.parse = (str) => {
    if (!str) return null;
    const hex = C.hexToRgb(str);
    if (hex) return hex;
    const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i.exec(str.trim());
    if (m) {
      let a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return { r: Math.round(+m[1]), g: Math.round(+m[2]), b: Math.round(+m[3]), a };
    }
    try {
      ctx = ctx || document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = str;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return { r: d[0], g: d[1], b: d[2], a: +(d[3] / 255).toFixed(3) };
    } catch (e) {
      return null;
    }
  };

  /* OKLCH */
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  C.rgbToOklch = (r, g, b) => {
    const R = lin(r), G = lin(g), B = lin(b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    const Cc = Math.sqrt(A * A + Bb * Bb);
    let H = (Math.atan2(Bb, A) * 180) / Math.PI;
    if (H < 0) H += 360;
    return { l: L, c: Cc, h: Cc < 0.0002 ? 0 : H };
  };

  C.luminance = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  C.contrast = (a, b) => {
    const l1 = C.luminance(a.r, a.g, a.b), l2 = C.luminance(b.r, b.g, b.b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  C.isLight = (rgb) => C.luminance(rgb.r, rgb.g, rgb.b) > 0.42;

  const r1 = (n, d = 0) => +n.toFixed(d);
  C.formats = (rgb, a = 1) => {
    const { r, g, b } = rgb;
    const hsl = C.rgbToHsl(r, g, b);
    const ok = C.rgbToOklch(r, g, b);
    const al = a < 1 ? ` / ${r1(a * 100)}%` : '';
    return {
      hex: C.rgbToHex(r, g, b, a),
      rgb: a < 1 ? `rgb(${r} ${g} ${b}${al})` : `rgb(${r}, ${g}, ${b})`,
      hsl: a < 1 ? `hsl(${r1(hsl.h)} ${r1(hsl.s * 100)}% ${r1(hsl.l * 100)}%${al})` : `hsl(${r1(hsl.h)}, ${r1(hsl.s * 100)}%, ${r1(hsl.l * 100)}%)`,
      oklch: `oklch(${r1(ok.l * 100, 1)}% ${r1(ok.c, 3)} ${r1(ok.h, 1)}${al})`
    };
  };

  /* Rough human name for a hue - used in palette tooltips */
  C.hueName = (h, s, v) => {
    if (v < 0.12) return 'Чёрный';
    if (s < 0.08) return v > 0.92 ? 'Белый' : 'Серый';
    const names = [
      [15, 'Красный'], [40, 'Оранжевый'], [65, 'Жёлтый'], [90, 'Лаймовый'], [150, 'Зелёный'],
      [185, 'Бирюзовый'], [205, 'Голубой'], [250, 'Синий'], [285, 'Фиолетовый'], [320, 'Пурпурный'], [345, 'Розовый'], [361, 'Красный']
    ];
    for (const [lim, n] of names) if (h < lim) return n;
    return 'Красный';
  };
})();
