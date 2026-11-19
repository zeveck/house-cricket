#!/usr/bin/env node
// [issue 7] Headless checks for the tank's sand room (src/bosses/tank.js Sand, design: Screens, Opening,
// beat 3 "Duchess hunts"), in normal and Gentle Mode: no damage anywhere, only her snout catches (a roar
// and a skitter), the exit stays shut until she has lost him in the log, and coming back she naps.
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

const KEYS = ['left', 'right', 'up', 'down', 'jump', 'use', 'chirp', 'kick', 'listen', 'swapPrev', 'swapNext', 'enter', 'cloak', 'upJump', 'lookUp']; // [issue #27]
// a game in the sand room (Pip at its left edge), every event logged, and a key driver
function sandGame(gentle) {
  const g = new Game(ZONES);
  g.startAt('tank-sand', 1, 15);
  g.gentle = gentle;
  const ev = [];
  const emit = g.emit.bind(g);
  g.emit = (t, d = {}) => { ev.push({ t, d, f: g.frame }); emit(t, d); };
  const toasts = [], toast = g.toast.bind(g);
  g.toast = (text, dur) => { toasts.push({ text, f: g.frame }); toast(text, dur); };
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
  // walk toward a column, hopping the ripples and berms when blocked
  const run = (dir) => {
    const p = g.player;
    if (p.grounded && Math.abs(p.vx) < 30 && jt === 0 && p.state !== 'hide') jt = 18;
    const h = dir > 0 ? { right: true } : dir < 0 ? { left: true } : {};
    if (jt > 0) { jt--; h.jump = jt > 2; }
    step(h);
  };
  const runTo = (x, max = 900) => { for (let i = 0; i < max && Math.abs(g.player.cx - x * T) > 6; i++) run(Math.sign(x * T - g.player.cx)); jt = 0; step({}, 3); };
  const until = (cond, max, fn = () => step({})) => { for (let i = 0; i < max; i++) { if (cond()) return true; fn(); } return cond(); };
  const hide = () => until(() => g.player.state === 'hide', 40, () => { step({ enter: true }); step({}); });
  return { g, p: g.player, b: () => g.boss, ev, toasts, step, run, runTo, until, hide, lost: () => g.rs('tank-sand').taken.has(SLEPT) };
}
const count = (ev, t, since = -1, pred = () => true) => ev.filter((e) => e.t === t && e.f > since && pred(e.d)).length;
const roar = (d) => d.name === 'gecko-growl' && d.rate === 0.7;

for (const gentle of [false, true]) {
  const M = gentle ? 'gentle' : 'normal';

  section(`never hide (${M})`, () => {
    const s = sandGame(gentle), { g, p } = s;
    s.runTo(40);
    let maxX = 0, f0 = g.frame, mid = 0;
    // 60 s of dodging back and forth (never Up): she keeps hunting
    for (let i = 0; i < 60 * FPS; i++) {
      const phase = Math.floor(i / 150) % 4;
      s.run(phase === 0 ? 1 : phase === 2 ? -1 : 0);
      maxX = Math.max(maxX, p.x + p.w);
      if (i === 40 * FPS) mid = s.b().lunges;
    }
    ok(g.room.id === 'tank-sand', `${M}: still in the sand room after 60 s (${g.room.id})`);
    ok(p.health === p.maxHealth, `${M}: health unchanged (${p.health})`);
    ok(count(s.ev, 'hurt', f0) === 0, `${M}: no 'hurt' event`);
    ok(s.b().lunges > mid && mid > 3, `${M}: lunges still coming in the last 20 s (${mid} -> ${s.b().lunges})`);
    ok(!s.lost() && maxX <= 60 * T + 0.01, `${M}: the exit stays shut (furthest ${(maxX / T).toFixed(2)} tiles)`);
    ok(count(s.ev, 'dazed') === 0, `${M}: no daze (the earplugs toast)`);
  });

  section(`caught standing still (${M})`, () => {
    const s = sandGame(gentle), { g, p } = s;
    s.runTo(26);
    ok(s.until(() => s.b().mode === 'tell', 600), `${M}: she tells`);
    const f0 = g.frame, x0 = p.cx;
    let caughtAt = null, lock = 0;
    s.until(() => caughtAt != null, 200, () => { s.step({}); if (caughtAt == null && count(s.ev, 'sfx', f0, roar)) { caughtAt = g.frame; lock = p.lock; } });
    ok(caughtAt != null, `${M}: standing still through the tell gets him caught (a roar)`);
    ok(lock >= 25 && lock <= 30, `${M}: the skitter takes control for about half a second (lock ${lock})`);
    s.step({}, 40);
    ok(p.cx > x0 + 1.5 * T, `${M}: skittered right, the way she faces (${(x0 / T).toFixed(1)} -> ${(p.cx / T).toFixed(1)})`);
    ok(p.health === p.maxHealth && count(s.ev, 'hurt') === 0 && p.invuln === 0, `${M}: no damage, no hurt, no invulnerability flash`);
    ok(g.toasts.some((t) => t.text === TK.caughtFirst), `${M}: the first catch's toast`);
  });

  section(`walk into her snout (${M})`, () => {
    const s = sandGame(gentle), { g, p } = s;
    s.runTo(30);
    s.until(() => s.b().mode === 'stalk', 400);
    const b = s.b();
    b.cool = 9999; // she won't tell: he walks into her
    s.until(() => b.mode === 'stalk' && b.pose === 'idle', 400);
    const f0 = g.frame;
    s.until(() => count(s.ev, 'sfx', f0, roar) > 0, 200, () => s.step({ left: true }));
    ok(count(s.ev, 'sfx', f0, roar) > 0, `${M}: walking into her snout is a catch`);
    s.step({}, 2);
    ok(p.vx > 100, `${M}: he skitters right (vx ${p.vx.toFixed(0)})`);
    ok(g.toasts.some((t) => t.text === TK.caughtWalk), `${M}: "${TK.caughtWalk}"`);
    ok(p.health === p.maxHealth && count(s.ev, 'hurt') === 0, `${M}: no damage`);
  });

  section(`jump over her (${M})`, () => {
    const s = sandGame(gentle), { g, p } = s;
    s.runTo(22);
    s.until(() => s.b().mode === 'stalk', 400);
    s.b().cool = 9999;
    s.until(() => s.b().pose === 'idle', 400);
    // back over her head to the left, then stand at the far left while she hunts
    let left = false;
    for (let i = 0; i < 300; i++) {
      s.step({ left: true, jump: i % 30 < 18 });
      if (g.room.id !== 'tank-sand') { left = true; break; }
      if (p.cx < s.b().x - 2.5 * T) break;
    }
    s.until(() => p.state === 'ground', 60);
    s.runTo(5.5);
    ok(p.cx < s.b().x - T, `${M}: he got over her to the left (Pip ${(p.cx / T).toFixed(1)}, her ${(s.b().x / T).toFixed(1)})`);
    s.b().cool = 0;
    const f0 = g.frame;
    for (let i = 0; i < 900 && !left; i++) { s.step({}); if (g.room.id !== 'tank-sand') left = true; }
    ok(!left && g.room.id === 'tank-sand', `${M}: jumping over her never leaves tank-sand`);
    ok(s.b().x >= 8 * T - 0.01, `${M}: she never goes left of tile 8 (${(s.b().x / T).toFixed(2)})`);
    ok(count(s.ev, 'sfx', f0, roar) > 0 && p.x >= 1.5 * T - 0.01, `${M}: caught at the far left, the skitter keeps him in the room (x ${(p.x / T).toFixed(2)})`);
    ok(p.health === p.maxHealth, `${M}: no damage`);
  });

  section(`hide before her first lunge (${M})`, () => {
    const s = sandGame(gentle), { g, p } = s;
    s.runTo(58.5, 1200);
    ok(s.b().lunges === 0, `${M}: at the log before she has lunged`);
    ok(s.hide(), `${M}: hidden in the log`);
    const f0 = g.frame;
    ok(s.until(() => s.b().mode === 'logTell', 600), `${M}: she comes and tells at the log`);
    ok(count(s.ev, 'tell', f0) === 1 && p.state === 'hide', `${M}: a tell at the log, Pip still hidden`);
    ok(s.until(() => count(s.ev, 'crumble', f0) > 0, 200), `${M}: she lunges into the log (bark chips)`);
    ok(count(s.ev, 'sfx', f0, (d) => d.name === 'bonk') > 0, `${M}: a thunk`);
    ok(s.until(() => s.lost(), 400), `${M}: she sniffs, shrugs: the exit opens`);
    ok(g.toasts.some((t) => t.text === TK.lost), `${M}: "${TK.lost}"`);
    ok(p.health === p.maxHealth && count(s.ev, 'hurt') === 0, `${M}: no damage`);
  });

  section(`seen leaving during the sniff (${M})`, () => {
    const s = sandGame(gentle), { g, p } = s;
    s.runTo(52);
    s.until(() => s.b().lunges > 0 && s.b().mode !== 'lunge', 900);
    s.runTo(58.5); s.hide();
    ok(s.until(() => s.b().mode === 'sniff' && s.b().t > 10, 600), `${M}: she sniffs at the log`);
    s.step({ right: true }, 20);
    ok(p.state === 'hide' && s.b().mode === 'sniff', `${M}: Right doesn't leave the log while she sniffs (stick drift)`);
    const f0 = g.frame;
    s.step({ jump: true }, 2); s.step({}, 1);
    ok(s.b().mode === 'recoil' && count(s.ev, 'sfx', f0, roar) === 1, `${M}: Jump out while she sniffs: seen (a roar, a recoil)`);
    ok(Math.abs(p.vx) < 100 && p.lock === 0, `${M}: no skitter`);
    // the grace period: no catch while she recoils, even standing in front of her
    const f1 = g.frame;
    s.step({}, 80);
    ok(count(s.ev, 'sfx', f1, roar) === 0 && !s.lost(), `${M}: a grace period, the exit still shut`);
    ok(s.until(() => s.b().mode === 'stalk' || s.b().mode === 'tell', 60), `${M}: then she hunts on`);
    ok(p.health === p.maxHealth, `${M}: no damage`);
  });

  section(`chirp from the log (${M})`, () => {
    const s = sandGame(gentle), { g, p } = s;
    s.runTo(52);
    s.until(() => s.b().lunges > 0 && s.b().mode !== 'lunge', 900);
    s.runTo(58.5); s.hide();
    s.until(() => s.b().mode === 'sniff' && s.b().t > 10, 600);
    const f0 = g.frame;
    s.step({ chirp: true }); s.step({});
    ok(s.b().mode === 'recoil' && count(s.ev, 'sfx', f0, roar) === 1 && p.state === 'hide', `${M}: a Chirp from inside gives him away`);
    ok(s.until(() => s.lost(), 600), `${M}: still hidden, she comes back and sniffs, then loses him`);
  });

  section(`hide through the sniff, out and back (${M})`, () => {
    const s = sandGame(gentle), { g, p } = s;
    s.runTo(52);
    s.until(() => s.b().lunges > 0 && s.b().mode !== 'lunge', 900);
    s.runTo(58.5); s.hide();
    ok(s.until(() => s.lost(), 700), `${M}: hidden through the sniff: the exit opens`);
    ok(p.state === 'hide', `${M}: still hidden when it opens`);
    s.step({ right: true }, 2);
    ok(p.state !== 'hide', `${M}: after she turns away, Right leaves the log`);
    ok(s.until(() => g.room.id === 'tank-decor', 300, () => s.step({ right: true })), `${M}: on to the decor`);
    s.step({}, 30);
    ok(s.until(() => g.room.id === 'tank-sand', 300, () => s.step({ left: true })), `${M}: back to the sand`);
    const f0 = g.frame;
    ok(s.b().mode === 'nap' && s.b().pose === 'sleep', `${M}: she's asleep (${s.b().mode})`);
    s.runTo(20, 1200); s.step({}, 300);
    ok(s.b().mode === 'nap', `${M}: and stays asleep with him past the ripple`);
    ok(count(s.ev, 'sfx', f0, (d) => /gecko/.test(d.name)) === 0 && count(s.ev, 'tell', f0) === 0, `${M}: quiet (no growl, snore or tell)`);
    ok(!g.toasts.some((t) => t.f > f0 && TK.duchessWakes.includes(t.text)), `${M}: no wake line`);
    s.runTo(59.5, 1200);
    ok(s.until(() => g.room.id === 'tank-decor', 200, () => s.step({ right: true })), `${M}: the exit stays open`);
  });
}

for (const gentle of [false, true]) {
  const M = gentle ? 'gentle' : 'normal';
  // [review] no safe spots: standing still anywhere on the sand floor (a ripple under her middle, a few
  // tiles past a berm face) she tells and catches him
  for (const x of [22, 35, 44.5, 53]) section(`no safe spot at ${x} (${M})`, () => {
    const s = sandGame(gentle), { g, p } = s;
    s.runTo(x, 1200);
    const f0 = g.frame;
    s.until(() => count(s.ev, 'sfx', f0, roar) > 0, 1500);
    ok(count(s.ev, 'tell', f0) > 0, `${M}: standing at ${x}, she tells (Pip at ${(p.cx / T).toFixed(1)})`);
    ok(count(s.ev, 'sfx', f0, roar) > 0, `${M}: standing still at ${x}, he gets caught (her lunges ${s.b().lunges})`);
  });

  section(`caught past the log (${M})`, () => {
    const s = sandGame(gentle), { g, p } = s;
    s.runTo(59.3, 1200);
    const f0 = g.frame;
    s.until(() => s.b().catches >= 3, 2400);
    ok(s.b().catches >= 3, `${M}: caught by the exit (${s.b().catches} catches)`);
    const said = s.toasts.filter((t) => t.f > f0).map((t) => t.text);
    ok(p.cx > 59 * T && !said.includes(TK.caughtLog), `${M}: never "${TK.caughtLog}" past the log (${said.join(' / ')})`);
    ok(said.includes(TK.caughtLogBack), `${M}: "${TK.caughtLogBack}" points back to it`);
  });
}

section('gentle tell', () => {
  const tellOf = (gentle) => { const s = sandGame(gentle); s.runTo(26); s.until(() => s.b().mode === 'tell', 600); const e = s.ev.find((x) => x.t === 'tell'); const f = s.g.frame; s.until(() => s.b().mode !== 'tell', 300); return { frames: e?.d.frames, held: s.g.frame - f }; };
  const n = tellOf(false), gm = tellOf(true);
  ok(n.frames === Math.round(TELL.normal * FPS) && gm.frames === Math.round(TELL.gentle * FPS), `the tell event's frames (normal ${n.frames}, gentle ${gm.frames})`);
  ok(gm.held > n.held, `Gentle Mode's tell is longer (waits ${gm.held} vs ${n.held} frames)`);
});

console.log(`tank-test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
