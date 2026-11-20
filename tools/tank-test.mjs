#!/usr/bin/env node
// [issue 7] [issues 24, 25] Headless checks for the tank's sand room (src/bosses/tank.js Sand, design: Screens,
// Opening, beat 3 "The escape"), in normal and Gentle Mode: she sleeps on her rock and wakes at about tile 38,
// on a head bump or a chirp within 6 tiles; a Pip who reacts to every tell always reaches the log (hop timings
// swept); a still Pip is eaten (not in Gentle Mode: never eaten there); a retry is a fresh entry at the
// checkpoint, never die() and never health; a buffered or held ↓ hides at the log; leaving the log early gets
// a roar and a full tell first; she never leaves the room or gets stuck; the exit stays shut until she sleeps.
//   node tools/tank-test.mjs [filter]
import { Game } from '../game/src/game.js';
import { ZONES } from '../game/data/rooms/index.js';
import { TILE as T, FPS } from '../game/data/movement.js';
import { TELL } from '../game/src/bosses/base.js';
import { TEXT } from '../game/data/text.js';

const TK = TEXT.opening.tank, SLEPT = 'duchess-asleep';
const only = process.argv[2] || '';
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) pass++; else { fail++; console.log('  FAIL', label); } };
const section = (name, fn) => { if (only && !name.includes(only)) return; try { fn(); } catch (e) { fail++; console.log('  FAIL', name, 'threw', e.stack.split('\n').slice(0, 3).join(' | ')); } };

const KEYS = ['left', 'right', 'up', 'down', 'jump', 'use', 'chirp', 'kick', 'listen', 'swapPrev', 'swapNext', 'enter', 'cloak', 'upJump', 'lookUp', 'confirm']; // [issue #27]
// a game in the sand room (Pip at tile x, default its left edge), every event logged, and a key driver
function sandGame(gentle, x = 1) {
  const g = new Game(ZONES);
  g.startAt('tank-sand', x, 15);
  g.gentle = gentle;
  const ev = [];
  const emit = g.emit.bind(g);
  g.emit = (t, d = {}) => { ev.push({ t, d, f: g.frame }); emit(t, d); };
  const toasts = [], toast = g.toast.bind(g);
  g.toast = (text, dur) => { toasts.push({ text, f: g.frame }); toast(text, dur); };
  let died = 0; const die = g.die.bind(g); g.die = () => { died++; die(); };
  let prev = {};
  const step = (held = {}, n = 1) => {
    for (let i = 0; i < n; i++) {
      const h = {}, pr = {}, rl = {};
      for (const k of KEYS) { h[k] = !!held[k]; pr[k] = h[k] && !prev[k]; rl[k] = !h[k] && !!prev[k]; }
      prev = h;
      g.update({ held: h, pressed: pr, released: rl });
    }
  };
  let jt = 0;
  // walk toward a column, hopping the ripples, her rock and the berms when blocked
  const run = (dir, extra = {}) => {
    const p = g.player;
    if (p.grounded && Math.abs(p.vx) < 30 && jt === 0 && p.state !== 'hide' && dir) jt = 18;
    const h = dir > 0 ? { right: true } : dir < 0 ? { left: true } : {};
    if (jt > 0) { jt--; h.jump = jt > 2; }
    step({ ...h, ...extra });
  };
  const runTo = (x, max = 900) => { for (let i = 0; i < max && Math.abs(g.player.cx - x * T) > 6; i++) run(Math.sign(x * T - g.player.cx)); jt = 0; step({}, 3); };
  const until = (cond, max, fn = () => step({})) => { for (let i = 0; i < max; i++) { if (cond()) return true; fn(); } return cond(); };
  const hide = () => until(() => g.player.state === 'hide', 40, () => { step({ down: true }); step({}); });
  const b = () => g.boss;
  return { g, p: g.player, b, ev, toasts, step, run, runTo, until, hide, died: () => died, lost: () => g.rs('tank-sand').taken.has(SLEPT) };
}
const count = (ev, t, since = -1, pred = () => true) => ev.filter((e) => e.t === t && e.f > since && pred(e.d)).length;
const roar = (d) => d.name === 'gecko-growl' && d.rate === 0.7;
const HUNTING = ['wake', 'run', 'crouch', 'spring', 'air', 'land', 'toLog', 'snap', 'sniff', 'roar', 'shake'];
// past her asleep without touching her head: onto her rock behind her, then a full jump over her head
function creepPast(s) {
  s.runTo(21);
  s.step({ right: true, jump: true }, 12); s.until(() => s.p.state === 'ground', 60, () => s.step({ right: true }));
  s.runTo(24.8);
  s.step({ right: true, jump: true }, 20); s.until(() => s.p.state === 'ground', 80, () => s.step({ right: true }));
}
// a Pip who reacts to every tell: runs flat out for the log; when she springs (the shadow goes down) he hops
// `delay` frames later (a full hop); at the log he presses ↓. Returns what happened.
function reactingRun(s, delay, max = 60 * FPS) {
  const { g, p } = s;
  let hopAt = -1, hopT = 0, auto = 0, caught = 0;
  for (let i = 0; i < max; i++) {
    const b = s.b();
    if (b.mode === 'gulp' || b.mode === 'shake') { caught++; break; }
    if (s.lost() && p.state === 'hide') return { hid: true, caught, frames: i };
    if (b.mode === 'spring' && b.t === 0) hopAt = g.frame + delay;
    const h = {};
    if (p.state !== 'hide') {
      if (p.cx < 58.5 * T) h.right = true;
      if (g.frame === hopAt) hopT = 20;
      if (p.grounded && Math.abs(p.vx) < 30 && auto === 0 && hopT === 0) auto = 18;
      if (hopT > 0) { hopT--; h.jump = true; } else if (auto > 0) { auto--; h.jump = auto > 2; }
      if (p.cx > 56.5 * T && i % 4 < 2 && !h.jump) h.down = true;
    }
    s.step(h);
  }
  return { hid: p.state === 'hide', caught, frames: max };
}

for (const gentle of [false, true]) {
  const M = gentle ? 'gentle' : 'normal';

  section(`asleep on entry (${M})`, () => {
    const s = sandGame(gentle);
    s.step({}, 5);
    ok(s.b().mode === 'asleep' && s.b().pose === 'sleep' && !s.b().anim, `${M}: asleep (the sleep art) on entry`);
    const bx = s.b().x / T;
    ok(bx > 22 && bx < 27.5, `${M}: on her rock mid-room (her middle at ${bx.toFixed(1)})`);
    ok(s.b().musicNow === null && s.b().warmMusic === 'chase' && s.b().dark === 0, `${M}: quiet music, the chase cue warm, the room lit`);
  });

  section(`the wake at ~38 (${M})`, () => {
    const s = sandGame(gentle);
    creepPast(s);
    ok(s.b().mode === 'asleep', `${M}: creeping past (over her head) she stays asleep (${s.b().mode}, Pip ${(s.p.cx / T).toFixed(1)})`);
    ok((s.b().stir & 1) && count(s.ev, 'sfx', -1, (d) => d.name === 'gecko-growl' && d.gain < 0.3) === 1, `${M}: she stirs as he passes (a tail twitch, an eye flicker, a low growl note)`);
    let wokeAt = null;
    s.until(() => s.b().mode !== 'asleep', 600, () => { s.run(1); });
    wokeAt = s.p.cx / T;
    ok(s.b().mode === 'wake' && s.b().why === 'past' && wokeAt > 37.9 && wokeAt < 38.4, `${M}: she wakes as he passes 38 (at ${wokeAt.toFixed(2)})`);
    ok(s.b().anim === 'wake' && s.b().musicNow === 'chase', `${M}: the wake animation; the chase cue takes over the room's music`);
    s.step({ right: true }, 24);
    ok(s.b().dark > 0.95, `${M}: the room darkens over 0.4 s (${s.b().dark.toFixed(2)})`);
    ok(s.g.signs.some((sg) => sg.key === 'opening.tank.hideLog'), `${M}: the log's note is up from the wake`);
  });

  section(`a head bump wakes her (${M})`, () => {
    const s = sandGame(gentle);
    s.runTo(21);
    s.step({ right: true, jump: true }, 12); s.until(() => s.p.state === 'ground', 60, () => s.step({ right: true }));
    s.until(() => s.b().mode !== 'asleep', 200, () => s.step({ right: true }));
    ok(s.b().mode === 'wake' && s.b().why === 'bump' && s.p.cx < 30 * T, `${M}: walking into her head wakes her (${s.b().why} at ${(s.p.cx / T).toFixed(1)})`);
  });

  section(`walking past her tail doesn't wake her (${M})`, () => {
    const s = sandGame(gentle);
    s.runTo(21); s.step({ right: true, jump: true }, 12); s.until(() => s.p.state === 'ground', 60, () => s.step({ right: true }));
    s.runTo(24.6); s.step({}, 30);
    ok(s.b().mode === 'asleep', `${M}: on her rock beside her body: still asleep`);
  });

  for (const [x, wake] of [[31.5, true], [34.5, false]]) section(`a chirp at ${x} (${M})`, () => {
    const s = sandGame(gentle, Math.floor(x));
    s.step({}, 30);
    s.step({ chirp: true }); s.step({}, 2);
    ok((s.b().mode === 'wake') === wake, `${M}: a chirp at ${x} ${wake ? 'wakes her (within 6 tiles of her head)' : "doesn't wake her (too far)"} (${s.b().mode} ${s.b().why || ''})`);
  });

  for (const delay of [10, 14, 18, 22, 26, 30, 34]) section(`a reacting Pip reaches the log, hop +${delay} (${M})`, () => {
    for (const from of [1, 'bump', 33]) {
      const s = sandGame(gentle, from === 'bump' ? 1 : from);
      if (from === 1) creepPast(s);
      if (from === 'bump') { s.runTo(21); s.step({ right: true, jump: true }, 12); } // onto her rock, into her head: she wakes at ~27
      const r = reactingRun(s, delay);
      ok(r.hid && !r.caught && (s.g.duchessCatches || 0) === 0, `${M}: from ${from}, hopping ${delay} frames after each spring: hidden in the log and escaped (caught ${r.caught}, hid ${r.hid}, ${(s.p.cx / T).toFixed(1)}, ${s.b().mode}, pounces ${s.b().pounces})`);
      ok(s.died() === 0 && s.p.health === s.p.maxHealth, `${M}: no die(), no health lost`);
    }
  });

  section(`pounces (${M})`, () => {
    const s = sandGame(gentle, 33);
    const lands = [];
    let pr = 0;
    s.until(() => s.b().pounces >= 1, 900, () => s.run(s.p.cx < 44 * T ? 1 : 0));
    const b = s.b();
    ok(b.pounces === 1 && (s.g.duchessCatches || 0) === 0 && b.mode !== 'shake', `${M}: pounce 1 is a near miss (${b.mode})`);
    void lands; void pr;
    ok(count(s.ev, 'sandSpray', -1, (d) => d.shake === 6) === 1 && count(s.ev, 'sfx', -1, (d) => d.name === 'pounce-land') === 1, `${M}: a landing: a 6 px shake, a sand spray, pounce-land`);
    ok(count(s.ev, 'sfx', -1, (d) => d.name === 'whoosh') === 1, `${M}: the air whoosh on the leap`);
    const tell = s.ev.find((e) => e.t === 'tell');
    ok(tell && tell.d.frames === Math.round((gentle ? TELL.gentle : TELL.normal) * FPS), `${M}: the tell: ${gentle ? TELL.gentle : TELL.normal} s (${tell?.d.frames} frames)`);
  });

  section(`hop the berm (${M})`, () => {
    // he waits on top of the berm at 48-50: a pounce at him slams into its face
    const s = sandGame(gentle, 46);
    s.step({}, 3); s.b().startWake('test'); s.b().pounces = 1;
    s.step({ right: true, jump: true }, 14); s.until(() => s.p.state === 'ground', 60, () => s.step({ right: true }));
    s.step({}, 4);
    const onBerm = s.p.y + s.p.h <= 14 * T + 1;
    s.until(() => s.b().pounces >= 2, 600);
    ok(onBerm && s.b().bite === 'berm' && (s.g.duchessCatches || 0) === 0 && s.b().mode !== 'shake', `${M}: on the berm, her pounce bites the berm (${s.b().bite}, on it ${onBerm})`);
  });

  section(`never leaves the room, never stuck (${M})`, () => {
    const s = sandGame(gentle, 33);
    let minX = 1e9, maxX = -1e9, rooms = new Set(), pounces = 0, last = 0, f0 = s.g.frame;
    for (let i = 0; i < 60 * FPS; i++) {
      const ph = Math.floor(i / 130) % 5;
      s.run(ph === 0 || ph === 3 ? 1 : ph === 1 ? -1 : 0);
      if (s.p.cx < 30 * T) { for (let k = 0; k < 40; k++) s.run(1); }
      const b = s.b();
      rooms.add(s.g.room.id);
      if (b.mode !== 'gulp') { minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.x); }
      if (b.pounces > last) { pounces++; } last = b.pounces;
    }
    ok(rooms.size === 1, `${M}: 60 s of dodging about: always in tank-sand (${[...rooms]})`);
    ok(minX >= 4.5 * T - 0.01 && maxX <= 59.5 * T + 0.01, `${M}: she stays in the room (${(minX / T).toFixed(1)}..${(maxX / T).toFixed(1)})`);
    ok(pounces > 6, `${M}: she keeps pouncing (${pounces})`);
    ok(count(s.ev, 'hurt', f0) === 0 && s.died() === 0 && s.p.health === s.p.maxHealth, `${M}: no hurt, no die(), health kept`);
  });

  section(`the log: a buffered ↓ (${M})`, () => {
    const s = sandGame(gentle, 51);
    s.step({}, 3); s.b().startWake('test');
    // run at the log; tap ↓ for 4 frames 0.15 s before he's in its zone
    let tapped = -1;
    for (let i = 0; i < 300 && s.p.state !== 'hide'; i++) {
      const h = { right: s.p.cx < 58.5 * T };
      const zoneEdge = 58.5 * T - 2 * T;
      if (tapped < 0 && s.p.cx > zoneEdge - 0.15 * 260 - 6 && s.p.state === 'ground') tapped = i;
      if (tapped >= 0 && i - tapped < 2) h.down = true;
      s.step(h);
    }
    ok(s.p.state === 'hide', `${M}: a ↓ tapped just before the log's zone hides him (${s.p.state})`);
    ok(s.p.hideHold, `${M}: hidden while she hunts: only Jump leaves (hideHold)`);
  });

  section(`the log: ↓ held on arrival (${M})`, () => {
    const s = sandGame(gentle, 54);
    s.step({}, 3); s.b().startWake('test');
    s.step({ right: true }, 20);
    s.step({ right: true, jump: true }, 10);
    s.until(() => s.p.state !== 'air', 60, () => s.step({ right: s.p.cx < 58 * T, down: true }));
    s.step({ down: true }, 2);
    ok(s.p.state === 'hide', `${M}: leaping at the log holding ↓: he dives in on landing (${s.p.state}, ${(s.p.cx / T).toFixed(2)})`);
  });

  section(`the escape (${M})`, () => {
    const s = sandGame(gentle, 52);
    s.step({}, 3); s.b().startWake('test'); s.step({}, 40);
    s.runTo(58.5); s.hide();
    const f0 = s.g.frame;
    ok(s.until(() => s.b().mode === 'snap', 300), `${M}: she comes and snaps at the log`);
    ok(count(s.ev, 'barkChips', f0) === 1 && count(s.ev, 'sfx', f0, (d) => d.name === 'gecko-chomp') === 1 && s.b().pose === 'strike', `${M}: jaws on bark: strike, bark chips, gecko-chomp`);
    ok(s.g.hold > 0, `${M}: a hit-stop`);
    s.step({ right: true }, 20);
    ok(s.p.state === 'hide', `${M}: Right doesn't leave the log while she's at it`);
    ok(s.until(() => s.b().mode === 'sniff', 60) && s.b().anim === 'tongue', `${M}: she sniffs (the tongue)`);
    ok(s.until(() => s.lost(), 400), `${M}: she loses him: the room's flag`);
    ok(s.b().mode === 'curl' && s.b().pose === 'sleep' && s.b().musicNow === null, `${M}: she curls up asleep where she is; the chase music stops`);
    ok(count(s.ev, 'sfx', f0, (d) => d.name === 'relief-sting') === 1, `${M}: the relief sting`);
    s.step({}, 95);
    ok(s.b().dark === 0 && s.b().mode === 'nap', `${M}: the light is back after 1.5 s`);
    ok(s.p.state === 'hide', `${M}: still hidden`);
    s.step({ right: true }, 2);
    ok(s.p.state !== 'hide', `${M}: once she's asleep, Right leaves the log`);
    // she stays asleep: bumps and chirps don't wake her
    const f1 = s.g.frame;
    s.step({ chirp: true }); s.step({}, 30);
    ok(s.b().mode === 'nap', `${M}: a chirp doesn't wake her`);
    ok(s.until(() => s.g.room.id === 'tank-decor', 300, () => s.step({ right: true })), `${M}: the way on is open`);
    s.step({}, 30);
    ok(s.until(() => s.g.room.id === 'tank-sand', 300, () => s.step({ left: true })), `${M}: back to the sand`);
    ok(s.b().mode === 'nap', `${M}: she's asleep (${s.b().mode})`);
    s.runTo(30, 1200); s.step({}, 200);
    ok(s.b().mode === 'nap' && count(s.ev, 'tell', f1) === 0, `${M}: and stays asleep (walking about, past her)`);
  });

  section(`out of the log early (${M})`, () => {
    const s = sandGame(gentle, 52);
    s.step({}, 3); s.b().startWake('test'); s.step({}, 40);
    s.runTo(58.5); s.hide();
    s.until(() => s.b().mode === 'sniff' && s.b().t > 10, 400);
    const f0 = s.g.frame;
    s.step({ jump: true }, 2); s.step({}, 1);
    ok(s.b().mode === 'roar' && count(s.ev, 'sfx', f0, roar) === 1, `${M}: Jump out while she sniffs: a roar`);
    let tellF = null, springF = null;
    s.until(() => springF != null, 300, () => { s.step({}); if (tellF == null && count(s.ev, 'tell', f0)) tellF = s.g.frame; if (springF == null && s.b().mode === 'spring') springF = s.g.frame; });
    const n = Math.round((gentle ? TELL.gentle : TELL.normal) * FPS);
    ok(tellF != null && springF - tellF >= n, `${M}: then a full tell before the pounce (${springF - tellF} >= ${n} frames)`);
  });

  section(`the exit is shut while she hunts (${M})`, () => {
    const s = sandGame(gentle, 56);
    s.step({}, 3); s.b().startWake('test');
    let maxX = 0;
    for (let i = 0; i < 120; i++) { s.step({ right: true }); maxX = Math.max(maxX, s.p.x + s.p.w); }
    ok(maxX <= 60 * T + 0.01 && s.g.room.id === 'tank-sand', `${M}: held at the way on (${(maxX / T).toFixed(2)})`);
    ok(s.toasts.some((t) => t.text === TK.exitShut), `${M}: "${TK.exitShut}"`);
  });
}

// ---------------------------------------------------------------- eaten (normal) / shooed (Gentle Mode)
section('a still Pip is eaten', () => {
  for (const x of [39, 44, 52, 56, 59.5]) {
    const s = sandGame(false, 33);
    s.runTo(x, 1200);
    const f0 = s.g.frame;
    s.until(() => s.b().mode === 'gulp', 12 * FPS);
    const secs = (s.g.frame - f0) / FPS;
    ok(s.b().mode === 'gulp' && secs < 10, `standing still at ${x}: eaten within 10 s (${secs.toFixed(1)} s)`);
  }
});

section('eaten: the gulp, the card, the retry', () => {
  const s = sandGame(false, 39);
  const hp0 = s.p.health;
  s.until(() => s.b().mode === 'gulp', 12 * FPS);
  const b = s.b(), f0 = s.g.frame;
  ok(b.pipGone && count(s.ev, 'sandPuff', f0 - 1) === 1, 'his snout catch: Pip is gone in a sand puff');
  ok(b.held === 3 && b.anim === 'pounce', 'the landing frame (jaws closing)');
  s.step({}, 15);
  ok(b.black === 1 && count(s.ev, 'sfx', f0, (d) => d.name === 'gulp') === 1 && b.musicNow === null, 'black, the gulp ("mm"), the chase music stops');
  s.step({}, 30);
  ok(b.anim === 'tongue', 'back on her: the lip-lick');
  s.step({}, 30);
  ok(b.pose === 'sleep' && !b.anim && count(s.ev, 'sfx', f0, (d) => d.name === 'gecko-snore') === 1, 'asleep with a snore');
  ok(b.card >= 0, 'the card');
  // holding Jump can't skip it; a press after its first 0.5 s does
  s.step({ jump: true }, 20);
  ok(s.b() === b && b.mode === 'gulp', 'holding Jump (or a press in its first 0.5 s) does not skip the card');
  s.step({}, 12);
  s.step({ kick: true });
  ok(s.b() !== b, `a key press after 0.5 s skips it (card at ${b.card})`);
  ok(s.died() === 0 && s.p.health === hp0 && count(s.ev, 'hurt') === 0 && count(s.ev, 'die') === 0, 'never die(), never health');
  ok(count(s.ev, 'retry') === 1, 'a room retry');
});

section('the card times out', () => {
  const s = sandGame(false, 39);
  s.until(() => s.b().mode === 'gulp', 12 * FPS);
  const b = s.b(); let shown = 0;
  s.until(() => s.b() !== b, 400, () => { s.step({}); if (b.card >= 0 && s.b() === b) shown++; });
  ok(shown <= 91 && shown > 80, `the card is up at most 1.5 s (${shown} frames)`);
});

section('a retry is a fresh entry at the checkpoint', () => {
  const s = sandGame(false, 39);
  s.until(() => s.b().mode === 'gulp', 12 * FPS);
  s.until(() => s.b().mode !== 'gulp', 400);
  const f = sandGame(false, 33); f.g.hold = s.g.hold; f.g.trans = s.g.trans && { ...s.g.trans };
  const pick = (g) => {
    const b = g.boss, out = {};
    for (const [k, v] of Object.entries(b)) if (!['g', 'e', 'rig'].includes(k)) out[k] = v;
    return JSON.stringify({ b: out, p: [g.player.x, g.player.y, g.player.state, g.player.vx, g.player.vy, g.player.health], signs: g.signs.map((x) => x.key), toasts: g.toasts.map((t) => t.text), room: g.room.id, slept: g.rs('tank-sand').taken.has(SLEPT) });
  };
  const a = pick(s.g), c = pick(f.g);
  ok(a === c, `after a retry: as a fresh entry at tile 33\n      retry ${a}\n      fresh ${c}`);
  ok(s.b().mode === 'asleep', 'she is asleep again');
});

section('three catches: shorter pounces, Gentle Mode offered', () => {
  const s = sandGame(false, 39);
  for (let c = 0; c < 4; c++) {
    s.until(() => s.b().mode === 'gulp', 20 * FPS, () => s.run(s.p.cx < 44 * T ? 1 : 0));
    s.until(() => s.b().mode !== 'gulp', 400);
  }
  ok((s.g.duchessCatches || 0) === 4, `four catches (${s.g.duchessCatches})`);
  ok(count(s.ev, 'story', -1, (d) => d.name === 'gentleOffer') === 1, 'Gentle Mode is offered once, after the third');
  // the same pounce at the same Pip, before and after three catches: it lands shorter
  const aim = (caught) => {
    const t = sandGame(false, 46);
    t.g.duchessCatches = caught; t.step({}, 3); t.b().startWake('test'); t.b().pounces = 1;
    t.until(() => t.b().mode === 'spring', 900);
    return (t.p.cx - (t.b().x1 + t.b().facing * 124)) * t.b().facing;
  };
  const a0 = aim(0), a3 = aim(3), a5 = aim(5);
  ok(a3 > a0 + 0.3 * T && a5 > a3, `from the third catch her pounces land shorter (${(a0 / T).toFixed(2)}, ${(a3 / T).toFixed(2)}, ${(a5 / T).toFixed(2)} tiles short of him)`);
});

section('Pause > Back to room entrance', () => {
  const s = sandGame(false, 39);
  s.until(() => s.b().mode === 'run', 200);
  const b = s.b();
  ok(s.g.backToEntrance() === 'room' && s.b() !== b && s.b().mode === 'asleep' && Math.abs(s.p.cx - 33.5 * T) < 2, `while she hunts: the same retry (Pip at ${(s.p.cx / T).toFixed(1)})`);
  const s2 = sandGame(false, 5);
  s2.step({}, 10);
  const b2 = s2.b();
  s2.g.backToEntrance();
  ok(s2.b() === b2 && s2.p.cx < 10 * T, 'asleep: the usual room entrance');
});

section('Gentle Mode never eats him', () => {
  for (const x of [39, 52, 59.5]) {
    const s = sandGame(true, 33);
    s.runTo(x, 1200);
    const f0 = s.g.frame;
    let gulps = 0;
    for (let i = 0; i < 40 * FPS; i++) { s.step({}); if (s.b().mode === 'gulp') gulps++; }
    ok(gulps === 0 && !(s.g.duchessCatches > 0), `Gentle Mode, still at ${x} for 40 s: never eaten`);
    ok(count(s.ev, 'sfx', f0, roar) > 0 && s.p.health === s.p.maxHealth, `Gentle Mode: a catch is a roar and a skitter (${count(s.ev, 'sfx', f0, roar)})`);
  }
});

section('gentle tell', () => {
  const tellOf = (gentle) => { const s = sandGame(gentle, 39); s.until(() => s.b().mode === 'crouch', 600); const e = s.ev.find((x) => x.t === 'tell'); const f = s.g.frame; s.until(() => s.b().mode !== 'crouch', 300); return { frames: e?.d.frames, held: s.g.frame - f }; };
  const n = tellOf(false), gm = tellOf(true);
  ok(n.frames === Math.round(TELL.normal * FPS) && gm.frames === Math.round(TELL.gentle * FPS), `the tell event's frames (normal ${n.frames}, gentle ${gm.frames})`);
  ok(gm.held > n.held, `Gentle Mode's crouch is longer (${gm.held} vs ${n.held} frames)`);
});

console.log(`tank-test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
