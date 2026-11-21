#!/usr/bin/env node
// Builder D's rooms: the Hall, the stairwell, the chimney shaft (game/data/rooms/links.js) and
// zone 10, the Attic (game/data/rooms/zone-10.js). The grids are drawn here with a few box
// helpers and written out as plain data; edit this script and re-run it:
//   node tools/make-zone-d.mjs
// Coordinates are tiles inside the room (x = column, y = row; 32x18 tiles per screen cell).
// The exact link spans come from game/data/house.js (see design/zones/links.md).
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXT } from '../game/data/text.js';
import { ZONE_INFO } from '../game/data/zones.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- grid helpers
class G {
  constructor(sw, sh) { this.w = sw * 32; this.h = sh * 18; this.t = Array.from({ length: this.h }, () => Array(this.w).fill('.')); }
  set(x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.t[y][x] = c; return this; }
  box(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; }
  border(c = '#') { this.box(0, 0, this.w, 1, c).box(0, this.h - 1, this.w, 1, c).box(0, 0, 1, this.h, c).box(this.w - 1, 0, 1, this.h, c); return this; }
  // open a span on an edge: side 'left'|'right' -> rows a..b; 'top'|'bottom' -> cols a..b
  open(side, a, b, depth = 1) {
    for (let i = a; i <= b; i++) for (let d = 0; d < depth; d++) {
      if (side === 'left') this.set(d, i, '.'); else if (side === 'right') this.set(this.w - 1 - d, i, '.');
      else if (side === 'top') this.set(i, d, '.'); else this.set(i, this.h - 1 - d, '.');
    }
    return this;
  }
  mark(x, y, c) { return this.set(x, y, c); } // P S k H h m B markers
  rows() { return this.t.map((r) => r.join('')); }
}

// ---------------------------------------------------------------- output helpers
const J = (v) => JSON.stringify(v);
function roomJS(r, ind = '    ') {
  const { grid, entities = [], ...rest } = r;
  const lines = [`${ind}{`];
  for (const [k, v] of Object.entries(rest)) lines.push(`${ind}  ${k}: ${J(v)},`);
  lines.push(`${ind}  grid: [`);
  for (const row of grid.rows()) lines.push(`${ind}    '${row}',`);
  lines.push(`${ind}  ],`);
  lines.push(`${ind}  entities: [`);
  for (const e of entities) lines.push(`${ind}    ${J(e)},`);
  lines.push(`${ind}  ],`);
  lines.push(`${ind}},`);
  return lines.join('\n');
}
function zoneJS(name, z) {
  const { rooms, ...rest } = z;
  const head = Object.entries(rest).map(([k, v]) => `  ${k}: ${J(v)},`).join('\n');
  return `export const ${name} = {\n${head}\n  rooms: [\n${rooms.map((r) => roomJS(r)).join('\n')}\n  ],\n};\n`;
}
const sign = (x, y, w, text, nx) => ({ type: 'sign', x, y, w, ...(nx != null ? { nx } : {}), text }); // [issue 9] nx: the note's column
const deco = (prop, x, y, h, o = {}) => ({ prop, x, y, h, ...o });

// =================================================================================================
// THE HALL (cells x 8-9, y 3-5; the Bedroom's palette and paintings)
// =================================================================================================
function hallTop() {
  // 64x18. In from the bed-lair (left, rows 10-13, floor row 14) onto the bedroom door frame.
  const g = new G(2, 1).border('#');
  g.open('left', 10, 13);
  g.box(30, 0, 18, 1, 'G').open('top', 36, 41);           // the attic hatch (C latch is in att-hatch); G around it
  g.box(0, 14, 7, 4, '#');                               // the door frame (a ledge at row 14)
  g.box(7, 17, 56, 1, '.');                              // the whole floor is open: drop into the Hall
  g.box(10, 14, 2, 4, '#');                              // the coat-stand pole's top (flush with the door frame)
  g.box(63, 0, 1, 18, 'G');                              // far wall (G: nothing to climb near the hatch)
  g.mark(3, 13, 'k');
  return {
    id: 'hall-top', name: 'The Hall, Up High', x: 8, y: 3,
    bg: { v: 'a', x: 0.5, y: 0.15 },
    decor: [
      deco('smoke-alarm-wall', 22, 2, 1.6, { layer: 'mid' }),
      deco('pull-chain', 38, 3, 2.6),
      deco('book-spine', 2, 13, 1.1, { rot: 1.57, layer: 'mid' }),
    ],
    fx: [{ kind: 'dust', x: 8, y: 2, w: 50, h: 12 }],
    grid: g,
    entities: [
      { type: 'decoy', voice: 'alarm', x: 22, y: 1, every: 40 },
      sign(1, 13, 6, TEXT.oneLiners.hallAlarm),
    ],
  };
}
function hallFloor() {
  // 64x36. Drop down picture frames and a coat hook to the runner rug; the Bathroom door is right
  // (rows 30-33); the linen-closet nook (left, low) has the sleeping robot vacuum and its hum.
  const g = new G(2, 2).border('#');
  g.box(7, 0, 56, 1, '.');                               // open to hall-top
  g.box(0, 34, 64, 2, '#').open('right', 30, 33);        // the floor (runner rug); the Bathroom door
  g.box(0, 0, 7, 32, '#');                               // the bedroom door and its frame
  g.box(10, 0, 2, 28, '#');                              // the coat-stand pole: a 3-wide # shaft with the door (Booties back up)
  g.box(7, 30, 9, 2, '#');                               // the linen shelf: the nook's low ceiling
  g.box(1, 32, 15, 2, '.');                              // the nook (2 tiles high)
  g.box(16, 32, 3, 1, '=');                              // a folded-towel step up to the shelf top
  // picture frames and the coat hook: one-way ledges, all downhill from the door frame
  g.box(14, 3, 6, 1, '=').box(21, 8, 6, 1, '=').box(15, 13, 4, 1, '=').box(23, 18, 6, 1, '=').box(30, 24, 6, 1, '=');
  g.box(40, 32, 7, 1, '=');                              // a low shoe rack (walk under it)
  g.mark(30, 33, 'P').mark(22, 33, 'k').mark(24, 7, 'k').mark(48, 33, 'k');
  return {
    id: 'hall-floor', name: 'The Hall', x: 8, y: 4,
    bg: { v: 'b', x: 0.4, y: 0.6 }, loops: ['vacuum'],
    decor: [
      deco('drawer-pull', 4, 20, 1.2),                     // the bedroom door's knob
      deco('hook', 16, 12, 1.4, { layer: 'mid' }),        // the coat hook
      deco('sock', 17, 12, 1.0, { layer: 'mid', rot: 0.3 }),
      deco('sprites/enemies/vacuum/0.webp', 9, 33, 1.1, { layer: 'mid' }),
      deco('sock', 4, 33, 0.8, { layer: 'mid' }),
      deco('spool', 13, 33, 0.9, { layer: 'mid' }),
      deco('bottle-cap', 44, 31, 0.6, { layer: 'mid' }), // [issue 40] was a die
      deco('throw-pillow', 56, 33, 1.2, { layer: 'mid' }),
    ],
    paint: [{ kind: 'plaster', x: 7, y: 30, w: 9, h: 2 }],
    grid: g,
    entities: [
      { type: 'loud', x: 6, y: 32, w: 6, h: 2 },
      { type: 'secret', id: 'hall-songseed-closet', x: 2, y: 33 },
      sign(7, 29, 4, TEXT.signs.wallJump),
      sign(18, 33, 6, TEXT.signs.earplugs),
    ],
  };
}

// =================================================================================================
// THE STAIRWELL (cells x 16-17, y 3-8; the Study's palette and paintings)
// =================================================================================================
// The stairs are open-riser treads (1 tile thick, 2 wide, 2 rows apart): flight A goes right-down
// from the landing's top step, turns, and flight B goes left-down to the hall floor.
const A_STEPS = Array.from({ length: 14 }, (_, k) => ({ x: 28 + 2 * k, y: 2 * k }));       // stair-flight rows
const B_STEPS = Array.from({ length: 21 }, (_, j) => ({ x: 52 - 2 * j, y: 28 + 2 * j }));  // stair-flight rows (>= 36: stair-foot)

function stairLanding() {
  // 64x36. In from the tub rim (left, rows 30-33). A baby gate (G, 9 tall) on the top step; two
  // floss hooks swing you over. Beyond: the top step, the stairs down, and a picture ledge out
  // over the stairwell void: the Study door (right, rows 26-29) is a glide away.
  const g = new G(2, 2).border('#');
  g.open('left', 30, 33);
  g.box(0, 34, 28, 2, '#');                              // the landing floor and the top step
  g.box(28, 34, 35, 2, '.');                             // the stairwell: open below (onto the stairs)
  g.box(63, 0, 1, 36, 'G').open('right', 26, 29);        // the far wall: G (no climbing to the Study)
  // the bookcase: shelves to climb (one-way)
  g.box(7, 32, 5, 1, '=').box(9, 30, 5, 1, '=').box(7, 28, 5, 1, '=').box(9, 26, 5, 1, '=').box(10, 24, 4, 1, '=');
  g.mark(14, 20, 'H').mark(20, 21, 'H');
  g.box(22, 25, 1, 9, 'G');                              // the baby gate: mesh, 9 tall
  g.box(23, 24, 2, 10, '#');                             // the newel post
  g.box(25, 32, 3, 1, '=').box(25, 30, 3, 1, '=').box(25, 28, 3, 1, '=').box(25, 26, 3, 1, '=');  // banister rungs (far side)
  g.box(25, 24, 18, 1, '=');                             // the picture ledge out over the void (ends at col 42)
  g.mark(3, 33, 'k').mark(26, 33, 'k').mark(36, 23, 'k');
  return {
    id: 'stair-landing', name: 'The Landing', x: 16, y: 3,
    bg: { v: 'a', x: 0.3, y: 0.5 },
    decor: [
      deco('book-spine', 8, 31, 1.2, { layer: 'mid' }), deco('book-spine', 12, 29, 1.0, { layer: 'mid', flip: true }),
      deco('book-spine', 8, 27, 1.1, { layer: 'mid' }), deco('marble', 12, 25, 0.6, { layer: 'mid' }), // [issue 40] was a die
      deco('pin', 37, 23, 1.0, { layer: 'mid' }),
      deco('fake-plant', 3, 33, 2.2),
    ],
    fx: [{ kind: 'motes', x: 30, y: 4, w: 30, h: 18 }],
    grid: g,
    entities: [
      sign(2, 33, 5, TEXT.signs.floss),
      { type: 'crumbs', x: 41, y: 23, n: 5 },
    ],
  };
}
function stairFlight() {
  // 64x36. Flight A right-down (rows 0-26), flight B left-down beneath it. A gap in the spindles on
  // the right looks out over the Living Room: the curtain pelmet (right, rows 22-25) is 8+ tiles
  // of open air from the nearest step: glide in.
  const g = new G(2, 2);
  g.box(0, 0, 1, 36, '#');                               // left wall
  g.box(63, 0, 1, 36, 'G').open('right', 22, 25);        // right wall (G), the pelmet gap
  g.box(1, 0, 27, 1, '#');                               // the underside of the landing floor
  for (const s of A_STEPS) g.box(s.x, s.y, 2, 1, '#');
  for (const s of B_STEPS) if (s.y < 36) g.box(s.x, s.y, 2, 1, '#');
  g.mark(36, 2, 'H').mark(42, 3, 'H');                   // spindle-top hooks: optional fun swings
  g.box(36, 32, 7, 1, '=');                              // a shelf under the stairs
  g.mark(38, 31, 'h');
  g.mark(46, 21, 'k').mark(50, 29, 'k');
  return {
    id: 'stair-flight', name: 'The Stairs', x: 16, y: 5,
    bg: { v: 'b', x: 0.5, y: 0.5 },
    decor: [
      deco('spool', 40, 31, 1.0, { layer: 'mid' }),
      deco('book-spine', 41, 31, 1.2, { layer: 'mid', flip: true }),
      deco('fake-plant', 60, 35, 3.0, { alpha: 0.8 }),
    ],
    fx: [{ kind: 'dust', x: 30, y: 4, w: 30, h: 26 }],
    grid: g,
    entities: [
      { type: 'crumbs', x: 42, y: 31, n: 5 },
    ],
  };
}
function stairFoot() {
  // 64x36. The hall floor at the foot of the stairs: save crack (the hub between the Kitchen and
  // the Living Room). Left (rows 30-33): the Kitchen. Right (rows 30-33): the Living Room, where
  // the back of the armchair (in liv-armchair) is the Rubber Band's wall. Silverfish.
  const g = new G(2, 2);
  g.box(0, 0, 1, 36, '#').open('left', 30, 33);
  g.box(63, 0, 1, 36, 'G').open('right', 30, 33);
  g.box(0, 34, 64, 2, '#');
  for (const s of B_STEPS) if (s.y >= 36) g.box(s.x, s.y - 36, 2, 1, '#');
  g.mark(30, 33, 'S').mark(5, 33, 'k').mark(50, 33, 'k').mark(30, 13, 'k');
  g.mark(58, 33, 'h');
  return {
    id: 'stair-foot', name: 'The Foot of the Stairs', x: 16, y: 7,
    bg: { v: 'a', x: 0.6, y: 0.8 },
    decor: [
      deco('throw-pillow', 22, 33, 1.3, { layer: 'mid' }),
      deco('sock', 58, 33, 1.0, { layer: 'mid' }),
      deco('marble', 44, 33, 0.6, { layer: 'mid' }),
      deco('book-spine', 3, 33, 1.6),
    ],
    grid: g,
    entities: [
      { type: 'hide', x: 58, y: 33, w: 1, art: 'sock' },
      { type: 'silverfish', x: 40, y: 33, range: [33, 56] },
      { type: 'silverfish', x: 18, y: 33, range: [12, 26] },
      sign(26, 33, 6, TEXT.signs.save),
    ],
  };
}


// =================================================================================================
// THE CHIMNEY (x 24; its own palette and one tall painting, tiled)
// =================================================================================================
// A flutter-only climb (Swift Feather): 8-wide G shaft (cols 12-19), brick lips 2 deep on
// alternating sides, 4 rows apart and 4 tiles of air across. One jump can't do 4 up AND 4 across
// (Jam's 4-rise apex is too close, Stripe's too low, the Rubber Band goes straight up into the lip
// above); a jump plus a flutter can. (Hump's huge leap can cheat it: known, harmless.)
function shaft(sh) { const g = new G(1, sh); g.box(0, 0, 32, g.h, 'G').box(12, 0, 8, g.h, '.'); return g; }
function lip(g, y, side, w = 2) { g.box(side === 'L' ? 12 : 20 - w, y, w, 1, 'G'); }

function chimFlue() {
  // 32x72. Bottom (cols 12-19) is the throat over the hearth (liv-hearth); top (cols 12-19) is
  // the damper (in chim-top). Lips from row 70 (right) up to row 2 (left), every 4 rows.
  const g = shaft(4);
  for (let y = 70, s = 'R'; y >= 2; y -= 4, s = s === 'R' ? 'L' : 'R') lip(g, y, s);
  lip(g, 70, 'R', 3);                                    // the first lip is a little wider (the hop in from the hearth crosses a room edge)
  // Soot's lookout, halfway up: the left lip at row 34 runs back into a niche in the brick
  g.box(7, 31, 5, 3, '.').box(7, 34, 7, 1, 'G');
  g.mark(18, 69, 'P').mark(9, 33, 'k').mark(16, 49, 'k').mark(16, 13, 'k');
  return {
    id: 'chim-flue', name: 'The Flue', x: 24, y: 3,
    bg: { v: 'a', x: 0.5 }, near: false,
    decor: [
      deco('carrier/lookout-tower.webp', 9, 33, 2.6, { alpha: 0.9 }),
      deco('steam-puff', 16, 60, 2.0, { alpha: 0.25 }),
    ],
    fx: [{ kind: 'dust', x: 12, y: 0, w: 8, h: 72 }],
    grid: g,
    entities: [
      { type: 'secret', id: 'chim-songseed-lookout', x: 8, y: 33 },
      { type: 'gate', id: 'damper-under', x: 12, y: 0, w: 8, h: 1, opens: { rescues: 9 }, card: 'damper' }, // the damper's underside (the card from below)
      sign(13, 69, 6, TEXT.signs.feather, 17), // [issue 9] the note on the glass ledge
    ],
  };
}
function chimTop() {
  // 32x54. Above the damper (row 53, a gate that opens at nine rescues; touching it shows who is
  // still missing). Lips carry on up to the attic gap (left, rows 28-31, floor row 32) and past it
  // to the chimney pot under the moon.
  const g = shaft(3);
  g.box(0, 0, 32, 1, 'G');
  for (let y = 52, s = 'R'; y >= 12; y -= 4, s = s === 'R' ? 'L' : 'R') lip(g, y, s);
  lip(g, 52, 'R', 3);                                    // a little wider: the hop up through the damper crosses a room edge
  g.box(0, 28, 12, 4, '.').box(0, 32, 14, 2, '#');       // the gap in the brick into the attic (floor row 32)
  g.mark(5, 31, 'k');
  return {
    id: 'chim-top', name: 'The Chimney Top', x: 24, y: 0,
    bg: { v: 'a', x: 0.5, y: 0.1 }, near: false,
    decor: [
      deco('damper', 15.5, 53, 1.4, { layer: 'mid' }),
      deco('book-spine', 3, 31, 0.9, { layer: 'mid', rot: 1.57 }),
    ],
    fx: [{ kind: 'motes', x: 12, y: 1, w: 8, h: 26 }],
    grid: g,
    entities: [
      { type: 'gate', id: 'damper', x: 12, y: 53, w: 8, h: 1, opens: { rescues: 9 }, card: 'damper' },
      { type: 'crumbs', x: 18, y: 11, n: 10 },
    ],
  };
}
function chimAsh() {
  // 32x36, dark. The hearth's ash dump (top, cols 14-17) drops in; the chimney base (bottom,
  // cols 12-19) is below. Falling is free; climbing back up is the flutter climb (lips from row 34
  // right up to row 2 right, under the hearth floor).
  const g = shaft(2);
  g.box(12, 0, 2, 1, 'G').box(18, 0, 2, 1, 'G');         // the hearth floor's underside: only cols 14-17 open
  for (let y = 34, s = 'R'; y >= 2; y -= 4, s = s === 'R' ? 'L' : 'R') lip(g, y, s);
  g.mark(18, 33, 'P').mark(16, 17, 'k');
  return {
    id: 'chim-ash', name: 'The Ash Pit', x: 24, y: 9, dark: true, needs: 'glow', needsMsg: TEXT.gates.dark,
    bg: { v: 'a', x: 0.5, y: 0.8 }, near: false,
    fx: [{ kind: 'dust', x: 12, y: 0, w: 8, h: 36 }],
    terrainKinds: { C: 'plaster' },
    grid: g,
    entities: [],
  };
}


// =================================================================================================
// ZONE 10: THE ATTIC (x 7-23, y 0-2). Everything combined; loud zones (Cotton Earplugs).
// =================================================================================================
const bat = (x, y, h = 0.9, flip = false) => deco('sprites/npcs/velvet.webp', x, y, h, { layer: 'mid', rot: 3.14, flip, alpha: 0.85 });
const hide = (x, y, art) => ({ type: 'hide', x, y, w: 1, art });

function attEntry() {
  // 64x36. In from the chimney top (right, rows 10-13, floor row 14). Save crack 1. The bat roost
  // hangs over the beam: a 2-high passage, loud (Earplugs), to both exits on the left: the rafters
  // (top, rows 2-13) and, down through a hole in the beam, the trunks (bottom, rows 30-33).
  const g = new G(2, 2).border('#');
  g.open('right', 10, 13);
  g.box(1, 14, 62, 4, '#').box(6, 14, 4, 4, '.').box(6, 14, 4, 1, '=');  // the beam (floor row 14); slats over a hole (drop through)
  g.box(18, 2, 27, 10, '#');                             // the roost rafter: a low ceiling over the passage
  g.open('left', 2, 13);                                 // to the rafters
  g.box(0, 34, 64, 2, '#').open('left', 30, 33);         // the lower floor; to the trunks
  for (let y = 32, i = 0; y >= 18; y -= 2, i++) g.box(i % 2 ? 7 : 4, y, 5, 1, '=');  // a ladder of slats up to the hole
  g.mark(56, 13, 'S').mark(12, 13, 'k').mark(20, 33, 'k').mark(50, 33, 'k');
  return {
    id: 'att-entry', name: 'The Bat Roost', x: 22, y: 1,
    bg: { v: 'a', x: 0.8, y: 0.3 },
    decor: [
      bat(22, 11), bat(26, 11, 1.1, true), bat(31, 11), bat(35, 11, 0.8, true), bat(39, 11, 1.0), bat(43, 11, 0.9, true),
      deco('spool', 54, 33, 1.0, { layer: 'mid' }), deco('book-spine', 58, 33, 1.4), deco('marble', 40, 33, 0.6, { layer: 'mid' }),
      deco('spool', 28, 33, 1.3), // [issue 40] was Duo's dice stack (it belongs in the Carrier)
    ],
    fx: [{ kind: 'motes', x: 46, y: 2, w: 16, h: 10 }, { kind: 'dust', x: 2, y: 18, w: 60, h: 14 }],
    grid: g,
    entities: [
      { type: 'loud', x: 18, y: 12, w: 27, h: 2 },
      { type: 'decoy', voice: 'bat-squeaks', x: 30, y: 10, every: [4, 7] },
      sign(46, 13, 6, TEXT.signs.earplugs),
      sign(4, 13, 7, TEXT.signs.drop),
      { type: 'crumbs', x: 60, y: 33, n: 10 },
    ],
  };
}
function attRafters() {
  // 128x36. Right to left: glide (or swing) the nail gap, wall-jump the posts up to the high beam
  // (Velvet hangs there), swing the nails, land on the second beam, glide down to the insulation
  // (left, rows 22-31) or drop through the floor into the trunks (bottom, cols 11-31).
  const g = new G(4, 2).border('#');
  g.open('right', 20, 31);
  g.box(108, 32, 19, 4, '#');                            // the entry joists (floor row 32)
  g.box(98, 35, 10, 1, '^');                             // nails in the gap
  g.box(82, 33, 16, 3, '#');                             // the landing joist (floor row 33)
  g.box(87, 14, 2, 16, '#');                             // post A (walk under it into the shaft)
  g.box(82, 14, 2, 19, '#');                             // post B
  g.box(56, 14, 26, 1, '#');                             // the high beam (Velvet)
  g.box(32, 35, 50, 1, '^');                             // nails along the old floorboards
  g.mark(55, 10, 'H').mark(49, 11, 'H');                 // nails to swing on
  g.box(30, 18, 22, 1, '#');                             // the second beam
  g.box(11, 32, 21, 4, '.');                             // the gap in the boards: down to the trunks
  g.box(0, 32, 11, 4, '#').open('left', 22, 31);         // the ledge by the insulation
  g.mark(120, 31, 'k').mark(92, 32, 'k').mark(72, 13, 'k').mark(36, 17, 'k').mark(4, 31, 'k');
  return {
    id: 'att-rafters', name: 'The Rafters', x: 18, y: 0,
    bg: { v: 'b', x: 0.5, y: 0.3 },
    decor: [
      deco('spool', 116, 31, 1.2, { layer: 'mid' }), deco('pin', 92, 32, 1.0, { layer: 'mid' }),
      deco('book-spine', 33, 17, 1.2, { layer: 'mid' }), deco('marble', 42, 17, 0.6, { layer: 'mid' }),
      deco('hook', 55, 10, 0.9), deco('hook', 49, 11, 0.9),
    ],
    fx: [{ kind: 'motes', x: 14, y: 2, w: 14, h: 30 }, { kind: 'motes', x: 60, y: 2, w: 12, h: 12 }, { kind: 'motes', x: 100, y: 2, w: 14, h: 28 }],
    grid: g,
    entities: [
      { type: 'npc', who: 'velvet', x: 63, y: 13, recruit: 'velvet' },
      { type: 'wasp', x: 72, y: 7 },
      { type: 'light', x: 20, y: 5 },
      { type: 'clothesmoth', x: 24, y: 8 },
      { type: 'crumbs', x: 59, y: 13, n: 5 },
    ],
  };
}
function attTrunks() {
  // 128x18. The beetle sneak: steamer trunks (G) on the floorboards; a darkling beetle plods each
  // stretch between them; hat boxes and trunk straps to hide in, never more than a few tiles apart.
  // Up on a shelf at the left, a beetle walks a stretch with nowhere to hide (the Cloak's cache).
  const g = new G(4, 1).border('#');
  g.open('right', 12, 15).open('left', 12, 15).box(1, 0, 31, 1, '.').box(0, 16, 128, 2, '#');
  for (const [a, b] of [[96, 101], [70, 76], [44, 50], [18, 23]]) g.box(a, 12, b - a + 1, 4, 'G');
  g.box(2, 8, 13, 1, '#');                               // the high shelf (cloak cache)
  g.mark(118, 15, 'k').mark(98, 11, 'k').mark(46, 11, 'k').mark(20, 11, 'k');
  const hides = [[104, 'cushion'], [78, 'sock'], [86, 'cushion'], [94, 'sock'], [52, 'cushion'], [60, 'sock'], [68, 'cushion'], [25, 'sock'], [34, 'cushion'], [42, 'sock'], [8, 'cushion']];
  return {
    id: 'att-trunks', name: 'The Trunks', x: 18, y: 2,
    bg: { v: 'a', x: 0.2, y: 0.8 },
    decor: [deco('drawer-pull', 98, 13, 0.9, { layer: 'mid' }), deco('drawer-pull', 73, 13, 0.9, { layer: 'mid' }), deco('drawer-pull', 47, 13, 0.9, { layer: 'mid' }), deco('drawer-pull', 20, 13, 0.9, { layer: 'mid' }),
      deco('spool', 12, 7, 1.0, { layer: 'mid' })],
    fx: [{ kind: 'dust', x: 2, y: 2, w: 120, h: 12 }],
    grid: g,
    entities: [
      ...hides.map(([x, art]) => hide(x, 15, art)),
      { type: 'beetle', x: 86, y: 15, range: [77, 95] },
      { type: 'beetle', x: 60, y: 15, range: [51, 69] },
      { type: 'beetle', x: 34, y: 15, range: [24, 43] },
      { type: 'antsoldier', x: 73, y: 11, range: [70, 76] },
      { type: 'beetle', x: 10, y: 7, range: [2, 14] },
      { type: 'secret', id: 'att-cloak', x: 3, y: 7 },
      sign(108, 15, 6, TEXT.signs.sneak),
    ],
  };
}
function attInsulation() {
  // 128x36. Two ways in on the right (the rafters, top; the trunks, bottom). Wall-jump the joist
  // posts, swing the nails, glide to the joist, flutter over the chimney-brick wall, then the attic
  // fan's low passage (loud: Earplugs) on the left, to the boxes.
  const g = new G(4, 2).border('#');
  g.open('right', 4, 13).open('right', 30, 33).open('left', 30, 33);
  g.box(89, 14, 38, 2, '#');                             // the upper joist from the rafters (floor row 14)
  g.box(84, 34, 43, 2, '#');                             // the lower floor from the trunks
  g.box(87, 14, 2, 18, '#');                             // post 2 (walk under it into the shaft)
  g.box(82, 14, 2, 22, '#').box(79, 14, 3, 1, '#');      // post 1 (a cap on top)
  g.mark(76, 10, 'H').mark(70, 11, 'H');
  g.box(46, 20, 27, 1, '#');                             // the joist the swing and glide reach
  g.box(45, 35, 37, 1, '^');                             // insulation staples
  g.box(42, 16, 3, 20, 'G');                             // the chimney-brick wall: flutter over it
  g.box(0, 34, 42, 2, '#');                              // the floor by the fan
  g.box(1, 2, 14, 28, '#');                              // the gable wall; the fan's low passage under it
  g.box(22, 27, 9, 1, '=');                              // a high joist over the fluff
  g.mark(110, 33, 'k').mark(100, 13, 'k').mark(55, 19, 'k').mark(25, 33, 'k');
  return {
    id: 'att-insulation', name: 'The Attic Fan', x: 14, y: 1,
    bg: { v: 'b', x: 0.2, y: 0.6 },
    decor: [
      deco('dryer-vent', 8, 29, 3.2, { layer: 'mid' }),
      deco('cushion', 28, 33, 1.0, { layer: 'mid', alpha: 0.9 }),
      deco('spool', 120, 13, 1.0, { layer: 'mid' }), deco('marble', 52, 19, 0.6, { layer: 'mid' }),
      deco('hook', 76, 10, 0.9), deco('hook', 70, 11, 0.9),
    ],
    fx: [{ kind: 'dust', x: 1, y: 30, w: 14, h: 4 }, { kind: 'motes', x: 50, y: 2, w: 20, h: 16 }],
    grid: g,
    entities: [
      { type: 'loud', x: 1, y: 30, w: 14, h: 4 },
      { type: 'spring', x: 27, y: 33, w: 2, power: 7 },
      { type: 'crumbs', x: 26, y: 26, n: 10 },
      { type: 'antsoldier', x: 110, y: 33, range: [92, 124] },
      { type: 'antsoldier', x: 34, y: 33, range: [17, 40] },
      { type: 'light', x: 60, y: 3 },
      { type: 'clothesmoth', x: 58, y: 7 },
      sign(16, 33, 6, TEXT.signs.earplugs),
    ],
  };
}
function attBoxes() {
  // 128x36. The box mountain: super-jump the 7-tall glass-smooth box (Rubber Band), swing the
  // tinsel hooks over the broken ornaments, glide to the next stack, climb the steps to the top
  // box: save crack 2 and Nana's door (left, rows 12-15). Under the top box, the way to the hatch.
  const g = new G(4, 2).border('#');
  g.open('right', 30, 33).open('left', 30, 33);
  g.box(106, 34, 21, 2, '#');                            // the floor by the door in
  g.box(100, 27, 6, 9, 'G');                             // box 1: 7 tall, smooth (super-jump)
  g.box(85, 35, 15, 1, '^');                             // broken ornaments
  g.mark(99, 23, 'H').mark(94, 25, 'H');                 // tinsel hooks
  g.box(74, 28, 16, 8, '#');                             // box 2 (the tinsel swing, or a glide)
  g.box(57, 35, 17, 1, '^');                             // more broken ornaments
  g.box(50, 30, 7, 6, '#');                              // box 3 (a glide away)
  for (let i = 0; i < 6; i++) g.box(46 - 4 * i, 28 - 2 * i, 4, 8 + 2 * i, '#');  // the steps (28 up to 18)
  g.box(35, 23, 2, 2, '.').box(35, 22, 2, 1, '%');       // a crack in a box (Mote): crumbs inside
  g.box(1, 16, 25, 2, '#').box(9, 16, 2, 2, '.');        // the top box, a hole in its lid
  g.open('left', 12, 15);                                // Nana's door (a gate until her lines are heard)
  g.box(0, 34, 26, 2, '#');
  for (let y = 32, i = 0; y >= 18; y -= 2, i++) g.box(i % 2 ? 9 : 6, y, 4, 1, '=');
  g.mark(16, 15, 'S').mark(115, 33, 'k').mark(102, 26, 'k').mark(80, 27, 'k').mark(53, 29, 'k').mark(20, 33, 'k');
  return {
    id: 'att-boxes', name: 'The Box Mountain', x: 10, y: 1,
    bg: { v: 'a', x: 0.3, y: 0.4 },
    decor: [
      // [issue 40] the marbles were over the tacks and on the box's face, the spool in mid-air: all on the box top now
      deco('marble', 88, 27, 0.7, { layer: 'mid' }), deco('marble', 84, 27, 0.6, { layer: 'mid' }), deco('marble', 86, 27, 0.8, { layer: 'mid' }),
      deco('spool', 76, 27, 1.2, { layer: 'mid' }), deco('pin', 99, 22, 1.1), deco('pin', 93, 23, 1.1),
      deco('marble', 40, 23, 0.6, { layer: 'mid' }), // [issue 40] was a die in mid-air deco('book-spine', 28, 17, 1.3, { layer: 'mid' }),
      deco('music-stone-bell', 22, 15, 1.2, { layer: 'mid', alpha: 0.8 }),
      deco('book-spine', 112, 33, 1.4), // [issue 40] was Duo's dice stack
    ],
    fx: [{ kind: 'motes', x: 30, y: 2, w: 40, h: 14 }],
    grid: g,
    entities: [
      { type: 'gate', id: 'nana-door', x: 0, y: 12, w: 1, h: 4, opens: { flag: 'pre:nana' }, tile: '#', msg: 'Nana is waiting behind this door. Knock at the Ready card first.' },
      { type: 'lair', boss: 'nana', x: 2, y: 15, w: 2, h: 3, to: 'att-lair', at: [88, 33] },
      { type: 'secret', id: 'att-mote', x: 35, y: 24 },
      { type: 'duet', id: 'att-duet', x: 22, y: 15, hear: 6, window: 2, then: [['secret', { id: 'att-duet' }]] }, // [fixer] Chip's Duet (post-game)
      sign(19, 15, 3, 'A music box with two keyholes. Two house crickets singing as one might open it.'),
      sign(108, 33, 6, TEXT.signs.band),
      { type: 'crumbs', x: 3, y: 33, n: 10 },
    ],
  };
}
function attHatch() {
  // 64x18. Old toys round the attic hatch: the latch (C, cols 36-41) in the floor breaks with a
  // ground-pound and drops you into the Hall: the shortcut home. From below it can't be opened.
  const g = new G(2, 1).border('#');
  g.open('right', 12, 15);
  g.box(0, 16, 64, 2, '#').box(36, 16, 6, 2, 'C');
  g.mark(50, 15, 'k');
  return {
    id: 'att-hatch', name: 'The Hatch', x: 8, y: 2,
    bg: { v: 'b', x: 0.7, y: 0.8 }, terrainKinds: { C: 'plaster' },
    decor: [deco('cork', 38, 15, 0.8, { layer: 'mid' }), deco('bottle-cap', 20, 15, 0.6, { layer: 'mid' }), // [issue 40] a cork (was a pull chain standing on the floor), a bottle cap (was a die)
      deco('marble', 26, 15, 0.7, { layer: 'mid' }),
      deco('spool', 12, 15, 1.3, { layer: 'mid' }), deco('book-spine', 6, 15, 1.6), // [issue 40] was Duo's dice stack
      deco('tv-remote', 54, 15, 1.0, { layer: 'mid' })],
    grid: g,
    entities: [sign(32, 15, 12, TEXT.signs.hatch), { type: 'crumbs', x: 16, y: 15, n: 5 }],
  };
}
function attLair() {
  // 96x36. Nana on the chimney breast (left, G); rafters climb left to right with the three music
  // stones (fork low-left, glass middle, bell high-right); rafter gaps to hide in along the floor.
  const g = new G(3, 2).border('#');
  g.open('right', 30, 33);
  g.box(0, 0, 12, 36, 'G').box(0, 34, 96, 2, '#');
  g.box(14, 32, 14, 1, '=').box(26, 30, 11, 1, '=').box(35, 28, 12, 1, '=').box(40, 26, 15, 1, '=').box(53, 24, 12, 1, '=').box(63, 22, 16, 1, '=');
  g.box(80, 26, 8, 1, '=');                              // a rafter by the door
  return {
    id: 'att-lair', name: 'Nana\'s Nest', x: 7, y: 0,
    bg: { v: 'a', x: 0.5, y: 0.2 }, near: false,
    decor: [deco('spool', 90, 33, 1.2, { layer: 'mid' }), deco('book-spine', 84, 25, 1.2, { layer: 'mid' })],
    fx: [{ kind: 'motes', x: 30, y: 2, w: 50, h: 18 }],
    grid: g,
    entities: [
      { type: 'boss', boss: 'nana', x: 13, y: 33, cricket: 'chip', checkpoints: [[88, 33], [88, 33], [60, 33]] },
      ...[14, 28, 42, 56, 70, 84].map((x) => hide(x, 33, 'none')),
    ],
  };
}

// =================================================================================================
// write
// =================================================================================================
const Z = (n) => ZONE_INFO[n];
const hall = { id: 'hall', n: 'hall', name: Z('hall').name, palette: Z('hall').palette, bg: Z('hall').bg, music: Z('hall').music,
  start: { room: 'hall-floor' }, beacon: { room: 'hall-floor', x: 62, y: 33 }, rooms: [hallTop(), hallFloor()] };
const stairwell = { id: 'stairwell', n: 'stairwell', name: Z('stairwell').name, palette: Z('stairwell').palette, bg: Z('stairwell').bg, music: Z('stairwell').music,
  start: { room: 'stair-foot' }, beacon: { room: 'stair-foot', x: 30, y: 33 }, rooms: [stairLanding(), stairFlight(), stairFoot()] };

const chimney = { id: 'chimney', n: 'chimney', name: Z('chimney').name, palette: Z('chimney').palette, bg: Z('chimney').bg, music: Z('chimney').music,
  start: { room: 'chim-flue' }, beacon: { room: 'chim-top', x: 2, y: 31 }, rooms: [chimFlue(), chimTop(), chimAsh()] };

const linksOut = `// Builder D: the linking spaces (the Hall, the stairwell, the chimney shaft), three zone modules.
// Generated by tools/make-zone-d.mjs: edit that script and re-run it.
${zoneJS('hall', hall)}
${zoneJS('stairwell', stairwell)}
${zoneJS('chimney', chimney)}`;
writeFileSync(path.join(ROOT, 'game/data/rooms/links.js'), linksOut);
console.log('wrote game/data/rooms/links.js');

const zi = Z(10);
const attic = { id: zi.id, n: 10, name: zi.name, palette: zi.palette, bg: 'z10-attic', music: zi.music, motes: true,
  start: { room: 'att-entry' }, lair: { room: 'att-lair', x: 15, y: 9 }, beacon: { room: 'att-lair', x: 15, y: 9 },
  decoys: [{ voice: 'bat-squeaks', room: 'att-rafters', x: 63, y: 11, every: 6 }],
  rooms: [attEntry(), attRafters(), attTrunks(), attInsulation(), attBoxes(), attHatch(), attLair()] };
writeFileSync(path.join(ROOT, 'game/data/rooms/zone-10.js'), `// Builder D: zone 10, the Attic. Generated by tools/make-zone-d.mjs: edit that script and re-run it.\n${zoneJS('attic', attic)}export default attic;\n`);
console.log('wrote game/data/rooms/zone-10.js');
