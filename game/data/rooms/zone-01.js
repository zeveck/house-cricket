// Zone 1: the Bedroom (builder A). Indigo night, nightlight gold, toy clutter.
// Teaches one thing at a time: chirp (mites), kick (ants), hide (the bottle cap), Listen, the
// Tape Booties and the wall-jump. Grids are drawn with grid-a.js; every room is plain data.
import { grid } from './grid-a.js';
import { TEXT } from '../text.js';
const S = TEXT.signs;
// ---------------------------------------------------------------- bed-carrier (2,5) 1x1
function carrier() {
  const g = grid(1, 1);
  g.clear(1, 2, 30, 14).clear(0, 12, 1, 4).clear(31, 12, 1, 4);
  g.row(4, 15, 23, '#');            // the floorboards rise a little in the middle
  g.row(22, 15, 2, '%');            // the baseboard crack (Mote): a song-seed in the pocket below
  g.clear(21, 16, 4, 1);
  g.put(8, 14, 'S').put(13, 14, 'P');
  return g.rows();
}
// ---------------------------------------------------------------- bed-underbed (0,5) 2x1
function underbed() {
  const g = grid(2, 1);
  g.clear(1, 5, 62, 11).clear(63, 12, 1, 4);
  g.row(1, 5, 62, '#');             // the bed slats
  g.box(10, 5, 2, 2, '#').box(30, 5, 2, 2, '#').box(50, 5, 2, 2, '#'); // slat joists
  g.row(3, 13, 6, '=');             // the slipper's toe (crumbs under it)
  g.box(20, 14, 5, 2, '#');         // a fallen picture book
  g.box(40, 14, 2, 2, '#');         // the block letter
  g.row(46, 12, 5, '=');            // a toy shelf plank
  g.put(31, 15, 'h');               // the sock
  g.put(14, 15, 'k').put(56, 15, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- bed-rug (3,5) 2x1
function rug() {
  const g = grid(2, 1);
  g.clear(1, 2, 62, 14).clear(0, 12, 1, 4).clear(63, 12, 1, 4);
  g.clear(8, 0, 16, 2);             // up through the shoe rack into the closet
  for (let r = 14; r >= 0; r -= 2) g.row(10, r, 12, '=');
  g.box(30, 14, 3, 2, '#');         // toy blocks: 2-tile steps
  g.box(33, 12, 3, 4, '#');
  g.box(36, 14, 3, 2, '#');
  g.put(46, 15, 'h');               // the bottle cap
  g.put(4, 15, 'k').put(40, 13, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- bed-desk (5,3) 1x3
function desk() {
  const g = grid(1, 3);
  g.clear(2, 2, 28, 50);
  g.clear(0, 48, 2, 4).clear(30, 48, 2, 4);   // floor: to the rug (left), to the dresser (right)
  g.clear(0, 8, 2, 6);                        // the closet's top shelf (left, rows 8-13)
  g.row(0, 14, 2, '#').row(2, 14, 8, '=');    // the hutch shelf
  g.box(10, 16, 16, 2, '#');                  // the desk top (overhang on the left)
  g.box(14, 18, 12, 30, '#');                 // the desk body; a 3-wide # shaft behind it (cols 26-28)
  g.box(29, 0, 1, 48, '#');
  // the climb (no items): chair, drawer pulls, books, the pencil cup, ruler, spool...
  const L = (r, a, b, ch = '=') => g.row(a, r, b - a + 1, ch);
  L(50, 4, 9); L(48, 3, 10);                  // chair rung, chair seat
  L(46, 11, 13, '#'); L(44, 5, 10); L(42, 11, 13, '#'); L(40, 5, 10); L(38, 11, 13, '#');
  L(36, 3, 10, '#');                          // a picture book lying flat
  g.box(3, 32, 3, 4, 'G');                    // the pencil cup (porcelain: too slick to cling)
  L(34, 11, 13, '#'); L(32, 6, 10);           // a ruler leaning on the cup
  L(30, 11, 13, '#'); L(28, 5, 10); L(26, 11, 13, '#'); L(24, 5, 10); L(22, 11, 13, '#'); L(20, 5, 10); L(18, 6, 9);
  g.put(5, 51, 'k').put(4, 35, 'k').put(12, 15, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- bed-closet (2,3) 3x2
function closet() {
  const g = grid(3, 2);
  g.clear(1, 1, 94, 33);
  g.clear(0, 8, 1, 8);                        // to the bed (left, rows 8-15)
  g.clear(95, 8, 1, 6);                       // to the desk hutch (right, rows 8-13)
  g.row(40, 34, 16, '=').clear(40, 35, 16, 1); // the shoe rack comes up from the rug
  // shoe boxes stacked up to the bed side (left)
  const steps = [[32, 32, 37], [30, 28, 31], [28, 24, 27], [26, 20, 23], [24, 16, 19], [22, 12, 15], [20, 8, 11], [18, 4, 7], [16, 0, 3]];
  for (const [r, a, b] of steps) g.box(a, r, b - a + 1, 34 - r, '#');
  g.row(4, 11, 4, 'G');                       // Hump's ledge in the corner (5 tiles up)
  // hanging sweaters up the right side
  const Lc = [70, 75], Rc = [76, 81];
  [32, 30, 28, 26, 24, 22, 20, 18, 16].forEach((r, i) => { const [a, b] = i % 2 ? Lc : Rc; g.row(a, r, b - a + 1, '='); });
  g.row(82, 14, 14, '#');                     // the shelf to the desk
  g.row(84, 12, 3, '=');
  g.row(66, 10, 18, '=');                     // the clothes rail
  g.row(40, 10, 10, '=');                     // the far end of the rail (Weft)
  g.put(61, 7, 'H').put(55, 8, 'H');          // hanger hooks
  g.row(70, 2, 9, 'G');                       // the top shelf (Rubber Band)
  g.put(58, 33, 'h');
  g.put(40, 33, 'k').put(78, 15, 'k').put(20, 33, 'k').put(10, 15, 'k').put(86, 33, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- bed-bedtop (0,3) 2x2
function bedtop() {
  const g = grid(2, 2);
  g.clear(1, 1, 62, 25);
  g.clear(63, 8, 1, 8);                       // to the closet shelf (right, rows 8-15)
  g.box(56, 0, 8, 8, 'G');                    // the wall around the window: slick paint
  // pillow mountain up to the headboard
  const steps = [[24, 36, 41], [22, 42, 45], [20, 46, 49], [18, 50, 53], [16, 54, 63]];
  for (const [r, a, b] of steps) g.box(a, r, b - a + 1, 26 - r, '#');
  g.row(46, 8, 9, 'G');                       // the window sill (8 tiles above the headboard)
  g.box(14, 22, 6, 4, '#');                   // a folded quilt
  g.box(12, 24, 2, 2, '#');                   // [issue #4] a rolled sock: back up onto the quilt from the bed's foot (was 4 up)
  g.row(4, 21, 6, '=');                       // the foot rail
  g.put(10, 25, 'k').put(30, 25, 'k').put(58, 15, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- bed-dresser (6,4) 2x2
function dresser() {
  const g = grid(2, 2);
  g.clear(1, 1, 61, 33);
  g.clear(0, 30, 1, 4);                       // from the desk (left, rows 30-33)
  g.box(38, 16, 20, 16, '#');                 // the dresser (on short legs: crawl under it)
  g.box(61, 0, 1, 36, '#');                   // the wall: a 3-wide shaft beside the dresser (cols 58-60)
  // picture frames and the mesh lid: shelves up to the tank
  const Ld = [[14, 34, 37], [12, 30, 33], [10, 26, 29], [8, 22, 25], [6, 18, 21], [4, 14, 17], [2, 10, 15], [0, 10, 15]];
  for (const [r, a, b] of Ld) g.row(a, r, b - a + 1, '=');
  g.put(41, 15, 'S');
  g.put(8, 33, 'k').put(34, 33, 'k').put(46, 15, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- bed-lair (6,3) 2x1
function lair() {
  const g = grid(2, 1);
  g.clear(4, 2, 54, 14);                      // the tank inside
  g.clear(60, 2, 2, 12);                      // outside the right glass, down to the hall gap
  g.clear(62, 10, 2, 4);                      // to the Hall (rows 10-13; the rescue gate)
  g.box(2, 4, 2, 12, 'G');                    // left glass
  g.box(58, 6, 2, 10, 'G').clear(58, 2, 2, 4); // right glass (the rim at row 6)
  g.box(59, 6, 1, 10, '#');                   // [issue #4] the tank's frame outside the right glass: grippy, so the 2-wide gap down to
                                              // the gate is a wall-jump climb back to the rim (before the rescue the gate is shut).
                                              // (Rungs there caught the drop to the gate on the way out: full-run.json.)
  g.row(10, 16, 6, '=').clear(10, 17, 6, 1);  // the lid gap: up from the dresser (a flap you can jump up through)
  g.box(19, 14, 3, 2, '#');                   // sand berm (left)
  g.box(42, 14, 3, 2, '#');                   // sand berm (right)
  g.box(28, 12, 8, 4, '#');                   // Duchess's rock (Stripe's cup on top)
  // fake-plant leaves up to the right rim (the way on after the rescue)
  g.row(50, 13, 4, '=').row(54, 11, 4, '=').row(50, 9, 4, '=').row(54, 7, 4, '=');
  g.row(54, 14, 3, '='); // [playtest] a low leaf: the row-13 leaf was a 3-tile rise from the floor (Pip peaked 0.002 px short; Jump 2 crickets were stuck in the lair)
  g.put(6, 15, 'h');                          // the hide log
  return g.rows();
}
export default {
  id: 'z01-bedroom', n: 1, name: 'Bedroom',
  palette: ['#3B4A7A', '#F2C46D', '#C8564B', '#7C98C4'],
  bg: 'z01-bedroom',
  start: { room: 'bed-carrier' },
  beacon: { room: 'bed-desk', x: 29, y: 15 },
  lair: { room: 'bed-lair', x: 32, y: 10 },
  near: ['sock', 'throw-pillow', 'book-spine', 'spool'], // [issue 40] no dice: they read as a game of chance
  rooms: [
    {
      id: 'bed-carrier', name: 'Beside the Carrier', x: 2, y: 5,
      grid: carrier(),
      bg: { v: 'a', x: 0.62, y: 0.7 },
      decor: [
        { prop: 'carrier-keeper', x: 17.5, y: 14, h: 4.2, layer: 'back' },
        { prop: 'save-crack', x: 8, y: 14, h: 1.2, layer: 'back' },
        { prop: 'bottle-cap', x: 29, y: 15, h: 0.6 }, // [issue 40] was a die hanging over the step's edge
        { prop: 'marble', x: 3, y: 15, h: 0.8 },
      ],
      fx: [{ kind: 'dust', x: 2, y: 2, w: 28, h: 10 }],
      entities: [
        { type: 'carrier', x: 18, y: 14 },
        { type: 'sign', x: 10, y: 14, w: 5, text: S.chirp },
        { type: 'sign', x: 24, y: 14, w: 6, nx: 25, text: S.listen }, // [issue 9] the note on the raised floorboards
        { type: 'sign', x: 3, y: 14, w: 5, text: S.save },
        { type: 'secret', id: 'bed-mote', x: 22, y: 16 },
      ],
    },
    {
      id: 'bed-underbed', name: 'Under the Bed', x: 0, y: 5,
      grid: underbed(),
      bg: { v: 'a', x: 0.15, y: 0.75 },
      decor: [
        { prop: 'sock', x: 31, y: 15, h: 1.4, layer: 'back' },
        { prop: 'marble', x: 37, y: 15, h: 0.9 },
        { prop: 'book-spine', x: 22.5, y: 15, h: 2, rot: 1.57 },
        { prop: 'spool', x: 43, y: 15, h: 1.5 }, // [issue 40] was a die hidden behind the block
        { prop: 'throw-pillow', x: 6, y: 12, h: 1.4, layer: 'back' },
        { prop: 'spool', x: 48.5, y: 11, h: 1.2 },
      ],
      fx: [{ kind: 'dust', x: 2, y: 6, w: 60, h: 8 }],
      entities: [
        { type: 'sign', x: 54, y: 15, w: 6, text: 'Dust mites! Tiny, but itchy. {chirp} sends them scattering.' },
        { type: 'mites', x: 44, y: 12, range: [36, 54] },
        { type: 'mites', x: 26, y: 12, range: [16, 34] },
        { type: 'mites', x: 12, y: 13, range: [8, 18] },
        { type: 'secret', id: 'bed-crumbs-slipper', x: 5, y: 15 },
      ],
    },
    {
      id: 'bed-rug', name: 'The Rug', x: 3, y: 5,
      grid: rug(),
      bg: { v: 'a', mirror: true, x: 0.4, y: 0.72 },
      decor: [
        { prop: 'marble', x: 31.5, y: 13, h: 0.7 }, // [issue 40] a marble on the toy block, not a die
        { prop: 'spool', x: 37.5, y: 13, h: 1.2 }, // [issue 40]
        { prop: 'bottle-cap', x: 46.5, y: 15, h: 1.0 },
        { prop: 'spool', x: 56, y: 15, h: 1.6, layer: 'back' },
        { prop: 'sock', x: 15.5, y: 1, h: 1.2, layer: 'back' }, // [issue 40] on the plank, not hung on the room's top edge
        { prop: 'marble', x: 26, y: 15, h: 0.8 },
      ],
      entities: [
        { type: 'sign', x: 3, y: 15, w: 6, text: S.kick },
        { type: 'sign', x: 42, y: 15, w: 6, text: S.hide },
        { type: 'ant', x: 22, y: 15, range: [3, 28] },
        { type: 'ant', x: 52, y: 15, range: [41, 61] },
        { type: 'crumbs', x: 34, y: 11, n: 5 },
      ],
    },
    {
      id: 'bed-desk', name: 'The Craft Desk', x: 5, y: 3,
      grid: desk(),
      bg: { v: 'b', x: 0.6 },
      decor: [
        { prop: 'drawer-pull', x: 12, y: 45.6, h: 0.9 }, { prop: 'drawer-pull', x: 12, y: 41.6, h: 0.9 },
        { prop: 'drawer-pull', x: 12, y: 37.6, h: 0.9 }, { prop: 'drawer-pull', x: 12, y: 33.6, h: 0.9 },
        { prop: 'drawer-pull', x: 12, y: 29.6, h: 0.9 }, { prop: 'drawer-pull', x: 12, y: 25.6, h: 0.9 },
        { prop: 'drawer-pull', x: 12, y: 21.6, h: 0.9 },
        { prop: 'book-spine', x: 5.5, y: 34.7, h: 1.2, rot: 1.57, layer: 'mid' }, // [issue 40] lying on the block (turned about its foot), not under it
        { prop: 'pin', x: 4.5, y: 31.6, h: 1.6, rot: 0.3 },
        { prop: 'spool', x: 7, y: 27.2, h: 1.0 },
        { prop: 'spool', x: 21, y: 15, h: 1.5 },
        { prop: 'book-spine', x: 4, y: 13.4, h: 1.6, layer: 'back' },
      ],
      entities: [
        { type: 'sign', x: 2, y: 51, w: 6, text: S.jumpHold },
        { type: 'item', item: 'booties', x: 21, y: 15 },
        { type: 'beacon', x: 29, y: 15 }, // [issue 28] the heating-vent grille in the shaft's wall, at Pip's height (was on the curtain)
        { type: 'sign', x: 26, y: 51, w: 4, text: S.wallJump },
        { type: 'sign', x: 18, y: 15, w: 5, text: 'The Tape Booties! The shaft behind the desk is good for practice.' },
        { type: 'crumbs', x: 5, y: 19, n: 5 }, // [issue 40] on the plank, not beside it. [fixer] no mites on the desk climb (gentler early game)
      ],
    },
    {
      id: 'bed-closet', name: 'The Closet', x: 2, y: 3,
      grid: closet(),
      bg: { v: 'b', mirror: true, x: 0.2 },
      decor: [
        { prop: 'sock', x: 58.5, y: 33, h: 1.4, layer: 'back' },
        { prop: 'throw-pillow', x: 74, y: 1.2, h: 1.2 },
        { prop: 'sock', x: 29.5, y: 29, h: 1 }, // [issue 40] was a die in mid-air beside the box: a sock on the box
        { prop: 'book-spine', x: 6, y: 10.2, h: 1.0, rot: 1.57 },
      ],
      entities: [
        { type: 'npc', who: 'weft', x: 43, y: 9, recruit: 'weft' },
        { type: 'secret', id: 'bed-crumbs-shelf', x: 74, y: 1 },
        { type: 'secret', id: 'bed-hump', x: 5, y: 10 },
        { type: 'crumbs', x: 72, y: 29, n: 5 }, // [issue 40] on the plank, not under it
        { type: 'ant', x: 60, y: 33, range: [56, 68] },
      ],
    },
    {
      id: 'bed-bedtop', name: 'The Bed', x: 0, y: 3,
      grid: bedtop(),
      bg: { v: 'b', x: 0.3, y: 0.4 },
      motes: true,
      decor: [
        { prop: 'throw-pillow', x: 39, y: 23, h: 2.2 },
        { prop: 'throw-pillow', x: 47.5, y: 19, h: 2.0, flip: true },
        { prop: 'throw-pillow', x: 52, y: 17, h: 1.6 },
        { prop: 'sock', x: 16.5, y: 21, h: 1.4 },
      ],
      fx: [{ kind: 'motes', x: 40, y: 1, w: 20, h: 14 }],
      entities: [
        { type: 'secret', id: 'bed-seedheart-sill', x: 50, y: 7 },
        { type: 'mites', x: 24, y: 19, range: [18, 30] },
        { type: 'crumbs', x: 6, y: 20, n: 5 },
      ],
    },
    {
      id: 'bed-dresser', name: 'The Dresser', x: 6, y: 4,
      music: 'z01-bedroom',
      grid: dresser(),
      bg: { v: 'a', x: 0.85, y: 0.6 },
      decor: [
        { prop: 'drawer-pull', x: 47, y: 19.5, h: 1.0 }, { prop: 'drawer-pull', x: 47, y: 24.5, h: 1.0 },
        { prop: 'save-crack', x: 41, y: 15, h: 1.2, layer: 'back' },
        { prop: 'mesh-lid', x: 12.5, y: 1.4, h: 1.2, rot: -0.1 },
        { gecko: 'duchess', pose: 'sleep', x: 51, y: 15, len: 300, flip: true, after: 'stripe', layer: 'mid' },
        { prop: 'spool', x: 20, y: 33, h: 1.5 },
      ],
      entities: [
        { type: 'lair', boss: 'duchess', x: 52, y: 15, w: 2, h: 3, to: 'bed-lair', at: [6, 15] },
        { type: 'sign', x: 56, y: 33, w: 5, text: S.wallJump },
        { type: 'ant', x: 22, y: 33, range: [16, 28] }, // [fixer] clear of the landing from the desk
      ],
    },
    {
      id: 'bed-lair', name: 'Duchess\'s Tank', x: 6, y: 3,
      grid: lair(),
      bg: { folder: 'z00-tank', v: 'b', x: 0.5, y: 0.6 },
      paint: [{ kind: 'sand', x: 0, y: 14, w: 64, h: 4 }, { kind: 'sand', x: 28, y: 12, w: 8, h: 4 }],
      decor: [
        { prop: 'hide-log', x: 6.5, y: 15, h: 1.6, layer: 'back' },
        { prop: 'sand-berm', x: 20.5, y: 15.2, h: 2.2 },
        { prop: 'sand-berm', x: 43.5, y: 15.2, h: 2.2, flip: true },
        { prop: 'water-dish', x: 52, y: 15.2, h: 1.0 },
        { prop: 'fake-plant', x: 55, y: 15.3, h: 9, layer: 'back' },
        { prop: 'mesh-lid', x: 30, y: 1.6, h: 1.6 },
      ],
      entities: [
        { type: 'boss', boss: 'duchess', x: 24, y: 15, cricket: 'stripe', checkpoints: [[6, 15], [6, 15], [6, 15]] },
        { type: 'sign', x: 8, y: 15, w: 9, text: TEXT.signs.berm }, // [final-G] phase 1 reads: stand behind a berm
        { type: 'gate', id: 'bed-exit', x: 62, y: 10, w: 2, h: 4, opens: { rescued: 'stripe' }, msg: TEXT.gates.rescue },
      ],
    },
  ],
};
