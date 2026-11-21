#!/usr/bin/env node
// [issue #27] Up to jump, Down to go in: key-level checks through the real input layer (real keyDown
// codes into Input, sampled into the sim, as the browser and the recordings do), on both keyboard
// layouts, plus the labels: every prompt and tip names the right key per scheme (keyboard arrows,
// keyboard WASD, touch, pad).                                    node tools/controls-test.mjs
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSim } from './sim.mjs';
import { ZONES } from '../game/data/rooms/index.js';
import { TILE } from '../game/data/movement.js';
import { TEXT } from '../game/data/text.js';
import { Input, ENTER_WAIT } from '../game/src/input.js';
import { CLOAK } from '../game/src/player.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) pass++; else { fail++; console.log('  FAIL', label); } };
const T = TILE;

// ---- a test room: everything Enter uses on one floor, a one-way shelf with a gap on it, a hook ----
const rows = [];
for (let y = 0; y < 18; y++) rows.push(y >= 16 ? '#'.repeat(32) : y === 12 ? '.'.repeat(25) + '======.' : '.'.repeat(32));
const room = (id, entities) => ({ id, name: id, x: 300 + (id === 'ct-b' ? 1 : 0), y: 300, grid: rows.map((r) => r.padEnd(32, '.').slice(0, 32)), entities });
const ZONE = { id: 'zct', n: 96, name: 'controls test', palette: ['#000', '#111', '#222', '#333'], start: { room: 'ct-a' }, rooms: [
  room('ct-a', [
    { type: 'hide', x: 4, y: 15 },
    { type: 'door', x: 8, y: 15, to: 'ct-b', at: [5, 15] },
    { type: 'save', x: 12, y: 15 },
    { type: 'npc', who: 'weft', x: 16, y: 15 },
    { type: 'switch', id: 'ct-sw', by: 'up', x: 20, y: 14 },
    { type: 'thermostat', id: 'ct-th', x: 23, y: 14, target: 72 },
    { type: 'hide', x: 27, y: 11 },           // a gap on the one-way shelf (row 12)
    { type: 'hook', x: 10, y: 6 },
  ]),
  room('ct-b', []),
  { id: 'ct-c', name: 'ct-c', x: 302, y: 300, entities: [], // [issue #37] a wall to cling to
    grid: rows.map((r, y) => (y >= 16 ? '#'.repeat(32) : y >= 2 ? '.'.repeat(20) + '##' + '.'.repeat(10) : '.'.repeat(32))) },
] };
const LAYOUTS = {
  arrows: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', jump: 'KeyZ', use: 'KeyV' },
  wasd:   { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', use: 'KeyI' },
};

function fresh(opts = {}) {
  const s = makeSim({ zones: [...ZONES, ZONE] });
  const g = s.game;
  g.startAt(opts.room || 'ct-a', opts.x ?? 2, opts.y ?? 15, { items: opts.items || [], party: ['pip'], rescued: [] });
  const modals = [];
  const step = (n = 1) => { for (let i = 0; i < n; i++) { const m = s.step(g.frame); if (m) modals.push(m); } };
  const down = (c) => s.input.keyDown(c), up = (c) => s.input.keyUp(c);
  const tap = (c, n = 2) => { down(c); step(n); up(c); };
  const place = (tx, ty = 15) => { const p = g.player; p.x = tx * T + (T - p.w) / 2; p.y = (ty + 1) * T - p.h; p.vx = 0; p.vy = 0; p.state = 'air'; step(12); };
  return { s, g, p: () => g.player, step, down, up, tap, place, modals };
}

for (const [lay, K] of Object.entries(LAYOUTS)) {
  // Jump: ↑ / W and Z / Space all jump; ↑ / W held is a full jump (variable height), like Z / Space
  for (const code of [K.up, K.jump, 'KeyZ', 'Space', 'ArrowUp', 'KeyW']) {
    const t = fresh(); t.place(2);
    t.down(code); t.step(2);
    const rising = t.p().state === 'air' && t.p().vy < 0;
    let top = t.p().y; for (let i = 0; i < 40; i++) { t.step(1); top = Math.min(top, t.p().y); }
    t.up(code); t.step(40);
    ok(rising, `${lay}: ${code} jumps`);
    t.place(2); t.tap(code, 2); let top2 = t.p().y; for (let i = 0; i < 40; i++) { t.step(1); top2 = Math.min(top2, t.p().y); }
    ok(top < top2 - 10, `${lay}: ${code} held jumps higher than tapped (${Math.round(top)} vs ${Math.round(top2)})`);
  }
  // ↑ / W never hides, enters or saves any more
  {
    const t = fresh(); t.place(4); t.tap(K.up, 2); t.step(6);
    ok(t.p().state !== 'hide', `${lay}: ${K.up} at a hiding spot does not hide`);
  }
  // Enter on ↓ / S: hide, door, save, talk, switch, thermostat
  {
    const t = fresh(); t.place(4); t.tap(K.down, 2);
    t.step(ENTER_WAIT - 2); const early = t.p().state; t.step(2);
    ok(t.p().state === 'hide', `${lay}: ${K.down} at a hiding spot hides`);
    ok(early !== 'hide', `${lay}: Enter waits ${ENTER_WAIT} frames for a Jump (↓ + Jump is a drop-through)`);
    t.tap(K.right, 2); t.step(2); ok(t.p().state !== 'hide', `${lay}: moving leaves the spot`);
    t.place(4); t.tap(K.down, 2); t.step(4); t.tap(K.up, 2); t.step(2); ok(t.p().state === 'air', `${lay}: ${K.up} jumps out of the spot`);
  }
  {
    const t = fresh(); t.place(8); t.tap(K.down, 2); t.step(20);
    ok(t.g.room.id === 'ct-b', `${lay}: ${K.down} at a door goes through`);
  }
  {
    const t = fresh(); t.place(12); t.g.player.health = 2; t.tap(K.down, 2); t.step(6);
    ok(t.g.saveCrack?.room === 'ct-a' && t.p().health === t.p().maxHealth, `${lay}: ${K.down} at a save crack saves`);
  }
  {
    const t = fresh(); t.place(16); t.modals.length = 0; t.tap(K.down, 2); t.step(6);
    ok(t.modals.some((m) => m.kind === 'talk'), `${lay}: ${K.down} by a talker talks`);
  }
  {
    const t = fresh(); t.place(20); t.tap(K.down, 2); t.step(6);
    ok(!!t.g.mech.switches.find((x) => x.id === 'ct-sw')?.on, `${lay}: ${K.down} at a lever pulls it`);
    const t2 = fresh(); t2.place(23); const n0 = t2.g.toasts.length; t2.tap(K.down, 2); t2.step(6);
    ok(t2.g.toasts.length > n0 && /72/.test(t2.g.toasts.at(-1).text), `${lay}: ${K.down} at a thermostat reads it`);
    const t3 = fresh(); t3.place(20); t3.tap(K.up, 2); t3.step(30);
    ok(!t3.g.mech.switches.find((x) => x.id === 'ct-sw')?.on, `${lay}: ${K.up} at a lever only jumps`);
  }
  // ↓ + Jump within 3 frames is a drop-through, never Enter (a gap on a one-way shelf); both orders
  for (const [order, gap] of [['↓ then Jump', 2], ['together', 0], ['Jump then ↓', -2]]) {
    const t = fresh(); t.place(27, 11);
    const p0 = t.p().y;
    if (gap >= 0) { t.down(K.down); t.step(gap); t.down(K.jump); }
    else { t.down(K.jump); t.step(-gap); t.down(K.down); }
    t.step(3); t.up(K.jump); t.step(20); t.up(K.down); t.step(20);
    ok(t.p().state !== 'hide' && (gap < 0 || t.p().y > p0 + T), `${lay}: ${order} (${Math.abs(gap)} f) at a gap on a shelf: ${gap < 0 ? 'a jump' : 'drops through'}, no hide (y ${(p0 / T).toFixed(1)} -> ${(t.p().y / T).toFixed(1)})`);
  }
  // a hanging line: ↑ climbs and never lets go; Z / Space let go with a fling
  {
    const t = fresh({ items: ['floss'] }); const p = t.p();
    t.place(10); p.x = 10 * T + 4; p.y = 7.2 * T; p.state = 'air'; p.vy = 0;
    t.tap(K.use, 2); t.step(10);
    ok(p.state === 'swing', `${lay}: grabbed the hook`);
    const len0 = p.swing?.target;
    t.down(K.up); t.step(40);
    ok(p.state === 'swing' && p.swing.target < len0, `${lay}: ${K.up} held on a line climbs (length ${len0?.toFixed(0)} -> ${p.swing?.target.toFixed(0)}) and never lets go`);
    t.up(K.up); t.step(2); t.tap(K.up, 2);
    ok(p.state === 'swing', `${lay}: a fresh ${K.up} press on a line doesn't fling`);
    t.tap(K.jump, 2); ok(p.state === 'air', `${lay}: ${K.jump} lets go with a fling`);
  }
  // [issue #37] on a line: ← or → pressed together with ↑ jumps off that way; ↑ held while pumping (or ← / →
  // held while climbing) never lets go; Z / Space still fling
  const onLine = () => {
    const t = fresh({ items: ['floss'] }); const p = t.p();
    t.place(10); p.x = 10 * T + 4; p.y = 7.2 * T; p.state = 'air'; p.vy = 0;
    t.tap(K.use, 2); t.step(10); return [t, p];
  };
  for (const [side, code] of [[1, K.right], [-1, K.left]]) for (const [order, gap] of [['together', 0], [`${K.up} first`, -3], [`${side > 0 ? '→' : '←'} first`, 3]]) {
    const [t, p] = onLine();
    if (gap >= 0) { t.down(code); t.step(gap); t.down(K.up); } else { t.down(K.up); t.step(-gap); t.down(code); }
    t.step(2); const off = p.state === 'air', vx = p.vx; t.up(K.up); t.up(code); t.step(4);
    ok(off && Math.sign(vx) === side, `${lay}: on a line, ${code} + ${K.up} ${order} (${Math.abs(gap)} f) jumps off ${side > 0 ? 'right' : 'left'} (${p.state}, vx ${Math.round(vx)})`);
  }
  {
    const [t, p] = onLine();
    t.down(K.up); t.step(20); t.down(K.right); t.step(60); t.up(K.right); t.down(K.left); t.step(60);
    ok(p.state === 'swing', `${lay}: ${K.up} held to climb, then ← / → to pump: never lets go`);
    t.up(K.left); t.up(K.up); t.step(2);
    t.down(K.right); t.step(30); t.down(K.up); t.step(60);
    ok(p.state === 'swing', `${lay}: → held to pump, then ${K.up} held to climb: never lets go`);
    for (let i = 0; i < 6; i++) { t.up(K.up); t.step(10); t.down(K.up); t.step(10); }
    ok(p.state === 'swing', `${lay}: ${K.up} pressed again and again while pumping: still on the line`);
    t.up(K.up); t.up(K.right); t.step(2);
    t.tap('KeyZ', 2); ok(p.state === 'air', `${lay}: Z still lets go`);
    const [t2, p2] = onLine(); t2.tap('Space', 2); ok(p2.state === 'air', `${lay}: Space still lets go`);
  }
  // the Cloak: hold Shift; holding ↑ / W never cloaks
  {
    const t = fresh({ items: ['cloak'] }); t.place(2);
    t.down('ShiftLeft'); t.step(CLOAK.arm + 2);
    ok(t.p().cloaked, `${lay}: hold Shift cloaks`);
    t.up('ShiftLeft'); t.step(2); ok(!t.p().cloaked, `${lay}: letting go of Shift ends it`);
    const t2 = fresh({ items: ['cloak'] }); t2.place(2); t2.down(K.up); let any = false; for (let i = 0; i < 60; i++) { t2.step(1); if (t2.p().cloaked) any = true; } t2.up(K.up);
    ok(!any, `${lay}: holding ${K.up} never cloaks`);
  }
  // look-up is touch and pad only: ↑ held on the keyboard never pans the camera up
  {
    const t = fresh(); t.place(2);
    t.down(K.up); t.step(60); t.up(K.up);
    ok((t.g.camera.lookV || 0) >= -1, `${lay}: ${K.up} held doesn't look up`);
  }
  // the tank's lid gap: jump up into it, or ↓ under it
  for (const [how, code] of [['jump into the gap', K.up], ['jump into the gap', K.jump], ['↓ under the gap', K.down]]) {
    const t = fresh({ room: 'tank-lid', x: 20, y: 7 }); t.step(20);
    const p = t.p(); p.x = 20.4 * T - p.w / 2; t.step(5);
    t.tap(code, 3); t.step(10);
    ok(['squeeze', 'out'].includes(t.g.boss.mode), `${lay}: the lid: ${how} (${code}) squeezes through (${t.g.boss.mode})`);
  }
}

// [issue #37] ↑ / W is THE jump: held, it is the full-height jump Z gives (the tank's "Hold {jump} for a
// full-height leap" out over the cup rim); it skips the story (a press: next, held: skip all)
for (const [lay, K] of Object.entries(LAYOUTS)) {
  const rise = (code) => { const t = fresh(); t.place(2); const y0 = t.p().y; t.down(code); let top = y0; for (let i = 0; i < 60; i++) { t.step(1); top = Math.min(top, t.p().y); } t.up(code); return y0 - top; };
  const ru = rise(K.up), rz = rise('KeyZ');
  ok(Math.abs(ru - rz) < 1 && ru > 2.5 * T, `${lay}: ${K.up} held rises as high as Z held (${(ru / T).toFixed(2)} vs ${(rz / T).toFixed(2)} tiles)`);
  {
    const t = fresh({ room: 'tank-cup', x: 14, y: 9 }); t.step(5); t.g.boss.finish(); t.step(5);
    const p = t.p(); p.x = 15 * T; t.step(10);
    t.down(K.up); t.step(14); t.down(K.right); let out = false;
    for (let i = 0; i < 90; i++) { t.step(1); if (p.x > 17.2 * T || t.g.room.id !== 'tank-cup') out = true; }
    t.up(K.up); t.up(K.right);
    ok(out, `${lay}: the cup: ${K.up} held is a full-height leap out over the rim`);
  }
}
// [issue #37] ↑ / W does the rest of Jump too: flutter (a fresh press in the air), glide (held falling), wall-kick
for (const [lay, K] of Object.entries(LAYOUTS)) {
  const evs = (t) => { const out = [], emit = t.g.emit.bind(t.g); t.g.emit = (ty, d = {}) => { out.push(ty); return emit(ty, d); }; return out; };
  {
    const t = fresh({ items: ['feather'] }); t.place(2); const ev = evs(t);
    t.tap(K.up, 4); t.step(14); t.tap(K.up, 2); t.step(4);
    ok(ev.includes('flutter'), `${lay}: ${K.up} again in the air flutters (${ev.filter((e) => /jump|flutter/.test(e)).join(' ')})`);
  }
  {
    const t = fresh({ items: ['glider'] }); t.place(2); t.down(K.up); let glid = false; for (let i = 0; i < 80; i++) { t.step(1); if (t.p().gliding) glid = true; } t.up(K.up);
    ok(glid, `${lay}: ${K.up} held while falling glides`);
  }
  {
    const t = fresh({ room: 'ct-c', items: ['booties'] }); t.place(17); const ev = evs(t);
    t.down(K.right); t.tap(K.up, 3); let clung = false; for (let i = 0; i < 40 && !clung; i++) { t.step(1); clung = t.p().state === 'cling'; }
    t.up(K.right); t.step(2); t.tap(K.up, 2); t.step(2);
    ok(clung && ev.includes('walljump'), `${lay}: ${K.up} kicks off a wall (clung ${clung}, ${ev.filter((e) => /cling|wall/.test(e)).join(' ')})`);
  }
}
{
  const { Story } = await import('../game/src/story.js');
  for (const code of ['ArrowUp', 'KeyW', 'KeyZ', 'Space']) {
    const st = { active: true, kind: 'story', panels: [1, 2, 3], i: 0, f: 20, held: 0, barFill: { style: {} }, next() { this.i++; this.f = 0; }, end() { this.ended = true; this.active = false; } };
    const inp = new Input(); inp.keyDown(code); Story.prototype.step.call(st, inp.sample());
    ok(st.i === 1, `story: a ${code} press goes to the next panel`);
    for (let i = 0; i < 60 && st.active; i++) Story.prototype.step.call(st, inp.sample());
    ok(st.ended && st.skippedAll, `story: ${code} held skips them all`);
  }
}

// ---- touch and pad: stick up looks up and cloaks; ↓ is Enter; the Jump button jumps -----------------
{
  const inp = new Input();
  inp.setTouchStick(0, 0.95); let f = inp.sample(); ok(f.pressed.down && !f.pressed.enter, 'touch: stick down presses down (Enter after the wait)');
  for (let i = 1; i < ENTER_WAIT; i++) inp.sample(); f = inp.sample(); ok(f.pressed.enter, 'touch: stick down becomes Enter');
  inp.setTouchStick(0, -0.95); f = inp.sample(); ok(f.held.cloak && f.held.lookUp && f.held.up && !f.held.upJump && !f.pressed.jump, 'touch: stick up holds up, cloak and look-up, never jump');
  inp.setTouchStick(0, 0); inp.sample();
  const pad = (b) => { const buttons = Array.from({ length: 18 }, (_, i) => ({ pressed: b.includes(i), value: b.includes(i) ? 1 : 0 })); return () => [{ id: 'Xbox', connected: true, mapping: 'standard', axes: [0, 0], buttons }]; };
  inp.pollPad(pad([12])); f = inp.sample(); ok(f.held.cloak && f.held.lookUp && f.held.up && !f.pressed.jump, 'pad: D-pad up holds up, cloak and look-up');
  inp.pollPad(pad([])); inp.sample();
  inp.pollPad(pad([13])); inp.sample(); for (let i = 1; i < ENTER_WAIT; i++) { inp.pollPad(pad([13])); inp.sample(); } inp.pollPad(pad([13])); f = inp.sample();
  ok(f.pressed.enter, 'pad: D-pad down becomes Enter');
  inp.pollPad(pad([])); inp.sample(); inp.pollPad(pad([0])); f = inp.sample(); ok(f.pressed.jump, 'pad: the jump button jumps');
  const k = new Input(); k.keyDown('ArrowUp'); f = k.sample(); ok(f.pressed.upJump && f.held.up && !f.held.cloak && !f.held.lookUp, 'keyboard: ↑ is upJump and up (climb), not cloak or look-up');
}

// ---- labels: every prompt and tip names the right key per scheme ------------------------------------
const WANT = { // action -> [arrows, wasd, touch, pad (xbox)]
  jump: ['↑', 'W', 'Jump', 'A'], lineOff: ['← → + ↑', 'A D + W', 'Jump', 'A'], upJump: ['↑', 'W', 'Jump', 'A'], enter: ['↓', 'S', 'the joystick (bottom left), down', 'Down'], down: ['↓', 'S', 'the joystick (bottom left), down', 'Down'],
  cloak: ['Shift', 'Shift', 'the joystick (bottom left), up', 'Up'], up: ['↑', 'W', 'the joystick (bottom left), up', 'Up'], use: ['V', 'I', 'Use', 'RT'], chirp: ['C', 'K', 'Chirp', 'Y'],
  kick: ['X', 'J', 'Kick', 'X'], listen: ['B', 'L', 'Ear', 'B'], left: ['←', 'A', 'the joystick (bottom left), left', 'Left'], right: ['→', 'D', 'the joystick (bottom left), right', 'Right'],
  swapPrev: ['Q', 'Q', 'Tap a face', 'LB'], swapNext: ['E', 'E', 'Tap a face', 'RB'], map: ['Tab', 'Tab', 'Map icon', 'View'], pause: ['Esc', 'Esc', 'Pause icon', 'Menu'],
};
const SCHEMES = [['keyboard', 'arrows'], ['keyboard', 'wasd'], ['touch'], ['gamepad']];
const labelAs = (action, [scheme, layout]) => { const i = new Input(); i.forceScheme = scheme; i.last = scheme; if (layout) i.layout = layout; i.padFamily = 'xbox'; return i.label(action).text; };
// [issue 35] on touch the joystick's actions are a picture of it (kind 'stick', pushed that way), never the word "Stick"
{
  const i = new Input(); i.forceScheme = 'touch'; i.last = 'touch';
  for (const [a, dir] of [['enter', 'down'], ['down', 'down'], ['up', 'up'], ['cloak', 'up'], ['lookUp', 'up'], ['left', 'left'], ['right', 'right'], ['move', 'move']]) {
    const l = i.label(a);
    ok(l.kind === 'stick' && l.dir === dir, `touch: {${a}} is the joystick picture pushed ${dir} (${JSON.stringify(l)})`);
  }
  for (const a of ['jump', 'use', 'chirp', 'kick', 'listen']) ok(i.label(a).kind === 'touch', `touch: {${a}} is its button's name`);
  ok(!/\bStick\b/.test(readFileSync(path.join(root, 'game', 'src', 'input.js'), 'utf8').match(/const TOUCH_NAMES = \{[^}]*\}/)[0]), 'touch: no control is named "Stick"');
}
for (const [a, want] of Object.entries(WANT)) SCHEMES.forEach((sc, i) => ok(labelAs(a, sc) === want[i], `label ${a} on ${sc.join(' ')}: "${labelAs(a, sc)}" (want "${want[i]}")`));
// every {token} in every tip, sign, item line and room sign
const texts = [];
const walk = (o, at) => { if (typeof o === 'string') texts.push([at, o]); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, `${at}.${k}`); };
walk(TEXT, 'TEXT');
for (const z of ZONES) for (const r of z.rooms) for (const e of r.entities || []) if (e.type === 'sign' && e.text) texts.push([`${r.id} sign`, e.text]);
// the prompts the code puts up: ['action', label]
const srcDir = path.join(root, 'game', 'src');
const prompts = new Set();
for (const f of readdirSync(srcDir).filter((x) => x.endsWith('.js'))) for (const m of readFileSync(path.join(srcDir, f), 'utf8').matchAll(/(?:prompt\s*=|extraPrompt\s*=[^;]*\?)\s*\[\s*'(\w+)'/g)) prompts.add(m[1]);
ok(prompts.has('enter') && !prompts.has('up'), `prompts use Enter, never Up (${[...prompts].join(' ')})`);
const tokens = new Set([...prompts]);
let bad = [];
for (const [at, t] of texts) for (const m of t.matchAll(/\{([a-zA-Z]+)\}/g)) {
  const a = m[1];
  if (['n', 'name', 'zone', 'who', 'item', 'boss', 'count', 'total', 'room', 'x', 'temp', 'target', 'cricket', 'need', 'have', 'key', 'what', 'dbl', 'voice', 'stone', 'move', 'swap'].includes(a)) continue; // filled values; move/swap: ui pairs
  tokens.add(a);
  if (a === 'up') bad.push(`${at}: {up} (Up jumps on the keyboard: name Enter, the cloak or look-up)`);
  if (!WANT[a]) bad.push(`${at}: {${a}} has no label check`);
}
ok(!bad.length, `every tip's key token is checked${bad.length ? ': ' + bad.slice(0, 6).join('; ') : ''}`);
for (const a of tokens) if (WANT[a]) for (const sc of SCHEMES) { const l = labelAs(a, sc); ok(l && l !== '?' && l !== 'Tap' && l !== 'Button', `token {${a}} on ${sc.join(' ')} names a control ("${l}")`); }
// the tips that teach Enter and the Cloak name them
const has = (t, tok) => t.includes(`{${tok}}`);
ok(has(TEXT.signs.hide, 'enter') && has(TEXT.signs.save, 'enter') && has(TEXT.signs.carrier, 'enter'), 'hide, save and Carrier tips name Enter');
ok(has(TEXT.signs.cloak, 'cloak') && has(TEXT.items.cloak.line, 'cloak'), 'the Cloak tips name the Cloak key');
ok(has(TEXT.signs.squeeze, 'jump') && has(TEXT.signs.squeeze, 'enter') && TEXT.opening.tank.squeeze === TEXT.signs.squeeze, 'the lid tip: Jump into the gap, or Enter under it');
// How to Play lists Enter, the Cloak, ↑ as Jump (keyboard) and look-up (touch, pad)
const howto = readFileSync(path.join(srcDir, 'menus', 'screens.js'), 'utf8');
ok(/\['enter', 'Hide, save, talk, go in'\]/.test(howto) && /\['cloak', /.test(howto) && /kb \? \['jump', 'Jump \(hold for higher\); climb a line'\]/.test(howto) && !/\['upJump', /.test(howto) && /\['up', 'Look up/.test(howto), 'How to Play: Enter, Cloak, ↑ / W Jump and climb (keyboard), look up (touch, pad)');
// [issue #37] Z / Space are never named for jump in a hint: no tip writes a bare Z or Space, and the line tips name the ←/→ + ↑ jump-off
bad = texts.filter(([, t]) => /\b(Z|Space)\b/.test(t)).map(([at]) => at);
ok(!bad.length, `no tip names Z or Space${bad.length ? ': ' + bad.slice(0, 4).join('; ') : ''}`);
const lineTips = texts.filter(([, t]) => /hook|shelf pin/.test(t) && /\{use\}/.test(t) && !/\{use\} near a hook to swing/.test(t));
ok(lineTips.length >= 4 && lineTips.every(([, t]) => t.includes('{lineOff}') && !t.includes('{jump}')), `the line tips name {lineOff} for jumping off, never {jump} (${lineTips.length} tips)`);
ok(/'upJump', 'Climb · \{lineOff\} Jump off'/.test(readFileSync(path.join(srcDir, 'ui.js'), 'utf8')), 'the line prompt (keyboard): ↑ Climb, ←/→ + ↑ Jump off');

console.log(`controls-test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
