// Every menu screen and card: title, slots, settings, how-to-play, credits, pause (tabs: Pause,
// Map, Crickets, Sound Book), the save-crack menu, the trio picker, zone complete, the lair
// "Ready?" card, the damper card, and the Carrier's facilities. All DOM, one focus model (ui.js):
// mouse, touch, keys and pad. `A` is the app context from main.js.
import { CRICKETS, CRICKET_IDS } from '../../data/crickets.js';
import { ZONE_INFO } from '../../data/zones.js';
import { line } from '../lines.js';
import { MapView, itemTally } from '../map.js';
import { completionOf, rescueCount, voiceOf, voicesCovered, suggestVoiceTrio, canChirp, ensure, RESCUABLE } from '../meta.js';
import * as S from '../sprites.js';

const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  }
  for (const kid of kids) if (kid != null) e.append(kid);
  return e;
};
const portrait = (id, cls = 'pic') => {
  const p = S.exists(`sprites/crickets/${id}/portrait.webp`) ? `assets/sprites/crickets/${id}/portrait.webp` : null;
  const d = h('span', { class: cls });
  if (p) d.append(h('img', { src: p, alt: '' })); else { d.style.background = CRICKETS[id]?.color || '#888'; }
  return d;
};
const fmtTime = (s) => { const m = Math.floor((s || 0) / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`; };
const zoneName = (n) => ZONE_INFO[n]?.name || '';
const zoneOfCricket = (id) => Object.values(ZONE_INFO).find((z) => z.cricket === id);

// ---------------------------------------------------------------- title
export function title(A) {
  A.ui.showTitleArt(true);
  if (!A.titleReady) {
    A.ui.menu('press', [], { title: 'House Cricket', big: true, sub: 'Bought as gecko food. Escaped. Coming back for everyone.', note: matchMedia('(pointer: coarse)').matches ? 'Tap to start' : 'Press any key or button', class: 'panel-title' }); // [final-S] same words as index.html's boot title
    return;
  }
  const latest = A.Save.latestSlot();
  A.ui.menu('title', [
    { label: 'New Game', action: () => newGameSlots(A) },
    { label: 'Continue', action: () => A.continueGame(latest), disabled: !latest },
    { label: 'Load', action: () => slots(A) },
    { label: 'Settings', action: () => settings(A, () => title(A)) },
    { label: 'How to Play', action: () => howto(A, () => title(A)) },
    { label: 'Credits', action: () => A.credits(() => title(A)) },
  ], { title: 'House Cricket', big: true, note: A.padNote(), class: 'panel-title', focus: latest ? 1 : 0 });
  // [polish-T] two buttons a row (meta.css: the panel sits in the sky, top right, clear of the hero cricket);
  // rows keep Up/Down moving straight up and down, Left/Right along a row
  const list = A.ui.menus.querySelector('.panel-title .menu-list');
  if (list) { const bs = [...list.children]; for (let i = 0; i < bs.length; i += 2) { const row = h('div', { class: 'title-row', 'data-row': '1' }); row.append(...bs.slice(i, i + 2)); list.append(row); } }
}

function slotRow(A, n, data) {
  if (!data) return { text: 'Empty', stamp: null };
  if (data.corrupt) return { text: 'This save is damaged', stamp: null };
  const pct = completionOf(data);
  const where = data.carrier ? 'The Carrier' : (data.zoneName || data.room);
  const resc = (data.rescued || []).filter((id) => RESCUABLE.includes(id)).length;
  return { text: `${where} · ${resc}/10 crickets · ${fmtTime(data.playTime)}`, stamp: `${pct}%` };
}
function slotButton(A, n, data, action, opts = {}) {
  const r = slotRow(A, n, data);
  const b = h('button', { class: 'slot-btn menu-btn', 'data-id': `slot${n}` });
  b.append(h('span', { class: 'slot-n', text: `Slot ${n}` }), h('span', { class: 'slot-info', text: r.text }));
  if (r.stamp) b.append(h('span', { class: 'stamp', 'aria-label': `${r.stamp} complete`, text: r.stamp }));
  if (opts.disabled) b.disabled = true;
  b.addEventListener('click', action);
  b.addEventListener('pointerenter', () => { const i = A.ui.buttons().indexOf(b); if (i >= 0) A.ui.setFocus(i, true); });
  return b;
}
export function newGameSlots(A) {
  A.warmOpening?.(); // [issue 16] the first story panel
  const list = h('div', { class: 'menu-list' });
  for (const { n, data } of A.Save.listSlots()) {
    list.append(slotButton(A, n, data, () => {
      if (!data) return A.newGame(n);
      A.ui.menu('confirm', [
        { label: `Start over in slot ${n}`, action: () => A.newGame(n) },
        { label: 'Keep it', action: () => newGameSlots(A) },
      ], { title: 'Start over?', sub: `This erases the save in slot ${n}.`, back: () => newGameSlots(A), focus: 1 });
    }));
  }
  list.append(A.ui.item({ label: 'Back', action: () => title(A) }));
  A.ui.menu('newgame', [], { title: 'New Game', sub: 'Pick a slot.', body: list, back: () => title(A) });
}
export function slots(A) {
  const list = h('div', { class: 'menu-list' });
  for (const { n, data } of A.Save.listSlots()) {
    const row = h('div', { class: 'slot-row', 'data-row': '1' });
    row.append(slotButton(A, n, data, () => { if (data && !data.corrupt) A.continueGame({ n, data }); }, { disabled: !data || data.corrupt }));
    if (data) {
      const erase = h('button', { class: 'menu-btn erase-btn', text: 'Erase', 'aria-label': `Erase slot ${n}` });
      erase.addEventListener('click', () => A.ui.menu('confirm', [
        { label: `Erase slot ${n}`, action: () => { A.Save.clearSlot(n); slots(A); } },
        { label: 'Keep it', action: () => slots(A) },
      ], { title: 'Erase this save?', sub: 'It cannot be brought back.', back: () => slots(A), focus: 1 }));
      row.append(erase);
    }
    list.append(row);
  }
  list.append(A.ui.item({ label: 'Back', action: () => title(A) }));
  A.ui.menu('slots', [], { title: 'Load', body: list, back: () => title(A) });
}

// ---------------------------------------------------------------- settings
export function settings(A, back, focus) {
  const st = A.settings;
  const set = (k) => (v) => { A.setSetting(k, v); };
  const items = [
    { kind: 'slider', label: 'Music volume', id: 'music', get: () => st.music, set: set('music') },
    { kind: 'slider', label: 'Sound volume', id: 'sfx', get: () => st.sfx, set: set('sfx') },
    { kind: 'slider', label: 'Beacon volume', id: 'beacon', get: () => st.beacon, set: set('beacon') },
    { kind: 'choice', label: 'Beacon chirps', id: 'beaconChirps', get: () => st.beaconChirps, set: set('beaconChirps'), options: [{ v: 'always', label: 'Always' }, { v: 'call', label: 'When I call' }, { v: 'off', label: 'Off' }] },
    { kind: 'choice', label: 'Ear guide', id: 'ear', get: () => st.ear, set: set('ear'), options: [{ v: 'helps', label: 'When it helps' }, { v: 'always', label: 'Always out' }, { v: 'listen', label: 'Only when I listen' }] }, // [issue 10] With Beacon chirps Off, When it helps counts as Always out
    { kind: 'toggle', label: 'Always show beacon ripples', id: 'ripples', get: () => st.ripples, set: set('ripples') },
    { kind: 'toggle', label: 'Easier beacon pitch', id: 'easyPitch', get: () => st.easyPitch, set: set('easyPitch') },
    { kind: 'toggle', label: 'Mute', id: 'muted', get: () => st.muted, set: (v) => A.setMuted(v) },
    { kind: 'toggle', label: 'Gentle Mode', id: 'gentle', get: () => st.gentle, set: set('gentle') },
    { kind: 'toggle', label: 'Vibration', id: 'vibration', get: () => st.vibration, set: set('vibration') },
    { kind: 'toggle', label: 'Screen shake', id: 'shake', get: () => st.shake, set: set('shake') },
    { kind: 'choice', label: 'Text speed', id: 'textSpeed', get: () => st.textSpeed, set: set('textSpeed'), options: [{ v: 'slow', label: 'Slow' }, { v: 'normal', label: 'Normal' }, { v: 'fast', label: 'Fast' }, { v: 'instant', label: 'Instant' }] },
  ];
  if (A.showReport()) items.push({ label: 'Report a bug', id: 'report', action: () => A.openReport() });
  items.push({ label: 'Back', id: 'back', action: back });
  // two columns: Up/Down move by rows, Left/Right change the focused setting
  // two columns, read down the first then the second (Up/Down walk them in that order)
  const body = h('div', { class: 'settings-grid' });
  body.style.gridTemplateRows = `repeat(${Math.ceil(items.length / 2)}, auto)`;
  for (const it of items) body.append(A.ui.item(it));
  A.ui.menu('settings', [], { title: 'Settings', body, back, class: 'panel-settings', focus });
}

// ---------------------------------------------------------------- how to play
const SCHEMES = [{ id: 'keyboard', label: 'Keyboard' }, { id: 'touch', label: 'Touch' }, { id: 'gamepad', label: 'Controller' }];
function capAs(A, action, scheme, layout) {
  const inp = A.input, was = inp.last, wl = inp.layout, wf = inp.forceScheme;
  inp.last = scheme; inp.forceScheme = scheme; if (layout) inp.layout = layout; // [polish-T] forceScheme: a phone still shows the Keyboard tab's keys
  try { return A.ui.cap(action); } finally { inp.last = was; inp.layout = wl; inp.forceScheme = wf; }
}
export function howto(A, back, scheme) {
  scheme = scheme || (A.input.last === 'gamepad' ? 'gamepad' : (A.input.scheme ? A.input.scheme() : A.input.last) === 'touch' ? 'touch' : 'keyboard'); // [polish-T]
  const body = h('div', { class: 'howto-card' });
  // [polish-T] Move is both directions ({move}: ← → or A D), Swap both keys; no action id ever shows
  // [issue #27] the keyboard's ↑ / W jump too (and climb a line); Enter (go in, use) is ↓ on every scheme;
  // look-up is the stick's (touch, pad); the Cloak is held: Shift on the keyboard, stick / D-pad up elsewhere
  const kb = scheme === 'keyboard';
  // [issue #37] on the keyboard ↑ / W is THE jump (Z / Space only in the layout note below)
  const rows = [['move', 'Move'], kb ? ['jump', 'Jump (hold for higher); climb a line'] : ['jump', 'Jump (hold for higher)'], ...(kb ? [] : [['up', 'Look up; climb a line']]), ['kick', 'Kick'], ['chirp', 'Chirp: call, stun bugs'], ['listen', 'Listen (hold, standing still)'], ['use', 'Use an item'], ['enter', 'Hide, save, talk, go in'], ['down', 'Drop through (+Jump)'], ['cloak', 'Cloak (hold; once found)'], ['swap', 'Swap cricket'], ['map', 'Map'], ['pause', 'Pause']];
  const grid = h('div', { class: 'howto' });
  for (const [a, t] of rows) {
    const r = h('div', { class: 'howto-row' });
    const keys = h('span', { class: 'howto-keys' }); // [polish-T] the chips never wrap
    if (scheme === 'keyboard') {
      const c1 = capAs(A, a, 'keyboard', 'arrows'), c2 = capAs(A, a, 'keyboard', 'wasd');
      keys.append(c1); if (c2.textContent !== c1.textContent) keys.append(h('span', { class: 'or', text: 'or' }), c2);
    } else if (scheme === 'touch') {
      const tl = { map: 'Map icon', pause: 'Pause icon' }[a];
      keys.append(tl ? h('span', { class: 'cap cap-touch', text: tl }) : capAs(A, a, 'touch'));
    } else {
      const pl = { up: 'Up', down: 'Down', enter: 'Down', cloak: 'Up' }[a];
      keys.append(pl ? h('span', { class: 'cap cap-pad', text: pl }) : capAs(A, a, 'gamepad'));
    }
    r.append(keys, h('span', { class: 'howto-what', text: t }));
    grid.append(r);
  }
  // [issue 33] what crumbs are for: the empty cell beside Pause (13 rows), so the card grows no taller
  grid.append(h('div', { class: 'howto-row howto-crumbs' }, h('span', { class: 'howto-keys' }, h('span', { class: 'crumb-icon howto-crumb', 'aria-label': 'crumbs' })), h('span', { class: 'howto-what', text: line('howto.crumbs') })));
  body.append(grid);
  body.append(h('p', { class: 'howto-note', text: line('howto.ear') })); // [issue 10] the ear guide
  const note = scheme === 'gamepad' ? line('howto.padNote') : scheme === 'touch' ? line('howto.touchNote') : 'Two layouts: arrows with Z X C V B, or WASD with Space and J K L I (Z and Space jump too).';
  body.append(h('p', { class: 'howto-note', text: note }));
  if (A.showReport() && scheme === 'keyboard') body.append(h('p', { class: 'howto-note', text: line('howto.report') })); // [polish-T] a keyboard shortcut: the Keyboard tab only
  const go = (id) => howto(A, back, id);
  A.ui.menu('howto', [{ label: 'Back', action: back }], {
    title: 'How to Play', body, back, tabs: SCHEMES, tab: scheme, onTab: go, class: 'panel-wide panel-howto', // [polish-T] one size for every tab
  });
}

// ---------------------------------------------------------------- pause (tabs)
export function pauseTabs(A, tab) {
  const t = [{ id: 'pause', label: 'Paused' }, { id: 'map', label: 'Map' }, { id: 'crickets', label: 'Crickets' }];
  if (A.game?.recruits.has('page') || tab === 'sounds') t.push({ id: 'sounds', label: 'Sound Book' }); // [polish-T] the Sound Book open = its tab shows (lit)
  return t;
}
export function pause(A, tab = 'pause', msg) {
  A.pauseMsg = msg ?? A.pauseMsg;
  const onTab = (id) => pause(A, id);
  const common = { tabs: pauseTabs(A, tab), tab, onTab, back: () => A.resume(), class: 'panel-pause' }; // [polish-T] tab
  if (tab === 'map') return mapTab(A, common);
  if (tab === 'crickets') return cricketsTab(A, common);
  if (tab === 'sounds') return soundsTab(A, common);
  const g0 = A.game;
  const items = [
    { label: 'Resume', action: () => A.resume() },
  ];
  // [final-S] free: back where you came into the room (in a gecko fight: the phase restart)
  if (g0 && !g0.inCarrier && g0.room) items.push({ label: 'Back to room entrance', sub: g0.inFight?.() ? 'Restarts this phase of the fight.' : null, id: 'entrance', action: () => A.backToEntrance() });
  items.push(
    { label: 'How to Play', action: () => howto(A, () => pause(A)) },
    { label: 'Settings', action: () => settings(A, () => pause(A)) },
  );
  if (A.showReport()) items.push({ label: 'Report a bug', action: () => A.openReport() });
  items.push({ label: 'Save and Quit to Title', action: () => A.quitToTitle() });
  const g = A.game;
  const where = g?.inCarrier ? 'The Carrier' : (g?.zone?.name || '');
  A.ui.menu('pause', items, { ...common, title: A.pauseMsg || 'Paused', sub: where ? `${where} · ${rescueCount(g)}/10 crickets home` : null });
}

function mapTab(A, common, opts = {}) {
  const g = A.game, m = ensure(g);
  const view = new MapView(g, { house: A.house, echo: g.recruits.has('velvet') || m.notCrickets.includes('velvet'), stitchMode: !!opts.stitch });
  view.mode = A.mapMode || 'zone';
  const body = h('div', { class: 'map-wrap' });
  body.append(view.canvas);
  const legend = h('div', { class: 'map-legend' });
  for (const [k, t] of [['carrier', 'Carrier'], ['save', 'Save crack'], ['item', 'Item'], ['ledge', 'Out of reach'], ['recruit', 'Someone to meet'], ['lair', 'Gecko lair'], ['ear', 'Heard here']]) legend.append(h('span', { class: `lg lg-${k}`, text: t }));
  if (m.stitches.length || g.recruits.has('weft')) legend.append(h('span', { class: 'lg lg-stitch', text: 'Stitch' }));
  body.append(legend);
  if (opts.tally) {
    const tl = h('div', { class: 'tally' });
    for (const z of itemTally(g)) tl.append(h('div', { class: 'tally-row' }, h('span', { text: z.zone }), h('span', { text: `items ${z.found}/${z.all}` }), h('span', { text: `secrets ${z.secrets}/${z.secretsAll}` })));
    body.append(tl);
  }
  const row = h('div', { class: 'btn-row', 'data-row': '1' });
  const zoneBtn = A.ui.item({ label: view.mode === 'zone' ? 'Whole house' : 'This zone', action: () => { A.mapMode = view.mode === 'zone' ? 'house' : 'zone'; mapTab(A, common, opts); } });
  row.append(zoneBtn);
  if (g.recruits.has('weft')) {
    row.append(A.ui.item({ label: opts.stitch ? 'Done sewing' : 'Sew a stitch', action: () => mapTab(A, common, { ...opts, stitch: !opts.stitch }) }));
  }
  row.append(A.ui.item({ label: 'Back', action: common.back }));
  body.append(row);
  const sub = opts.stitch ? 'Move the needle and press to sew or unpick a stitch.' : null;
  A.ui.menu('map', [], { ...common, body, sub, class: 'panel-pause panel-map' });
  A.ui.mapView = view;
  requestAnimationFrame(() => view.draw());
  if (opts.stitch) {
    view.startCursor();
    A.ui.onKey = (f) => {
      const dx = (f.held.right ? 1 : 0) - (f.held.left ? 1 : 0), dy = (f.held.down ? 1 : 0) - (f.held.up ? 1 : 0);
      if (dx || dy) { view.moveCursor(dx * 0.35, dy * 0.35); view.draw(); }
      if (f.pressed.confirm || f.pressed.jump) { view.toggleStitch(); view.draw(); return true; }
      if (f.pressed.back) { mapTab(A, common, { ...opts, stitch: false }); return true; }
      if (f.pressed.swapPrev || f.pressed.swapNext) { A.ui.onKey = null; return false; }
      return true;
    };
  } else A.ui.onKey = null;
}

function statBar(label, v) {
  const b = h('div', { class: 'stat' }, h('span', { class: 'stat-l', text: label }));
  const bar = h('span', { class: 'stat-bar' });
  for (let i = 0; i < 5; i++) bar.append(h('span', { class: 'stat-pip' + (i < v ? ' on' : '') }));
  b.append(bar);
  return b;
}
export function canChangeTrio(A) {
  const g = A.game;
  if (!g) return false;
  if (g.inCarrier) return true;
  const p = g.player;
  return (g.saves || []).some((s) => Math.abs(s.x + 20 - p.cx) < 60 && Math.abs(s.y + 40 - (p.y + p.h)) < 50);
}
export function applyTrio(g, trio) {
  const p = g.player, cur = p.id;
  p.trio = trio.slice(0, 3);
  p.active = Math.max(0, p.trio.indexOf(cur));
  p.queuedSwap = null;
  p.setCricket(p.id);
}
function cricketsTab(A, common, sel) {
  const g = A.game;
  const home = CRICKET_IDS.filter((id) => id === 'pip' || g.rescued.has(id));
  sel = sel || g.player.id;
  const body = h('div', { class: 'crickets-tab' });
  const grid = h('div', { class: 'cricket-grid' });
  const rows = [CRICKET_IDS.slice(0, 4), CRICKET_IDS.slice(4, 8), CRICKET_IDS.slice(8)];
  const detail = h('div', { class: 'cricket-detail' });
  const showDetail = (id) => {
    detail.innerHTML = '';
    const c = CRICKETS[id];
    if (!home.includes(id)) {
      const z = zoneOfCricket(id);
      detail.append(h('h3', { text: '???' }), h('p', { class: 'muted', text: z ? `Somewhere in the ${z.name}.` : 'Somewhere in the house.' }));
      return;
    }
    detail.append(portrait(id, 'big-pic'), h('h3', { text: c.name }), h('p', { class: 'species', text: `${c.species}${c.khz ? ` · ${c.khz} kHz` : ' · silent'}` }));
    detail.append(statBar('Speed', c.spd), statBar('Jump', c.jmp), statBar('Chirp', c.chp), statBar('Weight', c.wt));
    detail.append(h('p', { class: 'perk', text: c.perkName }));
    if (g.player.trio.includes(id)) detail.append(h('p', { class: 'in-trio', text: 'In your trio' }));
  };
  for (const r of rows) {
    const row = h('div', { class: 'cricket-row', 'data-row': '1' });
    for (const id of r) {
      const known = home.includes(id);
      const b = h('button', { class: 'cricket-cell' + (g.player.trio.includes(id) ? ' in-trio' : '') + (known ? '' : ' unknown'), 'aria-label': known ? CRICKETS[id].name : 'Not found yet', 'data-id': id });
      b.append(portrait(id));
      b.append(h('span', { class: 'cc-name', text: known ? CRICKETS[id].name : '?' }));
      b._onFocus = () => showDetail(id);
      b.addEventListener('click', () => { if (known) A.playSong(id); });
      b.addEventListener('pointerenter', () => { const i = A.ui.buttons().indexOf(b); if (i >= 0) A.ui.setFocus(i, true); });
      row.append(b);
    }
    grid.append(row);
  }
  body.append(grid, detail);
  const row = h('div', { class: 'btn-row', 'data-row': '1' });
  if (canChangeTrio(A)) row.append(A.ui.item({ label: 'Change trio', action: () => trioPicker(A, () => pause(A, 'crickets')) }));
  row.append(A.ui.item({ label: 'Back', action: common.back }));
  body.append(row);
  const note = canChangeTrio(A) ? 'Press a cricket to hear its song.' : 'Press a cricket to hear its song. Change your trio at a save crack or in the Carrier.';
  A.ui.menu('crickets', [], { ...common, body, note, class: 'panel-pause panel-wide', focus: sel });
  showDetail(sel);
}
function soundsTab(A, common) {
  const g = A.game, m = ensure(g);
  const ids = [...new Set([...m.sounds, ...RESCUABLE.filter((id) => g.rescued.has(id))])];
  A.warmSongs?.(ids); // [issue 14] its recorded voices load as the book opens
  const body = h('div', { class: 'sound-book' });
  const fact = h('p', { class: 'sound-fact' });
  const grid = h('div', { class: 'sound-grid' });
  for (let i = 0; i < ids.length; i += 4) {
    const row = h('div', { class: 'sound-row', 'data-row': '1' });
    for (const id of ids.slice(i, i + 4)) {
      // the button shows who (the name in brackets); the line below says what it is and a fact
      const full = line(`sounds.${id}.name`), m2 = full.match(/^(.*) \((.*)\)$/);
      const b = A.ui.item({ label: m2 ? m2[2] : full, class: 'sound-btn', action: () => A.playSong(id) });
      b._onFocus = () => { fact.textContent = `${m2 ? m2[1] : full}: ${line(`sounds.${id}.fact`)}`; };
      row.append(b);
    }
    grid.append(row);
  }
  body.append(grid, fact);
  const row = h('div', { class: 'btn-row', 'data-row': '1' });
  row.append(A.ui.item({ label: 'Back', action: common.back }));
  body.append(row);
  A.ui.menu('sounds', [], { ...common, body, title: 'Sound Book', sub: 'Every sound you have heard. Press one to play it.', class: 'panel-pause panel-wide' }); // [polish-T] a title
}

// ---------------------------------------------------------------- trio picker
// opts: {voices: true (Nana's door), title, done(trio)}
export function trioPicker(A, back, opts = {}) {
  const g = A.game;
  const home = CRICKET_IDS.filter((id) => id === 'pip' || g.rescued.has(id));
  let pick = A._trioDraft || [...g.player.trio];
  const body = h('div', { class: 'trio-picker' });
  const status = h('p', { class: 'trio-status' });
  const chips = h('div', { class: 'voice-chips' });
  const grid = h('div', { class: 'cricket-grid' });
  const cells = [];
  const refresh = () => {
    cells.forEach(({ b, id }) => {
      const i = pick.indexOf(id);
      b.classList.toggle('in-trio', i >= 0);
      b.querySelector('.cc-order').textContent = i >= 0 ? String(i + 1) : '';
    });
    const ok = valid();
    status.textContent = ok ? `Your trio: ${pick.map((id) => CRICKETS[id].name).join(', ')}` : (pick.length === 0 ? 'Pick up to three.' : 'At least one of them must be able to chirp.');
    if (opts.voices) {
      const v = voicesCovered(pick);
      chips.innerHTML = '';
      for (const k of ['low', 'mid', 'high']) chips.append(h('span', { class: 'chip' + (v[k] ? ' on' : ''), text: line(`nana.${k}`) }));
    }
    done.disabled = !ok;
  };
  const valid = () => pick.length >= 1 && pick.length <= 3 && pick.some(canChirp);
  for (let r = 0; r < home.length; r += 6) {
    const row = h('div', { class: 'cricket-row', 'data-row': '1' });
    for (const id of home.slice(r, r + 6)) { // 6 a row (11 crickets: 6 + 5)
      const b = h('button', { class: 'cricket-cell', 'aria-label': CRICKETS[id].name, 'data-id': id });
      b.append(portrait(id), h('span', { class: 'cc-name', text: CRICKETS[id].name }), h('span', { class: 'cc-order' }));
      if (opts.voices && voiceOf(id)) b.append(h('span', { class: `cc-voice v-${voiceOf(id)}`, text: voiceOf(id) === 'mid' ? 'middle' : voiceOf(id) }));
      b.addEventListener('click', () => {
        const i = pick.indexOf(id);
        if (i >= 0) pick.splice(i, 1); else if (pick.length < 3) pick.push(id); else { pick.shift(); pick.push(id); }
        A._trioDraft = pick; refresh();
      });
      b.addEventListener('pointerenter', () => { const i = A.ui.buttons().indexOf(b); if (i >= 0) A.ui.setFocus(i, true); });
      cells.push({ b, id }); row.append(b);
    }
    grid.append(row);
  }
  body.append(grid, chips, status);
  const btns = h('div', { class: 'btn-row', 'data-row': '1' });
  const finish = () => { A._trioDraft = null; applyTrio(g, pick); A.sfx('swap-puff'); (opts.done || back)(pick); };
  const done = A.ui.item({ label: 'Done', action: () => { if (valid()) finish(); } });
  if (opts.voices) btns.append(A.ui.item({ label: 'Suggest a trio', action: () => { const s = suggestVoiceTrio(home); if (s) { pick = s; A._trioDraft = pick; refresh(); } } }));
  btns.append(done, A.ui.item({ label: 'Cancel', action: () => { A._trioDraft = null; back(); } }));
  body.append(btns);
  A.ui.menu('trio', [], { title: opts.title || 'Pick your trio', sub: opts.voices ? line('nana.rule') : 'Up to three crickets travel with you.', body, back: () => { A._trioDraft = null; back(); }, class: 'panel-wide', focus: g.player.id });
  refresh();
}

// ---------------------------------------------------------------- save crack
export function crackMenu(A) {
  const g = A.game, m = ensure(g);
  const items = [{ label: 'Keep exploring', action: () => A.resume() }];
  items.push({ label: 'Change trio', action: () => trioPicker(A, () => crackMenu(A)) });
  items.push({ label: 'Go to the Carrier', action: () => A.goCarrier(g.saveCrack) });
  if (g.recruits.has('shelly') && m.cracks.length > 1) items.push({ label: 'Travel by Post', action: () => post(A, () => crackMenu(A)) });
  A.ui.menu('crack', items, { title: 'Saved', sub: 'You feel better. The crack runs through the wall to the Carrier.', back: () => A.resume() });
}

// ---------------------------------------------------------------- cards
export function zoneComplete(A, id) {
  const c = CRICKETS[id];
  const body = h('div', { class: 'card-body' }, portrait(id, 'big-pic'), h('p', { class: 'quote', text: `“${line(`crickets.${id}.thanks`)}”` }));
  A.ui.menu('complete', [
    { label: 'Return to the Carrier', action: () => A.goCarrier(ensure(A.game).lairCrack || A.game.saveCrack || A.here()) }, // [final-S] then back to the lair's save crack
    { label: 'Not now', action: () => A.resume() },
  ], { title: `${c.name} is safe!`, sub: 'Return to the Carrier?', body, back: () => A.resume(), class: 'panel-card' });
}
const TEXT_HINT = (boss) => { const v = line(`geckos.${boss}.hint`); return typeof v === 'string' && v !== 'hint' ? v : ''; }; // [final-G]
// door: {boss, to?, at?, room} -- the lair "Ready?" card
export function lairReady(A, door) {
  const g = A.game, boss = door.boss, m = ensure(g);
  const nana = boss === 'nana';
  const gecko = h('div', { class: 'gecko-pic' });
  // [builder C] no gecko rig (Sir Bartholomew): his golden eye from sprites/npcs/<boss>-eye.webp
  const gp = S.exists(`sprites/geckos/${boss}/portrait.webp`) ? `assets/sprites/geckos/${boss}/portrait.webp` : S.exists(`sprites/geckos/${boss}/idle.webp`) ? `assets/sprites/geckos/${boss}/idle.webp` : S.exists(`sprites/npcs/${boss}-eye.webp`) ? `assets/sprites/npcs/${boss}-eye.webp` : null; // [polish-V] portrait.webp: a face portrait for the tall climbers (Big Tok, Nana)
  if (gp) gecko.append(h('img', { src: gp, alt: '' }));
  const trio = h('div', { class: 'ready-trio' });
  for (const id of g.player.trio) { const w = h('div', { class: 'rt' }, portrait(id), h('span', { text: CRICKETS[id].name })); if (nana && voiceOf(id)) w.append(h('span', { class: `cc-voice v-${voiceOf(id)}`, text: voiceOf(id) === 'mid' ? 'middle' : voiceOf(id) })); trio.append(w); }
  const body = h('div', { class: 'card-body ready' }, gecko, trio);
  const v = voicesCovered(g.player.trio);
  if (nana) body.append(h('p', { class: 'nana-rule', text: line('nana.rule') }));
  if (TEXT_HINT(boss)) body.append(h('p', { class: 'nana-rule boss-hint', text: TEXT_HINT(boss) })); // [final-G] one-line hint (text.js geckos.<boss>.hint)
  const back = () => lairReady(A, door);
  const items = [
    { label: 'Enter', action: () => A.enterLair(door), disabled: nana && !v.all },
    { label: 'Change trio', action: () => trioPicker(A, back, { voices: nana, title: nana ? 'Low, middle, high' : 'Pick your trio' }) },
  ];
  if (nana && !v.all) items.push({ label: 'Suggest a trio', action: () => { const s = suggestVoiceTrio(CRICKET_IDS.filter((id) => id === 'pip' || g.rescued.has(id))); if (s) applyTrio(g, s); back(); } });
  items.push({ label: 'Not yet', action: () => A.resume() });
  if (!m.lairsSeen.includes(boss)) m.lairsSeen.push(boss);
  A.ui.menu('ready', items, { title: `${line(`geckos.${boss}.name`)}: Ready?`, body, back: () => A.resume(), class: 'panel-card panel-ready' });
}
export function damperCard(A) {
  const g = A.game;
  const missing = RESCUABLE.filter((id) => id !== 'chip' && !g.rescued.has(id));
  const list = h('ul', { class: 'missing' });
  for (const id of missing) { const z = zoneOfCricket(id); list.append(h('li', { text: `${CRICKETS[id].name}: ${z ? z.name : '?'}` })); }
  // [polish-T] everyone found (the 9 rescues) but the Carrier hasn't sung yet: say where to go, not an empty list
  const body = missing.length ? h('div', {}, h('p', { text: line('damper.missing') }), list) : h('div', {}, h('p', { class: 'damper-home', text: line('damper.allFound') }));
  A.ui.menu('damper', [{ label: 'OK', action: () => A.resume() }], { title: 'The damper is stuck', sub: line('damper.shut'), body, back: () => A.resume(), class: 'panel-card' });
}

// [issue 25] After Duchess has eaten Pip three times in the opening chase: offer Gentle Mode (once)
export function gentleOffer(A) {
  A.ui.menu('gentle', [
    { label: 'Turn on Gentle Mode', action: () => { A.setSetting('gentle', true); A.toast(line('ui.gentleOn')); A.resume(); } },
    { label: 'Keep trying', action: () => A.resume() },
  ], { title: 'Gentle Mode?', sub: line('opening.tank.gentleOffer'), back: () => A.resume(), class: 'panel-card' });
}

// ---------------------------------------------------------------- Carrier facilities
export const SHOP = [
  { id: 'heart', cost: 30, max: 5, key: 'hearts' },
  { id: 'song', cost: 25, max: 3, key: 'songs' },
  { id: 'ear', cost: 20, max: 2, key: 'ears' },
];
export function shop(A, back = () => A.resume(), note = null) {
  const g = A.game, m = ensure(g);
  const items = SHOP.map((it) => {
    const have = m.upgrades[it.key] || 0, out = have >= it.max;
    return {
      label: `${line(`shop.${it.id}.name`)} · ${out ? 'sold out' : `${it.cost} crumbs`}`, sub: `${line(`shop.${it.id}.desc`)} (${have}/${it.max})`, disabled: out,
      action: () => {
        if (m.crumbs < it.cost) { A.sfx('menu-back'); shop(A, back, line('shop.broke')); return; }
        m.crumbs -= it.cost; m.upgrades[it.key] = have + 1;
        if (it.key === 'hearts') { g.player.maxHealth += 1; g.player.health = g.player.maxHealth; }
        A.applyUpgrades(); A.sfx('seed-heart'); shop(A, back, line('shop.bought'));
      },
    };
  });
  items.push({ label: 'Back', action: back });
  A.ui.menu('shop', items, { title: line('npcs.rolo.facility'), sub: `${line('npcs.rolo.carrier')} You have ${m.crumbs} crumbs.`, note: note || '', back, class: 'panel-card', focus: A.ui.screen === 'shop' ? A.ui.focusIdx : 0 });
}
export function clinic(A) {
  const g = A.game;
  g.player.health = g.player.maxHealth;
  const tips = line('clinic');
  const tip = tips[1 + ((g.frame >> 4) % (tips.length - 1))];
  A.dialogSay([['dot', tips[0]], ['dot', tip]]);
}
export function stage(A, back = () => A.resume()) {
  const m = ensure(A.game);
  const songs = [...new Set(['carrier', 'title', ...m.songs])];
  const items = songs.map((s) => ({ label: songName(s), action: () => A.playMusic(s) }));
  items.push({ label: 'Stop the music', action: () => A.playMusic(null) });
  items.push({ label: 'Back', action: back });
  A.ui.menu('stage', items, { title: line('npcs.glim.facility'), sub: line('npcs.glim.carrier'), back, class: 'panel-card' });
}
function songName(id) {
  const z = Object.values(ZONE_INFO).find((zz) => zz.id === id);
  return z ? z.name : ({ carrier: 'The Carrier', title: 'House Cricket', boss: 'Gecko!', lair: 'The lair door', finale: 'The chorus' }[id] || id);
}
export function post(A, back = () => A.resume()) {
  const g = A.game, m = ensure(g);
  const here = g.saveCrack?.room;
  const items = m.cracks.filter((c) => g.world.rooms[c.room]).map((c) => {
    const r = g.world.rooms[c.room];
    return { label: `${r.zone.name || ''}: ${r.name}`, disabled: !g.inCarrier && c.room === here, action: () => A.travel(c), onFocus: () => A.artAhead?.(c.room) }; // [issue 16] its art loads while it's in focus
  });
  items.push({ label: 'Back', action: back });
  A.ui.menu('post', items, { title: line('npcs.shelly.facility'), sub: line('npcs.shelly.carrier'), back, class: 'panel-card' });
}
export function facility(A, kind, owner) {
  switch (kind) {
    case 'shop': return shop(A);
    case 'library': return pause(A, A.game.recruits.has('page') ? 'sounds' : 'crickets');
    case 'maptable': A.paused = true; return mapTab(A, { tabs: pauseTabs(A), tab: 'map', onTab: (id) => pause(A, id), back: () => A.resume() }, { tally: true });
    case 'echo': return pause(A, 'map');
    case 'weaver': A.paused = true; return mapTab(A, { tabs: pauseTabs(A), tab: 'map', onTab: (id) => pause(A, id), back: () => A.resume() }, { stitch: true });
    case 'clinic': return clinic(A);
    case 'trainer': return A.dialogSay([['crumb', line('trainer')]]);
    case 'stage': return stage(A);
    case 'post': return post(A);
    default: return A.dialogSay([[owner, line(`npcs.${owner}.carrier`)]]);
  }
}
export function hubCrack(A) {
  const g = A.game;
  let rc = g.returnCrack, r = rc && g.world.rooms[rc.room]; // [final-S] always a way out: else zone 1's start crack
  if (!r) { rc = g.homeCrack; r = rc && g.world.rooms[rc.room]; g.returnCrack = rc; }
  const items = [];
  if (r) items.push({ label: `Back to ${r.zone.name ? r.zone.name + ': ' : ''}${r.name}`, action: () => A.leaveCarrier() });
  items.push({ label: 'Change trio', action: () => trioPicker(A, () => hubCrack(A)) });
  if (g.recruits.has('shelly')) items.push({ label: 'Travel by Post', action: () => post(A, () => hubCrack(A)) });
  items.push({ label: 'Stay a while', action: () => A.resume() });
  A.ui.menu('hubcrack', items, { title: 'The crack in the corner', sub: 'Saved. Where to?', back: () => A.resume() });
}
