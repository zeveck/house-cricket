// Zone 6: the Living Room (builder B). Brief: design/zones/z06.md. Rooms at their house.js cells;
// grids drawn with b-kit rectangles (local tile coordinates; 32x18 per screen).
// Two ways in, both landing in the armchair: super-jump the armchair back from the stair foot
// (Rubber Band) or glide onto the curtain pelmet from the stairs (Glider). Then the rug (robot
// vacuum sneak) -> up the side-table leg to the sewing basket (Thimble; pound the cracker plug
// straight back down) -> the rug's right end -> liv-lair (Gargy). Onward: basket -> piano ->
// floor lamp -> fireplace (Sunroom, ash pit, flue).
import { grid } from './b-kit.js';

// ---- liv-armchair (cell 18,6, 2x3) ----
const ac = grid(2, 3).frame('#');
ac.r(0, 0, 1, 54, 'G');                               // left wall: slick (no wall-jumping round the gates)
ac.r(0, 4, 1, 4, '.');                                // the stairs side (exact, rows 4-7): glide in
ac.r(0, 8, 7, 1);                                     // the curtain pelmet
ac.r(1, 2, 9, 1, '=');                                // the curtain rod (a song-seed: Rubber Band)
ac.r(0, 48, 1, 4, '.');                               // the stair foot (exact, rows 12-15 of cell 18,8)
ac.r(0, 52, 64, 2);                                   // the floor
ac.r(63, 48, 1, 4, '.');                              // right: the rug
ac.r(1, 50, 2, 2);                                    // a footstool by the door
ac.r(3, 43, 3, 9, 'G');                               // the armchair's back: 9 tiles of slick upholstery
ac.r(6, 47, 15, 5);                                   // the seat
ac.r(21, 44, 3, 8, 'G');                              // its arm
for (const y of [50, 48, 46]) ac.r(24, y, 3, 1, '='); // [cracks] a magazine rack's slats up the arm's outside: without the Rubber
                                                     // Band nobody got back over the armchair to the stairs (glider route: stuck)
ac.r(26, 36, 8, 1, '=').r(36, 31, 8, 1, '=');         // a side table and the window sill above the seat
ac.r(40, 22, 10, 1);                                  // a bookshelf (crumbs)

// ---- liv-rug (cell 20,8, 2x1): the robot vacuum sneak ----
const rg = grid(2, 1).frame('#');
rg.r(0, 12, 1, 4, '.').r(63, 12, 1, 4, '.');          // left: the armchair; right: the sofa (lair door)
rg.r(0, 16, 64, 2);
rg.r(5, 0, 3, 1, '.');                                // up the side-table leg (cling) to the basket
rg.r(4, 1, 1, 13).r(8, 1, 1, 13);                     // the side table's legs: a wall-jump shaft
rg.r(21, 0, 3, 1, '.').r(20, 1, 1, 9, 'G').r(24, 1, 1, 9, 'G'); // the cracker chute down from the basket (one way)
rg.r(26, 10, 11, 1, '=');                             // the coffee table (the squeaky toy sits on it)
// (its legs are painted: the vacuum and you pass under the table)

// ---- liv-basket (cell 20,6, 1x2): the side table, the sewing basket ----
const bs = grid(1, 2).frame('#');
bs.r(5, 35, 3, 1, '.').r(21, 35, 3, 1, '.');          // down to the rug: the leg shaft, the chute
bs.r(4, 12, 1, 23).r(8, 15, 1, 20);                   // the table legs (the shaft continues up past the top)
bs.r(8, 20, 23, 1);                                   // the table top
bs.r(21, 20, 3, 1, 'C');                              // a plug of dropped crackers (pound it: straight back to the rug)
bs.r(20, 21, 1, 14, 'G').r(24, 21, 1, 14, 'G');       // the chute
bs.r(9, 21, 11, 14).r(25, 21, 6, 14);                 // under the table: shelves of yarn (solid)
bs.r(31, 8, 1, 8, '.');                               // right: the piano (rows 8-15)
bs.r(21, 16, 10, 1);                                  // shelf to the piano
bs.r(25, 17, 1, 3, '.');                              // (a shadowy nook under it: its gate is an entity)
bs.r(9, 14, 10, 1);                                   // the sewing basket's rim
bs.r(19, 18, 2, 2);                                   // [issue #4] a ball of yarn: back out of the basket (its way in was 4 up from its floor)
bs.r(1, 5, 1, 11, 'G');

// ---- liv-piano (cell 21,6, 2x2) ----
const pn = grid(2, 2).frame('#');
pn.r(0, 8, 1, 8, '.');                                // left: the basket (rows 8-15)
pn.r(63, 30, 1, 4, '.');                              // right: the floor lamp (rows 12-15 of cell 22,7)
pn.r(63, 2, 1, 6, '.');                               // ... and high over to the lampshade (glide)
pn.r(0, 34, 64, 2);
pn.r(0, 16, 10, 1);                                   // the ledge from the basket
pn.r(6, 28, 6, 6);                                    // the piano bench
pn.r(24, 20, 5, 1).r(28, 21, 1, 3, 'G').r(24, 24, 5, 1); // the cubby beside the keys (lid: the melody opens it)
for (let k = 0; k < 4; k++) pn.r(k % 2 ? 13 : 10, 14 - 2 * k, 3, 1, '=');    // the music-stand brackets up
pn.r(16, 6, 3, 1, '=');
for (const [x, y] of [[12, 32], [12, 30], [12, 26], [9, 24], [12, 22], [9, 20], [12, 18]]) pn.r(x, y, 3, 1, '='); // [cracks] more brackets, from
                                                      // the floor by the bench back up to the basket ledge (the floor was a pit: from the lamp and the hearth
                                                      // there was no way back west without Jam's wall-run or the Rubber Band)
pn.r(19, 8, 32, 1);                                   // the piano top
pn.r(23, 4, 13, 1).r(23, 5, 1, 3, 'G').r(35, 5, 1, 1, 'G'); // the open top: the hammers inside (loud)
pn.r(50, 9, 1, 21, 'G');                              // the piano's side
pn.r(55, 29, 2, 5);                                   // a stack of music books (Jam wall-runs up)
pn.r(57, 30, 2, 4).r(59, 32, 2, 2);                   // [cracks] two shorter piles on the lamp side: the way back from the lamp
                                                      // and the hearth (from this side only; from the piano side it's still 5 tall)

// ---- liv-lamp (cell 23,6, 1x2) ----
const lp = grid(1, 2).frame('#');
lp.r(0, 30, 1, 4, '.');                               // left: the piano floor
lp.r(0, 2, 1, 6, '.');                                // high: from the piano top
lp.r(0, 34, 32, 2);
lp.r(31, 26, 1, 6, '.');                              // right: the mantel (rows 8-13 of cell 23,7)
lp.r(24, 32, 8, 2);                                   // the step up to the mantel
lp.r(8, 10, 12, 1);                                   // the lampshade
lp.r(13, 11, 2, 18, 'G');                             // the pole (its foot is an open ring over the base)
lp.r(9, 32, 10, 2);                                   // the base

// ---- liv-hearth (cell 24,7, 1x2) ----
const hr = grid(1, 2).frame('#');
hr.r(0, 8, 1, 6, '.');                                // left: the mantel from the lamp
hr.r(0, 14, 8, 1);                                    // the mantel ([cracks] 8 wide, was 9: a 2-wide gap at its end)
hr.r(10, 0, 2, 30).r(20, 0, 2, 30);                   // the chimney breast round the throat
hr.r(10, 0, 2, 30, 'G').r(20, 0, 2, 30, 'G');
hr.r(12, 0, 8, 1, '.');                               // the flue throat (exact, cols 12-19)
for (const [x, y] of [[12, 29], [19, 25], [12, 21], [19, 17], [12, 13], [19, 9], [17, 5]]) hr.r(x, y, 1, 1); // brick lips (flutter up) ([playtest] the last one was row 6: the hop from row 13 to row 9 hit its head on it)
// [playtest] the lips were 1 tile, 7 columns apart: only Stripe's speed could flutter from one to the next (Pip, Duo:
// no way up to the Attic). Now 2 deep like the flue's (cols 12-13 / 18-19: 4 up, 4 across), plus a low lip off the floor
for (const [x, y] of [[13, 29], [18, 25], [13, 21], [18, 17], [13, 13], [18, 9]]) hr.r(x, y, 1, 1);
hr.r(18, 31, 2, 1);
hr.r(12, 2, 2, 2);                                    // the smoke shelf (the flue's first lip is 4 up, 4 across: builder D)
hr.r(0, 34, 32, 2);
hr.r(14, 34, 4, 1, 'C');                              // the ash-dump soot plug (exact, cols 14-17)
// [issue #4] under it, the ash-dump door: shut (a gate) until you carry the Glow Bead. The ash pit below is dark
// (needs the Glow Bead): pounding through the plug without it left you hanging in the pound on the dark room's edge.
hr.r(14, 35, 4, 1, '.');
hr.r(31, 30, 1, 4, '.');                              // right: the Sunroom (exact, rows 12-15 of cell 24,8)
hr.r(26, 30, 6, 4, 'C');                              // fallen plaster rubble in the threshold
hr.r(22, 32, 4, 2);                                   // the hearth step
for (let k = 0; k < 8; k++) hr.r(k % 2 ? 2 : 5, 31 - 2 * k, 3, 1, '=');      // brick ledges back up to the mantel
hr.r(6, 16, 3, 1, '=');                               // [cracks] the top ledge: was row 15 under the mantel (no headroom), so the
                                                      // climb ended 3 below the 1-wide gap; now 2 below a 2-wide one (Jump 2 makes it)
hr.r(1, 33, 1, 1, '.').r(2, 33, 1, 1, '%').r(1, 32, 2, 1); // a crack between the bricks (Mote)

// ---- liv-lair (cell 22,8, 2x1): Gargy's sofa ----
const lr = grid(2, 1).frame('#');
lr.r(0, 12, 1, 4, '.');                               // left: the rug (the lair door)
lr.r(0, 16, 64, 2);
lr.r(6, 15, 3, 1);                                    // a pouf
lr.r(10, 13, 4, 3, 'G');                              // the sofa's left arm
lr.r(14, 15, 34, 1);                                  // the seat base (cushions on row 14 are entities)
lr.r(48, 13, 4, 3, 'G');                              // the right arm (the remote caddy)
lr.r(52, 15, 1, 1);                                   // [issue #4] a dropped coaster: back over the right arm (3 up, slick) from the end of the sofa
lr.r(14, 7, 34, 1);                                   // the sofa back's top, 7 up (Gargy lounges on it)
// (the back cushions are painted behind: the seat is open up to the back's top)

export default {
  id: 'z06-living', n: 6, name: 'Living Room',
  palette: ['#D48A8A', '#8C8F55', '#E8964A', '#6E4A5E'],
  bg: 'z06-living',
  start: { room: 'liv-armchair' },
  decoys: [{ voice: 'squeak-toy', room: 'liv-rug', x: 31, y: 9, every: 12 }],
  rooms: [
    {
      id: 'liv-armchair', name: 'The Armchair', x: 18, y: 6,
      grid: ac.rows(),
      bg: { v: 'a', x: 0.3, y: 0.5 },
      fx: [{ kind: 'motes', x: 6, y: 10, w: 30, h: 20 }],
      decor: [
        { prop: 'cushion', x: 13, y: 46, h: 1.4, layer: 'mid' },
        { prop: 'throw-pillow', x: 22, y: 43, h: 1.6, layer: 'back', rot: 0.2 },
        { prop: 'fake-plant', x: 46, y: 51, h: 5, layer: 'back' },
        { prop: 'book-spine', x: 44, y: 21, h: 2, layer: 'back' },
        { gecko: 'gargy', x: 14, y: 46, len: 300, layer: 'mid', after: 'jam' },
      ],
      entities: [
        { type: 'start', x: 7, y: 46 },
        { type: 'save', x: 8, y: 46 },
        { type: 'spring', x: 10, y: 47, w: 10, power: 9 },
        { type: 'checkpoint', x: 2, y: 7 },
        { type: 'checkpoint', x: 30, y: 51 },
        { type: 'secret', id: 'liv-songseed-rod', x: 5, y: 1 },
        { type: 'crumbs', x: 45, y: 21, n: 5 },
        { type: 'sign', x: 16, y: 46, w: 4, text: 'Cushions are bouncy. Hold {down} to land still.' },
      ],
    },
    {
      id: 'liv-rug', name: 'The Rug', x: 20, y: 8,
      grid: rg.rows(),
      bg: { v: 'b', x: 0.5, y: 0.7 },
      decor: [
        { prop: 'dice', x: 31, y: 9, h: 0.9, layer: 'mid' },
        { prop: 'cushion', x: 58, y: 15, h: 1.0, layer: 'back' },
      ],
      entities: [
        { type: 'checkpoint', x: 2, y: 15 },
        { type: 'checkpoint', x: 40, y: 15 },
        { type: 'hide', x: 11, y: 15, w: 2, art: 'bottle-cap' },
        { type: 'hide', x: 20, y: 15, w: 2, art: 'book-spine' },
        { type: 'hide', x: 30, y: 15, w: 2, art: 'tv-remote' },
        { type: 'hide', x: 41, y: 15, w: 2, art: 'bottle-cap' },
        { type: 'hide', x: 50, y: 15, w: 2, art: 'book-spine' },
        { type: 'vacuum', x: 46, y: 15, range: [10, 56] },
        { type: 'dustbunny', x: 55, y: 15, range: [53, 57], dir: 1, speed: 30 }, // [fixer] clear of the hiding spots, slow: hop it or split it
        { type: 'sign', x: 52, y: 15, w: 2, text: 'A dust bunny! Hop over it, or ground-pound it ({down} + {jump} in the air) to split it.' },
        { type: 'save', x: 59, y: 15 },
        { type: 'lair', boss: 'gargy', x: 61, y: 15, w: 2, h: 3 },
        { type: 'trigger', x: 30, y: 9, w: 3, h: 1, emit: 'dialog', key: 'oneLiners.squeakyToy' },
        { type: 'sign', x: 1, y: 15, w: 3, text: 'The vacuum sweeps the same loop every time. Watch it, then go.' },
      ],
    },
    {
      id: 'liv-basket', name: 'The Sewing Basket', x: 20, y: 6,
      grid: bs.rows(),
      bg: { v: 'a', mirror: true, x: 0.5, y: 0.3 },
      decor: [
        { prop: 'spool', x: 16, y: 13, h: 1.6, layer: 'back' },
        { prop: 'pin', x: 10, y: 13, h: 1.6, layer: 'back', rot: 0.3 },
        { prop: 'spool', x: 22, y: 19, h: 1.2, layer: 'mid' },
      ],
      entities: [
        { type: 'item', item: 'thimble', x: 13, y: 13 },
        { type: 'beacon', x: 11, y: 13 }, // [issue 28] the register, down on the basket rim (was a tile up, in the air)
        { type: 'stinkbug', x: 26, y: 15, range: [22, 29] },
        { type: 'gate', id: 'liv-shadow', x: 25, y: 17, w: 1, h: 3, opens: { item: 'glow' }, msg: 'Too dark to go in without a light. (Glow Bead)', tile: 'G' },
        { type: 'secret', id: 'liv-crumbs-dark', x: 27, y: 19 },
        { type: 'checkpoint', x: 10, y: 19 },
        { type: 'sign', x: 15, y: 13, w: 4, text: '{down} + {jump} in the air: a ground-pound. Crackers crumble.' },
      ],
    },
    {
      id: 'liv-piano', name: 'The Piano', x: 21, y: 6,
      grid: pn.rows(),
      bg: { v: 'b', x: 0.2, y: 0.4 },
      decor: [
        { prop: 'book-spine', x: 55, y: 28, h: 1.6, layer: 'mid' },
        { prop: 'tv-remote', x: 40, y: 33, h: 0.7, layer: 'mid' },
      ],
      entities: [
        { type: 'piano', id: 'liv-keys', x: 13, y: 24, kw: 2, keys: 5, melody: [0, 4, 2] },
        { type: 'gate', id: 'liv-lid', x: 24, y: 21, w: 1, h: 3, opens: { switch: 'liv-keys' }, msg: 'The music stand reads: first key, last key, middle key.' },
        { type: 'secret', id: 'liv-crumbs-keys', x: 26, y: 23 },
        { type: 'sign', x: 6, y: 15, w: 4, text: 'The music stand: first key, last key, middle key. Pound them.' }, // [issue 9] on the ledge's end (was over the drop)
        { type: 'loud', x: 24, y: 5, w: 11, h: 3 },
        { type: 'secret', id: 'liv-seedheart-piano', x: 26, y: 7 },
        { type: 'secret', id: 'liv-jam', x: 55, y: 28 },
        { type: 'stinkbug', x: 36, y: 33, range: [30, 46] },
        { type: 'checkpoint', x: 4, y: 15 },
        { type: 'checkpoint', x: 44, y: 33 },
      ],
    },
    {
      id: 'liv-lamp', name: 'The Floor Lamp', x: 23, y: 6,
      grid: lp.rows(),
      bg: { v: 'b', mirror: true, x: 0.55, y: 0.25 },
      fx: [{ kind: 'motes', x: 5, y: 11, w: 18, h: 10 }],
      entities: [
        { type: 'npc', who: 'lumen', x: 12, y: 9, recruit: 'lumen' },
        { type: 'light', x: 14, y: 11 },
        { type: 'crumbs', x: 26, y: 31, n: 5 },
      ],
    },
    {
      id: 'liv-hearth', name: 'The Fireplace', x: 24, y: 7,
      grid: hr.rows(),
      bg: { v: 'a', mirror: true, x: 0.75, y: 0.6 },
      terrainKinds: { C: 'plaster' },
      fx: [{ kind: 'dust', x: 12, y: 18, w: 8, h: 14 }],
      decor: [
        { prop: 'steam-puff', x: 15, y: 33, h: 1.4, layer: 'back', alpha: 0.6 },
        { prop: 'candy-wrapper', x: 6, y: 13, h: 0.7, layer: 'mid' },
      ],
      entities: [
        { type: 'secret', id: 'liv-mote', x: 1, y: 33 },
        { type: 'gate', id: 'liv-ash-door', x: 14, y: 35, w: 4, h: 1, opens: { item: 'glow' }, tile: '#', msg: 'Too dark down there without a light. (Glow Bead)' }, // [issue #4]
        { type: 'checkpoint', x: 3, y: 13 },
        { type: 'checkpoint', x: 23, y: 31 },
        { type: 'sign', x: 22, y: 31, w: 3, text: 'Packed solid. A good hard pound from above might break it.' },
      ],
    },
    {
      id: 'liv-lair', name: 'The Sofa', x: 22, y: 8,
      grid: lr.rows(),
      music: 'boss',
      bg: { v: 'a', x: 0.85, y: 0.55 },
      entities: [
        { type: 'trigger', x: 1, y: 12, w: 2, h: 4, emit: 'ready', boss: 'gargy' },
        { type: 'spring', x: 15, y: 14, w: 10, power: 4 },
        { type: 'spring', x: 26, y: 14, w: 10, power: 4 },
        { type: 'spring', x: 37, y: 14, w: 10, power: 4 },
        { type: 'hide', x: 3, y: 15, w: 2, art: 'cushion' },
        { type: 'hide', x: 55, y: 15, w: 2, art: 'cushion' },
        { type: 'boss', boss: 'gargy', x: 31, y: 6, cricket: 'jam', checkpoints: [[5, 15], [5, 15], [5, 15]] },
      ],
    },
  ],
};
