// [fixer] Recorded solutions for the gameplay fixes, authored with the headless sim:
//   node tools/solutions/fixer.mjs [filter]
// fixer-laun-duo     Duo shoves the detergent box into the cubby and takes the laun-duo cache
// fixer-laun-shelf   [issue #19] the whole shelf room as Duo with the Band: in at the doorway, the cache, the
//                    ironing board's crumbs, the top shelf's song-seed, and back out to the washer
// fixer-stu-duet     post-game: Pip chirps at the Study music box, swap, Chip chirps: it opens
// fixer-att-duet     post-game: the same at the Attic music box (Chip first this time)
// fixer-kit-cloak    the Cellophane Cloak through the beetle nest under the dishwasher (kit-cloak)
// fixer-chim-ash     pound the hearth plug, fall to the ash pit, climb chim-ash back up through the hole
import { Author } from '../author.mjs';
import { flag } from '../../game/src/mechanics.js';

const R = 'ArrowRight', L = 'ArrowLeft', U = 'ArrowUp', D = 'ArrowDown', SHIFT = 'ShiftLeft', J = 'KeyZ', USE = 'KeyV', CHIRP = 'KeyC', SWAPN = 'KeyE';
const T = 40;
const only = process.argv[2];
const want = (n) => !only || n.includes(only);
const ground = (g) => g.player.state === 'ground';
const tx = (g) => g.player.cx / T, ty = (g) => (g.player.y + g.player.h) / T;
const ALL = ['booties', 'floss', 'raft', 'band', 'glider', 'thimble', 'glow', 'earplugs', 'feather'];
const TEN = ['stripe', 'katy', 'duo', 'frost', 'hump', 'jam', 'rin', 'digby', 'mote', 'chip'];
const must = (cond, msg) => { if (!cond) throw new Error(msg); };

// ---- Duo's Shove: the detergent box into the cubby, the crumb cache behind it ----
if (want('laun-duo')) {
  const a = new Author({ room: 'laun-shelf', x: 18, y: 15, items: ['booties', 'floss', 'raft', 'glider'], party: ['duo'], rescued: ['stripe', 'katy', 'duo'] });
  a.wait(10).down(R).until((g) => g.mech.pushes[0].x >= 25, 300, 'the box moves').log('shoving');
  a.until((g) => tx(g) > 27.5, 600, 'into the cubby').up(R).log('in the cubby (laun-duo)');
  must(a.g.mech.pushes[0].x >= 28, 'box not shoved in');
  a.end();
  a.save('fixer-laun-duo', { room: 'laun-shelf' });
}

// ---- [issue #19] laun-shelf end to end: Duo (Jump 2) with the Band, as the Laundry is entered from the Pantry ----
if (want('laun-shelf')) {
  const a = new Author({ room: 'laun-shelf', x: 1, y: 15, items: ['booties', 'floss', 'raft', 'band'], party: ['duo'], rescued: ['stripe', 'katy', 'duo', 'frost'] });
  // the headless sim does not run meta-run.js (crumbs, secrets): note what the cricket touches, as it does
  const got = new Set(), ents = a.g.room.def.entities.filter((e) => e.type === 'secret' || e.type === 'crumbs');
  const touches = (p, e) => p.x < (e.x + 1) * T && p.x + p.w > e.x * T && p.y < (e.y + 1) * T && p.y + p.h > e.y * T;
  const step = a._step.bind(a);
  a._step = (n = 1) => { for (let i = 0; i < n; i++) { step(1); if (a.g.room.id === 'laun-shelf') for (const e of ents) if (touches(a.p, e)) got.add(e.id || 'crumbs'); } };
  a.wait(20).log('in the doorway (Duo)');
  a.down(R).until((g) => tx(g) > 2.6, 60, 'to the bottle').tap(J, 14).until((g) => ground(g) && ty(g) < 14.1, 90, 'on the bottle').log('on the bottle');
  a.tap(J, 14).until((g) => ground(g) && ty(g) < 12.1, 90, 'on the jugs').log('on the jugs');
  a.until((g) => ty(g) > 15.9 && tx(g) > 13, 200, 'down the far side').log('down the far side');
  a.until((g) => g.mech.pushes[0].x >= 25, 600, 'the box moves').log('shoving');
  a.until((g) => tx(g) > 27.5, 600, 'into the cubby').up(R).log('in the cubby (laun-duo)');
  must(a.g.mech.pushes[0].x >= 28, 'box not shoved in');
  a.down(L).until((g) => tx(g) < 20.5, 300, 'out of the cubby').up(L).until(ground, 60, 'stopped').wait(6).log('under the ironing board');
  a.down(USE).wait(22).up(USE).until((g) => ground(g) && ty(g) > 8.9 && ty(g) < 9.1, 120, 'on the ironing board').log('super-jump to the board (crumbs)');
  a.down(L).until((g) => tx(g) < 14.4, 200, 'the board end').up(L).until((g) => ground(g) && Math.abs(g.player.vx) < 1, 30, 'stopped').log('the board end');
  a.down(USE).wait(22).down(L).up(USE).until((g) => ground(g) && ty(g) < 3.1, 120, 'top shelf').log('super-jump to the top shelf');
  a.until((g) => tx(g) < 5, 200, 'the song-seed').up(L).log('the song-seed');
  a.down(R).until((g) => ground(g) && ty(g) > 8.9, 300, 'down').up(R).log('dropped to the board');
  a.down(L).until((g) => ground(g) && ty(g) > 9.1, 300, 'off the board end').log('off the board end');
  for (let i = 0; i < 3 && ty(a.g) > 12.1; i++) { const at = ty(a.g); a.tap(J, 14).until((g) => ground(g) && ty(g) < at - 1.9, 90, 'a step up').log('a step up'); } // the bottle, then the jugs
  a.until((g) => g.room.id === 'laun-washer', 600, 'out the doorway').log('into the washer');
  for (const id of ['laun-duo', 'crumbs', 'laun-songseed-shelf']) must(got.has(id), `missed ${id}`);
  a.end();
  a.save('fixer-laun-shelf', { room: 'laun-washer' });
}

// ---- Chip's Duet: chirp with one, swap, chirp with the other within 2 s ----
function duet(name, room, x, y, first) {
  const party = first === 'pip' ? ['pip', 'chip'] : ['chip', 'pip'];
  const a = new Author({ room, x, y, items: ALL, party, rescued: TEN });
  a.wait(20).until(ground, 60, 'landed');
  a.tap(CHIRP, 3).wait(10).log(`${first} chirps`);
  a.tap(SWAPN, 3).until((g) => g.player.id !== first, 30, 'swapped').wait(6).log('swapped');
  a.tap(CHIRP, 3).wait(10).log('second voice');
  must(flag(a.g, `sw:${name}`), `${name} did not open`);
  a.end();
  a.save(`fixer-${name}`, { room });
}
if (want('stu-duet')) duet('stu-duet', 'stu-globe', 13, 15, 'pip');
if (want('att-duet')) duet('att-duet', 'att-boxes', 20, 15, 'chip');

// ---- kit-cloak: from the under-sink cabinet west through the beetle nest, cloaked ----
if (want('kit-cloak')) {
  const a = new Author({ room: 'kit-undersink', x: 3, y: 15, items: ['booties', 'floss', 'raft', 'cloak'], party: ['pip'], rescued: ['stripe', 'katy', 'duo'] });
  a.wait(20).down(L).until((g) => g.room.id === 'kit-table' && tx(g) < 92.5, 300, 'into the table room').log('east of the dishwasher');
  a.down(SHIFT).until((g) => g.player.cloaked, 30, 'cloaked').log('cloaked');
  a.until((g) => tx(g) < 78.5, 240, 'through the nest').up(SHIFT).log('through the beetle nest');
  must(a.p.health === a.p.maxHealth, 'hurt in the nest');
  a.up(L).end();
  a.save('fixer-kit-cloak', { room: 'kit-table' });
}

// ---- chim-ash: the top hop through the hearth plug hole ----
if (want('chim-ash')) {
  const a = new Author({ room: 'liv-hearth', x: 15, y: 33, items: ALL, party: ['duo'], rescued: TEN.filter((c) => c !== 'chip') });
  a.wait(20).until(ground, 60);
  // pound the plug (C, cols 14-17 of rows 34-35)
  a.tap(J, 10).wait(4).down(D).tap(J, 3).up(D).until((g) => g.room.id !== 'liv-hearth', 200, 'through the plug').log('fell through');
  a.until((g) => ground(g), 600, 'the ash pit').log('ash pit');
  // up the lips (jump + flutter, lip to lip), into chim-ash and out of the top through the hole
  const hop = () => {
    const left = tx(a.g) < 16, d = left ? R : L, y0 = ty(a.g), room = a.g.room.id;
    a.down(d).until((g) => (left ? g.player.x + g.player.w > 14 * T + 4 : g.player.x < 18 * T - 4), 60, 'lip edge');
    a.tap(J, 17).tap(J, 14).until((g) => ground(g) && (g.room.id !== room || ty(g) < y0 - 1), 120, 'next lip').up(d);
  };
  for (let i = 0; i < 40 && a.g.room.id !== 'liv-hearth'; i++) {
    if (a.g.room.id === 'chim-ash' && ty(a.g) <= 2.05) break;
    hop();
  }
  if (a.g.room.id === 'chim-ash') {
    a.log('top lip of chim-ash');
    // the top hop: jump + flutter up through the plug hole, drift right onto the hearth floor
    a.down(L).wait(4).up(L).down(J).wait(17).up(J).wait(4).tap(J, 14).wait(4).down(R).until((g) => g.room.id === 'liv-hearth' && ground(g), 160, 'onto the hearth floor').up(R);
  }
  must(a.g.room.id === 'liv-hearth' && ty(a.g) < 34.1, 'not back on the hearth floor');
  a.log('back on the hearth floor').end();
  a.save('fixer-chim-ash', { room: 'liv-hearth' });
}
