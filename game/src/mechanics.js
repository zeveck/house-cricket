// Room mechanics, data-driven (design/ENGINE_NOTES.md, "Entities and mechanics"): gates (item,
// rescue, N rescues, switch, one-way side), switches/levers, lifts (steam vents, dryer updrafts,
// misters), springs (cushions), terrain (syrup, crumbling floor, piano keys; Digby digs soil),
// thermostat locks (Frost), decoys (room sounds on a timer that may answer your chirp), lights
// (moths fly to them), door upgrades (auto, needs). No DOM, no Math.random: deterministic, so
// node tools (check-world, entity-test, the headless author) run the same code.
//
// game.js calls: buildMech(game) after the room's entities are read (the grid already exists),
// updateMech(game) every step after the player and enemies, and the on*() hooks from emit().
// The player reads the mechanics through game.ctx: surface(p), liftAt(p), springUnder(p), dig(p).
import { TILE, FPS, DT } from '../data/movement.js';
import { CRICKETS } from '../data/crickets.js';
import { TEXT } from '../data/text.js';
import { ITEMS } from '../data/items.js';
import { K, groundUnder } from './physics.js';
import { seeded } from './world.js';
import { tempAt } from './beacon.js';
import { songInterval } from './chirps.js';
import { ensure, rescueCount } from './meta.js';

export const MECH_TYPES = ['gate', 'switch', 'lift', 'spring', 'terrain', 'piano', 'thermostat', 'decoy', 'light', 'push', 'duet'];
const TILE_OF = { '#': K.SOLID, G: K.SLICK, C: K.CEREAL, '=': K.ONEWAY };
const BEAT = 50;                 // frames: an answer comes one beat (72 BPM) after your chirp
const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? `{${k}}`));
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---- persistent flags (saved with the slot: game.meta.flags) ----
export const flag = (game, k) => !!ensure(game).flags[k];
export function setFlag(game, k, v = true) { ensure(game).flags[k] = v; }

// ---- gates ----
// opens: {item} {rescued} {rescues: n} {switch: id} {flag: name} {side: 'left'|'right'|'top'|'bottom'}
// (all given conditions must hold). A side gate opens for good when touched from that side.
export function gateOpen(game, g, roomId = game.room?.id) {
  const o = g.opens || {};
  if (o.item && !game.player.has(o.item)) return false;
  if (o.rescued && !game.rescued.has(o.rescued)) return false;
  if (o.rescues != null && rescueCount(game) < o.rescues) return false;
  if (o.switch && !flag(game, `sw:${o.switch}`)) return false;
  if (o.flag && !flag(game, o.flag)) return false;
  if (o.side && !flag(game, gateKey(roomId, g))) return false;
  return true;
}
export const gateKey = (roomId, g) => `gate:${roomId}:${g.id || `${g.x},${g.y}`}`;

// Shut gate tiles of a room seen from a neighbour (world.makeGrid's edge lookup).
export function gateTileAt(game, room, lx, ly) {
  for (const g of room.entities) {
    if (g.type !== 'gate') continue;
    if (lx < g.x || ly < g.y || lx >= g.x + (g.w || 1) || ly >= g.y + (g.h || 1)) continue;
    if (!gateOpen(game, g, room.id)) return TILE_OF[g.tile || 'G'] ?? K.SLICK;
  }
  return null;
}

// ---- build (called from buildEntities) ----
export function buildMech(game, defs) {
  const T = TILE, room = game.room, grid = game.grid;
  const m = game.mech = { gates: [], switches: [], lifts: [], springs: [], syrup: [], crumbles: [], pianos: [], thermostats: [], decoys: [], lights: [], pushes: [], duets: [], t: 0, touching: new Set() };
  const solidify = (x, y, w, h, kind = K.SLICK) => {
    for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) if (grid.at(tx, ty) === K.EMPTY) grid.set(tx, ty, kind);
  };
  const rng = seeded(`mech:${room.id}`);
  for (const e of defs) {
    switch (e.type) {
      case 'gate': {
        const g = { def: e, id: e.id, x: e.x, y: e.y, w: e.w || 1, h: e.h || 1, opens: e.opens || {}, kind: TILE_OF[e.tile || 'G'] ?? K.SLICK, msg: e.msg, card: e.card, key: gateKey(room.id, e) };
        g.px = { x: g.x * T, y: g.y * T, w: g.w * T, h: g.h * T };
        g.open = gateOpen(game, g);
        if (!g.open) solidify(g.x, g.y, g.w, g.h, g.kind);
        else for (let ty = g.y; ty < g.y + g.h; ty++) for (let tx = g.x; tx < g.x + g.w; tx++) { // rebuilt after an unlock (give/rescue)
          if (grid.at(tx, ty) === g.kind && room.base[ty * room.tw + tx] === K.EMPTY) grid.set(tx, ty, K.EMPTY);
        }
        m.gates.push(g);
        break;
      }
      case 'switch': {
        const s = { def: e, id: e.id, by: e.by || 'kick', x: e.x * T, y: e.y * T, w: T, h: T, on: flag(game, `sw:${e.id}`) };
        m.switches.push(s);
        break;
      }
      case 'lift': {
        const L = { def: e, kind: e.kind || 'steam', x: e.x * T, y: e.y * T, w: (e.w || 1) * T, h: (e.h || 4) * T,
          v: (e.vy ?? 9) * T, acc: (e.acc ?? 40) * T, on: Math.round((e.on ?? 0) * FPS), off: Math.round((e.off ?? 0) * FPS),
          phase: Math.round((e.phase ?? 0) * FPS), glide: e.glide ?? (e.kind === 'updraft'), active: false, warn: false };
        m.lifts.push(L);
        break;
      }
      case 'spring': {
        const s = { def: e, x: e.x, y: e.y, w: e.w || 2, power: e.power ?? 6, t: -99 };
        solidify(s.x, s.y, s.w, 1, K.SLICK);
        m.springs.push(s);
        break;
      }
      case 'terrain': {
        const box = { def: e, kind: e.kind, x: e.x, y: e.y, w: e.w || 1, h: e.h || 1 };
        if (e.kind === 'syrup') { box.speed = e.speed ?? 0.5; box.jump = e.jump ?? 0.5; m.syrup.push(box); }
        else if (e.kind === 'crumble') {
          box.delay = Math.round((e.delay ?? 0.4) * FPS); box.respawn = Math.round((e.respawn ?? 3) * FPS);
          box.state = 'idle'; box.timer = 0; box.kindTile = TILE_OF[e.tile || '#'] ?? K.SOLID; // '#' so the renderer paints it as crumbling-floor
          solidify(box.x, box.y, box.w, box.h, box.kindTile);
          m.crumbles.push(box);
        }
        break;
      }
      case 'piano': {
        const kw = e.kw || 2, n = e.keys || Math.floor((e.w || 8) / kw);
        const pn = { def: e, id: e.id, x: e.x, y: e.y, kw, n, melody: e.melody || [], played: [], sink: new Array(n).fill(0), solved: flag(game, `sw:${e.id}`) };
        solidify(pn.x, pn.y, kw * n, 1, K.SLICK);
        m.pianos.push(pn);
        break;
      }
      case 'thermostat':
        m.thermostats.push({ def: e, id: e.id, target: e.target, tol: e.tol ?? 1, x: e.x * T, y: e.y * T, w: T, h: T, open: flag(game, `sw:${e.id}`) });
        break;
      case 'decoy': m.decoys.push(decoyOf(e, room.id, rng)); break;
      case 'light': m.lights.push({ x: (e.x + 0.5) * T, y: (e.y + 0.5) * T }); break;
      case 'push': { // [fixer] Duo's Shove: a die, a spool, a box (tiles x..x+w-1, rows y..y+h-1)
        const key = `push:${room.id}:${e.id || `${e.x},${e.y}`}`;
        const at = flag(game, key) ? ensure(game).flags[key] : null;
        const b = { def: e, key, kind: e.kind || 'box', x: at ? at[0] : e.x, y: at ? at[1] : e.y, w: e.w || 1, h: e.h || 1,
          heavy: e.heavy !== false, anim: 0, adir: 0, fall: 0, press: 0, told: false };
        let clear = true;
        for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) if (grid.at(tx, ty) !== K.EMPTY) clear = false;
        if (!clear && at) { b.x = e.x; b.y = e.y; } // a saved spot that no longer fits: back home
        setBox(game, b, K.PROP, false);
        m.pushes.push(b);
        break;
      }
      case 'duet': // [fixer] Chip's Duet: a harmony lock (music box) that wants Pip and Chip chirping within `window` s
        m.duets.push({ def: e, id: e.id, x: e.x * T, y: e.y * T, w: (e.w || 1) * T, h: T, hear: (e.hear ?? 6) * T,
          window: Math.round((e.window ?? 2) * FPS), on: flag(game, `sw:${e.id}`), last: null, glow: 0 });
        break;
      default: break;
    }
  }
  // decoys from zone data (zone.decoys with this room) and the room def's `decoys` list
  for (const d of game.zone?.decoys || []) if (d.room === room.id) m.decoys.push(decoyOf(d, room.id, rng));
  for (const d of room.def.decoys || []) m.decoys.push(decoyOf(d, room.id, rng));
  // ... and zone decoys one room away (heard faintly)
  const near = new Set(game.world.exits(room).map((x) => x.to));
  for (const d of game.zone?.decoys || []) if (d.room !== room.id && near.has(d.room)) m.decoys.push({ ...decoyOf(d, d.room, rng), far: true, answers: false });
  m.decoys.forEach((d, i) => { d.next = game.frame + 20 + i * 17 + Math.floor(d.first ?? 0); });
}
function decoyOf(d, roomId, rng) {
  const out = { voice: d.voice || 'alarm', room: d.room || roomId, x: ((d.x ?? 16) + 0.5) * TILE, y: ((d.y ?? 9) + 0.5) * TILE,
    every: d.every, answers: !!d.answers, hear: (d.hear ?? 14) * TILE, rng: seeded(`decoy:${roomId}:${d.voice}:${d.x},${d.y}`), n: 0 };
  void rng;
  return out;
}
function decoyInterval(d) {
  const e = d.every;
  let s;
  if (Array.isArray(e)) s = e[0] + (e[1] - e[0]) * d.rng();
  else if (typeof e === 'number') s = e;
  else s = songInterval(d.voice, 70, `${d.voice}:${d.n}`);
  d.n++;
  return Math.max(6, Math.round(s * FPS));
}

// ---- per step ----
export function updateMech(game) {
  const m = game.mech; if (!m) return;
  const p = game.player, T = TILE;
  m.t++;
  const pb = { x: p.x, y: p.y, w: p.w, h: p.h };
  const near = { x: p.x - 4, y: p.y - 4, w: p.w + 8, h: p.h + 8 };
  const now = new Set();
  // gates: open when their condition holds (item / rescue / count / switch), or touched from their side
  for (const g of m.gates) {
    if (g.open) continue;
    const touching = ov(near, g.px);
    if (touching && g.opens.side) {
      const c = { left: p.cx < g.px.x, right: p.cx > g.px.x + g.px.w, top: p.cy < g.px.y, bottom: p.cy > g.px.y + g.px.h }[g.opens.side];
      if (c) setFlag(game, g.key);
    }
    if (gateOpen(game, g)) { openGate(game, g); continue; }
    if (touching) {
      now.add(g);
      if (!m.touching.has(g)) {
        if (g.card) game.emit('story', { name: g.card });
        else if (g.msg) game.toast(g.msg, 150);
        else if (g.opens.item && !g.opens.side) game.toast(`You need the ${ITEMS[g.opens.item]?.name || g.opens.item} to go on.`, 150);
        game.emit('gateShut', { x: g.px.x + g.px.w / 2, y: g.px.y + g.px.h / 2 });
      }
    }
  }
  m.touching = now;
  // switches: kick (the kick box), touch, up (Enter, handled in onEnter), pound (onPound), chirp (onChirp)
  const kb = p.kickBox();
  for (const s of m.switches) {
    if (s.on) continue;
    if ((s.by === 'kick' && kb && ov(kb, s)) || (s.by === 'touch' && ov(pb, s))) flipSwitch(game, s);
  }
  // lifts: timed (on/off seconds, phase), with a 0.5 s warning puff before they start
  for (const L of m.lifts) {
    const was = L.active;
    if (!L.on || !L.off) { L.active = true; L.warn = false; }
    else {
      const per = L.on + L.off, ph = (m.t + L.phase) % per;
      L.active = ph < L.on; L.warn = !L.active && ph >= per - 30;
    }
    if (L.active && !was && Math.abs(L.x + L.w / 2 - p.cx) < 900) game.emit(L.kind === 'updraft' ? 'updraft' : 'steam', { x: L.x + L.w / 2, y: L.y + L.h, kind: L.kind });
  }
  // crumbling floor: a strip falls `delay` after it is first stood on, comes back after `respawn`
  for (const c of m.crumbles) {
    if (c.state === 'idle') {
      if (standingIn(game, c)) { c.state = 'shake'; c.timer = c.delay; game.emit('crumbleStart', { x: (c.x + c.w / 2) * T, y: c.y * T }); }
    } else if (c.state === 'shake') {
      if (--c.timer <= 0) {
        c.state = 'gone'; c.timer = c.respawn;
        setTiles(game, c, K.EMPTY);
        for (let tx = c.x; tx < c.x + c.w; tx++) game.emit('crumble', { x: (tx + 0.5) * T, y: (c.y + 0.5) * T, soft: true });
      }
    } else if (c.state === 'gone') {
      if (--c.timer <= 0 && !ov(pb, { x: c.x * T, y: c.y * T, w: c.w * T, h: c.h * T })) { c.state = 'idle'; setTiles(game, c, c.kindTile); }
    }
  }
  for (const pn of m.pianos) for (let i = 0; i < pn.n; i++) if (pn.sink[i] > 0) pn.sink[i]--;
  for (const b of m.pushes) updatePush(game, b);
  for (const du of m.duets) if (du.glow > 0) du.glow--;
  // decoys: their own clock (seconds or [min, max]); `answers` beeps back a beat after a chirp nearby
  for (const d of m.decoys) {
    if (d.answerAt != null && game.frame >= d.answerAt) { d.answerAt = null; emitDecoy(game, d, true); }
    if (game.frame >= d.next) { d.next = game.frame + decoyInterval(d); if (d.answerAt == null || Math.abs(d.answerAt - game.frame) > 30) emitDecoy(game, d, false); }
  }
}
function emitDecoy(game, d, answer) {
  d.lastF = game.frame;
  game.emit('decoy', { voice: d.voice, x: d.x, y: d.y, room: d.room, far: !!d.far, answer });
  if (!d.far && !d.heard) { d.heard = true; game.emit('heard', { sound: d.voice }); }
}
function standingIn(game, box) {
  const p = game.player;
  if (p.state !== 'ground' && p.state !== 'charge') return false;
  const g = groundUnder(game.grid, p.body);
  return !!g && g.some((t) => t.tx >= box.x && t.tx < box.x + box.w && t.ty >= box.y && t.ty < box.y + box.h);
}
function setTiles(game, box, kind) {
  const base = game.room.base, w = game.room.tw;
  for (let ty = box.y; ty < box.y + box.h; ty++) for (let tx = box.x; tx < box.x + box.w; tx++) game.grid.set(tx, ty, kind === null ? base[ty * w + tx] : kind);
  game.gridVersion++;
}
// ---- [fixer] Duo's Shove: push blocks ----
// Heavy blocks (default) move only for a cricket with the 'shove' perk (Duo); `heavy: false` ones
// move for anyone. Push speed grows with weight: (1 + wt) / 2 tiles/s (Duo 3, Frost 1). A block
// moves a whole tile at a time (its tiles are K.PROP: solid, unpainted, never clingable) and is
// drawn sliding (anim px left to slide); it falls when nothing is under it. Its tile position is
// saved in flags (push:<room>:<id>).
function setBox(game, b, kind, version = true) {
  for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) game.grid.set(tx, ty, kind);
  if (version) game.gridVersion++;
}
export const pushSpeed = (id) => ((1 + (CRICKETS[id]?.wt || 3)) / 2) * TILE;
function freeCol(game, col, y0, h) {
  if (col < 0 || col >= game.room.tw) return false;
  for (let ty = y0; ty < y0 + h; ty++) if (game.grid.at(col, ty) !== K.EMPTY) return false;
  return true;
}
function updatePush(game, b) {
  const p = game.player, T = TILE, inp = game.inp;
  const speed = pushSpeed(p.id);
  if (b.fall > 0) { b.fall = Math.max(0, b.fall - 9 * T * DT); return; }
  if (b.anim > 0) {
    b.anim = Math.max(0, b.anim - speed * DT);
    // the pusher keeps contact with the sliding block (never overlaps its drawn box)
    const top = b.y * T, bot = (b.y + b.h) * T;
    if (p.y + p.h > top + 2 && p.y < bot) {
      if (b.adir > 0) { const edge = b.x * T - b.anim; if (p.x + p.w > edge && p.cx < edge + 4) { p.x = edge - p.w; if (p.vx > 0) p.vx = Math.min(p.vx, speed); } }
      else { const edge = (b.x + b.w) * T + b.anim; if (p.x < edge && p.cx > edge - 4) { p.x = edge; if (p.vx < 0) p.vx = Math.max(p.vx, -speed); } }
    }
    if (b.anim > 0) return;
  }
  // gravity: nothing under the whole block -> it drops a row
  const below = b.y + b.h;
  if (below < game.room.th) {
    let air = true;
    for (let tx = b.x; tx < b.x + b.w; tx++) if (game.grid.at(tx, below) !== K.EMPTY) air = false;
    if (air) { setBox(game, b, K.EMPTY, false); b.y++; setBox(game, b, K.PROP); b.fall = T; saveBox(game, b); return; }
  }
  // a push: standing beside it, pressing into it
  const dir = inp ? (inp.held.right ? 1 : 0) - (inp.held.left ? 1 : 0) : 0;
  const top = b.y * T, bot = (b.y + b.h) * T;
  const touching = p.state === 'ground' && dir !== 0 && p.y + p.h > top + 4 && p.y + p.h <= bot + 1 &&
    (dir > 0 ? Math.abs(p.x + p.w - b.x * T) < 3 : Math.abs(p.x - (b.x + b.w) * T) < 3);
  if (!touching) { b.press = 0; b.told = false; return; }
  if (b.heavy && p.stats.perk !== 'shove') {
    if (!b.told) { b.told = true; game.toast(TEXT.push?.heavy || 'Too heavy to budge. (Duo could shove it.)', 150); }
    return;
  }
  if (++b.press < 8) return;
  const col = dir > 0 ? b.x + b.w : b.x - 1;
  if (!freeCol(game, col, b.y, b.h)) { if (b.press === 8) game.emit('clonk', { x: p.cx, y: p.cy }); return; }
  setBox(game, b, K.EMPTY, false); b.x += dir; setBox(game, b, K.PROP);
  b.anim = T; b.adir = dir;
  saveBox(game, b);
  game.emit('shove', { x: (b.x + b.w / 2) * T, y: (b.y + b.h) * T, dir, kind: b.kind });
}
function saveBox(game, b) { setFlag(game, b.key, [b.x, b.y]); }

export function openGate(game, g) {
  if (g.open) return;
  g.open = true;
  setTiles(game, g, null);
  if (g.opens.side) setFlag(game, g.key);
  game.emit('unlock', { x: g.px.x + g.px.w / 2, y: g.px.y + g.px.h / 2, gate: g.id || null });
}
export function flipSwitch(game, s) {
  if (s.on) return;
  s.on = true; setFlag(game, `sw:${s.id}`);
  game.emit('switch', { id: s.id, x: s.x + s.w / 2, y: s.y + s.h / 2 });
  for (const [type, d] of s.def?.then || []) game.emit(type, { ...d }); // [builder C] then: [[event, data], ...] on flip
}
// Set a switch id from code (bosses, triggers): gates with opens:{switch:id} open on the next step.
export function setSwitch(game, id) { setFlag(game, `sw:${id}`); for (const s of game.mech?.switches || []) if (s.id === id) s.on = true; }

// ---- hooks from game.emit ----
// [issue #27] Enter (a ↓ press): pull a lever, read a thermostat
export function onEnter(game) {
  const m = game.mech; if (!m) return false;
  const p = game.player, near = { x: p.x - 12, y: p.y - 2 * TILE, w: p.w + 24, h: p.h + 3 * TILE }; // a lever or lock up to 2 tiles above you
  for (const s of m.switches) if (!s.on && s.by === 'up' && ov(near, s)) { flipSwitch(game, s); return true; }
  for (const th of m.thermostats) if (ov(near, th)) {
    if (th.open) { game.toast(TEXT.thermostat.open, 120); return true; }
    const frost = p.stats.perk === 'thermometer';
    game.toast(frost ? `${fmt(TEXT.thermostat.reading, { n: Math.round(tempAt(game.room, p.cx)) })}. ${fmt(TEXT.thermostat.want, { n: th.target })}` : `${fmt(TEXT.thermostat.want, { n: th.target })} ${TEXT.thermostat.frostHint}`, 180);
    return true;
  }
  return false;
}
export function onPound(game, d) {
  const m = game.mech; if (!m) return;
  const p = game.player, T = TILE;
  const g = groundUnder(game.grid, p.body); if (!g) return;
  for (const s of m.switches) if (!s.on && s.by === 'pound' && g.some((t) => t.tx === Math.floor(s.x / T) && t.ty === Math.floor(s.y / T))) flipSwitch(game, s);
  for (const pn of m.pianos) {
    const hit = g.find((t) => t.ty === pn.y && t.tx >= pn.x && t.tx < pn.x + pn.kw * pn.n);
    if (!hit) continue;
    const i = Math.floor((hit.tx - pn.x) / pn.kw);
    pn.sink[i] = 12;
    pn.played.push(i); if (pn.played.length > 16) pn.played.shift();
    game.emit('note', { i, x: (pn.x + (i + 0.5) * pn.kw) * T, y: pn.y * T, id: pn.id });
    const mel = pn.melody;
    if (!pn.solved && mel.length && pn.played.length >= mel.length && mel.every((n, k) => pn.played[pn.played.length - mel.length + k] === n)) {
      pn.solved = true; setSwitch(game, pn.id);
      game.emit('unlock', { x: (pn.x + pn.kw * pn.n / 2) * T, y: pn.y * T, piano: pn.id });
    }
  }
  void d;
}
export function onChirp(game, d) {
  const m = game.mech; if (!m) return;
  const p = game.player;
  for (const dd of m.decoys) if (dd.answers && !dd.far && Math.hypot(dd.x - d.x, dd.y - d.y) <= dd.hear) {
    dd.answerAt = game.frame + BEAT;
    if (dd.next < dd.answerAt + 30) dd.next = dd.answerAt + 30;
  }
  for (const s of m.switches) if (!s.on && s.by === 'chirp' && Math.hypot(s.x + s.w / 2 - d.x, s.y + s.h / 2 - d.y) <= d.radius + TILE / 2) flipSwitch(game, s);
  // [builder C] by: 'rhythm' (Peeper's chirp-off): n chirps in a row within `hear` tiles, each one
  // `beat` frames (+-tol) after the last; toasts `good` / `miss` lines; then sets the switch
  for (const s of m.switches) {
    if (s.on || s.by !== 'rhythm') continue;
    const e = s.def, hear = (e.hear ?? 8) * TILE;
    if (Math.hypot(s.x + s.w / 2 - d.x, s.y + s.h / 2 - d.y) > hear) continue;
    const beat = e.beat ?? 60, tol = e.tol ?? 18, gap = game.frame - (s.lastChirp ?? -9999);
    s.count = (Math.abs(gap - beat) <= tol && s.count) ? s.count + 1 : 1;
    s.lastChirp = game.frame;
    if (s.count >= (e.n ?? 4)) flipSwitch(game, s);
    else if (s.count > 1 && e.good) game.toast(e.good, 70);
    else if (gap < 600 && gap > 20 && e.miss) game.toast(e.miss, 90);
  }
  // [fixer] Chip's Duet: Pip and Chip chirp near a harmony lock within its window (swap between them)
  for (const du of m.duets) {
    if (du.on || Math.hypot(du.x + du.w / 2 - d.x, du.y + du.h / 2 - d.y) > du.hear) continue;
    const who = d.id;
    du.glow = 40;
    if (who !== 'pip' && who !== 'chip') { game.toast(TEXT.duet?.wrong || 'Two keyholes. It wants two house crickets singing together.', 150); du.last = null; continue; }
    if (du.last && du.last.who !== who && game.frame - du.last.f <= du.window) {
      du.on = true; setSwitch(game, du.id);
      game.emit('unlock', { x: du.x + du.w / 2, y: du.y, duet: du.id });
      game.emit('duet', { id: du.id, x: du.x + du.w / 2, y: du.y });
      game.toast(TEXT.duet?.open || 'Pip and Chip, together. The music box plays!', 180);
      for (const [type, dd] of du.def.then || []) game.emit(type, { ...dd });
      continue;
    }
    du.last = { who, f: game.frame };
    const both = p.trio.includes('pip') && p.trio.includes('chip');
    game.toast(both ? (TEXT.duet?.half || 'One keyhole hums. Now the other voice, quick! (swap)') : (TEXT.duet?.need || 'One keyhole hums. It wants a second house cricket.'), 150);
  }
  // Frost's thermometer: chirping where the room's temperature is the lock's target opens it
  if (p.stats.perk === 'thermometer') for (const th of m.thermostats) {
    if (th.open) continue;
    const t = tempAt(game.room, p.cx);
    if (Math.abs(t - th.target) <= th.tol) {
      th.open = true; setSwitch(game, th.id);
      game.toast(TEXT.thermostat.open, 150);
      game.emit('unlock', { x: th.x + TILE / 2, y: th.y + TILE / 2, thermostat: th.id });
    } else game.toast(`${fmt(TEXT.thermostat.reading, { n: Math.round(t) })}. ${fmt(TEXT.thermostat.want, { n: th.target })}`, 120);
  }
}

// ---- what the player reads (through game.ctx) ----
// Ground that is not a safe respawn spot (crumbling floors, cushions): pits put you back elsewhere.
export function unsafeTile(game, tx, ty) {
  const m = game.mech; if (!m) return false;
  const inb = (b, w = b.w, h = b.h ?? 1) => tx >= b.x && tx < b.x + w && ty >= b.y && ty < b.y + h;
  return m.crumbles.some((c) => inb(c)) || m.springs.some((s) => inb(s, s.w, 1)) || m.pushes.some((b) => inb(b)); // [fixer] push blocks move
}
// Syrup under the feet: {speed, jump} multipliers (jump = height multiplier).
export function surfaceAt(game, p) {
  const m = game.mech; if (!m || !m.syrup.length) return null;
  const g = groundUnder(game.grid, p.body); if (!g) return null;
  for (const s of m.syrup) if (g.some((t) => t.tx >= s.x && t.tx < s.x + s.w && t.ty >= s.y && t.ty < s.y + s.h)) return s;
  return null;
}
export function liftAt(game, p) {
  const m = game.mech; if (!m) return null;
  for (const L of m.lifts) if (L.active && p.cx >= L.x && p.cx <= L.x + L.w && p.y + p.h > L.y && p.y < L.y + L.h) return L;
  return null;
}
export function springUnder(game, p) {
  const m = game.mech; if (!m || !m.springs.length) return null;
  const g = groundUnder(game.grid, p.body); if (!g) return null;
  for (const s of m.springs) if (g.some((t) => t.ty === s.y && t.tx >= s.x && t.tx < s.x + s.w)) { s.t = m.t; return s; }
  return null;
}
// Digby: crouching on soil (s, K.SOIL) digs the tiles under the feet; crouching into a soil wall
// digs it. Dug soil stays dug (the room's broken set).
export function dig(game, p, dir) {
  const grid = game.grid, rs = game.rs(game.room.id), T = TILE;
  const out = [];
  if (dir) {
    const col = dir > 0 ? Math.floor((p.x + p.w + 1) / T) : Math.floor((p.x - 1) / T);
    for (const y of [p.y + 2, p.y + p.h - 2]) { const ty = Math.floor(y / T); if (grid.at(col, ty) === K.SOIL) out.push([col, ty]); }
  } else {
    const g = groundUnder(grid, p.body);
    for (const t of g || []) if (t.kind === K.SOIL) out.push([t.tx, t.ty]);
  }
  for (const [x, y] of out) {
    grid.set(x, y, K.EMPTY); rs.broken.add(y * grid.w + x);
    game.emit('dig', { x: (x + 0.5) * T, y: (y + 0.5) * T });
  }
  if (out.length) game.gridVersion++;
  return out.length > 0;
}
