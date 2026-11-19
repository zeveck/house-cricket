// Builder C: the Dragon's Lair's recorded solutions and the Cellophane Cloak check (headless).
//   node tools/solutions/lair.mjs [path|boss|cloak]
// zone-lair-path: from the crawl gap behind the furnace into the vivarium.
// zone-lair-boss: Sir Bartholomew: hide from the gaze, duck the claw, climb, wave (Listen + Kick).
import { Author } from '../author.mjs';
import { makeSim } from '../sim.mjs';
import { ZONE_INFO } from '../../game/data/zones.js';
import { gazeAt, EYE, GAZE_HALF } from '../../game/src/bosses/barty.js';

const R = 'ArrowRight', L = 'ArrowLeft', U = 'ArrowUp', D = 'ArrowDown', SHIFT = 'ShiftLeft', J = 'KeyZ', KICK = 'KeyX', LISTEN = 'KeyB';
const T = 40;
const ITEMS = ZONE_INFO.lair.minItems[0];
const only = process.argv[2];
const want = (n) => !only || n === only;
const ground = (g) => g.player.state === 'ground';
const feetRow = (g) => Math.round((g.player.y + g.player.h) / T);

// Run right to tile column x (centre), hopping up any step in the way (steps are 2 tiles).
function runRight(a, x, label = 'run') {
  a.down(R);
  for (let i = 0; i < 900; i++) {
    const g = a.g, p = g.player;
    if (p.cx >= x * T) break;
    const tx = Math.floor((p.x + p.w + 6) / T), ty = Math.floor((p.y + p.h - 4) / T);
    if (ground(g) && g.grid.at(tx, ty) !== 0 && g.grid.at(tx, ty) !== undefined && g.grid.at(tx, ty - 2) === 0) { a.tap(J, 14); continue; }
    a.wait(1);
  }
  a.up(R).until((g) => ground(g) && Math.abs(g.player.vx) < 5, 60, label + ' settle');
  return a;
}
const hide = (a) => a.tap(D, 3).until((g) => g.player.hidden, 10, 'hidden');

if (want('cloak')) {
  // The Cloak: a darkling beetle walks through a cloaked cricket; it lasts 3 s, then 6 s to recharge.
  const s = makeSim(), g = s.game, inp = s.input;
  g.startAt('dragon-lair', 10, 33, { items: [...ITEMS, 'cloak'], party: ['pip'] });
  g.boss = null; // just the floor
  g.enemies = [];
  const { spawnEnemy } = await import('../../game/src/enemies.js');
  g.enemies.push(spawnEnemy({ type: 'beetle', x: 13, y: 33, range: [3, 15], dir: -1, i: 0 }, 0, 'dragon-lair'));
  for (let i = 0; i < 20; i++) g.update(inp.sample());
  inp.keyDown(SHIFT); // [issue #27] the cloak: hold Shift
  let first = -1, last = -1, crossed = false; const hp = g.player.health;
  for (let i = 0; i < 260; i++) { g.update(inp.sample()); if (g.player.cloaked) { if (first < 0) first = i; last = i; const e = g.enemies[0]; if (e.x < g.player.x + g.player.w && e.x + e.w > g.player.x) crossed = true; } }
  const lasted = last - first + 1;
  const ok1 = crossed && first >= 0 && first <= 10 && lasted >= 178 && lasted <= 181 && g.player.health === hp;
  // still holding Shift: no re-arm during the recharge
  let rearm = -1;
  for (let i = 0; i < 400; i++) { g.update(inp.sample()); if (g.player.cloaked && rearm < 0) rearm = i; }
  inp.keyUp(SHIFT);
  const ok2 = rearm + 260 - (first + lasted) >= 358 && rearm + 260 - (first + lasted) <= 362; // 6 s recharge
  // the beetle did cross the cricket while cloaked (it patrols 4..16 through x 10)
  console.log(`cloak: beetle crossed the cricket: ${crossed}; armed after ${first} f, lasted ${lasted} f, hearts ${hp} -> ${g.player.health}, recharge ${rearm + 260 - (first + lasted)} f -> ${ok1 && ok2 ? 'OK' : 'FAIL'}`);
  // and without the cloak the same beetle hurts
  const s2 = makeSim(); const g2 = s2.game; g2.startAt('dragon-lair', 10, 33, { items: ITEMS, party: ['pip'] }); g2.boss = null;
  g2.enemies = [spawnEnemy({ type: 'beetle', x: 13, y: 33, range: [3, 15], dir: -1, i: 0 }, 0, 'dragon-lair')];
  s2.input.keyDown(SHIFT); for (let i = 0; i < 300; i++) g2.update(s2.input.sample());
  console.log(`no cloak: hearts 5 -> ${g2.player.health} (${g2.player.health < 5 ? 'OK, hurt' : 'FAIL'})`);
  if (!(ok1 && ok2) || g2.player.health >= 5) process.exitCode = 1;
}

if (want('path')) {
  const a = new Author({ room: 'lair-gap', x: 1, y: 15, items: ITEMS, party: ['pip'] });
  a.wait(10).log('crawl in');
  runRight(a, 26, 'to the door').log('at the Ready? door');
  a.down(R).until((g) => g.room.id === 'dragon-lair', 200, 'into the vivarium').wait(20).up(R)
    .until(ground, 60, 'landed').log('in the lair').end();
  a.save('zone-lair-path', {});
}

if (want('boss')) {
  const a = new Author({ room: 'dragon-lair', x: 3, y: 33, items: ITEMS, party: ['pip'] });
  // is the run from x0 to x1 (feet row y0 -> y1) clear of his gaze for the next n frames?
  const clear = (x0, x1, n) => (g) => {
    const b = g.boss; if (b.mode !== 'search') return false;
    for (let i = 0; i < n; i += 2) { const gx = gazeAt(b.sweepT + i); if (gx + GAZE_HALF + 20 > x0 * T && gx - GAZE_HALF - 20 < x1 * T) return false; }
    return true;
  };
  // phase 1: cap to cap while the gaze is elsewhere
  a.wait(5).log('in');
  runRight(a, 7.9, 'cap 1'); hide(a).log('under cap 1');
  a.until(clear(8, 17, 140), 900, 'gaze clear 1'); runRight(a, 16.9, 'cap 2'); hide(a).log('under cap 2');
  a.until(clear(17, 26, 140), 900, 'gaze clear 2'); runRight(a, 25.9, 'cap 3'); hide(a).log('under cap 3');
  a.until(clear(26, 36, 140), 1200, 'gaze clear 3'); runRight(a, 35.5, 'coin gap 35'); hide(a).log('coin gap 35');
  a.until(clear(35, 41, 100), 1200, 'gaze clear 4'); runRight(a, 40.5, 'tier 2');
  a.until((g) => g.boss.phase === 2, 30, 'phase 2').log('phase 2');
  if (a.p.health < 5) throw new Error('hit in phase 1');
  // phase 2: duck the claw in the coin gaps, climb between sweeps
  hide(a).log('coin gap 40');
  const passed = (x) => (g) => g.boss.mode === 'rest' || (g.boss.mode === 'sweep' && g.boss.claw.x + 4 * T < x * T - 20);
  a.until((g) => g.boss.mode === 'sweep', 600, 'sweep 1').until(passed(40), 400, 'claw past').log('claw passed');
  runRight(a, 50.9, 'cap 50'); hide(a).log('cap 50');
  a.until((g) => g.boss.mode === 'sweep', 600, 'sweep 1b').until(passed(50), 400, 'claw past 1b').log('claw passed 1b');
  runRight(a, 56.5, 'coin gap 56'); hide(a).log('coin gap 56');
  a.until((g) => g.boss.mode === 'sweep', 600, 'sweep 2').until(passed(56), 400, 'claw past 2').log('claw passed 2');
  runRight(a, 63.5, 'coin gap 63'); hide(a).log('coin gap 63');
  a.until((g) => g.boss.mode === 'sweep', 600, 'sweep 3').until(passed(63), 400, 'claw past 3').log('claw passed 3');
  runRight(a, 74, 'summit');
  a.until((g) => g.boss.phase === 3, 60, 'phase 3').log('phase 3: the summit');
  // phase 3: wave (hold Listen, press Kick)
  a.wait(40).down(LISTEN).wait(20).tap(KICK, 4).wait(10).up(LISTEN).log('waved')
    .until((g) => g.player.has('cloak'), 300, 'the Cloak').log('the Cellophane Cloak');
  // end on the win's own step: the browser's dialog pauses the sim from here on
  for (const c of [...a.held]) a.up(c);
  a.save('zone-lair-boss', { levelComplete: true });
}
