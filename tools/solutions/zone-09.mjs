// Builder C: records the Basement's solutions with the headless sim (tools/author.mjs):
//   design/solutions/zone-09-path.json  bas-stairs -> the Swift Feather -> the coal-chute lair door
//   design/solutions/zone-09-boss.json  Ember's den, all three phases
//   node tools/solutions/zone-09.mjs [path|boss|chute]
import { Author } from '../author.mjs';
import { ZONE_INFO } from '../../game/data/zones.js';
const R = 'ArrowRight', L = 'ArrowLeft', U = 'ArrowUp', D = 'ArrowDown', J = 'KeyZ', KICK = 'KeyX', CHIRP = 'KeyC', USE = 'KeyV';
const T = 40;
const only = process.argv[2];
const want = (n) => !only || n === only;
const ITEMS = ZONE_INFO[9].minItems[0];
const ground = (g) => g.player.state === 'ground';
const tx = (g) => g.player.cx / T, ty = (g) => (g.player.y + g.player.h) / T; // feet row (stand row + 1)
const inRoom = (id) => (g) => g.room.id === id;
export { R, L, U, D, J, KICK, CHIRP, USE, T, ground, tx, ty, inRoom, ITEMS };

// Grab hook at column hx when it comes within reach (Use is buffered 120 ms) (as tools/solutions/sandbox.mjs).
function swingTo(a, hx, approach) {
  if (approach) approach();
  const near = (g) => g.hooks.some((h) => Math.abs(h.x - (hx + 0.5) * T) < 1 && Math.hypot(h.x - g.player.cx, h.y - g.player.cy) < 60);
  a.until((g) => g.player.state === 'swing' || near(g), 150, 'hook ' + hx);
  if (a.p.state !== 'swing') a.tap(USE, 3);
  a.until((g) => g.player.state === 'swing', 20, 'grabbed ' + hx).log('grabbed hook ' + hx);
}
// Pump until the swing is big, then fling toward dir past angle `at` (rad).
function pumpAndFling(a, dir, at, minW = 2.4) {
  a.up(R, L);
  let cur = null;
  for (let i = 0; i < 400; i++) {
    const s = a.p.swing; if (!s) break;
    const want = s.w > 0 ? R : L;
    if (want !== cur) { if (cur) a.up(cur); a.down(want); cur = want; }
    a.wait(1);
    if (i > 30 && Math.sign(s.w) === dir && dir * s.ang > at && Math.abs(s.w) > minW) break;
  }
  if (cur) a.up(cur);
  a.down(dir > 0 ? R : L).tap(J, 3).log('fling');
}

if (want('path')) {
  const a = new Author({ room: 'bas-stairs', items: ITEMS, party: ['pip'] });
  const p = () => a.g.player;
  const em = a.g.emit.bind(a.g);
  if (process.env.TRACE) { const st = a._step.bind(a); const [f0, f1] = process.env.TRACE.split(',').map(Number); a._step = (n = 1) => { for (let i = 0; i < n; i++) { st(1); if (a.f >= f0 && a.f <= f1 && a.f % 3 === 0) { const g = a.g; console.log(a.f, g.player.state, (g.player.cx / T).toFixed(2), ((g.player.y + g.player.h) / T).toFixed(2), g.enemies.filter((e) => e.type === 'beetle').map((e) => `${((e.x + e.w / 2) / T).toFixed(1)},${((e.y + e.h) / T).toFixed(1)},${e.dir}`).join(' ')); } } }; }
  a.g.emit = (t, d = {}) => { if (t === 'hurt' || t === 'pit') { const g = a.g; const near = (g.enemies || []).map((e) => [e.type, Math.round(Math.hypot(e.x + e.w / 2 - g.player.cx, e.y + e.h / 2 - g.player.cy))]).sort((x, y) => x[1] - y[1])[0]; console.log('   HURT', t, g.room.id, a.f, Math.round(g.player.cx / T), Math.round(g.player.cy / T), JSON.stringify(near)); } return em(t, d); };
  a.wait(20).log('start');
  // down the three flights
  a.down(R).until((g) => ground(g) && ty(g) > 15.5 && tx(g) > 54, 900, 'landing 1').log('landing 1').up(R)
    .down(L).until((g) => ground(g) && ty(g) > 34.5 && tx(g) < 10, 900, 'landing 2').log('landing 2').up(L)
    .down(R).until(inRoom('bas-storage'), 900, 'storage').log('storage');
  // the beetle sneak: hide in the lids and flaps as each beetle plods past; flash the centipede
  const floorBeetles = (g) => g.enemies.filter((e) => e.type === 'beetle' && Math.abs(e.y + e.h - (g.player.y + g.player.h)) < 2.5 * T);
  const bx = (e) => e.x + e.w / 2;
  const open = (g, e) => { const r = Math.floor((e.y + e.h - 4) / T); for (let c = Math.floor(g.player.cx / T); c <= Math.floor(bx(e) / T); c++) if (g.grid.at(c, r) !== 0) return false; return true; };
  const threat = (g) => floorBeetles(g).find((e) => bx(e) > g.player.cx - 10 && bx(e) - g.player.cx < 7 * T && e.dir < 0 && open(g, e));
  const tail = (g) => floorBeetles(g).find((e) => bx(e) > g.player.cx && bx(e) - g.player.cx < 3 * T && e.dir > 0);
  var boxAhead = (g) => { const c = Math.floor((g.player.cx + 30) / T), r = Math.floor((g.player.y + g.player.h - 2) / T); return g.grid.at(c, r) !== 0; };
  var centi = (g) => g.enemies.find((e) => e.type === 'centipede' && !(e.stun > 0) && Math.hypot(e.x + e.w / 2 - g.player.cx, e.y + e.h / 2 - g.player.cy) < 3.8 * T);
  for (let i = 0; i < 200 && a.g.room.id === 'bas-storage'; i++) {
    a.down(R).until((g) => g.room.id !== 'bas-storage' || (ground(g) && (threat(g) || tail(g) || boxAhead(g) || centi(g))), 900, 'something ahead').up(R);
    const g = a.g;
    if (g.room.id !== 'bas-storage') break;
    if (process.env.DBG) console.log('why', !!threat(g), !!tail(g), boxAhead(g), !!centi(g), a.f, (g.player.cx / T).toFixed(2));
    if (centi(g)) { a.tap(USE, 3).wait(3).log('flash the centipede'); continue; }
    if (threat(g)) {
      const b = threat(g);
      const spot = g.hideSpots.filter((h) => h.x + h.w / 2 < bx(b) - 1.2 * T && h.x + h.w / 2 > g.player.cx - 4 * T).sort((x, y) => Math.abs(x.x + x.w / 2 - g.player.cx) - Math.abs(y.x + y.w / 2 - g.player.cx))[0];
      if (spot) {
        const sx = spot.x + spot.w / 2, k = sx > g.player.cx ? R : L;
        if (Math.abs(sx - g.player.cx) > 8) a.down(k).until((gg) => Math.abs(sx - gg.player.cx) < 8, 120, 'to the hiding spot').up(k);
        a.wait(2).tap(D, 3).until((gg) => gg.player.hidden, 20, 'hidden').log('hide');
        a.until((gg) => bx(b) < gg.player.cx - 1.6 * T, 900, 'beetle passed').log('beetle passed');
        continue;
      }
      a.until((gg) => !threat(gg), 1200, 'beetle turns back'); continue;
    }
    if (tail(g)) { // hop it from behind: it plods away slower than you run
      const b = tail(g);
      a.down(R).until((gg) => b.dir < 0 || b.x - (gg.player.x + gg.player.w) < 30, 300, 'close behind');
      if (b.dir > 0) a.tap(J, 18).until(ground, 90, 'hopped').log('hop a beetle'); else a.up(R);
      continue;
    }
    if (boxAhead(g)) a.down(R).tap(J, 12).until(ground, 90, 'on the box');
  }
  a.up(R).log('workbench');
  // the pegboard: tin -> three hooks -> the vise -> three hooks -> the floor past the screws
  a.down(R).until((g) => g.player.cx > 25.6 * T, 400, 'by the tin').tap(J, 12).until((g) => ground(g) && ty(g) < 32.5, 60, 'on the tin').up(R).log('tin');
  swingTo(a, 31, () => a.down(R).until((g) => g.player.cx > 28.2 * T, 30).tap(J, 16));
  pumpAndFling(a, 1, 0.5, 3.2); swingTo(a, 36);
  pumpAndFling(a, 1, 0.5, 3.2); swingTo(a, 41);
  pumpAndFling(a, 1, 0.3);
  a.until((g) => ground(g), 120, 'on the vise').up(R).log('vise');
  swingTo(a, 52, () => a.down(R).until((g) => g.player.cx > 48.3 * T, 60, 'vise edge').tap(J, 16));
  pumpAndFling(a, 1, 0.5, 3.2); swingTo(a, 57);
  pumpAndFling(a, 1, 0.5, 3.2); swingTo(a, 62);
  pumpAndFling(a, 1, 0.3);
  a.until((g) => ground(g), 120, 'past the screws').log('past the screws');
  a.down(R).until(inRoom('bas-sump'), 600, 'sump').log('sump');
  // the sump: ride the raft with the current; flash the centipede when it dips to the water
  for (let i = 0; i < 10 && a.g.room.id === 'bas-sump'; i++) {
    a.until((g) => g.room.id !== 'bas-sump' || centi(g) || (ground(g) && boxAhead(g)), 1200, 'across the sump');
    if (centi(a.g)) a.tap(USE, 3).log('flash');
    else if (a.g.room.id === 'bas-sump') a.tap(J, 12).until(ground, 90, 'over the pump');
  }
  a.log('coal bin');
  a.until(inRoom('bas-furnace'), 900, 'furnace').log('furnace');
  // the cold-air return: wall-jump up the 4-wide shaft, out onto the right-hand duct ledge
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
  // ride the warm air up and drift right onto the flue walkway, then along it into the chimney base
  a.until((g) => ty(g) < 13, 400, 'lifted').down(R).until((g) => ground(g) && ty(g) < 14.5, 120, 'walkway').log('walkway')
    .until(inRoom('bas-chimney'), 400, 'chimney base').log('chimney base')
    .until((g) => g.player.has('feather'), 300, 'feather').up(R).log('FEATHER');
  // back: the walkway, off its end onto the furnace, the duct ledge, down the shaft, out left
  a.down(L).until(inRoom('bas-furnace'), 300, 'furnace again')
    .until((g) => ground(g) && ty(g) > 28 && g.player.cx < 30.5 * T, 400, 'off the furnace')
    .until((g) => g.player.cx < 15.2 * T, 300, 'shaft top').up(L).until(ground, 200, 'shaft foot').log('shaft foot')
    .down(L).until(inRoom('bas-coal'), 600, 'coal bin again').log('coal bin')
    .until((g) => g.player.cx < 50 * T, 600, 'chute foot').up(L).wait(30).log('lair door');
  a.end();
  a.save('zone-09-path', {});
}

// The coal chute: from the lair door, up the heap and the four soot lips into Ember's den (the
// Swift Feather's flutter). Not saved (the boss solution starts in the den); proves the climb.
export function climbChute(a, cricket = 'pip') {
  if (process.env.CTRACE) { const st = a._step.bind(a); a._step = (n = 1) => { for (let i = 0; i < n; i++) { st(1); console.log(a.f, a.p.state, (a.p.cx / T).toFixed(2), ty(a.g).toFixed(2), Math.round(a.p.vy), [...a.sim.input ? [] : []].length); } }; }
  void cricket;
  a.down(L).until((g) => g.player.cx < 13.6 * T, 600, 'heap foot').up(L).wait(4);
  a.down(R);
  for (let i = 0; i < 8; i++) a.tap(J, 14).until((g) => ground(g), 90, 'lump ' + i);
  a.until((g) => g.player.cx > 45.6 * T, 200, 'heap edge').up(R).log('heap top');
  const lip = (dir, stand, label) => {
    // straight up, flutter at the top, then drift over the lip
    a.tap(J, 16).wait(1).until((g) => g.player.vy >= -60, 60, 'apex').down(J).wait(4).down(dir)
      .until((g) => ground(g), 150, label).up(dir, J).log(label);
    if (ty(a.g) > stand + 1.1) throw new Error(`missed ${label}: feet at ${ty(a.g)}`);
    // step to the lip's open end (out from under its soot overhang)
    if (dir === R) a.down(L).until((g) => g.player.cx < 48.45 * T, 40, 'open end').up(L);
    else a.down(R).until((g) => g.player.cx > 46.55 * T, 40, 'open end').up(R);
    a.wait(3);
  };
  lip(R, 14, 'lip 1');
  lip(L, 10, 'lip 2');
  lip(R, 6, 'lip 3');
  lip(L, 2, 'lip 4');
  a.down(L).tap(J, 16).wait(1).until((g) => g.player.vy >= -60, 60, 'apex').tap(J, 14).until((g) => g.room.id === 'bas-lair' && ground(g), 120, 'den').up(L).log('den');
}
if (want('chute')) {
  for (const who of ['pip', 'duo', 'digby', 'rin']) {
    const a = new Author({ room: 'bas-coal', x: 49, y: 33, items: [...ITEMS, 'feather'], party: [who] });
    climbChute(a);
    console.log('chute OK for', who);
  }
}

// Ember's den: through the coal tunnel to the far-left steps, then flash her eyes when they come
// close and run while she's dazzled; at the crack, flash and kick it three times.
if (want('boss')) {
  const a = new Author({ room: 'bas-lair', x: 42, y: 15, items: [...ITEMS, 'feather'], party: ['pip'] });
  const B = () => a.g.boss;
  const eyeNear = (g, d) => { const b = g.boss; const e = { x: b.x + b.facing * 52, y: b.y - 90 }; return Math.hypot(e.x - g.player.cx, e.y - g.player.cy) < d * T; };
  const watch = () => { if (a.p.health <= 1) throw new Error('nearly lost: ' + JSON.stringify(a.state())); };
  a.wait(10).down(L).until((g) => g.player.cx < 6.5 * T, 600, 'tunnel end').up(L).wait(4).log('tunnel end');
  // the coal steps up at the far left
  a.down(L).tap(J, 12).until(ground, 60).up(L).log('step 1')
    .down(L).tap(J, 12).until((g) => ground(g) && ty(g) < 12.5, 60, 'step 2').up(L).log('step 2')
    .down(R).tap(J, 12).until((g) => ground(g) && ty(g) < 10.5, 60, 'step 3').log('step 3')
    .tap(J, 10).until((g) => ground(g) && ty(g) < 9.5, 60, 'den floor').up(R).log('den floor (phase 1)');
  // run right; flash when her eyes come close; keep running through while she's dazzled
  const runFlash = (goal, label) => {
    a.down(R);
    for (let i = 0; i < 20; i++) {
      a.until((g) => goal(g) || (B().mode !== 'dazed' && eyeNear(g, 3.6)), 900, label);
      watch();
      if (goal(a.g)) break;
      a.tap(USE, 3).log('flash (' + B().mode + ')');
    }
    a.log(label);
  };
  runFlash((g) => g.boss.phase >= 2, 'the middle (phase 2)');
  runFlash((g) => g.boss.phase >= 3, 'the crack (phase 3)');
  a.until((g) => ground(g) && g.player.cx > 92.6 * T, 200, 'at the crack').up(R).log('at the crack');
  // wait for her (she sees you in the light), flash, then three kicks
  for (let i = 0; i < 10 && !a.g.boss.done; i++) {
    a.until((g) => g.boss.mode !== 'dazed' && eyeNear(g, 3.6), 1200, 'Ember close'); watch();
    a.tap(USE, 3).wait(2).log('flash at the crack (' + B().mode + ')');
    if (B().mode !== 'dazed') continue;
    for (let k = 0; k < 3 && !a.g.boss.done; k++) {
      const upTo = (n) => { for (let i = 0; i < n && !a.g.boss.done; i++) a.wait(1); };
      a.down(KICK); upTo(3); a.up(KICK);
      upTo(12);
    }
    a.log('kicks ' + B().kicks);
  }
  if (!a.g.levelComplete) throw new Error('not rescued');
  a.up(...a.held);
  a.save('zone-09-boss', { levelComplete: true });
}
