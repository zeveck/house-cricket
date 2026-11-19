#!/usr/bin/env node
// [issue 11] The debug rewind (src/rewind.js, Backspace with ?rewind) is exact. A run of a recorded
// solution that rewinds (about 5 s, once or several times, sometimes several presses in a row)
// and then plays the same inputs again must end in the same state as a straight run that never
// rewinds and keeps no snapshots: the whole game, fx list included, the input layer and the modal
// layer, character for character (rewind.js digest()). At a solution's end its recorded end state
// must hold too.
//   - fixed cases: mid-room in several zones; the tank's scripted beats (sand, decor, lid; the chase: the
//     wake, mid-pounce, the gulp, the card, the retry, the escape); the
//     Duchess fight and other gecko fights at several phases; chikchak's steam vents at the
//     frames where a copied vent constant once made an extra steam event; right after a room
//     change (the rewind lands in the room before);
//   - random cases: rewind points across every solution that runs headless (seeded, repeatable);
//   - guards: no sim state in a closure (a function in the state other than the known stateless
//     ones), and no object two separate games share (a module constant) left unshared by rewind.js.
//   node tools/rewind-test.mjs [filter] [--random N] [--seed S]
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game } from '../game/src/game.js';
import { Input } from '../game/src/input.js';
import { ZONES } from '../game/data/rooms/index.js';
import { MetaLite } from './sim.mjs';
import { endState, Author } from './author.mjs';
import { Rewinder, digest, isShared, markStatics, BACK } from '../game/src/rewind.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; };
const RANDOM = Number(opt('--random', 40)), SEED = Number(opt('--seed', 11));
const only = args[0] || '';
let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log('  FAIL', label); } };
const sols = {};
const sol = (name) => (sols[name] ||= JSON.parse(readFileSync(path.join(root, 'design', 'solutions', `${name}.json`), 'utf8')));
const HEADLESS = readdirSync(path.join(root, 'design', 'solutions')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5))
  .filter((n) => sol(n).start?.from !== 'title').sort();

// A run like tools/sim.mjs makeSim(), main.js's order (keys, update, modal check, then the snapshot),
// with its loop state (frame, next event, keys held, input, modal layer) in one object `s` the rewind
// takes along (main.js takes the meta layer's pending card). rewinds: loop frames (s.f) at which
// Backspace is pressed; a frame listed twice is two presses in a row. rewinds = null: no Rewinder.
function play(name, stop, rewinds = null, onFrame = null) {
  const so = sol(name), game = new Game(ZONES), st = so.start;
  game.startAt(st.room, st.x, st.y, { items: st.items || [], party: st.party || ['pip'], rescued: st.rescued || [] });
  markStatics(game); // the World and tables: shared (as a Rewinder's first snapshot does)
  const ev = [...so.events].sort((a, b) => a[0] - b[0]);
  let s = { input: new Input(), meta: null, f: 0, i: 0, phys: new Set() };
  s.meta = new MetaLite(game, s.input); s.meta.lastFx = game.frame;
  const rw = rewinds ? new Rewinder() : null, plan = rewinds ? [...rewinds].sort((a, b) => a - b) : [], log = [];
  let k = 0;
  while (s.f < stop) {
    if (k < plan.length && s.f >= plan[k]) {
      k++;
      const from = s.f, room = game.room.id, r = rw.rewind(game);
      if (r) s = r.extra;
      log.push({ from, to: s.f, frames: r?.frames ?? 0, room, toRoom: game.room.id, phase: game.boss?.phase });
      continue;
    }
    const { input, meta, phys } = s;
    while (s.i < ev.length && ev[s.i][0] <= s.f) { const [, code, t] = ev[s.i++]; if (t === 'down') { input.keyDown(code); phys.add(code); } else { input.keyUp(code); phys.delete(code); } }
    meta.press(phys);
    game.update(input.sample()); meta.check(s.f + 1);
    s.f++;
    if (rw) rw.record(game, () => s);
    if (onFrame) onFrame(game, s);
  }
  return { game, s, log, state: digest({ game, s }), end: stop === so.frames ? JSON.stringify(endState(game.snapshot())) === JSON.stringify(so.endState) : null };
}

const straight = {};
function check(name, stop, rewinds, label, want = {}) {
  const so = sol(name); stop = Math.min(stop, so.frames);
  const a = (straight[`${name}@${stop}`] ||= play(name, stop));
  const b = play(name, stop, rewinds);
  const desc = b.log.map((l) => `${l.from}->${l.to}${l.room !== l.toRoom ? ` ${l.room}->${l.toRoom}` : ` ${l.room}`}${l.phase ? ` p${l.phase}` : ''}`).join(', ');
  ok(b.state === a.state, `${label}: same state as a straight run at ${stop} (rewinds ${desc})`);
  if (b.state !== a.state) { let k = 0; while (a.state[k] === b.state[k]) k++; console.log(`     first diff at ${k}:\n     straight ${a.state.slice(Math.max(0, k - 160), k + 60)}\n     rewound  ${b.state.slice(Math.max(0, k - 160), k + 60)}`); }
  if (b.end !== null) ok(b.end, `${label}: the solution's end state still holds`);
  if (want.back) for (const l of b.log) if (l.from - l.to < BACK && l.to > 0 && l.frames) ok(false, `${label}: went back only ${l.frames} frames from ${l.from} with history to spare`);
  if (want.room) ok(b.log.some((l) => l.room !== l.toRoom), `${label}: the rewind crossed back into the room before (${desc})`);
  if (want.moved) ok(b.log.every((l) => l.frames >= BACK), `${label}: each rewind went back at least ${BACK} frames (${desc})`);
  if (!only || fail) console.log(`${b.state === a.state ? 'ok  ' : 'FAIL'} ${label}: ${desc}`);
}
// first loop frame after `from` where the room is not `room0`, and first where the boss is `mode`
function firstFrame(name, test) { let at = null; try { play(name, sol(name).frames, null, (g, s) => { if (at == null && test(g, s)) { at = s.f; throw 0; } }); } catch (e) { if (e !== 0) throw e; } return at; }
const want = (re) => !only || re.some((x) => x.includes(only));

// ---- fixed cases ----
const fixed = [
  ['zone-01-boss', [450, 900, 1400], 'Duchess'],
  ['zone-05-boss', [700, 1500], 'laundry gecko'],
  ['zone-09-boss', [600, 1400], 'basement gecko'],
  ['zone-10-boss', [800], 'attic gecko'],
  ['zone-01-path', [1200, 3000], 'Bedroom'],
  ['zone-08-path', [2500], 'sunroom'],
  ['entities-2-lifts', [380], 'lifts'],
  ['entities-3-terrain', [500], 'terrain'],
];
for (const [name, Ts, what] of fixed) if (want([name, what])) for (const T of Ts) check(name, T + 120, [T], `${what} ${name} rewind @${T}`, { moved: true });
// the tank's scripted beats (src/bosses/tank.js): a few frames into each, mid-way, and right after its
// set piece (the pebble's landing, the lid squeeze); then to the end (the story hand-over)
if (want(['tank', 'zone-00-path'])) {
  const n = 'zone-00-path';
  for (const room of ['tank-sand', 'tank-decor', 'tank-lid']) {
    const at = firstFrame(n, (g) => g.room.id === room);
    ok(at != null, `tank: reaches ${room}`);
    if (at == null) continue;
    for (const d of [5, 200, 400]) check(n, at + d + 150, [at + d], `tank ${room} +${d}`);
  }
  const landed = firstFrame(n, (g) => g.room.id === 'tank-decor' && g.boss?.mode === 'step');
  const squeezed = firstFrame(n, (g) => g.room.id === 'tank-lid' && g.boss?.mode === 'out');
  ok(landed != null && squeezed != null, 'tank: the pebble lands and the lid squeeze happens');
  if (landed != null) check(n, sol(n).frames, [landed + 10, landed + 11], 'tank pebble landed, rewound twice, to the end');
  if (squeezed != null) check(n, sol(n).frames, [squeezed + 30], 'tank lid squeezed, rewound, to the end');
}
// [issues 24, 25] the escape (tank.js Sand): at the wake, mid-pounce (in the air), mid-sniff while hidden, as
// she curls up (the flag: the escape) (zone-00-path); and from a short run authored here that stands still to
// be eaten: the gulp (black), the card, and the retry
if (want(['tank', 'zone-00-path', 'duchess-hunt', 'chase'])) {
  const n = 'zone-00-path', sand = (g) => g.room.id === 'tank-sand' && g.boss;
  const wake = firstFrame(n, (g) => sand(g) && g.boss.mode === 'wake');
  const air = firstFrame(n, (g) => sand(g) && g.boss.mode === 'air');
  const sniff = firstFrame(n, (g) => sand(g) && g.boss.mode === 'sniff' && g.player.state === 'hide');
  const flag = firstFrame(n, (g) => g.room.id === 'tank-sand' && g.rs('tank-sand').taken.has('duchess-asleep'));
  ok(wake != null && air != null && sniff != null && flag != null, 'tank chase: the wake, a pounce, the sniff and the flag happen');
  if (wake != null) check(n, wake + 160, [wake + 3], 'tank chase at the wake');
  if (air != null) check(n, air + 150, [air + 12], 'tank chase mid-pounce');
  if (sniff != null) check(n, sniff + 200, [sniff + 50], 'tank chase mid-sniff, hidden');
  if (flag != null) { check(n, flag + 150, [flag + 1], 'tank chase: the escape (right after the flag)'); check(n, sol(n).frames, [flag + 1], 'tank chase: the escape, to the end'); }
  // eaten: stand still past the wake point until she catches him; then the gulp, the card and the retry
  const a = new Author({ room: 'tank-sand', x: 36, y: 15, items: [], party: ['pip'] });
  a.down('ArrowRight').until((g) => g.player.cx > 38.6 * 40, 300).up('ArrowRight');
  a.until((g) => g.boss.mode === 'gulp', 900, 'eaten');
  const gulp = a.f;
  a.until((g) => g.boss.black === 1, 60, 'black');
  const black = a.f;
  a.until((g) => g.boss.card >= 0, 120, 'the card');
  const card = a.f;
  a.until((g) => g.boss.mode === 'asleep', 200, 'the retry');
  const retry = a.f;
  a.wait(240);
  sols['tank-eaten'] = { name: 'tank-eaten', start: a.start, frames: a.f, events: a.events, endState: null };
  check('tank-eaten', gulp + 150, [gulp + 2], 'tank chase: the gulp');
  check('tank-eaten', black + 150, [black + 10], 'tank chase: black');
  check('tank-eaten', card + 150, [card + 20], 'tank chase: the card');
  check('tank-eaten', retry + 200, [retry + 5], 'tank chase: the retry');
  check('tank-eaten', a.f - 1, [retry + 60, retry + 61], 'tank chase: after the retry, rewound twice');
}
// chikchak's steam vents (module constants compared by identity: a copied one made an extra steam event)
if (want(['zone-02-boss', 'chikchak'])) for (const T of [805, 1005, 1115, 1185]) { check('zone-02-boss', T + 90, [T], `chikchak vents @${T}`); check('zone-02-boss', sol('zone-02-boss').frames, [T], `chikchak vents @${T}, to the end`); }
// right after a room change
for (const name of ['zone-01-path', 'zone-08-path', 'zone-03-path']) {
  if (!want([name, 'room change'])) continue;
  let r0 = null;
  const c = firstFrame(name, (g, s) => { if (s.f < 400) { r0 = g.room.id; return false; } return g.room.id !== r0; });
  ok(c != null, `${name}: a room change after frame 400`);
  if (c != null) check(name, c + 140, [c + 20], `room change ${name} @${c}+20`, { room: true });
}

// ---- random cases (seeded) ----
let seed = SEED; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
if (want(['random'])) for (let n = 0; n < RANDOM; n++) {
  const name = HEADLESS[Math.floor(rnd() * HEADLESS.length)], frames = sol(name).frames;
  const stop = rnd() < 0.4 ? frames : Math.min(frames, 120 + Math.floor(rnd() * frames));
  const plan = []; let f = 0;
  for (let j = 1 + Math.floor(rnd() * 3); j > 0 && f < stop - 2; j--) { f += 1 + Math.floor(rnd() * Math.max(1, stop - f - 1)); if (f >= stop) break; plan.push(f); if (rnd() < 0.25) plan.push(f); }
  if (plan.length) check(name, stop, plan, `random ${n} ${name}`);
}

// ---- guards (every headless solution, sampled every 97 frames) ----
// (1) own-property functions in the state are stateless (they run on the live game): game.ctx's hooks,
// the grid's edge lookup and the seeded generators (copied by state). Anything else would keep its state
// in a closure that a rewind can't copy. (2) an object reachable from two separate games' state is a
// module constant: rewind.js must share it (frozen, or World / tables), not copy it.
const FN_OK = /^ctx\.(emit|breakUnder|surface|liftAt|springUnder|dig|unsafeTile|edgeFloor|grid\.oob)$|^grid\.oob$/;
const PLAIN = new Set(['[object Object]', '[object Array]', '[object Map]', '[object Set]']);
function reach(g, fns) {
  const seen = new Map();
  const walk = (v, p) => {
    if (typeof v === 'function') { if (fns && !v.rngState) fns.set(p.replace(/\.\d+/g, '.[]'), v); return; }
    if (!v || typeof v !== 'object' || v === g || seen.has(v) || isShared(v) || !PLAIN.has(Object.prototype.toString.call(v))) return;
    seen.set(v, p);
    if (v instanceof Map) { for (const [, x] of v) walk(x, `${p}<>`); return; }
    if (v instanceof Set) { for (const x of v) walk(x, `${p}{}`); return; }
    for (const k of Reflect.ownKeys(v)) { const d = Object.getOwnPropertyDescriptor(v, k); if ('value' in d) walk(d.value, `${p}.${String(k)}`); }
  };
  for (const k of Reflect.ownKeys(g)) walk(g[k], String(k));
  return seen;
}
if (want(['guard'])) {
  const fns = new Map(), leaks = new Map();
  for (const name of HEADLESS) {
    const other = [];
    play(name, sol(name).frames, null, (g, s) => { if (s.f % 97 === 0) other.push(reach(g, null)); });
    let n = 0;
    play(name, sol(name).frames, null, (g, s) => {
      if (s.f % 97) return;
      const mine = reach(g, fns), theirs = other[n++];
      for (const [o, p] of mine) if (theirs?.has(o)) leaks.set(p.replace(/\.\d+/g, '.[]'), name);
    });
  }
  const bad = [...fns.keys()].filter((p) => !FN_OK.test(p));
  ok(!bad.length, `no sim state in closures (functions in the state: ${bad.join(', ') || 'only the known stateless ones'})`);
  ok(!leaks.size, `no module constant copied by a rewind (${[...leaks].map(([p, n]) => `${p} in ${n}`).join(', ') || 'none'})`);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
