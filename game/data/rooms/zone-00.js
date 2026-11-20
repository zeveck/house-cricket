// Zone 0: the Tank (builder A). The opening's playable escape, in six beats (design: Screens,
// Opening). Off the house map (cells 0-3, 18-20) and never revisited. Nothing here costs health (Duchess can eat Pip: a quick room retry).
// The set pieces (tongs, Duchess's chase, the pebble, the lid gap and the cup tipping) are
// scripts in src/bosses/tank.js; the last one emits story 'tankEscaped'.
import { grid } from './grid-a.js';
import { TEXT } from '../text.js';

const S = TEXT.signs, TK = TEXT.opening.tank;

// ---------------------------------------------------------------- tank-cup (0,20): beats 1-2
function cup() {
  const g = grid(1, 1);
  g.clear(2, 1, 29, 15).clear(31, 12, 1, 4);
  g.box(0, 0, 2, 16, 'G');                     // the tank glass
  g.box(2, 10, 20, 6, '#');                    // Duchess's rock, right up to the glass (no pit to fall in: issue #1)
  g.box(11, 8, 1, 2, 'G').box(16, 8, 1, 2, 'G'); // the feeder cup's walls (2 tiles: a held jump clears them)
  g.box(22, 14, 3, 2, '#');                    // a sand berm
  g.put(13, 9, 'P');
  return g.rows();
}

// ---------------------------------------------------------------- tank-sand (1,20): beat 3, the escape (issues #24, #25)
// Open on the left (back to the cup), the exit on the right held shut until she has lost him in the log.
function sand() {
  const g = grid(2, 1);
  g.clear(0, 1, 64, 15);
  g.row(22, 15, 6, '#');                       // [issue 24] Duchess's rock, mid-room: she sleeps on it (drawn by the script)
  g.row(40, 15, 3, '#');                       // a sand ripple (a little hop)
  g.box(30, 14, 3, 2, '#').box(48, 14, 3, 2, '#'); // sand berms
  g.put(58, 15, 'h');                          // the hide log
  g.box(62, 1, 2, 14, 'G');                    // [issue 31] the tank's glass corner: the way on is the 1-tile crack under it (cricket-sized)
  return g.rows();
}

// ---------------------------------------------------------------- tank-decor (3,19): beat 4
function decor() {
  const g = grid(1, 2);
  g.clear(2, 1, 28, 33).clear(0, 30, 2, 4);
  g.box(30, 0, 2, 36, 'G').box(0, 0, 2, 30, 'G'); // tank glass
  g.clear(12, 0, 8, 1);                        // up to the lid
  g.box(6, 32, 8, 2, '#');                     // the hide log
  g.box(16, 30, 8, 4, '#');                    // the water dish
  g.box(24, 32, 6, 2, '#');                    // [final-G] a sand bank between the dish and the glass (2 below the dish: no trap)
  g.row(25, 28, 4, '=').row(25, 26, 4, '=').row(25, 24, 4, '=');   // fake-plant leaves
  g.row(25, 22, 4, '=');                       // [issue #4] a top leaf: back up past the kicked pebble's step (2 up, 2 across onto it)
  g.row(18, 22, 6, '#');                       // the ledge under the pebble
  g.row(24, 18, 6, '#');                       // the ledge one tile too high (the pebble on its edge)
  g.row(20, 16, 4, '=').row(25, 14, 4, '=').row(20, 12, 4, '=').row(25, 10, 4, '=').row(20, 8, 4, '=');
  g.row(12, 6, 7, '=').row(12, 4, 8, '=').row(12, 2, 8, '=').row(12, 0, 8, '=');
  g.put(4, 33, 'k').put(20, 21, 'k');
  return g.rows();
}

// ---------------------------------------------------------------- tank-lid (3,18): beats 5-6
function lid() {
  const g = grid(1, 1);
  g.clear(2, 1, 28, 16).clear(12, 17, 8, 1);
  g.box(0, 0, 2, 18, 'G').box(30, 0, 2, 18, 'G');
  g.box(2, 6, 28, 1, 'G');                     // the mesh lid (ajar: a 1-tile gap at column 20)
  g.box(2, 7, 2, 11, 'G').box(28, 7, 2, 11, 'G');
  g.row(8, 16, 16, '=');                       // the top of the decor
  g.row(12, 14, 4, '=').row(16, 12, 4, '=').row(12, 10, 4, '=');
  g.row(16, 8, 8, '#');                        // right under the gap
  return g.rows();
}

export default {
  id: 'z00-tank', n: 0, name: 'The Tank',
  palette: ['#E3A857', '#8FB8B0', '#D9C29A', '#2E3550'],
  bg: 'z00-tank',
  start: { room: 'tank-cup' },
  music: 'title',
  near: false,
  rooms: [
    {
      id: 'tank-cup', name: 'In the Cup', x: 0, y: 20, music: 'title',
      grid: cup(),
      bg: { v: 'a', x: 0.15, y: 0.7 },
      paint: [{ kind: 'sand', x: 0, y: 14, w: 32, h: 4 }],
      decor: [
        { prop: 'fake-plant', x: 27, y: 15.2, h: 5, layer: 'back' },
        { prop: 'sand-berm', x: 23.5, y: 15.2, h: 1.6 },
      ],
      fx: [{ kind: 'motes', x: 4, y: 1, w: 24, h: 8 }],
      entities: [
        { type: 'boss', boss: 'tank', beat: 'cup', x: 14, y: 9, floor: 10, cup: [11, 17] },
        { type: 'sign', x: 10, y: 9, w: 8, at: 'low', text: TK.tongs }, // [issue 9] the card takes the lower slot: the tongs come from above
      ],
    },
    {
      id: 'tank-sand', name: 'The Sand', x: 1, y: 20, music: 'title',
      grid: sand(),
      bg: { v: 'a', mirror: true, x: 0.5, y: 0.7 },
      paint: [{ kind: 'sand', x: 0, y: 14, w: 64, h: 4 }],
      decor: [
        { prop: 'sand-berm', x: 31, y: 15.3, h: 2.2 }, { prop: 'sand-berm', x: 49, y: 15.3, h: 2.2, flip: true },
        { prop: 'hide-log', x: 58.5, y: 15, h: 1.8, layer: 'back' },
        { prop: 'water-dish', x: 40, y: 15.4, h: 1.1, layer: 'back' },
        { prop: 'pebble-chip', x: 16, y: 15.2, h: 0.7 },
      ],
      entities: [
        // [issue 25] the escape: she sleeps on her rock (rock: [x, w, row] tiles); berms = the berms' middle
        // columns; exit = where the way on is held shut until she has lost him; retry = the tile a catch
        // restarts from (about 6 tiles before the wake point at 38). The "Hide in the log!" note is put
        // up by the script as she wakes (src/bosses/tank.js); crack = the cricket-sized way out under the
        // glass corner ([x, w, row] tiles; issue 31), drawn by the script
        { type: 'boss', boss: 'tank', beat: 'sand', x: 24, y: 14, rock: [22, 6, 15], berms: [31, 49], exit: 60, retry: [33, 15], crack: [62, 2, 15] },
        { type: 'sign', x: 14, y: 15, w: 5, text: S.tell }, // [issue 9] a note where the lesson starts, before the wake ripple (was a 14-tile zone)
      ],
    },
    {
      id: 'tank-decor', name: 'The Decor', x: 3, y: 19, music: 'title',
      grid: decor(),
      bg: { v: 'b', x: 0.75, y: 0.5 },
      paint: [{ kind: 'sand', x: 0, y: 34, w: 32, h: 2 }, { kind: 'sand', x: 24, y: 32, w: 6, h: 2 }],
      decor: [
        { prop: 'hide-log', x: 9.5, y: 33.3, h: 2.2 },
        { prop: 'water-dish', x: 19.5, y: 33.4, h: 2.0 },
        { prop: 'fake-plant', x: 24, y: 29, h: 9, layer: 'back' },
        { prop: 'fake-plant', x: 21, y: 16, h: 11, layer: 'back', flip: true },
        { prop: 'pebble-chip', x: 27, y: 17, h: 0.8 },
      ],
      entities: [
        { type: 'boss', boss: 'tank', beat: 'decor', x: 24, y: 17, land: [22, 20, 2, 2] }, // [final-G] a 2x2 step: 2 below the ledge (was 3: pixel-exact)
        { type: 'sign', x: 15, y: 21, w: 9, text: TK.kick },
        { type: 'sign', x: 2, y: 33, w: 8, nx: 2, text: S.jumpHold }, // [issue 9] the note on the floor (the span's middle is the ledge)
      ],
    },
    {
      id: 'tank-lid', name: 'The Lid Gap', x: 3, y: 18, music: 'title',
      grid: lid(),
      bg: { v: 'b', mirror: true, x: 0.6, y: 0.1 },
      decor: [
      ],
      entities: [
        { type: 'boss', boss: 'tank', beat: 'lid', x: 20, y: 7, gap: [20, 6], cup: [25, 5], edge: 27 },
        { type: 'sign', x: 15, y: 7, w: 9, text: TK.squeeze },
      ],
    },
  ],
};
