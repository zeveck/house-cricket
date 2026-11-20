// Canvas renderer (design: "Art direction", "Juice"). Render-only: never mutates the sim.
//   - far painting per room (a/b variant, mirror, offset; slow parallax), chimney tiling
//   - near layer: zone props as blurred dark silhouettes with parallax
//   - watercolor platform painter, cached per screen at min(DPR, 2): zone texture fill, wobbly
//     wet edges in darker ink, paper grain; terrain kinds with edges by kind
//   - code water, entities, props/decor, hiding spots, enemies, NPCs, the cricket, fx, darkness
// Every sprite is asked for through sprites.js and falls back to shapes while missing.
// Room data the renderer reads (render-only fields; the sim ignores them) is documented in
// design/ENGINE_NOTES.md, "Rendering".
import { TILE, SCREEN_W, SCREEN_H } from '../data/movement.js';
import { ITEMS } from '../data/items.js';
import { K } from './physics.js';
import { seeded } from './world.js';
import * as S from './sprites.js';
import { FX } from './fx.js';
import { drawCricket, drawCricketShape } from './cricket-art.js';
import * as Geckos from './geckos.js'; // [builder B] dozing-gecko decor
import { paintObject, OBJ_EDGE } from './objpaint.js'; // [polish] object painters
import { LOOK } from '../data/look/index.js';
import { noteLive, notePhase, markerSize, MARKER } from './notes.js'; // [issue 9] tutorial notes on the path
import { beaconSpec } from './beacon.js'; // [issue 28] the hole the call comes through pulses
import { rescueCount, shellStage } from './meta.js'; // [final-G] the Carrier's outside grows with its stages      // [polish] render-only per-room look overlay

const VW = 1280, VH = 720;
const TAU0 = Math.PI * 2; // [final-G]
const PAPER = '#F4EBDD', INK = '#5A4632';
const TEX_SCALE = 0.75;   // zone texture px -> world px

// item id -> its picture in assets/items/
export const ITEM_ART = {
  booties: 'tape-booties', floss: 'floss-line', raft: 'bottle-cap-raft', band: 'rubber-band', glider: 'dryer-sheet',
  thimble: 'thimble-helmet', glow: 'glow-bead', earplugs: 'cotton-earplugs', feather: 'swift-feather', cloak: 'cellophane-cloak',
};
export const itemArt = (id) => `items/${ITEM_ART[id] || id}.webp`;

// Near-layer props per bg folder (zone modules may set `near: ['spool', ...]` instead).
export const NEAR = {
  'z00-tank': ['hide-log', 'water-dish', 'pebble'], 'z01-bedroom': ['sock', 'throw-pillow', 'book-spine'],
  'z02-bathroom': ['sponge', 'soap-dish', 'faucet-handle'], 'z03-kitchen': ['wooden-spoon', 'tongs', 'grape'],
  'z04-pantry': ['spice-rack', 'cork', 'dice'], 'z05-laundry': ['sock', 'spool', 'dryer-vent'],
  'z06-living': ['cushion', 'fake-plant', 'tv-remote'], 'z07-study': ['book-spine', 'pin', 'dice'],
  'z08-sunroom': ['fake-plant', 'pebble', 'leaf-glider'], 'z09-basement': ['furnace-grate', 'pull-chain', 'marble'],
  'z10-attic': ['spool', 'book-spine', 'marble'], chimney: [],
};

// ---- colour helpers ----
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const colCache = new Map();
export function zoneColors(zone) {
  const key = (zone?.palette || []).join() || 'default';
  if (colCache.has(key)) return colCache.get(key);
  const pal = (zone?.palette || ['#3B4A7A', '#F2C46D', '#C8564B', '#7C98C4']).map(hex).sort((a, b) => lum(a) - lum(b));
  const paper = hex(PAPER), ink = hex(INK);
  const blue = (zone?.palette || []).map(hex).sort((a, b) => (b[2] - (b[0] + b[1]) / 2) - (a[2] - (a[0] + a[1]) / 2))[0] || hex('#4F7F86');
  const col = {
    pal, paper, ink,
    dark: mix(pal[0], [20, 16, 14], 0.4),          // platforms: the darkest values
    dark2: mix(pal[1], [20, 16, 14], 0.5),
    edge: mix(pal[0], [12, 9, 8], 0.68),
    skyTop: mix(pal[3], paper, 0.55), skyBot: mix(pal[2], paper, 0.45),
    blot: pal.map((c) => mix(c, paper, 0.35)),
    water: mix(mix(blue, hex('#4F7F86'), 0.4), pal[0], 0.25),
  };
  colCache.set(key, col);
  return col;
}
export const bgFolder = (zone) => zone?.bg || zone?.id || 'none';
// a room's far painting: { v: 'a' | 'b', mirror, x, y } (see drawBackground)
export function bgFor(room) {
  const d = roomLook(room).bg;
  const h = hash(room.id);
  const o = { v: h & 1 ? 'b' : 'a', mirror: !!(h & 2), x: ((h >>> 3) % 100) / 100, y: ((h >>> 10) % 100) / 100 };
  if (typeof d === 'string') o.v = d;
  else if (d && typeof d === 'object') Object.assign(o, d);
  return o;
}
// [art] The drawing rules room-art.js lists a room's files by (kept here, next to the drawing):
// terrain swatches a room paints with (screenCanvas repaints as they arrive)
export function terrainKinds(room) {
  const d = roomLook(room), out = new Set(['cereal', 'soil']);
  for (const v of Object.values(d.terrainKinds || {})) out.add(v);
  for (const p of d.paint || []) if (p.kind) out.add(p.kind);
  return [...out];
}
export const terrainPath = (kind) => `textures/terrain-${kind}.webp`;
// near-layer silhouettes (drawNear). Room data: near: [{ prop, x: tiles, scale: 3..5, flip }] or
// near: false; default: two props per screen from the zone's `near` list (or NEAR).
export function nearList(room) {
  const d = roomLook(room);
  if (d.near === false || room.dark) return [];
  if (d.near) return d.near;
  const props = room.zone?.near || NEAR[bgFolder(room.zone)] || [];
  if (!props.length) return [];
  const rnd = seeded(room.id + ':near'), list = [];
  for (let i = 0; i < room.sw * 2; i++) list.push({ prop: props[Math.floor(rnd() * props.length)], x: (i + 0.2 + rnd() * 0.6) * (room.tw / (room.sw * 2)), scale: 3 + rnd() * 2, flip: rnd() < 0.5 });
  return list;
}
// a prop name ('spool') or any assets path ('carrier/lamp.webp') -> its file
export const propPath = (prop) => (prop.includes('/') ? prop : `props/${prop}.webp`);
// a hiding spot's art: entity art ('sock', a path, or 'none'); default the hide log, small spots none
export const hideArtOf = (e, small = e?.type === 'hideSmall' || !!e?.small) => e?.art || (small ? null : 'hide-log');
// an enemy's frames (drawEnemies): 0 and 1 walk, 2 flipped
export const enemyFrames = (sprite) => [0, 1, 2].map((f) => `${sprite}/${f}.webp`);

// [polish] a room's render-only fields with data/look overlay merged in (memoised per room def).
// Overlay paint regions come first (the first region that holds a tile wins); decor is appended.
const lookMemo = new WeakMap();
export function roomLook(room) {
  const d = room.def;
  if (lookMemo.has(d)) return lookMemo.get(d);
  const L = LOOK[room.id] || {};
  const out = { ...d, ...L, paint: [...(L.paint || []), ...(d.paint || [])], decor: [...(d.decor || []), ...(L.decor || [])], terrainKinds: { ...(d.terrainKinds || {}), ...(L.terrainKinds || {}) } };
  if (!('bg' in L)) out.bg = d.bg;
  lookMemo.set(d, out);
  return out;
}

// smooth value noise for edges (world coords -> 0..1)
function wob(x, y, lumpy) {
  const a = Math.sin(x * 0.083 + y * 0.051 + 1.3) * 0.5 + Math.sin(x * 0.021 - y * 0.067 + 4.1) * 0.35 + Math.sin((x + y) * 0.17) * 0.15;
  if (lumpy) return 0.5 + 0.5 * Math.abs(Math.sin(x * 0.16 + y * 0.13)) + 0.15 * a;
  return 0.5 + 0.5 * a;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cache = new Map(); this.cacheKey = '';
    this.fx = new FX();
    this.debug = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
    this.t = 0;
    this.zoneKey = null;
    this.nearCache = new Map();
    this.pa = { state: null, since: 0, chirpF: -999, look: 'idle' }; // player anim tracking
    this.perf = { paint: 0, frame: 0 };
    this.grain = makeGrain();
    if (typeof window !== 'undefined') window.__renderer = this; // read-only: perf {paint, frame} ms, fx
  }
  get flash() { return this.fx.flashN; }
  set flash(v) { this.fx.flash(v); }
  get particles() { return this.fx.p; }

  resize(cssW, cssH, dpr) {
    this.dpr = dpr;
    this.canvas.width = Math.round(cssW * dpr); this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = cssW + 'px'; this.canvas.style.height = cssH + 'px';
    this.scale = this.canvas.width / VW;
    this.cacheScale = Math.max(0.5, Math.min(2, (cssW / VW) * Math.min(dpr, 2)));
    this.cache.clear(); this.cacheKey = ''; this.bgBake = null;
    const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    const phone = (coarse && Math.min(cssW, cssH) < 500) || cssW * Math.min(dpr, 2) < 1600;
    if (phone !== S.isPhone()) { S.setPhone(phone); this.zoneKey = null; }
    this.fx.touch = coarse;
  }

  // ---- per-zone caches. [art] Loading, holding and releasing the art is src/room-art.js's job
  // (main.js runs it on every room change): each room's art, its neighbours' in the background.
  syncZone(game) {
    const folder = bgFolder(game.zone);
    if (folder === this.zoneKey) return;
    this.zoneKey = folder;
    this.nearCache.clear();
  }

  // [issue 16] a held transition: the frame before the room change (snapshot(), taken before the
  // held room is drawn), dimming under the transition's ink (alpha < 1: it never reads as a flat
  // cover). Without a snapshot: the ink.
  snapshot() {
    const cv = this.canvas;
    if (!this.snap) this.snap = document.createElement('canvas');
    if (this.snap.width !== cv.width || this.snap.height !== cv.height) { this.snap.width = cv.width; this.snap.height = cv.height; }
    const g = this.snap.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(cv, 0, 0);
    this.snapOk = true;
  }
  dropSnapshot() { this.snapOk = false; }
  drawHeld(alpha, ink) {
    if (!this.snapOk) { this.drawCover(1, '', ink); return; }
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(this.snap, 0, 0);
    this.drawCover(alpha, '', ink);
  }
  // [art] the cover while a room's art loads (src/room-art.js): ink, then "Loading" if it lasts.
  // ink 'wipe': a door / edge wipe held on its first frame (drawTransition's ink, opaque)
  drawCover(alpha, label, ink) {
    if (alpha <= 0) return;
    const c = this.ctx;
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    c.fillStyle = `rgba(${ink === 'wipe' ? '42,32,26' : '20,16,14'},${Math.min(1, alpha)})`; c.fillRect(0, 0, VW, VH * 2); // [final-G] a wide phone's view is taller than VH
    if (!label) return;
    c.save(); c.globalAlpha = Math.min(1, alpha);
    c.fillStyle = 'rgba(244,235,221,0.8)'; c.font = '28px "Patrick Hand", sans-serif'; c.textAlign = 'center';
    c.fillText(label, VW / 2, VH / 2);
    c.restore();
  }

  // ---- platform painter (cached per screen) ----
  screenCanvas(game, sx, sy) {
    const room = game.room, folder = bgFolder(game.zone);
    const tex = S.get(`textures/${folder}.webp`);
    const kinds = this.terrainReady(game);
    const key = `${room.id}:${game.gridVersion}:${this.cacheScale}:${tex ? 1 : 0}:${kinds}`;
    if (key !== this.cacheKey) { this.cache.clear(); this.cacheKey = key; }
    const ck = `${sx},${sy}`;
    let c = this.cache.get(ck);
    if (c) return c;
    const t0 = performance.now();
    c = document.createElement('canvas');
    const s = this.cacheScale;
    c.width = Math.ceil(VW * s); c.height = Math.ceil(VH * s);
    const g = c.getContext('2d');
    g.scale(s, s);
    this.paintScreen(g, game, sx, sy, tex);
    this.cache.set(ck, c);
    this.perf.paint = performance.now() - t0;
    return c;
  }
  terrainReady(game) {
    // repaint once terrain swatches arrive
    let n = 0;
    for (const k of terrainKinds(game.room)) if (S.get(terrainPath(k))) n++;
    return n;
  }

  // which paint class a tile belongs to (null = not solid)
  classifier(game) {
    const grid = game.grid, d = roomLook(game.room);
    const tk = { C: 'cereal', s: 'soil', ...(d.terrainKinds || {}) };
    const regions = this.regions(game);
    return (tx, ty) => {
      const k = grid.at(tx, ty);
      let cls = null;
      if (k === K.SOLID || k === K.CRACK) cls = 'zone';
      else if (k === K.SLICK) cls = 'slick';
      else if (k === K.CEREAL) cls = tk.C;
      else if (k === K.SOIL) cls = tk.s;
      // [polish] object regions (obj) take any solid tile, glass included; terrain kinds keep glass
      if (cls && regions.length) for (const r of regions) if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h && (r.obj || cls !== 'slick')) { cls = r.cls; break; }
      return cls;
    };
  }
  regions(game) {
    const d = roomLook(game.room);
    if (d._regions) return d._regions;
    d._regions = (d.paint || []).map((p, i) => ({ ...p, w: p.w || 1, h: p.h || 1, cls: p.obj ? `obj:${i}` : p.kind }));
    return d._regions;
  }

  paintScreen(g, game, sx, sy, tex) {
    const grid = game.grid, col = zoneColors(game.zone);
    const x0 = sx * SCREEN_W, y0 = sy * SCREEN_H;
    const ox = x0 * TILE, oy = y0 * TILE; // room px of this screen's corner
    const rnd = seeded(`${game.room.id}:${sx},${sy}`);
    const cls = this.classifier(game);
    const at = (x, y) => grid.at(x, y);
    // collect tiles by class (one tile margin so bulges from neighbours show)
    const byClass = new Map();
    for (let ty = -1; ty <= SCREEN_H; ty++) for (let tx = -1; tx <= SCREEN_W; tx++) {
      const c = cls(x0 + tx, y0 + ty);
      if (!c) continue;
      if (!byClass.has(c)) byClass.set(c, []);
      byClass.get(c).push([tx, ty]);
    }
    // draw order: zone stone first, then glass, then terrain on top (their bulges overlap)
    const order = [...byClass.keys()].sort((a, b) => (a === 'zone' ? -2 : a === 'slick' ? -1 : 0) - (b === 'zone' ? -2 : b === 'slick' ? -1 : 0));
    const regions = this.regions(game);
    for (const c of order) this.paintClass(g, c, byClass.get(c), { x0, y0, ox, oy, cls, col, tex, rnd, game, regions });
    const look = roomLook(game.room);
    const burner = (tx, ty) => look.hazard === 'burner' || (look.burners || []).some((b) => tx >= b.x && tx < b.x + (b.w || 1) && ty >= b.y && ty < b.y + (b.h || 1));

    // [final-G] racks (look.racks: [{x, y, w, h, color}]): the one-way planks inside are a real shoe rack's
    // slats between two wooden uprights (the Rug room's ladder)
    const racks = look.racks || [];
    const rackAt = (tx, ty) => racks.find((r) => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h);
    for (const r of racks) this.paintRackPosts(g, r, x0, y0);
    // one-way planks, tacks, cracks (drawn over)
    for (let ty = -1; ty <= SCREEN_H; ty++) for (let tx = -1; tx <= SCREEN_W; tx++) {
      const k = at(x0 + tx, y0 + ty);
      const px = tx * TILE, py = ty * TILE;
      const rk = k === K.ONEWAY && racks.length ? rackAt(x0 + tx, y0 + ty) : null;
      if (rk) this.paintRackSlat(g, px, py, at(x0 + tx - 1, y0 + ty) !== K.ONEWAY, at(x0 + tx + 1, y0 + ty) !== K.ONEWAY, rk, x0 + tx, y0 + ty);
      else if (k === K.ONEWAY) this.paintPlank(g, px, py, at(x0 + tx - 1, y0 + ty) !== K.ONEWAY, at(x0 + tx + 1, y0 + ty) !== K.ONEWAY, col, tex, ox, oy, rnd);
      else if (k === K.HAZARD && burner(x0 + tx, y0 + ty)) { if (at(x0 + tx - 1, y0 + ty) !== K.HAZARD || tx === -1) this.paintBurner(g, game, x0, y0, tx, ty); }
      else if (k === K.HAZARD) {
        g.fillStyle = '#C9CDD4'; g.strokeStyle = '#4A4E58'; g.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) { const bx = px + 4 + i * 12, h = TILE * 0.35 + rnd() * 6; g.beginPath(); g.moveTo(bx, py + TILE); g.lineTo(bx + 6, py + h); g.lineTo(bx + 12, py + TILE); g.closePath(); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(bx + 5, py + h + 3, 1.5, 6); g.fillStyle = '#C9CDD4'; }
      } else if (k === K.CRACK) {
        g.strokeStyle = 'rgba(14,10,8,0.85)'; g.lineWidth = 2.5; g.lineJoin = 'round'; g.beginPath();
        g.moveTo(px + TILE / 2 + 2, py); g.lineTo(px + TILE / 2 - 5, py + TILE * 0.35); g.lineTo(px + TILE / 2 + 4, py + TILE * 0.65); g.lineTo(px + TILE / 2 - 2, py + TILE); g.stroke();
        g.strokeStyle = 'rgba(255,240,210,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + TILE / 2 + 4, py + 2); g.lineTo(px + TILE / 2 - 3, py + TILE * 0.35 + 1); g.stroke();
      }
    }
  }

  // Fill one class of solid tiles: rects + wobbly edge strips, clipped fill with its texture,
  // wet-edge pooling inside, paper grain, then a darker wobbly ink edge and edge marks by kind.
  paintClass(g, kind, tiles, o) {
    const { x0, y0, ox, oy, cls, col } = o;
    const same = (tx, ty) => cls(x0 + tx, y0 + ty) === kind;
    const solidAny = (tx, ty) => cls(x0 + tx, y0 + ty) != null;
    const reg = kind.startsWith('obj:') ? o.regions[+kind.slice(4)] : null;
    const oe = reg && (OBJ_EDGE[reg.obj] || OBJ_EDGE.stone);
    const lumpy = reg ? oe[2] : kind === 'cereal';
    const amp = reg ? oe[1] : lumpy ? 6 : kind === 'syrup' ? 2.5 : 3.2, base = reg ? oe[0] : lumpy ? 1.5 : 0.4;
    const N = (x, y) => base + amp * wob(x + ox, y + oy, lumpy);
    const fill = new Path2D(), ink = new Path2D(), tops = new Path2D(), bottoms = new Path2D();
    const T = TILE, STEP = 8;
    const edges = [];
    for (const [tx, ty] of tiles) {
      const px = tx * T, py = ty * T;
      fill.rect(px - 0.5, py - 0.5, T + 1, T + 1);
      // sides: [nx, ny, Ax, Ay, dx, dy]
      for (const [nx, ny, ax, ay, dx, dy] of [[0, -1, px, py, 1, 0], [0, 1, px, py + T, 1, 0], [-1, 0, px, py, 0, 1], [1, 0, px + T, py, 0, 1]]) {
        if (same(tx + nx, ty + ny)) continue;
        // corners: convex / straight / concave (shared corner points line up between tiles)
        const cornerPt = (cx, cy, sgn) => {
          const along = [tx + sgn * dx, ty + sgn * dy], diag = [along[0] + nx, along[1] + ny];
          const n = N(cx, cy);
          let ex = cx + n * nx, ey = cy + n * ny;
          if (!same(along[0], along[1])) { ex += n * sgn * dx; ey += n * sgn * dy; }
          else if (same(diag[0], diag[1])) { ex -= n * sgn * dx; ey -= n * sgn * dy; }
          return [ex, ey];
        };
        const pts = [cornerPt(ax, ay, -1)];
        for (let s = STEP; s < T; s += STEP) { const rx = ax + dx * s, ry = ay + dy * s, n = N(rx, ry); pts.push([rx + n * nx, ry + n * ny]); }
        pts.push(cornerPt(ax + dx * T, ay + dy * T, 1));
        const poly = new Path2D(); poly.moveTo(ax, ay);
        for (const p of pts) poly.lineTo(p[0], p[1]);
        poly.lineTo(ax + dx * T, ay + dy * T); poly.closePath();
        fill.addPath(poly);
        const open = !solidAny(tx + nx, ty + ny);
        edges.push({ pts, nx, ny, open, px, py, gx: x0 + tx, gy: y0 + ty });
        ink.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ink.lineTo(p[0], p[1]);
        if (ny === -1 && open) { tops.moveTo(pts[0][0], pts[0][1] + 3); for (const p of pts) tops.lineTo(p[0], p[1] + 3); }
        if (ny === 1 && open) { bottoms.moveTo(pts[0][0], pts[0][1]); for (const p of pts) bottoms.lineTo(p[0], p[1]); }
      }
    }
    if (reg) { // [polish] a household object: its own painter (src/objpaint.js)
      const b = { L: (reg.x - x0) * T, T: (reg.y - y0) * T, W: reg.w * T, H: reg.h * T };
      // soft things (fabric, round: true) that fill their box: a wobbly rounded box instead of tile edges
      if ((reg.round ?? reg.obj === 'fabric') && this.regionFull(o.game, reg, kind, cls)) {
        const rp = roundBox(b, Math.min(reg.radius ?? 16, b.H / 2.5, b.W / 2.5), ox, oy);
        const shape = { fill: rp, ink: rp, tops: topArc(b, Math.min(reg.radius ?? 16, b.H / 2.5, b.W / 2.5), ox, oy), edges: [] };
        paintObject(g, reg, shape, b, { rnd: seeded(`${o.game.room.id}:${kind}`), grain: this.grain, tex: o.tex, col, ox, oy, inRegion: () => false });
        return;
      }
      const inRegion = (gx, gy, interior) => interior ? gx > reg.x && gx < reg.x + reg.w - 1 && gy > reg.y && gy < reg.y + reg.h - 1 : gx >= reg.x && gx < reg.x + reg.w && gy >= reg.y && gy < reg.y + reg.h;
      paintObject(g, reg, { fill, ink, tops, edges }, b, { rnd: seeded(`${o.game.room.id}:${kind}`), grain: this.grain, tex: o.tex, col, ox, oy, inRegion });
      this.slickSheen(g, o.game, tiles, x0, y0);
      return;
    }
    // fill
    g.save();
    g.clip(fill);
    const texImg = kind === 'zone' || kind === 'slick' ? o.tex : S.get(`textures/terrain-${kind}.webp`);
    if (texImg) {
      const pat = g.createPattern(texImg, 'repeat');
      const sc = kind === 'zone' || kind === 'slick' ? TEX_SCALE : 0.5;
      if (pat.setTransform) pat.setTransform(new DOMMatrix().translate(-ox % (texImg.width * sc), -oy % (texImg.height * sc)).scale(sc));
      g.fillStyle = pat;
    } else {
      const fb = { cereal: '#B07A3A', soil: '#5E4430', sand: '#B9965E', plaster: '#BFAE92', 'crumbling-floor': '#8A6440', syrup: '#C0721E' }[kind];
      g.fillStyle = fb || rgb(col.dark);
    }
    g.fillRect(-60, -60, VW + 120, VH + 120);
    if (kind === 'slick') { // glass/porcelain: paler, cool, with sheen streaks
      g.fillStyle = 'rgba(205,225,235,0.32)'; g.fillRect(-60, -60, VW + 120, VH + 120);
      // [polish] two soft broad reflections per screen instead of regular stripes
      for (const [i, w, a] of [[-VH * 0.2, 34, 0.16], [-VH * 0.2 + 46, 10, 0.14], [VW * 0.55, 40, 0.13], [VW * 0.55 + 52, 12, 0.12]]) { g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = w; g.beginPath(); g.moveTo(i, VH); g.lineTo(i + VH * 0.6, 0); g.stroke(); }
    }
    // wet-edge pooling: pigment collects at the boundary
    g.lineJoin = 'round'; g.lineCap = 'round';
    const pool = kind === 'zone' || kind === 'slick' ? col.edge : [40, 26, 14];
    g.strokeStyle = rgb(pool, 0.16); g.lineWidth = 16; g.stroke(ink);
    g.strokeStyle = rgb(pool, 0.2); g.lineWidth = 7; g.stroke(ink);
    // paper grain
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = g.createPattern(this.grain, 'repeat'); g.globalAlpha = 0.5;
    g.fillRect(-60, -60, VW + 120, VH + 120);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // marks by kind (inside the shape)
    this.kindMarks(g, kind, edges, o.rnd, tiles);
    g.restore();
    // ink edge and a lighter wet rim on top surfaces
    g.lineJoin = 'round'; g.lineCap = 'round';
    const inkCol = kind === 'zone' ? col.edge : kind === 'slick' ? mix(col.edge, [120, 150, 170], 0.3) : { cereal: [92, 52, 18], soil: [40, 26, 16], sand: [110, 80, 40], plaster: [110, 90, 66], 'crumbling-floor': [70, 44, 24], syrup: [120, 50, 10] }[kind] || col.edge;
    g.strokeStyle = rgb(inkCol, 0.88); g.lineWidth = 2.6; g.stroke(ink);
    g.strokeStyle = rgb(inkCol, 0.25); g.lineWidth = 5; g.stroke(ink);
    const rim = kind === 'syrup' ? 'rgba(255,236,190,0.75)' : kind === 'zone' ? rgb(mix(col.pal[1], col.paper, 0.4), 0.45) : 'rgba(255,245,225,0.35)';
    g.strokeStyle = rim; g.lineWidth = kind === 'syrup' ? 3 : 2; g.stroke(tops);
    if (kind === 'syrup') { // drips under syrup
      g.fillStyle = 'rgba(196,110,24,0.9)';
      for (const e of edges) if (e.ny === 1 && e.open && o.rnd() < 0.5) { const p = e.pts[1 + Math.floor(o.rnd() * (e.pts.length - 2))]; const l = 6 + o.rnd() * 10; g.beginPath(); g.moveTo(p[0] - 3, p[1] - 1); g.quadraticCurveTo(p[0] - 3, p[1] + l, p[0], p[1] + l + 3); g.quadraticCurveTo(p[0] + 3, p[1] + l, p[0] + 3, p[1] - 1); g.fill(); }
    }
    void bottoms;
  }

  // [polish] slick ('G') tiles painted as an object keep a glossy cue (you can't cling to them):
  // soft diagonal sheen streaks clipped to just those tiles
  slickSheen(g, game, tiles, x0, y0) {
    const clip = new Path2D(); let any = false;
    for (const [tx, ty] of tiles) if (game.grid.at(x0 + tx, y0 + ty) === K.SLICK) { clip.rect(tx * TILE, ty * TILE, TILE, TILE); any = true; }
    if (!any) return;
    g.save(); g.clip(clip);
    for (let i = -VH; i < VW + VH; i += 230) {
      g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 16; g.beginPath(); g.moveTo(i, VH); g.lineTo(i + VH * 0.6, 0); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.09)'; g.lineWidth = 5; g.beginPath(); g.moveTo(i + 26, VH); g.lineTo(i + 26 + VH * 0.6, 0); g.stroke();
    }
    g.restore();
  }

  // [polish] does every tile in the region's box belong to it (a plain box: cushions, quilts)?
  regionFull(game, reg, kind, cls) {
    reg._full ??= (() => { for (let y = reg.y; y < reg.y + reg.h; y++) for (let x = reg.x; x < reg.x + reg.w; x++) if (cls(x, y) !== kind) return false; return true; })();
    return reg._full;
  }

  kindMarks(g, kind, edges, rnd, tiles) {
    if (kind === 'plaster' || kind === 'crumbling-floor') { // cracks
      g.strokeStyle = kind === 'plaster' ? 'rgba(90,70,50,0.6)' : 'rgba(40,24,12,0.7)'; g.lineWidth = 1.3;
      for (const e of edges) {
        if (!e.open || rnd() > 0.45) continue;
        const p = e.pts[1 + Math.floor(rnd() * (e.pts.length - 2))];
        let x = p[0], y = p[1]; g.beginPath(); g.moveTo(x, y);
        for (let i = 0; i < 4; i++) { x += -e.nx * (5 + rnd() * 6) + (rnd() - 0.5) * 8 * (e.ny ? 1 : 0); y += -e.ny * (5 + rnd() * 6) + (rnd() - 0.5) * 8 * (e.nx ? 1 : 0); g.lineTo(x, y); }
        g.stroke();
      }
      if (kind === 'crumbling-floor') { g.fillStyle = 'rgba(30,18,10,0.35)'; for (const [tx, ty] of tiles) if (rnd() < 0.4) { g.beginPath(); g.arc(tx * TILE + rnd() * TILE, ty * TILE + rnd() * TILE, 1.5 + rnd() * 2, 0, 7); g.fill(); } }
    } else if (kind === 'soil' || kind === 'sand') { // speckle, denser near the open edges
      for (const e of edges) {
        if (!e.open) continue;
        for (let i = 0; i < 7; i++) {
          const p = e.pts[Math.floor(rnd() * e.pts.length)], d = rnd() * 12;
          g.fillStyle = rnd() < 0.5 ? (kind === 'soil' ? 'rgba(20,12,6,0.55)' : 'rgba(120,90,50,0.5)') : (kind === 'soil' ? 'rgba(170,130,90,0.5)' : 'rgba(255,240,200,0.5)');
          g.fillRect(p[0] - e.nx * d + (rnd() - 0.5) * 6, p[1] - e.ny * d + (rnd() - 0.5) * 6, 2, 2);
        }
      }
    } else if (kind === 'cereal') { // knobbly bumps: shaded rims along open edges
      g.strokeStyle = 'rgba(255,225,160,0.35)'; g.lineWidth = 2;
      for (const e of edges) if (e.open) for (const p of e.pts) if (rnd() < 0.5) { g.beginPath(); g.arc(p[0] - e.nx * 5, p[1] - e.ny * 5, 4 + rnd() * 3, 0, 7); g.stroke(); }
    }
  }

  // [polish] kitchen burners (look: hazard: 'burner' or burners: [{x, y, w, h}]): a hazard run is
  // drawn as glowing electric coil rings on a dark drip pan instead of tacks (cached with the screen)
  paintBurner(g, game, x0, y0, tx, ty) {
    let n = 0; while (game.grid.at(x0 + tx + n, y0 + ty) === K.HAZARD && n < 64) n++;
    const rings = Math.max(1, Math.round(n / 3)), rw = (n * TILE) / rings;
    for (let i = 0; i < rings; i++) {
      const cx = tx * TILE + rw * (i + 0.5), cy = ty * TILE + TILE * 0.78, rx = rw * 0.44, ry = Math.min(11, rx * 0.22);
      const glow = g.createRadialGradient(cx, cy - 6, 4, cx, cy - 6, rx * 1.15);
      glow.addColorStop(0, 'rgba(255,150,70,0.5)'); glow.addColorStop(0.6, 'rgba(255,110,50,0.18)'); glow.addColorStop(1, 'rgba(255,110,50,0)');
      g.fillStyle = glow; g.beginPath(); g.ellipse(cx, cy - 6, rx * 1.15, rx * 0.6, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(38,30,30,0.95)'; g.beginPath(); g.ellipse(cx, cy + 2, rx + 6, ry + 5, 0, 0, 7); g.fill(); // drip pan
      g.strokeStyle = 'rgba(150,140,140,0.7)'; g.lineWidth = 1.5; g.stroke();
      for (let k = 0; k < 3; k++) { // the coil: three nested glowing rings
        const f = 1 - k * 0.27;
        g.strokeStyle = 'rgba(120,30,10,0.95)'; g.lineWidth = 6; g.beginPath(); g.ellipse(cx, cy, rx * f, ry * f, 0, 0, 7); g.stroke();
        g.strokeStyle = k === 0 ? 'rgba(255,120,50,1)' : 'rgba(255,150,70,1)'; g.lineWidth = 3.2; g.beginPath(); g.ellipse(cx, cy, rx * f, ry * f, 0, 0, 7); g.stroke();
        g.strokeStyle = 'rgba(255,230,150,0.85)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(cx, cy - 1, rx * f, ry * f, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      }
    }
  }

  // [final-G] a shoe rack: two square uprights from the rack's top to its foot, with a cross rail at the foot
  paintRackPosts(g, r, x0, y0) {
    const wood = r.color || '#8A5E3C', ink = '#3A2618';
    const top = (r.y - y0) * TILE - 6, bot = (r.y + r.h - y0) * TILE;
    for (const cx of [r.x - 0.15, r.x + r.w + 0.15]) {
      const x = (cx - x0) * TILE - 8;
      g.fillStyle = wood; g.fillRect(x, top, 16, bot - top);
      g.fillStyle = 'rgba(255,230,190,0.25)'; g.fillRect(x + 2, top, 4, bot - top);
      g.fillStyle = 'rgba(30,18,10,0.25)'; g.fillRect(x + 11, top, 5, bot - top);
      g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(x, top, 16, bot - top);
      g.fillStyle = wood; g.beginPath(); g.ellipse(x + 8, top, 9, 4, 0, 0, TAU0); g.fill(); g.stroke();
    }
  }
  paintRackSlat(g, px, py, leftEnd, rightEnd, r, tx, ty) {
    const wood = r.slat || '#B07A4C', ink = '#3A2618';
    g.save();
    g.fillStyle = wood; g.fillRect(px - 0.5, py, TILE + 1, 11);
    g.fillStyle = 'rgba(255,236,200,0.35)'; g.fillRect(px, py + 1, TILE, 2.5);
    g.strokeStyle = 'rgba(70,40,20,0.35)'; g.lineWidth = 1;
    const k = (tx * 7 + ty * 13) % 5;
    g.beginPath(); g.moveTo(px, py + 6 + k * 0.4); g.bezierCurveTo(px + 12, py + 4 + k * 0.5, px + 26, py + 8, px + TILE, py + 6 + (k % 3) * 0.6); g.stroke();
    if (k === 2) { g.beginPath(); g.ellipse(px + 20, py + 6, 4, 2, 0, 0, TAU0); g.stroke(); }
    g.strokeStyle = ink; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(px - 0.5, py); g.lineTo(px + TILE + 0.5, py); g.moveTo(px - 0.5, py + 11); g.lineTo(px + TILE + 0.5, py + 11); g.stroke();
    if (leftEnd) { g.beginPath(); g.moveTo(px, py); g.lineTo(px, py + 11); g.stroke(); }
    if (rightEnd) { g.beginPath(); g.moveTo(px + TILE, py); g.lineTo(px + TILE, py + 11); g.stroke(); }
    g.restore();
  }
  paintPlank(g, px, py, leftEnd, rightEnd, col, tex, ox, oy, rnd) {
    const y0 = py + Math.sin((px + ox) * 0.05) * 0.8;
    g.save();
    const path = new Path2D(); path.roundRect(px - (leftEnd ? 1 : 0.5), y0, TILE + (leftEnd ? 1 : 0) + (rightEnd ? 1 : 0.5), 12, leftEnd || rightEnd ? 4 : 0);
    if (tex) { const pat = g.createPattern(tex, 'repeat'); pat.setTransform?.(new DOMMatrix().translate(-ox % (tex.width * TEX_SCALE), -oy % (tex.height * TEX_SCALE)).scale(TEX_SCALE)); g.fillStyle = pat; }
    else g.fillStyle = rgb(col.dark);
    g.fill(path);
    g.fillStyle = rgb(mix(col.dark, col.paper, 0.35), 0.6); g.fillRect(px, y0, TILE, 2.5);
    g.strokeStyle = rgb(col.edge, 0.85); g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(px, y0 + 12); g.lineTo(px + TILE, y0 + 12 + (rnd() - 0.5)); g.stroke();
    if (leftEnd) { g.beginPath(); g.moveTo(px, y0); g.lineTo(px, y0 + 12); g.stroke(); g.fillStyle = rgb(col.edge); g.fillRect(px + 4, y0 + 12, 3.5, 9); }
    if (rightEnd) { g.beginPath(); g.moveTo(px + TILE, y0); g.lineTo(px + TILE, y0 + 12); g.stroke(); g.fillStyle = rgb(col.edge); g.fillRect(px + TILE - 7.5, y0 + 12, 3.5, 9); }
    g.restore();
  }

  // ---- background: far painting per room ----
  // Room data (optional): bg: { v: 'a' | 'b', mirror: bool, x: 0..1, y: 0..1 } (x/y = where the
  // view sits in the painting). Default: a deterministic hash of the room id.
  bgFor(room) { return bgFor(room); }
  drawBackground(c, game, cam) {
    const zone = game.zone, col = zoneColors(zone), room = game.room;
    const folder = roomLook(room).bg?.folder || bgFolder(zone); // [builder A] a room may borrow another zone's painting (Duchess's tank)
    const o = this.bgFor(room);
    const path = S.bgPath(folder, o.v) || S.bgPath(folder, 'a');
    const far = path && S.get(path);
    if (far && far.height > far.width) { this.drawTiledBg(c, far, cam, room); return; }
    if (far) {
      const s = Math.max(VW / far.width, VH / far.height) * 1.18;
      const dw = far.width * s, dh = far.height * s;
      const fx = Math.max(0, Math.min(1, cam.x / Math.max(1, room.pw - cam.vw)));
      const fy = Math.max(0, Math.min(1, cam.y / Math.max(1, room.ph - cam.vh)));
      const u = o.x * 0.5 + fx * 0.5, v = o.y * 0.4 + fy * 0.6;
      const px = -(dw - VW) * u, py = -(dh - VH) * v;
      // baked once at display resolution (mirror and paper wash included): each frame is a 1:1 blit
      const b = this.bakedBg(far, path, o.mirror, dw, dh);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      if (b.k === 1) c.drawImage(b.cv, Math.round(px * this.scale), Math.round(py * this.scale));
      else c.drawImage(b.cv, px * this.scale, py * this.scale, dw * this.scale, dh * this.scale);
      c.restore();
      return;
    }
    const grad = c.createLinearGradient(0, 0, 0, VH);
    grad.addColorStop(0, rgb(col.skyTop)); grad.addColorStop(1, rgb(col.skyBot));
    c.fillStyle = grad; c.fillRect(0, 0, VW, VH);
    const rnd = seeded(room.id + ':bg');
    for (let i = 0; i < 14; i++) {
      const bx = rnd() * (room.pw + 400) - cam.x * 0.3, by = rnd() * room.ph - cam.y * 0.3;
      const r = 60 + rnd() * 160;
      c.fillStyle = rgb(col.blot[i % 4], 0.12 + rnd() * 0.1);
      c.beginPath(); c.ellipse(bx, by, r * 1.4, r, rnd(), 0, 7); c.fill();
    }
  }
  bakedBg(img, path, mirror, dw, dh) {
    const W = Math.round(dw * this.scale), H = Math.round(dh * this.scale);
    const key = `${path}|${mirror ? 1 : 0}|${W}x${H}`;
    if (this.bgBake?.key === key) return this.bgBake;
    const k = Math.min(1, Math.sqrt(9e6 / (W * H))); // keep it under ~9 MP (iOS canvas budget)
    const cv = document.createElement('canvas');
    cv.width = Math.round(W * k); cv.height = Math.round(H * k);
    const g = cv.getContext('2d'); g.imageSmoothingQuality = 'high';
    if (mirror) { g.translate(cv.width, 0); g.scale(-1, 1); }
    g.drawImage(img, 0, 0, cv.width, cv.height);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = 'rgba(244,235,221,0.18)'; g.fillRect(0, 0, cv.width, cv.height);
    if (this.bgBake?.cv) { this.bgBake.cv.width = 0; }
    this.bgBake = { key, cv, k: k === 1 ? 1 : k };
    return this.bgBake;
  }
  // tall paintings (the chimney): tiled vertically, alternate tiles flipped to hide the seam
  drawTiledBg(c, img, cam, room) {
    const s = (VW * 1.12) / img.width, dh = img.height * s, dw = img.width * s;
    const px = -(dw - VW) * Math.max(0, Math.min(1, cam.x / Math.max(1, room.pw - cam.vw)));
    const off = (room.wy + cam.y) * 0.35;
    const i0 = Math.floor(off / dh);
    const b = this.bakedBg(img, 'tile:' + img.src, false, dw, dh);
    for (let i = i0; i * dh - off < VH; i++) {
      const y = i * dh - off;
      c.save();
      if (i & 1) { c.translate(0, y + dh); c.scale(1, -1); c.drawImage(b.cv, px, 0, dw, dh); }
      else c.drawImage(b.cv, px, y, dw, dh);
      c.restore();
    }
  }

  // ---- near layer: blurred dark prop silhouettes in front, parallax 1.25 ----
  // Room data (optional): near: [{ prop: 'spool', x: tiles, scale: 3..5 }] or near: false.
  // Default: two props per screen from the zone's `near` list (or the table above).
  nearSilhouette(prop, col) {
    const key = prop;
    if (this.nearCache.has(key)) return this.nearCache.get(key);
    const img = S.get(`props/${prop}.webp`);
    if (!img) return null;
    // blur by downscale then upscale (cheap and works where ctx.filter doesn't)
    // padded so the blur fades out instead of being cut at the canvas edge
    const small = document.createElement('canvas');
    const k = 28 / Math.max(img.width, img.height), pad = 6;
    const iw = Math.max(2, Math.round(img.width * k)), ih = Math.max(2, Math.round(img.height * k));
    small.width = iw + pad * 2; small.height = ih + pad * 2;
    const sg = small.getContext('2d');
    sg.drawImage(img, pad, pad, iw, ih);
    sg.globalCompositeOperation = 'source-in'; sg.fillStyle = rgb(mix(col.pal[0], [10, 8, 8], 0.45)); sg.fillRect(0, 0, small.width, small.height);
    const out = document.createElement('canvas');
    const up = 0.4 / k * k; // output at 0.4x of the prop's own size
    out.width = Math.round(small.width / k * 0.4); out.height = Math.round(small.height / k * 0.4);
    const og = out.getContext('2d'); og.imageSmoothingQuality = 'high';
    og.drawImage(small, 0, 0, out.width, out.height);
    out.contentH = ih / (ih + pad * 2); // fraction of the canvas the prop fills (for sizing)
    void up;
    this.nearCache.set(key, out);
    return out;
  }
  drawNear(c, game, cam) {
    const room = game.room, d = roomLook(room);
    if (d.near === false || room.dark) return;
    const col = zoneColors(game.zone);
    const list = nearList(room);
    if (!list.length) return;
    const z = cam.zoom;
    for (const n of list) {
      const sil = this.nearSilhouette(n.prop, col);
      if (!sil) continue;
      const h = 60 * (n.scale || 4) / (sil.contentH || 1), w = h * sil.width / sil.height;
      const wx = n.x * TILE;
      const sx = (wx - cam.x) * 1.25 * z; // parallax 1.25
      if (sx + w < -50 || sx - w > VW + 50) continue;
      const sy = VH * (cam.hFrac || 1) + h * 0.72 - (cam.y - Math.max(0, room.ph - cam.vh)) * 0.25 * z; // [final-G] the view's real bottom
      c.save(); c.globalAlpha = 0.38;
      c.translate(sx, sy); if (n.flip) c.scale(-1, 1);
      c.drawImage(sil, -w / 2, -h, w, h);
      c.restore();
    }
  }

  // ---- the frame ----
  draw(game, view = {}) {
    const c = this.ctx;
    const t0 = performance.now();
    this.t++; this.view = view; // [issue 9] view.tipRead: whether a note has been read (main.js)
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    if (!game.room) { c.fillStyle = PAPER; c.fillRect(0, 0, VW, VH); return; }
    const cam = game.camera, room = game.room;
    this.syncZone(game);
    this.fx.tint = zoneColors(game.zone).paper.map((v, i) => (v * 0.8 + zoneColors(game.zone).pal[2][i] * 0.2) | 0);
    this.fx.consume(game);
    this.fx.ambient(game, cam, TILE);
    this.drawBackground(c, game, cam);
    c.save();
    c.scale(cam.zoom, cam.zoom);
    const [shx, shy] = this.fx.shakeOffset(view.shake !== false, cam.shake);
    c.translate(-Math.round(cam.x) + shx, -Math.round(cam.y) + shy);
    const s0 = Math.max(0, Math.floor(cam.x / VW)), s1 = Math.min(room.sw - 1, Math.floor((cam.x + cam.vw) / VW));
    const r0 = Math.max(0, Math.floor(cam.y / VH)), r1 = Math.min(room.sh - 1, Math.floor((cam.y + cam.vh) / VH));
    this.drawDecor(c, game, 'back');
    if (game.boss?.drawBack) game.boss.drawBack(c, this, game); // [polish] a boss behind the platforms (Nana on the far wall)
    for (let yy = r0; yy <= r1; yy++) for (let xx = s0; xx <= s1; xx++) {
      const sc = this.screenCanvas(game, xx, yy);
      c.drawImage(sc, xx * VW, yy * VH, VW, VH);
    }
    if (cam.y + cam.vh > room.ph || cam.y < 0) this.drawOverscroll(c, game, cam, s0, s1); // [final-G] touch camera past the floor/top
    if (cam.x < 0 || cam.x + cam.vw > room.pw) this.drawOverscrollSides(c, game, cam, r0, r1); // [polish-V] past a side (touch: clear of the buttons)
    this.drawWater(c, game, cam);
    this.drawEntities(c, game);
    this.drawEnemies(c, game);
    if (this.drawMech) this.drawMech(c, game, this.t); // [mech] lifts, springs, gates, levers, keys, projectiles (src/mech-draw.js, set by main.js)
    if (game.boss?.draw) game.boss.draw(c, this);
    if (game.boss?.notesOver) for (const sg of game.signs || []) if (noteLive(game, sg)) this.drawNote(c, game, sg); // [issue 9] over a set piece drawn on the floor (the feeder cup)
    this.drawPlayer(c, game);
    this.drawDecor(c, game, 'front');
    this.fx.draw(c);
    if (view.glint) this.drawGlint(c, view.glint); // [issue 10] the ear guide's doorway
    if (this.debug) this.drawDebug(c, game);
    c.restore();
    this.drawNear(c, game, cam);
    // [builder C] bosses may paint their own darkness (Ember's furnace light) and draw over it (her eyes)
    if (room.dark) { if (game.boss?.drawDark) game.boss.drawDark(c, this, game); else this.drawDark(c, game); }
    if (game.boss?.drawOver) game.boss.drawOver(c, this, game);
    this.fx.drawScreen(c, game, VW, VH * (cam.hFrac || 1)); // [final-G] the view's real height (a wide phone)
    if (!view.held) this.drawTransition(c, game); // [issue 16] held: main.js draws the held transition over this frame
    this.perf.frame = performance.now() - t0;
  }

  // [issue 10] A small pulsing glint at the doorway the ear guide aims at (room coordinates; main.js only
  // passes one while the ear is out), so the ear reads as "go there".
  drawGlint(c, g) {
    const k = 0.5 + 0.5 * Math.sin(this.t / 9), r = 9 + 5 * k;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const gr = c.createRadialGradient(g.x, g.y, 0, g.x, g.y, r * 2.4);
    gr.addColorStop(0, `rgba(255,236,180,${(0.55 + 0.35 * k).toFixed(2)})`); gr.addColorStop(0.35, `rgba(232,184,90,${(0.3 + 0.2 * k).toFixed(2)})`); gr.addColorStop(1, 'rgba(232,184,90,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(g.x, g.y, r * 2.4, 0, 7); c.fill();
    c.strokeStyle = `rgba(255,244,214,${(0.6 + 0.4 * k).toFixed(2)})`; c.lineWidth = 2.5; c.lineCap = 'round';
    const s = r * 1.1; // a four-point sparkle
    c.beginPath(); c.moveTo(g.x - s, g.y); c.lineTo(g.x + s, g.y); c.moveTo(g.x, g.y - s); c.lineTo(g.x, g.y + s); c.stroke();
    c.restore();
  }

  // [final-G] on touch the camera may look past the room's floor (so the cricket stays above the thumbs) or
  // its top: continue the edge tiles there, mirrored (seamless), fading into the deep ink of the house.
  drawOverscroll(c, game, cam, s0, s1) {
    const room = game.room, col = zoneColors(game.zone), band = TILE; // an interior slice of the edge tiles (no rim, no ink edge)
    for (const [edge, yy] of [['bottom', room.sh - 1], ['top', 0]]) {
      const need = edge === 'bottom' ? cam.y + cam.vh - room.ph : -cam.y;
      if (need <= 0) continue;
      const n = Math.ceil(need / band);
      // [polish-V] past a side too (the corner): the end screen's strip mirrored across the room's edge
      const cols = [];
      for (let xx = s0; xx <= s1; xx++) cols.push([xx, xx * VW, false]);
      if (cam.x + cam.vw > room.pw) cols.push([room.sw - 1, room.pw, true]);
      if (cam.x < 0) cols.push([0, -VW, true]);
      for (const [xx, ox, mx] of cols) {
        const sc = this.screenCanvas(game, xx, yy), k = sc.height / VH;
        const sy = (edge === 'bottom' ? VH - 2 * TILE + 20 : 20) * k;
        for (let i = 0; i < n; i++) {
          const y = edge === 'bottom' ? room.ph - 6 + i * band : 6 - (i + 1) * band; // overlap the room's edge ink line
          const flip = i % 2 === 0;
          c.save(); c.translate(ox + (mx ? VW : 0), y + (flip ? band : 0)); c.scale(mx ? -1 : 1, flip ? -1 : 1);
          c.drawImage(sc, 0, sy, sc.width, band * k, 0, 0, VW, band);
          c.restore();
        }
      }
      const y0 = edge === 'bottom' ? room.ph : -n * band, h = n * band;
      const gr = c.createLinearGradient(0, edge === 'bottom' ? y0 : y0 + h, 0, edge === 'bottom' ? y0 + h : y0);
      gr.addColorStop(0, rgb(col.dark, 0.15)); gr.addColorStop(1, rgb(col.dark, 0.85));
      const gx0 = Math.min(s0 * VW, cam.x < 0 ? -VW : s0 * VW), gx1 = Math.max((s1 + 1) * VW, cam.x + cam.vw > room.pw ? room.pw + VW : 0); // [polish-V] the corners too
      c.fillStyle = gr; c.fillRect(gx0, y0, gx1 - gx0, h);
    }
  }

  // [polish-V] the view past the room's left/right edge (touch: the cricket kept clear of the thumb buttons):
  // the edge column continued, mirrored, darkening into the house's ink; the corners plain ink
  drawOverscrollSides(c, game, cam, r0, r1) {
    const room = game.room, col = zoneColors(game.zone), band = TILE;
    for (const edge of ['right', 'left']) {
      const need = edge === 'right' ? cam.x + cam.vw - room.pw : -cam.x;
      if (need <= 0) continue;
      const n = Math.ceil(need / band), xx = edge === 'right' ? room.sw - 1 : 0;
      for (let yy = r0; yy <= r1; yy++) {
        const sc = this.screenCanvas(game, xx, yy), k = sc.width / VW;
        const sx = (edge === 'right' ? VW - 2 * TILE + 20 : 20) * k;
        for (let i = 0; i < n; i++) {
          const x = edge === 'right' ? room.pw - 6 + i * band : 6 - (i + 1) * band;
          const flip = i % 2 === 0;
          c.save(); c.translate(x + (flip ? band : 0), yy * VH); c.scale(flip ? -1 : 1, 1);
          c.drawImage(sc, sx, 0, band * k, sc.height, 0, 0, band, VH);
          c.restore();
        }
      }
      const x0 = edge === 'right' ? room.pw : -n * band, w = n * band;
      const gr = c.createLinearGradient(edge === 'right' ? x0 : x0 + w, 0, edge === 'right' ? x0 + w : x0, 0);
      gr.addColorStop(0, rgb(col.dark, 0.2)); gr.addColorStop(Math.min(1, 6 * band / w), rgb(col.dark, 0.8)); gr.addColorStop(1, rgb(col.dark, 0.92));
      c.fillStyle = gr; c.fillRect(x0, Math.min(0, cam.y) - 2, w, Math.max(room.ph, cam.y + cam.vh) - Math.min(0, cam.y) + 4);
    }
  }

  drawWater(c, game, cam) {
    const grid = game.grid, col = zoneColors(game.zone);
    const tx0 = Math.max(0, Math.floor(cam.x / TILE) - 1), tx1 = Math.min(grid.w - 1, Math.ceil((cam.x + cam.vw) / TILE));
    const ty0 = Math.max(0, Math.floor(cam.y / TILE) - 1), ty1 = Math.min(grid.h - 1, Math.ceil((cam.y + cam.vh) / TILE));
    const t = this.t / 60;
    const wave = (x) => Math.sin(t * 2 + x * 0.022) * 2.5 + Math.sin(t * 3.1 - x * 0.05) * 1.2 + 5;
    // body: tiles below the surface
    const body = new Path2D();
    let any = false;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (grid.at(tx, ty) !== K.WATER || grid.isSurface(tx, ty)) continue;
      body.rect(tx * TILE - 0.5, ty * TILE - 0.5, TILE + 1, TILE + 1); any = true;
    }
    void any;
    const runs = [], surf = [];
    // surface runs: one wobbly band each, a lighter wet edge on top, moving ripple lines
    for (let ty = ty0; ty <= ty1; ty++) {
      let tx = tx0;
      while (tx <= tx1) {
        if (!(grid.at(tx, ty) === K.WATER && grid.isSurface(tx, ty))) { tx++; continue; }
        const a = tx; while (tx <= tx1 && grid.at(tx, ty) === K.WATER && grid.isSurface(tx, ty)) tx++;
        const xa = a * TILE, xb = tx * TILE, py = ty * TILE;
        const band = new Path2D(); band.moveTo(xa, py + wave(xa));
        for (let x = xa + 10; x <= xb; x += 10) band.lineTo(x, py + wave(x));
        band.lineTo(xb, py + TILE + 0.5); band.lineTo(xa, py + TILE + 0.5); band.closePath();
        body.addPath(band); runs.push(band);
        surf.push([xa, xb, py]);
      }
    }
    // one fill for the whole body (no seams between tiles), then the light wet edge and ripples
    c.fillStyle = rgb(col.water, 0.72); c.fill(body, 'nonzero');
    for (let i = 0; i < surf.length; i++) {
      const [xa, xb, py] = surf[i];
      {
        c.save(); c.clip(runs[i]);
        c.fillStyle = rgb(mix(col.water, col.paper, 0.45), 0.35); c.fillRect(xa, py, xb - xa, 12);
        c.restore();
        c.strokeStyle = 'rgba(236,244,240,0.85)'; c.lineWidth = 2.5; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(xa, py + wave(xa)); for (let x = xa + 10; x <= xb; x += 10) c.lineTo(x, py + wave(x)); c.stroke();
        c.strokeStyle = 'rgba(236,244,240,0.4)'; c.lineWidth = 1.5;
        for (let x = xa + ((t * 26) % 60); x < xb - 12; x += 60) { const y = py + 15 + Math.sin(x * 0.1 + t) * 2; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 7, y - 2, x + 14, y); c.stroke(); }
        for (let x = xa + 30 - ((t * 17) % 60); x < xb - 10; x += 60) { if (x < xa) continue; const y = py + 26; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 9, y); c.stroke(); }
      }
    }
    for (const cu of game.currents || []) {
      c.strokeStyle = 'rgba(233,241,238,0.5)'; c.lineWidth = 2;
      for (let i = 0; i < cu.w / 80; i++) {
        const x = cu.x + ((i * 80 + this.t * cu.vx / 60) % cu.w + cu.w) % cu.w, y = cu.y + cu.h - 22;
        const d = Math.sign(cu.vx);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + 14 * d, y); c.lineTo(x + 9 * d, y - 4); c.stroke();
      }
    }
  }

  // ---- props / decor ----
  // Room data: decor: [{ prop: 'spool', x, y, h?: tiles tall (default: 1.5), flip?, rot?, alpha?,
  //   layer?: 'back' (default, behind platforms) | 'mid' (in front of platforms, behind actors)
  //   | 'front' (in front of the cricket) }]. x = centre column, y = the row it stands in.
  // `prop` may be any assets path ('carrier/lamp.webp') or a props/ name.
  drawDecor(c, game, layer) {
    const list = roomLook(game.room).decor;
    if (!list.length) return;
    for (const d of list) {
      if ((d.layer || 'back') !== layer) continue;
      if (d.after && !game.rescued.has(d.after)) continue; // [builder B] shown only once that cricket is home
      if (d.gecko) { this.drawGeckoDecor(c, d); continue; }  // [builder B] a dozing gecko (the rig, curled tail, breathing)
      this.drawProp(c, d.prop, (d.x + 0.5) * TILE, (d.y + 1) * TILE, (d.h || 1.5) * TILE, d);
      if (d.prop === 'carrier-keeper') this.drawCarrierGrowth(c, game, d); // [final-G]
    }
  }
  // [final-G] the Carrier seen from outside (bed-carrier) shows what grew inside, through the plastic, by the
  // same stages as the inside (meta.shellStage): 1 moss + the cardboard shelf; 2 fairy lights, the ladder, lit
  // windows; 3 rooftops along the shelf and sprouts in bottle caps.
  drawCarrierGrowth(c, game, d) {
    let stage = 0; try { stage = shellStage(rescueCount(game)); } catch { /* no meta */ }
    if (!stage) return;
    const img = S.get('props/carrier-keeper.webp'); if (!img) return;
    const h = (d.h || 1.5) * TILE, w = h * img.width / img.height, X = (d.x + 0.5) * TILE - w / 2, Y = (d.y + 1) * TILE - h;
    const P = (ix, iy) => [X + ix * w / 640, Y + iy * h / 440], S1 = w / 640;
    const t = this.t;
    let bulbs = null;
    c.save();
    const [ax, ay] = P(34, 178), [bx, by] = P(606, 412);
    c.beginPath(); c.rect(ax, ay, bx - ax, by - ay); c.clip();
    c.globalAlpha = 0.82;
    // moss carpet
    c.fillStyle = '#6E9A4A';
    c.beginPath(); { const [x0, y0] = P(46, 404); c.moveTo(x0, y0); for (let i = 0; i <= 26; i++) { const [x, y] = P(46 + i * 21, 372 + Math.sin(i * 1.7) * 7 + (i % 3) * 3); c.lineTo(x, y); } const [x1, y1] = P(594, 404); c.lineTo(x1, y1); c.closePath(); c.fill(); }
    c.fillStyle = 'rgba(160,200,110,0.6)'; for (let i = 0; i < 18; i++) { const [x, y] = P(60 + i * 30, 378 + (i % 4) * 5); c.beginPath(); c.arc(x, y, 3.2 * S1 * 4, 0, TAU0); c.fill(); }
    // the cardboard shelf on two tube legs
    c.fillStyle = '#B98E5E'; c.strokeStyle = '#5A3E26'; c.lineWidth = Math.max(1, 3 * S1);
    { const [x0, y0] = P(70, 270), [x1] = P(580, 270); c.fillRect(x0, y0, x1 - x0, 10 * S1 * 1.6); c.strokeRect(x0, y0, x1 - x0, 10 * S1 * 1.6); }
    for (const lx of [470, 530]) { const [x0, y0] = P(lx, 286), [, y1] = P(lx, 396); c.fillStyle = '#A27A4E'; c.fillRect(x0, y0, 30 * S1, y1 - y0); c.strokeRect(x0, y0, 30 * S1, y1 - y0); }
    if (stage >= 2) {
      // the ladder, lit windows on the tube legs and along the shelf's edge
      c.strokeStyle = '#7A5634'; c.lineWidth = Math.max(1, 5 * S1);
      { const [x0, y0] = P(180, 286), [x1, y1] = P(230, 392), [x2] = P(215, 286), [x3] = P(265, 392);
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.moveTo(x2, y0); c.lineTo(x3, y1); c.stroke();
        for (let i = 1; i < 6; i++) { const k = i / 6; c.beginPath(); c.moveTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k); c.lineTo(x2 + (x3 - x2) * k, y0 + (y1 - y0) * k); c.stroke(); } }
      c.fillStyle = '#FFD98A';
      for (const [ix, iy] of [[478, 300], [538, 320], [478, 350], [100, 300], [300, 300], [380, 300]]) { const [x, y] = P(ix, iy); c.fillRect(x, y, 13 * S1, 15 * S1); }
      // fairy lights under the lid: a drooping string of warm bulbs that twinkle
      c.strokeStyle = 'rgba(90,70,50,0.8)'; c.lineWidth = Math.max(1, 2 * S1);
      const pts = [];
      for (let i = 0; i <= 40; i++) { const u = i / 40, seg = (u * 5) % 1; pts.push(P(50 + u * 540, 192 + Math.sin(seg * Math.PI) * 26)); }
      c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
      bulbs = pts;
    }
    if (stage >= 3) {
      // little cardboard rooftops along the shelf, and sprouts in bottle caps
      c.strokeStyle = '#5A3E26'; c.lineWidth = Math.max(1, 2.5 * S1);
      [[90, 34, 40], [132, 28, 34], [168, 40, 46], [214, 30, 36], [252, 26, 30], [520, 36, 44]].forEach(([ix, ww, hh]) => {
        const [x0, y0] = P(ix, 270), W = ww * S1 * 1.0, H = hh * S1;
        c.fillStyle = '#C9A274'; c.fillRect(x0, y0 - H * 0.6, W, H * 0.6); c.strokeRect(x0, y0 - H * 0.6, W, H * 0.6);
        c.fillStyle = '#A8784A'; c.beginPath(); c.moveTo(x0 - 3 * S1, y0 - H * 0.6); c.lineTo(x0 + W / 2, y0 - H); c.lineTo(x0 + W + 3 * S1, y0 - H * 0.6); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#FFD98A'; c.fillRect(x0 + W * 0.38, y0 - H * 0.42, W * 0.24, H * 0.2);
      });
      for (let i = 0; i < 6; i++) { const [x, y] = P(300 + i * 30, 270);
        c.fillStyle = '#9AA3A8'; c.fillRect(x - 9 * S1, y - 7 * S1, 18 * S1, 7 * S1);
        c.strokeStyle = '#4E8A3A'; c.lineWidth = Math.max(1, 2.5 * S1); c.beginPath(); c.moveTo(x, y - 7 * S1); c.lineTo(x, y - 20 * S1); c.stroke();
        c.fillStyle = '#7DB85A'; c.beginPath(); c.ellipse(x - 5 * S1, y - 20 * S1, 6 * S1, 3 * S1, -0.5, 0, TAU0); c.ellipse(x + 5 * S1, y - 22 * S1, 6 * S1, 3 * S1, 0.5, 0, TAU0); c.fill(); }
    }
    c.restore();
    // the plastic over it all: the prop again, faint, so the inside reads as behind the wall
    c.save(); c.globalAlpha = 0.28; c.drawImage(img, X, Y, w, h); c.restore();
    // the fairy lights shine through the plastic (and twinkle)
    if (bulbs) for (let i = 1; i < 40; i += 2) {
      const [x, y] = bulbs[i], tw = 0.65 + 0.35 * Math.sin(t / 14 + i * 1.3);
      const gr = c.createRadialGradient(x, y + 3, 0, x, y + 3, 12); gr.addColorStop(0, `rgba(255,214,120,${0.6 * tw})`); gr.addColorStop(1, 'rgba(255,214,120,0)');
      c.fillStyle = gr; c.fillRect(x - 12, y - 9, 24, 24);
      c.fillStyle = `rgba(255,240,180,${0.75 + 0.25 * tw})`; c.beginPath(); c.arc(x, y + 3, 2.6, 0, TAU0); c.fill();
    }
  }
  // [builder B] decor { gecko: 'lashes', pose: 'sleep' (default), len: px nose-to-tail, x, y, flip, after: 'frost' }:
  // after its fight a gecko dozes around the house (house.js DOZING), drawn with its rig plus a slow "z".
  drawGeckoDecor(c, d) {
    if (!d._rig) { d._rig = Geckos.create(d.gecko); Geckos.preload(d.gecko); }
    if (!Geckos.ready(d.gecko)) return;
    const rig = d._rig, x = (d.x + 0.5) * TILE, y = (d.y + 1) * TILE;
    rig.setPose(d.pose || 'sleep');
    rig.draw(c, x, y, rig.scaleFor(d.len || 300), d.flip ? 1 : -1);
    if ((d.pose || 'sleep') === 'sleep') {
      const t = (this.t % 150) / 150;
      c.save(); c.globalAlpha = Math.sin(t * Math.PI) * 0.8; c.fillStyle = '#5A4632'; c.font = `bold ${18 + 10 * t}px "Patrick Hand", sans-serif`;
      c.fillText('z', x + (d.flip ? 1 : -1) * (d.len || 300) * 0.3 + 10 * t, y - (d.len || 300) * 0.22 - 30 * t); c.restore();
    }
  }
  drawProp(c, prop, x, y, h, o = {}) {
    const img = S.get(propPath(prop));
    if (!img) return false;
    const w = h * img.width / img.height;
    c.save(); c.translate(x, y);
    if (o.rot) c.rotate(o.rot);
    if (o.flip) c.scale(-1, 1);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    c.drawImage(img, -w / 2, -h, w, h);
    c.restore();
    return true;
  }

  // hiding-spot art: entity { type: 'hide', x, y, w, art?: 'sock' | 'props/x.webp' | 'none' }
  hideArt(game, s) {
    const e = game.room.entities.find((en) => (en.type === 'hide' || en.type === 'hideSmall') && en.x * TILE === s.x);
    return hideArtOf(e, s.small);
  }
  drawHideSpot(c, game, s, front) {
    const art = this.hideArt(game, s);
    const cx = s.x + s.w / 2, by = s.y + s.h;
    if (art && art !== 'none') {
      const h = s.small ? 22 : Math.max(34, s.w * 0.55);
      if (this.drawProp(c, art, cx, by + 4, h, { alpha: front ? 0.97 : 1 })) return;
    }
    // code fallback: a dark gap (small: a crack at floor level)
    c.fillStyle = '#1E1612';
    if (s.small) { c.beginPath(); c.moveTo(cx - 9, by); c.lineTo(cx - 3, by - 16); c.lineTo(cx + 1, by - 9); c.lineTo(cx + 5, by - 18); c.lineTo(cx + 10, by); c.closePath(); c.fill(); }
    else { c.beginPath(); c.ellipse(cx, by, s.w * 0.45, s.h * 0.9, 0, Math.PI, 0); c.fill(); }
  }

  drawEntities(c, game) {
    const p = game.player, t = this.t;
    for (const z of game.loud || []) {
      c.strokeStyle = 'rgba(200,86,75,0.35)'; c.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const r = ((t * 1.2 + i * 18) % 70) + 10;
        c.beginPath(); c.arc(z.x + z.w / 2, z.y + z.h / 2, r, -0.7, 0.7); c.stroke();
        c.beginPath(); c.arc(z.x + z.w / 2, z.y + z.h / 2, r, Math.PI - 0.7, Math.PI + 0.7); c.stroke();
      }
      c.fillStyle = 'rgba(200,86,75,0.08)'; c.fillRect(z.x, z.y, z.w, z.h);
    }
    this.drawDecor(c, game, 'mid');
    // [issue 28] one sound hole per B marker (the rooms' decor no longer draws a second one beside it); the
    // hole the call is coming through right now swells and glows with each chirp (game.callPulse, main.js)
    const live = game.beacons?.length ? beaconSpec(game)?.target : null;
    for (const b of game.beacons || []) {
      const on = live && live.room === game.room.id && Math.abs(live.x - b.x) < 1 && Math.abs(live.y - b.y) < 1;
      const pu = on ? game.callPulse || 0 : 0;
      for (let i = 0; i < 3; i++) { const r = ((t * 0.6 + i * 12) % 36) + 4; c.strokeStyle = `rgba(244,235,221,${0.6 - r / 70})`; c.lineWidth = 2; c.beginPath(); c.arc(b.x, b.y, r, 0, 7); c.stroke(); }
      if (pu > 0.02) { c.fillStyle = `rgba(242,196,109,${0.35 * pu})`; c.beginPath(); c.arc(b.x, b.y, 16 + 10 * pu, 0, 7); c.fill(); }
      const img = S.get('props/sound-hole.webp'), w = 36 * (1 + 0.14 * pu);
      if (img) { const h = w * img.height / img.width; c.drawImage(img, b.x - w / 2, b.y - h / 2, w, h); }
      else { c.fillStyle = '#26303D'; c.beginPath(); c.ellipse(b.x, b.y, 7, 5, 0, 0, 7); c.fill(); }
    }
    for (const s of game.saves || []) {
      const img = S.get('props/save-crack.webp');
      c.fillStyle = `rgba(242,196,109,${0.25 + 0.15 * Math.sin(t / 20)})`; c.beginPath(); c.ellipse(s.x + 20, s.y + TILE - 14, 22, 26, 0, 0, 7); c.fill();
      if (img) { const h = 52, w = h * img.width / img.height; c.drawImage(img, s.x + 20 - w / 2, s.y + TILE - h + 4, w, h); continue; }
      c.fillStyle = '#1E1612'; c.beginPath(); c.moveTo(s.x + 14, s.y + TILE); c.lineTo(s.x + 18, s.y + 4); c.lineTo(s.x + 24, s.y + 10); c.lineTo(s.x + 27, s.y + TILE); c.fill();
    }
    for (const ck of game.checkpoints || []) {
      const x = ck.x + TILE / 2, y = ck.y + 2 * TILE;
      c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 30); c.stroke();
      const wv = Math.sin(t / 9) * 2;
      c.fillStyle = ck.on ? '#F2C46D' : 'rgba(244,235,221,0.7)'; c.strokeStyle = 'rgba(90,70,50,0.6)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y - 30); c.quadraticCurveTo(x + 8, y - 28 + wv, x + 15, y - 25 + wv); c.lineTo(x, y - 20); c.closePath(); c.fill(); c.stroke();
    }
    if (!game.boss?.notesOver) for (const sg of game.signs || []) if (noteLive(game, sg)) this.drawNote(c, game, sg); // [issue 9] notes on the path (was a signpost)
    for (const h of game.hooks || []) {
      const near = p.has('floss') && Math.hypot(h.x - p.cx, h.y - p.cy) < TILE * 2;
      if (near) { c.fillStyle = 'rgba(242,196,109,0.35)'; c.beginPath(); c.arc(h.x, h.y, 16 + Math.sin(t / 6) * 2, 0, 7); c.fill(); }
      const img = S.get('props/hook.webp');
      // the art is a screw-in cup hook (screw on the left); the hook's curve sits at the hook point
      if (img) { const w = 46, hh = w * img.height / img.width; c.drawImage(img, h.x - w * 0.62, h.y - hh * 0.62, w, hh); continue; }
      c.fillStyle = '#7A5636'; c.fillRect(h.x - 3, h.y - 14, 6, 8);
      c.strokeStyle = '#B08A4A'; c.lineWidth = 3.5; c.beginPath(); c.arc(h.x, h.y, 7, 0, 7); c.stroke();
    }
    for (const it of game.pickups || []) {
      const bob = Math.sin(t / 15) * 3;
      const cx = it.x + it.w / 2, cy = it.y + it.h / 2 + bob;
      if (it.kind === 'cage') { this.drawCage(c, it, game); continue; }
      const glow = c.createRadialGradient(cx, cy, 4, cx, cy, 30);
      glow.addColorStop(0, 'rgba(255,240,200,0.55)'); glow.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = glow; c.beginPath(); c.arc(cx, cy, 30, 0, 7); c.fill();
      const img = S.get(itemArt(it.item));
      if (img) { const s = 40 / Math.max(img.width, img.height); c.drawImage(img, cx - img.width * s / 2, cy - img.height * s / 2, img.width * s, img.height * s); continue; }
      c.fillStyle = ITEMS[it.item]?.color || '#fff'; c.strokeStyle = INK; c.lineWidth = 2;
      c.beginPath(); c.arc(cx, cy, 11, 0, 7); c.fill(); c.stroke();
    }
    for (const s of game.hideSpots || []) {
      const near = Math.abs(s.x + s.w / 2 - p.cx) < 70 && Math.abs(s.y + s.h - (p.y + p.h)) < 40;
      this.drawHideSpot(c, game, s, false);
      if (near && !p.hidden) {
        c.setLineDash([5, 4]); c.strokeStyle = `rgba(244,235,221,${0.6 + 0.3 * Math.sin(t / 8)})`; c.lineWidth = 2;
        c.beginPath(); c.ellipse(s.x + s.w / 2, s.y + s.h, s.w * 0.6, s.h * 1.3, 0, Math.PI, 0); c.stroke(); c.setLineDash([]);
      }
    }
    for (const d of game.doors || []) { c.fillStyle = '#2A1E16'; c.beginPath(); c.roundRect(d.x + 6, d.y + 10, TILE - 12, 2 * TILE - 10, [12, 12, 0, 0]); c.fill(); }
  }

  // [issue 34] A tip's marker (was #9's propped "!" paper): a round paper badge with an ink "?",
  // hovering at about head height over the note's spot (notes.js markerSpot), bobbing gently with a
  // soft warm glow and a small tail pointing down at the spot. Unread, it's bright and its glow
  // pulses; read, it's dimmer (still plain to see) and still. A script note's marker drops in and settles.
  drawNote(c, game, sg) {
    const read = this.view?.tipRead ? this.view.tipRead(sg) : false, t = this.t;
    const { r, bob, tail } = markerSize(sg, this.fx.touch), ph = notePhase(sg);
    const age = sg.born != null ? game.frame - sg.born : 1e9;
    let x = sg.mx ?? sg.nx, y = (sg.my ?? sg.ny - MARKER.hover.dy) + Math.sin(t / 22 + ph) * bob;
    if (age < 40) { const k = 1 - age / 40; y -= k * k * 2.5 * TILE; } // a script note drops in
    else if (age < 52) y -= Math.sin(((age - 40) / 12) * Math.PI) * 4; // and settles with a little hop
    const pulse = read ? 0 : 0.5 + 0.5 * Math.sin(t / 14 + ph);
    c.save();
    // the glow (warm, soft; it pulses while unread)
    const gr0 = r * (read ? 1.7 : 2.1 + 0.35 * pulse);
    c.globalCompositeOperation = 'lighter';
    const gr = c.createRadialGradient(x, y, r * 0.6, x, y, gr0);
    gr.addColorStop(0, `rgba(255,226,150,${read ? '0.16' : (0.34 + 0.22 * pulse).toFixed(2)})`); gr.addColorStop(1, 'rgba(232,184,90,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, gr0, 0, 7); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = read ? 0.62 : 1;
    const s = read ? 1 : 1 + 0.05 * pulse;
    c.translate(x, y); c.scale(s, s);
    // the badge: a paper disc with a little tail at the bottom (a speech bubble pointing at the spot)
    c.beginPath(); c.arc(0, 0, r, Math.PI * 0.5 + 0.38, Math.PI * 2.5 - 0.38);
    c.lineTo(0, r + tail); c.closePath();
    c.fillStyle = read ? '#E9DDC4' : '#F7E3A0'; c.fill();
    c.strokeStyle = '#2A201A'; c.lineWidth = 2.2; c.lineJoin = 'round'; c.stroke();
    // an inner ring, like a stamped seal
    c.strokeStyle = read ? 'rgba(90,70,50,0.35)' : 'rgba(176,120,50,0.55)'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(0, 0, r - 3.5, 0, 7); c.stroke();
    // the ink "?"
    c.fillStyle = '#2A1A10'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `bold ${Math.round(r * 1.55)}px "Patrick Hand", sans-serif`;
    c.fillText('?', 0, 1);
    c.restore();
  }
  drawCage(c, it, game) {
    const x = it.x, y = it.y, w = it.w, h = it.h;
    drawCricket(c, it.cricket, x + w / 2, y + h - 6, -1, { look: Math.floor(this.t / 200) % 2 ? 'listen' : 'idle', t: this.t, scale: 0.8 });
    const img = S.get('props/bamboo-cage.webp');
    if (img) { const ch = h + 12, cw = ch * img.width / img.height; c.drawImage(img, x + w / 2 - cw / 2, y + h - ch + 4, cw, ch); return; }
    c.strokeStyle = '#8C8F99'; c.lineWidth = 2;
    for (let i = 0; i <= 6; i++) { c.beginPath(); c.moveTo(x + (i * w) / 6, y + 6); c.lineTo(x + (i * w) / 6, y + h); c.stroke(); }
    c.beginPath(); c.moveTo(x, y + h); c.lineTo(x + w, y + h); c.moveTo(x, y + 6); c.quadraticCurveTo(x + w / 2, y - 10, x + w, y + 6); c.stroke();
    void game;
  }

  // ---- enemies: 2-frame walk (0.webp, 1.webp), the flipped frame (2.webp) when bonked ----
  drawEnemies(c, game) {
    for (const e of game.enemies || []) {
      if (e.state === 'gone') continue;
      c.save();
      c.globalAlpha = e.alpha;
      const cx = e.x + e.w / 2, by = e.y + e.h;
      c.translate(cx, by);
      const flipped = e.state === 'flipped';
      const rate = e.state === 'scurry' ? 4 : e.stun > 0 ? 9999 : (e.T.frameRate || 9);
      const fr = Math.floor(e.t / rate) % 2;
      const art = enemyFrames(e.T.sprite);
      let img = null, upside = false;
      if (flipped) { img = S.get(art[2]); if (!img) { img = S.get(art[0]); upside = !!img; } }
      else img = S.get(art[fr]) || S.get(art[0]);
      if (e.dir > 0) c.scale(-1, 1); // sprites face LEFT
      if (upside || (flipped && !img)) { c.translate(0, -e.h / 2); c.scale(1, -1); c.translate(0, e.h / 2); }
      if (img) {
        const dw = e.T.drawW || e.w * 1.35, s = dw / img.width;
        const bob = !flipped && e.stun <= 0 && fr ? -1 : 0;
        c.drawImage(img, -img.width * s / 2, -img.height * s + 2 + bob, img.width * s, img.height * s);
      } else if (e.type === 'beetle') {
        c.fillStyle = e.T.color; c.strokeStyle = '#000'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(4, -14, 24, 14, 0, Math.PI, 0); c.lineTo(28, -4); c.lineTo(-20, -4); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = e.T.dark; c.beginPath(); c.ellipse(-22, -10, 7, 6, 0, 0, 7); c.fill();
      } else {
        c.fillStyle = e.T.color; c.strokeStyle = e.T.dark; c.lineWidth = 1.5;
        c.beginPath(); c.ellipse(9, -8, 8, 6, 0, 0, 7); c.fill(); c.stroke();
        c.beginPath(); c.ellipse(-2, -8, 5, 4, 0, 0, 7); c.fill();
        c.beginPath(); c.ellipse(-11, -9, 5.5, 5, 0, 0, 7); c.fill(); c.stroke();
      }
      c.restore();
      if (e.stun > 0) this.drawStars(c, cx, e.y - 6);
    }
  }
  drawStars(c, x, y) {
    for (let i = 0; i < 3; i++) {
      const a = this.t / 10 + (i * Math.PI * 2) / 3;
      c.fillStyle = '#F2C46D'; c.beginPath(); c.arc(x + Math.cos(a) * 12, y + Math.sin(a) * 4, 3, 0, 7); c.fill();
    }
  }

  // ---- NPCs (Not-Crickets, recruits): idle / talk flap ----
  // drawNPC(ctx, 'peeper', x, feetY, { talking, h: px tall (default 46), facing: 1|-1, t })
  drawNPC(c, name, x, y, o = {}) {
    const img = S.get(npcFrame(name, o.talking, o.t ?? this.t)) || S.get(`sprites/npcs/${name}.webp`);
    if (!img) return false;
    const h = o.h || 46, w = h * img.width / img.height;
    const bob = Math.abs(Math.sin(((o.t ?? this.t) + hash(name) % 100) / 9)) * (o.bob ?? 2);
    c.save(); c.translate(x, y - bob); c.scale(o.facing || 1, 1);
    c.drawImage(img, -w / 2, -h + 2, w, h);
    c.restore();
    return true;
  }

  // ---- the cricket ----
  // Picks the look from the player state (render-side timers only; the sim is read, never written).
  playerLook(game) {
    const p = game.player, pa = this.pa, t = this.t;
    if (p.state !== pa.state) { pa.state = p.state; pa.since = t; }
    for (const e of game.fx) if (e.type === 'chirp' && !e._pl) { e._pl = true; pa.chirpF = t; }
    const st = p.state, age = t - pa.since;
    const o = { look: 'idle', at: 'feet', rot: 0, squash: p.squash, frame: undefined, sheet: false, shade: 0 };
    const kicking = p.kickT > 0;
    if (st === 'ground' || st === 'charge') {
      if (kicking) { o.look = 'kick'; o.frame = Math.min(3, Math.floor((1 - p.kickT / 10) * 4)); }
      else if (t - pa.chirpF < 30) o.look = 'chirp';
      else if (Math.abs(p.vx) > 20) o.look = 'run';
      else if (p.listening) o.look = 'listen';
      else o.look = 'idle';
      if (st === 'charge' || p.crouchFrames > 0) { o.squash = Math.max(o.squash, st === 'charge' ? 0.26 : 0.16); if (o.look !== 'run') o.look = 'idle'; }
      if (st === 'ground' && p.stats?.perk === 'dig' && p.crouchFrames > 20) o.look = 'dig';
    } else if (st === 'air') {
      if (p.gliding) { o.look = 'glide'; o.sheet = true; }
      else if (kicking) { o.look = 'kick'; o.frame = Math.min(3, Math.floor((1 - p.kickT / 10) * 4)); }
      else if (p.vy < 0 && (p.jumpHeldFrames ?? 99) < 12) { o.look = 'jump'; o.frame = Math.min(3, Math.floor((p.jumpHeldFrames || 0) / 3)); }
      else o.look = 'leap';
      // stretch while rising fast, a little squash at the apex
      const v = Math.max(-1, Math.min(1, p.vy / 900));
      o.squash += v < 0 ? v * 0.12 : 0;
      if (!p.gliding) o.rot = Math.max(-0.45, Math.min(0.45, p.vy / 1500)) * p.facing;
    } else if (st === 'cling') { o.look = 'cling'; o.at = 'wall'; }
    else if (st === 'wallrun') { o.look = 'run'; o.at = 'center'; o.rot = -p.clingDir * Math.PI / 2; }
    else if (st === 'swing') { o.look = 'hang'; o.at = 'hands'; o.rot = p.swing ? -p.swing.ang : 0; }
    else if (st === 'pound') o.look = 'pound';
    else if (st === 'hide') {
      // tuck in (hide loop once), then hold tucked; peek out now and then
      const hideLen = 24;
      if (age < hideLen) { o.look = 'hide'; o.frame = Math.floor(age / 6); }
      else if ((age - hideLen) % 200 > 150) { o.look = 'peek'; o.frame = Math.floor(((age - hideLen) % 200 - 150) / 13); }
      else { o.look = 'hide'; o.frame = 3; }
      const pk = game.boss?.peekAt ?? -1; // [issue 25] the escape: he peeks out as she falls asleep
      if (pk >= 0 && game.frame >= pk && game.frame - pk < 52) { o.look = 'peek'; o.frame = Math.min(3, Math.floor((game.frame - pk) / 13)); }
      o.shade = 0.5; o.squash = 0.06; o.alpha = 0.92; // tucked into the spot's shadow (drawn over its art)
    }
    return o;
  }
  drawPlayer(c, game) {
    const p = game.player;
    if (game.boss?.pipGone) return; // [issue 25] eaten (a sand puff, then black)
    if (p.invuln > 0 && p.invuln % 8 < 3 && p.state !== 'hide') return;
    const o = this.playerLook(game);
    let x = p.cx, y = p.y + p.h;
    if (p.state === 'swing' && p.swing) {
      const h = p.swing.hook;
      c.strokeStyle = 'rgba(250,250,246,0.95)'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(h.x, h.y); c.quadraticCurveTo((h.x + p.cx) / 2 + 2, (h.y + p.cy) / 2, p.cx, p.cy - 10); c.stroke();
      x = p.cx; y = p.cy - 12;
    }
    if (o.at === 'wall') { x = p.clingDir > 0 ? p.x + p.w : p.x; y = p.cy; }
    if (o.at === 'center') { x = p.cx; y = p.cy; }
    const facing = o.at === 'wall' ? p.clingDir : p.facing;
    // [builder C] the Cellophane Cloak: a faint crinkly shimmer
    if (p.cloakT > 0) { o.alpha = 0.18 + 0.07 * Math.sin(this.t / 5); o.shade = 0.2; }
    drawCricket(c, p.id, x, y, facing, { ...o, t: this.t, vx: p.vx, vy: p.vy, leap: 0 });
    if (p.cloakT > 0) { c.save(); c.strokeStyle = `rgba(201,214,232,${0.35 + 0.2 * Math.sin(this.t / 4)})`; c.lineWidth = 1.5; c.setLineDash([3, 5]); c.beginPath(); c.ellipse(p.cx, p.cy - 4, 24, 18, 0, 0, 7); c.stroke(); c.restore(); }
    else if (p.cloakCd > 0 && p.has?.('cloak')) { const k = 1 - p.cloakCd / 360; c.save(); c.strokeStyle = 'rgba(201,214,232,0.55)'; c.lineWidth = 2; c.beginPath(); c.arc(p.cx, p.y - 10, 7, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); c.stroke(); c.restore(); }
    if (p.stats?.perk === 'hugeLeap' && p.crouchFrames > 0) { const k = Math.min(1, p.crouchFrames / 24); c.strokeStyle = '#F2C46D'; c.lineWidth = 3; c.beginPath(); c.arc(p.cx, p.y + p.h - 12, 28, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); c.stroke(); }
    if (p.state === 'charge') { c.strokeStyle = '#D99A3E'; c.lineWidth = 3; c.beginPath(); c.arc(p.cx, p.y + p.h - 10, 22, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    if (p.queuedSwap != null) { c.strokeStyle = `rgba(244,235,221,${0.5 + 0.5 * Math.sin(this.t / 4)})`; c.lineWidth = 2; c.beginPath(); c.arc(p.cx, p.y + p.h - 14, 26, 0, 7); c.stroke(); }
  }

  // Compatibility wrapper (hub.js, bosses): feet at (x, y). o.pose = a look name.
  drawCricketAt(c, id, x, y, facing, o = {}) {
    const look = o.look || o.pose || 'idle';
    drawCricket(c, id, x, y, facing, { ...o, look, sheet: o.sheet ?? look === 'glide', t: o.t ?? this.t });
  }
  drawCricketShape(c, cr, o, t) { drawCricketShape(c, cr, o.pose || o.look, t); }

  // darkness: one radial-gradient fill over the view (no offscreen canvas: cheap on phones)
  drawDark(c, game) {
    const p = game.player, cam = game.camera;
    const sx = (p.cx - cam.x) * cam.zoom, sy = (p.cy - cam.y) * cam.zoom;
    const r = (p.has('glow') ? 240 : 60) * cam.zoom * (1 + 0.03 * Math.sin(this.t / 10));
    const grad = c.createRadialGradient(sx, sy, r * 0.25, sx, sy, r);
    grad.addColorStop(0, 'rgba(8,10,18,0)'); grad.addColorStop(1, 'rgba(8,10,18,0.95)');
    c.fillStyle = grad; c.fillRect(0, 0, VW, VH);
    // beacons glow through the dark
    for (const b of game.beacons || []) {
      const bx = (b.x - cam.x) * cam.zoom, by = (b.y - cam.y) * cam.zoom;
      if (bx < -60 || bx > VW + 60 || by < -60 || by > VH + 60) continue;
      const gg = c.createRadialGradient(bx, by, 2, bx, by, 50); gg.addColorStop(0, 'rgba(244,235,221,0.5)'); gg.addColorStop(1, 'rgba(244,235,221,0)');
      c.fillStyle = gg; c.beginPath(); c.arc(bx, by, 50, 0, 7); c.fill();
    }
    // [issue 9, 34] a note's marker shows through the dark too, the way beacons do (drawn again over the
    // darkness, glow and all: a read one is dimmer and still)
    c.save(); c.scale(cam.zoom, cam.zoom); c.translate(-Math.round(cam.x), -Math.round(cam.y));
    for (const sg of game.signs || []) if (noteLive(game, sg)) this.drawNote(c, game, sg);
    c.restore();
    if (p.has('glow')) { const gl = c.createRadialGradient(sx, sy, 4, sx, sy, r * 0.7); gl.addColorStop(0, 'rgba(207,242,122,0.10)'); gl.addColorStop(1, 'rgba(207,242,122,0)'); c.fillStyle = gl; c.beginPath(); c.arc(sx, sy, r * 0.7, 0, 7); c.fill(); }
  }

  // room transitions: an ink wash that drains away (wipe), a fade, a paper blink
  drawTransition(c, game) {
    const tr = game.trans;
    if (!tr) return;
    const k = tr.f / tr.dur;
    if (tr.kind === 'wipe') {
      const e = 1 - (1 - k) * (1 - k);
      const edge = VW * (1 - e) + 60;
      c.fillStyle = `rgba(42,32,26,${0.92 * (1 - k * 0.5)})`;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(edge + 40, 0);
      for (let y = 0; y <= VH; y += 24) c.lineTo(edge + 34 * Math.sin(y / 47 + k * 5) + 14 * Math.sin(y / 13 + k * 9), y);
      c.lineTo(0, VH); c.closePath(); c.fill();
      // pigment bloom along the wet edge
      c.fillStyle = `rgba(42,32,26,${0.35 * (1 - k)})`;
      for (let y = 0; y <= VH; y += 48) { const x = edge + 34 * Math.sin(y / 47 + k * 5); c.beginPath(); c.arc(x + 18, y, 16 + 8 * Math.sin(y + k * 7), 0, 7); c.fill(); }
    } else if (tr.kind === 'fade') { c.fillStyle = `rgba(20,16,14,${1 - k})`; c.fillRect(0, 0, VW, VH); }
    else if (tr.kind === 'blink') { c.fillStyle = `rgba(244,235,221,${0.6 * (1 - k)})`; c.fillRect(0, 0, VW, VH); }
  }

  drawDebug(c, game) {
    const p = game.player;
    c.strokeStyle = 'lime'; c.lineWidth = 1; c.strokeRect(p.x, p.y, p.w, p.h);
    const kb = p.kickBox(); if (kb) { c.strokeStyle = 'red'; c.strokeRect(kb.x, kb.y, kb.w, kb.h); }
    for (const e of game.enemies) { c.strokeStyle = 'orange'; c.strokeRect(e.x, e.y, e.w, e.h); }
    if (p.lastSafe) { c.strokeStyle = 'cyan'; c.strokeRect(p.lastSafe.x, p.lastSafe.y, p.w, p.h); }
  }
}

// NPC talk frames: the path to draw this frame (talk flap alternates ~7.5/s while talking).
// For DOM dialog portraits too: <img src="assets/` + npcFrame(name, talking, frame) + `">.
export function npcFrame(name, talking, t = 0) {
  const flap = talking && Math.floor(t / 8) % 2;
  const talk = `sprites/npcs/${name}-talk.webp`;
  return flap && S.exists(talk) ? talk : `sprites/npcs/${name}.webp`;
}

// [polish] a soft, slightly wobbly rounded box (screen-local px) and its top edge (for the rim)
function roundBox(b, r, ox, oy) {
  const p = new Path2D(), pts = [];
  const { L, W, H } = b, Tp = b.T;
  const seg = (x1, y1, x2, y2) => { const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 10)); for (let i = 0; i < n; i++) pts.push([x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]); };
  const arc = (cx, cy, a0) => { for (let i = 0; i < 6; i++) { const a = a0 + (i / 6) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  seg(L + r, Tp, L + W - r, Tp); arc(L + W - r, Tp + r, -Math.PI / 2); seg(L + W, Tp + r, L + W, Tp + H - r); arc(L + W - r, Tp + H - r, 0);
  seg(L + W - r, Tp + H, L + r, Tp + H); arc(L + r, Tp + H - r, Math.PI / 2); seg(L, Tp + H - r, L, Tp + r); arc(L + r, Tp + r, Math.PI);
  const cx = L + W / 2, cy = Tp + H / 2;
  pts.forEach(([x, y], i) => { const d = Math.hypot(x - cx, y - cy) || 1, n = 2.6 * (wob(x + ox, y + oy, false) - 0.3); const xx = x + (x - cx) / d * n, yy = y + (y - cy) / d * n; i ? p.lineTo(xx, yy) : p.moveTo(xx, yy); });
  p.closePath();
  return p;
}
function topArc(b, r, ox, oy) {
  const p = new Path2D(); const { L, W } = b, Tp = b.T;
  for (let x = L + r * 0.6, i = 0; x <= L + W - r * 0.6; x += 10, i++) { const y = Tp + 3 - 2.6 * (wob(x + ox, Tp + oy, false) - 0.3); i ? p.lineTo(x, y) : p.moveTo(x, y); }
  return p;
}

// paper grain tile (multiplied over painted shapes)
function makeGrain() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const d = g.createImageData(128, 128);
  let s = 12345;
  const r = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let i = 0; i < 128 * 128; i++) {
    const v = 235 + r() * 20 - (r() < 0.06 ? 30 : 0);
    d.data[i * 4] = v; d.data[i * 4 + 1] = v * 0.98; d.data[i * 4 + 2] = v * 0.95; d.data[i * 4 + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  // soft fibres
  g.strokeStyle = 'rgba(150,130,100,0.12)'; g.lineWidth = 1;
  for (let i = 0; i < 40; i++) { const x = r() * 128, y = r() * 128, a = r() * 6.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10); g.stroke(); }
  return c;
}
