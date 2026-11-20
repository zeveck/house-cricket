// DOM HUD, menus and cards (minimal for milestone 1): title -> play, pause, a HUD with
// hearts, the chirp meter and the trio, prompts with key caps / pad glyphs, toasts, item cards.
// One focus model: arrows/WASD/stick/d-pad move focus, confirm presses, back closes; mouse
// and touch click directly.
import { CRICKETS } from '../data/crickets.js';
import { ITEMS } from '../data/items.js';
import * as S from './sprites.js';
import { turn } from './ear.js';
import { NOTE, noteLive } from './notes.js'; // [issue 9] tutorial notes on the path
import { TILE } from '../data/movement.js';

const $ = (sel, root = document) => root.querySelector(sel);
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  }
  for (const kid of kids) if (kid != null) e.append(kid);
  return e;
};

// [issue #8] arrow key caps: the font has no arrows (its fallback ↑ read as a "1"), so draw bold ones
const ARROW = { '↑': ['up', 0], '→': ['right', 90], '↓': ['down', 180], '←': ['left', 270] };
const arrowSvg = (ch) => `<svg class="cap-arrow" viewBox="0 0 20 20" role="img" aria-label="${ARROW[ch][0]} arrow"><path transform="rotate(${ARROW[ch][1]} 10 10)" d="M10 2.5 L17 10 H12.6 V17.5 H7.4 V10 H3 Z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
const ICON = {
  heart: '<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21C5 15 1 11.5 1 7a5.5 5.5 0 0 1 11-1 5.5 5.5 0 0 1 11 1c0 4.5-4 8-11 14z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>',
  map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="currentColor" stroke-width="2"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8c1.5 1.2 1.5 6.8 0 8M19 5c3 2.5 3 11.5 0 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  speakerOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  cross: '<svg viewBox="0 0 20 20" aria-label="cross"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  circle: '<svg viewBox="0 0 20 20" aria-label="circle"><circle cx="10" cy="10" r="5.5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  square: '<svg viewBox="0 0 20 20" aria-label="square"><rect x="4.5" y="4.5" width="11" height="11" rx="1" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  triangle: '<svg viewBox="0 0 20 20" aria-label="triangle"><path d="M10 4l6.5 11h-13z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/></svg>',
};

// the ear of the chirp indicator (the floating one and the docked HUD button share it)
const EAR_PATHS = '<path class="ci-ear" d="M0.5 -11.5 C7.5 -11.5 10.5 -6 9.5 -1 C8.8 2.5 6 3.8 5 6.5 C3.8 10 1.5 12 -1.5 11.5 C-4 11 -4.5 8.5 -6.5 6.5 C-9.5 3 -9.5 -11.5 0.5 -11.5 Z"/>'
  + '<path class="ci-curl" d="M-3.5 -2 C-3.5 -7.5 5 -7.5 5 -2.5 C5 0.5 2 0.8 1.5 3.5 M-1 -1.5 C-1 -3.5 2 -3.5 2 -1.5"/>';

export class UI {
  constructor(root, input) {
    this.root = root; this.input = input;
    this.screen = null; this.handlers = {};
    this.focusIdx = 0; this.repeat = { dir: 0, t: 0 };
    this.build();
  }
  build() {
    const r = this.root;
    this.hud = h('div', { class: 'hud', hidden: '' });
    this.hearts = h('div', { class: 'hearts', 'aria-label': 'health' });
    this.meter = h('div', { class: 'chirp-meter', 'aria-label': 'chirp meter' });
    this.trio = h('div', { class: 'trio' });
    const left = h('div', { class: 'hud-left' }, h('div', { class: 'hud-row' }, this.hearts), h('div', { class: 'hud-row' }, this.meter), this.trio);
    this.btnMute = h('button', { class: 'icon-btn', 'aria-label': 'mute', title: 'Mute (M)', onclick: () => this.handlers.mute?.() });
    this.btnMap = h('button', { class: 'icon-btn', 'aria-label': 'map', title: 'Map (Tab)', onclick: () => this.handlers.map?.() });
    this.btnPause = h('button', { class: 'icon-btn', 'aria-label': 'pause', title: 'Pause (Esc)', onclick: () => this.handlers.pause?.() });
    this.btnMap.innerHTML = ICON.map; this.btnPause.innerHTML = ICON.pause;
    // meta HUD: crumbs counter (top-right), Frost's thermometer, the chirp indicator (screen edge)
    this.crumbs = h('button', { class: 'crumbs', type: 'button', 'aria-label': 'Crumbs' });
    // Native button handles click, touch, Enter and Space without activating game controls.
    this.crumbs.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.crumbs.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); });
    this.crumbs.addEventListener('click', (e) => { e.stopPropagation(); this.handlers.crumbHint?.(this.crumbs.title); });
    this.crumbs.append(h('span', { class: 'crumb-icon' }), h('span', { class: 'crumb-n', text: '0' }));
    this.thermo = h('div', { class: 'thermo', hidden: '' }, h('span', { class: 'thermo-tube' }, h('span', { class: 'thermo-fill' })), h('span', { class: 'thermo-read', text: '70°F' }));
    // [final-S] the chirp indicator: an ear with sound waves that pulse with each beacon chirp and grow with loudness
    // [issue 10] the ear guide: it rests as a HUD button (this.earDock) and comes out to the screen edge
    // (this.indicator) when it helps; a click pins / rests / dismisses it, a double click toggles auto-chirp
    this.indicator = h('button', { type: 'button', class: 'chirp-ind', id: 'chirp-indicator', hidden: '', tabindex: '-1', 'aria-label': 'Ear guide' });
    // [issue #10 review] the nudge and the fade play once: clear them when they end, or showing the ear again
    // (from display:none) restarts them, and every later Listen would wobble like a lost-out
    this.indicator.addEventListener('animationend', (e) => {
      if (e.animationName === 'ear-this-way') this.indicator.classList.remove('this-way');
      else if (e.animationName === 'ear-fade') this.indicator.classList.remove('fade-in');
    });
    this.indicator.innerHTML = '<span class="ci-ring"></span><svg viewBox="-32 -32 64 64" class="ci-svg" aria-hidden="true">'
      + '<g class="ci-waves"><path class="w1" d="M19.5 -11.3 A22.5 22.5 0 0 1 19.5 11.3"/><path class="w2" d="M24.2 -14 A28 28 0 0 1 24.2 14"/><path class="w3" d="M28.6 -16.5 A33 33 0 0 1 28.6 16.5"/></g>'
      + '<circle class="ci-disc" r="16"/>' + EAR_PATHS + '<path class="ci-gap" d="M-10 -10 L10 10"/><path class="ci-strike" d="M-10 -10 L10 10"/></svg>';
    this.earDock = h('button', { type: 'button', class: 'icon-btn ear-btn', hidden: '', tabindex: '-1', 'aria-label': 'Ear guide (resting)' });
    this.earDock.innerHTML = '<svg viewBox="-14 -14 28 28" aria-hidden="true" class="ear-svg">' + EAR_PATHS + '<path class="ci-gap" d="M-10 -10 L10 10"/><path class="ci-strike" d="M-10 -10 L10 10"/></svg>';
    this.earTaps(this.indicator); this.earTaps(this.earDock);
    this.ripples = h('div', { class: 'beacon-ripples', 'aria-hidden': 'true' });
    this.strip = h('canvas', { class: 'beacon-strip', hidden: '', 'aria-hidden': 'true', width: '300', height: '44' });
    const right = h('div', { class: 'hud-right' }, this.crumbs, this.earDock, this.btnMute, this.btnMap, this.btnPause);
    this.prompt = h('div', { class: 'prompt', hidden: '' });
    // [issue 9] the tip card and the toasts share one centred column, the card first (updateTips)
    this.tipCard = h('div', { class: 'tip-card', hidden: '', 'aria-live': 'polite' });
    this.toastBox = h('div', { class: 'toasts', 'aria-live': 'polite' });
    this.tipCol = h('div', { class: 'tip-col' }, this.tipCard, this.toastBox);
    this.tipsRead = new Set(); // main.js hands over the save slot's set (read notes; never part of the sim)
    this.card = h('div', { class: 'item-card', hidden: '' });
    this.prompt.addEventListener('click', () => this.handlers.promptTap?.());
    this.hud.append(this.ripples, left, right, this.thermo, this.indicator, this.strip, this.prompt, this.tipCol, this.card);
    // [final-S] index.html shows the title before the game loads: adopt its nodes where they are (moving them would restart the fade/animations)
    const bootArt = r.querySelector(':scope > .title-art[data-boot]'), bootMenus = r.querySelector(':scope > .menus[data-boot]');
    this.menus = bootMenus || h('div', { class: 'menus' });
    this.rotate = h('div', { class: 'rotate-note' }, h('div', { class: 'rotate-icon' }), h('p', { text: 'Turn your phone sideways to play.' }));
    this.titleArt = bootArt || h('div', { class: 'title-art', hidden: '' });
    // [playtest] on a slow line the painting streamed in top-down under an already-shown title: decode it first, then fade the title in
    { const im = new Image(); const ready = () => document.body.classList.add('title-ready'); im.src = 'assets/title.webp'; (im.decode ? im.decode() : Promise.reject()).then(ready, () => { im.onload = ready; im.onerror = ready; if (im.complete) ready(); }); setTimeout(ready, 15000); }
    if (bootArt && bootMenus) { bootArt.removeAttribute('data-boot'); bootMenus.removeAttribute('data-boot'); r.insertBefore(this.hud, bootMenus); r.append(this.rotate); }
    else r.append(this.titleArt, this.hud, this.menus, this.rotate);
  }

  // ---- menus ----
  // items: [{label, action, disabled, kind, ...}]; opts: {title, sub, note, back, body, big,
  //   tabs: [{id, label}], tab, onTab(id), class, foot}
  // kinds: (default) button; 'toggle' {get, set}; 'slider' {get, set, min, max, step};
  //   'choice' {get, set, options: [{v, label}]}. Left/Right adjust them; Enter toggles/cycles.
  menu(name, items, opts = {}) {
    // [final-S] the boot title (index.html) is this very panel: keep it, don't rebuild it
    const boot = name === 'press' && this.menus.querySelector(':scope > .panel-press[data-boot]');
    if (boot) {
      boot.removeAttribute('data-boot'); if (opts.note) boot.querySelector('.note').textContent = opts.note;
      this.menus.hidden = false; this.screen = name; this.onBack = opts.back || null; this.onTab = null; this.onKey = null; this.focusIdx = 0;
      return boot;
    }
    this.menus.innerHTML = '';
    this.onKey = null; // [final-S] a screen that wants raw keys (the stitch needle) sets it again after menu()
    this.guard = 0; // [polish-T] meta-run handoff() sets it after menu()
    const panel = h('div', { class: `panel panel-${name} ${opts.class || ''}`, 'data-screen': name, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': `h-${name}` });
    if (opts.tabs) panel.append(this.tabBar(opts.tabs, opts.tab, opts.onTab));
    if (opts.title) panel.append(h(opts.big ? 'h1' : 'h2', { id: `h-${name}`, text: opts.title }));
    if (opts.sub) panel.append(h('p', { class: 'sub', text: opts.sub }));
    if (opts.body) panel.append(opts.body);
    if (items && items.length) {
      const list = h('div', { class: 'menu-list' });
      items.forEach((it) => list.append(this.item(it)));
      panel.append(list);
    }
    if (opts.note) panel.append(h('p', { class: 'note', text: opts.note }));
    if (opts.foot) panel.append(opts.foot);
    this.menus.append(panel);
    this.menus.hidden = false;
    this.screen = name; this.onBack = opts.back || null;
    this.onTab = opts.tabs ? (dir) => { const i = opts.tabs.findIndex((t) => t.id === opts.tab); const n = opts.tabs[(i + dir + opts.tabs.length) % opts.tabs.length]; if (n && opts.onTab) opts.onTab(n.id); } : null;
    this.focusIdx = 0;
    const want = opts.focus != null ? opts.focus : 0;
    this.setFocus(typeof want === 'number' ? want : Math.max(0, this.buttons().findIndex((b) => b.dataset.id === want)));
    return panel;
  }
  tabBar(tabs, current, onTab) {
    const bar = h('div', { class: 'tabs', role: 'tablist' });
    const keys = (this.input.scheme ? this.input.scheme() : this.input.last) !== 'touch'; // [polish-T] no Q/E chips on touch (tap the tabs)
    if (keys) bar.append(h('span', { class: 'tab-key' }, this.cap('swapPrev')));
    for (const t of tabs) {
      const b = h('button', { class: 'tab' + (t.id === current ? ' on' : ''), role: 'tab', 'aria-selected': t.id === current ? 'true' : 'false', 'data-nofocus': '1', text: t.label });
      b.addEventListener('click', () => onTab && onTab(t.id));
      bar.append(b);
    }
    if (keys) bar.append(h('span', { class: 'tab-key' }, this.cap('swapNext'))); // [polish-T]
    return bar;
  }
  // One focusable row.
  item(it) {
    const kind = it.kind || 'button';
    const b = h('button', { class: `menu-btn kind-${kind} ${it.offLabel ? 'named-vals' : ''} ${it.class || ''}` });
    if (it.id) b.dataset.id = it.id;
    if (it.disabled) b.disabled = true;
    if (it.onFocus) b._onFocus = it.onFocus; // [issue 16] e.g. the Post loads the focused destination's art
    const label = h('span', { class: 'mb-label' });
    if (it.icon) label.append(it.icon);
    label.append(it.label);
    b.append(label);
    if (it.sub) b.append(h('span', { class: 'mb-sub', text: it.sub }));
    const val = h('span', { class: 'mb-val' });
    const show = () => {
      if (kind === 'toggle') { val.textContent = it.get() ? it.onLabel || 'On' : it.offLabel || 'Off'; b.setAttribute('aria-pressed', it.get() ? 'true' : 'false'); }
      else if (kind === 'slider') {
        val.innerHTML = '';
        const v = it.get(), max = it.max ?? 1, min = it.min ?? 0;
        const bar = h('span', { class: 'slider' }); const fill = h('span', { class: 'slider-fill' });
        fill.style.width = `${((v - min) / (max - min)) * 100}%`; bar.append(fill);
        val.append(bar, h('span', { class: 'slider-num', text: String(Math.round(((v - min) / (max - min)) * 10)) }));
      } else if (kind === 'choice') { const o = it.options.find((x) => x.v === it.get()) || it.options[0]; val.textContent = o.label; }
    };
    if (kind !== 'button') { b.append(val); show(); }
    b._adjust = kind === 'button' ? null : (dir) => {
      if (kind === 'toggle') it.set(!it.get());
      else if (kind === 'slider') { const st = it.step ?? 0.1, max = it.max ?? 1, min = it.min ?? 0; it.set(Math.round(Math.max(min, Math.min(max, it.get() + dir * st)) * 100) / 100); }
      else if (kind === 'choice') { const i = it.options.findIndex((x) => x.v === it.get()); it.set(it.options[(i + dir + it.options.length) % it.options.length].v); }
      show();
    };
    b.addEventListener('click', (e) => {
      if (it.disabled) return;
      if (kind === 'slider') {
        const r = val.getBoundingClientRect();
        if (e.clientX && r.width && e.clientX >= r.left) { const fx = Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(1, r.width - 24))); const min = it.min ?? 0, max = it.max ?? 1, st = it.step ?? 0.1; it.set(Math.round((min + fx * (max - min)) / st) * st); show(); }
        else b._adjust(1);
        return;
      }
      if (b._adjust) { b._adjust(1); return; }
      it.action && it.action();
    });
    b.addEventListener('pointerenter', () => { const i = this.buttons().indexOf(b); if (i >= 0 && i !== this.focusIdx) this.setFocus(i, true); });
    return b;
  }
  closeMenu() { this.menus.innerHTML = ''; this.menus.hidden = true; this.screen = null; this.onBack = null; this.onTab = null; this.onAdjust = null; this.onKey = null; } // [final-S] onKey too
  // Focusable elements of the open menu, in order: buttons and [data-focus] (not tabs, not hidden).
  buttons() { return [...this.menus.querySelectorAll('button:not([disabled]):not([data-nofocus]), [data-focus]:not([disabled])')].filter((b) => b.offsetParent !== null || b === document.activeElement); }
  setFocus(i, fromPointer) {
    const bs = this.buttons();
    if (!bs.length) return;
    this.focusIdx = (i + bs.length) % bs.length;
    bs.forEach((b, j) => b.classList.toggle('focus', j === this.focusIdx));
    const el = bs[this.focusIdx];
    try { el.focus({ preventScroll: true }); } catch { /* ignore */ }
    if (!fromPointer) try { el.scrollIntoView({ block: 'nearest' }); } catch { /* ignore */ }
    if (el._onFocus) el._onFocus();
  }
  focused() { return this.buttons()[this.focusIdx] || null; }
  // Called every fixed update while a menu is open. Stick/d-pad/keys move the focus once,
  // then repeat after 350 ms every ~120 ms. Left/Right adjust settings or move along a row.
  menuInput(f) {
    if (!this.screen) return;
    if (this.guard > 0) { this.guard--; return; } // [polish-T] a card handed over from a dialog ignores input for its first 30 steps (0.5 s)
    if (this.onKey && this.onKey(f)) return;          // a screen that wants raw input (map cursor)
    const v = (f.held.down ? 1 : 0) - (f.held.up ? 1 : 0), hz = (f.held.right ? 1 : 0) - (f.held.left ? 1 : 0);
    const pv = (f.pressed.down ? 1 : 0) - (f.pressed.up ? 1 : 0), ph = (f.pressed.right ? 1 : 0) - (f.pressed.left ? 1 : 0);
    const go = (axis, d) => {
      if (axis === 'v') { this.moveFocus(d, 'v'); return; }
      const el = this.focused();
      if (el && el._adjust) el._adjust(d);
      else this.moveFocus(d, 'h');
    };
    if (pv) { go('v', pv); this.repeat = { dir: pv, axis: 'v', t: 0 }; }
    else if (ph) { go('h', ph); this.repeat = { dir: ph, axis: 'h', t: 0 }; }
    else {
      const cur = this.repeat.axis === 'v' ? v : hz;
      if (cur && cur === this.repeat.dir) { this.repeat.t++; if (this.repeat.t > 21 && (this.repeat.t - 21) % 7 === 0) go(this.repeat.axis, cur); }
      else this.repeat = { dir: 0, axis: null, t: 0 };
    }
    if (!this.screen) return;
    if (this.onTab && (f.pressed.swapPrev || f.pressed.swapNext)) { this.onTab(f.pressed.swapNext ? 1 : -1); return; }
    if (f.pressed.confirm) { const b = this.focused(); if (b) { b.click(); return; } }
    if (f.pressed.back && this.onBack) this.onBack();
  }
  // Vertical moves go by rows: buttons in a [data-row] container count as one row (left/right
  // moves inside it). Without rows it's a plain list.
  moveFocus(d, axis) {
    const bs = this.buttons();
    if (!bs.length) return;
    const cur = bs[this.focusIdx];
    const rowOf = (b) => b?.closest('[data-row]');
    if (axis === 'h') {
      const row = rowOf(cur);
      if (!row) return;
      const inRow = bs.filter((b) => rowOf(b) === row);
      const j = inRow.indexOf(cur) + d;
      if (j >= 0 && j < inRow.length) this.setFocus(bs.indexOf(inRow[j]));
      return;
    }
    const row = rowOf(cur);
    let i = this.focusIdx;
    if (row) {
      // leave the row: from its first (down: last) member onward
      const inRow = bs.filter((b) => rowOf(b) === row);
      i = bs.indexOf(d > 0 ? inRow[inRow.length - 1] : inRow[0]);
      const col = inRow.indexOf(cur);
      let n = (i + d + bs.length) % bs.length;
      const nrow = rowOf(bs[n]);
      if (nrow && nrow !== row) { const nIn = bs.filter((b) => rowOf(b) === nrow); n = bs.indexOf(nIn[Math.min(col, nIn.length - 1)]); }
      this.setFocus(n);
      return;
    }
    let n = (i + d + bs.length) % bs.length;
    const nrow = rowOf(bs[n]);
    if (nrow) { const nIn = bs.filter((b) => rowOf(b) === nrow); n = bs.indexOf(d > 0 ? nIn[0] : nIn[0]); }
    this.setFocus(n);
  }

  // ---- HUD ----
  showHUD(v) { this.hud.hidden = !v; }
  showTitleArt(v) { this.titleArt.hidden = !v; }
  updateHUD(game) {
    const p = game.player;
    const key = `${p.health}/${p.maxHealth}`;
    if (this._hk !== key) {
      this._hk = key; this.hearts.innerHTML = '';
      for (let i = 0; i < p.maxHealth; i++) { const s = h('span', { class: 'heart' + (i < p.health ? '' : ' empty') }); s.innerHTML = ICON.heart; this.hearts.append(s); }
    }
    const mk = `${p.chirpMeter}:${p.stats.chp}`;
    if (this._mk !== mk) {
      this._mk = mk; this.meter.innerHTML = '';
      this.meter.classList.toggle('silent', p.stats.chp === 0);
      for (let i = 0; i < 3; i++) this.meter.append(h('span', { class: 'pip' + (i < p.chirpMeter ? ' full' : '') }));
    }
    const tk = `${p.trio.join(',')}:${p.active}:${p.queuedSwap}:${game.portraitGlow ? JSON.stringify(game.portraitGlow) : ''}`; // [builder D] portraitGlow
    if (this._tk !== tk) {
      this._tk = tk; this.trio.innerHTML = '';
      p.trio.forEach((id, i) => {
        const c = CRICKETS[id];
        const b = h('button', { class: 'portrait' + (i === p.active ? ' active' : '') + (i === p.queuedSwap ? ' queued' : ''), 'aria-label': `swap to ${c.name}`, title: c.name });
        const img = S.exists(`sprites/crickets/${id}/portrait.webp`) ? h('img', { src: `assets/sprites/crickets/${id}/portrait.webp`, alt: '' }) : null;
        if (img) b.append(img); else { b.style.background = c.color; b.append(h('span', { text: c.name })); }
        const glow = game.portraitGlow?.[id]; // [builder D] a boss can make portraits glow: game.portraitGlow = {id: colour}
        if (glow) { b.style.borderColor = glow; b.style.boxShadow = `0 0 0 3px ${glow}, 0 0 18px 6px ${glow}`; }
        b.addEventListener('click', () => this.handlers.swapTo?.(i));
        this.trio.append(b);
      });
    }
    // only when it changes: replacing the svg every frame swapped the node under the pointer between
    // mousedown and mouseup, so the browser dropped the click (issue #2)
    if (this._muteK !== !!this.muted) { this._muteK = !!this.muted; this.btnMute.innerHTML = this.muted ? ICON.speakerOff : ICON.speaker; }
    // toasts
    const tKey = game.toasts.map((t) => t.f + t.text).join('|') + this.capKey(); // [polish-T] caps follow the input in use
    if (tKey !== this._toastKey) {
      this._toastKey = tKey; this.toastBox.innerHTML = '';
      for (const t of game.toasts.slice(-2)) { // [fixer] {action} tokens in toasts render as key caps too
        const el = h('div', { class: 'toast' });
        if (String(t.text).includes('{')) el.append(...this.richText(t.text)); else el.textContent = t.text;
        this.toastBox.append(el);
      }
    }
    // item card
    if (game.card) {
      const k = game.card.item + game.card.f;
      if (this._ck !== k) {
        this._ck = k; const it = ITEMS[game.card.item];
        this.card.innerHTML = '';
        this.card.append(h('div', { class: 'card-kicker', text: 'Found!' }), h('div', { class: 'card-name', text: it.name }), this.verbLine(game.card.item));
        this.card.hidden = false;
      }
    } else if (!this.card.hidden) { this.card.hidden = true; this._ck = null; }
    // signs (hint) and context prompts
    this.updateHints(game);
    // [issue 10] no separate Listen arrow: while Listening the ear guide comes out and is the arrow
  }
  verbLine(item) {
    const verbs = { booties: [['Press toward a wall in the air', null]], floss: [['Grab a hook', 'use']], raft: [['Float on water', null]], band: [['Hold to charge a super-jump', 'use']], glider: [['Hold while falling to glide', 'jump']], thimble: [['Ground-pound:', 'down'], ['+', 'jump']], glow: [['Light the dark; tap to flash', 'use']], earplugs: [['Walk through loud places', null]], feather: [['Press in the air to flutter', 'jump']] };
    const p = h('div', { class: 'card-verb' });
    for (const [text, action] of verbs[item] || [[ITEMS[item].verb, null]]) {
      if (action) p.append(this.cap(action), ' ');
      p.append(text + ' ');
    }
    return p;
  }
  // Text with {action} tokens -> nodes, the tokens drawn as key caps / pad glyphs.
  richText(text) {
    const out = [];
    for (const part of pairTokens(text).split(/(\{[a-zA-Z]+\})/)) { // [polish-T] {left} {right} -> {move}, {swapPrev} {swapNext} -> {swap}
      const m = part.match(/^\{([a-zA-Z]+)\}$/);
      if (m) out.push(this.cap(m[1])); else if (part) out.push(document.createTextNode(part));
    }
    return out;
  }
  // A key cap or pad glyph for an action (never a bare letter).
  cap(action) {
    // [polish-T] the pairs: one chip on touch ("Stick", "Tap a face"), two caps on keys (← →, Q E) / the pad (L1 R1)
    const sch = this.input.scheme ? this.input.scheme() : this.input.last;
    if ((action === 'move' && sch === 'keyboard') || (action === 'swap' && sch !== 'touch')) {
      const [a, b] = action === 'move' ? ['left', 'right'] : ['swapPrev', 'swapNext'];
      return h('span', { class: 'cap-pair' }, this.cap(a), this.cap(b));
    }
    const l = this.input.label(action);
    const e = h('span', { class: `cap cap-${l.kind}` });
    if (l.kind === 'glyph') e.innerHTML = ICON[l.text];
    else if (/[←→↑↓]/.test(l.text)) { for (const part of l.text.split(/([←→↑↓])/)) { if (!part) continue; if (ARROW[part]) e.insertAdjacentHTML('beforeend', arrowSvg(part)); else e.append(part); } } // [issue #8]
    else e.textContent = l.text;
    return e;
  }
  capKey() { return (this.input.scheme ? this.input.scheme() : this.input.last) + this.input.layout + this.input.padFamily; } // [polish-T]
  updateHints(game) {
    const p = game.player;
    let prompt = null;
    for (const s of game.hideSpots || []) if ((!s.small || p.tiny) && Math.abs(s.x + s.w / 2 - p.cx) < s.w / 2 + 14 && Math.abs(s.y + s.h - (p.y + p.h)) < 12 && p.state === 'ground') prompt = ['up', 'Hide'];
    for (const s of game.saves || []) if (Math.abs(s.x + 20 - p.cx) < 40 && Math.abs(s.y + 40 - (p.y + p.h)) < 40 && p.grounded) prompt = ['up', 'Save'];
    if (p.state === 'hide') prompt = p.hideHold ? ['jump', 'Jump to leave'] : ['right', 'Move to leave']; // [issue 7] the tank's sniff: only Jump leaves
    if (p.has('floss') && p.state !== 'swing') for (const k of game.hooks || []) if (Math.hypot(k.x - p.cx, k.y - p.cy) < 70) prompt = ['use', 'Grab'];
    if (p.state === 'swing') prompt = ['jump', 'Fling'];
    if (this.extraPrompt && !prompt) prompt = this.extraPrompt;   // meta: Carrier facilities, talkers, lair doors
    const pk = prompt ? prompt.join(':') + this.capKey() : ''; // [polish-T]
    if (pk !== this._pk) {
      this._pk = pk; this.prompt.innerHTML = '';
      if (prompt) { this.prompt.append(this.cap(prompt[0]), ' ', ...this.richText(prompt[1])); this.prompt.hidden = false; } else this.prompt.hidden = true; // [polish-T] richText
    }
    this.updateTips(game, prompt);
  }
}

// ---- meta HUD (crumbs, Frost's thermometer, the chirp indicator) ----
// info: {crumbs, temp (null unless Frost leads), indicator: {on, angle, strength, pulse} | null}
UI.prototype.updateMetaHUD = function (info) {
  const ck = String(info.crumbs);
  const help = info.rolo ? "Spend them at Rolo's Crumb Shop (the Carrier)." : 'Hang on to these: someone in this house trades for them.';
  this.crumbs.title = help;
  this.crumbs.setAttribute('aria-label', `${ck} crumbs. ${help}`);
  if (this._crumbK !== ck) { this._crumbK = ck; this.crumbs.lastChild.textContent = ck; this.crumbs.classList.remove('bump'); void this.crumbs.offsetWidth; this.crumbs.classList.add('bump'); }
  if (info.temp != null) {
    this.thermo.hidden = false;
    const tk = String(info.temp);
    if (this._tempK !== tk) { this._tempK = tk; this.thermo.lastChild.textContent = `${info.temp}°F`; this.thermo.querySelector('.thermo-fill').style.height = `${Math.max(8, Math.min(100, (info.temp - 40) * 1.6))}%`; }
  } else this.thermo.hidden = true;
  const ear = info.ear, bc = info.beacon;
  this._beaconPulse = bc?.show ? bc.pulse || 0 : 0;
  // [issue 10] the ear guide. Resting: a HUD button beside mute / map / pause; out: the ear at the screen
  // edge (the button keeps its place, unseen, so the row never jumps). Neither shows where there's no
  // cricket to follow (main.js: info.ear null). Classes and labels change only on a change (never
  // rebuild clickable nodes).
  const auto = info.autoChirp !== false, out = !!(ear && ear.out);
  if (this.earDock.hidden === !!ear) this.earDock.hidden = !ear;
  if (this.earDock.classList.contains('away') !== out) this.earDock.classList.toggle('away', out);
  const ek = `${auto}|${ear?.mode}|${ear?.reason}|${out}`;
  if (this._earK !== ek) {
    this._earK = ek;
    for (const e of [this.indicator, this.earDock]) e.classList.toggle('auto-off', !auto);
    const dbl = `double-click to turn auto-chirp ${auto ? 'off' : 'on'}`;
    const click = !ear ? '' : ear.reason === 'listen' ? 'Listening' : !out ? 'Click to keep the ear out' : ear.reason === 'always' ? 'Click to rest the ear' : 'Click to tuck the ear away until it can help again';
    this.earDock.setAttribute('aria-label', `Ear guide, resting, auto-chirp ${auto ? 'on' : 'off'}`);
    this.earDock.title = `Ear guide: ${click}, ${dbl}`;
    this.indicator.setAttribute('aria-label', `Ear guide, the way to go, auto-chirp ${auto ? 'on' : 'off'}`);
    this.indicator.title = `Ear guide: ${click}, ${dbl}`;
  }
  // resting, the button gives a small pulse with each chirp
  if (ear && !out) { const k = `scale(${(1 + 0.2 * (ear.pulseV || 0)).toFixed(2)})`; if (this._dockPu !== k) { this._dockPu = k; this.earDock.firstChild.style.transform = k; } }
  // the shown angle turns toward the way to walk (ear.js turn(): the short way, at most a half-turn a
  // second, frozen while paused); it snaps when it comes out, after a rewind and on a room change (with a fade)
  const now = performance.now(), dt = info.paused ? 0 : Math.max(0, now - (this._earT ?? now)) / 1000; this._earT = now;
  if (ear && this._earPulseN == null) this._earPulseN = ear.pulseN;
  if (out) {
    const snap = this._earSnap !== ear.snap || this._earC == null || this.indicator.hidden, room = this._earRoom !== ear.room;
    if (snap || room) { this._earC = ear.angle; this._earSign = 1; }
    else { const r = turn(this._earC, ear.angle, Math.min(dt, 0.05), this._earSign); this._earC = r.c; this._earSign = r.sign; }
    if (room && !snap) { const c = this.indicator.classList; c.remove('fade-in'); void this.indicator.offsetWidth; c.add('fade-in'); }
    this.indicator.hidden = false;
    // sit on an ellipse inside the screen edge, in the way to walk; the waves face it
    const a = this._earC, rx = 45, ry = 38, pu = ear.pulseV || 0, ld = ear.strength;
    // [polish-V] never on the HUD or the thumb buttons (main.js measures them: this.avoid): slide in along the ray
    let k = 1; const hw = (this._indW || 0.035) * 0.9, hh = (this._indH || 0.07) * 0.9; // half size (view fractions), waves included
    const avoid = this._tipRect ? [...(this.avoid || []), this._tipRect] : this.avoid || []; // [issue 9] and the tip card
    const hit = (x, y) => avoid.some((r) => x + hw > r.x0 - 0.01 && x - hw < r.x1 + 0.01 && y + hh > r.y0 - 0.01 && y - hh < r.y1 + 0.01); // [polish-V]
    while (k > 0.25 && hit(0.5 + Math.cos(a) * rx * k / 100, 0.5 + Math.sin(a) * ry * k / 100)) k -= 0.05; // [polish-V]
    this.indicator.style.left = `${50 + Math.cos(a) * rx * k}%`; this.indicator.style.top = `${50 + Math.sin(a) * ry * k}%`; // [polish-V] k
    this.indicator.style.opacity = (0.75 + 0.25 * Math.max(ld, pu)).toFixed(2);
    this.indicator.style.transform = `scale(${(0.9 + 0.5 * ld + 0.2 * pu).toFixed(3)})`;
    this.indicator.style.setProperty('--pu', pu.toFixed(3));
    this.indicator.style.setProperty('--ax', Math.cos(a).toFixed(3)); this.indicator.style.setProperty('--ay', Math.sin(a).toFixed(3));
    this.indicator.querySelector('.ci-waves').setAttribute('transform', `rotate(${(a * 180 / Math.PI).toFixed(1)})`);
    const ws = this.indicator.querySelectorAll('.ci-waves path');
    ws.forEach((w, i) => { w.style.opacity = Math.max(0.3 - i * 0.08, Math.min(1, pu * 1.8 - i * 0.35)).toFixed(2); });
    if (!this._indW && this.root.clientWidth) { this._indW = this.indicator.offsetWidth / this.root.clientWidth; this._indH = this.indicator.offsetHeight / this.root.clientHeight; } // [polish-V]
    if (ear.chirpAt != null && ear.chirpAt !== this._indChirp) { this._indChirp = ear.chirpAt; const r = this.indicator.firstChild; r.classList.remove('go'); void r.offsetWidth; r.classList.add('go'); }
    // lost: a short "this way" nudge (main.js plays the soft cue)
    if (ear.pulseN !== this._earPulseN) { this._earPulseN = ear.pulseN; const c = this.indicator.classList; c.remove('this-way'); void this.indicator.offsetWidth; c.add('this-way'); }
  } else { if (!this.indicator.hidden) { this.indicator.hidden = true; this.indicator.classList.remove('this-way', 'fade-in'); } if (ear) this._earPulseN = ear.pulseN; }
  this._earSnap = ear?.snap; this._earRoom = ear?.room;
  // [final-S] the visual double (design: HUD, beacon): screen-edge ripples and the rhythm strip,
  // while listening, for 4 s after a call, or always with "Always show beacon ripples"
  const vis = !!(bc && bc.show && ((info.listening && bc.mode !== 'off') || bc.ripples || info.alwaysRipples)); // [final-2] Beacon chirps Off: Listen shows the ear and the arrow only (as "When I call": ripples after a call)
  if (vis) {
    if (bc.lastChirpFrame != null && bc.lastChirpFrame !== this._ripChirp && bc.frame - bc.lastChirpFrame < 20) {
      this._ripChirp = bc.lastChirpFrame;
      const x = Math.max(0, Math.min(100, 50 + bc.dx * 58)), y = Math.max(0, Math.min(100, 50 + bc.dy * 62));
      const r = h('span', { class: 'ripple' });
      r.style.left = `${x}%`; r.style.top = `${y}%`; r.style.setProperty('--rs', (0.65 + 0.6 * (bc.loudness || 0)).toFixed(2));
      r.addEventListener('animationend', () => r.remove());
      this.ripples.append(r);
      while (this.ripples.childElementCount > 6) this.ripples.firstChild.remove();
    }
    this.drawStrip(bc);
  } else if (!this.strip.hidden) { this.strip.hidden = true; }
};
// The rhythm strip: the last ~3 s of sound, newest at the right edge. The trapped cricket's
// chirps are gold (taller when louder), anything else heard (decoys) grey: their rhythms differ.
UI.prototype.drawStrip = function (bc) {
  const c = this.strip; c.hidden = false;
  const x = c.getContext('2d'), W = c.width, H = c.height, span = 180, f = bc.frame;
  x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgba(42,32,26,.72)'; x.beginPath(); x.roundRect ? x.roundRect(1, 1, W - 2, H - 2, 12) : x.rect(1, 1, W - 2, H - 2); x.fill();
  x.strokeStyle = 'rgba(244,235,221,.35)'; x.lineWidth = 2; x.stroke();
  x.strokeStyle = 'rgba(244,235,221,.25)'; x.lineWidth = 1; x.beginPath(); x.moveTo(12, H / 2); x.lineTo(W - 12, H / 2); x.stroke();
  const at = (fr) => W - 14 - ((f - fr) / span) * (W - 28);
  for (const fr of bc.decoys || []) { if (f - fr > span || fr > f) continue; const px = at(fr); x.fillStyle = 'rgba(200,200,200,.75)'; x.fillRect(px - 2, H / 2 - 7, 4, 14); }
  const hh = 10 + 10 * (bc.loudness || 0);
  for (const fr of bc.history || []) {
    if (f - fr > span || fr > f) continue;
    const px = at(fr), k = Math.exp(-(f - fr) / 12);
    x.fillStyle = `rgba(232,184,90,${(0.55 + 0.45 * k).toFixed(2)})`;
    x.beginPath(); x.roundRect ? x.roundRect(px - 3, H / 2 - hh, 6, hh * 2, 3) : x.rect(px - 3, H / 2 - hh, 6, hh * 2); x.fill();
  }
  x.fillStyle = 'rgba(244,235,221,.9)'; x.fillRect(W - 14, 6, 2, H - 12); // now
};
// [polish-T] {left} {right} (with anything but words between) is one Move chip, {swapPrev} {swapNext} one Swap chip
export function pairTokens(text) { return String(text).replace(/\{left\}\s*(?:\/|or)?\s*\{right\}/g, '{move}').replace(/\{swapPrev\}\s*(?:\/|or)?\s*\{swapNext\}/g, '{swap}'); }
export { ICON };

// ---- [issue 9] the tip card (design: HUD, Tutorial notes) ----
// One tip at a time: a note's card when the cricket comes near it (notes.js NOTE: range, dwell, minimum
// time, linger, read), or a card-only tip while a script has it up (Nana's phase hints). Its slot is
// chosen once, when it appears (the upper slot unless the cricket, a hazard or the gecko's tell is
// there; the lower one; in a fight the taller free band beside the framed pair; a tip's `at: 'low'`),
// and it never moves while shown: if the cricket goes under it, it fades to about 30%. All in view
// fractions; the card is measured only when its text, keys or size change, and moved (a transform) only
// when its place changes. Timing runs on the game clock (a rewind or a new game starts it over).
const SLOT = { top: 0.12, up: 0.25, low: 0.74, bottom: 0.82 }; // view fractions: the band's top, the upper card's top, the lower card's bottom, the band's bottom
const ovl = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
UI.prototype.updateTips = function (game, prompt) {
  const p = game.player, f = game.frame, cam = game.camera, T = TILE;
  const signs = game.signs || [];
  if ((this._tipF != null && f < this._tipF) || this._tipGame !== game) { this.resetTips(); this._tipGame = game; } // rewind / new game
  this._tipF = f;
  if (game.room?.id !== this._tipRoom) { this._tipRoom = game.room?.id; this.resetTips(); }
  const feet = p.y + p.h;
  const near = (sg, rx, up, down) => Math.abs(p.cx - sg.nx) <= rx * T && feet >= sg.ny - up * T && feet <= sg.ny + down * T;
  const appear = (sg) => near(sg, NOTE.appear, 1.5, 0.5), stay = (sg) => near(sg, NOTE.stay, 3, 1);
  const teaches = (sg) => !!(prompt && sg.text.includes(`{${prompt[0]}}`));
  const card = signs.find((s) => s.kind === 'card');
  let st = this._tip && !this._tip.fading ? this._tip : null;
  // a note a script has just put up (the cup rim's) takes over the card at once, if he's near it
  const fresh = signs.find((s) => s.born != null && !this._tipBorn.has(`${s.key}@${s.born}`) && noteLive(game, s));
  if (fresh) {
    this._tipBorn.add(`${fresh.key}@${fresh.born}`);
    if (stay(fresh) && st?.key !== fresh.key) { if (st) this.hideTip(); this.showTip(game, fresh); st = this._tip; }
  }
  if (st) {
    const cur = signs.find((s) => s.key === st.key && s.text === st.text);
    let go = !cur || (st.kind === 'note' && !noteLive(game, cur));
    if (!go && st.kind === 'note') {
      if (card) go = true;
      else if (teaches(cur)) { go = true; this.markTipRead(st); this._tipQuiet = st.key; } // the prompt takes over (a 300 ms fade): read
      else if (stay(cur)) st.out = null;
      else { st.out ??= f; if (f - st.out >= NOTE.linger && f - st.f0 >= NOTE.minShow) go = true; }
      // read: shown in full (not cut to one line under a toast, faded under the cricket or hidden) for long enough
      const full = !['away', 'squeeze', 'under'].some((c) => this.tipCard.classList.contains(c));
      if (full && f > st.lastF) st.full += f - st.lastF;
      st.lastF = f;
      if (!go && !st.read && st.full >= NOTE.fadeIn + NOTE.read) this.markTipRead(st);
    }
    if (go) { this.hideTip(); st = null; }
  }
  if (this._tipQuiet) { const q = signs.find((s) => s.key === this._tipQuiet); if (!q || q.kind !== 'note' || !stay(q)) this._tipQuiet = null; }
  if (!st) {
    if (card) this.showTip(game, card);
    else {
      let best = null, bd = 1e9;
      for (const sg of signs) {
        if (!noteLive(game, sg) || !appear(sg) || sg.key === this._tipQuiet || teaches(sg)) continue;
        const d = Math.abs(p.cx - sg.nx);
        if (d < bd) { best = sg; bd = d; }
      }
      // a read note doesn't come back while he's in the air or stunned
      if (best && this.tipsRead.has(best.key) && (!p.grounded || p.invuln > 0)) best = null;
      if (!best) this._tipCand = null;
      else {
        if (this._tipCand?.key !== best.key) this._tipCand = { key: best.key, f0: f };
        const still = p.grounded && Math.abs(p.vx) < 5;
        if (still || f - this._tipCand.f0 >= NOTE.dwell) this.showTip(game, best);
      }
    }
  }
  st = this._tip;
  // after its fade-out the card goes (and the toasts take the column's usual place)
  if (st?.fading && performance.now() - st.hideAt > 330) { this.tipCard.hidden = true; this._tip = st = null; }
  const live = st && !st.fading;
  this._tipRect = live ? st.rect : null; // the ear guide keeps clear of it (updateMetaHUD)
  // hidden during a running or held room transition (and under any dialog: meta.css modal-open)
  const away = !!(game.trans || this.tipHold);
  if (this.tipCard.classList.contains('away') !== away) this.tipCard.classList.toggle('away', away);
  if (live) {
    const pr = this.viewRect(cam, { x0: p.x, y0: p.y, x1: p.x + p.w, y1: p.y + p.h });
    const under = ovl(pr, st.rect);
    if (this.tipCard.classList.contains('under') !== under) this.tipCard.classList.toggle('under', under);
    const sq = game.toasts.length > 0 && st.lines > 1; // a toast is new information: a long card shrinks to one line
    if (this.tipCard.classList.contains('squeeze') !== sq) this.tipCard.classList.toggle('squeeze', sq);
  }
  // the column: at the card's slot while one shows, else the toasts' usual place
  const H = this.hud.clientHeight || 1;
  const y = st ? st.y0 : this.toastY();
  const tf = `translate(-50%, ${Math.round(y * H)}px)`, lf = `${((st ? st.cx : 0.5) * 100).toFixed(2)}%`;
  if (tf !== this._tipTf) { this._tipTf = tf; this.tipCol.style.transform = tf; }
  if (lf !== this._tipLf) { this._tipLf = lf; this.tipCol.style.left = lf; }
};
UI.prototype.toastY = function () {
  const H = this.hud.clientHeight || 720;
  return matchMedia('(max-height: 500px) and (pointer: coarse)').matches ? 80 / H : 0.3;
};
UI.prototype.resetTips = function () {
  this._tip = null; this._tipCand = null; this._tipQuiet = null; this._tipRect = null; this._tipBorn = new Set();
  this.tipCard.classList.remove('on', 'under', 'squeeze'); this.tipCard.hidden = true;
};
UI.prototype.markTipRead = function (st) {
  st.read = true;
  if (st.kind === 'note' && !this.tipsRead.has(st.key)) { this.tipsRead.add(st.key); this.handlers.tipRead?.(st.key); }
};
UI.prototype.hideTip = function () {
  const st = this._tip; if (!st || st.fading) return;
  st.fading = true; st.hideAt = performance.now();
  this.tipCard.classList.remove('on', 'under');
};
// world rect (room px) -> view fractions
UI.prototype.viewRect = function (cam, r) {
  return { x0: (r.x0 - cam.x) / cam.vw, x1: (r.x1 - cam.x) / cam.vw, y0: (r.y0 - cam.y) / cam.vh, y1: (r.y1 - cam.y) / cam.vh };
};
// The card's content and size (measured only when the text, the keys in use or the screen change)
UI.prototype.setTipText = function (text) {
  const W = this.hud.clientWidth || 1, H = this.hud.clientHeight || 1;
  const k = `${text}|${this.capKey()}|${W}x${H}|${this._tipW}`;
  const el = this.tipCard;
  if (k === this._tipMk) return this._tipSize;
  this._tipMk = k;
  el.classList.remove('squeeze', 'under');
  el.innerHTML = ''; el.append(...this.richText(text));
  el.hidden = false;
  const cs = getComputedStyle(el), pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.35;
  this._tipSize = { w: el.offsetWidth / W, h: el.offsetHeight / H, lines: Math.max(1, Math.round((el.offsetHeight - pad) / lh)) };
  return this._tipSize;
};
UI.prototype.showTip = function (game, sg) {
  const f = game.frame, cam = game.camera, p = game.player, el = this.tipCard;
  const wasHidden = el.hidden;
  const size = this.setTipText(sg.text);
  const cx = this._tipCx ?? 0.5, cw = size.w, ch = size.h;
  const rectAt = (y0) => ({ x0: cx - cw / 2 - 0.01, x1: cx + cw / 2 + 0.01, y0: y0 - 0.01, y1: y0 + ch + 0.01 });
  const top = this._tipTop ?? SLOT.top, up = Math.max(SLOT.up, top), low = SLOT.low - ch;
  let y0 = up, slot = 'up';
  const pip = this.viewRect(cam, cam.pipRect(p));
  const boss = cam.framed ? cam.bossRect() : null;
  if (boss) {
    // a fight: the taller free band above or below the framed pair
    const b = this.viewRect(cam, boss), y0p = Math.min(pip.y0, b.y0), y1p = Math.max(pip.y1, b.y1);
    const above = y0p - top, below = SLOT.bottom - y1p;
    if (above >= below) { y0 = Math.max(top, top + (above - ch) / 2); slot = 'above'; } else { y0 = Math.min(SLOT.bottom - ch, y1p + (below - ch) / 2); slot = 'below'; }
  } else {
    const busy = [pip, ...this.tipHazards(game).map((r) => this.viewRect(cam, r))];
    if (sg.at === 'low' || busy.some((r) => ovl(r, rectAt(up)))) {
      // the lower slot; where the cricket stands low in the view (touch screens frame him ~2/3 down), just under him
      y0 = low; slot = 'low';
      if (ovl(pip, rectAt(low)) && pip.y1 + 0.01 + ch <= 0.96) y0 = pip.y1 + 0.01;
      else if (ovl(pip, rectAt(low)) && !busy.some((r) => ovl(r, rectAt(up)))) { y0 = up; slot = 'up'; }
    }
  }
  this._tip = { key: sg.key, text: sg.text, kind: sg.kind, f0: f, lastF: f, full: 0, out: null, read: false, fading: false, slot, y0, cx, lines: size.lines, rect: rectAt(y0) };
  if (wasHidden) void el.offsetWidth; // the fade-in starts from its own place
  el.classList.add('on');
};
// what the card must not cover when it appears: projectiles, a boss's hazards (the tongs), the gecko's tell
UI.prototype.tipHazards = function (game) {
  const out = [], b = game.boss, f = game.frame;
  for (const r of game.projectiles || []) out.push({ x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h });
  if (b && typeof b.hazards === 'function') out.push(...b.hazards());
  if (b && !b.done && ((b.tellUntil ?? -1) > f || b.mode === 'tell' || b.mode === 'logTell')) { const r = game.camera.bossRect(); if (r) out.push(r); }
  return out;
};
// The card's band and width (main.js measureAvoid: this.avoid): it starts under the icon row (the top row's
// buttons reach towards the middle) and is as wide as the space between the HUD's columns beside it (the
// hearts and portraits on the left, the crumbs on the right), centred, at most 640 px.
UI.prototype.layoutTips = function () {
  const W = this.hud.clientWidth || 0; if (!W) return;
  const hud = (this.avoid || []).filter((a) => a.kind === 'hud');
  let top = SLOT.top;
  for (const a of hud) if (a.x0 < 0.75 && a.x1 > 0.5) top = Math.max(top, a.y1 + 0.01); // the icon row
  let l = 0, r = 1;
  for (const a of hud) if (a.y1 > top) { if (a.x1 < 0.5) l = Math.max(l, a.x1); else if (a.x0 > 0.5) r = Math.min(r, a.x0); }
  const w = Math.round(Math.min(640, 2 * Math.min(0.5 - l, r - 0.5) * W - 16));
  if (w !== this._tipW) { this._tipW = w; this.hud.style.setProperty('--tip-w', w + 'px'); }
  this._tipTop = top; this._tipCx = 0.5;
};
// [issue 9] read-only, for __game.tips(): the card's state; measure: tip texts -> their lines in the card as it is now
UI.prototype.tipsInfo = function (measure) {
  const st = this._tip;
  const out = {
    shown: st && !st.fading ? { key: st.key, text: st.text, kind: st.kind, slot: st.slot, rect: st.rect, lines: st.lines, under: this.tipCard.classList.contains('under'), squeeze: this.tipCard.classList.contains('squeeze'), away: this.tipCard.classList.contains('away') } : null,
    read: [...this.tipsRead], width: this._tipW ?? null, cx: this._tipCx ?? 0.5,
  };
  if (measure) {
    const c = this.tipCard.cloneNode(false); c.className = 'tip-card on'; c.removeAttribute('hidden');
    c.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden';
    this.tipCol.append(c);
    const cs = getComputedStyle(c), pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.35;
    out.measured = measure.map((text) => { c.innerHTML = ''; c.append(...this.richText(text)); return { text, lines: Math.round((c.offsetHeight - pad) / lh), width: c.offsetWidth, max: cs.maxWidth, font: cs.fontSize }; });
    c.remove();
  }
  return out;
};
// [issue 3] taps on the ear (resting or out): [issue 10] one click or tap does what the ear's state at
// the press says (main.js earAction: pin, rest, dismiss; nothing while Listening) once the double-tap
// window has passed; two in a row toggle auto-chirp (and never also click). The window runs from
// the first release to the second press (as a native double-click does), so a slow second press still
// counts. Pointer events with capture, so a tap on the moving ear still counts if it slides between down
// and up; nothing reaches the game (the stage's dialog tap, the touch stick under it) and the button
// never takes focus.
const EAR_DOUBLE_MS = 450, EAR_HOLD_MS = 700; // 450: a relaxed double-click (290-500 ms apart) is still one
UI.prototype.earTaps = function (el) {
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const second = !!this._earTimer; // a press inside the window: this is the double
    if (second) { clearTimeout(this._earTimer); this._earTimer = null; }
    this._earDown = { id: e.pointerId, t: performance.now(), second, act: second ? null : this.handlers.earAction?.() ?? null }; // [issue 10] decided at the press
  });
  el.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    const d = this._earDown; if (!d || d.id !== e.pointerId) return;
    this._earDown = null;
    if (d.second) this.handlers.earAuto?.();
    else if (performance.now() - d.t < EAR_HOLD_MS) this._earTimer = setTimeout(() => { this._earTimer = null; this.handlers.earClick?.(d.act); }, EAR_DOUBLE_MS);
  });
  el.addEventListener('pointercancel', (e) => { if (this._earDown?.id === e.pointerId) this._earDown = null; });
  el.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus off it: Space / Enter stay with the game
  el.addEventListener('click', (e) => { e.stopPropagation(); if (e.detail === 0) this.handlers.earClick?.(this.handlers.earAction?.()); }); // keyboard / assistive activation
};
