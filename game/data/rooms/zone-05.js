// Zone 5: the Laundry (builder B). Brief: design/zones/z05.md. Rooms at their house.js cells;
// grids drawn with b-kit rectangles (local tile coordinates; 32x18 per screen).
// Main path: laun-stairs (start, from the Kitchen's floor hole) -> laun-sink (the shaft down,
// thermostat lock) -> laun-dryer (climb the vent hose to the Glider; the vent is the sound hole)
// -> back up laun-stairs -> glide 10 tiles from the stair head -> laun-lair (Peridot, Beep, Hump).
import { grid } from './b-kit.js';

// ---- laun-stairs: the laundry stairs (cell 5,9, 2x1) ----
const st = grid(2, 1).frame('#');
st.r(18, 0, 8, 1, '.');                              // the Kitchen's floor hole (exact, cols 18-25)
st.r(63, 0, 1, 18, 'G').r(63, 6, 1, 4, '.');         // right: slick wall; the lair door (rows 6-9), 10 tiles of air out
st.r(0, 16, 64, 2).r(3, 16, 4, 2, '.');             // the floor; down to the sink room (a shaft, cols 3-6)
st.r(1, 10, 2, 8);                                   // the post beside the shaft
st.r(13, 14, 2, 4).r(15, 12, 2, 6).r(17, 10, 2, 8).r(19, 8, 2, 10); // the steps up
st.r(21, 7, 32, 11);                                 // the stair head landing (the ledge sticks out to col 52)
st.r(53, 7, 10, 11, '.');                            // the drop beside the ledge: falls into the sink room
// [playtest] a ladder of one-way rungs up the stair head to the Kitchen's floor hole (cols 18-19): the Laundry had no
// way back up (its only other way out, to the Basement, needs the Glow Bead from the Study, which needs the Glider from here)
st.r(18, 6, 2, 1, '=').r(18, 4, 2, 1, '=').r(18, 2, 2, 1, '=').r(18, 0, 2, 1, '=');

// ---- laun-sink: the utility sink (cell 5,10, 2x1) ----
const sk = grid(2, 1).frame('#');
sk.r(3, 0, 4, 1, '.').r(53, 0, 10, 1, '.');          // up to the stairs (the shaft); the drop from the stair head
sk.r(0, 12, 1, 4, '.').r(63, 12, 1, 4, '.');         // left: the dryer; right: the washer
sk.r(0, 16, 64, 2);
sk.r(2, 0, 1, 8).r(7, 0, 1, 8);                      // the shaft's walls (wall-jump up to the stairs)
sk.r(1, 10, 11, 1, '=');                             // the window-well sill (drop through it with {down} + {jump})
sk.r(12, 10, 9, 3, 'G');                             // the utility sink (porcelain, on the wall)
sk.r(21, 12, 3, 4).r(24, 14, 3, 2);                  // a detergent box and a bucket: steps up to the rim
sk.r(5, 14, 3, 2).r(8, 12, 3, 4);                    // a bucket and a crate under the sill (back up from the dryer door)
sk.r(11, 14, 2, 2);                                  // [issue #4] a pail under the sink: back up out of the gap below it (was 4 up)
sk.r(46, 7, 5, 6, 'G').r(46, 13, 1, 3).r(50, 13, 1, 3); // the water heater on its legs
sk.r(35, 12, 4, 1).r(38, 13, 1, 3);                  // the thermostat cubby (its gate is an entity)
sk.r(39, 14, 2, 2);                                  // [issue #4] a jug beside the cubby: back up out of the gap by the water heater (was 4 up)

// ---- laun-dryer: the dryer (cell 3,9, 2x2) ----
const dr = grid(2, 2).frame('#');
dr.r(0, 30, 1, 4, '.').r(63, 30, 1, 4, '.');         // left: the basket; right: the sink room
dr.r(0, 34, 64, 2);
dr.r(30, 9, 21, 24, 'G');                            // the dryer: enamel sides, on little feet (crawl under it)
dr.r(33, 21, 15, 10, '.').r(30, 26, 3, 5, '.');      // the drum and its porthole
dr.r(22, 32, 3, 2).r(25, 30, 3, 4);                  // steps up to the porthole
for (let k = 0; k < 12; k++) dr.r(k % 2 ? 51 : 55, 32 - 2 * k, 4, 1, '='); // the vent hose: bends to climb
dr.r(52, 5, 6, 1);                                   // a high shelf over the warm air
dr.r(1, 12, 13, 1);                                  // a shelf across the room (glide to it)
dr.r(1, 1, 62, 1);

// ---- laun-basket: under the laundry chute (cell 2,9, 1x2) ----
const bk = grid(1, 2).frame('#');
bk.r(31, 30, 1, 4, '.');                             // right: the dryer
bk.r(0, 34, 32, 2);
bk.r(8, 22, 1, 12, 'G').r(24, 22, 1, 12, 'G');       // the wicker basket
bk.r(9, 26, 15, 8);                                  // towels (a soft landing from the chute above)
bk.r(20, 24, 4, 2);                                  // a towel heap up to the rim
bk.r(1, 26, 2, 8).r(1, 33, 1, 1, '.').r(2, 33, 1, 1, '%'); // the baseboard: a crack (Mote) and a cache behind it
bk.r(27, 31, 4, 3);                                  // a sock pile by the door
for (const r of [32, 30, 28, 26, 24, 22]) bk.r(5, r, 2, 1, '='); // [issue #4] clothes-pegs up behind the basket, to its rim (the gap was 8 deep)

// ---- laun-washer: the washer (cell 7,10, 2x1) ----
const ws = grid(2, 1).frame('#');
ws.r(0, 12, 1, 4, '.').r(63, 12, 1, 4, '.');         // left: the sink room; right: the detergent shelf
ws.r(0, 16, 64, 2);
ws.r(44, 16, 6, 2, 'C');                             // rubble over the old basement stairs (exact: cols 12-17 of cell 8)
ws.r(50, 13, 13, 3, '~');                            // the washer flood
ws.r(14, 13, 5, 3).r(30, 13, 3, 3);                  // a laundry basket, a box
ws.r(19, 15, 1, 1).r(33, 15, 1, 1);                  // [issue #4] a sock by each: they were 3 up (too high for Jump 2) from the floor between and past them
ws.r(22, 10, 11, 1, '=');                            // a drying rack
ws.r(36, 9, 6, 1, '=');

// ---- laun-shelf: the detergent shelf (cell 9,10) ----
const sf = grid(1, 1).frame('#');
sf.r(0, 12, 1, 4, '.');                              // left: the flood
sf.r(0, 16, 32, 2);
sf.r(1, 1, 1, 10, 'G').r(30, 1, 1, 12, 'G');
sf.r(1, 11, 3, 1);                                   // [issue #19] a short shelf over the doorway (rows 12-15): the left upright ends on it
sf.r(6, 12, 5, 4);                                   // detergent jugs
sf.r(4, 14, 2, 2).r(11, 14, 2, 2);                   // [issue #19] a small bottle each side of the jugs: steps of 2 (Jump 2) on and off them
sf.r(1, 3, 11, 1);                                   // the top shelf, 8 tiles up
sf.r(14, 9, 10, 1, '=');                             // the ironing board
sf.r(26, 13, 5, 1);                                  // the cubby under the shelf (rows 14-15); [fixer] the heavy
                                                     // detergent box in front of it is a push entity (Duo shoves it in)

// ---- laun-lair: the laundry ceiling (cell 7,9, 3x1): Peridot ----
const lr = grid(3, 1).frame('#');
lr.r(0, 6, 1, 4, '.');                               // left: the lair door (from the stair head)
lr.r(1, 2, 94, 2, 'G');                              // the dryer's exhaust duct along the ceiling
lr.r(1, 10, 6, 8);                                   // the landing by the door
lr.r(0, 16, 96, 2);                                  // the joists
lr.r(20, 12, 7, 1, '=').r(54, 12, 7, 1, '=').r(70, 11, 5, 1, '=');
lr.r(89, 13, 6, 1);                                  // Beep's wall plate

const Peridot = { x: 48, y: 15 };

export default {
  id: 'z05-laundry', n: 5, name: 'Laundry',
  palette: ['#B7A6D3', '#C9C3CC', '#A9C8E0', '#6F7487'],
  bg: 'z05-laundry',
  start: { room: 'laun-stairs' },
  decoys: [{ voice: 'alarm', room: 'laun-lair', x: 92, y: 11, every: [8, 10], answers: true }],
  rooms: [
    {
      id: 'laun-stairs', name: 'The Laundry Stairs', x: 5, y: 9,
      grid: st.rows(),
      bg: { v: 'b', x: 0.3, y: 0.4 },
      decor: [
        { prop: 'sock', x: 30, y: 6, h: 1.1, layer: 'mid' },
        { prop: 'spool', x: 9, y: 15, h: 1.2, layer: 'back' },
        { prop: 'smoke-alarm-wall', x: 61, y: 2, h: 1.0, layer: 'back' },
      ],
      entities: [
        { type: 'start', x: 10, y: 15 },
        { type: 'save', x: 11, y: 15 },
        { type: 'save', x: 46, y: 6 },
        { type: 'lair', boss: 'peridot', x: 49, y: 6, w: 2, h: 3 },
        { type: 'earwig', x: 28, y: 6, range: [24, 34] },
        { type: 'earwig', x: 44, y: 6, range: [38, 44], dir: 1 },
        { type: 'sign', x: 49, y: 6, w: 4, text: 'Too far to jump. If only you could float across.' },
        { type: 'sign', x: 5, y: 15, w: 3, nx: 7, text: 'Down to the sink. Wall-jump back up the shaft.' }, // [issue 9] the note at the shaft's lip
        { type: 'sign', x: 21, y: 6, w: 3, text: 'Up the rungs to the Kitchen.' }, // [playtest] the ladder
      ],
    },
    {
      id: 'laun-sink', name: 'The Utility Sink', x: 5, y: 10,
      grid: sk.rows(),
      temp: { left: 58, right: 86 },
      // [issue 21] the drop from the stair head (cols 53-62) only comes down: the beacon's path
      // (src/beacon.js) goes up by the pipe door or the shaft, never up through it
      noWay: [{ from: [0, 0, 64, 18], to: [53, 0, 10, 1] }],
      bg: { v: 'a', x: 0.2, y: 0.6 },
      fx: [{ kind: 'steam', x: 48, y: 6, every: 6 }],
      decor: [
        { prop: 'thermostat-lock', x: 33, y: 13, h: 1.2, layer: 'back' },
        { prop: 'faucet-handle', x: 16, y: 9, h: 1.0, layer: 'back' },
        { prop: 'sponge', x: 19, y: 9, h: 0.6, layer: 'mid' },
        { gecko: 'peridot', x: 25, y: 15, len: 280, layer: 'mid', after: 'hump' },
      ],
      entities: [
        { type: 'thermostat', id: 'laun-thermo', x: 33, y: 13, target: 72 },
        // [playtest] the drop beside the stair head lands here, walled off by the water heater: climb the pipe back up
        { type: 'door', x: 58, y: 15, to: 'laun-stairs', at: [50, 6], label: 'Climb the pipe' },
        { type: 'gate', id: 'laun-thermo-door', x: 35, y: 13, w: 1, h: 3, opens: { switch: 'laun-thermo' }, tile: '#' },
        { type: 'secret', id: 'laun-thermo', x: 36, y: 15 },
        { type: 'light', x: 4, y: 3 },
        { type: 'clothesmoth', x: 27, y: 6 },
        { type: 'clothesmoth', x: 57, y: 6 },
        { type: 'sign', x: 30, y: 15, w: 4, text: 'A thermostat lock. It wants 72°F. Someone who hears temperature could help.' },
      ],
    },
    {
      id: 'laun-dryer', name: 'The Dryer', x: 3, y: 9,
      grid: dr.rows(),
      bg: { v: 'a', x: 0.5, y: 0.4 },
      fx: [{ kind: 'dust', x: 52, y: 6, w: 10, h: 26 }, { kind: 'motes', x: 2, y: 2, w: 26, h: 10 }],
      decor: [
        { prop: 'dryer-vent', x: 50, y: 8, h: 1.6, layer: 'back' },
        { prop: 'sock', x: 8, y: 11, h: 1.0, layer: 'mid' },
        { prop: 'sock', x: 20, y: 33, h: 1.2, layer: 'mid', flip: true },
        { prop: 'spool', x: 4, y: 33, h: 1.3, layer: 'back' },
      ],
      entities: [
        { type: 'item', item: 'glider', x: 44, y: 8 },
        { type: 'beacon', x: 49, y: 8 }, // [issue 28] at the vent hose's mouth, on the dryer (was a tile up, in the air)
        { type: 'lift', kind: 'updraft', x: 59, y: 2, w: 3, h: 31, vy: 6 },
        { type: 'loud', x: 30, y: 21, w: 18, h: 10 },
        { type: 'secret', id: 'laun-songseed-drum', x: 41, y: 30 },
        { type: 'crumbs', x: 55, y: 4, n: 10 },
        { type: 'crumbs', x: 5, y: 11, n: 5 },
        { type: 'checkpoint', x: 60, y: 33 },
        { type: 'checkpoint', x: 52, y: 15 },
        { type: 'trigger', x: 26, y: 29, w: 2, h: 1, emit: 'dialog', key: 'oneLiners.dryerSqueak' },
        { type: 'sign', x: 46, y: 8, w: 4, text: 'Hold {jump} while falling to glide. Warm air lifts a glider.' },
      ],
    },
    {
      id: 'laun-basket', name: 'The Laundry Basket', x: 2, y: 9,
      grid: bk.rows(),
      bg: { v: 'b', x: 0.15, y: 0.5 },
      decor: [
        { prop: 'sock', x: 14, y: 25, h: 1.2, layer: 'mid' },
        { prop: 'sock', x: 19, y: 25, h: 1.0, layer: 'mid', flip: true },
      ],
      entities: [
        { type: 'hide', x: 4, y: 33, w: 2, art: 'sock' },
        { type: 'hide', x: 12, y: 25, w: 1, art: 'sock' },
        { type: 'secret', id: 'laun-mote', x: 1, y: 33 },
        { type: 'crumbs', x: 22, y: 23, n: 5 },
        { type: 'checkpoint', x: 16, y: 25 },
        { type: 'sign', x: 26, y: 30, w: 4, text: 'The old laundry chute. One way only.' },
      ],
    },
    {
      id: 'laun-washer', name: 'The Washer', x: 7, y: 10,
      grid: ws.rows(),
      bg: { v: 'a', mirror: true, x: 0.5, y: 0.5 },
      decor: [
        { prop: 'sponge', x: 16, y: 12, h: 0.7, layer: 'mid' },
        { prop: 'sock', x: 27, y: 9, h: 1.2, layer: 'back' },
      ],
      entities: [
        { type: 'current', x: 50, y: 12, w: 13, h: 4, vx: 1.2 },
        { type: 'earwig', x: 8, y: 15, range: [3, 12] },
        { type: 'earwig', x: 38, y: 15, range: [34, 43] },
        { type: 'crumbs', x: 39, y: 8, n: 5 },
        { type: 'sign', x: 45, y: 15, w: 4, text: 'Plaster rubble over the basement stairs. A hard pound from above might break it.' },
      ],
    },
    {
      id: 'laun-shelf', name: 'The Detergent Shelf', x: 9, y: 10,
      grid: sf.rows(),
      bg: { v: 'b', x: 0.8, y: 0.5 },
      decor: [{ prop: 'sponge', x: 8, y: 11, h: 0.8, layer: 'mid' }],
      entities: [
        { type: 'secret', id: 'laun-songseed-shelf', x: 5, y: 2 },
        { type: 'push', id: 'laun-box', kind: 'box', x: 24, y: 14, w: 2, h: 2 }, // [fixer] Duo's Shove
        { type: 'secret', id: 'laun-duo', x: 27, y: 15 },
        { type: 'crumbs', x: 20, y: 8, n: 5 },
      ],
    },
    {
      id: 'laun-lair', name: 'The Laundry Ceiling', x: 7, y: 9,
      grid: lr.rows(),
      music: 'boss',
      bg: { v: 'b', mirror: true, x: 0.6, y: 0.2 },
      decor: [
        { prop: 'smoke-alarm-wall', x: 92, y: 12, h: 1.2, layer: 'back' },
        { prop: 'dryer-vent', x: 4, y: 4, h: 1.4, layer: 'back' },
      ],
      entities: [
        // [playtest] the lair's only way out was the 10-tile glide in (uphill on the way back): climb the hose to the stair head
        { type: 'door', x: 3, y: 9, to: 'laun-stairs', at: [50, 6], label: 'Climb the hose' },
        { type: 'trigger', x: 1, y: 6, w: 2, h: 4, emit: 'ready', boss: 'peridot' },
        { type: 'lift', kind: 'updraft', x: 9, y: 4, w: 2, h: 12, vy: 6 },
        { type: 'lift', kind: 'updraft', x: 29, y: 4, w: 2, h: 12, vy: 6 },
        { type: 'lift', kind: 'updraft', x: 42, y: 4, w: 2, h: 12, vy: 6 },
        { type: 'lift', kind: 'updraft', x: 62, y: 4, w: 2, h: 12, vy: 6 },
        { type: 'lift', kind: 'updraft', x: 85, y: 4, w: 2, h: 12, vy: 6 },
        { type: 'hide', x: 23, y: 11, w: 1, art: 'sock' },
        { type: 'beacon', x: 92, y: 12, after: true },
        { type: 'npc', who: 'beep', x: 92, y: 12, talk: 'npcs.beep.meet', give: 'battery', giveTalk: 'npcs.beep.battery', recruit: 'beep' },
        { type: 'boss', boss: 'peridot', x: Peridot.x, y: Peridot.y, cricket: 'hump', checkpoints: [[4, 9], [4, 9], [4, 9]] },
      ],
    },
  ],
};
