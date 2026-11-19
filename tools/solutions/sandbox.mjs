// Authors the sandbox's recorded solutions (design/solutions/sandbox-*.json) with the
// headless sim. Re-run after changing the sandbox or the physics: node tools/solutions/sandbox.mjs
import { Author } from '../author.mjs';
const R = 'ArrowRight', L = 'ArrowLeft', U = 'ArrowUp', D = 'ArrowDown', J = 'KeyZ', USE = 'KeyV', KICK = 'KeyX', CHIRP = 'KeyC';
const T = 40;
const only = process.argv[2];
const want = (n) => !only || n.includes(only);

// 1. Meadow: run, jump the pit, kick the ant, climb the one-way platforms, take the Booties,
//    drop through, leave right.
function meadow(a) {
  a.wait(10).down(R).until((g) => g.player.x > 10.6 * T, 300, 'pit edge').tap(J, 14).log('jump pit')
    .until((g) => g.player.state === 'ground', 120, 'land').log('landed past pit')
    .until((g) => g.enemies[0].x - (g.player.x + g.player.w) < 14, 400, 'ant near').tap(KICK, 4).wait(10).log('kicked ant ' + 0)
    .down(R).until((g) => g.player.x > 16.2 * T, 200).tap(J, 8).until((g) => g.player.state === 'ground' && g.player.y < 14 * T, 90, 'p1').log('on p1')
    .until((g) => g.player.x > 20.4 * T, 100).tap(J, 8).until((g) => g.player.state === 'ground' && g.player.y < 12 * T, 90, 'p2').log('on p2')
    .until((g) => g.player.x > 24.4 * T, 100).tap(J, 8).until((g) => g.player.state === 'ground' && g.player.y < 10 * T, 90, 'p3').log('on p3')
    .until((g) => g.player.x > 26.5 * T, 100).up(R).tap(J, 8).until((g) => g.player.state === 'ground' && g.player.y < 8 * T, 90, 'p4').log('on p4')
    .down(R).until((g) => g.player.has('booties'), 120, 'booties').log('booties').up(R).wait(45)
    .down(D).wait(4).tap(J, 4).up(D).until((g) => g.player.state === 'ground' && g.player.y > 9 * T, 90).log('dropped')
    .down(D).wait(4).tap(J, 4).up(D).until((g) => g.player.state === 'ground' && g.player.y > 11 * T, 90).log('dropped')
    .down(D).wait(4).tap(J, 4).up(D).until((g) => g.player.state === 'ground' && g.player.y > 13 * T, 90).log('dropped')
    .down(D).wait(4).tap(J, 4).up(D).until((g) => g.player.state === 'ground' && g.player.y > 15 * T, 90).log('floor')
    .down(R).until((g) => g.room.id === 'sb-shaft', 300, 'exit').log('exit').end();
}

// Grab hook at column hx when it comes within reach (Use is buffered 120 ms).
function swingTo(a, hx, approach) {
  if (approach) approach();
  const near = (g) => g.hooks.some((h) => Math.abs(h.x - (hx + 0.5) * T) < 1 && Math.hypot(h.x - g.player.cx, h.y - g.player.cy) < 60);
  a.until((g) => g.player.state === 'swing' || near(g), 120, 'hook ' + hx);
  if (a.p.state !== 'swing') a.tap(USE, 3);
  a.until((g) => g.player.state === 'swing', 20, 'grabbed ' + hx).log('grabbed hook ' + hx);
}
// Pump with the swing until the amplitude is big, then fling toward dir at angle >= at (rad).
function pumpAndFling(a, dir, at) {
  a.up(R, L);
  let cur = null;
  for (let i = 0; i < 400; i++) {
    const s = a.p.swing; if (!s) break;
    const want = s.w > 0 ? R : L;
    if (want !== cur) { if (cur) a.up(cur); a.down(want); cur = want; }
    a.wait(1);
    if (i > 60 && Math.sign(s.w) === dir && dir * s.ang > at && Math.abs(s.w) > 2.4) break;
  }
  if (cur) a.up(cur);
  a.down(dir > 0 ? R : L).tap(J, 3).log('fling');
}

// 2. Shaft: walk under wall A, wall-jump up the 3-wide shaft, take the Floss Line, then swing
//    hook to hook over the tacks and leave right.
function shaft(a) {
  a.wait(5).down(R).until((g) => g.player.x > 13 * T, 200, 'shaft bottom').up(R).log('in shaft');
  // first jump toward the right wall
  a.down(J, R).wait(6);
  let side = 1;
  for (let k = 0; k < 30; k++) {
    a.until((g) => g.player.state === 'cling', 90, `cling ${k}`).log('cling ' + k + ' dir ' + a.p.clingDir);
    a.up(J).wait(2);
    if (side === 1) { a.up(R); a.down(L, J); } else { a.up(L); a.down(R, J); }
    side = -side;
    a.wait(4);
    if (a.p.y < 14 * T) break; // this kick clears the top
  }
  // the last kick went right: land on top of wall B (cols 15-16)
  a.until((g) => g.player.x > 15 * T - 10, 60, 'over wall B').up(R, J).until((g) => g.player.state === 'ground', 60, 'on wall B').log('on wall B');
  // hop the shaft opening to the left ledge, take the Floss Line
  a.down(L).tap(J, 20).until((g) => g.player.state === 'ground' && g.player.x < 11 * T, 90, 'left ledge')
    .until((g) => g.player.has('floss'), 200, 'floss').up(L).log('floss').wait(40);
  // back to wall B's top, then swing: hook (20,10), hook (25,10), land on the exit ledge
  a.down(R).until((g) => g.player.x > 10.5 * T, 100).tap(J, 20).until((g) => g.player.state === 'ground', 90, 'wall B again').log('wall B again');
  // swing: run off wall B's top, Use near hook 1, pump, fling to hook 2, fling to the ledge
  swingTo(a, 18, () => a.down(R).until((g) => g.player.x + g.player.w > 16.9 * T, 60).tap(J, 14));
  pumpAndFling(a, 1, 0.2);
  swingTo(a, 23);
  pumpAndFling(a, 1, 0.4);
  a.down(R).until((g) => g.player.state === 'ground', 120, 'exit ledge').log('exit ledge')
    .until((g) => g.room.id === 'sb-pond', 200, 'exit').log('exit').end();
}

// 3. Pond: take the Raft, ride the current across the pond, take the Rubber Band, super-jump
//    the 7-tile glass cliff, take the Glider, glide the tack gap, leave right.
function pond(a) {
  a.wait(5).down(R).until((g) => g.player.has('raft'), 200, 'raft').up(R).log('raft').wait(45)
    .down(R).until((g) => g.player.onRaft, 120, 'afloat').log('afloat')
    .until((g) => g.player.x > 19.4 * T, 400, 'far side').tap(J, 8).until((g) => g.player.state === 'ground' && !g.player.onRaft, 90, 'bank').log('bank')
    .until((g) => g.player.has('band'), 200, 'band').log('band').wait(45)
    .until((g) => g.player.x + g.player.w > 30.6 * T, 200, 'cliff foot').up(R).wait(6).log('cliff foot')
    .down(USE).wait(20).down(R).up(USE).until((g) => g.player.state === 'ground', 120, 'cliff top').log('cliff top')
    .until((g) => g.player.has('glider'), 120, 'glider').log('glider').wait(45)
    .until((g) => g.player.x + g.player.w > 36.8 * T, 120, 'gap edge').down(J).wait(3).log('jumped').until((g) => g.player.state === 'ground', 400, 'glided').up(J).log('glided over')
    .until((g) => g.room.id === 'sb-cellar', 400, 'exit').log('exit').end();
}

// 4. Cellar: take the Thimble, ground-pound the cereal plug, sneak past the beetle (hide),
//    take the Earplugs, cross the loud zone, take the Glow Bead, leave right into the dark.
function cellar(a) {
  a.wait(5).down(R).until((g) => g.player.has('thimble'), 200, 'thimble').log('thimble').wait(45)
    .until((g) => g.player.x > 14.6 * T, 120, 'on plug').up(R).tap(J, 10).wait(14).down(D).tap(J, 3).up(D).log('pound')
    .until((g) => g.player.state === 'ground' && g.player.y > 30 * T, 200, 'lower floor').log('lower floor');
  // into the corridor: wait for the beetle to head left, follow it, hide at spot 9 when it turns
  const beetle = () => a.g.enemies.find((e) => e.type === 'beetle');
  a.until(() => beetle().dir < 0 && beetle().x < 8 * T, 600, 'beetle heading left').log('beetle left ' + Math.round(beetle().x));
  a.down(L).until((g) => g.player.x < 9.2 * T, 200, 'spot 9').up(L).wait(2);
  a.until(() => beetle().x < 4 * T || beetle().dir > 0, 600).log('beetle at end');
  // the beetle is between us and the earplugs: hide at spot 9 and let it pass back
  a.tap(D, 3).until((g) => g.player.hidden, 10, 'hidden').log('hidden')
    .until(() => beetle().x > 11 * T, 900, 'beetle passed').log('beetle passed ' + Math.round(beetle().x));
  a.down(L).until((g) => g.player.has('earplugs'), 300, 'earplugs').up(L).log('earplugs').wait(45);
  // back out: hide at spot 4 while it comes back, then leave
  a.until(() => beetle().dir < 0, 900, 'beetle returning');
  a.down(R).until((g) => g.player.x > 3.6 * T, 60).up(R).wait(3).tap(D, 3).until((g) => g.player.hidden, 10, 'hidden 2').log('hidden 2')
    .until(() => beetle().x < 2 * T, 900, 'beetle past').log('beetle past');
  a.down(R).until((g) => g.player.has('glow'), 400, 'glow').log('glow').wait(45)
    .until((g) => g.room.id === 'sb-dark', 200, 'exit').log('exit').end();
}

// 5. Dark: take the Swift Feather, chirp-stun the ant, jump + flutter onto the high ledge,
//    free Stripe (the sandbox's "rescue": levelComplete).
function dark(a) {
  const ant = () => a.g.enemies.find((e) => e.type === 'ant');
  a.wait(5).down(R).until((g) => g.player.has('feather'), 200, 'feather').log('feather').wait(45)
    .until(() => Math.abs(ant().x - a.p.x) < 120, 400, 'ant near').tap(CHIRP, 3).log('chirp').wait(2)
    .until((g) => g.player.x > 19.4 * T, 300, 'below ledge').up(R).wait(12)
    .down(J).wait(3).until((g) => g.player.vy >= 0, 40).up(J).wait(1).down(R).tap(J, 10).log('flutter')
    .until((g) => g.player.state === 'ground', 120, 'ledge').log('on ledge')
    .until((g) => g.levelComplete, 200, 'rescued').log('rescued').end();
}

const ROOMS = { meadow: [meadow, { room: 'sb-meadow' }, 'sandbox-1-meadow', { room: 'sb-shaft' }], shaft: [shaft, { room: 'sb-shaft', x: 0, y: 33, items: ['booties'] }, 'sandbox-2-shaft', { room: 'sb-pond' }],
  pond: [pond, { room: 'sb-pond', x: 1, y: 13, items: ['booties', 'floss'] }, 'sandbox-3-pond', { room: 'sb-cellar' }], cellar: [cellar, { room: 'sb-cellar', x: 0, y: 9, items: ['booties', 'floss', 'raft', 'band', 'glider'] }, 'sandbox-4-cellar', { room: 'sb-dark' }],
  dark: [dark, { room: 'sb-dark', x: 0, y: 15, items: ['booties', 'floss', 'raft', 'band', 'glider', 'thimble', 'earplugs', 'glow'] }, 'sandbox-5-dark', { room: 'sb-dark', levelComplete: true }] };
for (const [key, [fn, start, name, expect]] of Object.entries(ROOMS)) {
  if (!want(key)) continue;
  const a = new Author(start); fn(a); a.save(name, expect);
}
// the whole sandbox in one go, from New Game's start to the rescue
if (want('full')) {
  const a = new Author({ room: 'sb-meadow' });
  for (const [fn] of Object.values(ROOMS)) fn(a);
  a.save('sandbox-0-full', { room: 'sb-dark', levelComplete: true });
}
