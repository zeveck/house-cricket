// Zone 4: the Pantry (builder B). Brief: design/zones/z04.md. Rooms at their house.js cells;
// grids are drawn with b-kit rectangles (local tile coordinates; 32x18 per screen).
// Main path: pan-door (start) -> pan-floor (beetle sneak) -> pan-shelves (climb, Rubber Band,
// first super-jump) -> the lair door -> pan-lair (Lashes).
import { grid } from './b-kit.js';

// ---- pan-door: the Pantry door (cell 4,7, 1x2) ----
const door = grid(1, 2).frame('#');
door.r(0, 0, 1, 18, 'G').r(31, 0, 1, 18, 'G');      // slick jar-glass sides up top: no wall-jumping to the top shelf
door.r(8, 0, 16, 1, '.');                            // the top shelf (pan-high) above: Rubber Band only
door.r(0, 30, 1, 4, '.').r(31, 30, 1, 4, '.');       // left: the bottom shelf; right: the Kitchen (exact, rows 12-15 of cell 4,8)
door.r(0, 34, 32, 2);                                // floor
door.r(28, 17, 3, 13).r(24, 20, 1, 12);              // the door frame and a shelf upright: a wall-jump shaft (cols 25-27)
door.r(13, 20, 12, 1);                               // shelf on top of the upright
door.r(9, 18, 4, 1, '=').r(13, 16, 4, 1, '=').r(9, 14, 4, 1, '=').r(13, 12, 4, 1, '=').r(9, 10, 4, 1, '=').r(13, 8, 4, 1, '=');
door.r(9, 6, 12, 1, '=');                            // the highest ledge, right under the top shelf (7 tiles up)

// ---- pan-high: the top shelf (cell 4,6) ----
const high = grid(1, 1).frame('#');
high.r(8, 17, 16, 1, '=');                           // the shelf edge you super-jump up through
high.r(2, 12, 5, 5, 'C');                            // the cereal-box wall (Thimble): a song-seed behind it
high.r(7, 15, 2, 2);                                 // a crate to climb onto the boxes
high.r(26, 13, 5, 4, 'G');                           // jars

// ---- pan-floor: the bottom shelf (cell 2,8, 2x1): the beetle sneak ----
const floor = grid(2, 1).frame('#');
floor.r(0, 16, 64, 2).r(0, 12, 1, 4, '.').r(63, 12, 1, 4, '.'); // floor; left: the jar wall; right: the pantry door
floor.r(0, 0, 64, 4).r(0, 0, 2, 12).r(2, 0, 4, 4, '.'); // the shelf board overhead; the gap up to the shelves (cols 2-5)
floor.r(15, 12, 48, 1);                              // the low shelf over the sneak corridor (rows 13-15)
floor.r(10, 14, 4, 2).r(6, 12, 4, 4);                // crates: steps up on the left
floor.r(4, 14, 2, 2);                                // [issue #4] ... and a step on their far side: back up from the jar wall (was 4 up)
floor.r(9, 10, 3, 1, '=').r(6, 8, 3, 1, '=').r(2, 6, 4, 1, '=');  // brackets up to the gap
floor.r(30, 9, 6, 3).r(44, 10, 5, 2);                // rice sacks on the low shelf (weevils)
floor.r(36, 11, 1, 1);                               // [issue #4] a spilled grain bag: up the first sack from the gap (3 up was too high for Jump 2)
floor.r(49, 4, 14, 6).r(49, 10, 8, 1);               // the cracker tunnel: a low ceiling over a crumbling floor
floor.r(57, 8, 6, 1, '#');

// ---- pan-shelves: the shelves (cell 2,6, 2x2): the climb to the Rubber Band ----
const sh = grid(2, 2).frame('#');
sh.r(2, 35, 4, 1, '.');                              // up from the bottom shelf (cols 2-5)
sh.r(0, 12, 1, 4, '.');                              // the lair door (left, rows 12-15)
sh.r(0, 26, 2, 10).r(6, 28, 19, 8);                  // left shaft wall; shelf A (top row 28) and the block under it
sh.r(1, 17, 20, 9);                                  // the shelving under the top shelf (solid)
sh.r(1, 16, 20, 1);                                  // shelf C: the lair shelf (stand 15)
sh.r(21, 5, 1, 8, 'G').r(21, 13, 1, 13);             // upright: slick jar-glass above, wood below
sh.r(25, 15, 38, 21);                                // shelf B (top row 15) and the jar shelving under it
sh.r(33, 15, 4, 4, '.').r(33, 19, 4, 1, '^');        // a gap in shelf B with pins in the bottom (swing over it)
sh.r(44, 11, 16, 1).r(47, 11, 3, 1, '=');            // the jam-jar alcove floor, a hole you jump up through
sh.r(47, 13, 3, 1, '=').r(51, 11, 12, 4);            // a bracket under the hole
sh.r(44, 4, 2, 7, 'G');                              // the alcove's left side: 7 tiles of jar glass (super-jump it)
sh.r(58, 1, 5, 10, 'G');                             // right side
sh.r(21, 4, 25, 1);                                  // shelf D: the high shelf over to the lair side
sh.r(1, 1, 1, 11, 'G');                              // slick back corner by the lair door
// [playtest] one-way rungs up the upright beside the lair door, back to shelf D: you reached the door by dropping off
// shelf D and had no way back out of the Pantry (a 12-tile glass upright; a super-jump rises 8)
sh.r(19, 14, 2, 1, '=').r(19, 12, 2, 1, '=').r(19, 10, 2, 1, '=').r(19, 8, 2, 1, '=').r(19, 6, 2, 1, '=');

// ---- pan-jars: the jar wall (cell 0,7, 2x2) ----
const jars = grid(2, 2).frame('#');
jars.r(0, 0, 1, 36, 'G');
jars.r(63, 30, 1, 4, '.');                           // right: the bottom shelf
jars.r(0, 0, 64, 7);                                 // a deep shelf board overhead
jars.r(4, 29, 4, 5, 'G');                            // Hump's 5-tile ledge
jars.r(14, 28, 5, 6, 'G');                           // the honey jar
jars.r(19, 32, 4, 1).r(22, 33, 1, 1, '%');           // the crack behind it (Mote) and its pocket
jars.r(40, 27, 6, 7, 'G');                           // jar cliff: 7 tiles
jars.r(46, 19, 6, 15, 'G');                          // ... and 8 more
jars.r(54, 32, 6, 2);                                // flour sacks

// ---- pan-lair: the fruit shelf (cell 0,6, 2x1): Lashes ----
const lair = grid(2, 1).frame('#');
lair.r(0, 0, 1, 18, 'G');
lair.r(63, 12, 1, 4, '.');                           // right: the lair door
lair.r(1, 11, 55, 1);                                // the middle shelf (Lashes patrols it)
lair.r(1, 5, 58, 1).r(14, 5, 2, 1, '.').r(30, 5, 2, 1, '.'); // the top shelf, with two holes
lair.r(60, 14, 3, 2).r(56, 12, 4, 4);                // crates up from the floor
lair.r(56, 9, 3, 1, '=').r(59, 7, 3, 1, '=');        // the top-shelf stairs

export default {
  id: 'z04-pantry', n: 4, name: 'Pantry',
  palette: ['#C9A57A', '#D99A3E', '#EFE6D5', '#7A5636'],
  bg: 'z04-pantry',
  start: { room: 'pan-door' },
  rooms: [
    {
      id: 'pan-door', name: 'The Pantry Door', x: 4, y: 7,
      grid: door.rows(),
      bg: { v: 'a', x: 0.6, y: 0.4 },
      paint: [{ kind: 'sand', x: 8, y: 34, w: 23, h: 1 }],
      fx: [{ kind: 'dust', x: 6, y: 24, w: 22, h: 9 }],
      decor: [
        { prop: 'spice-rack', x: 5, y: 33, h: 3.2, layer: 'back' },
        { prop: 'wooden-spoon', x: 19, y: 33, h: 3.4, layer: 'back', rot: -0.25 },
        { prop: 'cork', x: 11, y: 33, h: 1.0, layer: 'mid' },
        { prop: 'spice-rack', x: 15, y: 5, h: 2.6, layer: 'back' },
        { prop: 'jam-blob', x: 16, y: 19, h: 0.6, layer: 'mid' },
      ],
      entities: [
        { type: 'start', x: 27, y: 33 },
        { type: 'save', x: 22, y: 33 },
        { type: 'checkpoint', x: 14, y: 19 },
        { type: 'ant', x: 10, y: 33, range: [4, 17] },
        { type: 'crumbs', x: 18, y: 5, n: 10 },
        { type: 'sign', x: 1, y: 33, w: 7, nx: 2, /* [issue 34] the marker clear of the spice rack */ text: 'The bottom shelf. Mind the beetles: they can\'t be kicked. Hide with {enter}.' },
      ],
    },
    {
      id: 'pan-high', name: 'The Top Shelf', x: 4, y: 6,
      grid: high.rows(),
      bg: { v: 'b', x: 0.3, y: 0.2 },
      decor: [
        { prop: 'spice-rack', x: 13, y: 16, h: 3, layer: 'back' },
        { prop: 'cork', x: 24, y: 16, h: 1.1, layer: 'mid' },
        { prop: 'cork', x: 17, y: 16, h: 0.8, layer: 'mid' }, // [issue 40] a cork, not a die
      ],
      entities: [
        { type: 'npc', who: 'crumb', x: 20, y: 16, recruit: 'crumb' },
        { type: 'secret', id: 'pan-songseed-cereal', x: 4, y: 16 },
        { type: 'crumbs', x: 28, y: 12, n: 5 },
      ],
    },
    {
      id: 'pan-floor', name: 'The Bottom Shelf', x: 2, y: 8,
      grid: floor.rows(),
      bg: { v: 'a', mirror: true, x: 0.4, y: 0.7 },
      paint: [{ kind: 'sand', x: 15, y: 16, w: 48, h: 1 }],
      decor: [
        { prop: 'bottle-cap', x: 25, y: 11, h: 0.8, layer: 'mid' },
        { prop: 'spice-rack', x: 40, y: 11, h: 2.4, layer: 'back' },
        { prop: 'cork', x: 3, y: 15, h: 1.2, layer: 'mid' },
      ],
      entities: [
        { type: 'hide', x: 58, y: 15, w: 2, art: 'bottle-cap' },
        { type: 'hide', x: 47, y: 15, w: 1, art: 'cork' },
        { type: 'hide', x: 37, y: 15, w: 2, art: 'bottle-cap' },
        { type: 'hide', x: 26, y: 15, w: 1, art: 'candy-wrapper' },
        { type: 'hide', x: 16, y: 15, w: 1, art: 'cork' },
        { type: 'beetle', x: 50, y: 15, range: [40, 55] },
        { type: 'beetle', x: 20, y: 15, range: [18, 33] },
        { type: 'weevil', x: 12, y: 13, dir: -1, every: 3.5 },
        { type: 'weevil', x: 33, y: 8, dir: -1, every: 3 },
        { type: 'weevil', x: 46, y: 9, dir: 1, every: 3.2 },
        { type: 'terrain', kind: 'crumble', x: 50, y: 12, w: 5, h: 1, delay: 0.4, respawn: 3 },
        { type: 'secret', id: 'pan-dash', x: 59, y: 11 },
        { type: 'crumbs', x: 40, y: 11, n: 5 },
        { type: 'sign', x: 56, y: 15, w: 6, text: 'Beetles plod the same way every time. Wait under a bottle cap ({enter}).' },
      ],
    },
    {
      id: 'pan-shelves', name: 'The Shelves', x: 2, y: 6,
      grid: sh.rows(),
      bg: { v: 'b', x: 0.5, y: 0.5 },
      paint: [{ kind: 'syrup', x: 12, y: 28, w: 7, h: 1 }],
      fx: [{ kind: 'motes', x: 46, y: 1, w: 12, h: 8 }],
      decor: [
        { prop: 'jam-blob', x: 54, y: 10, h: 0.7, layer: 'mid' },
        { prop: 'spice-rack', x: 12, y: 15, h: 2.8, layer: 'back' },
        { prop: 'cork', x: 30, y: 14, h: 1.1, layer: 'mid' },
        { prop: 'jam-blob', x: 16, y: 27, h: 0.5, layer: 'mid' },
      ],
      entities: [
        { type: 'terrain', kind: 'syrup', x: 12, y: 28, w: 7, h: 1 },
        { type: 'sign', x: 8, y: 27, w: 4, text: 'Sticky! Syrup slows you down.' },
        { type: 'hook', x: 34, y: 11 },
        { type: 'antsoldier', x: 44, y: 14, range: [38, 45] },
        { type: 'item', item: 'band', x: 55, y: 10 },
        { type: 'beacon', x: 56, y: 10 }, // [issue 28] the knot hole, down on the shelf by the band (was a tile up, in the air)
        { type: 'sign', x: 46, y: 10, w: 5, text: 'Hold {use}, then let go: super-jump!' },
        { type: 'checkpoint', x: 23, y: 27 },
        { type: 'checkpoint', x: 28, y: 14 },
        { type: 'save', x: 6, y: 15 },
        { type: 'lair', boss: 'lashes', x: 2, y: 15, w: 2, h: 3 },
        { type: 'trigger', x: 0, y: 12, w: 1, h: 4, emit: 'ready', boss: 'lashes' },
        { type: 'crumbs', x: 30, y: 3, n: 5 },
      ],
    },
    {
      id: 'pan-jars', name: 'The Jar Wall', x: 0, y: 7,
      grid: jars.rows(),
      bg: { v: 'a', x: 0.2, y: 0.6 },
      paint: [{ kind: 'syrup', x: 24, y: 34, w: 13, h: 1 }],
      decor: [
        { prop: 'jam-blob', x: 16, y: 27, h: 0.8, layer: 'mid' },
        { prop: 'cork', x: 34, y: 34, h: 1.0, layer: 'mid' }, // [issue 40] stuck in the syrup on the floor, not over it
        { gecko: 'lashes', x: 57, y: 31, len: 300, layer: 'mid', after: 'frost' },
      ],
      entities: [
        { type: 'terrain', kind: 'syrup', x: 24, y: 34, w: 13, h: 1 },
        { type: 'antsoldier', x: 32, y: 33, range: [24, 38] },
        { type: 'ant', x: 10, y: 33, range: [8, 13] },
        { type: 'secret', id: 'pan-songseed-jars', x: 49, y: 18 },
        { type: 'secret', id: 'pan-hump', x: 5, y: 28 },
        { type: 'secret', id: 'pan-mote', x: 20, y: 34 }, // [issue 40] on the nook's floor
        { type: 'crumbs', x: 42, y: 26, n: 5 },
      ],
    },
    {
      id: 'pan-lair', name: 'The Fruit Shelf', x: 0, y: 6,
      grid: lair.rows(),
      music: 'boss',
      bg: { v: 'b', mirror: true, x: 0.5, y: 0.3 },
      decor: [
        { prop: 'spice-rack', x: 22, y: 15, h: 3, layer: 'back' },
        { prop: 'cork', x: 44, y: 16, h: 1.1, layer: 'mid' }, // [issue 40] on the floor
      ],
      entities: [
        { type: 'hide', x: 52, y: 10, w: 2, art: 'bottle-cap' },
        { type: 'hide', x: 3, y: 10, w: 2, art: 'bottle-cap' },
        { type: 'fruitflies', x: 8, y: 3 },
        { type: 'gate', id: 'lashes-stairs', x: 57, y: 1, w: 2, h: 4, opens: { switch: 'lashes-stairs' }, msg: 'A jar of pickles. Lashes nudges it aside when he\'s ready.' },
        { type: 'boss', boss: 'lashes', x: 38, y: 10, cricket: 'frost', checkpoints: [[61, 13], [7, 10], [57, 8]] },
      ],
    },
  ],
};
