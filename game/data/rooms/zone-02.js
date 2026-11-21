// Zone 2: the Bathroom (builder A). Aqua tile, steam, white porcelain.
// New here: the first real wall-jump climbs, steam vents that lift you, the Floss Line and its
// towel-hook tutorial, silverfish and mosquitoes. Chikchak's chirps lead into her lair.
import { grid } from './grid-a.js';
import { TEXT } from '../text.js';
const S = TEXT.signs;
// ---------------------------------------------------------------- bath-door (10,5) 1x1
function door() {
  const g = grid(1, 1);
  g.clear(1, 2, 30, 14).clear(0, 12, 1, 4).clear(31, 12, 1, 4);
  g.clear(4, 0, 8, 2);                         // up the radiator into bath-steam
  for (let r = 14, i = 0; r >= 0; r -= 2, i++) g.row(i % 2 ? 4 : 8, r, 4, '=');   // radiator fins
  g.row(22, 15, 5, 'C');                       // the lint plug in front of the old laundry chute
  g.clear(23, 16, 3, 1);                       // the chute hatch (under the plug)
  g.put(16, 15, 'S').put(13, 15, 'P');
  return g.rows();
}
// ---------------------------------------------------------------- bath-steam (10,3) 1x2
function steam() {
  const g = grid(1, 2);
  g.clear(2, 1, 28, 33).clear(4, 34, 8, 2);    // from the door (bottom, cols 4-11)
  g.clear(30, 10, 2, 4);                       // to the mirror ledge (right, rows 10-13)
  for (let r = 34, i = 0; r >= 26; r -= 2, i++) g.row(i % 2 ? 4 : 8, r, 4, '=');  // the radiator fins carry on up
  g.row(2, 24, 21, '#');                       // the radiator top and its valve (the steam vent)
  g.row(22, 14, 10, '#');                      // the ledge to the mirror shelf
  g.put(6, 23, 'k').put(26, 13, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- bath-toilet (11,4) 2x2
function toilet() {
  const g = grid(2, 2);
  g.clear(2, 1, 60, 33);
  g.box(2, 1, 16, 21, '#');                    // the tiled wall above the door side
  g.clear(0, 30, 2, 4);                        // from the door (left, rows 30-33)
  g.clear(62, 10, 2, 4).clear(62, 30, 2, 4);   // to the sink: tank lid (rows 10-13) and floor (rows 30-33)
  g.clear(21, 0, 3, 1);                        // up the shaft to the mirror ledge (Booties)
  g.box(18, 1, 3, 31, '#');                    // tile pillar (left side of the shaft; crawl under it)
  g.box(24, 1, 2, 9, '#').box(24, 14, 2, 20, '#'); // tile pillar (right side), a gap onto the tank lid
  g.box(26, 14, 16, 12, 'G');                  // the cistern (porcelain)
  g.box(26, 26, 12, 8, 'G');                   // the bowl
  g.box(38, 26, 4, 8, '%').clear(39, 33, 2, 1); // behind the bowl: a Mote crack, crumbs inside
  g.row(44, 14, 20, '#');                      // the vanity-side shelf (on to the sink)
  g.put(10, 33, 'k').put(32, 13, 'k').put(52, 33, 'k').put(52, 13, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- bath-cabinet (11,3) 2x1
function cabinet() {
  const g = grid(2, 1);
  g.clear(2, 1, 60, 16);
  g.clear(0, 10, 2, 4).clear(62, 10, 2, 4);    // steam (left), sink (right)
  g.box(0, 1, 2, 9, 'G');                      // slick paint by the radiator
  g.row(0, 14, 2, '#').row(2, 15, 18, 'G');   // the glass shelf under the mirror
  g.box(18, 15, 3, 3, '#');                    // the shaft from the toilet comes up here
  g.clear(21, 15, 3, 3);
  g.row(48, 15, 14, 'G').row(62, 14, 2, '#');  // the far glass shelf
  g.box(6, 7, 10, 5, 'G');                     // the mirror cabinet (its top: 8 tiles over the shelf)
  g.put(23, 10, 'H').put(28, 11, 'H').put(33, 11, 'H').put(38, 12, 'H').put(43, 12, 'H');
  g.put(8, 14, 'k').put(56, 14, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- bath-sink (13,3) 1x3
function sink() {
  const g = grid(1, 3);
  g.clear(2, 1, 28, 51);
  g.clear(0, 10, 2, 4);                        // mirror ledge (left, rows 10-13)
  g.row(0, 14, 2, '#');
  g.clear(0, 28, 2, 4);                        // the cistern lid (left, rows 28-31)
  g.row(2, 32, 3, '=');                        // a towel bar across the shaft (from the cistern lid)
  g.clear(0, 48, 2, 4);                        // the toilet floor (left, rows 48-51)
  g.clear(30, 8, 2, 4);                        // the high shelf (right, rows 8-11: a glide)
  g.clear(30, 30, 2, 4);                       // the lair door (right, rows 30-33)
  g.clear(30, 48, 2, 4);                       // into the tub (right, rows 48-51)
  g.box(30, 0, 2, 8, 'G').box(30, 12, 2, 18, 'G'); // slick tiles by the tub
  g.box(5, 16, 19, 2, '#');                    // the countertop
  g.box(5, 18, 15, 32, '#');                   // the vanity (wood: the wall-jump shaft is cols 2-4)
  g.row(14, 14, 4, '=').row(17, 12, 4, '=').row(19, 10, 4, '=');  // soap dish, toothbrush cup, towel ring
  g.box(22, 34, 10, 2, '#');                   // the tub-side ledge (save 2, the lair door)
  g.put(25, 33, 'S');
  g.put(13, 15, 'B');                          // the overflow hole, right beside the floss, at the counter ([issue 28] was a tile up, in the air)
  g.put(3, 51, 'k').put(10, 15, 'k').put(24, 51, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- bath-shelf (14,3) 2x1
function shelf() {
  const g = grid(2, 1);
  g.clear(0, 2, 60, 14);
  g.row(0, 12, 24, '#');                       // the towel shelf
  g.box(10, 10, 6, 2, '#');                    // folded towels
  g.box(24, 14, 3, 2, '#');                    // a fallen towel: the way back up
  g.box(40, 13, 20, 3, 'G');                   // the tub's far rim below
  return g.rows();
}
// ---------------------------------------------------------------- bath-lair (14,4) 2x1
function lair() {
  const g = grid(2, 1);
  g.clear(2, 1, 60, 15);
  g.clear(0, 12, 2, 4).clear(62, 12, 2, 4);    // from the sink; on to the landing (rescue gate)
  g.box(2, 1, 2, 11, 'G');
  g.row(4, 6, 8, 'G');                         // the mirror ledge (Chikchak's perch)
  g.box(42, 6, 2, 8, '#');                    // the shower riser: tiled pillars around a 3-wide shaft (crawl in under the left one)
  g.box(47, 6, 3, 10, '#');
  for (const r of [14, 12, 10, 8, 6]) g.row(50, r, 2, '='); // [issue #4] ledges up the pillar's far side: back out from behind the riser (before the rescue the gate is shut)
  g.row(38, 6, 4, '#');                        // the riser's top shelf (faucet 3)
  g.row(57, 9, 5, 'G');                        // the soap dish (Katy), 7 tiles up
  g.box(60, 1, 2, 8, 'G').box(60, 10, 2, 2, 'G');
  g.put(53, 3, 'H');                                      // towel hooks to the soap dish
  return g.rows();
}
// ---------------------------------------------------------------- bath-tub (14,5) 2x1
function tub() {
  const g = grid(2, 1);
  g.clear(0, 2, 62, 14).clear(0, 12, 2, 4);
  g.box(62, 0, 2, 18, 'G');
  g.row(4, 14, 3, '=');                        // the step stool
  g.box(8, 13, 2, 3, 'G');                     // the tub's near rim
  g.box(10, 13, 32, 3, '~');                   // bath water
  g.box(42, 13, 2, 3, 'G');                    // a ridge in the tub
  g.box(44, 15, 18, 1, 'G');                   // the dry end of the tub
  g.box(8, 16, 54, 2, 'G');
  g.row(46, 15, 4, 'C');                       // the hair-and-soap plug
  g.clear(45, 16, 6, 1);                       // the drain pocket (Shelly)
  g.row(28, 11, 4, '#');                       // the soap ledge
  return g.rows();
}
export default {
  id: 'z02-bathroom', n: 2, name: 'Bathroom',
  palette: ['#8CC9C4', '#E9F1EE', '#A9B8C2', '#4F7F86'],
  bg: 'z02-bathroom',
  start: { room: 'bath-door' },
  beacon: { room: 'bath-sink', x: 13, y: 15 },
  lair: { room: 'bath-lair', x: 58, y: 8 },
  decoys: [{ voice: 'chikchak', room: 'bath-lair', x: 7, y: 5, every: 9 }],
  near: ['soap-dish', 'sponge', 'steam-puff'],
  rooms: [
    {
      id: 'bath-door', name: 'The Bathroom Door', x: 10, y: 5,
      terrainKinds: { C: 'plaster' },
      grid: door(),
      bg: { v: 'a', x: 0.1, y: 0.8 },
      decor: [
        { prop: 'save-crack', x: 16, y: 15, h: 1.2, layer: 'back' },
        { prop: 'steam-vent', x: 8, y: 15, h: 1.2, layer: 'back' },
        { prop: 'drawer-pull', x: 24, y: 16.6, h: 0.8, layer: 'back' },
      ],
      fx: [{ kind: 'steam', x: 8, y: 14, every: 6 }],
      entities: [
        { type: 'sign', x: 18, y: 15, w: 5, text: S.save },
        { type: 'sign', x: 21, y: 15, w: 6, text: S.chute },
        { type: 'door', x: 24, y: 16, to: 'laun-basket', at: [16, 3], label: 'Climb in' },
        { type: 'silverfish', x: 12, y: 15, range: [2, 30] },
        { type: 'hide', x: 28, y: 15, w: 1, art: 'none' },
      ],
    },
    {
      id: 'bath-steam', name: 'The Radiator', x: 10, y: 3,
      grid: steam(),
      bg: { v: 'b', x: 0.85, y: 0.4 },
      decor: [
        { prop: 'steam-vent', x: 20, y: 23, h: 1.3, layer: 'back' },
        { prop: 'faucet-handle', x: 13, y: 23, h: 1.2 },
      ],
      fx: [{ kind: 'steam', x: 20, y: 22, every: 3 }, { kind: 'steam', x: 6, y: 33, every: 7 }],
      entities: [
        { type: 'lift', kind: 'steam', x: 18, y: 13, w: 4, h: 11, vy: 9, on: 2.5, off: 1.2, phase: 0 },
        { type: 'sign', x: 15, y: 23, w: 5, text: 'Steam pushes you up. Step into it when it puffs.' },
        { type: 'mosquito', x: 14, y: 9 },
        { type: 'mosquito', x: 22, y: 29 },
      ],
    },
    {
      id: 'bath-toilet', name: 'The Toilet', x: 11, y: 4,
      grid: toilet(),
      bg: { v: 'b', mirror: true, x: 0.5, y: 0.5 },
      decor: [
        { prop: 'spool', x: 48, y: 13, h: 1.4, layer: 'mid' }, // [issue 40] on the ledge, not under it
        { prop: 'steam-puff', x: 34, y: 12.5, h: 1.2, alpha: 0.5, layer: 'back' },
      ],
      paint: [],
      entities: [
        { type: 'sign', x: 20, y: 33, w: 4, text: S.wallJump },
        { type: 'silverfish', x: 46, y: 33, range: [42, 60] },
        { type: 'silverfish', x: 8, y: 33, range: [2, 17] },
        { type: 'hide', x: 6, y: 33, w: 1, art: 'none' },
        { type: 'crumbs', x: 39, y: 33, n: 25 },
        { type: 'crumbs', x: 34, y: 13, n: 5 }, // [issue 40] on the floor, not over the checkpoint's flag
      ],
    },
    {
      id: 'bath-cabinet', name: 'The Mirror Ledge', x: 11, y: 3,
      grid: cabinet(),
      bg: { v: 'a', x: 0.35, y: 0.3 },
      decor: [
        { prop: 'soap-dish', x: 54, y: 14, h: 0.9 }, // [issue 40] on the shelf
        { gecko: 'chikchak', pose: 'sleep', x: 56, y: 14, len: 240, after: 'katy', layer: 'mid' },
      ],
      entities: [
        { type: 'sign', x: 14, y: 14, w: 6, text: S.floss }, // [issue 9] a row lower: the note stands on the counter
        { type: 'secret', id: 'bath-songseed-cabinet', x: 11, y: 6 }, // [issue 40] on the cabinet's top
        { type: 'mosquito', x: 34, y: 6 },
      ],
    },
    {
      id: 'bath-sink', name: 'The Sink', x: 13, y: 3,
      grid: sink(),
      bg: { v: 'a', mirror: true, x: 0.7, y: 0.5 },
      decor: [
        { prop: 'faucet-handle', x: 9, y: 15, h: 1.3 },
        { prop: 'soap-dish', x: 16, y: 13, h: 0.9 }, // [issue 40] on the plank, not under it
        { prop: 'save-crack', x: 25, y: 33, h: 1.2, layer: 'back' },
        { prop: 'drawer-pull', x: 13, y: 30, h: 1.0 },
        { prop: 'sponge', x: 27, y: 51, h: 1.0 },
      ],
      entities: [
        { type: 'item', item: 'floss', x: 12, y: 15 },
        { type: 'sign', x: 2, y: 31, w: 4, text: 'The vanity is wood: it sticks. Wall-jump up the gap to the counter.' },
        { type: 'lair', boss: 'chikchak', x: 28, y: 33, w: 2, h: 3, to: 'bath-lair', at: [4, 15] },
        { type: 'silverfish', x: 12, y: 51, range: [2, 29] },
        { type: 'crumbs', x: 21, y: 9, n: 5 },
      ],
    },
    {
      id: 'bath-shelf', name: 'The High Shelf', x: 14, y: 3,
      grid: shelf(),
      bg: { v: 'b', x: 0.7, y: 0.2 },
      fx: [{ kind: 'steam', x: 30, y: 15, every: 4 }, { kind: 'steam', x: 46, y: 12, every: 5 }],
      entities: [
        { type: 'secret', id: 'bath-crumbs-shelf', x: 20, y: 11 },
      ],
    },
    {
      id: 'bath-lair', name: 'The Bathtub Rim', x: 14, y: 4,
      grid: lair(),
      bg: { v: 'b', x: 0.75, y: 0.6 },
      decor: [
        { prop: 'soap-dish', x: 59, y: 8.4, h: 1.2 },
      ],
      entities: [
        ...[5, 9, 13, 17, 28, 40, 53].map((x) => ({ type: 'hide', x, y: 15, w: 1, art: 'none' })),   // grout cracks (never more than 4 tiles apart near the taps)
        { type: 'boss', boss: 'chikchak', x: 8, y: 15, cricket: 'katy', checkpoints: [[5, 15], [5, 15], [38, 15]] },
        { type: 'gate', id: 'bath-exit', x: 62, y: 12, w: 2, h: 4, opens: { rescued: 'katy' }, msg: TEXT.gates.rescue },
      ],
    },
    {
      id: 'bath-tub', name: 'Inside the Tub', x: 14, y: 5,
      grid: tub(),
      bg: { v: 'a', x: 0.2, y: 0.25 },
      decor: [{ prop: 'soap-dish', x: 30, y: 10.4, h: 1.2 }],
      entities: [
        { type: 'secret', id: 'bath-seedheart-soap', x: 30, y: 10 },
        { type: 'npc', who: 'shelly', x: 48, y: 16, recruit: 'shelly' },
        { type: 'sign', x: 2, y: 15, w: 5, text: S.raft },
      ],
    },
  ],
};
