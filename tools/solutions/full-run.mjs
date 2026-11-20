#!/usr/bin/env node
// [playtest] The whole game in one run, from the title to the credits and back to the Carrier,
// with real keys: design/solutions/full-run.json.
//
// Two parts:
//  1. The gameplay is authored headless as ONE continuous game (RunAuthor in tools/author.mjs:
//     the Carrier's rooms included, the browser's modals modelled): the recorded zone solutions
//     are pressed on their own frames (play), the walking between zones is authored here, and
//     every modal (Ready? cards, rescue cards, the Carrier, save cracks) gets a planned action.
//  2. The browser (BrowserAuthor) plays the title, New Game, the opening panels, then the chain
//     on the same game frames, doing each modal's action with real keys (and checking it happens
//     on the same frame, landing where the headless game did), then the ending, the credits and
//     "Thank you", back to the Carrier. Every key is recorded with its step number.
//
//   node tools/solutions/full-run.mjs [--headless] [--to <chapter>] [--url http://127.0.0.1:8173/]
// Needs the server for the browser part: python3 .../serve.py 8173 game
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RunAuthor, BrowserAuthor } from '../author.mjs';
import { R, L, U, D, J, KICK, CHIRP, T, walkTo, jumpTo, travel, climb, ground } from './nav.mjs';
import * as ZB from './zones-b.mjs';
import { ENTER_WAIT } from '../../game/src/input.js';
// [issue #27] Enter: a ↓ tap; it fires ENTER_WAIT samples after the press (the door, card or crack opens then)
const enter = (a) => a.tap(D, 1).wait(ENTER_WAIT);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const TO = opt('--to', null);
const sol = (name) => JSON.parse(readFileSync(path.join(root, 'design', 'solutions', name + '.json'), 'utf8'));
const tile = (g) => ({ x: g.player.cx / T, y: (g.player.y + g.player.h) / T });
const metaOf = () => a.g.meta || {};

// ------------------------------------------------------------------ 1. the headless chain
// It starts where New Game's opening ends: the Bedroom's start (bed-carrier, its P marker).
const a = new RunAuthor({ room: 'bed-carrier', items: [], party: ['pip'] });
// [fullrun] the browser's game frame when the Bedroom starts (after the opening and the tank): some bosses read the
// absolute game.frame (gargy.js phase 1 sways with sin(frame / 90)), so the model starts on the same frame
const G0 = +opt('--g0', 2841); // [issue 25] was 3123 (#7's hunt): the chase and the log escape made the tank shorter
a.g.frame = G0; if (a.sim.meta) a.sim.meta.lastFx = G0;
a.verbose = true;
const chapters = [];
const chapter = (name, fn) => chapters.push([name, fn]);
// stand still (on the ground, not moving)
const settle = () => a.until((g) => g.player.state === 'ground' && Math.abs(g.player.vx) < 1, 120, 'standing');
// walk into a box (room px of the player's x) and stand
const walkInto = (x0, x1, max = 600) => {
  const k = a.p.x < x0 ? R : L;
  a.down(k).until((g) => g.player.x >= x0 && g.player.x <= x1, max, `x in ${x0}..${x1}`).up(k);
  return settle();
};

// play a recorded solution from here; check it ends where it was recorded (room, within 2 px)
const playChecked = (name, o = {}) => {
  const s = sol(name);
  a.play(s, o);
  if (o.cut == null) {
    const e = s.endState, p = a.g.snapshot();
    const ok = p.room === e.room && Math.abs(p.pos.x - e.x) < 2 && Math.abs(p.pos.y - e.y) < 2 && (!e.levelComplete || p.levelComplete);
    if (!ok) throw new Error(`${name} drifted: want ${e.room} ${e.x},${e.y} lc ${e.levelComplete}; got ${p.room} ${p.pos.x.toFixed(1)},${p.pos.y.toFixed(1)} lc ${p.levelComplete}`);
  }
  return a;
};
// the first frame (solution frames) where the player stands in a box in a room
const firstAt = (name, room, x0, x1, row) => {
  const s = sol(name), sim = new RunAuthor(s.start).sim;
  let hit = null;
  sim.run(s.events, s.frames, (f, g) => { const p = g.player; if (hit == null && g.room.id === room && p.x >= x0 && p.x <= x1 && p.state === 'ground' && Math.round((p.y + p.h) / T) === row) hit = f + 1; });
  if (hit == null) throw new Error(`${name} never stands in ${room} ${x0}..${x1} row ${row}`);
  return hit;
};

// a save crack: walk to it, Up, "Go to the Carrier", then the Carrier's crack: (Change trio,) "Back to"
// the crack. Leaving the Carrier restarts the room at the crack: an exact start for what follows.
const viaCarrier = (tx, trio, after = 3) => {
  walkTo(a, tx + 0.5); settle();
  a.plan('save', 'carrier').tap(D, 1);
  a.until((g) => g.inCarrier, 60, 'in the Carrier').wait(20);
  if (trio) a.plan('hubcrack', 'trio+back', trio); else a.plan('hubcrack', 'back');
  enter(a).until((g) => !g.inCarrier, 10, 'back from the Carrier').wait(after);
  return a.log(`back at the crack (${a.g.room.id})`);
};
// walk to a recorded solution's start marker (to the pixel, as near as taps get)
const toStart = (name) => {
  const s = sol(name), P = new RunAuthor(s.start).p;
  walkTo(a, P.cx / T); settle();   // no dawdling: the room's critters are already on their way
  return a.log(`at ${name}'s start`);
};

chapter('bedroom', () => {
  a.play(sol('zone-01-path'), { cut: 3541 });
  walkInto(2085, 2120);
  enter(a);                       // Duchess's door: the Ready? card, Enter (into bed-lair)
  a.plan('complete', 'carrier');     // "Stripe is safe!": Return to the Carrier ([polish-T] planned first: the card opens as her lines close, inside the solution)
  a.play(sol('zone-01-boss'));       // ends on the rescue (her lines)
  a.until((g) => g.inCarrier, 120, 'the Carrier').wait(20);
  a.plan('hubcrack', 'back');
  enter(a);                       // the crack in the corner: Back to the Bedroom
});

chapter('to-bathroom', () => {
  a.until((g) => !g.inCarrier, 10, 'back').wait(10).log('back at the bed-dresser crack');
  // [fullrun] "Return to the Carrier" now comes back to the lair's save crack (bed-dresser): in by Duchess's door again
  walkInto(2085, 2120);
  enter(a);                       // a won lair's door goes straight in (no Ready? card, no lines)
  a.wait(10).log('in bed-lair');
  // off the middle block, up the leaves by the glass wall, over it, out to the Hall
  travel(a, 1, (g) => g.player.cx > 54.5 * T && g.player.state === 'ground', 900, 'under the leaves');
  walkTo(a, 55); climb(a, [[55, 14], [51.5, 13], [55.5, 11, { from: 52.6 }], [51.5, 9, { from: 55.4 }], [55.5, 7, { from: 52.6 }]]);
  walkTo(a, 57);
  a.down(R).tap(J, 18).until(ground, 120, 'past the glass').log('past the glass');
  travel(a, 1, (g) => g.room.id === 'hall-top' && g.player.cx > 8.5 * T, 600, 'to the Hall');
  a.until((g) => g.room.id === 'hall-floor' && g.player.state === 'ground', 300, 'down the Hall').log('hall floor');
  travel(a, 1, (g) => g.room.id === 'bath-door', 900, 'to the Bathroom');
  viaCarrier(16);
});

chapter('bathroom', () => {
  toStart('zone-02-path');
  const cut = firstAt('zone-02-path', 'bath-sink', 28 * T - 25, 30 * T - 2, 34);
  playChecked('zone-02-path', { cut });
  settle();
  enter(a);                         // Chikchak's door: Ready?, Enter
  playChecked('zone-02-boss');
});

// ---- Builder D's adaptive helpers (tools/solutions/zone-d.mjs) ----
const tx = (g) => g.player.cx / T, ty = (g) => (g.player.y + g.player.h) / T;
const hopUp = (top, max = 12) => { for (let i = 0; i < max && ty(a.g) > top + 0.1; i++) a.tap(J, 16).until(ground, 90, 'hop landed').wait(2); return a; };
const grab = (max = 60, label = 'grab') => { for (let i = 0; i < max / 2 && a.p.state !== 'swing'; i++) a.tap('KeyV', 1).wait(1); if (a.p.state !== 'swing') throw new Error(`${label}: no hook ${JSON.stringify(a.state())}`); return a; };
const swingFling = (dir, ang = 0.7, label = 'fling', minW = 0) => {
  a.down(dir === 1 ? R : L);
  if (minW < 0) a.until((g) => { const s = g.player.swing; return s && Math.abs(s.ang) < 0.15; }, 300, `${label}: bottom`);
  a.until((g) => { const s = g.player.swing; return g.player.state === 'swing' && s && Math.sign(s.w) === dir && s.ang * dir > ang && Math.abs(s.w) >= Math.abs(minW); }, 400, label);
  return a.tap(J, 4);
};

chapter('to-kitchen', () => {
  a.until((g) => !a.sim.meta.pendingCard, 120, 'the card').log('card closed');   // "Katy is safe!": Not now
  // off the glass ledge, under it, out to the stairwell landing
  a.down(L).until((g) => tx(g) < 56, 120, 'off the ledge').up(L).until(ground, 120, 'floor');
  travel(a, 1, (g) => g.room.id === 'stair-landing' && tx(g) > 3, 600, 'to the landing').log('landing');
  // link-stairs (zone-d.mjs): over the baby gate with the Floss, down both flights
  a.down(R).until((g) => tx(g) > 9.4, 200, 'at the bookcase').up(R).log('bookcase');
  hopUp(24).log('top shelf');
  a.down(R).until((g) => tx(g) > 13.4, 60, 'shelf end').up(R).wait(2).tap(J, 16).wait(4);
  grab(60, 'H1').log('H1');
  swingFling(1, 0.75, 'fling to H2').wait(4);
  grab(60, 'H2').log('H2');
  swingFling(1, 0.75, 'fling to the post').until(ground, 90, 'landed past the gate').log('past the gate')
    .until((g) => tx(g) > 27.5, 200, 'ledge').log('picture ledge');
  a.until((g) => g.room.id === 'stair-flight' && ground(g), 300, 'on flight A').log('flight A')
    .until((g) => g.room.id === 'stair-flight' && tx(g) > 55.2, 600, 'end of flight A').up(R).log('turn').wait(4)
    .down(L).until((g) => g.room.id === 'stair-foot' && ground(g) && ty(g) > 33.9, 1200, 'the foot').up(L).log('foot');
  travel(a, -1, (g) => g.room.id === 'kit-fridge', 900, 'to the Kitchen').log('kitchen');
  viaCarrier(57);
});

chapter('kitchen', () => {
  toStart('zone-03-path');
  const cut = firstAt('zone-03-path', 'kit-counter', 2 * T - 29, 4 * T - 1, 16);
  playChecked('zone-03-path', { cut });
  settle();
  enter(a);                         // Big Tok's door: Ready?, Enter
  playChecked('zone-03-boss');
});

// travel that chirps when a fruit-fly cloud is in the way
const travelChirp = (dir, cond, max = 900, label = 'travel') => {
  const key = dir > 0 ? R : L;
  for (let i = 0; i < max; i += 10) {
    if (cond(a.g)) return a;
    const fly = a.g.enemies.find((e) => e.type === 'fruitflies' && !['gone'].includes(e.state) && Math.abs(e.x + e.w / 2 - a.p.cx) < 150 && Math.abs(e.y + e.h / 2 - a.p.cy) < 120);
    if (fly && a.p.grounded) { a.up(key); a.tap(CHIRP, 3).wait(6); }
    travel(a, dir, (g) => cond(g) || g.enemies.some((e) => e.type === 'fruitflies' && Math.abs(e.x + e.w / 2 - g.player.cx) < 150 && Math.abs(e.y + e.h / 2 - g.player.cy) < 120 && !e.goneT), 10, label);
  }
  throw new Error(`${label}: ${JSON.stringify(a.state())}`);
};

chapter('to-pantry', () => {
  a.until((g) => !a.sim.meta.pendingCard, 120, 'the card').log('card closed');   // "Duo is safe!": Not now
  // up onto the ledge by the window, out to the sill, down to the table
  walkTo(a, 7.6); jumpTo(a, 4, 8);
  travel(a, -1, (g) => g.room.id === 'kit-window', 300, 'to the sill').log('sill');
  travel(a, -1, (g) => g.room.id === 'kit-window' && tx(g) < 83.5, 300, 'ledge end');
  a.until(ground, 120, 'down');
  travel(a, -1, (g) => g.room.id === 'kit-table', 1500, 'to the table').log('table');
  a.until(ground, 300, 'on the table');
  travel(a, -1, (g) => g.room.id === 'kit-table' && ty(g) > 33.5 && ground(g), 900, 'to the floor').log('floor');
  travel(a, -1, (g) => g.room.id === 'kit-pantrydoor', 600, 'to the back door').log('back door');
  a.down(L).until((g) => tx(g) < 26.5, 600, 'spill edge').tap(J, 16).until(ground, 90, 'over the stair head').up(L).log('over the hole');
  travel(a, -1, (g) => g.room.id === 'pan-door', 900, 'to the Pantry').log('pantry');
  viaCarrier(22, ['duo', 'stripe', 'katy']);
});

chapter('pantry', () => {
  ZB.pantryPath(a);
  // through the doorway (the Ready? card: Enter, his lines), to where his fight starts
  travel(a, -1, (g) => g.room.id === 'pan-lair' && tx(g) < 61.8 && ground(g), 300, 'into the lair');
  settle().log('in the lair');
  a.g.levelComplete = false;   // the fight scripts wait for it; nothing in the game reads it (authoring only)
  ZB.lashesFight(a);
  a.until((g) => g.rescued.has('frost'), 10, 'Frost is free').log('Frost is free');
});

// swap to the next/previous cricket in the trio (waits for the swap to happen on the ground)
const swapTo = (id) => {
  for (let i = 0; i < 3 && a.p.id !== id; i++) { a.tap('KeyE', 2); a.until((g) => g.player.queuedSwap == null && ground(g), 120, 'swap'); a.wait(4); }
  if (a.p.id !== id) throw new Error(`no ${id} in the trio ${a.p.trio}`);
  return a.log(`now ${id}`);
};
const dropThrough = () => { a.down(D).tap(J, 3).up(D); return a.wait(4); };

// zones-b.mjs sneak, mirrored for going right: hide spot to hide spot until the leg ahead is clear
const sneakRight = (spots, exitX) => {
  const beetles = (g) => g.enemies.filter((e) => e.type === 'beetle');
  const clear = (g, x0, x1) => beetles(g).every((e) => {
    const bx = -(e.x + e.w / 2) / T, d = -e.dir, X0 = -x0, X1 = -x1, t = Math.abs(X0 - X1) / 5 + 0.8, reach = 1.25 * t + 2.2;
    if (bx > X0 + 2) return d > 0 || bx - reach > X0 + 1.5;
    if (bx < X1 - 2 && d < 0) return true;
    return d > 0 ? bx + reach < X1 - 0.5 : false;
  });
  let here = tx(a.g);
  for (const to of [...spots, exitX]) {
    if (!clear(a.g, here, to)) {
      a.tap(D, 3).until((g) => g.player.hidden, 30, 'hide at ' + here).log('hide ' + here.toFixed(1));
      a.until((g) => clear(g, here, to), 1500, 'clear to ' + to);
    }
    walkTo(a, to).log('spot ' + to);
    here = to;
  }
  return a;
};
chapter('pantry-to-laundry', () => {
  a.until((g) => !a.sim.meta.pendingCard, 120, 'the card').log('card closed');   // "Frost is safe!": Not now
  swapTo('stripe');
  // out of the lair, up the rungs beside the upright to shelf D
  travel(a, 1, (g) => g.room.id === 'pan-shelves' && tx(g) > 19.5, 900, 'to the rungs').log('rungs');
  walkTo(a, 19.8);
  for (let i = 0; i < 8 && ty(a.g) > 6.2; i++) a.tap(J, 20).until(ground, 90, 'rung').wait(3);
  a.down(J).wait(8).down(R).wait(20).up(J).until(ground, 90, 'shelf D').up(R).log('shelf D');
  // over to the alcove, down through it to shelf B, over the pins, down the shaft
  travel(a, 1, (g) => tx(g) > 46.5 && ground(g) && ty(g) > 10.5, 600, 'alcove floor').log('alcove');
  walkTo(a, 48.5); dropThrough(); a.until(ground, 90, 'bracket'); dropThrough(); a.until((g) => ground(g) && ty(g) > 14.5, 120, 'shelf B').log('shelf B');
  a.down(L).until((g) => tx(g) < 37.6, 300, 'pin gap').tap(J, 20).until(ground, 90, 'over the pins').up(L).log('over the pins');
  a.down(L).until((g) => tx(g) < 24.2, 300, 'the shaft').up(L).until((g) => ground(g) && ty(g) > 25, 200, 'down the shaft').log('bottom passage');
  a.down(L).until((g) => g.room.id === 'pan-floor', 400, 'down to the floor').up(L).until(ground, 200, 'landed').log('pan-floor');
  // down the crates to the corridor, then beetle-sneak right (zones-b.mjs sneak, mirrored)
  for (const x of [7, 10, 12.4, 14.7]) { walkTo(a, x); a.until(ground, 120, 'crate ' + x); }
  a.log('corridor');
  if (ty(a.g) < 15.5) throw new Error('not in the corridor ' + JSON.stringify(a.state()));
  sneakRight([16.5, 26.5, 38, 47.5, 58.5], 62.5);
  travel(a, 1, (g) => g.room.id === 'pan-door', 300, 'to the door').log('pan-door');
  travel(a, 1, (g) => g.room.id === 'kit-pantrydoor', 600, 'to the back door').log('back door');
  a.down(R).until((g) => tx(g) > 17.4, 300, 'spill edge').tap(J, 16).until(ground, 90, 'over the stair head').up(R);
  a.down(L).until((g) => tx(g) < 19.4, 120, 'into the hole').up(L).until(ground, 120, 'top rung').log('top rung');
  for (let i = 0; i < 6 && a.g.room.id !== 'laun-stairs' || (a.g.room.id === 'laun-stairs' && ty(a.g) < 7.5 && i < 6); i++) { dropThrough(); a.until(ground, 120, 'rung'); }
  a.log('laundry stairs');
  walkTo(a, 17.6); a.until(ground, 120, 'down the steps');
  travel(a, -1, (g) => tx(g) < 12.4 && ground(g) && ty(g) > 15.5, 600, 'to the crack');
  swapTo('duo');
  viaCarrier(11, null);
});

chapter('laundry', () => {
  toStart('zone-05-path');
  playChecked('zone-05-path');
  travel(a, 1, (g) => g.room.id === 'laun-lair' && tx(g) > 4 && ground(g), 300, 'into the lair');
  settle().log('in the lair');
  a.g.levelComplete = false;   // the fight scripts wait for it; nothing in the game reads it (authoring only)
  ZB.peridotFight(a);
  a.until((g) => g.rescued.has('hump'), 600, 'Hump is free').log('Hump is free');
});

chapter('laundry-to-kitchen', () => {
  a.until((g) => !a.sim.meta.pendingCard, 120, 'the card').log('card closed');   // "Hump is safe!": Not now
  // ride the first updraft up (gliding) onto the door ledge, then the hose back to the stair head
  travel(a, -1, (g) => tx(g) < 13, 900, 'to the first updraft');
  a.down(L).tap(J, 3).wait(6).down(J).until((g) => tx(g) < 10.4, 120, 'in the updraft').up(L);
  a.until((g) => ty(g) < 8.5, 200, 'lifted').down(L).until((g) => tx(g) < 5 || ground(g), 200, 'over the ledge').up(L).up(J).until(ground, 120, 'landed').log('door ledge');
  if (ty(a.g) > 10.5) throw new Error('not on the door ledge ' + JSON.stringify(a.state()));
  walkTo(a, 3.5); settle(); a.tap(D, 2); a.until((g) => g.room.id === 'laun-stairs', 30, 'up the hose').wait(5).log('stair head');
  travel(a, -1, (g) => tx(g) < 20.3 && ground(g), 900, 'to the ladder');
  walkTo(a, 19.8);
  for (let i = 0; i < 8 && a.g.room.id === 'laun-stairs'; i++) a.tap(J, 20).until((g) => ground(g) || g.room.id !== 'laun-stairs', 120, 'rung').wait(3);
  a.until(ground, 120, 'top rung');
  a.down(J).until((g) => g.player.y + g.player.h < 34 * T - 2 || g.player.vy > 0, 60, 'rising').down(L).wait(25).up(J).until(ground, 90, 'out of the hole').up(L).log('kitchen');
  if (a.g.room.id !== 'kit-pantrydoor' || ty(a.g) > 34.5) throw new Error('not out of the hole ' + JSON.stringify(a.state()));
});

// travel, but chirp-stun a cockroach in the way first (kicks only work on a stunned one)
const travelRoach = (dir, cond, max = 1500, label = 'travel') => {
  const roach = (g) => g.enemies.find((e) => e.type === 'cockroach' && !e.stun && !['flipped', 'scurry', 'gone', 'fly'].includes(e.state) && Math.abs(e.y + e.h / 2 - g.player.cy) < 60 && (e.x + e.w / 2 - g.player.cx) * dir > -10 && Math.abs(e.x + e.w / 2 - g.player.cx) < 150);
  const f0 = a.f;
  while (a.f - f0 < max) {
    if (cond(a.g)) return a;
    if (roach(a.g) && a.p.grounded) { a.tap(CHIRP, 3).wait(6); continue; }
    try { travel(a, dir, (g) => cond(g) || (roach(g) && g.player.grounded), 90, label); } catch { for (const c of [...a.held]) a.up(c); }
  }
  throw new Error(`${label}: ${JSON.stringify(a.state())}`);
};
chapter('kitchen-to-living', () => {
  // over the stair head and out to the table room; beetle-sneak to the dishwasher; up its rungs and over
  a.down(R).tap(J, 16).until(ground, 90, 'over the hole').up(R);
  travel(a, 1, (g) => g.room.id === 'kit-table' && tx(g) > 2, 900, 'to the table room').log('table room');
  sneakRight([8, 18, 28, 38, 46, 54, 64, 72], 77.5);
  hopUp(18.05, 12).log('dishwasher rungs');
  travel(a, 1, (g) => g.room.id === 'kit-undersink', 600, 'over the dishwasher').log('under the sink');
  travelRoach(1, (g) => g.room.id === 'kit-stove', 1500, 'to the stove'); a.log('stove');
  // the stove's right-hand ladder up to the fridge door
  travelRoach(1, (g) => tx(g) > 56.5 && ground(g), 1200, 'to the ladder');
  climb(a, [[57.5, 32], [53.5, 30], [57.5, 28], [53.5, 26], [57.5, 24], [53.5, 22], [57.5, 20], [53.5, 18], [57.5, 16, { from: 55.3, delay: 5 }]]).log('fridge door');
  travel(a, 1, (g) => g.room.id === 'kit-fridge', 300, 'to the fridge').log('fridge');
  // down the fridge's side shaft (rungs) to the floor, out to the foot of the stairs
  a.down(R).until((g) => tx(g) > 12.6, 200, 'off the ledge').up(R).until(ground, 200, 'rung');
  for (let i = 0; i < 24 && ty(a.g) < 49.5; i++) { dropThrough(); a.until(ground, 200, 'rung'); }
  if (tx(a.g) < 15.5) { walkTo(a, 14.4); a.down(R).tap(J, 8).until(ground, 90, 'past the glass').up(R); } // off the spill (raft), a low hop over the glass onto the rung
  for (let i = 0; i < 4 && ty(a.g) < 51.5; i++) { a.wait(6); dropThrough(); a.until(ground, 200, 'floor'); }
  if (ty(a.g) < 51.5) throw new Error('not on the fridge floor ' + JSON.stringify(a.state()));
  a.log('fridge floor');
  travel(a, 1, (g) => g.room.id === 'stair-foot' && tx(g) > 29.5, 1500, 'to the stair foot').log('stair foot');
  // save at the stair-foot crack: after the Living Room, "Return to the Carrier" comes back here
  walkTo(a, 30.5); settle(); a.plan('save', 'close').tap(D, 1).wait(2);
  travel(a, 1, (g) => tx(g) > 59.5, 900, 'to the doorway'); walkTo(a, 60.5); settle();
});

chapter('living', () => {
  ZB.livingPathBand(a);
  // the lair door: the Ready? trigger is just inside liv-lair
  travel(a, 1, (g) => g.room.id === 'liv-lair' && tx(g) > 5 && ground(g), 300, 'into the lair');
  settle().log('in the lair');
  a.g.levelComplete = false;   // the fight script waits for it; nothing in the game reads it (authoring only)
  ZB.gargyFight(a);
  a.until((g) => g.rescued.has('jam'), 600, 'Jam is free').log('Jam is free');
  // [fullrun] "Return to the Carrier" now comes back to the lair's crack (liv-rug), not the stair foot's:
  // "Jam is safe!": Not now; back out over the rug and the armchair to the stair foot, its crack, the Carrier
  a.until((g) => !a.sim.meta.pendingCard, 200, 'the card').log('card closed');
  const hp0 = a.p.health;
  travel(a, -1, (g) => g.room.id === 'liv-rug' && tx(g) < 62.5 && ground(g), 600, 'out of the lair').log('liv-rug');
  const vac = (g) => g.enemies.find((e) => e.type === 'vacuum');
  const bun = (g) => g.enemies.find((e) => e.type === 'dustbunny' && e.state === 'walk');
  const passed = (g) => vac(g).x > g.player.x + g.player.w + 10;   // behind us: it is slower than a cricket
  const legOk = (g, s) => {   // the vacuum can't meet us on the way to column s
    if (passed(g)) return true;
    const v = vac(g), vr = (v.x + v.w) / T, t = (tx(g) - s) / 4 + 0.5;
    return v.dir < 0 ? vr < s - 1 : vr + 1.5 * t + 1 < s - 1;
  };
  a.until((g) => legOk(g, 50.5), 3000, 'the vacuum away').log('go');
  // the dust bunny: jump it, pound it apart
  a.down(L).until((g) => tx(g) < 52 || (bun(g) && g.player.x - (bun(g).x + bun(g).w) < 40), 300, 'to the bunny');
  if (bun(a.g) && tx(a.g) > 52) { a.down(J).wait(12).up(J); a.until((g) => { const b = bun(g); return !b || g.player.cx < b.x + b.w / 2 + 4 || ground(g); }, 60, 'over'); a.up(L).down(D).tap(J, 3).up(D).until(ground, 90, 'pound').log('bunny ' + (bun(a.g) ? 'there' : 'split')); }
  a.up(L);
  walkTo(a, 50.5).log('hide spot 50.5');
  // hide spot to hide spot, hiding until the vacuum has gone by when it's in the way
  for (const s of [41.5, 30.5, 20.5, 11.5, -1]) {
    if (!legOk(a.g, s)) { a.tap(D, 3).until((g) => g.player.hidden, 30, 'hide').log('hide'); a.until(passed, 3000, 'vacuum passed').log('vacuum passed'); }
    if (s < 0) travel(a, -1, (g) => g.room.id === 'liv-armchair', 600, 'to the armchair'); else walkTo(a, s);
  }
  a.log('armchair floor');
  if (a.p.health < hp0) throw new Error('hurt on the rug ' + JSON.stringify(a.state()));
  // a super-jump onto the glass arm, down onto the seat (Down: land still on the cushion), a super-jump over the back
  walkTo(a, 25); settle();
  a.down('KeyV').wait(24).up('KeyV').down(L).until((g) => ground(g) && g.player.vy >= 0, 120, 'on the arm').up(L).log('on the arm');
  if (ty(a.g) > 44.5) throw new Error('missed the arm ' + JSON.stringify(a.state()));
  a.down(L).until((g) => tx(g) < 20.5, 120, 'off the arm').up(L).down(D).until(ground, 200, 'seat').up(D).log('seat');
  walkTo(a, 8.5); settle();
  a.down('KeyV').wait(24).up('KeyV').down(L).until((g) => ground(g) && g.player.vy >= 0, 120, 'over the back').up(L).log('over the back');
  travel(a, -1, (g) => g.room.id === 'stair-foot' && ground(g), 600, 'to the stair foot').log('stair foot');
  // the stair-foot crack: the Carrier, Pip out front again
  viaCarrier(30, ['pip', 'stripe', 'katy']);
  a.log('back at the stair foot');
});

chapter('to-study', () => {
  // up the stairs: the foot's flight, the turn, flight A, then a super-jump onto the landing
  walkTo(a, 11.2); settle();
  const steps = [];
  for (let i = 0; i <= 16; i++) steps.push([13 + 2 * i, i === 16 ? 36 : 32 - 2 * i]); // the top step: feet in stair-flight (row 36)
  climb(a, steps).log('top of the lower flight');
  climb(a, [[47, 34], [49, 32], [51, 30], [53, 28], [55, 26], [53, 24], [51, 22], [49, 20], [47, 18], [45, 16], [43, 14], [41, 12], [39, 10], [37, 8], [35, 6], [33, 4], [31, 2]]).log('top of flight A');
  walkTo(a, 30.6); settle();
  a.down('KeyV').wait(24).up('KeyV').until((g) => g.room.id === 'stair-landing' && ty(g) < 33, 90, 'super-jump').down(L).until(ground, 120, 'landed').up(L).log('landing floor');
  if (ty(a.g) > 34.5) jumpTo(a, 26.5, 34);   // out of the notch beside the floor
  walkTo(a, 26); climb(a, [[26, 32], [26, 30], [26, 28], [26, 26], [27, 24]]).log('picture ledge');
  // link-stairs-glide (zone-d.mjs): off the ledge end, glide across the stairwell to the Study door
  a.down(R).until((g) => tx(g) > 42.2, 300, 'ledge end').down(J).wait(2)
    .until((g) => g.room.id === 'stu-door', 600, 'across').wait(10).up(R).up(J).until(ground, 120, 'landed').log('Study');
  // off the door ledge, down through the shelf planks to the floor and the crack
  walkTo(a, 8.6); a.until(ground, 120, 'plank');
  for (let i = 0; i < 6 && ty(a.g) < 33.5; i++) { a.wait(4); dropThrough(); a.until(ground, 200, 'down'); }
  viaCarrier(4, null, 0);           // zone-07-path starts at this crack: no frame passes before it
});

chapter('study', () => {
  playChecked('zone-07-path');
  walkInto(61 * T - 29, 63 * T - 1);
  enter(a);                       // Mossy's door: Ready?, Enter
  a.plan('complete', 'carrier');       // [polish-T] "Rin is safe!" opens as the lines close (on the solution's last frame)
  a.play(sol('zone-07-boss'));        // [polish-T] not playChecked: the card's Return to the Carrier moves us on its last frame
  if (!a.g.inCarrier) throw new Error('zone-07-boss: no rescue card / Carrier');
});

chapter('study-to-sunroom', () => {
  // "Rin is safe!": Return to the Carrier (planned before the fight), back to the lair ledge's crack (stu-shelves)
  a.until((g) => g.inCarrier, 200, 'the Carrier').wait(20);
  a.plan('hubcrack', 'back');
  enter(a).until((g) => !g.inCarrier, 10, 'back').wait(3).log('lair ledge');
  // [fullrun] down the drop hole, up the new rails out of the pit onto P3, glide left to the desk, the Study door
  walkTo(a, 49.5); a.until((g) => ground(g) && ty(g) > 51, 200, 'the pit').log('the pit');
  walkTo(a, 43.5); settle();
  for (let i = 0; i < 8 && ty(a.g) > 41.5; i++) a.tap(J, 20).until(ground, 90, 'rail').wait(3);
  jumpTo(a, 40.5, 40); a.log("P3's step");
  a.down(L).tap(J, 16).down(J).until(ground, 300, 'glide').up(J).up(L).log('rail 38');
  jumpTo(a, 30, 36); a.log('rail 36');
  a.down(L).until((g) => g.player.state === 'air', 120, 'off the rail').wait(10).down(J)   // no coyote jump into the corridor
    .until(ground, 900, 'glide to the desk').up(J).up(L).log('desk');
  travel(a, -1, (g) => g.room.id === 'stu-door' && tx(g) < 4.6, 1500, 'to the door crack').log('Study door');
  // up the bookshelf planks to the door ledge, out over the stairwell
  walkTo(a, 10); a.tap(CHIRP, 3).wait(6);          // scatter the booklice on the floor
  walkTo(a, 21.5); a.tap(CHIRP, 3).wait(6);
  climb(a, [[24.5, 32], [19.5, 30], [24.5, 28], [19.5, 26], [24.5, 24], [19.5, 22], [14.5, 20, { from: 17.5 }], [10, 18, { from: 12.6 }], [11.5, 16, { from: 9.5 }], [9, 14, { from: 11.6 }], [6, 12, { from: 8.6 }]]).log('door ledge');
  a.down(L).until((g) => g.room.id !== 'stu-door', 200, 'out').up(L).until((g) => ground(g), 400, 'down the stairwell').log('stairs');
  // off the wall top, down the stairwell's right side, gliding right through the gap onto the curtain pelmet
  a.down(L).until((g) => g.player.state === 'air', 30, 'off the wall top').up(L);
  a.until((g) => g.room.id === 'stair-flight' && ty(g) > 18, 200, 'falling past the flight').down(R).down(J)
    .until((g) => g.room.id === 'liv-armchair', 200, 'into the living room').wait(4).up(J).up(R).until(ground, 200, 'landed').log('pelmet');
  if (ty(a.g) > 8.5) throw new Error('missed the pelmet ' + JSON.stringify(a.state()));
  // livingPathGlider + livingFromSeat (zones-b.mjs) as far as the basket rim
  a.down(R).until((g) => g.player.state === 'air', 120, 'off the pelmet').up(R).down(D).until(ground, 400, 'down the curtain').up(D).log('seat');
  ZB.walkTo(a, 9, 'on the cushion');   // Pip jumps farther than Duo: take off sooner so the bounce is on the cushion
  a.down(R).tap(J, 4).until((g) => ground(g) && g.player.cx / T > 24, 300, 'bounced over the arm').log('over the arm');
  a.until((g) => ground(g) && ty(g) > 51.5, 200, 'floor').up(R);
  ZB.walkUntil(a, 1, ZB.inRoom('liv-rug'), 600, 'to the rug');
  ZB.walkTo(a, 6.5, 'the table leg');
  ZB.wallClimb(a, 1, (g) => g.room.id === 'liv-basket' && (g.player.y + g.player.h) / T < 14.6 && g.player.vx > 0, 'leg');
  ZB.endNow(a).down(R).until(ground, 90, 'the rim').up(R).log('basket rim');
  // along the rim, over to the shelf, out right into the piano room, down to its floor
  travel(a, 1, (g) => tx(g) > 18.2, 300, 'rim end');
  a.down(R).tap(J, 10).until(ground, 90, 'shelf').up(R);
  travel(a, 1, (g) => g.room.id === 'liv-piano', 600, 'to the piano').log('piano');
  travel(a, 1, (g) => ground(g) && ty(g) > 33.5 && tx(g) > 51.5, 1500, 'piano floor').log('by the end post');
  walkTo(a, 53.4); settle();
  a.wait(6).down('KeyV').wait(22).up('KeyV').wait(8).down(R).until((g) => ground(g) && tx(g) > 56.8, 120, 'over the post').up(R).log('over the post');
  travel(a, 1, (g) => g.room.id === 'liv-lamp', 300, 'to the lamp').log('lamp');
  travel(a, 1, (g) => g.room.id === 'liv-hearth', 900, 'to the hearth').log('mantel');
  // off the mantel, down to the hearth floor, up onto the plaster heap and pound it
  travel(a, 1, (g) => ground(g) && ty(g) > 33.5, 300, 'hearth floor').log('hearth floor');
  travel(a, 1, (g) => ground(g) && tx(g) > 22.5 && ty(g) < 32.5, 300, 'onto the bricks');
  walkTo(a, 25.3); settle();
  a.down(R).tap(J, 14).until((g) => ground(g) && tx(g) > 26.3, 90, 'plaster top').up(R).log('on the plaster');
  a.tap(J, 10).wait(4).down(D).tap(J, 3).up(D).until(ground, 120, 'pounded').log('pounded');
  travel(a, 1, (g) => g.room.id === 'sun-door', 300, 'into the Sunroom').log('Sunroom');
  travel(a, 1, (g) => tx(g) > 7.5 && ground(g), 300, 'to the crack');
  viaCarrier(8, null);
});

chapter('sunroom', () => {
  toStart('zone-08-path');
  playChecked('zone-08-path');
  walkInto(15 * T - 25, 17 * T - 5);
  enter(a);                       // Kite's door: Ready?, Enter
  a.plan('complete', 'carrier');       // [polish-T] "Digby is safe!" (see zone-07)
  a.play(sol('zone-08-boss'));        // [polish-T] not playChecked: the card's Return to the Carrier moves us on its last frame
  if (!a.g.inCarrier) throw new Error('zone-08-boss: no rescue card / Carrier');
});

// ---- zone-09.mjs (builder C) pieces, copied: that script authors its zone on import ----
const USE = 'KeyV';
const EMBER_WAIT = 10;   // frames to stand in the den before the fight (found by search: the fight is timing-sensitive)
function climbChute() {   // the coal chute: up the heap and the four soot lips into Ember's den
  a.down(L).until((g) => g.player.cx < 13.6 * T, 600, 'heap foot').up(L).wait(4);
  a.down(R);
  for (let i = 0; i < 8; i++) a.tap(J, 14).until((g) => ground(g), 90, 'lump ' + i);
  a.until((g) => g.player.cx > 45.6 * T, 200, 'heap edge').up(R).log('heap top');
  const lip = (dir, stand, label) => {
    a.tap(J, 16).wait(1).until((g) => g.player.vy >= -60, 60, 'apex').down(J).wait(4).down(dir)
      .until((g) => ground(g), 150, label).up(dir, J).log(label);
    if (ty(a.g) > stand + 1.1) throw new Error(`missed ${label}: feet at ${ty(a.g)}`);
    if (dir === R) a.down(L).until((g) => g.player.cx < 48.45 * T, 40, 'open end').up(L);
    else a.down(R).until((g) => g.player.cx > 46.55 * T, 40, 'open end').up(R);
    a.wait(3);
  };
  lip(R, 14, 'lip 1'); lip(L, 10, 'lip 2'); lip(R, 6, 'lip 3'); lip(L, 2, 'lip 4');
  a.down(L).tap(J, 16).wait(1).until((g) => g.player.vy >= -60, 60, 'apex').tap(J, 14).until((g) => g.room.id === 'bas-lair' && ground(g), 120, 'den').up(L).log('den');
}
function emberFight() {    // Ember's den: run, flash her eyes when they come close, three kicks at the crack
  const B = () => a.g.boss;
  const eyeNear = (g, d) => { const b = g.boss; const e = { x: b.x + b.facing * 52, y: b.y - 90 }; return Math.hypot(e.x - g.player.cx, e.y - g.player.cy) < d * T; };
  a.wait(+(process.env.EMBER_WAIT ?? EMBER_WAIT)).down(L).until((g) => g.player.cx < 6.5 * T, 600, 'tunnel end').up(L).wait(4).log('tunnel end');
  a.down(L).tap(J, 12).until(ground, 60).up(L)
    .down(L).tap(J, 12).until((g) => ground(g) && ty(g) < 12.5, 60, 'step 2').up(L)
    .down(R).tap(J, 12).until((g) => ground(g) && ty(g) < 10.5, 60, 'step 3')
    .tap(J, 10).until((g) => ground(g) && ty(g) < 9.5, 60, 'den floor').up(R).log('den floor (phase 1)');
  const runFlash = (goal, label) => {
    a.down(R);
    for (let i = 0; i < 20; i++) {
      a.until((g) => goal(g) || (B().mode !== 'dazed' && eyeNear(g, 3.6)), 900, label);
      if (goal(a.g)) break;
      a.tap(USE, 1);   // with the Band held, a tap flashes on release: keep it short
    }
    a.log(label);
  };
  runFlash((g) => g.boss.phase >= 2, 'the middle (phase 2)');
  runFlash((g) => g.boss.phase >= 3, 'the crack (phase 3)');
  // [playtest] a lost phase sends you back to its checkpoint: keep running (and flashing) to the crack
  const atCrack = (g) => ground(g) && g.player.cx > 92.6 * T;
  for (let t = 0; t < 6 && !atCrack(a.g); t++) runFlash((g) => atCrack(g), 'to the crack (try ' + t + ')');
  a.up(R).log('at the crack');
  for (let i = 0; i < 10 && !(a.g.boss?.done ?? true); i++) {
    if (!atCrack(a.g)) { for (let t = 0; t < 6 && !atCrack(a.g); t++) runFlash((g) => atCrack(g), 'back to the crack'); a.up(R); }
    a.until((g) => g.boss.mode !== 'dazed' && eyeNear(g, 3.6), 1200, 'Ember close');
    a.tap(USE, 1).wait(2);
    if (B()?.mode !== 'dazed') continue;
    for (let k = 0; k < 3 && !(a.g.boss?.done ?? true); k++) {
      const upTo = (n) => { for (let j = 0; j < n && !(a.g.boss?.done ?? true); j++) a.wait(1); };
      a.down(KICK); upTo(3); a.up(KICK);
      upTo(12);
    }
    a.log('kicks ' + B()?.kicks); // [polish-T] boss gone: the card took us to the Carrier
  }
  for (const c of [...a.held]) a.up(c);
}

// [fullrun] from Kite's crack (sun-glass, top) back to the Sunroom door: down to the floor, left along the
// floor run through the bench room and the pots (a super-jump onto the big pot) to the door crack
const glassToDoor = () => {
  travel(a, -1, (g) => ty(g) > 20.5 && ground(g), 900, 'down to the corridor').log('corridor');
  travel(a, 1, (g) => tx(g) > 58.5, 900, 'corridor end');
  a.down(D).tap(J, 3).up(D).until((g) => ground(g) && ty(g) > 23, 200, 'through the rail').log('below');
  travel(a, -1, (g) => g.room.id === 'sun-pots', 3000, 'to the pots').log('pots');
  travel(a, -1, (g) => tx(g) < 52.6 && ground(g), 600, 'the big pot');
  walkTo(a, 52.6); settle();
  a.down('KeyV').wait(24).up('KeyV').down(L).until((g) => ground(g) && g.player.vy >= 0, 120, 'up the pot').up(L);
  if (ty(a.g) > 29) jumpTo(a, 47, 28);
  a.log('on the big pot');
  walkTo(a, 38); jumpTo(a, 32, 30);
  walkTo(a, 27.6); jumpTo(a, 21, 30);
  travel(a, -1, (g) => g.room.id === 'sun-door' && tx(g) < 8.6 && ground(g), 1500, 'to the door crack');
  walkTo(a, 8.5); settle();
  return a.log('Sunroom door');
};

chapter('basement', () => {
  // "Digby is safe!": Return to the Carrier (planned before the fight), back to Kite's crack (sun-glass), down to the Sunroom door
  a.until((g) => g.inCarrier, 200, 'the Carrier').wait(20);
  a.plan('hubcrack', 'back');
  enter(a).until((g) => !g.inCarrier, 10, 'back').wait(3).log("Kite's crack");
  glassToDoor();
  travel(a, -1, (g) => g.room.id === 'liv-hearth' && tx(g) < 17.5 && ground(g), 900, 'to the ash dump');
  walkTo(a, 15.8); settle().log('on the ash plug');
  a.tap(J, 10).wait(4).down(D).tap(J, 3).up(D).until((g) => g.room.id !== 'liv-hearth', 200, 'through the plug').log('down the ash pit');
  a.until((g) => g.room.id === 'bas-chimney' && ground(g), 900, 'chimney base').log('chimney base');
  // off the soot lips (row 2: open at cols 16-17; row 6: open at 14-15) down to the walkway's level
  if (ty(a.g) < 3) { walkTo(a, 16.6); a.until(ground, 120, 'lip 6'); }
  if (ty(a.g) < 7) { walkTo(a, 14.6); a.until(ground, 200, 'below the lips'); }
  if (ty(a.g) > 14.5) { walkTo(a, 12.6); jumpTo(a, 10, 14); }
  walkTo(a, 8).until((g) => g.player.has('feather'), 120, 'the Feather').log('FEATHER');
  // zone-09.mjs: back along the walkway, off its end onto the furnace, the duct ledge, down the shaft, out left
  a.down(L).until(ZB.inRoom('bas-furnace'), 300, 'furnace again')
    .until((g) => ground(g) && ty(g) > 28 && g.player.cx < 30.5 * T, 400, 'off the furnace')
    .until((g) => g.player.cx < 15.2 * T, 300, 'shaft top').up(L).until(ground, 200, 'shaft foot').log('shaft foot')
    .down(L).until(ZB.inRoom('bas-coal'), 600, 'coal bin').up(L).log('coal bin');
  walkTo(a, 49.2); settle();
  enter(a);                         // Ember's door: Ready?, Enter (her lines; no move)
  climbChute();
  a.g.levelComplete = false;           // authoring only: nothing in the game reads it
  a.plan('complete', 'carrier');       // [polish-T] "Mote is safe!" (planned before the fight: it may open as her lines close)
  emberFight();
  a.until((g) => g.rescued.has('mote'), 600, 'Mote is free').log('Mote is free (nine home)');
});

// [fullrun] "Return to the Carrier" after Ember comes back to the coal bin's crack: back up to the hearth the
// way zone 9 goes (zone-09.mjs: the furnace shaft, the warm air, the walkway), then with the Feather up the
// chimney base's soot lips and the ash pit's lips, out through the hole where the ash plug was
// jump (or super-jump), flutter at the apex, rise beside a lip (column bx) and land on it (column x, feet row)
const flTo = (x, row, bx, { sup = false, room = null } = {}) => {
  const r0 = a.g.room.id, tgt = x * T, beside = bx * T;
  if (sup) a.down(USE).wait(24).up(USE); else a.down(J);
  let held = null, flut = 0;
  for (let f = 0; f < 200; f++) {
    a.wait(1);
    const p = a.p;
    if (!sup && f === 16) a.up(J);
    if (!flut && f > 8 && p.vy >= -60 && p.state === 'air') { a.down(J); flut = f; }
    if (flut && f === flut + 14) a.up(J);
    const above = a.g.room.id === (room || r0) && p.y + p.h < row * T - 2;
    const d = (above ? tgt : beside) - p.cx, want = Math.abs(d) < 4 ? null : d > 0 ? R : L;
    if (want !== held) { if (held) a.up(held); if (want) a.down(want); held = want; }
    if (f > 6 && ground(a.g)) break;
  }
  if (held) a.up(held);
  if (a.held.has(J)) a.up(J);
  a.wait(3);
  if (a.g.room.id !== (room || r0) || Math.round(ty(a.g)) !== row) throw new Error(`flTo ${x},${row}: ${JSON.stringify(a.state())}`);
  return a;
};
const coalToHearth = () => {
  a.down(R).until(ZB.inRoom('bas-furnace'), 900, 'furnace').log('furnace');
  a.until((g) => g.player.cx > 13.4 * T, 200, 'under the shaft').up(R).wait(2).down(L).tap(J, 14);
  let dir = L;
  for (let i = 0; i < 40; i++) {
    a.until((g) => g.player.state === 'cling' || ground(g), 120, 'cling');
    if (ground(a.g) && ty(a.g) < 31.5) break;
    if (ground(a.g)) { a.tap(J, 14); continue; }
    const next = a.p.clingDir < 0 ? R : L;
    a.up(dir).down(next).tap(J, 4); dir = next;
    a.wait(6);
  }
  a.up(dir).log('duct ledge');
  a.down(R).until((g) => g.player.cx > 28.4 * T, 300, 'ledge end').tap(J, 8).until((g) => ground(g) && g.player.cx > 30.3 * T, 120, 'furnace top').up(R).log('furnace top');
  if (a.p.cx > 33.2 * T) a.down(L).until((g) => g.player.cx < 32.6 * T, 60).up(L);
  else if (a.p.cx < 31.4 * T) a.down(R).until((g) => g.player.cx > 31.8 * T, 60).up(R);
  a.until((g) => ty(g) < 13, 400, 'lifted').down(R).until((g) => ground(g) && ty(g) < 14.5, 120, 'walkway').log('walkway')
    .until(ZB.inRoom('bas-chimney'), 400, 'chimney base').up(R).log('chimney base');
  walkTo(a, 14.5); a.until(ground, 120, 'below the flue');
  flTo(12.9, 6, 15.0, { sup: true });             // a super-jump up beside the first lip, flutter onto it
  jumpTo(a, 17, 6); walkTo(a, 17);                 // over to the right-hand lip, under the gap
  flTo(15.1, 2, 17.0);
  flTo(18.7, 34, 16.5, { room: 'chim-ash' }).log('the ash pit');
  // link-chimney's lip-to-lip hop up the ash pit, out through the plug's hole onto the hearth floor
  for (let i = 0; i < 30 && a.g.room.id !== 'liv-hearth'; i++) {
    const left = tx(a.g) < 16, d = left ? R : L, y0 = ty(a.g), room = a.g.room.id;
    a.down(d).until((g) => (left ? g.player.x + g.player.w > 14 * T + 4 : g.player.x < 18 * T - 4), 60, 'lip edge');
    a.tap(J, 17).tap(J, 14).until((g) => ground(g) && (g.room.id !== room || ty(g) < y0 - 1), 120, 'next lip').up(d);
  }
  if (a.g.room.id === 'liv-hearth' && tx(a.g) < 16) { walkTo(a, 13.4); settle(); try { flTo(21, 34, 21); } catch (e) { if (!(a.g.room.id === 'liv-hearth' && ground(a.g) && tx(a.g) > 18)) throw e; } }   // over the hole (jump and flutter; onto the floor or the firebox's first lip)
  return a.log('the hearth');
};

chapter('carrier-sings', () => {
  // "Mote is safe!": Return to the Carrier (planned before the fight). Stay: every arrival pops in, then the Carrier sings (nine home)
  a.until((g) => g.inCarrier, 200, 'the Carrier').log('the Carrier (nine home)');
  a.until(() => a.modals.some((m) => m.kind === 'dialog' && m.f > 0 && a.g.inCarrier && metaOf().damperOpen), 1500, 'the Carrier sings').wait(30).log('sung');
  a.plan('hubcrack', 'back');
  enter(a).until((g) => !g.inCarrier, 10, 'back').wait(3).log("back at Ember's crack (the coal bin)");
  coalToHearth();
});

// jump, flutter at the apex, steering to land on the tile at (col x, standing row)
const flutterTo = (x, row, label = `lip ${x},${row}`) => {
  // take off from the inner edge of the firebox lip you stand on (the flue's hop does the same)
  if (ty(a.g) < 33.5) { if (a.p.cx < 16 * T) a.down(R).until((g) => g.player.x + g.player.w > 14 * T + 4, 60, 'edge').up(R); else a.down(L).until((g) => g.player.x < 18 * T - 4, 60, 'edge').up(L); }
  const tgt = (x + 0.5) * T, side = Math.sign(a.p.cx - tgt) || 1, beside = tgt + side * 1.15 * T;
  a.down(J);
  let held = null, fl = false;
  for (let f = 0; f < 150; f++) {
    a.wait(1);
    const p = a.p;
    if (f === 16) a.up(J);
    if (!fl && f > 16 && p.vy >= -60) { a.tap(J, 14); fl = true; }
    // rise beside the lip (not under it), drift onto it once the feet are above its top
    const aim = p.y + p.h < row * T - 2 ? tgt : beside;
    const d = aim - p.cx, want = Math.abs(d) < 4 ? null : d > 0 ? R : L;
    if (want !== held) { if (held) a.up(held); if (want) a.down(want); held = want; }
    if (f > 6 && ground(a.g)) break;
  }
  if (held) a.up(held);
  if (a.held.has(J)) a.up(J);
  a.wait(3);
  if (Math.round(ty(a.g)) !== row) throw new Error(`${label}: landed at ${JSON.stringify(a.state())}`);
  return a;
};

chapter('chimney', () => {
  // into the hearth, stopping short of the hole where the ash plug was (cols 14-17)
  travel(a, -1, (g) => g.room.id === 'liv-hearth' && tx(g) < 19.4 && ground(g), 900, 'into the hearth');
  walkTo(a, 20.6); settle().log('hearth floor');
  for (const [x, row] of [[18.5, 31], [12.5, 29], [18.5, 25], [12.5, 21], [18.5, 17], [12.5, 13], [18.5, 9], [17, 5], [12.5, 2]]) flutterTo(x, row);
  a.log('top of the firebox');
  // link-chimney (zone-d.mjs): lip to lip up the flue (jump + flutter), through the damper (nine home), to the attic gap
  const hop = () => {
    const left = tx(a.g) < 16, d = left ? R : L, y0 = ty(a.g), room = a.g.room.id;
    a.down(d).until((g) => (left ? g.player.x + g.player.w > 14 * T + 4 : g.player.x < 18 * T - 4), 60, 'lip edge');
    a.tap(J, 17).tap(J, 14).until((g) => ground(g) && (g.room.id !== room || ty(g) < y0 - 1), 120, 'next lip').up(d);
  };
  for (let i = 0; i < 60 && !(a.g.room.id === 'chim-top' && ty(a.g) <= 33); i++) hop();
  a.log('at the attic gap');
  a.down(L).until((g) => tx(g) <= 2, 300, 'the gap').until((g) => g.room.id === 'att-entry', 200, 'into the attic').up(L).log('attic');
  travel(a, 1, (g) => tx(g) > 55.5 && ground(g), 900, 'to the crack');
  viaCarrier(56, ['duo', 'digby', 'mote'], 0);   // zone-10-path starts at this crack (Duo out front)
});

chapter('attic', () => {
  playChecked('zone-10-path');
  // Nana's fight: Mote out front (E twice: Duo, Digby, Mote), then her door: the Ready? card (low, middle, high voices)
  swapTo('mote'); settle();
  enter(a);                         // Ready?, Enter (into att-lair), her lines
  a.plan('story', 'none');             // the ending: played by the browser part
  playChecked('zone-10-boss');
  a.until(() => a.modals.some((m) => m.kind === 'story'), 600, 'the ending').log('the ending starts');
});

for (const [name, fn] of chapters) { console.log(`== ${name}`); fn(); if (TO === name) break; }
const chain = a.chain();
const CHAIN = path.join(root, '.playwright', 'full-run-chain.json');
writeFileSync(CHAIN, JSON.stringify(chain));
console.log(`chain: ${chain.frames} frames, ${chain.events.length} keys, ${chain.modals.length} modals`);
if (args.includes('--headless')) process.exit(0);

// ------------------------------------------------------------------ 2. the browser
const b = new BrowserAuthor({ url: opt('--url', 'http://127.0.0.1:8173/'), session: opt('--session', 'pt') });
b.open();
// the title, New Game (slot 1), the opening panels (Jump skips each), the tank escape
b.tap('Enter', 3, 6).until("document.querySelector('[data-screen=title]')", 60, 'title menu');
b.menu('New Game').until("document.querySelector('[data-screen=newgame]')", 30, 'slots');
b.menu('Slot 1').until('m.story === "opening"', 30, 'opening panels');
b.log('opening panels');
for (let i = 0; i < 3; i++) b.steps(20).tap('KeyZ', 3, 3);
b.until('s.screen === "play" && s.room === "tank-cup" && !m.story', 120, 'the tank');
b.log('the tank');
b.segment(sol('zone-00-path'), { label: 'the tank escape' });
b.releaseAll();
b.until('m.story === "opening-4"', 600, 'panel 4');
b.log('panel 4');
// Jump ends panel 4: the Bedroom starts (game.startAt) on that step: chain frame 0
b.steps(30).down('KeyZ').steps(1).up('KeyZ');
b.until('s.screen === "play" && s.room === "bed-carrier" && !m.story', 0, 'the Bedroom');
{ const f = b.mark('the Bedroom').frame; if (f !== G0) throw new Error(`the Bedroom starts on game frame ${f}, the model on ${G0}: re-run with --g0 ${f}`); }
b.chain(chain, { label: 'run' });
b.mark('end of the chain');
if (TO) process.exit(0);
// the ending: four panels (Jump moves on), the credits (a page at a time), "Thank you for playing", the Carrier
b.until('m.story === "ending"', 5, 'the ending panels');
for (let i = 0; i < 4; i++) b.steps(90).tap('KeyZ', 3, 3);
b.until('m.story === "credits"', 300, 'the credits').mark('credits');
for (let i = 0; i < 4 && true; i++) { b.steps(90); b.tap('KeyZ', 3, 3); }
b.until('m.story === "thanks"', 900, 'thank you').mark('thank you');
b.steps(90).tap('KeyZ', 3, 3);
b.until('m.inCarrier && !m.story && !m.ui && !m.dialog', 300, 'back in the Carrier').mark('back in the Carrier');
b.steps(240);
b.save('full-run', { won: true, inCarrier: true });
