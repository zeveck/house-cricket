// Zone 3: the Kitchen (builder A). Warm butter-yellow, copper pans.
// New here: water and the Bottle-Cap Raft, heat (hot burners), cockroaches and fruit flies,
// and the first beetle sneak (under the table). The creaky fridge is the decoy.
import { grid } from './grid-a.js';
import { TEXT } from '../text.js';
const S = TEXT.signs;
// ---------------------------------------------------------------- kit-fridge (14,6) 2x3
function fridge() {
  const g = grid(2, 3);
  g.clear(2, 1, 60, 51);
  g.clear(0, 8, 2, 8).row(0, 16, 6, '#');      // the counter's end (left, rows 8-15)
  g.clear(0, 30, 2, 4).row(0, 34, 12, '#');    // to the stove (left, rows 30-33)
  g.clear(62, 48, 2, 4);                       // from the foot of the stairs (right, rows 48-51)
  g.box(20, 2, 28, 48, '#');                   // the fridge (tall; short feet: crawl under it)
  g.box(51, 2, 3, 48, '#');                    // the wall cabinet: a 3-wide shaft beside the fridge
  g.box(54, 1, 8, 31, '#');
  g.box(38, 0, 6, 2, '#').clear(39, 1, 4, 1);  // the thermostat cubby on top (gate on its left)
  // magnets and shelves up the fridge's left side to the stove door
  // [issue #4] the bottom shelf runs on over the drip tray to its glass (cols 5-15, was 12-15): back up from Rolo's
  // corner without the Raft (you could drop in from the shelves and not climb out)
  [[50, 16, 19], [48, 5, 15], [46, 16, 19], [44, 12, 15], [42, 16, 19], [40, 12, 15], [38, 16, 19], [36, 12, 15]]
    .forEach(([r, a, b]) => g.row(a, r, b - a + 1, '='));
  // the drip tray (Rolo behind it)
  g.box(4, 50, 1, 2, 'G').box(15, 50, 1, 2, 'G').box(5, 50, 10, 2, '~');
  g.put(57, 51, 'S').put(54, 51, 'P');
  g.put(24, 51, 'k').put(8, 33, 'k').put(4, 15, 'k').put(28, 1, 'k').put(50, 51, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- kit-stove (12,7) 2x2
function stove() {
  const g = grid(2, 2);
  g.clear(2, 1, 60, 33);
  g.clear(62, 12, 2, 4).row(56, 16, 8, '#');   // from the fridge (right, rows 12-15)
  g.clear(0, 30, 2, 4);                        // to under the sink (left, rows 30-33)
  g.clear(48, 0, 4, 1);                        // up to the counter
  g.box(2, 6, 12, 24, '#');                    // the cabinet base, flush with the oven top (the kick-plate crawl inside)
                                               // [issue #4] was 8 lower: a well beside the oven glass with no way back up
  g.clear(3, 23, 11, 2);
  g.box(14, 6, 34, 16, 'G');                   // the oven (enamel and glass)
  g.row(14, 25, 38, '=');                      // the oven-door handle
  // the knobs and the plate rack: up the right side
  [[32, 56, 59], [30, 52, 55], [28, 56, 59], [26, 52, 55], [24, 56, 59], [22, 52, 55], [20, 56, 59], [18, 52, 55]]
    .forEach(([r, a, b]) => g.row(a, r, b - a + 1, '='));
  [[14, 52, 55], [12, 48, 51], [10, 52, 55], [8, 48, 51], [6, 52, 55], [4, 48, 51], [2, 48, 51], [0, 48, 51]]
    .forEach(([r, a, b]) => g.row(a, r, b - a + 1, '='));
  g.put(30, 33, 'h');
  g.put(8, 33, 'k').put(40, 33, 'k').put(30, 5, 'k').put(58, 15, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- kit-counter (12,6) 2x1
function counter() {
  const g = grid(2, 1);
  g.clear(2, 1, 60, 15);
  g.clear(0, 12, 2, 4);                        // the lair door (left, rows 12-15)
  g.clear(62, 8, 2, 8);                        // to the fridge (right, rows 8-15)
  g.clear(48, 16, 4, 2);                       // up from the stove
  g.put(30, 16, '^').put(34, 16, '^').put(38, 16, '^');  // the burners (hot rings set into the stovetop)
  g.box(54, 14, 5, 2, '#');                    // the bread bin
  g.box(4, 8, 20, 3, 'G');                     // glass-fronted cabinets (8 tiles up)
  g.box(52, 9, 10, 2, 'G');                    // the range hood
  g.put(6, 15, 'S');
  g.put(20, 15, 'k').put(44, 15, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- kit-sink (10,6) 2x2: Big Tok
function sink() {
  const g = grid(2, 2);
  g.clear(2, 1, 60, 29);
  g.clear(0, 4, 2, 4).row(0, 8, 6, '#');       // the window sill (left, rows 4-7; rescue gate)
  g.clear(62, 12, 2, 4).row(54, 16, 10, '#');  // from the counter (right, rows 12-15)
  g.box(24, 30, 14, 4, '~');                   // the sink basin
  g.box(24, 34, 14, 2, 'G');
  // the spice rack up the left wall: shelves (L) and jars (R)
  [[28, 'R'], [26, 'L'], [24, 'R'], [22, 'L'], [20, 'R'], [18, 'L'], [16, 'R'], [14, 'L'], [12, 'R'], [10, 'L']]
    .forEach(([r, s]) => (s === 'L' ? g.row(2, r, 8, [26, 18, 10].includes(r) ? '#' : '=') : g.row(10, r, 4, '=')));
  // the plate rack back up to the counter door (right)
  [[28, 54, 57], [26, 58, 61], [24, 54, 57], [22, 58, 61], [20, 54, 57], [18, 50, 53]]
    .forEach(([r, a, b]) => g.row(a, r, b - a + 1, '='));
  return g.rows();
}
// ---------------------------------------------------------------- kit-undersink (10,8) 2x1
function undersink() {
  const g = grid(2, 1);
  g.clear(2, 1, 60, 15);
  g.clear(0, 12, 2, 4).clear(62, 12, 2, 4);
  g.box(18, 1, 3, 9, '#').box(18, 9, 10, 2, '#');  // the drain pipe and the U-bend
  g.box(36, 1, 2, 6, '#');
  g.row(10, 15, 30, '~');                      // the leak puddle
  g.box(9, 14, 1, 2, '#');                     // the pipe foot behind it (song-seed)
  g.box(50, 14, 4, 2, '%').clear(51, 15, 2, 1); // a crack in the back panel (Mote)
  g.put(44, 15, 'B');                          // the drain pipe's crack, at the floor ([issue 28] was a tile up, in the air)
  g.put(56, 15, 'k').put(4, 15, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- kit-window (7,6) 3x1
function windowSill() {
  const g = grid(3, 1);
  g.clear(2, 1, 92, 15);
  g.clear(94, 4, 2, 4).row(84, 8, 12, '#');    // from Big Tok's sink (right, rows 4-7)
  g.clear(2, 16, 30, 2);                       // the drop to the table (bottom, cols 2-31)
  g.row(30, 10, 54, '#');                      // the window sill
  g.row(52, 8, 10, '=');                       // the curtain rod
  g.row(53, 3, 4, 'G');                        // above the rod (Hump's leap)
  g.row(40, 8, 3, '=').row(70, 8, 4, '=');     // herb pot leaves
  g.row(2, 10, 12, '#');                       // the far end of the sill
  g.row(88, 14, 4, '=').row(84, 12, 4, '=');   // a tea towel and a hook: back up to the sill
  g.put(26, 6, 'H').put(21, 7, 'H').put(16, 7, 'H');   // ladles in the utensil jar
  g.put(80, 7, 'k').put(40, 15, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- kit-table (7,7) 3x2: the sneak
function table() {
  const g = grid(3, 2);
  g.clear(2, 1, 92, 33);
  g.clear(2, 0, 30, 1);                        // the drop from the window (top, cols 2-31)
  g.clear(0, 30, 2, 4);                        // to the back door (left, rows 30-33)
  g.clear(94, 30, 2, 4);                       // into the under-sink cabinet (right, rows 30-33)
  g.box(94, 0, 2, 30, 'G');
  g.row(4, 16, 42, '#');                       // the table top
  g.row(10, 26, 7, '=').row(34, 26, 7, '=').row(56, 26, 7, '=');  // chair seats
  g.box(80, 18, 10, 16, 'G');                  // the dishwasher (east face: a drop)
  g.clear(80, 33, 10, 1);                      // [fixer] the beetles' lane under the dishwasher: a Cloak-only shortcut back west
  for (let r = 32; r >= 18; r -= 2) g.row(76, r, 4, '=');        // its pulled-out rack (west face)
  g.put(20, 15, 'k').put(10, 33, 'k').put(50, 33, 'k').put(84, 17, 'k').put(70, 33, 'k');
  return g.rows();
}
// ---------------------------------------------------------------- kit-pantrydoor (5,7) 2x2
function pantryDoor() {
  const g = grid(2, 2);
  g.clear(2, 1, 60, 33);
  g.clear(0, 30, 2, 4);                        // the Pantry door (left, rows 30-33; exact)
  g.clear(62, 30, 2, 4);                       // from under the table (right)
  g.row(6, 33, 12, '~').row(20, 33, 22, '~');  // the mop-bucket spill
  g.clear(18, 34, 2, 2);                       // the head of the laundry stairs (bottom, inside cols 18-25): a ladder down (laun-stairs)
  // [playtest] was cols 18-25: an 8-tile hole between the two spills, so the Pantry (needs only the Raft) couldn't be reached before the Glider. Now 2 wide: a hop for any cricket on the raft
  [[31, 54, 57], [29, 50, 53], [27, 54, 57], [25, 50, 53], [23, 54, 57]].forEach(([r, a, b]) => g.row(a, r, b - a + 1, '='));  // the coat rack
  g.row(48, 21, 12, '#');                      // the boot shelf
  g.put(2, 33, 'k').put(46, 33, 'k').put(52, 20, 'k');
  return g.rows();
}
export default {
  id: 'z03-kitchen', n: 3, name: 'Kitchen',
  palette: ['#F1D27A', '#C27A45', '#D0614A', '#8EA67A'],
  bg: 'z03-kitchen',
  start: { room: 'kit-fridge' },
  beacon: { room: 'kit-undersink', x: 44, y: 15 },
  lair: { room: 'kit-sink', x: 6, y: 9 },
  decoys: [{ voice: 'hinge-creak', room: 'kit-fridge', x: 30, y: 20, every: 14 }],
  near: ['wooden-spoon', 'cork', 'sponge', 'spice-rack'],
  rooms: [
    {
      id: 'kit-fridge', name: 'The Fridge', x: 14, y: 6,
      grid: fridge(),
      temp: { left: 58, right: 74 },
      bg: { v: 'b', x: 0.4, y: 0.6 },
      decor: [
        { prop: 'save-crack', x: 57, y: 51, h: 1.2, layer: 'back' },
        { prop: 'thermostat-lock', x: 49.5, y: 47.5, h: 1.4, layer: 'back' },
        { prop: 'cork', x: 24, y: 1, h: 0.9 },
      ],
      entities: [
        { type: 'thermostat', id: 'kit-thermo', x: 50, y: 51, target: 66, tol: 1 },
        { type: 'gate', id: 'kit-thermo-door', x: 38, y: 1, w: 1, h: 1, opens: { switch: 'kit-thermo' } },
        { type: 'secret', id: 'kit-thermo', x: 41, y: 1 },
        { type: 'secret', id: 'kit-crumbs-cookiejar', x: 25, y: 1 },
        { type: 'npc', who: 'rolo', x: 2, y: 51, recruit: 'rolo' },
        { type: 'trigger', x: 44, y: 46, w: 6, h: 6, emit: 'dialog', id: 'fridge', lines: [[null, TEXT.oneLiners.fridge]] },
        { type: 'trigger', x: 44, y: 46, w: 6, h: 6, emit: 'heard', sound: 'fridge' },
        { type: 'sign', x: 58, y: 51, w: 4, text: S.save },
        { type: 'sign', x: 46, y: 51, w: 4, text: 'The fridge side is good and grippy. Up the gap for the cookie jar!' },
        { type: 'cockroach', x: 32, y: 1, range: [22, 36] },
      ],
    },
    {
      id: 'kit-stove', name: 'The Stove', x: 12, y: 7,
      grid: stove(),
      bg: { v: 'a', x: 0.8, y: 0.6 },
      decor: [
        { prop: 'faucet-handle', x: 22, y: 5, h: 1.1 }, { prop: 'faucet-handle', x: 30, y: 5, h: 1.1 }, { prop: 'faucet-handle', x: 38, y: 5, h: 1.1 },
        { prop: 'wooden-spoon', x: 44, y: 5, h: 2.4, rot: 1.3 },
      ],
      entities: [
        { type: 'gate', id: 'kit-crawl', x: 13, y: 23, w: 1, h: 2, opens: { item: 'glow' }, msg: TEXT.gates.dark },
        { type: 'secret', id: 'kit-crumbs-crawl', x: 4, y: 24 },
        { type: 'cockroach', x: 24, y: 33, range: [4, 46] },
        { type: 'cockroach', x: 30, y: 24, range: [16, 48] },
        { type: 'sign', x: 40, y: 33, w: 6, text: 'Cockroaches fly off when you get close. {chirp} to stun one first, then {kick}.' },
        { type: 'crumbs', x: 40, y: 5, n: 5 },
      ],
    },
    {
      id: 'kit-counter', name: 'The Counter', x: 12, y: 6,
      fx: [{ kind: 'steam', x: 30, y: 15, every: 3 }, { kind: 'steam', x: 34, y: 15, every: 4 }, { kind: 'steam', x: 38, y: 15, every: 3.5 }],
      grid: counter(),
      bg: { v: 'a', x: 0.45, y: 0.55 },
      decor: [
        { prop: 'save-crack', x: 6, y: 15, h: 1.2, layer: 'back' },
        { prop: 'grape', x: 17, y: 15, h: 0.9 },
        { gecko: 'bigtok', pose: 'sleep', x: 11, y: 15, len: 300, after: 'duo', layer: 'mid' }, { prop: 'banana-slice', x: 19, y: 15, h: 0.8 },
        { prop: 'spice-rack', x: 12, y: 7.4, h: 1.6, layer: 'back', alpha: 0.6 },
      ],
      entities: [
        { type: 'sign', x: 40, y: 15, w: 6, text: S.heat },
        { type: 'fruitflies', x: 18, y: 14 },
        { type: 'sign', x: 22, y: 15, w: 5, text: 'Fruit flies block the way. {chirp} scatters them.' },
        { type: 'lair', boss: 'bigtok', x: 2, y: 15, w: 2, h: 3, to: 'kit-sink', at: [58, 29] },
        { type: 'secret', id: 'kit-seedheart-cabinet', x: 14, y: 7 },
        { type: 'secret', id: 'kit-songseed-hood', x: 57, y: 8 },
      ],
    },
    {
      id: 'kit-sink', name: 'The Sink', x: 10, y: 6,
      grid: sink(),
      bg: { v: 'a', mirror: true, x: 0.3, y: 0.3 },
      decor: [
        { prop: 'faucet-handle', x: 31, y: 27, h: 1.6, layer: 'back' },
        { prop: 'spice-rack', x: 6, y: 25.6, h: 1.8, layer: 'back' },
        { prop: 'spice-rack', x: 6, y: 17.6, h: 1.8, layer: 'back' },
        { prop: 'spice-rack', x: 6, y: 9.6, h: 1.8, layer: 'back' },
      ],
      entities: [
        { type: 'boss', boss: 'bigtok', x: 31, y: 29, cricket: 'duo', checkpoints: [[58, 29], [5, 25], [5, 17]] },
        { type: 'gate', id: 'kit-window-gate', x: 0, y: 4, w: 2, h: 4, opens: { rescued: 'duo' }, msg: TEXT.gates.rescue },
      ],
    },
    {
      id: 'kit-undersink', name: 'Under the Sink', x: 10, y: 8,
      grid: undersink(),
      bg: { v: 'b', x: 0.15, y: 0.75 },
      decor: [
        { prop: 'sponge', x: 58, y: 15, h: 1.0 },
        { prop: 'sponge', x: 30, y: 4, h: 1.0, rot: 0.3 },
      ],
      entities: [
        { type: 'item', item: 'raft', x: 43, y: 15 },
        { type: 'sign', x: 46, y: 15, w: 5, text: S.raft },
        { type: 'secret', id: 'kit-songseed-puddle', x: 6, y: 15 },
        { type: 'secret', id: 'kit-mote', x: 51, y: 15 },
        { type: 'cockroach', x: 56, y: 15, range: [46, 60] },
      ],
    },
    {
      id: 'kit-window', name: 'The Window Sill', x: 7, y: 6,
      grid: windowSill(),
      bg: { v: 'a', x: 0.2, y: 0.2 },
      motes: true,
      decor: [
        { prop: 'fake-plant', x: 41, y: 9.8, h: 3, layer: 'back' },
        { prop: 'fake-plant', x: 71.5, y: 9.8, h: 3, layer: 'back', flip: true },
        { prop: 'wooden-spoon', x: 21, y: 9, h: 3.2, layer: 'back' },
      ],
      entities: [
        { type: 'fruitflies', x: 60, y: 8 },
        { type: 'secret', id: 'kit-hump', x: 55, y: 2 },
        { type: 'sign', x: 32, y: 9, w: 6, text: 'The table is down there. Hop off when you\'re ready.' },
      ],
    },
    {
      id: 'kit-table', name: 'Under the Table', x: 7, y: 7,
      grid: table(),
      bg: { v: 'b', mirror: true, x: 0.6, y: 0.7 },
      decor: [
      ],
      entities: [
        { type: 'sign', x: 14, y: 15, w: 6, text: S.sneak },
        { type: 'sign', x: 4, y: 33, w: 4, text: S.hide },
        ...[8, 18, 28, 38, 46, 54, 64, 72].map((x, i) => ({ type: 'hide', x, y: 33, w: 1, art: ['candy-wrapper', 'bottle-cap', 'banana-slice', 'cork'][i % 4] })),  // a napkin, a cap, a crumb...
        { type: 'beetle', x: 30, y: 33, range: [3, 74] },
        { type: 'beetle', x: 66, y: 33, range: [3, 74], dir: -1 },
        { type: 'crumbs', x: 13, y: 25, n: 5 },
        // [fixer] kit-cloak: a darkling beetle nests in the lane under the dishwasher. It fills the
        // tunnel (block: no squeezing past) and there's nowhere to hide: only the Cellophane Cloak gets
        // you through, from the under-sink cabinet back west to the table (the shortcut).
        { type: 'beetle', x: 85, y: 33, range: [80, 89], block: true, speed: 45 },
        { type: 'secret', id: 'kit-cloak', x: 84, y: 33 },
        { type: 'sign', x: 90, y: 33, w: 4, text: 'Beetle nest! No hiding spots in there. You\'d have to be invisible.' },
      ],
    },
    {
      id: 'kit-pantrydoor', name: 'The Back Door', x: 5, y: 7,
      grid: pantryDoor(),
      bg: { v: 'b', x: 0.9, y: 0.6 },
      decor: [{ prop: 'bottle-cap', x: 50, y: 33, h: 1.1 }],
      entities: [
        { type: 'sign', x: 54, y: 33, w: 5, text: S.raft },
        { type: 'sign', x: 42, y: 33, w: 4, nx: 43, text: 'The gap in the spill goes down to the Laundry: {down} + {jump} through the rungs.' }, // [playtest] the ladder; [issue 9] its note on the dry floor before the spill (was in the water)
        { type: 'crumbs', x: 56, y: 20, n: 10 },
        { type: 'cockroach', x: 54, y: 20, range: [49, 58] },
      ],
    },
  ],
};
