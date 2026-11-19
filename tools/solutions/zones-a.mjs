// [builder A] Authors the recorded solutions for zones 0-3 with the headless sim:
//   node tools/solutions/zones-a.mjs [filter]
// zone-00-path (the tank escape), zone-01-path / -boss, zone-02-path / -boss, zone-03-path / -boss.
import { Author } from '../author.mjs';
const R = 'ArrowRight', L = 'ArrowLeft', U = 'ArrowUp', D = 'ArrowDown', J = 'KeyZ', KICK = 'KeyX', CHIRP = 'KeyC', USE = 'KeyV';
const T = 40;
const only = process.argv[2];
const want = (n) => !only || n.includes(only);
const ground = (g) => g.player.state === 'ground';
const at = (x) => (g) => g.player.cx >= x * T;
const atL = (x) => (g) => g.player.cx <= x * T;
// walk to a column (tile units, centre) and stop there
function walkTo(a, x, label = `col ${x}`, max = 900) {
  const p = a.p;
  if (p.cx < x * T) a.down(R).until((g) => g.player.cx >= x * T - 6, max, label).up(R);
  else a.down(L).until((g) => g.player.cx <= x * T + 6, max, label).up(L);
  return a.wait(3);
}
// a full jump toward a direction, held for n frames
function hop(a, dir, n = 16) { a.down(dir).tap(J, n); return a; }


// Jump onto a platform: run toward column x, jump (held), steer, land standing on row `row`
// (the tile the feet rest on). Fails loudly if it doesn't land there.
function jumpTo(a, x, row, o = {}) {
  const g = a.g, p = () => g.player;
  const tx = x * T;
  const dir0 = Math.sign(tx - p().cx);
  const key = dir0 > 0 ? R : L;
  if (o.run && dir0) { a.down(key); for (let i = 0; i < 40 && Math.abs(tx - p().cx) > o.run * T; i++) a.wait(1); }
  a.down(J);
  let held = true, dirHeld = !!dir0;
  if (dir0 && !o.run) a.down(key);
  const up = Math.round((p().y + p().h) / T) - row;
  if (o.delay == null && up >= 2 && Math.abs(tx - p().cx) > 0.8 * T) o = { ...o, delay: 9 };
  if (o.delay) { if (dirHeld) { a.up(key); dirHeld = false; } a.wait(o.delay); if (dir0) { a.down(key); dirHeld = true; } }
  let f = 0;
  for (; f < (o.max || 120); f++) {
    a.wait(1);
    const pl = p();
    if (held && f > (o.hold ?? 18)) { a.up(J); held = false; }
    const d = tx - pl.cx;
    if (dirHeld && Math.sign(d) !== dir0) { a.up(key); dirHeld = false; }
    if (!dirHeld && Math.abs(d) > 10 && f > 3 && pl.state === 'air' && !o.noSteer) { const k2 = d > 0 ? R : L; a.down(k2); a.wait(1); a.up(k2); }
    if (f > 4 && pl.state === 'ground') break;
  }
  if (held) a.up(J);
  if (dirHeld) a.up(key);
  a.wait(2);
  const feetRow = Math.round((p().y + p().h) / T);
  if (feetRow !== row) throw new Error(`jumpTo(${x}, ${row}): landed on row ${feetRow} at ${JSON.stringify(a.state())}`);
  return a;
}
// Autopilot along a floor: hold a direction; kick bugs that come close in front; hop when
// blocked by a step. Stops when cond(g) is true.
function travel(a, dir, cond, max = 1500, label = 'travel') {
  const key = dir > 0 ? R : L;
  a.down(key);
  let stuck = 0, jumping = 0;
  for (let f = 0; f < max; f++) {
    if (cond(a.g)) { a.up(key); if (jumping) a.up(J); return a.wait(2); }
    const p = a.p;
    const foe = (a.g.enemies || []).find((e) => !['flipped', 'scurry', 'gone'].includes(e.state) && !e.stun && Math.abs(e.y + (e.h || 20) / 2 - p.cy) < 30 && (e.x + (e.w || 30) / 2 - p.cx) * dir > 0 && Math.abs(e.x + (e.w || 30) / 2 - p.cx) < 62);
    if (foe && p.kickT === 0 && p.grounded) { a.tap(KICK, 2); continue; }
    if (jumping) { jumping--; if (jumping === 0) a.up(J); }
    if (p.grounded && Math.abs(p.vx) < 20) stuck++; else stuck = 0;
    if (stuck > 3 && !jumping) { a.down(J); jumping = 18; stuck = 0; }
    a.wait(1);
  }
  throw new Error(`${label}: timed out at ${JSON.stringify(a.state())}`);
}
// Wall-jump up a shaft: cling to the wall on side `first` (-1 left / 1 right), then kick back and
// forth until cond(g).
function wallClimb(a, first, cond, max = 30, exit = 0) {
  let d = first;
  const k = (x) => (x > 0 ? R : L);
  a.down(k(d)).down(J).wait(10).up(J);
  for (let i = 0; i < max; i++) {
    a.until((g) => g.player.state === 'cling' || cond(g) || g.player.state === 'ground', 90, `cling ${i}`);
    if (cond(a.g)) { a.up(k(d)); if (exit) { a.down(k(exit)); a.until((g) => g.player.state === 'ground', 90, 'off the wall'); a.up(k(exit)); } return a.wait(2); }
    if (a.p.state === 'ground') { a.down(J).wait(10).up(J); continue; }
    a.up(k(d)); d = -d; a.down(J).wait(2).down(k(d)).wait(10).up(J);
  }
  a.up(k(d));
  if (!cond(a.g)) throw new Error(`wallClimb: ${JSON.stringify(a.state())}`);
  return a;
}

// drop down through one-way platforms (Down + Jump) until cond
function dropDown(a, cond, max = 20) {
  for (let i = 0; i < max && !cond(a.g); i++) { a.until((g) => g.player.state === 'ground' || cond(g), 120, 'drop'); if (cond(a.g)) break; a.down(D).tap(J, 3).up(D).wait(12); }
  return a;
}

// a ladder of platforms: [[x, row], ...]
function climb(a, steps, o = {}) { for (const [x, row, oo] of steps) { if (oo?.from != null) walkTo(a, oo.from); jumpTo(a, x, row, { ...o, ...(oo || {}) }); } return a; }

export { jumpTo, climb, R, L, U, D, J, KICK, CHIRP, USE, T, walkTo, hop, ground, at, atL, want };

// ---------------------------------------------------------------- zone 0: the tank escape
if (want('zone-00')) {
  const a = new Author({ room: 'tank-cup', items: [], party: ['pip'] });
  const cup = (g) => g.boss;
  a.wait(5).log('start');
  // dodge the three dips: stand away from where the shadow is
  for (let i = 0; i < 3; i++) {
    a.until((g) => cup(g).mode === 'aim', 400, `aim ${i}`).log(`aim ${i} at ${Math.round(a.g.boss.x)}`);
    const x = a.g.boss.x / T;
    const safe = x < 13 ? 15 : x > 15 ? 12.6 : 12.4;
    walkTo(a, safe);
    a.until((g) => cup(g).mode === 'up', 200, `dip ${i}`).log(`dip ${i} done, caught ${a.g.boss.caught}`);
  }
  a.until((g) => cup(g).done, 200, 'tongs gone').wait(10);
  walkTo(a, 15.2);
  a.down(R).tap(J, 22).until(ground, 120, 'out of the cup').log('out');
  a.until((g) => g.room.id === 'tank-sand', 300, 'to the sand').log('sand');
  // past Duchess (asleep); hop the ripples and berms
  a.until((g) => g.player.cx > 16 * T, 300, 'by her').tap(J, 8).wait(30)
   .until((g) => g.player.cx > 28.5 * T, 300, 'berm 1').tap(J, 14).wait(20)
   .until((g) => g.player.cx > 38.5 * T, 300, 'ripple').tap(J, 10).wait(20)
   .until((g) => g.player.cx > 46.5 * T, 300, 'berm 2').tap(J, 14)
   .until((g) => g.player.cx >= 52 * T, 300, 'past berm 2').up(R).log('at 52');
  // [issue 7] Duchess hunts: she lunges at him behind berm 2 (the tell is taught), then he hides in the
  // log until she sniffs, shrugs and turns away: the exit opens. (The hunt made the tank 239 frames
  // longer: full-run.mjs's G0, the Bedroom's start frame, moved with it.)
  a.until((g) => g.boss.lunges >= 1 && g.boss.mode !== 'lunge', 900, 'her first lunge').log(`her first lunge ended (${a.g.boss.catches} catches)`);
  walkTo(a, 58.5, 'the log');
  for (let i = 0; i < 20 && a.p.state !== 'hide'; i++) a.tap(D, 2).wait(2); // [issue #27] Enter: ↓
  a.until((g) => g.player.state === 'hide', 1, 'hidden').log('hidden in the log');
  a.until((g) => g.rs('tank-sand').taken.has('duchess-asleep'), 900, 'she loses him').log('she has lost him');
  a.down(R).until((g) => g.room.id === 'tank-decor', 400, 'to the decor').up(R).log('decor');
  walkTo(a, 4);
  climb(a, [[7, 32], [12, 32]]);
  climb(a, [[17, 30, { from: 13.5 }], [26, 28, { from: 22.8, delay: 2 }], [26.5, 26], [26.5, 24], [22, 22, { from: 25.3, delay: 2 }]]).log('under the pebble');
  // kick the pebble off the ledge above: jump, kick at the top
  walkTo(a, 23.3);
  a.down(R).wait(1).up(R).down(J).wait(15).tap(KICK, 3).wait(8).up(J).until(ground, 90, 'land').log('kicked');
  a.until((g) => g.boss.mode === 'step', 120, 'the step').wait(5);
  walkTo(a, 22);
  climb(a, [[23, 20], [26, 18]]).log('ledge'); // [final-G] the 2x2 pebble step (row 20)
  climb(a, [[22.5, 16, { from: 24.5, delay: 2 }], [26, 14, { from: 22.8, delay: 2 }], [22, 12, { from: 25.3, delay: 2 }], [26, 10, { from: 22.8, delay: 2 }], [22, 8, { from: 25.3, delay: 2 }], [17, 6, { from: 20.4, delay: 2 }], [16, 4], [16, 2]]).log('top of the decor');
  a.down(J).until((g) => g.room.id === 'tank-lid', 40, 'lid').wait(20).up(J).until(ground, 60).log('lid');
  climb(a, [[14, 16], [13.5, 14], [17.5, 12, { from: 15.3, delay: 2 }], [14, 10, { from: 16.4, delay: 2 }], [18, 8, { from: 15.3, delay: 2 }]]).log('under the gap');
  walkTo(a, 20.4);
  a.down(J).until((g) => g.boss.mode === 'out', 120, 'squeeze').up(J).log('through!'); // [issue #27] jump up into the gap
  a.down(R).until((g) => g.boss.mode === 'leap', 300, 'the leap').up(R).log('the leap (the cup tips; then story panel 4)');
  a.end();
  a.save('zone-00-path', {});
}

// ---------------------------------------------------------------- zone 1: the Bedroom
if (want('zone-01-path')) {
  const a = new Author({ room: 'bed-carrier', items: [], party: ['pip'] });
  a.wait(5).tap(CHIRP, 3).wait(40).log('first chirp');
  travel(a, 1, (g) => g.room.id === 'bed-rug').log('rug');
  travel(a, 1, (g) => g.room.id === 'bed-desk', 2500).log('desk');
  walkTo(a, 6);
  climb(a, [[6.5, 50], [6.5, 48], [12, 46, { from: 9.6, delay: 2 }], [8, 44, { from: 11.4, delay: 2 }], [12, 42, { from: 9.6, delay: 2 }], [8, 40, { from: 11.4, delay: 2 }],
    [12, 38, { from: 9.6, delay: 2 }], [9.5, 36, { from: 11.4, delay: 2 }], [12, 34, { from: 10.3, delay: 2 }], [9, 32, { from: 11.4, delay: 2 }], [12, 30, { from: 9.6, delay: 2 }],
    [8, 28, { from: 11.4, delay: 2 }], [12, 26, { from: 9.6, delay: 2 }], [8, 24, { from: 11.4, delay: 2 }], [12, 22, { from: 9.6, delay: 2 }], [8, 20, { from: 11.4, delay: 2 }],
    [8, 18], [11.5, 16, { from: 8.6, delay: 2 }]]).log('desk top');
  travel(a, 1, (g) => g.player.has('booties'), 600).log('booties');
  a.until((g) => g.hold === 0, 80);
  // down the practice shaft, out to the dresser
  travel(a, 1, (g) => g.room.id === 'bed-dresser', 1500).log('dresser');
  travel(a, 1, (g) => g.player.cx >= 58.5 * T, 900, 'across the dresser floor (kick the ant)'); // [fixer] a careful player kicks it
  walkTo(a, 59).log('shaft');
  wallClimb(a, 1, (g) => g.player.y + g.player.h < 16.2 * T && g.player.cx < 58 * T, 40);
  a.until(ground, 90).log('dresser top');
  walkTo(a, 39);
  climb(a, [[35.5, 14], [31.5, 12, { from: 34.4, delay: 2 }], [27.5, 10, { from: 30.4, delay: 2 }], [23.5, 8, { from: 26.4, delay: 2 }], [19.5, 6, { from: 22.4, delay: 2 }],
    [15.5, 4, { from: 18.4, delay: 2 }], [12.5, 2, { from: 14.4, delay: 2 }]]);
  a.down(J).until((g) => g.room.id === 'bed-lair', 40, 'lair').wait(16).up(J).until(ground, 60).log('in the tank');
  jumpTo(a, 8, 16);
  a.end();
  a.save('zone-01-path', {});
}

// the boss helper: wait for a boss mode
const mode = (m) => (g) => g.boss && g.boss.mode === m;

if (want('zone-01-boss')) {
  const a = new Author({ room: 'bed-lair', x: 6, y: 15, items: ['booties'], party: ['pip'] });
  for (const [ph, stand, berm, back, tabFrom, faceKey] of [[1, 17.4, 20, 27, 29.2, R], [2, 46.6, 43, 36.6, 34.6, L], [3, 46.6, 43, 36.6, 33.0, L]]) {
    if (ph >= 2) { walkTo(a, 37.5); a.until(ground, 60); walkTo(a, 40.6); jumpTo(a, 43, 14); jumpTo(a, 46.6, 16); }
    walkTo(a, stand).log(`phase ${ph}: waiting by the berm`);
    a.until(mode('stuck'), 1500, `stuck ${ph}`).log('she\'s stuck');
    jumpTo(a, berm, 14);
    walkTo(a, back);
    jumpTo(a, ph >= 2 ? 34.5 : 29.5, 12);
    walkTo(a, tabFrom);
    a.down(faceKey).wait(1).up(faceKey).tap(KICK, 3).wait(10).log(`kicked tab ${ph}`);
    if (ph < 3) a.until((g) => g.boss.phase === ph + 1, 30, `phase ${ph + 1}`);
  }
  a.until((g) => g.levelComplete, 30, 'rescue').log('Stripe is safe');
  a.end();
  a.save('zone-01-boss', { levelComplete: true });
}

// ---------------------------------------------------------------- zone 2: the Bathroom
if (want('zone-02-path')) {
  const a = new Author({ room: 'bath-door', items: ['booties'], party: ['pip', 'stripe'], rescued: ['stripe'] });
  a.wait(5);
  travel(a, 1, (g) => g.room.id === 'bath-toilet').log('toilet');
  travel(a, 1, (g) => g.player.cx > 22 * T, 600).log('the shaft');
  wallClimb(a, 1, (g) => g.room.id === 'bath-toilet' && g.player.y + g.player.h < 13.6 * T, 40, 1).log('cistern lid');
  walkTo(a, 41.3); jumpTo(a, 46, 14);
  travel(a, 1, (g) => g.room.id === 'bath-sink', 600).log('sink');
  walkTo(a, 3).log('on the towel bar');
  wallClimb(a, 1, (g) => g.room.id === 'bath-sink' && g.player.y + g.player.h < 15.6 * T, 40, 1).log('counter');
  walkTo(a, 12.5).until((g) => g.player.has('floss') && g.hold === 0, 120).log('floss');
  travel(a, 1, (g) => g.player.y > 30 * T && g.player.state === 'ground', 600).log('tub-side ledge');
  travel(a, 1, (g) => g.room.id === 'bath-lair', 300).log('lair');
  a.end();
  a.save('zone-02-path', {});
}

const hide = (a, x) => { walkTo(a, x); a.tap(D, 3).until((g) => g.player.hidden, 20, `hide at ${x}`); return a; };
const cloudOn = (name, minLeft = 0) => (g) => (g.boss.clouds || []).some((v) => v === name || v.x === name) && true;

if (want('zone-02-boss')) {
  const a = new Author({ room: 'bath-lair', x: 4, y: 15, items: ['booties', 'floss'], party: ['pip', 'stripe'], rescued: ['stripe'] });
  const B = (g) => g.boss;
  a.wait(5);
  hide(a, 5.5).log('phase 1: in the first crack');
  for (const x of [9.5, 13.5, 17.5]) { a.until((g) => B(g).mode === 'hunt' || B(g).mode === 'lost', 300).wait(20); hide(a, x).log(`crack ${x}`); }
  // into the hot tap's steam as soon as it puffs, and kick the tap
  a.until((g) => (B(g).clouds || []).length && (g.frame - B(g).t0 - 30) % 240 < 10, 400, 'steam').log('steam!');
  walkTo(a, 21.7); a.tap(KICK, 3).until((g) => B(g).phase === 2, 20, 'faucet 1').log('phase 2');
  // phase 2: steam A now, crack at 28, then steam B
  a.until((g) => (g.frame - B(g).t0) > 40, 60);
  hide(a, 28.5).log('crack 28');
  a.until((g) => { const t = g.frame - B(g).t0 - 30 - 120; return t >= 0 && t % 240 < 10; }, 600, 'steam B').log('steam B');
  walkTo(a, 35.8); a.down(R).wait(1).up(R).tap(KICK, 3).until((g) => B(g).phase === 3, 20, 'faucet 2').log('phase 3');
  hide(a, 40.5).log('crack 40');
  a.until((g) => { const t = g.frame - B(g).t0 - 30; return t >= 0 && t % 240 < 10; }, 600, 'riser steam').log('riser steam');
  walkTo(a, 44.6);
  wallClimb(a, 1, (g) => g.player.y + g.player.h < 5.95 * T, 30, -1).log('riser top');
  walkTo(a, 40.7); a.down(L).wait(1).up(L).tap(KICK, 3).until((g) => B(g).flooded, 20, 'faucet 3').log('the shower is on');
  walkTo(a, 43.2); a.down(R).wait(3).down(J).wait(18).up(J).until((g) => g.player.cx > 47.5 * T, 30, 'over the shaft').up(R).until(ground, 60).log('right pillar'); walkTo(a, 48.45); a.wait(10);
  a.log('ready to swing').down(R).wait(4).down(J).wait(32).tap(USE, 2).up(J).until((g) => g.player.state === 'swing', 10, 'grab');
  a.wait(6).tap(J, 3).up(R).until((g) => g.levelComplete, 200, 'Katy').log('Katy is safe');
  a.end();
  a.save('zone-02-boss', { levelComplete: true });
}

// ---------------------------------------------------------------- zone 3: the Kitchen
if (want('zone-03-path')) {
  const a = new Author({ room: 'kit-fridge', items: ['booties', 'floss'], party: ['pip', 'stripe', 'katy'], rescued: ['stripe', 'katy'] });
  a.wait(5);
  travel(a, -1, (g) => g.player.cx < 18.5 * T, 900).log('under the fridge');
  climb(a, [[17.5, 50], [13.5, 48, { from: 16.4, delay: 2 }], [17.5, 46, { from: 14.6, delay: 2 }], [13.5, 44, { from: 16.4, delay: 2 }], [17.5, 42, { from: 14.6, delay: 2 }],
    [13.5, 40, { from: 16.4, delay: 2 }], [17.5, 38, { from: 14.6, delay: 2 }], [13.5, 36, { from: 16.4, delay: 2 }], [10, 34, { from: 12.6, delay: 2 }]]).log('stove door');
  travel(a, -1, (g) => g.room.id === 'kit-stove', 300).log('stove');
  walkTo(a, 54); dropDown(a, (g) => g.player.y + g.player.h > 33.5 * T && g.player.state === 'ground').log('stove floor');
  travel(a, -1, (g) => g.room.id === 'kit-undersink', 1200).log('under the sink');
  travel(a, -1, (g) => g.player.has('raft'), 600).log('raft');
  a.until((g) => g.hold === 0, 60);
  travel(a, 1, (g) => g.room.id === 'kit-stove', 900).log('back to the stove');
  walkTo(a, 57.5);
  climb(a, [[57.5, 32], [53.5, 30, { from: 56.4, delay: 2 }], [57.5, 28, { from: 54.6, delay: 2 }], [53.5, 26, { from: 56.4, delay: 2 }], [57.5, 24, { from: 54.6, delay: 2 }],
    [53.5, 22, { from: 56.4, delay: 2 }], [57.5, 20, { from: 54.6, delay: 2 }], [53.5, 18, { from: 56.4, delay: 2 }], [57.5, 16, { from: 54.6, delay: 2 }],
    [53.5, 14, { from: 56.4, delay: 2 }], [49.5, 12, { from: 52.6, delay: 2 }], [53.5, 10, { from: 50.4, delay: 2 }], [49.5, 8, { from: 52.6, delay: 2 }], [53.5, 6, { from: 50.4, delay: 2 }],
    [49.5, 4, { from: 52.6, delay: 2 }], [49.5, 2]]).log('top of the stove');
  a.down(J).until((g) => g.room.id === 'kit-counter', 40, 'counter').wait(14).up(J).until(ground, 60);
  jumpTo(a, 46, 16).log('on the counter');
  // over the burners, scatter the fruit flies, to the lair door
  for (const x of [38, 34, 30]) { walkTo(a, x + 1.6); jumpTo(a, x - 1.6, 16, { delay: 0 }); }
  walkTo(a, 22.5); a.tap(CHIRP, 3).wait(10);
  travel(a, -1, (g) => g.room.id === 'kit-sink', 600).log('lair');
  a.end();
  a.save('zone-03-path', {});
}

if (want('zone-03-boss')) {
  const a = new Author({ room: 'kit-sink', x: 58, y: 29, items: ['booties', 'floss', 'raft'], party: ['pip', 'stripe', 'katy'], rescued: ['stripe', 'katy'] });
  const B = (g) => g.boss;
  a.wait(5);
  walkTo(a, 40.4); a.down(L).wait(1).up(L).tap(KICK, 3).until((g) => B(g).mode === 'stuck', 90, 'chomp').log('phase 1: the cork, chomped');
  travel(a, -1, (g) => g.player.cx < 22 * T && g.player.state === 'ground', 600, 'raft').log('across the sink');
  walkTo(a, 14.5);
  climb(a, [[12, 28], [7, 26, { from: 10.6, delay: 2 }]]).until((g) => B(g).phase === 2, 10, 'ledge 1').log('ledge 1');
  walkTo(a, 7.6); a.down(R).wait(1).up(R).tap(KICK, 3).until((g) => B(g).mode === 'stuck', 120, 'chomp 2').log('phase 2: the spoon');
  climb(a, [[11.5, 24, { from: 9.4, delay: 2 }], [7, 22, { from: 10.6, delay: 2 }], [11.5, 20, { from: 9.4, delay: 2 }], [7, 18, { from: 10.6, delay: 2 }]]).until((g) => B(g).phase === 3, 10, 'ledge 2').log('ledge 2');
  walkTo(a, 7.6); a.down(R).wait(1).up(R).tap(KICK, 3).until((g) => B(g).mode === 'stuck', 120, 'chomp 3').log('phase 3: the sponge');
  climb(a, [[11.5, 16, { from: 9.4, delay: 2 }], [7, 14, { from: 10.6, delay: 2 }], [11.5, 12, { from: 9.4, delay: 2 }], [7, 10, { from: 10.6, delay: 2 }]]).log('the top');
  walkTo(a, 5); a.down(L).wait(1).up(L).tap(KICK, 3).until((g) => g.levelComplete, 20, 'Duo').log('Duo is safe');
  a.end();
  a.save('zone-03-boss', { levelComplete: true });
}
