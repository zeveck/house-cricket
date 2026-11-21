// [issue 9] Tutorial notes on the path: where a tip's note (since #34 a hovering "?" marker) stands, and whether it still stands.
// Pure (no DOM): the game (buildEntities, the tank's script notes), the renderer, the HUD card
// (ui.js) and tools/sign-check.mjs share it.
//   A sign entity: { type: 'sign', x, y, w, text, nx?, kind?: 'note' | 'card', at?: 'low' }
//   x..x+w-1 is its trigger span (tile columns), y its row. The note stands at column nx (else the
//   span's centre column) on the first standable tile at the sign's row or one below (never water
//   or a hazard; a one-way platform counts; a solid tile at the row holds it on top). It steps up to
//   2 columns sideways (within the span) to keep clear of a save crack, checkpoint, hide spot, door,
//   lair door, item or cage. The ground is read from the live grid: if it breaks or opens later, the
//   note retires (noteLive()).
import { TILE } from '../data/movement.js';
import { K } from './physics.js';

const T = TILE;
export const STANDABLE = new Set([K.SOLID, K.SLICK, K.CEREAL, K.CRACK, K.SOIL, K.PROP, K.ONEWAY]);
export const BLOCK_KINDS = new Set([K.SOLID, K.SLICK, K.CEREAL, K.CRACK, K.SOIL, K.PROP]); const BLOCKS = BLOCK_KINDS; // the note's own cell must not be one
const STEPS = [0, 1, -1, 2, -2];

// The timing of the card (sim frames, 60 a second) and the ranges (tiles): design, HUD, Tutorial notes.
export const NOTE = Object.freeze({
  appear: 2, stay: 3,      // tiles from the note: it shows inside `appear`, stays until he's `stay` past (hysteresis)
  dwell: 9,                // 0.15 s in range before it shows (at once if he's standing still)
  minShow: 150,            // shown at least 2.5 s
  linger: 24,              // out of range this long (0.4 s), then it fades
  fadeIn: 9,               // 150 ms (CSS): "fully shown" starts after it
  read: 90,                // fully shown 1.5 s: read
  restand: 30,             // [issue 29] standing still under a shown note's marker this long (0.5 s) shows it again
  under: 1,                // [issue 29] ... "under" it: within a tile of its column (same floor)
});

// [issue 29] Showing a note again. Once its card has shown, a note shows again (read or not) when the cricket
// comes back after leaving it (out of its `stay` range since the card was up), or when he stands still under
// its marker for NOTE.restand; never while it's up, and (ui.js) a read note never in the air or stunned.
// arm: {up: keys shown and not left since, still: {key, f0} | null}; pure, so tools can drive it.
export const newArm = () => ({ up: new Set(), still: null });
// every frame: the shown note stays "up"; a note he has left (out of its stay range) is armed again
export function armStep(arm, signs, stay, shownKey = null) {
  if (shownKey != null) { arm.up.add(shownKey); if (arm.still?.key === shownKey) arm.still = null; }
  for (const k of [...arm.up]) { if (k === shownKey) continue; const s = signs.find((q) => q.key === k); if (!s || !stay(s)) arm.up.delete(k); }
}
// may note sg's card show now (he's in its appear range)? under: within NOTE.under of its marker, still: grounded and not moving
export function armAllows(arm, sg, f, under, still) {
  if (!arm.up.has(sg.key)) return true;
  if (!(under && still)) { if (arm.still?.key === sg.key) arm.still = null; return false; }
  if (arm.still?.key !== sg.key) arm.still = { key: sg.key, f0: f };
  return f - arm.still.f0 >= NOTE.restand;
}

// Floor props a note keeps clear of: [{x0, x1, y0, y1}] in tiles (the rows they stand in).
export function floorProps(entities) {
  const out = [];
  for (const e of entities || []) {
    const w = e.w || 1;
    switch (e.type) {
      case 'save': case 'item': case 'cage': out.push({ type: e.type, x0: e.x, x1: e.x, y0: e.y, y1: e.y }); break;
      case 'checkpoint': case 'door': case 'lair': out.push({ type: e.type, x0: e.x, x1: e.x + (e.type === 'checkpoint' ? 0 : w - 1), y0: e.y - 1, y1: e.y }); break;
      case 'hide': case 'hideSmall': out.push({ type: e.type, x0: e.x, x1: e.x + w - 1, y0: e.y, y1: e.y }); break;
      default:
    }
  }
  return out;
}

// The ground under column tx for a sign on row y: {gy} or {err}. at(x, y) -> tile kind.
export function groundAt(at, tx, y) {
  for (let dy = 0; dy <= 1; dy++) {
    const k = at(tx, y + dy);
    if (k === K.WATER) return { err: 'water' };
    if (k === K.HAZARD) return { err: 'hazard' };
    if (STANDABLE.has(k)) {
      if (BLOCKS.has(at(tx, y + dy - 1))) return { err: 'buried' };
      return { gy: y + dy };
    }
  }
  return { err: 'floats' };
}

const crowds = (props, tx, gy) => props.find((p) => tx >= p.x0 && tx <= p.x1 && p.y1 >= gy - 2 && p.y0 <= gy);

// Where the note of sign entity e stands: {tx, gy, x, y (px: the column's middle, the ground's top), step}
// or {err, tx}. at(x, y) -> tile kind; props: floorProps(...); obstacles: markerObstacles(...) ([issue 34]
// the note also steps aside so its hovering marker isn't drawn on a prop; if no step clears it, it stays,
// flagged markCrowd, and sign-check fails).
export function anchorNote(e, at, props = [], obstacles = []) {
  const w = e.w || 4, x0 = e.x, x1 = e.x + w - 1;
  const base = e.nx ?? Math.floor(e.x + w / 2);
  let first = null;
  for (const d of STEPS) {
    const tx = base + d;
    if (tx < x0 || tx > x1) continue;
    const g = groundAt(at, tx, e.y);
    if (g.err) { if (d === 0) first = { err: g.err, tx }; continue; }
    if (crowds(props, tx, g.gy)) { if (d === 0) first = { err: 'crowded', tx }; continue; }
    if (d !== 0 && first?.err !== 'crowded' && first?.err !== 'markCrowd') break; // only a prop moves the note; bad ground is a data fix
    const spot = { tx, gy: g.gy, x: (tx + 0.5) * T, y: g.gy * T, step: d };
    const hit = markerHits(obstacles, { tx, gy: g.gy, nx: spot.x, ny: spot.y }, at);
    if (hit) { if (d === 0) first = { err: 'markCrowd', tx, spot: { ...spot, markCrowd: hit } }; continue; }
    return spot;
  }
  if (first?.err === 'markCrowd') return first.spot;
  return first || { err: 'floats', tx: base };
}

// A game sign (game.signs) from a sign entity. key: the read-set key (room:x,y; a script tip's text id).
// grid: the live grid; pristine: the room's unbroken grid (a note anchors where its ground was).
export function makeSign(e, key, grid, pristine, props, obstacles) {
  const kind = e.kind === 'card' ? 'card' : 'note';
  const s = { x: e.x * T, y: e.y * T, w: (e.w || 4) * T, text: e.text, key, kind, at: e.at || null };
  if (kind === 'note') {
    const at = (x, y) => { const v = grid.at(x, y); return v === K.EMPTY && pristine ? pristine.at(x, y) : v; };
    const a = anchorNote(e, at, props, obstacles);
    if (!a.err) { Object.assign(s, { tx: a.tx, gy: a.gy, nx: a.x, ny: a.y }); Object.assign(s, markerSpot(s, at)); if (a.markCrowd) s.markCrowd = a.markCrowd; }
    else s.bad = a.err;
  }
  return s;
}

// Does the note still stand (its ground not broken or opened)?
export const noteLive = (game, s) => s.kind === 'note' && s.gy != null && STANDABLE.has(game.grid.at(s.tx, s.gy));

// [issue 34] The note's marker: a round "?" badge hovering at about head height over the note's spot
// (was #9's propped paper). Its centre is `dy` px above the ground. With a thin plank (one-way) a
// tile up, it hangs a little lower and smaller, under the plank; under a full block a tile up (a lid,
// a low shelf) it tucks under it, small. r: its radius (rT on touch screens), bob: how far it bobs,
// tail: the speech-bubble tail pointing down at the spot.
export const MARKER = Object.freeze({
  hover: { dy: 60, r: 15, rT: 17, bob: 2.5, tail: 6 },
  under: { dy: 47, r: 13, rT: 13, bob: 1.5, tail: 4 },
  low: { dy: 21, r: 11, rT: 11, bob: 1, tail: 3 },
});
export function markerSpot(s, at) {
  const k = at(s.tx, s.gy - 2), mode = BLOCKS.has(k) ? 'low' : k === K.ONEWAY ? 'under' : 'hover';
  return { mx: s.nx, my: s.ny - MARKER[mode].dy, mark: mode };
}
// [issue 34] What a marker must not be drawn on, as px boxes: the point props (a hook, crumb, item, switch,
// thermostat, save crack, beacon, light, talker, spring, music box, cage, secret: their tile; a crumb only its lower
// part, the thermostat's dial and a talker a tile higher too) and the room's decor props (about h tiles
// tall and 0.8 h wide, standing on their tile; the big backdrops over 4 tiles tall don't count).
const MARK_PROPS = new Set(['hook', 'crumbs', 'item', 'switch', 'thermostat', 'save', 'beacon', 'light', 'npc', 'spring', 'piano', 'duet', 'cage', 'secret']);
export function markerObstacles(entities, decor) {
  const out = [];
  for (const q of entities || []) if (MARK_PROPS.has(q.type)) {
    const up = q.type === 'thermostat' || q.type === 'npc' ? 1 : q.type === 'crumbs' ? -0.4 : 0; // a crumb lies low on the floor
    out.push({ what: q.type, x0: q.x * T, x1: (q.x + 1) * T, y0: (q.y - up) * T, y1: (q.y + 1) * T });
  }
  for (const d of decor || []) {
    if (!d.prop || d.gecko) continue;
    const h = (d.h || 1.5) * T, w = h * 0.8, cx = (d.x + 0.5) * T, by = (d.y + 1) * T;
    if (h > 4 * T) continue;
    out.push({ what: `decor ${d.prop}`, x0: cx - w / 2, x1: cx + w / 2, y0: by - h, y1: by });
  }
  return out;
}
// The obstacle a marker over note spot s would be drawn on or crowd (its disc at touch size and its tail,
// through its bob, within 4 px), or null.
export function markerHits(obstacles, s, at) {
  if (!obstacles?.length) return null;
  const { mx, my, mark } = markerSpot(s, at), m = MARKER[mark], r = m.rT, b = m.bob;
  const M = 4, o = obstacles.find((q) => q.x0 - M < mx + r && q.x1 + M > mx - r && q.y0 - M < my + r + m.tail + b && q.y1 + M > my - r - b); // 4 px apart, the tail included
  return o ? o.what : null;
}
export const markerSize = (s, touch) => { const m = MARKER[s.mark] || MARKER.hover; return { r: touch ? m.rT : m.r, bob: m.bob, tail: m.tail }; };

// A stable phase per note (so markers in a room don't bob in step).
export const notePhase = (s) => { let h = (s.tx * 73856093) ^ (s.gy * 19349663); h = (h ^ (h >>> 13)) >>> 0; return (h % 1000) / 1000 * Math.PI * 2; };

// [issue 40] A checkpoint's flag never floats: what holds it up, from the tiles around it (at(tx, ty): the live
// grid). The checkpoint (tx, ty) stays where it is (its trigger and the respawn are the game's); only the flag's
// pole changes. Returns { kind, ... } in tiles:
//   'floor': the floor under it (the usual short pole);  'pole': a floor up to 4 rows lower (a long pole, foot at row y);
//   'wall':  a wall up to 6 columns away at its row or the one above (a pole out of the wall face at x, from row `row`);
//   'ceiling': a ceiling or a plank up to 4 rows above (the pennant on a string from y);  null: nothing (sign-check fails it).
export function flagMount(at, tx, ty) {
  const holds = (x, y) => STANDABLE.has(at(x, y));
  if (STANDABLE.has(at(tx, ty + 1))) return { kind: 'floor', y: ty + 1 };
  for (let d = 2; d <= 5; d++) {
    if (BLOCKS.has(at(tx, ty + d - 1))) break;
    if (holds(tx, ty + d)) return { kind: 'pole', y: ty + d };
  }
  for (let d = 1; d <= 6; d++) for (const s of [-1, 1]) {
    const x = tx + s * d;
    if (BLOCKS.has(at(x, ty)) || BLOCKS.has(at(x, ty - 1))) return { kind: 'wall', x: s < 0 ? x + 1 : x, side: s, row: BLOCKS.has(at(x, ty)) ? ty : ty - 1 };
  }
  for (let d = 1; d <= 4; d++) { // a block's underside, or a plank (drawn along its tile's top, about 0.3 tile thick)
    const k = at(tx, ty - d);
    if (BLOCKS.has(k)) return { kind: 'ceiling', y: ty - d + 1 };
    if (k === K.ONEWAY) return { kind: 'ceiling', y: ty - d + 0.3 };
  }
  return null;
}
