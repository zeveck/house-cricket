// Authors the engine test zone's recorded solutions (design/solutions/entities-*.json) with the
// headless sim: one per test room in zone-98 (gates, lifts/springs, terrain, thermostat + door,
// the practice gecko, floor critters, fliers). Re-run after changing zone-98 or the engine:
//   node tools/solutions/entities.mjs [filter]
import { Author } from '../author.mjs';
const R = 'ArrowRight', L = 'ArrowLeft', U = 'ArrowUp', D = 'ArrowDown', J = 'KeyZ', KICK = 'KeyX', CHIRP = 'KeyC';
const T = 40;
const only = process.argv[2];
const want = (n) => !only || n.includes(only);
const ground = (g) => g.player.state === 'ground';

// 1. Gates: kick the lever, walk through the item / rescue / count gates, push the side gate, out.
if (want('gates')) {
  const a = new Author({ room: 'et-gates', items: ['thimble'], rescued: ['stripe'] });
  a.wait(20).down(R).until((g) => g.player.x > 3.9 * T, 200, 'lever').up(R).wait(4).tap(KICK, 4).wait(4).log('kicked lever')
    .until((g) => g.mech.gates[0].open, 30, 'lever gate open')
    .down(R).until((g) => g.mech.gates.every((x) => x.open), 400, 'all gates open').log('gates open')
    .until((g) => g.enemies[0] && g.enemies[0].x - (g.player.x + g.player.w) < 30, 300, 'ant near').tap(J, 10).log('hop the ant')
    .until((g) => g.room.id === 'et-lifts', 400, 'exit').log('out').up(R).end();
  a.save('entities-1-gates', {});
}

// 2. Lifts and springs: ride the steam vent up to the ledge, over the glass wall, bounce the cushion over the next.
if (want('lifts')) {
  const a = new Author({ room: 'et-lifts', x: 1, y: 15, items: [] });
  a.wait(10).down(R).until((g) => g.player.cx > 4.4 * T, 200, 'in the vent').up(R).log('in the vent')
    .until((g) => g.player.y < 3.5 * T, 400, 'lifted').log('lifted')
    .down(R).until((g) => ground(g) && g.player.y < 6 * T, 120, 'on the ledge').log('ledge')
    .until((g) => ground(g) && g.player.y > 14 * T && g.player.x > 16 * T, 300, 'down the far side').log('floor')
    .until((g) => g.player.x > 18.3 * T, 200, 'by the cushion').tap(J, 12)
    .until((g) => g.player.y < 9 * T, 120, 'bounced').log('bounced')
    .until((g) => ground(g) && g.player.x > 25 * T, 200, 'over the wall').log('over')
    .until((g) => g.room.id !== 'et-lifts', 300, 'exit').log('out').up(R).end();
  a.save('entities-2-lifts', {});
}

// 3. Terrain: through the syrup, across the crumbling strips, pound piano keys 0 and 2, out.
if (want('terrain')) {
  const a = new Author({ room: 'et-terrain', x: 1, y: 15, items: ['thimble'] });
  a.wait(10).down(R).until((g) => g.player.x > 9.6 * T, 400, 'end of syrup').log('syrup done')
    .until((g) => g.player.x > 18.6 * T, 200, 'past the crumble').log('crossed')
    .tap(J, 10).until((g) => ground(g) && g.player.y < 15 * T && g.player.x > 20 * T, 60, 'on key 0').up(R).log('on key 0')
    .tap(J, 5).wait(8).down(D).tap(J, 3).up(D).until(ground, 90, 'pounded').wait(10).log('pound 0')
    .down(R).until((g) => g.player.x > 24.1 * T, 120).up(R).until(ground, 30).wait(4)
    .tap(J, 5).wait(8).down(D).tap(J, 3).up(D).until(ground, 90, 'pounded 2').wait(10).log('pound 2')
    .until((g) => g.mech.pianos[0].solved, 10, 'solved')
    .down(R).until((g) => g.room.id !== 'et-terrain', 300, 'exit').log('out').up(R).end();
  a.save('entities-3-terrain', {});
}

// 4. Thermostat (Frost), the battery, a door: chirp at 72°F, the gate opens, Up at the door.
if (want('thermo')) {
  const a = new Author({ room: 'et-thermo', x: 1, y: 15, items: [], party: ['frost'] });
  a.wait(10).down(R).until((g) => g.player.has('battery'), 300, 'battery').log('battery')
    .until((g) => g.player.cx > 15.6 * T, 300, 'at 72F').up(R).wait(10).tap(CHIRP, 3).wait(10).log('chirped')
    .until((g) => g.mech.gates[0].open, 20, 'thermo gate')
    .down(R).until((g) => g.player.x > 28.7 * T, 300, 'door').up(R).wait(10).tap(D, 3)
    .until((g) => g.room.id === 'et-boss', 60, 'through the door').log('door').end();
  a.save('entities-4-thermo', {});
}

// 5. The practice gecko: step, ledges, kick each phase's target; it never reaches the ledges.
if (want('boss')) {
  const a = new Author({ room: 'et-boss', x: 2, y: 15, items: [] });
  const kickTarget = (n) => a.up(R, L).wait(2).tap(KICK, 4).until((g) => g.boss.phase > n || g.boss.done, 20, `target ${n}`).log(`target ${n}`);
  a.wait(10).down(R).until((g) => g.player.x > 3.1 * T && g.player.vx === 0, 90, 'at the step').tap(J, 8).until((g) => ground(g) && g.player.y < 15 * T, 60, 'on the step').up(R).log('step')
    .down(R).tap(J, 12).until((g) => ground(g) && g.player.y < 13 * T, 60, 'ledge A').log('ledge A')
    .until((g) => g.player.x > 9.2 * T, 120, 'end of A');
  kickTarget(1);
  a.down(R).wait(2).tap(J, 14).until((g) => ground(g) && g.player.x > 13 * T, 90, 'ledge B').log('ledge B')
    .until((g) => g.player.x > 17.2 * T, 120, 'end of B');
  kickTarget(2);
  a.down(R).wait(2).tap(J, 14).until((g) => ground(g) && g.player.x > 21 * T, 90, 'ledge C').log('ledge C')
    .until((g) => g.player.x > 25.2 * T, 120, 'end of C');
  kickTarget(3);
  a.until((g) => g.levelComplete, 30, 'rescued').log('rescued').end();
  a.save('entities-5-boss', { levelComplete: true });
}

// 6. Floor critters: kick the ant, hop the earwig and the stink bug, bounce off the aphids, out.
if (want('walkers')) {
  const a = new Author({ room: 'et-walkers', items: [] });
  const ant = (g) => g.enemies.find((e) => e.type === 'ant');
  a.wait(10).down(R).until((g) => ant(g).state !== 'walk' || (Math.abs(ant(g).x - (g.player.x + g.player.w)) < 16 && ant(g).dir < 0) || (ant(g).x > g.player.x + g.player.w && ant(g).x - (g.player.x + g.player.w) < 10), 400, 'ant near')
    .up(R).tap(KICK, 4).wait(6).log('kick ant');
  const hopOver = (type, lead) => a.down(R).until((g) => { const e = g.enemies.find((x) => x.type === type); return e.state !== 'walk' || e.x - (g.player.x + g.player.w) < lead; }, 400, `${type} near`).tap(J, 14).until(ground, 90, `over ${type}`).log(`over ${type}`);
  hopOver('earwig', 22);
  hopOver('stinkbug', 22);
  a.down(R).until((g) => g.room.id !== 'et-walkers', 600, 'exit').log('out').up(R).end();
  a.save('entities-6-walkers', {});
}

// 7. Fliers: chirp the booklice and the swarm apart, run under the spider, take the Glow Bead.
if (want('fliers')) {
  const a = new Author({ room: 'et-fliers', x: 2, y: 15, items: [] });
  const e = (g, t) => g.enemies.find((x) => x.type === t);
  a.wait(10).tap(CHIRP, 3).wait(10).log('chirp 1')
    .until((g) => e(g, 'booklouse').state !== 'walk', 10, 'booklice scattered')
    .down(R).until((g) => e(g, 'fruitflies').x - (g.player.x + g.player.w) < 70, 600, 'swarm near').up(R).wait(30).tap(CHIRP, 3).wait(6).log('chirp swarm')
    .until((g) => e(g, 'fruitflies').state !== 'walk', 120, 'swarm scattered')
    .until((g) => e(g, 'cellarspider').mode === 'climb' || e(g, 'cellarspider').mode === 'idle', 600, 'spider up')
    .down(R).until((g) => g.player.has('glow'), 600, 'glow').log('glow').up(R).end();
  a.save('entities-7-fliers', {});
}
