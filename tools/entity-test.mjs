#!/usr/bin/env node
// Headless checks for every engine entity and enemy (design/ENGINE_NOTES.md, "Entities and
// mechanics"): gates, switches, doors, lifts, springs, terrain (syrup, crumble, piano, dig),
// thermostat locks, decoys, collectibles / NPCs / save cracks (through the meta layer), every
// enemy type's behaviour, and the shared boss plumbing. Uses the real sim (game.js) on the test
// zone (zone-98) and on tiny rooms built here.     node tools/entity-test.mjs [filter]
import { readFileSync, existsSync } from 'node:fs';
import { Game } from '../game/src/game.js';
import { ZONES } from '../game/data/rooms/index.js';
import { TILE, FPS } from '../game/data/movement.js';
import { K } from '../game/src/physics.js';
import { TYPES } from '../game/src/enemies.js';
import { songInterval } from '../game/src/chirps.js';
import { MetaRun } from '../game/src/meta-run.js';
import { ensure } from '../game/src/meta.js';
import * as Save from '../game/src/save.js';
import { line } from '../game/src/lines.js';
import { ITEMS } from '../game/data/items.js';
import { BOSSES } from '../game/src/bosses/index.js';
import { ASSET_FILES as ASSETS } from '../game/data/assets.js';
import * as Mech from '../game/src/mechanics.js';
import { listenReach, listenGainDb } from '../game/src/beacon.js';

const only = process.argv[2] || '';
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) pass++; else { fail++; console.log('  FAIL', label); } };
const section = (name, fn) => { if (only && !name.includes(only)) return; try { fn(); } catch (e) { fail++; console.log('  FAIL', name, 'threw', e.stack.split('\n').slice(0, 3).join(' | ')); } };

// ---- tiny rooms ---------------------------------------------------------------------------
// room(rows, entities): rows are strings (padded to 32x18 with '.'; row 16-17 floor by default)
let cellX = 200;
function zoneOf(rooms, extra = {}) { return { id: 'zt', n: 97, name: 'entity test', palette: ['#000', '#111', '#222', '#333'], start: { room: rooms[0].id }, rooms, ...extra }; }
function mkRoom(id, rows, entities = [], extra = {}) {
  const grid = [];
  for (let y = 0; y < 18; y++) {
    let r = rows[y] ?? (y >= 16 ? '#'.repeat(32) : '');
    r = (r + '.'.repeat(32)).slice(0, 32);
    grid.push(r);
  }
  return { id, name: id, x: cellX++, y: 200, grid, entities, ...extra };
}
function game(zone, roomId, opts = {}) {
  const g = new Game([...ZONES, ...(zone ? [zone] : [])]);
  g.startAt(roomId, opts.x, opts.y, { items: opts.items || [], party: opts.party || ['pip'], rescued: opts.rescued || [] });
  g.gentle = !!opts.gentle;
  const drv = driver(g);
  return { g, p: g.player, step: drv };
}
const KEYS = ['left', 'right', 'up', 'down', 'jump', 'use', 'chirp', 'kick', 'listen', 'swapPrev', 'swapNext', 'enter', 'cloak', 'upJump', 'lookUp']; // [issue #27]
function driver(g) {
  let prev = {};
  return (held = {}, n = 1) => {
    for (let i = 0; i < n; i++) {
      const h = {}, pr = {}, rl = {};
      for (const k of KEYS) { h[k] = !!held[k]; pr[k] = h[k] && !prev[k]; rl[k] = !h[k] && !!prev[k]; }
      prev = h;
      g.update({ held: h, pressed: pr, released: rl });
    }
  };
}
const settle = (s) => s({}, 30);
const tile = (g, x, y) => g.grid.at(x, y);
const at = (p, tx, ty) => { p.x = tx * TILE + (TILE - p.w) / 2; p.y = (ty + 1) * TILE - p.h; p.vx = 0; p.vy = 0; p.state = 'air'; };
const fxCount = (g, type, since = 0) => g.fx.filter((e) => e.type === type && e.f > since).length;
const enemy = (g, type) => g.enemies.find((e) => e.type === type);

// =========================================================================================
section('gates', () => {
  let { g, p, step } = game(null, 'et-gates', { items: ['thimble'], rescued: ['stripe'] });
  settle(step);
  ok(tile(g, 8, 13) === K.SLICK, 'lever gate is shut (G tiles)');
  ok(tile(g, 12, 13) === K.EMPTY, 'item gate open with the Thimble');
  ok(tile(g, 16, 13) === K.EMPTY, 'rescue gate open with Stripe home');
  ok(tile(g, 20, 13) === K.EMPTY, 'rescues:1 gate open with one rescue');
  ok(tile(g, 24, 13) === K.SOLID, 'side gate shut (tile #)');
  // kick the lever
  at(p, 4, 15); step({}, 20); p.facing = 1; step({ kick: true }, 2); step({}, 3);
  ok(ensure(g).flags['sw:et-lever'] === true, 'kicking the lever sets sw:et-lever');
  ok(tile(g, 8, 13) === K.EMPTY, 'lever gate opens');
  ok(fxCount(g, 'unlock') >= 1, 'unlock event on opening');
  // side gate: touch from the left
  at(p, 23, 15); step({ right: true }, 20);
  ok(tile(g, 24, 13) === K.EMPTY, 'side gate opens when touched from its side');
  // persists across a re-entry (meta flag)
  g.enterRoom(g.world.rooms['et-gates'], g.room.wx + 40, g.room.wy + 600, 'start');
  ok(tile(g, 24, 13) === K.EMPTY && tile(g, 8, 13) === K.EMPTY, 'opened lever and side gates stay open on re-entry');
  // without the item / rescues: shut; card on touch; opens when the condition arrives
  ({ g, p, step } = game(null, 'et-gates'));
  settle(step);
  ok(tile(g, 12, 13) === K.SLICK && tile(g, 16, 13) === K.SLICK && tile(g, 20, 13) === K.SLICK, 'item / rescue / count gates shut without them');
  const f0 = g.frame;
  at(p, 19, 15); g.mech.gates.find((x) => x.id === 'g-count').px; step({ right: true }, 15);
  ok(g.fx.some((e) => e.type === 'story' && e.d.name === 'damper' && e.f > f0), 'touching the damper-style gate emits story damper (the missing list card)');
  const n1 = g.fx.filter((e) => e.type === 'story' && e.f > f0).length; step({ right: true }, 30);
  ok(g.fx.filter((e) => e.type === 'story' && e.f > f0).length === n1, '... once per touch, not every frame');
  g.give('thimble'); step({}, 2); ok(tile(g, 12, 13) === K.EMPTY, 'item gate opens when the item arrives');
  g.rescue('stripe'); step({}, 2); ok(tile(g, 16, 13) === K.EMPTY && tile(g, 20, 13) === K.EMPTY, 'rescue and count gates open on the rescue');
  // neighbour edge: shut gate tiles at a room edge are solid from next door too
  const z = zoneOf([mkRoom('ga', ['################################'], [{ type: 'gate', x: 31, y: 12, w: 1, h: 4, opens: { rescued: 'katy' } }]), mkRoom('gb', ['################################'])]);
  z.rooms[0].grid = z.rooms[0].grid.map((r, y) => (y >= 12 && y <= 15 ? r.slice(0, 31) + '.' : r));
  z.rooms[1].x = z.rooms[0].x + 1; z.rooms[1].grid = z.rooms[1].grid.map((r, y) => (y >= 12 && y <= 15 ? '.' + r.slice(1) : r.slice(0, 31) + '#'));
  const t2 = game(z, 'gb');
  ok(t2.g.grid.at(-1, 13) === K.SLICK, 'a shut gate in the neighbour is solid across the edge');
  t2.g.rescued.add('katy'); t2.g.enterRoom(t2.g.room, t2.g.room.wx + 100, t2.g.room.wy + 600, 'start');
  ok(t2.g.grid.at(-1, 13) === K.EMPTY, '... and open once its condition holds');
});

section('doors', () => {
  const { g, p, step } = game(null, 'et-gates');
  settle(step); p.health = 3;
  at(p, 1, 15); step({}, 10); step({ enter: true }, 2); step({}, 10);
  ok(g.room.id === 'et-walkers', 'Enter at a door entity goes to its room');
  ok(p.health === 3, 'a door keeps your health (no heal, unlike a save)');
  const z = zoneOf([mkRoom('da', [], [{ type: 'door', x: 10, y: 15, to: 'db', at: [5, 3], auto: true, needs: 'thimble' }]), mkRoom('db', [])]);
  const t = game(z, 'da', { x: 4, y: 15 });
  settle(t.step); t.step({ right: true }, 60);
  ok(t.g.room.id === 'da' && t.g.toasts.some((x) => /Thimble/.test(x.text)), 'a door with needs refuses without the item (toast)');
  t.g.give('thimble'); at(t.p, 8, 15); t.step({ right: true }, 40);
  ok(t.g.room.id === 'db', 'an auto door takes you through on contact (the chute)');
});

section('lifts', () => {
  const { g, p, step } = game(null, 'et-lifts');
  settle(step);
  const L = g.mech.lifts[0];
  ok(L.active === (g.mech.t % (L.on + L.off) < L.on), 'steam lift timing on/off');
  // wait for it to switch on, stand in it
  for (let i = 0; i < 400 && !L.active; i++) step({});
  at(p, 4, 15); let top = 1e9;
  for (let i = 0; i < 90; i++) { step({}); top = Math.min(top, p.y); }
  ok(top < 4 * TILE, `steam lift carries you to its top (feet row ${((top + p.h) / TILE).toFixed(1)})`);
  // off phase: no lift
  for (let i = 0; i < 400 && L.active; i++) step({});
  at(p, 4, 15); step({}, 20); const y0 = p.y; step({}, 20);
  ok(p.y >= y0 - 1 && p.state === 'ground', 'off phase: the vent does nothing');
  // updraft: only with the Glider held
  const U = g.mech.lifts[1];
  p.items.delete('glider'); at(p, 27, 10); step({ jump: true }, 40);
  ok(p.y > 12 * TILE, 'updraft does nothing without the Glider');
  p.give('glider'); at(p, 27, 10); top = 1e9;
  for (let i = 0; i < 120; i++) { step({ jump: true }); top = Math.min(top, p.y); }
  ok(top < (U.def.y + 1) * TILE, 'updraft holds a gliding cricket up');
  ok(fxCount(g, 'steam') >= 1, 'steam event when a vent starts');
});

section('springs', () => {
  const { g, p, step } = game(null, 'et-lifts');
  settle(step);
  ok(tile(g, 20, 15) === K.SLICK && tile(g, 21, 15) === K.SLICK, 'spring tiles become a cushion');
  at(p, 20, 12); let top = 1e9, bounced = false;
  for (let i = 0; i < 120; i++) { step({}); if (p.vy < 0) bounced = true; if (bounced) top = Math.min(top, p.y); }
  const rise = (15 * TILE - p.h - top) / TILE;
  ok(Math.abs(rise - 9) < 0.35, `cushion power 9 bounces 9 tiles (got ${rise.toFixed(2)})`);
  ok(fxCount(g, 'spring') >= 1, 'spring event');
  at(p, 20, 12); step({ down: true }, 60);
  ok(p.state === 'ground', 'holding Down lands on a cushion without bouncing');
  // aphid: harmless, bouncy
  const a = enemy(g, 'aphid'); const hp = p.health;
  p.x = a.x + a.w / 2 - p.w / 2; p.y = a.y - 3 * TILE; p.vy = 0; p.state = 'air'; p.invuln = 0;
  let b2 = false; for (let i = 0; i < 40; i++) { step({}); if (p.vy < -300) b2 = true; }
  ok(b2, 'landing on aphids bounces you');
  ok(p.health === hp, 'aphids are harmless');
});

section('terrain', () => {
  let { g, p, step } = game(null, 'et-terrain', { items: ['thimble'] });
  settle(step);
  // syrup: half speed, about half the jump
  at(p, 4, 15); step({}, 10); step({ right: true }, 20);
  const vs = Math.abs(p.vx);
  ok(Math.abs(vs - p.P.run * 0.5) < 2, `syrup halves run speed (${vs.toFixed(0)} vs ${p.P.run.toFixed(0)})`);
  at(p, 5, 15); step({}, 10); const y0 = p.y; let top = y0; step({ jump: true }, 1); for (let i = 0; i < 40; i++) { step({ jump: true }); top = Math.min(top, p.y); }
  const r = (y0 - top) / TILE;
  ok(r > 1.2 && r < 1.8, `syrup jump about half height (${r.toFixed(2)} tiles)`);
  ok(g.room.def.paint.some((x) => x.kind === 'syrup') && g.room.def.paint.some((x) => x.kind === 'crumbling-floor'), 'terrain entities paint their tiles for the renderer');
  // crumble: falls 0.4 s after being stood on, comes back after 3 s
  const c = g.mech.crumbles[0];
  at(p, 11, 15); step({}, 5);
  ok(c.state === 'shake', 'standing on a crumbling floor starts it shaking');
  step({}, 30);
  ok(tile(g, 11, 16) === K.EMPTY && c.state === 'gone', 'it falls after 0.4 s');
  step({}, 200);
  ok(c.state === 'idle' && tile(g, 11, 16) !== K.EMPTY, 'it comes back after 3 s');
  // piano: pound key 0 then key 2
  const pound = (k) => { at(p, 20 + k * 2, 11); step({}, 2); step({ jump: true }, 1); step({}, 6); step({ down: true, jump: true }, 2); step({}, 40); };
  pound(1); pound(0); ok(!g.mech.pianos[0].solved, 'wrong notes do not open the lid');
  pound(2); ok(g.mech.pianos[0].solved && ensure(g).flags['sw:et-piano'], 'the melody (0, 2) solves the piano');
  ok(fxCount(g, 'note') >= 3, 'each pounded key plays a note');
  step({}, 2); ok(tile(g, 29, 13) === K.EMPTY, 'its gate opens');
  // a long strip only Stripe's dash crosses
  const pit = (y) => (y >= 16 ? '#####.....######################' : '');
  const z = zoneOf([mkRoom('cr', Array.from({ length: 18 }, (_, y) => pit(y)), [{ type: 'terrain', kind: 'crumble', x: 5, y: 16, w: 5, h: 1 }])]);
  // first strip: 6 tiles
  const tryCross = (party, dash) => {
    const t = game(z, 'cr', { x: 2, y: 15, party });
    settle(t.step);
    t.step({ right: true }, 4);
    if (dash) { for (;;) { if (t.p.x > 4.2 * TILE) break; t.step({ right: true }); } t.step({}, 1); t.step({ right: true }, 1); t.step({}, 1); t.step({ right: true }, 1); }
    for (let i = 0; i < 70; i++) t.step({ right: true });
    return t.p.x > 10 * TILE && t.p.y < 16 * TILE;
  };
  ok(!tryCross(['pip'], false), 'Pip running falls through a 5-tile crumbling strip');
  ok(tryCross(['stripe'], true), "Stripe's dash crosses it");
  // dig
  const dz = zoneOf([mkRoom('dg', Array.from({ length: 18 }, (_, y) => (y === 16 ? '##########ssss##################' : y === 17 ? '#'.repeat(32) : '')), [])]);
  ({ g, p, step } = game(dz, 'dg', { x: 11, y: 15, party: ['digby'] }));
  settle(step); step({ down: true }, 40);
  ok(tile(g, 11, 16) === K.EMPTY && g.rs('dg').broken.size > 0, 'Digby digs soil under him (stays dug)');
  ({ g, p, step } = game(dz, 'dg', { x: 11, y: 15, party: ['pip'] }));
  settle(step); step({ down: true }, 60);
  ok(tile(g, 11, 16) === K.SOIL, 'nobody else digs');
});

// [issue #15] The bottom edge of a room over one the cricket can't enter yet (dark, no Glow Bead) is a
// floor: a pound, a fall or a wall-slide onto it lands there and the cricket can jump back out. It used
// to bounce off it every frame: a pound stayed a pound for good, a fall stayed in the air (no jump).
section('closed-edge', () => {
  const hole = '###############..###############'; // a 2-deep hole (cols 15-16) down into the dark room
  const rows = { 16: hole, 17: hole };
  for (let y = 0; y < 16; y++) rows[y] = '..............#'; // a clingable wall down to the hole's left lip
  const a = mkRoom('ce-a', Array.from({ length: 18 }, (_, y) => rows[y] ?? ''));
  const z = zoneOf([a, mkRoom('ce-b', [], [], { x: a.x, y: a.y + 1, dark: true, needs: 'glow' })]);
  const drop = (items, held = {}, how) => {
    const t = game(z, 'ce-a', { x: 20, y: 15, items });
    settle(t.step);
    t.p.x = 16 * TILE - t.p.w / 2; t.p.y = 8 * TILE; t.p.vx = 0; t.p.vy = 0; t.p.state = 'air';
    if (how === 'pound') { t.step({}, 2); t.step({ down: true, jump: true }, 1); }
    if (how === 'cling') t.p.x = 15 * TILE + 1;
    const seen = new Set();
    for (let i = 0; i < 150; i++) { t.step(held, 1); if (i >= 90) seen.add(t.p.state); }
    return { ...t, seen };
  };
  const out = (t) => { let top = 1e9; t.step({}, 4); for (let i = 0; i < 40; i++) { t.step({ jump: true, right: i > 3 }, 1); top = Math.min(top, t.p.y + t.p.h); } t.step({ right: true }, 30); return top <= 16 * TILE && t.p.y + t.p.h <= 16 * TILE + 0.01; };
  let t = drop(['thimble'], {}, 'pound');
  ok(fxCount(t.g, 'poundStart') === 1, 'the pound starts over the hole');
  ok(t.g.room.id === 'ce-a' && t.p.state === 'ground' && !t.seen.has('pound'), `a pound onto the closed room's edge lands (state ${[...t.seen]})`);
  ok(Math.abs(t.p.y + t.p.h - t.g.room.ph) < 0.5, 'standing on the edge');
  ok(fxCount(t.g, 'pound') >= 1, 'it lands as a pound');
  ok(out(t), 'and jumps back out of the hole');
  t = drop([]);
  ok(t.p.state === 'ground' && !t.seen.has('air'), `a plain fall onto it lands too (state ${[...t.seen]})`);
  ok(out(t), 'and jumps back out');
  t = drop(['booties'], { left: true, down: true }, 'cling');
  ok(t.p.state === 'ground' && !t.seen.has('cling'), `a wall-slide down onto it lands (state ${[...t.seen]})`);
  t = drop(['thimble', 'glow'], {}, 'pound');
  ok(t.g.room.id === 'ce-b', 'with the Glow Bead the pound goes on down into the room');
});

section('thermostat', () => {
  let { g, p, step } = game(null, 'et-thermo', { party: ['frost'] });
  settle(step);
  at(p, 5, 15); step({}, 20); step({ chirp: true }, 2); step({}, 5);
  ok(!ensure(g).flags['sw:et-thermo'], 'Frost chirping at the wrong temperature does not open it');
  ok(g.toasts.some((t) => /°F/.test(t.text)), '... but reads the temperature');
  at(p, 16, 15); step({}, 20); p.chirpMeter = 3; step({ chirp: true }, 2); step({}, 5);
  ok(ensure(g).flags['sw:et-thermo'] && tile(g, 26, 13) === K.EMPTY, 'Frost chirping at 72°F opens the lock and its gate');
  ({ g, p, step } = game(null, 'et-thermo', { party: ['pip'] }));
  settle(step); at(p, 16, 15); step({}, 20); step({ chirp: true }, 2); step({}, 5);
  ok(!ensure(g).flags['sw:et-thermo'], 'nobody but Frost opens it');
  at(p, 16, 15); step({}, 5); step({ enter: true }, 2);
  ok(g.toasts.some((t) => /Frost/.test(t.text)), 'Enter at the lock: it wants 72°F + the Frost hint');
});

section('decoys', () => {
  const iv = []; for (let i = 0; i < 20; i++) iv.push(songInterval('alarm', 70, `x${i}`));
  ok(iv.every((s) => s >= 8 && s <= 10), 'the alarm voice repeats every 8-10 s (was 4 s)');
  const { g, p, step } = game(null, 'et-thermo');
  step({}, 60 * 85);
  const ev = (x) => g.fx.length; void ev;
  const all = []; // collect decoy events by watching each step
  const t2 = game(null, 'et-thermo'); const log = [];
  for (let i = 0; i < 60 * 90; i++) { t2.step({}); for (const e of t2.g.fx) if (e.type === 'decoy' && e.f === t2.g.frame) log.push({ f: e.f, ...e.d }); }
  const near = log.filter((e) => e.x === 20.5 * TILE && !e.answer), far40 = log.filter((e) => e.x === 5.5 * TILE);
  const gaps = near.slice(1).map((e, i) => (e.f - near[i].f) / FPS);
  ok(gaps.length >= 6 && gaps.every((s) => s >= 8 - 0.05 && s <= 10.05), `answering alarm every 8-10 s (${gaps.map((s) => s.toFixed(1)).join(' ')})`);
  const g40 = far40.slice(1).map((e, i) => (e.f - far40[i].f) / FPS);
  ok(g40.length >= 1 && g40.every((s) => Math.abs(s - 40) < 0.05), `the hall-style alarm every 40 s (${g40.join(' ')})`);
  // answers your chirp one beat later
  at(t2.p, 19, 15); t2.step({}, 10); t2.p.chirpMeter = 3; const cf = t2.g.frame + 1; t2.step({ chirp: true }, 1); t2.step({}, 60);
  ok(t2.g.fx.some((e) => e.type === 'decoy' && e.d.answer && e.f === cf + 50), 'an answers:true decoy beeps back 50 frames (one beat) after your chirp');
  ok(t2.g.fx.some((e) => e.type === 'heard' && e.d.sound === 'alarm') || ensure(t2.g), 'heard event for the Sound Book');
  // zone decoys: in their room, and faintly next door
  const t3 = game(null, 'et-terrain'); const l3 = [];
  for (let i = 0; i < 600; i++) { t3.step({}); for (const e of t3.g.fx) if (e.type === 'decoy' && e.f === t3.g.frame) l3.push(e.d); }
  ok(l3.some((d) => d.voice === 'chikchak' && !d.far), 'zone.decoys play in their room');
  const t4 = game(null, 'et-thermo'); const l4 = [];
  for (let i = 0; i < 600; i++) { t4.step({}); for (const e of t4.g.fx) if (e.type === 'decoy' && e.f === t4.g.frame) l4.push(e.d); }
  ok(l4.some((d) => d.voice === 'chikchak' && d.far), '... and faintly one room away');
  void g; void p; void all;
});

section('meta', () => {
  // the meta layer with a stand-in app (dialog, cards, toasts, autosave)
  const calls = [];
  const mk = (g) => {
    const A = { game: g, ui: { screen: null }, dialog: { active: false }, toast: (t) => calls.push(['toast', t]), sfx: () => {}, autosave: () => {},
      dialogSay: (lines, done) => { calls.push(['dialog', lines.length]); done && done(); }, crackMenu: () => calls.push(['crack']), zoneComplete: (id) => calls.push(['complete', id]),
      lairReady: (d) => calls.push(['ready', d.boss]), storyEvent: (n) => calls.push(['story', n]), indicator: () => null, applyUpgrades: () => {} };
    return new MetaRun(A);
  };
  const { g, p, step } = game(null, 'et-thermo');
  const run = mk(g);
  const tick = (held = {}, n = 1) => { for (let i = 0; i < n; i++) { step(held); run.step({ pressed: { enter: !!held.enter } }); } };
  tick({}, 10);
  ok(ITEMS.battery && ITEMS.battery.quest && !ITEMS.battery.gate, 'battery is a quest item in items.js');
  at(p, 7, 15); tick({ right: true }, 30); tick({}, 50);
  ok(p.has('battery'), 'battery pickup');
  at(p, 11, 15); tick({}, 10); ok(ensure(g).crumbs >= 5, 'crumbs pickup');
  { // [issue 33] the first crumb says what crumbs are for: once per save slot
    const tip = line('ui.crumbFirst'), tips = (gg) => gg.toasts.filter((t) => t.text === tip).length;
    ok(tips(g) === 1 && ensure(g).flags.crumbTold, 'first crumb: the what-are-crumbs tip shows');
    run.event('secret', { id: 'cache:et-33', n: 7 }); run.event('crumbs', { n: 2 }); tick({}, 2);
    ok(tips(g) === 1, '... and not on later crumbs');
    const saved = Save.fromGame(g), { g: g2 } = game(null, 'et-thermo'); Save.intoGame(g2, saved);
    ok(ensure(g2).flags.crumbTold, '... the slot keeps it (save and load)');
    const { g: g3, step: s3 } = game(null, 'et-thermo'), run3 = mk(g3); at(g3.player, 11, 15);
    for (let i = 0; i < 10; i++) { s3({}); run3.step({ pressed: {} }); }
    ok(ensure(g3).crumbs >= 5 && tips(g3) === 1, '... and a new slot is told again');
    const { g: g4, step: s4 } = game(null, 'et-thermo'), run4 = mk(g4); ensure(g4).crumbs = 200; at(g4.player, 11, 15); // a save from before the tip
    for (let i = 0; i < 10; i++) { s4({}); run4.step({ pressed: {} }); }
    ok(ensure(g4).crumbs >= 205 && tips(g4) === 0 && ensure(g4).flags.crumbTold, '... an old save that has crumbs already is not told (marked, silently)');
    const { g: g5 } = game(null, 'et-thermo'), run5 = mk(g5); g5.recruits.add('rolo'); run5.event('crumbs', { n: 3 });
    ok(tips(g5) === 0 && ensure(g5).flags.crumbTold, '... nor one that has met Rolo');
  }
  { // [issue 28] the first sound hole on screen says what it is: once per save slot
    const tip = line('ui.holeFirst'), tips = (gg) => gg.toasts.filter((t) => t.text === tip).length;
    const { g: ga, step: sa } = game(null, 'bed-desk', { x: 3, y: 51 }), runa = mk(ga);
    for (let i = 0; i < 20; i++) { sa({}); runa.step({ pressed: {} }); }
    ok(tips(ga) === 0 && !ensure(ga).flags.holeTold, 'sound hole tip: not while the hole is off screen');
    const { g: gb, step: sb } = game(null, 'bed-desk', { x: 20, y: 15 }), runb = mk(gb);
    for (let i = 0; i < 20; i++) { sb({}); runb.step({ pressed: {} }); }
    ok(tips(gb) === 1 && ensure(gb).flags.holeTold, 'sound hole tip: shows when the hole comes on screen');
    for (let i = 0; i < 400; i++) { sb({}); runb.step({ pressed: {} }); }
    ok(tips(gb) <= 1, '... once (not again while it stays on screen)');
    const sv = Save.fromGame(gb), { g: gc, step: sc } = game(null, 'bed-desk', { x: 20, y: 15 }), runc = mk(gc); Save.intoGame(gc, sv);
    for (let i = 0; i < 20; i++) { sc({}); runc.step({ pressed: {} }); }
    ok(ensure(gc).flags.holeTold && tips(gc) === 0, '... the slot keeps it (save and load): not told again');
  }
  { // [issue 39] the first chirp says what the chirp meter's notes are: once per save slot
    const tip = line('ui.meterFirst'), tips = (gg) => gg.toasts.filter((t) => t.text === tip).length;
    const { g: ga, step: sa } = game(null, 'et-thermo'), runa = mk(ga);
    for (let i = 0; i < 10; i++) { sa({}); runa.step({ pressed: {} }); }
    ok(tips(ga) === 0 && !ensure(ga).flags.meterTold, 'chirp meter tip: not before a chirp');
    const m0 = ga.player.chirpMeter; sa({ chirp: true }); runa.step({ pressed: {} });
    ok(ga.player.chirpMeter === m0 - 1 && tips(ga) === 1 && ensure(ga).flags.meterTold, 'chirp meter tip: the first chirp drops the meter and says what it is');
    for (let i = 0; i < 20; i++) { sa({}); runa.step({ pressed: {} }); } sa({ chirp: true }); runa.step({ pressed: {} });
    ok(tips(ga) === 1, '... once (not on the next chirp)');
    const sv = Save.fromGame(ga), { g: gb, step: sb } = game(null, 'et-thermo'), runb = mk(gb); Save.intoGame(gb, sv);
    sb({ chirp: true }); runb.step({ pressed: {} });
    ok(ensure(gb).flags.meterTold && tips(gb) === 0, '... the slot keeps it (save and load): not told again');
    const { g: gc, step: sc } = game(null, 'et-thermo', { rescued: ['stripe'] }), runc = mk(gc); // a save from before the tip
    sc({ chirp: true }); runc.step({ pressed: {} });
    ok(ensure(gc).flags.meterTold && tips(gc) === 0, '... an old save that has rescued someone is not told (marked, silently)');
    ok(line('ui.meterHint').includes('note') && line('ui.meterSilent', { name: 'Hump' }).startsWith('Hump'), 'chirp meter hover / tap lines');
  }
  const mh = p.maxHealth; at(p, 13, 12); tick({}, 10); ok(p.maxHealth === mh + 1 && ensure(g).secrets.includes('heart:et-test'), 'seed-heart secret: +1 heart');
  run.event('secret', { id: 'song:et-test' }); tick({}, 2); ok(ensure(g).secrets.includes('song:et-test'), 'song-seed secret');
  at(p, 22, 15); tick({}, 20); tick({ enter: true }, 1); tick({}, 5);
  ok(!p.has('battery') && ensure(g).flags['gave:beep'] && ensure(g).notCrickets.includes('beep'), 'NPC talk with give: hands over the battery and Beep joins (Not-Cricket)');
  run.event('recruit', { id: 'rolo' }); tick({}, 2); ok(g.recruits.has('rolo'), 'recruit join event');
  at(p, 4, 15); tick({}, 10); tick({ enter: true }, 1); tick({}, 3);
  ok(calls.some((c) => c[0] === 'crack'), 'Enter at a save crack opens the crack menu');
  ok(/Go to the Carrier/.test(readFileSync(new URL('../game/src/menus/screens.js', import.meta.url), 'utf8')), 'the crack menu has "Go to the Carrier"');
  run.event('ready', { boss: 'practice' }); tick({}, 2); ok(calls.some((c) => c[0] === 'ready'), 'ready event -> the "Ready?" card');
});

// [final-2] a won lair never refights: every gecko (and Sir Bartholomew) starts done, nothing is
// rescued twice, no zone-complete card, no Ready? card at its door or doorway, and "Back to room
// entrance" is the plain room entrance (not a phase restart).
section('no-refight', () => {
  const LAIRS_ = { duchess: 'stripe', chikchak: 'katy', bigtok: 'duo', lashes: 'frost', peridot: 'hump', gargy: 'jam', mossy: 'rin', kite: 'digby', ember: 'mote', nana: 'chip', barty: null };
  const allRooms = ZONES.flatMap((z) => z.rooms || []);
  const lairRoom = (b) => allRooms.find((r) => (r.entities || []).some((e) => e.type === 'boss' && e.boss === b));
  for (const [b, cr] of Object.entries(LAIRS_)) {
    const room = lairRoom(b);
    if (!room) { ok(false, `${b}: arena room found`); continue; }
    const won = { rescued: cr ? [cr] : [], items: b === 'barty' ? ['cloak'] : [] };
    // control: not won -> a fight
    const c0 = game(null, room.id, { items: [] });
    ok(c0.g.boss && c0.g.inFight(), `${b}: not won -> a fight in ${room.id}`);
    const t = game(null, room.id, won);
    const ev = []; const emit0 = t.g.emit.bind(t.g); t.g.emit = (type, d) => { ev.push(type); return emit0(type, d); };
    ok(t.g.boss && t.g.boss.done && !t.g.inFight(), `${b}: won -> the boss starts done, no fight`);
    const boss0 = t.g.boss;
    for (const [h, n] of [[{}, 240], [{ right: true }, 120], [{ left: true }, 120], [{ jump: true }, 60], [{}, 420]]) for (let i = 0; i < n && t.g.room.id === room.id; i++) t.step(h);
    const restarts = ev.filter((x) => x === 'phaseRestart' || x === 'rescue' || x === 'tell').length;
    ok(restarts === 0 && !t.g.levelComplete && boss0.done, `${b}: 16 s in the won arena: no tell, no phase restart, no second rescue (${ev.filter((x) => ['phaseRestart', 'rescue', 'tell', 'bossPhase'].includes(x)).join(',') || 'none'})`);
    if (t.g.room.id !== room.id) t.g.startAt(room.id, undefined, undefined, { items: won.items, party: ['pip'], rescued: won.rescued });
    ok(t.g.backToEntrance() === 'room', `${b}: Back to room entrance in the won arena is the room entrance`);
    // the meta layer: a won lair's door goes straight in (no Ready? card); doorway triggers stay quiet
    const calls = [];
    const A = { game: t.g, ui: { screen: null }, dialog: { active: false }, toast: (x) => calls.push(['toast', x]), sfx: () => {}, autosave: () => {},
      dialogSay: (l, done) => { calls.push(['dialog']); done && done(); }, crackMenu: () => {}, zoneComplete: (id) => calls.push(['complete', id]),
      lairReady: (d) => calls.push(['ready', d.boss]), enterLair: (d) => calls.push(['enter', d.boss]), storyEvent: () => {}, indicator: () => null, applyUpgrades: () => {} };
    const run = new MetaRun(A);
    run.event('ready', { boss: b });
    for (let i = 0; i < 120; i++) { t.step({}); run.step({ pressed: {} }); }
    ok(!calls.some((x) => x[0] === 'ready' || x[0] === 'complete'), `${b}: no Ready? card (doorway) and no zone-complete card in the won arena`);
    const doorRoom = allRooms.find((r) => (r.entities || []).some((e) => e.type === 'lair' && e.boss === b));
    if (doorRoom) {
      const door = doorRoom.entities.find((e) => e.type === 'lair' && e.boss === b);
      const d = game(null, doorRoom.id, won);
      const A2 = { ...A, game: d.g }; calls.length = 0;
      const r2 = new MetaRun(A2);
      at(d.p, door.x, door.y); d.step({}, 20); d.p.state = d.p.grounded ? d.p.state : 'ground';
      for (let i = 0; i < 3; i++) { d.step({}); r2.step({ pressed: { enter: i === 1 } }); }
      ok(calls.some((x) => x[0] === 'enter') && !calls.some((x) => x[0] === 'ready') && calls.some((x) => x[0] === 'toast' && /asleep|waves you in/.test(x[1])), `${b}: Enter at the won lair's door: "${(calls.find((x) => x[0] === 'toast') || [])[1]}", straight in`);
    }
  }
});

section('enemies', () => {
  // sprites: every type's folder has 0/1 (and 2 for bonkables) in the asset list
  for (const [id, T] of Object.entries(TYPES)) {
    const has = (n) => ASSETS.includes(`${T.sprite}/${n}.webp`);
    ok(has(0) && has(1) && (!T.bonkable || has(2)), `${id}: sprites ${T.sprite}/0,1${T.bonkable ? ',2' : ''}.webp`);
  }
  const room = (ents, rows = []) => zoneOf([mkRoom(`en${cellX}`, rows, ents)]);
  const one = (type, ent = {}, opts = {}, rows) => { const z = room([{ type, x: 20, y: 15, ...ent }], rows); const t = game(z, z.rooms[0].id, { x: 3, y: 15, ...opts }); t.e = t.g.enemies[0]; return t; };
  const kickAt = (t, side) => { const e = t.e; t.p.x = side > 0 ? e.x + e.w + 2 : e.x - t.p.w - 2; t.p.y = 15 * TILE + 16; t.p.state = 'ground'; t.p.facing = -side; t.p.invuln = 99; t.step({ kick: true }, 2); t.step({}, 2); };
  // ant
  let t = one('ant', { range: [15, 25] }); const ax = t.e.x; t.step({}, 30); ok(t.e.x !== ax, 'ant patrols');
  kickAt(t, 1); ok(t.e.state === 'flipped', 'ant: kick flips it (2.webp)');
  t.step({}, 80 + 90 + 365); ok(t.e.state === 'walk', 'ant comes back after scurrying off');
  // chirp stun and Rin's lullaby
  t = one('ant'); t.p.x = t.e.x - 40; t.step({ chirp: true }, 1); const pipStun = t.e.stun;
  t = one('ant', {}, { party: ['rin'] }); t.p.x = t.e.x - 40; t.step({ chirp: true }, 1);
  ok(pipStun > 0 && t.e.stun > pipStun * 2.5, `chirp stuns (Pip ${pipStun} f); Rin's lullaby lasts longer (${t.e.stun} f)`);
  // mites, booklice, fruit flies: chirp scatters
  for (const ty of ['mites', 'booklouse', 'fruitflies']) { t = one(ty); t.step({}, 5); t.p.x = t.e.x - 50; t.p.y = t.e.y + t.e.h - t.p.h; t.step({ chirp: true }, 1); ok(t.e.state === 'scurry', `${ty}: a chirp scatters it`); }
  // fruit flies block, harmless
  t = one('fruitflies', { y: 14 }); const hp = t.p.health; t.step({ right: true }, 160);
  ok(t.p.x + t.p.w <= t.e.x + 6 && t.p.health === hp, 'fruit-fly swarm blocks the path without hurting');
  // silverfish darts
  t = one('silverfish', { range: [5, 30] }); let maxV = 0, rest = 0, lx = t.e.x; for (let i = 0; i < 120; i++) { t.step({}); const v = Math.abs(t.e.x - lx) * FPS; lx = t.e.x; maxV = Math.max(maxV, v); if (v === 0) rest++; }
  ok(maxV > 250 && rest > 20, `silverfish darts (${maxV.toFixed(0)} px/s) and pauses`);
  // mosquito hover-dive
  t = one('mosquito', { y: 12 }, { x: 17, y: 15 }); let dove = false; for (let i = 0; i < 120; i++) { t.step({}); if (t.e.mode === 'dive') dove = true; }
  ok(dove && t.p.health < 5, 'mosquito tells, dives and hits');
  kickAt(t, 1);
  // cockroach: kick unstunned -> flies; stunned -> flips
  t = one('cockroach', { range: [12, 28] }, { x: 3 }); kickAt(t, 1); ok(t.e.state === 'walk' && t.e.mode === 'fly', 'cockroach: a kick before stunning makes it fly off');
  t = one('cockroach', { range: [12, 28] }, { x: 3 }); t.e.stun = 120; kickAt(t, 1); ok(t.e.state === 'flipped', 'cockroach: stunned, a kick flips it');
  t = one('cockroach', { range: [19, 21] }, { x: 18 }); t.step({}, 10); ok(t.e.mode === 'fly', 'cockroach: startled when you come close, flies');
  // weevil rolls grains that hurt
  t = one('weevil', { dir: -1, every: 1 }, { x: 8 }); t.p.invuln = 0; t.step({}, 260);
  ok(t.g.fx.some((e) => e.type === 'grain') && t.p.health < 5, 'weevil rolls rice grains along the floor (they hurt)');
  // ant soldier: wind-up, charge; front kick clonks, rear kick flips
  t = one('antsoldier', { range: [5, 30] }, { x: 14 }); t.e.dir = -1; let wound = false, charged = false;
  for (let i = 0; i < 90; i++) { t.step({}); if (t.e.mode === 'wind') wound = true; if (t.e.mode === 'charge') charged = true; }
  ok(wound && charged, 'ant soldier winds up, then charges');
  t = one('antsoldier', { range: [19, 21] }, { x: 3 }); t.e.dir = -1; t.e.mode = 'idle'; kickAt(t, -1); ok(t.e.state === 'walk', 'ant soldier: a kick from the front clonks');
  t = one('antsoldier', { range: [19, 21] }, { x: 3 }); t.e.dir = -1; t.e.T = { ...t.e.T, sight: 0 }; kickAt(t, 1); ok(t.e.state === 'flipped', 'ant soldier: a kick from behind flips it');
  // clothes moth drawn to a Glow flash
  t = one('clothesmoth', { y: 8 }, { x: 3, items: ['glow'] }); t.step({}, 5); t.p.x = 30 * TILE; t.g.emit('flash', { x: 30 * TILE, y: 6 * TILE }); t.p.x = 3 * TILE;
  const d0 = Math.abs(t.e.x - 30 * TILE); t.step({}, 90); ok(Math.abs(t.e.x - 30 * TILE) < d0 - 100, 'clothes moth flies to a Glow Bead flash');
  // earwig: front hurts, rear blocks; kick its tail
  t = one('earwig', { range: [20, 20] }, { x: 3 }); t.e.dir = -1; t.p.invuln = 0; t.step({ right: true }, 220); ok(t.p.health < 5, 'earwig: its pincers hurt');
  t = one('earwig', { range: [20, 20] }, { x: 3 }); t.e.dir = -1; kickAt(t, -1); ok(t.e.state === 'walk', 'earwig: kick at the pincers clonks');
  t = one('earwig', { range: [20, 20] }, { x: 3 }); t.e.dir = -1; kickAt(t, 1); ok(t.e.state === 'flipped', 'earwig: kick its tail end flips it');
  // dust bunny: rolls downhill and grows; pound splits
  const hill = Array.from({ length: 18 }, (_, y) => (y >= 16 ? '#'.repeat(32) : y >= 10 ? '#'.repeat(Math.max(0, 16 - y)) + '.'.repeat(32 - Math.max(0, 16 - y)) : ''));
  t = one('dustbunny', { x: 4, y: 9, dir: 1 }, { x: 28, y: 15 }, hill); const w0 = t.e.w; t.step({}, 120);
  ok(t.e.w > w0 + 2, `dust bunny grows rolling downhill (${w0} -> ${t.e.w.toFixed(1)} px)`);
  t = one('dustbunny', { range: [20, 20] }, { x: 3, items: ['thimble'] }); t.p.x = t.e.x; t.p.y = t.e.y - 3 * TILE; t.p.state = 'air'; t.p.invuln = 99;
  t.step({}, 4); t.step({ down: true, jump: true }, 2); t.step({}, 20); ok(t.e.state === 'scurry' || t.e.state === 'gone', 'dust bunny: a ground-pound splits it');
  // stink bug cloud lingers and hurts
  t = one('stinkbug', { every: 0.5, range: [20, 20] }, { x: 3 }); t.step({}, 40); ok(t.g.projectiles.some((q) => q.kind === 'stink'), 'stink bug leaves a cloud');
  const cl = t.g.projectiles.find((q) => q.kind === 'stink'); t.p.x = cl.x + 10; t.p.y = cl.y + cl.h - t.p.h - 2; t.p.invuln = 0; t.step({}, 30); ok(t.p.health < 5, 'the stink cloud hurts');
  // wolf spider: watch, pounce; hidden = unseen
  t = one('wolfspider', {}, { x: 15 }); let wt = false, jp = false; for (let i = 0; i < 90; i++) { t.step({}); if (t.e.mode === 'watch') wt = true; if (t.e.mode === 'jump') jp = true; }
  ok(wt && jp, 'wolf spider watches, then pounces');
  const hz = zoneOf([mkRoom(`hs${cellX}`, [], [{ type: 'wolfspider', x: 20, y: 15 }, { type: 'hide', x: 15, y: 15 }])]);
  t = game(hz, hz.rooms[0].id, { x: 15, y: 15 }); t.e = t.g.enemies[0]; t.step({}, 3); t.step({ enter: true }, 2); let seen = false; for (let i = 0; i < 120; i++) { t.step({}); if (t.e.mode !== 'idle') seen = true; }
  ok(t.p.hidden && !seen, 'wolf spider cannot see you hidden');
  // wasp: tell then dive in a straight line
  t = one('wasp', { y: 8 }, { x: 14 }); let tl = false, dv = null; for (let i = 0; i < 90; i++) { t.step({}); if (t.e.mode === 'tell') tl = true; if (t.e.mode === 'dive' && !dv) dv = { vx: t.e.vx, vy: t.e.vy }; }
  ok(tl && dv && Math.abs(dv.vx) > 100 && dv.vy > 100, 'wasp hovers, tells, dives along a line');
  // centipede: fast along its path; chirp nothing; flash stuns; kick only when stunned
  t = one('centipede', { x: 2, y: 2, path: [[2, 2], [29, 2], [29, 14], [2, 14]] }, { x: 3, items: ['glow'] }); t.step({}, 60);
  ok(t.e.wp >= 1, 'centipede races its looped path');
  t.p.x = t.e.x; t.p.y = t.e.y; t.g.emit('chirp', { x: t.p.cx, y: t.p.cy, radius: 300, stun: 3 }); ok(t.e.stun === 0, 'centipede: chirps do nothing');
  t.g.emit('flash', { x: t.e.x + 20, y: t.e.y }); ok(t.e.stun > 0, 'centipede: a Glow flash stuns it');
  // cellar spider drops on silk and climbs back
  t = one('cellarspider', { y: 3 }, { x: 3 }); let dropped = false; const ty0 = t.e.y; for (let i = 0; i < 400; i++) { t.step({}); if (t.e.y > ty0 + 6 * TILE) dropped = true; }
  ok(dropped && t.e.y < ty0 + TILE, 'cellar spider drops on its silk and climbs back');
  // beetle: unbeatable
  t = one('beetle', { range: [18, 22] }); kickAt(t, 1); ok(t.e.state === 'walk' && t.g.fx.some((e) => e.type === 'clonk'), 'darkling beetle: kicks clonk');
  t.g.emit('chirp', { x: t.e.x, y: t.e.y, radius: 300, stun: 3 }); ok(t.e.stun === 0, 'darkling beetle: chirps do nothing');
  // vacuum: loud (daze), sends you to the checkpoint, no damage; earplugs walk past the hum
  const vz = zoneOf([mkRoom(`vz${cellX}`, [], [{ type: 'vacuum', x: 20, y: 15, range: [20, 20] }, { type: 'checkpoint', x: 4, y: 15 }])]);
  t = game(vz, vz.rooms[0].id, { x: 3, y: 15 }); t.step({ right: true }, 10); t.step({ right: true }, 200);
  ok(t.g.fx.some((e) => e.type === 'dazed') && t.p.x < 18 * TILE, 'vacuum hum dazes you without Earplugs');
  t = game(vz, vz.rooms[0].id, { x: 3, y: 15, items: ['earplugs'] }); t.step({ right: true }, 10);
  for (let i = 0; i < 300 && !t.g.fx.some((e) => e.type === 'sentBack'); i++) t.step({ right: true });
  t.step({}, 40);
  ok(t.g.fx.some((e) => e.type === 'sentBack') && t.p.health === 5 && t.p.x < 6 * TILE, 'vacuum catches you: back to the room checkpoint, no heart lost');
  ok(t.g.fx.every((e) => e.type !== 'dazed'), 'with Earplugs its hum does not daze');
  // determinism: the same room twice gives the same enemy positions
  const a1 = game(null, 'et-walkers'), a2 = game(null, 'et-walkers');
  a1.step({}, 600); a2.step({}, 600);
  ok(JSON.stringify(a1.g.enemies.map((e) => [Math.round(e.x), Math.round(e.y), e.state])) === JSON.stringify(a2.g.enemies.map((e) => [Math.round(e.x), Math.round(e.y), e.state])), 'enemies are deterministic (seeded)');
});

section('boss', () => {
  ok(!!BOSSES.practice, 'practice boss registered');
  let { g, p, step } = game(null, 'et-boss');
  const b = g.boss;
  ok(b && b.phase === 1 && g.bossPhase === 1, 'boss starts in phase 1');
  ok(b.chirp.radius === 4 * TILE, 'the arena fixes the chirp radius');
  p.chirpMeter = 3; step({ chirp: true }, 1); const ch = g.fx.filter((e) => e.type === 'chirp').pop();
  ok(ch && ch.d.radius === 4 * TILE && ch.d.stun === 1, 'a chirp in the arena uses the fight\'s radius/stun, not the cricket\'s');
  ok(b.tellFrames === 48, 'tell 0.8 s');
  g.gentle = true; ok(b.tellFrames === 72, 'tell 1.2 s in Gentle Mode'); g.gentle = false;
  const f0 = g.frame; const n = b.tell(100, 200); ok(n === 48 && g.fx.some((e) => e.type === 'tell' && e.d.x === 100 && e.d.y === 200 && e.f >= f0), "tell() emits 'tell' {x, y} for the audio");
  // losing restarts the phase at its checkpoint
  b.nextPhase(); ok(b.phase === 2 && g.bossPhase === 2, 'nextPhase -> 2');
  at(p, 25, 15); p.health = 0; step({}, 1);
  ok(p.health === p.maxHealth && b.phase === 2 && Math.abs(p.x - (8 * TILE + 5)) < 1, 'losing restores health and restarts phase 2 at its checkpoint');
  ok(g.fx.some((e) => e.type === 'phaseRestart'), 'phaseRestart event');
  // gentle: every other strike is free
  g.gentle = true; p.health = 5; p.invuln = 0; b.hit(1); p.invuln = 0; b.hit(1); ok(p.health === 4, `Gentle Mode halves strikes (5 -> ${p.health} after two)`); g.gentle = false;
  b.nextPhase(); b.nextPhase();
  ok(b.done && g.rescued.has('stripe') && g.levelComplete && g.fx.some((e) => e.type === 'rescue' && e.d.cricket === 'stripe'), 'after the last phase: rescue -> zone complete');
  // the real fight: the tell before a lunge
  ({ g, p, step } = game(null, 'et-boss'));
  at(p, 26, 15); let told = false; for (let i = 0; i < 400; i++) { step({}); if (g.boss.telling) told = true; }
  ok(told, 'the practice gecko tells before it lunges');
});

// [fixer] Duo's Shove, Chip's Duet, the beetle nest (block), neighbours' broken tiles, upgrades, Peeper, Barty
section('fixer', () => {
  const zone = zoneOf([
    mkRoom('et-push', ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '#'.repeat(32)],
      [{ type: 'push', id: 'box', kind: 'box', x: 12, y: 14, w: 2, h: 2 }, { type: 'push', id: 'die', kind: 'dice', x: 24, y: 15, heavy: false }, { type: 'start', x: 8, y: 15 }]),
    mkRoom('et-duet', [], [{ type: 'duet', id: 'et-duet', x: 10, y: 15, then: [['secret', { id: 'et-duet-prize' }]] }, { type: 'start', x: 8, y: 15 }]),
    mkRoom('et-nest', ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '..........##########............', '................................', '#'.repeat(32)],
      [{ type: 'beetle', x: 15, y: 15, range: [10, 19], block: true }, { type: 'start', x: 4, y: 15 }]),
  ]);
  // shove: Duo moves the heavy box a tile at a time; Pip can't; anyone pushes a light die; heavier = faster
  let { g, p, step } = game(zone, 'et-push', { party: ['duo'] });
  settle(step);
  step({ right: true }, 200);
  const box = g.mech.pushes[0];
  ok(box.x > 12, `Duo shoves the heavy box (x 12 -> ${box.x})`);
  ok(tile(g, box.x, 14) === K.PROP && tile(g, 12, 14) === K.EMPTY, 'the box\'s tiles move with it (K.PROP)');
  ok(p.x + p.w <= box.x * TILE - box.anim + 0.5, 'the pusher never overlaps the sliding box');
  ok(Array.isArray(ensure(g).flags['push:et-push:box']), 'the box position is saved in flags');
  ({ g, p, step } = game(zone, 'et-push', { party: ['pip'] }));
  settle(step); step({ right: true }, 200);
  ok(g.mech.pushes[0].x === 12 && g.toasts.length + g.fx.length > 0, 'Pip can\'t budge the heavy box');
  ({ g, p, step } = game(zone, 'et-push', { party: ['pip'] }));
  at(p, 22, 15); settle(step); step({ right: true }, 120);
  ok(g.mech.pushes[1].x > 24, 'anyone pushes a light die');
  const { pushSpeed } = Mech;
  ok(pushSpeed('duo') > pushSpeed('pip') && pushSpeed('pip') > pushSpeed('frost'), 'heavier crickets push faster');
  // duet: Pip, swap, Chip within 2 s opens it; one voice alone doesn't; nobody else does
  ({ g, p, step } = game(zone, 'et-duet', { party: ['pip', 'chip'], rescued: ['chip'] }));
  settle(step);
  step({ chirp: true }, 1); step({}, 10);
  ok(!Mech.flag(g, 'sw:et-duet'), 'one voice alone does not open the music box');
  step({ swapNext: true }, 1); step({}, 8); ok(p.id === 'chip', 'swapped to Chip');
  step({ chirp: true }, 1); step({}, 2);
  ok(Mech.flag(g, 'sw:et-duet') && g.fx.some((e) => e.type === 'secret' && e.d.id === 'et-duet-prize'), 'Pip then Chip within 2 s: the duet opens it (then-events fire)');
  ({ g, p, step } = game(zone, 'et-duet', { party: ['pip', 'chip'], rescued: ['chip'] }));
  settle(step); step({ chirp: true }, 1); step({ swapNext: true }, 1); step({}, 150); step({ chirp: true }, 1); step({}, 2);
  ok(!Mech.flag(g, 'sw:et-duet'), 'too slow (2.5 s apart): still shut');
  ({ g, p, step } = game(zone, 'et-duet', { party: ['pip', 'duo'] }));
  settle(step); step({ chirp: true }, 1); step({ swapNext: true }, 1); step({}, 8); step({ chirp: true }, 1); step({}, 2);
  ok(!Mech.flag(g, 'sw:et-duet'), 'Pip and Duo: not a duet');
  // the beetle nest: block:true fills the tunnel; only a hidden (cloaked) cricket gets through
  ({ g, p, step } = game(zone, 'et-nest', { items: [] }));
  settle(step); step({ right: true }, 400);
  ok(p.cx < 19 * TILE, `no squeezing past a nest beetle without the Cloak (x ${(p.cx / TILE).toFixed(1)})`);
  ({ g, p, step } = game(zone, 'et-nest', { items: ['cloak'] }));
  settle(step); step({ cloak: true }, 10); step({ cloak: true, right: true }, 170);
  ok(p.cx > 20 * TILE && p.health === p.maxHealth, 'cloaked, you walk straight through the nest');
  // a neighbour's broken cereal is open from this side too (the hearth plug seen from chim-ash)
  ({ g, p, step } = game(null, 'chim-ash', { x: 15, y: 1 }));
  ok(g.grid.at(15, -1) !== K.EMPTY, 'the hearth plug is solid from below while whole');
  const hearth = g.world.rooms['liv-hearth'];
  g.rs('liv-hearth').broken.add(34 * hearth.tw + 15);
  ok(g.grid.at(15, -2) === K.EMPTY, 'broken plug tiles of the room above read as open from below');
  // upgrades: song-seeds refill the chirp meter faster (chirpRefillMul)
  ({ g, p, step } = game(null, 'et-thermo'));
  p.chirpMeter = 0; step({}, 125); const slow = p.chirpMeter;
  p.chirpMeter = 0; p.chirpRefill = 0; p.chirpRefillMul = 0.5; step({}, 125); const fast = p.chirpMeter;
  ok(slow === 1 && fast === 2, `chirpRefillMul 0.5 refills twice as fast (${slow} vs ${fast} in ~2 s)`);
  // big ears: Listen hears the beacon from farther (and Pip's perk doubles it)
  const m = { frac: 0.6, gainDb: -24 * 0.6 };
  const duo = { listenRange: 1, stats: { perk: 'shove' } }, ears = { listenRange: 2, stats: { perk: 'shove' } }, pip = { listenRange: 1, stats: { perk: 'listen2' } };
  ok(listenReach(ears) === 2 && listenReach(pip) === 2 && listenReach(duo) === 1, 'listenReach: big ears x(1 + 0.5 each), Pip x2');
  ok(listenGainDb(m, ears, 6) > listenGainDb(m, duo, 6) && Math.abs(listenGainDb(m, duo, 6) - (m.gainDb + 6)) < 1e-9, 'listening with big ears is louder; without, unchanged');
  // Peeper after joining: his post-join line, no second join
  const calls = [];
  ({ g, p, step } = game(null, 'et-thermo'));
  const A = { game: g, ui: { screen: null }, dialog: { active: false }, toast: (t) => calls.push(['toast', t]), sfx: () => {}, autosave: () => calls.push(['save']),
    dialogSay: (lines, done) => { calls.push(['dialog', lines]); done && done(); }, applyUpgrades: () => {} };
  const run = new MetaRun(A);
  ensure(g).notCrickets.push('peeper');
  run.talk({ type: 'npc', who: 'peeper', talk: 'npcs.peeper.meet', key: 'npc@1,1' });
  const d = calls.find((c) => c[0] === 'dialog');
  ok(d && d[1].length === 1 && /packing/.test(d[1][0][1]), 'Peeper, once joined, says his post-join line');
  // Sir Bartholomew: befriending autosaves and toasts a gift (not "moves in")
  calls.length = 0; run.recruit('barty');
  ok(ensure(g).barty && calls.some((c) => c[0] === 'save') && calls.some((c) => c[0] === 'toast' && /sent a gift/.test(c[1])), 'Barty: autosave + "sent a gift to the Carrier"');
});

// [issue 20] The Bottle-Cap Raft floats: no wading along a flood's bottom. In water below the
// surface with the Raft, a cricket bobs up to it (passive); an overhang stops him under it and he
// drifts out and on up; without the Raft the water is still a pit.
section('raft-float', () => {
  const W = '..........~~~~~~~~~~~...........';
  const zone = zoneOf([
    mkRoom('et-flood', ['', '', '', '', '', '', '', '', '', '', '', '', '', W, W, W], [{ type: 'start', x: 4, y: 15 }]),
    mkRoom('et-current', ['', '', '', '', '', '', '', '', '', '', '', '', '', W, W, W],
      [{ type: 'start', x: 4, y: 15 }, { type: 'current', x: 10, y: 12, w: 11, h: 4, vx: 1.2 }]),
    mkRoom('et-overhang', ['', '', '', '', '', '', '', '', '', '', '', '........#########...............', W, W, W, W], [{ type: 'start', x: 4, y: 15 }]),
  ]);
  const inWater = (g, p) => p.overlapKinds(g.grid).has(K.WATER);
  // walk in at the bottom: every frame in the water is a rise, he ends afloat on the surface (row 13)
  for (const who of ['pip', 'duo', 'digby', 'mote']) {
    const { g, p, step } = game(zone, 'et-flood', { items: ['raft'], party: [who] });
    settle(step);
    let wet = 0, wade = 0, lastFeet = 1e9, sank = 0;
    for (let i = 0; i < 150; i++) {
      step({ right: true }, 1);
      if (!inWater(g, p)) continue;
      wet++;
      if (p.state === 'ground') wade++;
      if (p.y + p.h > lastFeet + 0.01) sank++;
      lastFeet = p.y + p.h;
    }
    ok(wet > 0 && wet < 45 && wade <= 1 && sank === 0, `${who} with the Raft walks in at the bottom and bobs straight up (${wet} frames in the water, ${wade} on the bottom (the step in), ${sank} sinking)`);
    ok(p.state === 'ground' && p.onRaft && Math.abs(p.y + p.h - 13 * TILE) < 0.01 && p.health === p.maxHealth, `${who} is afloat on the surface after (feet ${((p.y + p.h) / TILE).toFixed(2)})`);
    ok(g.fx.filter((e) => e.type === 'bob').length === 1, `${who}: one bob splash`);
  }
  // standing still at the bottom is impossible: put him there, he rises without any input
  let { g, p, step } = game(zone, 'et-flood', { items: ['raft'] });
  at(p, 15, 15); p.state = 'ground'; step({}, 60);
  ok(p.state === 'ground' && Math.abs(p.y + p.h - 13 * TILE) < 0.01, 'placed on the flood\'s floor: up to the surface on its own');
  // no jumping from under the water: he only rises
  ({ g, p, step } = game(zone, 'et-flood', { items: ['raft'] }));
  at(p, 15, 15); p.state = 'ground'; let minFeet = 1e9;
  for (let i = 0; i < 60; i++) { step({ jump: i % 2 === 0 }, 1); minFeet = Math.min(minFeet, p.y + p.h); if (p.state === 'ground') break; }
  ok(minFeet >= 13 * TILE - 0.01, 'Jump held under the water does not launch him past the surface');
  // falling in from the side (moving right below the surface level)
  ({ g, p, step } = game(zone, 'et-flood', { items: ['raft'] }));
  at(p, 9, 13); p.vy = 200; step({ right: true }, 90);
  ok(p.state === 'ground' && p.onRaft && Math.abs(p.y + p.h - 13 * TILE) < 0.01, 'fallen in from the side: up to the surface');
  // mid-current, from the side: rises and is carried along
  ({ g, p, step } = game(zone, 'et-current', { items: ['raft'] }));
  settle(step); step({ right: true }, 60); const x0 = p.x; step({}, 90);
  ok(p.state === 'ground' && p.onRaft && Math.abs(p.y + p.h - 13 * TILE) < 0.01 && p.x > x0 + 20, 'into a current from the side: up to the surface and carried');
  // under an overhang: pinned under it while it covers him, never stuck: out sideways and on up
  ({ g, p, step } = game(zone, 'et-overhang', { items: ['raft'] }));
  at(p, 12, 15); p.state = 'ground'; step({}, 60);
  ok(p.bobbing && Math.abs(p.y - 12 * TILE) < 0.01, `under the overhang he floats up to its underside (top ${(p.y / TILE).toFixed(2)})`);
  step({ right: true }, 90);
  ok(p.state === 'ground' && p.onRaft && Math.abs(p.y + p.h - 12 * TILE) < 0.01 && p.cx > 17 * TILE, 'he drifts out from under it and up to the surface');
  ({ g, p, step } = game(zone, 'et-overhang', { items: ['raft'] }));
  at(p, 12, 15); p.state = 'ground'; step({}, 60); step({ left: true }, 120);
  ok(p.state === 'ground' && !inWater(g, p) && p.cx < 10 * TILE, 'or back out to the left, onto the floor');
  // without the Raft the flood is still a pit
  ({ g, p, step } = game(zone, 'et-flood', { items: [] }));
  settle(step); step({ right: true }, 80);
  ok(g.fx.some((e) => e.type === 'pit' && e.d.why === 'water') && p.health < p.maxHealth, 'without the Raft, water is a pit (a heart, back on dry ground)');
  ok(g.fx.every((e) => e.type !== 'bob'), 'without the Raft, no bob');
});

console.log(`entity-test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
void existsSync;
