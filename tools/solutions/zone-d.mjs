// Builder D's recorded solutions (the Hall, the stairwell, the chimney, the Attic, Nana), authored
// with the headless sim (tools/author.mjs). Re-run after changing tools/make-zone-d.mjs or the engine:
//   node tools/solutions/zone-d.mjs [filter]
import { Author } from '../author.mjs';
const R = 'ArrowRight', L = 'ArrowLeft', U = 'ArrowUp', D = 'ArrowDown', J = 'KeyZ', KICK = 'KeyX', CHIRP = 'KeyC', USE = 'KeyV';
const SWAPN = 'KeyE';
const T = 40;
const only = process.argv[2];
const want = (n) => !only || n.includes(only);
const ground = (g) => g.player.state === 'ground';
const tx = (g) => g.player.cx / T, ty = (g) => (g.player.y + g.player.h) / T; // feet, in tiles
export const helpers = { ground, tx, ty };

// Wall-jump up a 3-wide # shaft until done(g).
function climb(a, done, first = R) {
  let dir = first;
  a.down(dir).tap(J, 10);
  for (let i = 0; i < 40 && !done(a.g); i++) {
    a.until((g) => g.player.state === 'cling' || ground(g), 90, 'cling');
    if (done(a.g)) break;
    a.up(dir); dir = dir === R ? L : R; a.down(dir).tap(J, 6);
  }
  a.up(dir);
  return a;
}

// ---- link-hall: from the bedroom door frame down to the Bathroom door, then back up with the Booties ----
if (want('hall')) {
  const a = new Author({ room: 'hall-top', x: 3, y: 13, items: ['booties'], party: ['duo'] });
  a.wait(20).down(R).until((g) => tx(g) > 7.6, 120, 'off the ledge').up(R)
    .until((g) => g.room.id === 'hall-floor' && ground(g), 300, 'down the shaft').log('on the shelf')
    .down(R).until((g) => ground(g) && ty(g) > 33.9, 200, 'on the floor').log('floor')
    .until((g) => tx(g) > 60, 900, 'at the bathroom door').up(R).log('bathroom door')
    .down(L).until((g) => tx(g) < 19.6, 900, 'back at the towel step').up(L).wait(2)
    .down(L).tap(J, 14).until((g) => ground(g) && ty(g) < 32.5, 60, 'on the towel step').log('towel step')
    .tap(J, 14).until((g) => ground(g) && ty(g) < 30.5, 60, 'on the shelf').up(L).log('shelf top')
    .down(L).until((g) => tx(g) < 8.6, 120, 'in the shaft').up(L);
  climb(a, (g) => g.room.id === 'hall-top' && ground(g), L);
  a.log('pole top').wait(6).down(R).wait(8).up(R).down(L).until((g) => g.player.x < 384, 60).tap(J, 16)
    .until((g) => ground(g) && tx(g) < 7, 90, 'on the ledge').up(L).log('ledge').end();
  a.save('link-hall', { room: 'hall-top' });
}

// Swing on the current hook pumping toward `dir` and fling (Jump) when the swing reaches `ang`
// (radians from hanging straight down, signed: + = right of the hook) moving that way.
function swingFling(a, dir, ang = 0.7, label = 'fling', minW = 0) {
  a.down(dir === 1 ? R : L);
  if (minW < 0) a.until((g) => { const s = g.player.swing; return s && Math.abs(s.ang) < 0.15; }, 300, `${label}: through the bottom`);
  a.until((g) => { const s = g.player.swing; return g.player.state === 'swing' && s && Math.sign(s.w) === dir && s.ang * dir > ang && Math.abs(s.w) >= Math.abs(minW); }, 400, label);
  a.tap(J, 4);
  return a;
}
// Keep tapping Use until a hook is caught (or `max` frames pass).
function grab(a, max = 60, label = 'grab') {
  for (let i = 0; i < max / 2 && a.g.player.state !== 'swing'; i++) a.tap(USE, 1).wait(1);
  if (a.g.player.state !== 'swing') throw new Error(`${label}: no hook caught ${JSON.stringify(a.state())}`);
  return a;
}
// Climb one-way shelves straight up: hop until standing at or above row `top`.
function hopUp(a, top, max = 12) {
  for (let i = 0; i < max && ty(a.g) > top + 0.1; i++) a.tap(J, 16).until((g) => ground(g), 90, 'hop landed').wait(2);
  return a;
}

// ---- link-stairs: over the baby gate with the Floss, down both flights to the foot of the stairs ----
if (want('stairs')) {
  const a = new Author({ room: 'stair-landing', x: 3, y: 33, items: ['booties', 'floss'], party: ['duo'] });
  a.wait(20).down(R).until((g) => tx(g) > 9.4, 200, 'at the bookcase').up(R).log('bookcase');
  hopUp(a, 24).log('top shelf');
  a.down(R).until((g) => tx(g) > 13.4, 60, 'shelf end').up(R).wait(2).tap(J, 16).wait(4);
  grab(a, 60, 'H1').log('H1');
  swingFling(a, 1, 0.75, 'fling to H2').wait(4);
  grab(a, 60, 'H2').log('H2');
  swingFling(a, 1, 0.75, 'fling to the post').until((g) => ground(g), 90, 'landed past the gate').log('past the gate')
    .until((g) => tx(g) > 27.5, 200, 'ledge').log('picture ledge');
  a.until((g) => g.room.id === 'stair-flight' && ground(g), 300, 'on flight A').log('flight A')
    .until((g) => g.room.id === 'stair-flight' && tx(g) > 55.2, 600, 'end of flight A').up(R).log('turn').wait(4)
    .down(L).until((g) => g.room.id === 'stair-foot' && ground(g) && ty(g) > 33.9, 1200, 'the foot').log('foot')
    .up(L).wait(4).down(R);
  // hop the silverfish on the way to the save crack
  const fish = (g) => g.enemies.find((e) => e.type === 'silverfish' && e.state !== 'flipped' && Math.abs(e.x + e.w / 2 - g.player.cx) < 400);
  for (let i = 0; i < 6 && tx(a.g) < 29.8; i++) {
    a.until((g) => tx(g) > 29.8 || (fish(g) && Math.abs(fish(g).x + fish(g).w / 2 - g.player.cx) < 60 && ground(g)), 400, 'save crack or fish');
    if (tx(a.g) < 29.8) a.tap(J, 14).until(ground, 60, 'hopped');
  }
  a.up(R).log('save crack').end();
  a.save('link-stairs', { room: 'stair-foot' });
}

// ---- link-stairs-glide: from the picture ledge, glide across the stairwell void to the Study door ----
if (want('glide')) {
  const a = new Author({ room: 'stair-landing', x: 30, y: 23, items: ['booties', 'floss', 'raft', 'glider'], party: ['duo'] });
  a.wait(20).down(R).until((g) => tx(g) > 42.2, 200, 'ledge end').down(J).wait(2).log('jump and hold')
    .until((g) => g.room.id === 'stu-door', 600, 'across').wait(10).up(R).up(J).log('in the Study')
    .until(ground, 120, 'landed').log('landed').end();
  a.save('link-stairs-glide', {});
}

// ================================================================================================
// A small frame-by-frame driver: decide(g) returns the set of keys to hold this frame (taps are
// "hold for one decision"); the driver records the key changes.
function drive(a, decide, done, max = 6000, label = 'drive') {
  for (let i = 0; i < max; i++) {
    if (done(a.g)) return a;
    const want = decide(a.g) || new Set();
    if (process.env.TRACE && i % 20 === 0) { const g = a.g, b = g.boss; console.log(i, 'lv', levelOf(g), 'x', tx(g).toFixed(1), 'y', ty(g).toFixed(1), g.player.state, g.player.id, 'hp', g.player.health, b && b.mode, b && b.band, b && b.stones.map((s) => +s.lit + '' + +s.sung).join(','), [...want].join('+')); }
    for (const k of [...a.held]) if (!want.has(k)) a.up(k);
    for (const k of want) if (!a.held.has(k)) a.down(k);
    a.wait(1);
  }
  throw new Error(`${label}: not done after ${max} frames ${JSON.stringify(a.state())}`);
}

// ---- Nana: platforms in att-lair (tiles: x0, x1, surface row) and the way up between them ----
const NP = [
  { n: 'F', x0: 12, x1: 94, y: 34 }, { n: 'L1', x0: 14, x1: 27, y: 32 }, { n: 'L2', x0: 26, x1: 36, y: 30 },
  { n: 'L3', x0: 35, x1: 46, y: 28 }, { n: 'L4', x0: 40, x1: 54, y: 26 }, { n: 'L5', x0: 53, x1: 64, y: 24 }, { n: 'L6', x0: 63, x1: 78, y: 22 },
];
// to climb from level i to i+1: stand at x, then jump holding dir (0 = straight up)
const UP = [{ x: 20, dir: 0 }, { x: 26.9, dir: 0 }, { x: 35.9, dir: 0 }, { x: 43, dir: 0 }, { x: 53.9, dir: 0 }, { x: 63.9, dir: 0 }];
const HIDES = [14, 28, 42, 56, 70, 84];
const BANDS = { low: [27, 34], high: [19, 27] };
function levelOf(g) { const fy = ty(g); let best = 0, bd = 9; NP.forEach((p, i) => { const d = Math.abs(p.y - fy); if (d < bd) { bd = d; best = i; } }); return best; }

function nanaBrain(target) {
  // target(g) -> { level, x, then: 'kick-left'|'kick-right'|'chirp'|null, who? } or null when idle
  const m = { jumpT: 0, tapT: 0, last: null };
  return (g) => {
    const keys = new Set(), p = g.player, b = g.boss, cx = tx(g);
    const press = (k) => { keys.add(k); };
    if (m.jumpT > 0) { m.jumpT--; keys.add(J); if (m.jdir) keys.add(m.jdir); return keys; }
    if (m.tapT > 0) { m.tapT--; return keys; } // a pause between taps
    const grounded = ground(g) || p.state === 'hide';
    // danger: a sweep coming at the band the cricket is in
    if (b && !b.done && b.band && (b.mode === 'tell' || b.mode === 'sweep' || b.mode === 'retract')) {
      const [t0, t1] = BANDS[b.band]; const top = ty(g) - 0.6, bot = ty(g);
      if (bot > t0 && top < t1) {
        if (p.hidden) return keys;
        if (!grounded) return keys;
        if (b.band === 'high' || levelOf(g) > 0) { keys.add(D); keys.add(J); m.jumpT = 3; m.jdir = D; return keys; } // drop through
        const hx = HIDES.reduce((a2, h) => (Math.abs(h + 0.5 - cx) < Math.abs(a2 + 0.5 - cx) ? h : a2));
        if (Math.abs(hx + 0.5 - cx) > 0.3) { keys.add(hx + 0.5 > cx ? R : L); return keys; }
        if (m.last !== 'enter') { m.last = 'enter'; keys.add(D); m.tapT = 2; return keys; } // [issue #27] Enter: ↓
        m.last = null; return keys;
      }
    }
    m.last = null;
    const t = target(g);
    if (!t || !grounded) return keys;
    if (t.who && p.id !== t.who) { if (p.queuedSwap == null) { keys.add(SWAPN); m.tapT = 6; } return keys; }
    const lv = levelOf(g);
    if (lv > t.level) { // [fixer] walk toward the target while still over this platform, then drop to the one below
      const dx = Math.max(NP[lv].x0 + 0.6, Math.min(NP[lv].x1 - 0.6, t.x));
      if (lv > 0 && Math.abs(cx - dx) > 0.3) { keys.add(dx > cx ? R : L); return keys; }
      keys.add(D); keys.add(J); m.jumpT = 3; m.jdir = D; return keys;
    }
    if (lv < t.level) {
      const u = UP[lv];
      const busy = b && !b.done && b.band && b.mode !== 'idle';
      const nb = (lvl) => busy && NP[lvl].y > BANDS[b.band][0] && NP[lvl].y - 3 < BANDS[b.band][1];
      const nextLow = b && b.sweeps % 2 === 0, lowLv = (lvl) => NP[lvl].y > 27;
      if (nb(lv + 1) || (b && !b.done && b.mode === 'idle' && b.cool < 60 && lowLv(lv + 1) === nextLow)) return keys; // wait for the sweep to pass
      if (Math.abs(cx - u.x) > 0.25) { keys.add(u.x > cx ? R : L); return keys; }
      m.jumpT = 16; m.jdir = u.dir > 0 ? R : u.dir < 0 ? L : null; keys.add(J); if (m.jdir) keys.add(m.jdir); return keys;
    }
    if (Math.abs(cx - t.x) > 0.2) { keys.add(t.x > cx ? R : L); return keys; }
    if (t.then === 'kick-left' || t.then === 'kick-right') {
      if ((t.then === 'kick-left') !== (p.facing < 0)) { keys.add(t.then === 'kick-left' ? L : R); return keys; }
      keys.add(KICK); m.tapT = 8; return keys;
    }
    if (t.then === 'chirp') { keys.add(CHIRP); m.tapT = 20; return keys; }
    return keys;
  };
}

// ---- zone-10-boss: Nana with Mote, Duo and Digby (the weakest trio covering the three voices) ----
if (want('boss')) {
  const ALL = ['booties', 'floss', 'raft', 'band', 'glider', 'thimble', 'glow', 'earplugs', 'feather'];
  const NINE = ['stripe', 'katy', 'duo', 'frost', 'hump', 'jam', 'rin', 'digby', 'mote'];
  const a = new Author({ room: 'att-lair', x: 88, y: 33, items: ALL, party: ['mote', 'duo', 'digby'], rescued: NINE });
  const stone = (g, id) => g.boss.stones.find((s) => s.id === id);
  // phase 1: kick the fork (L1, from its right), the glass (L4, from its left), the bell (L6, from its left)
  drive(a, nanaBrain((g) => {
    if (!stone(g, 'fork').lit) return { level: 1, x: 17.6, then: 'kick-left' };
    if (!stone(g, 'glass').lit) return { level: 4, x: 49.3, then: 'kick-right' };
    if (!stone(g, 'bell').lit) return { level: 6, x: 74.3, then: 'kick-right' };
    return null;
  }), (g) => g.boss.phase >= 2, 9000, 'phase 1');
  a.log('phase 2');
  drive(a, nanaBrain((g) => {
    // [fixer] nearest first: phase 1 ends by the bell, so bell -> glass -> fork (one trip down)
    if (!stone(g, 'bell').sung) return { level: 6, x: 73.5, then: 'chirp', who: 'mote' };
    if (!stone(g, 'glass').sung) return { level: 5, x: 55, then: 'chirp', who: 'duo' };   // the stones hear 9 tiles now
    if (!stone(g, 'fork').sung) return { level: 1, x: 20, then: 'chirp', who: 'digby' };
    return null;
  }), (g) => g.boss.phase >= 3, 9000, 'phase 2');
  a.log('phase 3');
  // the chorus: chirp on every beat
  const b = a.g.boss;
  for (let k = 0; k < 16; k++) { a.until((g) => g.frame >= b.beat0 + k * 50 - 1, 400, `beat ${k}`).tap(CHIRP, 2); }
  a.log(`chorus ${b.hits} hits`).until((g) => g.levelComplete, 600, 'Nana asleep').log('Chip is free').end();
  a.save('zone-10-boss', { levelComplete: true });
}

// ---- zone-10-path: the chimney top -> the bat roost -> the rafters -> the attic fan -> the box mountain -> Nana's door ----
function runTo(a, x, dir, max = 900, label = `x ${x}`) {
  a.down(dir).until((g) => (dir === R ? tx(g) >= x : tx(g) <= x), max, label);
  return a;
}
if (want('path')) {
  const ALL = ['booties', 'floss', 'raft', 'band', 'glider', 'thimble', 'glow', 'earplugs', 'feather'];
  const NINE = ['stripe', 'katy', 'duo', 'frost', 'hump', 'jam', 'rin', 'digby', 'mote'];
  const a = new Author({ room: 'att-entry', items: ALL, party: ['duo', 'digby', 'mote'], rescued: NINE });
  // the bat roost: through the loud passage (Earplugs) to the rafters
  a.wait(20);
  runTo(a, 1, L, 900, 'through the roost').until((g) => g.room.id === 'att-rafters', 200, 'into the rafters').log('rafters');
  // the nail gap: glide
  runTo(a, 108.3, L, 300, 'gap edge').down(J).wait(2).until((g) => ground(g), 300, 'glided over').up(J).log('over the nails');
  // under post A into the shaft, wall-jump up between the posts
  runTo(a, 85.5, L, 400, 'in the shaft').up(L);
  climb(a, (g) => ground(g) && ty(g) < 15, L);
  a.log('top of the posts');
  if (tx(a.g) > 83) { a.down(R).wait(10).up(R).down(L).until((g) => g.player.x < 87 * T - 16, 60).tap(J, 16).until((g) => ground(g), 60, 'over the shaft').up(L).log('beam'); }
  runTo(a, 56.6, L, 900, 'beam end').up(L).wait(2).tap(J, 16).wait(2);
  grab(a, 60, 'nail 1').log('nail 1');
  swingFling(a, -1, 0.75, 'fling to beam 2');
  if (process.env.TRACE) for (let i = 0; i < 60; i += 6) { a.wait(6); a.log('fl'); }
  a.until(ground, 120, 'beam 2').up(L).log('beam 2');
  runTo(a, 30.4, L, 600, 'beam 2 end').down(J).wait(2).until((g) => g.room.id === 'att-insulation', 400, 'glide to the insulation').up(J).log('insulation');
  a.until(ground, 200, 'landed');
  // the posts' tops, the nails, the joist
  runTo(a, 88.2, L, 900, 'post 2').down(L).until((g) => g.player.x < 87 * T - 16, 60).tap(J, 16).until(ground, 60, 'over the shaft').log('post 1 cap');
  runTo(a, 79.4, L, 200, 'cap edge').up(L).wait(2).down(L).tap(J, 16).up(L);
  grab(a, 60, 'insulation nail 1').log('nail 1');
  swingFling(a, -1, 0.5, 'fling to the joist', 3);
  if (process.env.TRACE) for (let i = 0; i < 60; i += 6) { a.wait(6); a.log('fl'); }
  a.until(ground, 160, 'joist').up(L).log('joist');
  runTo(a, 46.2, L, 600, 'joist end').up(L).down(L).tap(J, 18).wait(4).tap(J, 14).until(ground, 120, 'on the wall').up(L).log('over the wall');
  // down to the fan; hop the ant soldier
  const ant = (g) => g.enemies.find((e) => e.type === 'antsoldier' && Math.abs(e.x - g.player.x) < 800);
  a.down(L).until((g) => ground(g) && ty(g) > 33.9, 200, 'by the fan');
  for (let i = 0; i < 6 && a.g.room.id === 'att-insulation'; i++) {
    a.until((g) => g.room.id !== 'att-insulation' || (ant(g) && ant(g).state !== 'flipped' && ant(g).x < g.player.x && g.player.x - ant(g).x < 70 && ground(g)), 600, 'fan or ant');
    if (a.g.room.id === 'att-insulation') a.tap(J, 16).until(ground, 60, 'hopped');
  }
  a.until((g) => g.room.id === 'att-boxes', 300, 'boxes').up(L).log('boxes');
  // the box mountain: super-jump the smooth box
  a.until(ground, 60).down(L).until((g) => tx(g) < 107.2, 300, 'box 1').up(L).wait(4)
    .down(USE).wait(30).down(L).up(USE).until((g) => ground(g) && ty(g) < 27.5, 120, 'on box 1').up(L).log('box 1');
  runTo(a, 100.3, L, 200, 'box 1 edge').down(J).wait(2).until(ground, 300, 'glided to box 2').up(J).log('box 2');
  runTo(a, 74.3, L, 400, 'box 2 edge').down(J).wait(2).until(ground, 300, 'glided to box 3').up(J).log('box 3');
  for (let i = 0; i < 7; i++) {
    const top = 28 - 2 * i, edge = 50 - 4 * i + 0.4;
    runTo(a, edge, L, 300, `step ${top}`).tap(J, 16).until((g) => ground(g) && ty(g) <= top + 0.05, 90, `onto ${top}`);
  }
  runTo(a, 11.6, L, 400, 'the hole in the lid').tap(J, 16).until((g) => ground(g) && tx(g) < 8, 90, 'over the hole').log('over the hole');
  runTo(a, 3.5, L, 600, 'Nana\'s door').up(L).log('at the door').end();
  a.save('zone-10-path', { room: 'att-boxes' });
}

// ---- link-chimney: from the hearth's smoke shelf up the flue (jump + flutter, lip to lip), through
// the damper (nine home), up the chimney top and left into the Attic ----
if (want('chimney')) {
  const ALL = ['booties', 'floss', 'raft', 'band', 'glider', 'thimble', 'glow', 'earplugs', 'feather'];
  const NINE = ['stripe', 'katy', 'duo', 'frost', 'hump', 'jam', 'rin', 'digby', 'mote'];
  const a = new Author({ room: 'liv-hearth', x: 12, y: 1, items: ALL, party: ['duo'], rescued: NINE });
  a.wait(20);
  const hop = () => {
    const left = tx(a.g) < 16, d = left ? R : L, y0 = ty(a.g), room = a.g.room.id;
    // walk to the inner edge of the lip, then jump and flutter at the top of the jump
    a.down(d).until((g) => (left ? g.player.x + g.player.w > 14 * T + 4 : g.player.x < 18 * T - 4), 60, 'lip edge');
    a.tap(J, 17).tap(J, 14).until((g) => ground(g) && (g.room.id !== room || ty(g) < y0 - 1), 120, 'next lip').up(d);
    if (process.env.TRACE) a.log('lip');
  };
  for (let i = 0; i < 40 && !(a.g.room.id === 'chim-top' && ty(a.g) <= 33); i++) hop();
  a.log('at the attic gap');
  runTo(a, 2, L, 300, 'the gap').until((g) => g.room.id === 'att-entry', 200, 'into the attic').up(L).log('attic').end();
  a.save('link-chimney', { room: 'att-entry' });
}

// ---- link-stairs-pelmet: from a step halfway down, glide out through the spindles onto the Living Room's curtain pelmet ----
if (want('pelmet')) {
  const a = new Author({ room: 'stair-flight', x: 50, y: 21, items: ['booties', 'floss', 'raft', 'glider'], party: ['duo'] });
  a.wait(20).down(R).until((g) => tx(g) > 51.5, 60, 'step edge').down(J).wait(2).log('jump and glide')
    .until((g) => g.room.id === 'liv-armchair', 400, 'into the living room').wait(4).up(J).up(R).until(ground, 200, 'landed').log('pelmet').end();
  a.save('link-stairs-pelmet', { room: 'liv-armchair' });
}
