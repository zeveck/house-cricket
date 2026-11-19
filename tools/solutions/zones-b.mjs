// Builder B's recorded solutions (zones 4-6): critical paths and boss wins, authored with the
// headless sim. Re-run after changing a room, a boss or the physics:
//   node tools/solutions/zones-b.mjs [filter]      (e.g. "zone-04", "boss")
import { Author } from '../author.mjs';
import { ZONE_INFO } from '../../game/data/zones.js';
import { pathToFileURL } from 'node:url';
export const R = 'ArrowRight', L = 'ArrowLeft', U = 'ArrowUp', D = 'ArrowDown', J = 'KeyZ', USE = 'KeyV', KICK = 'KeyX', CHIRP = 'KeyC';
export const T = 40;
const only = process.argv[2];
const want = (n) => !only || n.includes(only);

// ---- little movement helpers (all wait on the live sim) ----
export const tx = (a) => a.p.cx / T;                         // player centre, tiles
export const feet = (a) => (a.p.y + a.p.h) / T;              // feet, tiles (standing on row y -> y + 1)
export const ground = (g) => g.player.state === 'ground';
export function walkTo(a, x, label = `x ${x}`, max = 900) {
  const dir = x > tx(a) ? R : L;
  a.down(dir).until((g) => (dir === R ? g.player.cx / T >= x : g.player.cx / T <= x), max, label).up(dir);
  return a;
}
// run toward dir, jump when past x (tiles), keep holding dir until standing on row `row`
export function hopTo(a, dir, x, row, hold = 14, label = `hop ${x}->${row}`, max = 240) {
  const k = dir > 0 ? R : L;
  a.down(k).until((g) => (dir > 0 ? g.player.cx / T >= x : g.player.cx / T <= x), max, label + ' take-off');
  a.down(J).wait(hold).up(J);
  a.until((g) => ground(g) && Math.abs((g.player.y + g.player.h) / T - (row + 1)) < 0.05, max, label + ' landing').up(k);
  return a;
}
// wall-jump up a shaft until done(g) (a feet row number means: feet above that row, same room)
export function wallClimb(a, first, done, label = 'climb') {
  const fin = typeof done === 'number' ? (g) => (g.player.y + g.player.h) / T < done : done;
  let dir = first; // first kick toward this side
  a.down(dir > 0 ? R : L, J).wait(8);
  for (let k = 0; k < 40; k++) {
    a.until((g) => g.player.state === 'cling' || fin(g), 120, `${label} cling ${k}`);
    if (fin(a.g)) break;
    a.up(J).wait(2);
    a.up(dir > 0 ? R : L); dir = -dir; a.down(dir > 0 ? R : L, J);
    a.wait(5);
  }
  a.up(J);
  return a;
}
export function walkUntil(a, dir, cond, max = 900, label = 'walk') { const k = dir > 0 ? R : L; a.down(k).until(cond, max, label).up(k); return a; }
export const inRoom = (id) => (g) => g.room.id === id;
// walk toward dir and kick the first `type` enemy when it is in reach
export function kickNext(a, type, dir) {
  const k = dir > 0 ? R : L;
  a.down(k).until((g) => { const e = g.enemies.find((x) => x.type === type && x.state === 'walk'); if (!e) return true; const gap = dir < 0 ? g.player.x - (e.x + e.w) : e.x - (g.player.x + g.player.w); return gap < 14; }, 600, type + ' near');
  a.tap(KICK, 4).wait(8).up(k).log('kicked ' + type);
  return a;
}
// pump a floss swing, then fling toward dir once the angle passes `at` (rad)
export function pumpAndFling(a, dir, at) {
  a.up(R, L);
  let cur = null;
  for (let i = 0; i < 400; i++) {
    const s = a.p.swing; if (!s) break;
    const w = s.w > 0 ? R : L;
    if (w !== cur) { if (cur) a.up(cur); a.down(w); cur = w; }
    a.wait(1);
    if (i > 30 && Math.sign(s.w) === dir && dir * s.ang > at && Math.abs(s.w) > 2.2) break;
  }
  if (cur) a.up(cur);
  a.down(dir > 0 ? R : L).tap(J, 3).log('fling');
  return a;
}
export function endNow(a) { for (const c of [...a.held]) a.up(c); return a; }

// Beetle sneak: go from hide spot to hide spot (leftward), hiding until the leg ahead is clear.
export function sneak(a, spots, exitX) {
  const beetles = (g) => g.enemies.filter((e) => e.type === 'beetle');
  const clear = (g, x0, x1) => beetles(g).every((e) => {
    const bx = (e.x + e.w / 2) / T, t = Math.abs(x0 - x1) / 5 + 0.8, reach = 1.25 * t + 2.2;
    if (bx > x0 + 2) return e.dir > 0 || bx - reach > x0 + 1.5; // behind us
    if (bx < x1 - 2 && e.dir < 0) return true;               // ahead, walking away
    return e.dir > 0 ? bx + reach < x1 - 0.5 : false;
  });
  let here = tx(a);
  const legs = [...spots, exitX];
  for (let i = 0; i < legs.length; i++) {
    const to = legs[i];
    if (!clear(a.g, here, to)) {
      a.tap(D, 3).until((g) => g.player.hidden, 30, 'hide at ' + here).log('hide ' + here.toFixed(1));
      a.until((g) => clear(g, here, to), 1200, 'clear to ' + to);
    }
    walkTo(a, to, 'to spot ' + to).log('spot ' + to);
    here = to;
  }
  return a;
}

// ======================================================================= zone 4: the Pantry
const Z4 = ZONE_INFO[4];
export function pantryPath(a = new Author({ room: 'pan-door', items: Z4.minItems[0], party: ['duo'], rescued: Z4.rescued })) { // [playtest] a: an author already in place (tools/solutions/full-run.mjs)
  a.wait(20).log('start');
  // hop the worker ant on the way
  kickNext(a, 'ant', -1);
  walkUntil(a, -1, inRoom('pan-floor'), 600, 'to pan-floor').log('pan-floor');
  sneak(a, [58.5, 47.5, 38, 26.5, 16.5], 14.5);
  // the crates and brackets up to the gap in the shelf board (a weevil rolls rice down them)
  const kGrain = (g) => g.projectiles.some((q) => q.kind === 'grain' && q.x < 15 * T && q.y > 12 * T);
  a.until(kGrain, 400, 'a grain').until((g) => !kGrain(g), 200, 'grain gone');
  a.down(L).down(J).wait(10).up(J).wait(6).tap(KICK, 4).until(ground, 60, 'on K1').up(L).log('K1, weevil kicked');
  hopTo(a, -1, 10.5, 11, 12, 'K2');
  hopTo(a, 1, 9.6, 9, 12, 'K3');
  hopTo(a, -1, 9.5, 7, 12, 'K4');
  hopTo(a, -1, 6.6, 5, 12, 'K5').log('under the gap');
  walkTo(a, 3.2);
  wallClimb(a, -1, (g) => g.room.id === 'pan-shelves' && ground(g), 'gap');
  endNow(a).log('pan-shelves, shelf A');
  // across the syrup, up the second shaft to shelf B
  walkTo(a, 23.2, 'shaft 2');
  wallClimb(a, 1, (g) => ground(g) && (g.player.y + g.player.h) / T < 16, 'shaft 2');
  endNow(a).log('shelf B');
  // swing over the pin gap on the bracket hook
  a.down(R).until((g) => g.player.cx / T > 32.4, 200, 'gap edge').down(J).wait(12).up(J);
  a.until((g) => g.player.state === 'swing' || Math.hypot(34.5 * T - g.player.cx, 11.5 * T - g.player.cy) < 70, 60, 'hook near');
  if (a.p.state !== 'swing') a.tap(USE, 3);
  a.until((g) => g.player.state === 'swing', 20, 'grabbed').log('swing');
  pumpAndFling(a, 1, 0.35);
  a.until(ground, 120, 'over the gap').up(R).log('past the gap');
  // the ant soldier: chirp-stun it and walk past
  a.until((g) => { const e = g.enemies.find((x) => x.type === 'antsoldier'); return Math.abs(e.x + e.w / 2 - g.player.cx) < 3.5 * T; }, 300, 'soldier near');
  a.tap(CHIRP, 3).wait(4).log('chirp');
  walkTo(a, 46.5, 'past the soldier').log('under the alcove');
  hopTo(a, 1, 46.6, 12, 12, 'bracket');
  a.down(J).wait(14).up(J).until((g) => ground(g) && feet(a) < 11.1, 90, 'alcove').log('alcove');
  walkTo(a, 55.5, 'band').until((g) => g.player.has('band'), 60, 'band').log('band').wait(45);
  walkTo(a, 46.5, 'take-off');
  a.wait(6).down(USE).wait(22).log('charge').up(USE).wait(8).down(L);
  a.until((g) => ground(g) && feet(a) < 4.1, 120, 'shelf D').up(L).log('shelf D (first super-jump)');
  walkUntil(a, -1, (g) => ground(g) && feet(a) > 15.5, 600, 'down to the lair shelf').log('lair shelf');
  walkTo(a, 3.5, 'lair door').log('at the lair door');
  return a;
}

export function lashesFight(a = new Author({ room: 'pan-lair', x: 61, y: 13, items: [...Z4.minItems[0], 'band'], party: ['duo'], rescued: Z4.rescued })) { // [playtest] a: an author already in place (tools/solutions/full-run.mjs)
  const B = (g) => g.boss;
  const nose = (g) => (B(g).x + B(g).facing * 320 * 0.42) / T;
  a.wait(10).log('arena');
  // ---- phase 1: up the crates, wait for him to walk away, kick the grape, wait, pass ----
  hopTo(a, -1, 60.5, 11, 12, 'crate B');
  a.until((g) => B(g).facing < 0 && B(g).x < 35 * T && B(g).mode === 'walk', 900, 'he walks off left').log('he walks away');
  hopTo(a, -1, 56.6, 10, 8, 'middle shelf');
  walkTo(a, 43.4, 'under the grape');
  a.down(L).down(J).wait(3).until((g) => g.player.vy > -330, 40, 'near apex').tap(KICK, 4).up(J).until(ground, 60, 'landed').up(L).log('grape kicked: ' + B(a.g).fruit[0].state);
  walkTo(a, 56.5, 'back to the end').down(R).wait(20).up(R).log('waiting on crate B');
  a.until((g) => B(g).mode === 'eat', 1200, 'he eats the grape').log('eating');
  hopTo(a, -1, 56.6, 10, 8, 'middle shelf');
  walkUntil(a, -1, (g) => g.bossPhase === 2, 600, 'pass him').log('phase 2');
  // ---- phase 2: under the hole, super-jump when he isn't looking, kick the jam jar ----
  walkTo(a, 15.1, 'under the hole');
  a.until((g) => B(g).mode === 'lick' || B(g).facing > 0 || nose(g) > 25, 900, 'safe to jump').log('jump');
  a.down(USE).wait(18).up(USE).until((g) => (g.player.y + g.player.h) < 5 * T - 4, 60, 'up through the hole').down(L).until((g) => ground(g) && feet(a) < 5.1, 90, 'top shelf').up(L).log('top shelf');
  walkTo(a, 14.2, 'by the jar');
  a.tap(L, 2).tap(KICK, 4).wait(10).log('jar: ' + B(a.g).fruit[0].state);
  a.until((g) => B(g).mode === 'eat', 1200, 'he eats the jam').log('eating jam');
  walkTo(a, 30.2, 'hole 2');
  a.until((g) => (g.player.y + g.player.h) / T > 10.5 && ground(g), 120, 'dropped').log('dropped to the middle');
  walkUntil(a, 1, (g) => g.bossPhase === 3, 900, 'to the stairs').log('phase 3');
  // ---- phase 3: up the stairs, kick the banana down the hole, run left, chirp the swarm, the lid ----
  a.wait(10);
  walkTo(a, 55.2, 'stair foot');
  hopTo(a, 1, 55.3, 8, 12, 'Q1');
  hopTo(a, 1, 58.0, 6, 12, 'Q2');
  hopTo(a, -1, 59.6, 4, 12, 'top shelf');
  a.until((g) => Math.abs(nose(g) - 31) > 4 && B(g).mode !== 'tell', 900, 'away from hole 2').log('go');
  walkTo(a, 33.0, 'by the banana');
  a.tap(KICK, 4).wait(4).log('banana: ' + B(a.g).fruit[0].state);
  a.until((g) => B(g).mode === 'eat', 900, 'he eats the banana').log('eating banana');
  a.down(L).until((g) => g.player.cx / T < 32.7, 60).down(J).wait(12).up(J).until(ground, 60, 'over hole 2');
  a.until((g) => g.player.cx / T < 16.7, 300, 'hole 1').down(J).wait(12).up(J).until(ground, 60, 'over hole 1').up(L).log('past the holes');
  walkTo(a, 12.5, 'swarm');
  a.tap(CHIRP, 3).wait(6).log('chirp');
  a.down(L).until((g) => g.player.cx / T < 4.6, 300, 'the jar').down(KICK).until((g) => g.levelComplete, 30, 'rescue');
  endNow(a).log('rescued');
  return a;
}

// ======================================================================= zone 5: the Laundry
const Z5 = ZONE_INFO[5];
export function laundryPath(a = new Author({ room: 'laun-stairs', items: Z5.minItems[0], party: ['duo'], rescued: Z5.rescued })) { // [playtest] a: an author already in place (tools/solutions/full-run.mjs)
  a.wait(20).log('start');
  walkUntil(a, -1, inRoom('laun-sink'), 300, 'down the shaft').until((g) => ground(g), 120, 'on the ledge').log('laun-sink ledge');
  a.down(D).wait(4).tap(J, 4).up(D).until((g) => feet(a) > 12.5 && ground(g), 120, 'through the sill').log('below the sill');
  walkUntil(a, -1, inRoom('laun-dryer'), 400, 'to the dryer').log('laun-dryer');
  walkTo(a, 57.5, 'hose foot');
  // up the vent hose: bends alternate left (51-54) and right (55-58), two rows apart
  for (let k = 0; k < 12; k++) {
    const left = k % 2 === 1, row = 31 - 2 * k;
    hopTo(a, left ? -1 : 1, left ? 55.2 : 54.8, row, 12, `bend ${k}`);
  }
  hopTo(a, -1, 51.5, 8, 10, 'dryer top').log('on the dryer');
  walkTo(a, 43.5, 'glider').until((g) => g.player.has('glider'), 60, 'glider').log('glider').wait(45);
  // first glide: off the dryer and down to the door
  a.down(L).until((g) => g.player.state === 'air', 300, 'off the edge').down(J).until(ground, 400, 'glided across').up(J).up(L).log('glided across');
  walkUntil(a, 1, (g) => ground(g) && feet(a) > 33.5, 200, 'off the shelf').log('floor');
  hopTo(a, 1, 21.0, 31, 10, 'low step');
  hopTo(a, 1, 24.5, 29, 12, 'high step');
  walkUntil(a, 1, inRoom('laun-sink'), 600, 'under the dryer, back to the sink').log('laun-sink');
  hopTo(a, 1, 4.2, 13, 10, 'bucket');
  hopTo(a, 1, 7.4, 11, 12, 'crate').log('crate');
  walkTo(a, 9, 'under the sill').down(J).wait(14).up(J).until((g) => ground(g) && feet(a) < 10.1, 60, 'up through the sill');
  walkTo(a, 5.5, 'shaft').log('in the shaft');
  wallClimb(a, -1, (g) => g.room.id === 'laun-stairs' && (g.player.y + g.player.h) / T < 15.6 && g.player.vx > 0, 'shaft up');
  endNow(a).down(R).until(ground, 90, 'on the foot').up(R).log('laun-stairs');
  hopTo(a, 1, 12.5, 13, 10, 'step 1');
  hopTo(a, 1, 14.5, 11, 10, 'step 2');
  hopTo(a, 1, 16.5, 9, 10, 'step 3');
  hopTo(a, 1, 18.5, 7, 10, 'step 4');
  hopTo(a, 1, 20.5, 6, 8, 'stair head').log('stair head');
  // the earwigs: kick each one's tail end (follow it while it walks away)
  for (const i of [0, 1]) {
    const ew = (g) => g.enemies.filter((e) => e.type === 'earwig')[i];
    a.until((g) => ew(g).dir > 0 && ew(g).state === 'walk', 600, 'earwig walks away');
    a.down(R).until((g) => ew(g).state !== 'walk' || ew(g).x - (g.player.x + g.player.w) < 12, 600, 'behind the earwig').tap(KICK, 4).wait(10).up(R).log('kicked earwig ' + i);
  }
  walkTo(a, 51.5, 'ledge end');
  a.down(R).down(J).wait(26).until((g) => g.room.id === 'laun-lair', 240, 'glide to the lair door');
  endNow(a).log('at the lair door');
  return a;
}

export function peridotFight(a = new Author({ room: 'laun-lair', x: 4, y: 9, items: [...Z5.minItems[0], 'glider'], party: ['duo'], rescued: Z5.rescued })) { // [playtest] a: an author already in place (tools/solutions/full-run.mjs)
  const B = (g) => g.boss;
  const bx = (g) => B(g).x / T;
  a.wait(10).log('arena');
  // ---- phase 1: glide off the landing into the first seam, ride it up, kick the left chain ----
  a.down(R).until((g) => g.player.state === 'air', 120, 'off the landing').down(J).until((g) => g.player.cx / T > 9.6, 60, 'into the seam').up(R);
  a.until((g) => g.player.lifted && g.player.y < 5.5 * T, 120, 'up the seam').down(R);
  a.until((g) => g.player.cx / T > 13.2, 120, 'to chain 1').tap(KICK, 4).log('kick chain 1 (flicker)');
  // [final-G] phase 1 takes two tugs: drop to the floor, back into the seam, ride it up again
  a.up(R).up(J).until(ground, 200, 'down').log('down');
  walkTo(a, 9.9, 'back to the seam');
  a.down(J).wait(14).until((g) => g.player.lifted && g.player.y < 5.5 * T, 200, 'up the seam again').down(R);
  a.until((g) => g.player.cx / T > 13.2, 120, 'to chain 1 again').tap(KICK, 4).log('kick chain 1');
  a.until((g) => g.bossPhase === 2, 30, 'phase 2').log('phase 2');
  // ---- phase 2: hover in the second seam until she's at the far lamp, then the middle chain ----
  a.until((g) => g.player.cx / T > 29.4, 200, 'to seam 2').up(R).until((g) => g.player.lifted && g.player.y < 5.5 * T, 200, 'up seam 2').log('hovering');
  a.until((g) => bx(g) > 66 && B(g).mode !== 'leap', 1200, 'she is at the far lamp').log('go');
  a.down(R).until((g) => g.player.cx / T > 42.2, 200, 'to seam 3').up(R).until((g) => g.player.lifted && g.player.y < 5.5 * T, 200, 'up seam 3');
  a.down(R).until((g) => g.player.cx / T > 45.2, 120, 'to chain 2').tap(KICK, 4).log('kick chain 2');
  a.until((g) => g.bossPhase === 3, 30, 'phase 3').log('phase 3');
  // ---- phase 3: land in the dark, show yourself at the edge of the light, lure her in ----
  a.up(J).until(ground, 300, 'landed').up(R).log('landed');
  walkTo(a, 64.6, 'edge of the light');
  a.until((g) => B(g).mode === 'chase' || B(g).mode === 'tell', 600, 'she comes').log('she comes: ' + 0);
  walkTo(a, 50, 'into the dark');
  a.until((g) => B(g).mode === 'yawn', 600, 'she yawns').log('yawn at ' + 0);
  walkTo(a, 62.2, 'dark seam');
  a.down(J).wait(14).until((g) => g.player.lifted && g.player.y < 5.5 * T, 200, 'up the dark seam').down(R);
  a.until((g) => g.player.cx / T > 73.2, 200, 'to chain 3').tap(KICK, 4).log('kick chain 3');
  a.until((g) => B(g).mode === 'nap', 30, 'nap').up(J).until(ground, 300, 'landed').log('she naps');
  walkUntil(a, 1, (g) => g.levelComplete, 900, 'to Hump');
  endNow(a).log('rescued');
  return a;
}

// ======================================================================= zone 6: the Living Room
const Z6 = ZONE_INFO[6];
// from the armchair seat: bounce over the arm, the rug, up the side-table leg, the Thimble,
// pound the cracker plug back down, the vacuum sneak, to the lair door
function livingFromSeat(a) {
  walkTo(a, 11, 'on the cushion');
  a.down(R).tap(J, 4).until((g) => ground(g) && g.player.cx / T > 24, 300, 'bounced over the arm').log('over the arm');
  a.until((g) => ground(g) && feet(a) > 51.5, 200, 'floor').up(R).log('floor by the armchair');
  walkUntil(a, 1, inRoom('liv-rug'), 600, 'to the rug').log('liv-rug');
  walkTo(a, 6.5, 'the table leg');
  wallClimb(a, 1, (g) => g.room.id === 'liv-basket' && (g.player.y + g.player.h) / T < 14.6 && g.player.vx > 0, 'leg');
  endNow(a).down(R).until(ground, 90, 'the rim').up(R).log('basket rim');
  walkTo(a, 13.5, 'thimble').until((g) => g.player.has('thimble'), 60, 'thimble').log('thimble').wait(45);
  // [review #7] since 615ba56 a ball of yarn (cols 19-20, rows 18-19) sits below the rim end: down onto it, then off it to the table top
  walkTo(a, 19.4, 'rim end').until(ground, 120, 'onto the yarn');
  if (feet(a) < 19.5) walkTo(a, 21.6, 'off the yarn');
  a.until((g) => ground(g) && feet(a) > 19.5, 120, 'down to the table top').log('table top');
  walkTo(a, 22.4, 'on the crackers');
  a.down(J).wait(8).up(J).wait(8).down(D).tap(J, 3).up(D).log('pound');
  a.until((g) => g.room.id === 'liv-rug' && ground(g), 200, 'back on the rug').log('back on the rug');
  // the vacuum: wait under the TV remote until it has gone past going left, then run
  walkTo(a, 21.2, 'magazine').tap(D, 3).until((g) => g.player.hidden, 20, 'hidden').log('hidden');
  const vac = (g) => g.enemies.find((e) => e.type === 'vacuum');
  a.until((g) => vac(g).dir < 0 && vac(g).x + vac(g).w < 15 * T, 1500, 'vacuum passed').log('vacuum went by');
  // the dust bunny: jump at it and ground-pound it apart from above ([fixer] no hit)
  const bun = (g) => g.enemies.find((e) => e.type === 'dustbunny' && e.state === 'walk');
  a.down(R).until((g) => g.player.cx / T > 60.2 || (bun(g) && bun(g).x - (g.player.x + g.player.w) < 60), 600, 'run right');
  if (bun(a.g) && a.p.cx / T < 60) {
    a.down(J).wait(12).up(J);
    a.until((g) => { const b = bun(g); return !b || g.player.cx > b.x + b.w / 2 - 4 || ground(g); }, 60, 'over the bunny');
    a.up(R).down(D).tap(J, 3).up(D).until(ground, 90, 'pound').log('dust bunny: ' + (bun(a.g) ? 'still there' : 'split')).down(R);
  }
  a.until((g) => g.player.cx / T > 60.2, 600, 'the lair door').up(R).log('at the lair door');
  return a;
}
export function livingPathBand(a = new Author({ room: 'stair-foot', x: 60, y: 33, items: [...Z6.minItems[0]], party: ['duo'], rescued: Z6.rescued })) { // [playtest] a: an author already in place (tools/solutions/full-run.mjs)
  a.wait(10).log('stair foot');
  walkUntil(a, 1, inRoom('liv-armchair'), 200, 'doorway');
  hopTo(a, 1, 0.3, 49, 10, 'footstool');
  walkTo(a, 2.2, 'by the back');
  a.down(USE).wait(18).up(USE).until((g) => (g.player.y + g.player.h) / T < 42.5, 60, 'up').down(R).until((g) => ground(g), 90, 'on the back').up(R).log('over the armchair back (super-jump)');
  walkUntil(a, 1, (g) => ground(g) && feet(a) > 46.5, 200, 'onto the seat').log('seat');
  return livingFromSeat(a);
}
export function livingPathGlider(a = new Author({ room: 'stair-flight', x: 53, y: 23, items: [...Z6.minItems[1]], party: ['duo'], rescued: Z6.rescued })) { // [playtest] a: an author already in place (tools/solutions/full-run.mjs)
  a.wait(10).log('on the stairs');
  a.down(R).until((g) => g.player.state === 'air', 60, 'off').down(J).until((g) => g.room.id === 'liv-armchair' && g.player.cx / T > 1.5, 300, 'glide in').up(R).until(ground, 120, 'the pelmet').up(J).log('on the pelmet (glided in)');
  a.down(R).until((g) => g.player.state === 'air', 120, 'off the pelmet').up(R).down(D).until(ground, 400, 'down the curtain').up(D).log('seat');
  return livingFromSeat(a);
}

export function gargyFight(a = new Author({ room: 'liv-lair', x: 5, y: 15, items: [...Z6.minItems[0], 'thimble'], party: ['duo'], rescued: Z6.rescued })) { // [playtest] a: an author already in place (tools/solutions/full-run.mjs)
  const B = (g) => g.boss;
  a.wait(10).log('arena');
  hopTo(a, 1, 5.2, 14, 8, 'pouf');
  hopTo(a, 1, 8.6, 12, 12, 'left arm').log('on the left arm');
  const poundAt = (x, label) => {
    a.down(R).down(J).wait(16).up(J).until((g) => g.player.cx / T >= x && g.player.state === 'air', 160, label).up(R).down(D).tap(J, 3).up(D).until((g) => ground(g) && g.player.state !== 'pound', 90, label + ' landed').log(label);
  };
  // phase 1: he lounges over the middle cushion; pound the left one
  poundAt(18.5, 'pound cushion A');
  // [final-G] phase 1 takes two bonks: once the pillow is back on its cushion, jump and pound again
  a.until((g) => B(g).once, 90, 'bonk 1a').until((g) => B(g).pillows.every((p) => p.state === 'rest') && ground(g), 200, 'pillow back').log('bonk 1a');
  // from the other side now: dash along the cushions under his head (before his swat lands) to cushion C
  a.down(R).down(J).wait(16).up(J).until((g) => g.player.cx / T >= 40.5 && g.player.state === 'air' && g.player.vy > 0, 400, 'over cushion C').up(R)
   .down(D).tap(J, 3).up(D).until((g) => ground(g) && g.player.state !== 'pound', 90, 'pound C landed').log('pound cushion C');
  a.until((g) => g.bossPhase === 2, 90, 'bonk 1').log('phase 2');
  // back over to cushion A (bouncing), pound down onto it
  a.down(L).down(J).wait(16).up(J).until((g) => g.player.cx / T <= 19.5 && g.player.state === 'air' && g.player.vy > 0, 400, 'over cushion A').up(L)
   .down(D).tap(J, 3).up(D).until((g) => ground(g) && g.player.state !== 'pound', 90, 'pound A landed').log('back on cushion A');
  // back to the arm, he follows over the left cushion; pound the middle one
  for (const ph of [2, 3]) {
    if (a.p.cx / T > 14) { walkTo(a, 14.6, 'seat end'); hopTo(a, -1, 14.55, 12, 12, 'back to the arm'); }
    if (feet(a) > 15.5) { walkTo(a, 4.5, 'floor'); hopTo(a, 1, 5.2, 14, 8, 'pouf'); hopTo(a, 1, 8.6, 12, 12, 'left arm'); }
    walkTo(a, 11.6, 'mid arm').log('on the arm');
    a.until((g) => B(g).x < 20 * T && B(g).mode === 'lounge', 600, 'he rolls over the left cushion').log('he is over A');
    poundAt(26.8, 'pound cushion B');
    a.until((g) => (ph === 2 ? g.bossPhase === 3 : g.levelComplete), 90, 'bonk ' + ph).log('bonk ' + ph);
  }
  endNow(a).log('rescued');
  return a;
}

const SOL = {
  'zone-04-path': () => { const a = pantryPath(); a.end(); a.save('zone-04-path'); },
  'zone-04-boss': () => { const a = lashesFight(); a.save('zone-04-boss', { levelComplete: true }); },
  'zone-05-path': () => { const a = laundryPath(); a.save('zone-05-path'); },
  'zone-05-boss': () => { const a = peridotFight(); a.save('zone-05-boss', { levelComplete: true }); },
  'zone-06-path-band': () => { const a = livingPathBand(); a.end(); a.save('zone-06-path-band'); },
  'zone-06-path-glider': () => { const a = livingPathGlider(); a.end(); a.save('zone-06-path-glider'); },
  'zone-06-boss': () => { const a = gargyFight(); a.save('zone-06-boss', { levelComplete: true }); },
};
if (import.meta.url === pathToFileURL(process.argv[1]).href) for (const [name, fn] of Object.entries(SOL)) if (want(name)) { console.log(`== ${name}`); fn(); }
