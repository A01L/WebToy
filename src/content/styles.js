/* WebToy - UI styles (isolated in a closed shadow root) */
(() => {
  'use strict';
  const WT = window.WT;

  WT.CSS = /* css */ `
:host {
  all: initial !important;
  position: fixed !important; top: 0 !important; left: 0 !important; right: auto !important; bottom: auto !important;
  width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important; border: 0 !important;
  overflow: visible !important; background: transparent !important;
  display: block !important; z-index: 2147483647 !important; pointer-events: none !important;
  transform: none !important; filter: none !important; contain: none !important;
}
:host::backdrop { display: none !important; background: transparent !important; }
*, *::before, *::after { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; cursor: pointer; }
input, select, textarea { font: inherit; color: inherit; }
.ico { display: inline-flex; align-items: center; justify-content: center; flex: none; line-height: 0; }

.wt {
  --pip: #8a7bff; --gal: #c95cf5; --fon: #39d0e3;
  --bg: #0c0c10; --panel: rgba(16,16,21,.94); --solid: #121217;
  --s1: rgba(255,255,255,.045); --s2: rgba(255,255,255,.075); --s3: rgba(255,255,255,.12);
  --line: rgba(255,255,255,.085); --line2: rgba(255,255,255,.14);
  --text: #f4f4f7; --muted: #9b9bab; --faint: #6c6c7b;
  --ok: #3ddc97; --err: #ff6b7a;
  --shadow: 0 30px 80px -20px rgba(0,0,0,.65), 0 10px 30px -10px rgba(0,0,0,.5);
  --check: repeating-conic-gradient(#2a2a33 0% 25%, #1d1d24 0% 50%) 50% / 14px 14px;
  --ui: "Inter", "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  --mono: "JetBrains Mono", "Cascadia Code", "SF Mono", Consolas, ui-monospace, monospace;
  font: 500 13px/1.4 var(--ui);
  color: var(--text);
  letter-spacing: -0.005em;
  -webkit-font-smoothing: antialiased;
  text-align: left;
  direction: ltr;
}
.wt[data-theme="light"] {
  --bg: #f6f6f9; --panel: rgba(250,250,252,.95); --solid: #ffffff;
  --s1: rgba(10,10,30,.04); --s2: rgba(10,10,30,.065); --s3: rgba(10,10,30,.1);
  --line: rgba(10,10,30,.08); --line2: rgba(10,10,30,.14);
  --text: #15151c; --muted: #61616f; --faint: #8e8e9c;
  --shadow: 0 30px 80px -24px rgba(20,20,50,.35), 0 10px 30px -12px rgba(20,20,50,.2);
  --check: repeating-conic-gradient(#e7e7ee 0% 25%, #f7f7fa 0% 50%) 50% / 14px 14px;
}

/* ================= EDGE NAV ================= */
.nav {
  position: fixed; top: 50%; left: 0; z-index: 30;
  transform: translateY(-50%);
  transition: left .45s cubic-bezier(.2,.9,.25,1.05), right .45s cubic-bezier(.2,.9,.25,1.05), opacity .25s;
  pointer-events: auto;
  user-select: none; -webkit-user-select: none;
  touch-action: none;
}
.nav.right { left: auto; right: 0; }
.nav.hidden { opacity: 0; pointer-events: none; }
.nav .shape {
  position: absolute; left: 0; top: 0; overflow: visible;
  transform-origin: 0 50%;
  transform: scaleX(var(--sx, 1));
  transition: transform .5s cubic-bezier(.2,1.2,.3,1);
  filter: drop-shadow(0 10px 24px rgba(0,0,0,.35));
}
.nav.right .shape { left: auto; right: 0; transform-origin: 100% 50%; }
.nav .shape path { fill: #050507; }
.nav .shape path.rim { fill: none; stroke: rgba(255,255,255,.06); stroke-width: 1; }
.nav .items {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 14px;
  padding: 0; width: 64px;
  transition: opacity .25s ease, transform .5s cubic-bezier(.2,1.2,.3,1);
}
.nav.right .items { margin-left: auto; }
.nav .grip {
  position: absolute; left: 3px; top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; gap: 7px; transition: opacity .2s;
}
.nav.right .grip { left: auto; right: 3px; }
.nav .grip i { display: block; width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,.85); }
.nav.collapsed .items { opacity: 0; transform: translateX(-18px) scale(.8); pointer-events: none; }
.nav.right.collapsed .items { transform: translateX(18px) scale(.8); }
.nav:not(.collapsed) .grip { opacity: 0; }
.nav .item {
  position: relative; width: 46px; height: 46px; border-radius: 50%;
  display: grid; place-items: center; color: #fff;
  transition: transform .25s cubic-bezier(.2,1.4,.4,1), background .2s;
}
.nav .item .ico svg { width: 24px; height: 24px; }
.nav .item .ico { opacity: .92; transition: opacity .2s; }
.nav .item:hover .ico, .nav .item.active .ico { opacity: 1; }
.nav .item:hover { transform: scale(1.1); background: rgba(255,255,255,.09); }
.nav .item:active { transform: scale(.94); }
.nav .item.active { background: rgba(255,255,255,.16); }
.nav .item.active::after {
  content: ""; position: absolute; left: -8px; top: 50%; width: 4px; height: 16px; margin-top: -8px;
  border-radius: 4px; background: #fff;
}
.nav.right .item.active::after { left: auto; right: -9px; }
.nav .label {
  position: absolute; left: calc(100% + 26px); top: 50%;
  transform: translate(-8px, -50%); opacity: 0; pointer-events: none;
  font: 800 15px/1 var(--ui); letter-spacing: .08em; text-transform: uppercase; white-space: nowrap;
  color: #fff; padding: 9px 13px; border-radius: 11px;
  background: rgba(8,8,11,.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.08);
  transition: opacity .18s, transform .25s cubic-bezier(.2,1.3,.4,1);
}
.nav.right .label { left: auto; right: calc(100% + 26px); transform: translate(8px, -50%); }
.nav .item:hover .label { opacity: 1; transform: translate(0, -50%); }
.nav .item.active .label { display: none; }
.nav.nolabels .label { display: none; }
.nav.dragging, .nav.dragging * { cursor: grabbing !important; }

/* ================= SIDEBAR ================= */
.sidebar {
  position: fixed; left: 0; top: 0; bottom: 0; z-index: 20;
  width: min(420px, 94vw);
  display: flex; flex-direction: column;
  background: var(--panel);
  backdrop-filter: blur(28px) saturate(1.5); -webkit-backdrop-filter: blur(28px) saturate(1.5);
  border-right: 1px solid var(--line);
  box-shadow: var(--shadow);
  transform: translateX(-104%);
  transition: transform .5s cubic-bezier(.2,.9,.2,1);
  pointer-events: auto;
}
.sidebar.open { transform: none; }
.sb-head {
  display: flex; align-items: center; gap: 12px; padding: 18px 16px 14px 18px; flex: none;
}
.chip-ico {
  width: 40px; height: 40px; border-radius: 13px; display: grid; place-items: center; flex: none;
  color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 35%, transparent);
}
.sb-title { flex: 1; min-width: 0; }
.sb-title b { display: block; font: 700 17px/1.2 var(--ui); letter-spacing: -.02em; }
.sb-title small { display: block; color: var(--muted); font-size: 12px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-tools { display: flex; align-items: center; gap: 4px; flex: none; padding: 0 16px 12px 18px; flex-wrap: wrap; }
.sb-body { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 4px 12px 24px 14px; overscroll-behavior: contain; }
.sb-body::-webkit-scrollbar, .scroll::-webkit-scrollbar { width: 10px; }
.sb-body::-webkit-scrollbar-thumb, .scroll::-webkit-scrollbar-thumb { background: var(--s3); border-radius: 10px; border: 3px solid transparent; background-clip: padding-box; }
.sb-body::-webkit-scrollbar-track { background: transparent; }

.ibtn {
  width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: var(--muted);
  transition: background .15s, color .15s, transform .15s;
}
.ibtn:hover { background: var(--s2); color: var(--text); }
.ibtn:active { transform: scale(.92); }
.ibtn.sm { width: 28px; height: 28px; border-radius: 8px; }
.ibtn.sm .ico svg { width: 15px; height: 15px; }

.btn {
  height: 32px; padding: 0 12px; border-radius: 10px; display: inline-flex; align-items: center; gap: 7px;
  background: var(--s2); color: var(--text); font-weight: 600; font-size: 12.5px; white-space: nowrap;
  transition: background .15s, transform .15s;
}
.btn:hover { background: var(--s3); }
.btn:active { transform: scale(.96); }
.btn .ico svg { width: 15px; height: 15px; }
.btn.primary { background: var(--c, var(--pip)); color: #0b0b10; }
.btn.primary:hover { filter: brightness(1.08); }

.seg { display: inline-flex; padding: 3px; gap: 2px; border-radius: 11px; background: var(--s1); box-shadow: inset 0 0 0 1px var(--line); }
.seg button { height: 26px; padding: 0 10px; border-radius: 8px; font-size: 12px; font-weight: 600; color: var(--muted); transition: all .15s; }
.seg button:hover { color: var(--text); }
.seg button.on { background: var(--s3); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.2); }

.switch { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 600; font-size: 12.5px; }
.switch input { display: none; }
.switch i { position: relative; width: 36px; height: 21px; border-radius: 20px; background: var(--s3); transition: background .2s; flex: none; }
.switch i::after { content: ""; position: absolute; top: 2.5px; left: 2.5px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3); transition: transform .25s cubic-bezier(.2,1.3,.4,1); }
.switch input:checked + i { background: var(--c, var(--pip)); }
.switch input:checked + i::after { transform: translateX(15px); }

.badge { display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 6px; font: 700 10px/1 var(--ui); letter-spacing: .04em; text-transform: uppercase; background: var(--s2); color: var(--muted); }
.badge.c { background: color-mix(in srgb, var(--c) 18%, transparent); color: var(--c); }

.empty { padding: 50px 20px; text-align: center; color: var(--muted); }
.empty .ico { margin: 0 auto 12px; width: 52px; height: 52px; border-radius: 16px; background: var(--s1); color: var(--faint); }
.empty b { display: block; color: var(--text); font-size: 14px; margin-bottom: 4px; }

.spinner { width: 22px; height: 22px; border-radius: 50%; border: 2.5px solid var(--s3); border-top-color: var(--c, var(--pip)); animation: spin .8s linear infinite; margin: 40px auto; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ================= GALLERY ================= */
.g-filters { display: flex; align-items: center; gap: 10px; justify-content: space-between; width: 100%; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.tile {
  position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: var(--check);
  box-shadow: inset 0 0 0 1px var(--line); cursor: zoom-in;
  animation: pop .35s cubic-bezier(.2,1.2,.4,1) both;
}
@keyframes pop { from { opacity: 0; transform: scale(.92); } }
.tile img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .35s cubic-bezier(.2,.9,.3,1); }
.tile.contain img { object-fit: contain; padding: 10%; }
.tile:hover img { transform: scale(1.06); }
.tile .tbadge { position: absolute; left: 6px; top: 6px; height: 17px; padding: 0 5px; border-radius: 5px; font: 800 9px/17px var(--ui); letter-spacing: .05em; color: #fff; background: rgba(0,0,0,.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.tile .tdim { position: absolute; left: 0; right: 0; bottom: 0; padding: 18px 6px 5px; font: 600 10px/1 var(--mono); color: #fff; background: linear-gradient(transparent, rgba(0,0,0,.7)); opacity: 0; transition: opacity .2s; }
.tile .tacts { position: absolute; right: 5px; top: 5px; display: flex; flex-direction: column; gap: 4px; opacity: 0; transform: translateX(6px); transition: all .2s; }
.tile .tacts button { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; color: #fff; background: rgba(0,0,0,.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.tile .tacts button:hover { background: var(--gal); }
.tile .tacts .ico svg { width: 14px; height: 14px; }
.tile:hover .tdim, .tile:hover .tacts { opacity: 1; transform: none; }
.tile.broken { display: none; }
.g-count { color: var(--muted); font-size: 12px; font-weight: 600; }
.g-count b { color: var(--text); }

/* Lightbox */
.lightbox {
  position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
  background: rgba(5,5,8,.78); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  opacity: 0; transition: opacity .25s; pointer-events: auto; padding: 30px;
}
.lightbox.in { opacity: 1; }
.lightbox .lb-img { max-width: min(1100px, 92vw); max-height: calc(100vh - 170px); border-radius: 14px; background: var(--check); box-shadow: 0 30px 80px rgba(0,0,0,.6); object-fit: contain; transform: scale(.96); transition: transform .35s cubic-bezier(.2,1.2,.4,1); }
.lightbox.in .lb-img { transform: none; }
.lb-bar { display: flex; align-items: center; gap: 12px; padding: 8px 8px 8px 16px; border-radius: 16px; background: var(--solid); box-shadow: var(--shadow), inset 0 0 0 1px var(--line); max-width: min(900px, 92vw); }
.lb-meta { min-width: 0; flex: 1; }
.lb-meta b { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; max-width: 420px; }
.lb-meta small { color: var(--muted); font: 500 11.5px var(--mono); }
.lb-close { position: absolute; top: 18px; right: 18px; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; color: #fff; background: rgba(255,255,255,.1); }
.lb-close:hover { background: rgba(255,255,255,.2); }
.lb-nav { position: absolute; top: 50%; width: 46px; height: 46px; margin-top: -23px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: rgba(255,255,255,.1); }
.lb-nav:hover { background: rgba(255,255,255,.22); }
.lb-nav.prev { left: 20px; transform: scaleX(-1); }
.lb-nav.next { right: 20px; }

/* ================= FONTS ================= */
.f-preview {
  position: relative; margin: 0 16px 10px 18px; border-radius: 16px; background: var(--s1); box-shadow: inset 0 0 0 1px var(--line);
  transition: box-shadow .2s;
}
.f-preview:focus-within { box-shadow: inset 0 0 0 1.5px var(--fon), 0 0 0 4px color-mix(in srgb, var(--fon) 15%, transparent); }
.f-preview textarea {
  display: block; width: 100%; resize: none; border: 0; outline: 0; background: transparent; padding: 14px 16px 6px;
  font: 600 20px/1.3 var(--ui); color: var(--text); min-height: 52px; field-sizing: content; max-height: 140px;
}
.f-preview .f-row { display: flex; align-items: center; gap: 10px; padding: 4px 10px 10px 16px; color: var(--muted); font-size: 11.5px; font-weight: 600; }
.range { -webkit-appearance: none; appearance: none; flex: 1; height: 4px; border-radius: 4px; background: var(--s3); outline: 0; }
.range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 4px color-mix(in srgb, var(--c, var(--fon)) 40%, transparent), 0 2px 6px rgba(0,0,0,.3); cursor: pointer; }
.f-search { display: flex; align-items: center; gap: 8px; flex: 1; height: 32px; padding: 0 10px; border-radius: 10px; background: var(--s1); box-shadow: inset 0 0 0 1px var(--line); color: var(--muted); }
.f-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 12.5px; color: var(--text); }
.f-list { display: flex; flex-direction: column; gap: 8px; }
.font {
  border-radius: 16px; background: var(--s1); box-shadow: inset 0 0 0 1px var(--line);
  transition: background .2s, box-shadow .2s; animation: pop .35s cubic-bezier(.2,1.2,.4,1) both; overflow: hidden;
}
.font:hover { background: var(--s2); }
.font.open { box-shadow: inset 0 0 0 1px var(--line2); background: var(--s2); }
.font .f-sample { padding: 14px 16px 6px; color: var(--text); line-height: 1.2; word-break: break-word; overflow-wrap: anywhere; cursor: pointer; }
.font .f-meta { display: flex; align-items: center; gap: 6px; padding: 4px 8px 10px 16px; }
.font .f-name { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.font .f-name b { font: 700 12.5px/1.3 var(--ui); color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
.font .f-name small { color: var(--faint); font-size: 11px; font-weight: 600; }
.font .f-acts { display: flex; gap: 2px; flex: none; }
.f-detail { padding: 2px 12px 12px 16px; display: none; }
.font.open .f-detail { display: block; animation: pop .3s both; }
.f-var { display: flex; align-items: center; gap: 10px; padding: 7px 4px 7px 10px; border-radius: 10px; }
.f-var:hover { background: var(--s1); }
.f-var .fv-s { flex: 1; min-width: 0; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
.f-var .fv-w { font: 600 11px var(--mono); color: var(--muted); width: 96px; flex: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-stack { margin-top: 8px; padding: 8px 10px; border-radius: 10px; background: var(--s1); font: 500 11px/1.5 var(--mono); color: var(--muted); word-break: break-all; }
.sect { margin: 18px 4px 8px; font: 700 11px var(--ui); letter-spacing: .08em; text-transform: uppercase; color: var(--faint); display: flex; justify-content: space-between; }

/* ================= PICKER (Procreate-like) ================= */
.picker {
  position: fixed; z-index: 35; width: 316px; pointer-events: auto;
  background: var(--panel); backdrop-filter: blur(28px) saturate(1.6); -webkit-backdrop-filter: blur(28px) saturate(1.6);
  border-radius: 24px; box-shadow: var(--shadow), inset 0 0 0 1px var(--line);
  opacity: 0; transform: scale(.94) translateX(-10px); transform-origin: 0 50%;
  transition: opacity .2s, transform .35s cubic-bezier(.2,1.2,.4,1);
  --c: var(--pip);
}
.picker.in { opacity: 1; transform: none; }
.pk-head { display: flex; align-items: center; gap: 10px; padding: 14px 12px 10px 16px; cursor: grab; }
.pk-head:active { cursor: grabbing; }
.pk-head .t { flex: 1; font: 700 15px var(--ui); letter-spacing: -.01em; }
.pk-sw { display: flex; width: 66px; height: 30px; border-radius: 10px; overflow: hidden; box-shadow: inset 0 0 0 1px var(--line2); background: var(--check); flex: none; }
.pk-sw i { flex: 1; display: block; }
.pk-sw i:last-child { cursor: pointer; }
.pk-drop {
  width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; color: #0b0b10; flex: none;
  background: var(--pip); box-shadow: 0 6px 18px -6px var(--pip); transition: transform .2s;
}
.pk-drop:hover { transform: scale(1.07) rotate(-8deg); }
.pk-view { padding: 4px 16px 10px; height: 348px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.pk-view canvas { display: block; touch-action: none; }
.pk-canvas-wrap { position: relative; touch-action: none; cursor: crosshair; }
.pk-knob {
  position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; pointer-events: none;
  box-shadow: 0 0 0 3px #fff, 0 0 0 4px rgba(0,0,0,.25), 0 3px 10px rgba(0,0,0,.45);
  transition: width .15s, height .15s, margin .15s;
}
.pk-knob.sm { width: 14px; height: 14px; margin: -7px 0 0 -7px; box-shadow: 0 0 0 2.5px #fff, 0 0 0 3.5px rgba(0,0,0,.25), 0 2px 6px rgba(0,0,0,.4); }
.pk-canvas-wrap.drag .pk-knob:not(.sm) { width: 30px; height: 30px; margin: -15px 0 0 -15px; }
.pk-slider { position: relative; width: 100%; height: 22px; border-radius: 11px; touch-action: none; cursor: pointer; box-shadow: inset 0 0 0 1px var(--line); }
.pk-slider .pk-knob { top: 50%; width: 20px; height: 20px; margin: -10px 0 0 -10px; }
.pk-slider.alpha { background: var(--check); }
.pk-slider.alpha::before { content: ""; position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(90deg, transparent, var(--cur)); }
.pk-lbl { width: 100%; display: flex; justify-content: space-between; font: 600 11px var(--ui); color: var(--muted); margin-bottom: -6px; }
.pk-lbl span:last-child { font-family: var(--mono); color: var(--text); }
.pk-tabs { display: flex; justify-content: space-around; padding: 8px 10px 10px; border-top: 1px solid var(--line); margin-top: 6px; }
.pk-tabs button { flex: 1; padding: 6px 0 2px; display: flex; flex-direction: column; align-items: center; gap: 4px; font: 600 10.5px var(--ui); color: var(--faint); border-radius: 10px; transition: color .15s; }
.pk-tabs button:hover { color: var(--text); }
.pk-tabs button.on { color: var(--text); }
.pk-tabs button i { width: 20px; height: 20px; border-radius: 50%; display: block; box-shadow: inset 0 0 0 1.5px currentColor; transition: all .2s; }
.pk-tabs button.on i { box-shadow: inset 0 0 0 2px var(--pip), 0 0 0 3px color-mix(in srgb, var(--pip) 25%, transparent); }
.pk-tabs .t-disc i { background: conic-gradient(red, yellow, lime, cyan, blue, magenta, red); -webkit-mask: radial-gradient(circle, transparent 45%, #000 46%); mask: radial-gradient(circle, transparent 45%, #000 46%); box-shadow: none !important; }
.pk-tabs .t-classic i { border-radius: 5px; background: linear-gradient(transparent, #000), linear-gradient(90deg, #fff, var(--pip)); box-shadow: none !important; }
.pk-tabs .t-harm i { background: radial-gradient(circle at 30% 35%, #fff 0 2.5px, transparent 3px), radial-gradient(circle at 70% 65%, #fff 0 2.5px, transparent 3px), conic-gradient(red, yellow, lime, cyan, blue, magenta, red); box-shadow: none !important; }
.pk-tabs .t-val i { border-radius: 4px; background: linear-gradient(currentColor 0 0) 0 3px / 100% 2px no-repeat, linear-gradient(currentColor 0 0) 0 9px / 70% 2px no-repeat, linear-gradient(currentColor 0 0) 0 15px / 85% 2px no-repeat; box-shadow: none !important; }
.pk-tabs .t-pal i { border-radius: 4px; background: linear-gradient(90deg, #ff6b7a 0 33%, #ffc65c 0 66%, #39d0e3 0) 0 0 / 100% 45% no-repeat, linear-gradient(90deg, #8a7bff 0 33%, #3ddc97 0 66%, #c95cf5 0) 0 100% / 100% 45% no-repeat; box-shadow: none !important; }
.pk-tabs button.on.t-disc i, .pk-tabs button.on.t-classic i, .pk-tabs button.on.t-harm i, .pk-tabs button.on.t-pal i { outline: 2px solid var(--pip); outline-offset: 2px; }
.pk-out { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; padding: 0 12px 4px; }
.pk-out button { display: flex; flex-direction: column; align-items: flex-start; padding: 7px 10px; border-radius: 10px; background: var(--s1); transition: background .15s; min-width: 0; }
.pk-out button:hover { background: var(--s3); }
.pk-out button small { font: 700 9.5px var(--ui); letter-spacing: .08em; color: var(--faint); text-transform: uppercase; }
.pk-out button span { font: 600 11.5px var(--mono); color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.pk-out button.pref small { color: var(--pip); }
.pk-harm-sw { display: flex; gap: 6px; width: 100%; }
.pk-harm-sw button { flex: 1; height: 34px; border-radius: 10px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); transition: transform .15s; }
.pk-harm-sw button:hover { transform: translateY(-2px); }
select.pk-sel { width: 100%; height: 30px; border-radius: 9px; padding: 0 10px; background: var(--s2); border: 0; outline: 0; font-weight: 600; font-size: 12px; cursor: pointer; }
select.pk-sel option { background: var(--solid); color: var(--text); }
.pk-vals { width: 100%; display: flex; flex-direction: column; gap: 9px; }
.pk-vrow { display: grid; grid-template-columns: 16px 1fr 46px; align-items: center; gap: 10px; }
.pk-vrow b { font: 700 11px var(--mono); color: var(--muted); }
.pk-vrow input[type=number], .pk-hex { width: 100%; height: 26px; border-radius: 7px; border: 0; outline: 0; background: var(--s2); text-align: center; font: 600 11.5px var(--mono); color: var(--text); -moz-appearance: textfield; }
.pk-vrow input::-webkit-inner-spin-button { -webkit-appearance: none; }
.pk-vrow .pk-slider { height: 12px; border-radius: 6px; }
.pk-vrow .pk-slider .pk-knob { width: 16px; height: 16px; margin: -8px 0 0 -8px; }
.pk-hexrow { display: flex; align-items: center; gap: 8px; width: 100%; }
.pk-hex { flex: 1; height: 32px; font-size: 13px; text-transform: uppercase; }
.pk-hex:focus { box-shadow: inset 0 0 0 1.5px var(--pip); }
.pk-pal { width: 100%; align-self: stretch; }
.pk-pal-h { display: flex; justify-content: space-between; align-items: center; margin: 4px 0 6px; font: 700 10.5px var(--ui); letter-spacing: .07em; text-transform: uppercase; color: var(--faint); }
.pk-pal-h button { color: var(--muted); font-size: 11px; letter-spacing: 0; text-transform: none; font-weight: 600; }
.pk-pal-h button:hover { color: var(--text); }
.pk-swatches { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; }
.pk-swatches button { aspect-ratio: 1; border-radius: 6px; box-shadow: inset 0 0 0 1px rgba(127,127,127,.25); transition: transform .12s; }
.pk-swatches button:hover { transform: scale(1.18); z-index: 1; }
.pk-swatches button.add { display: grid; place-items: center; background: var(--s2); color: var(--muted); box-shadow: none; }
.pk-swatches button.add .ico svg { width: 12px; height: 12px; }
.pk-swatches .ph { aspect-ratio: 1; border-radius: 6px; background: var(--s1); }
.pk-palscroll { height: 334px; overflow-y: auto; width: 100%; padding-right: 2px; }
.pk-contrast { display: flex; gap: 6px; width: 100%; }
.pk-contrast div { flex: 1; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; gap: 6px; font: 700 12px var(--ui); }
.pk-contrast small { font: 600 10px var(--mono); opacity: .8; }

/* Loupe fallback (screen capture) */
.loupe-layer { position: fixed; inset: 0; z-index: 50; cursor: none; pointer-events: auto; }
.loupe { position: fixed; width: 132px; height: 132px; border-radius: 50%; overflow: hidden; pointer-events: none; box-shadow: 0 0 0 4px #fff, 0 0 0 5px rgba(0,0,0,.3), 0 14px 30px rgba(0,0,0,.45); }
.loupe canvas { width: 100%; height: 100%; image-rendering: pixelated; }
.loupe-tag { position: fixed; pointer-events: none; padding: 5px 9px; border-radius: 8px; background: #0c0c10; color: #fff; font: 700 11px var(--mono); box-shadow: 0 6px 16px rgba(0,0,0,.35); }

/* ================= COMMON LAYERS ================= */
.toasts { position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%); z-index: 60; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
.toast {
  display: flex; align-items: center; gap: 9px; padding: 10px 16px 10px 12px; border-radius: 14px;
  background: #0d0d12; color: #fff; font: 600 13px var(--ui); box-shadow: 0 14px 34px rgba(0,0,0,.4), inset 0 0 0 1px rgba(255,255,255,.08);
  opacity: 0; transform: translateY(10px) scale(.96); transition: all .3s cubic-bezier(.2,1.3,.4,1);
}
.toast.in { opacity: 1; transform: none; }
.toast .ico { width: 22px; height: 22px; border-radius: 50%; background: var(--ok); color: #06210f; }
.toast.err .ico { background: var(--err); color: #2a0509; }
.toast .ico svg { width: 13px; height: 13px; stroke-width: 3; }
.menu {
  position: fixed; z-index: 70; min-width: 230px; max-width: 300px; padding: 6px; border-radius: 14px; pointer-events: auto;
  background: var(--solid); box-shadow: var(--shadow), inset 0 0 0 1px var(--line2);
  opacity: 0; transform: translateY(-4px) scale(.98); transition: all .18s;
}
.menu.in { opacity: 1; transform: none; }
.menu-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 9px; color: var(--muted); text-align: left; }
.menu-item:hover { background: var(--s2); color: var(--text); }
.menu-item.disabled { opacity: .4; cursor: default; }
.menu-item.disabled:hover { background: none; }
.menu-txt { display: flex; flex-direction: column; min-width: 0; }
.menu-txt b { color: var(--text); font-weight: 600; font-size: 12.5px; }
.menu-txt small { font-size: 11px; color: var(--faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.menu-sep { height: 1px; background: var(--line); margin: 5px 6px; }
.hl { position: fixed; z-index: 15; pointer-events: none; border-radius: 8px; border: 2px solid var(--hl); background: color-mix(in srgb, var(--hl) 14%, transparent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--hl) 25%, transparent); animation: hlin .4s cubic-bezier(.2,1.3,.4,1); transition: opacity .5s; }
.hl.out { opacity: 0; }
@keyframes hlin { from { transform: scale(1.08); opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .wt *, .wt *::before, .wt *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
`;
})();
