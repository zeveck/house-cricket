// Rooms and zones: parses data/rooms/*.js ASCII grids (32x18 tiles per screen), places
// rooms on the house-wide grid of screen cells, resolves exits by adjacency, and runs the
// camera. No DOM.
import { TILE, SCREEN_W, SCREEN_H } from '../data/movement.js';
import { K, CHAR_KIND, Grid } from './physics.js';

export const SCREEN_PX_W = SCREEN_W * TILE; // 1280
export const SCREEN_PX_H = SCREEN_H * TILE; // 720

// Grid markers that become entities (the tile under them becomes empty).
export const MARKERS = {
  P: 'start',      // player start (feet on the tile below the marker's row bottom)
  H: 'hook',       // floss hook: the hook point is the middle of the tile
  h: 'hide',       // hiding spot sitting on the floor of this tile
  m: 'hideSmall',  // hiding spot only Mote fits
  k: 'checkpoint', // soft checkpoint
  S: 'save',       // save crack
  B: 'beacon',     // sound hole / beacon target
};

export class Room {
  constructor(def, zone) {
    this.def = def; this.zone = zone;
    this.id = def.id; this.name = def.name || def.id;
    this.cx = def.x; this.cy = def.y;            // screen-cell position in the house
    const rows = def.grid;
    this.th = rows.length; this.tw = Math.max(...rows.map((r) => r.length));
    if (this.tw % SCREEN_W || this.th % SCREEN_H) throw new Error(`room ${def.id}: grid ${this.tw}x${this.th} is not a multiple of 32x18`);
    this.sw = this.tw / SCREEN_W; this.sh = this.th / SCREEN_H; // size in screens
    this.pw = this.tw * TILE; this.ph = this.th * TILE;
    this.dark = !!def.dark; this.needs = def.needs || null; this.needsMsg = def.needsMsg || null;
    this.base = new Uint8Array(this.tw * this.th);
    this.markers = [];
    for (let y = 0; y < this.th; y++) {
      const row = rows[y] || '';
      for (let x = 0; x < this.tw; x++) {
        const ch = row[x] ?? '.';
        if (MARKERS[ch]) { this.markers.push({ type: MARKERS[ch], x, y }); this.base[y * this.tw + x] = K.EMPTY; continue; }
        const k = CHAR_KIND[ch];
        if (k === undefined) throw new Error(`room ${def.id}: unknown char '${ch}' at ${x},${y}`);
        this.base[y * this.tw + x] = k;
      }
    }
    this.entities = [...this.markers.map((m) => ({ ...m })), ...(def.entities || []).map((e) => ({ ...e }))];
    // [mech] terrain entities paint their tiles for the renderer (def.paint), unless the room already does
    const auto = [];
    for (const e of this.entities) {
      const kind = e.type === 'terrain' ? ({ crumble: 'crumbling-floor' }[e.kind] || e.kind) : e.type === 'piano' ? null : null;
      if (kind && !(def.paint || []).some((p) => p.x === e.x && p.y === e.y && p.kind === kind)) auto.push({ kind, x: e.x, y: e.y, w: e.w || 1, h: e.h || 1 });
    }
    if (auto.length) this.def = { ...def, paint: [...(def.paint || []), ...auto] };
  }
  // world pixel origin
  get wx() { return this.cx * SCREEN_PX_W; }
  get wy() { return this.cy * SCREEN_PX_H; }
  containsCell(cx, cy) { return cx >= this.cx && cx < this.cx + this.sw && cy >= this.cy && cy < this.cy + this.sh; }
}

export class World {
  constructor(zoneModules) {
    this.zones = {};
    this.rooms = {};
    this.cells = new Map();
    for (const z of zoneModules) this.addZone(z);
  }
  addZone(z) {
    this.zones[z.id] = z;
    for (const def of z.rooms) {
      const r = new Room(def, z);
      if (this.rooms[r.id]) throw new Error(`duplicate room id ${r.id}`);
      this.rooms[r.id] = r;
      for (let y = 0; y < r.sh; y++) for (let x = 0; x < r.sw; x++) {
        const key = `${r.cx + x},${r.cy + y}`;
        if (this.cells.has(key)) throw new Error(`rooms ${this.cells.get(key).id} and ${r.id} overlap at cell ${key}`);
        this.cells.set(key, r);
      }
    }
  }
  roomAtCell(cx, cy) { return this.cells.get(`${cx},${cy}`) || null; }
  // The room containing a world-pixel point.
  roomAtPoint(wx, wy) { return this.roomAtCell(Math.floor(wx / SCREEN_PX_W), Math.floor(wy / SCREEN_PX_H)); }

  // A live grid for a room: its tiles (with broken tiles removed) and neighbours' tiles
  // beyond its edges, so movement across an exit is seamless.
  makeGrid(room, broken) {
    const data = room.base.slice();
    if (broken) for (const key of broken) data[key] = K.EMPTY;
    const self = this;
    const oob = (tx, ty) => {
      const wtx = room.cx * SCREEN_W + tx, wty = room.cy * SCREEN_H + ty;
      const n = self.roomAtCell(Math.floor(wtx / SCREEN_W), Math.floor(wty / SCREEN_H));
      if (n && n !== room) {
        const lx = wtx - n.cx * SCREEN_W, ly = wty - n.cy * SCREEN_H;
        const hk = self.tileHook ? self.tileHook(n, lx, ly) : null; // [mech] shut gates of the neighbour
        return hk ?? n.base[ly * n.tw + lx];
      }
      return ty >= room.th ? K.EMPTY : K.SOLID; // nothing below = a pit; nothing beside/above = wall
    };
    return new Grid(room.tw, room.th, data, oob);
  }

  // Exits of a room: open edge spans that lead to a neighbour (for check-world and the map).
  exits(room) {
    const out = [];
    const edge = (side, len, at) => {
      let run = null;
      for (let i = 0; i <= len; i++) {
        const info = i < len ? at(i) : null;
        if (info) { if (run && run.to === info.to.id) run.end = i; else { if (run) out.push(run); run = { side, start: i, end: i, to: info.to.id }; } }
        else if (run) { out.push(run); run = null; }
      }
    };
    const open = (k) => k !== K.SOLID && k !== K.SLICK && k !== K.CEREAL && k !== K.CRACK && k !== K.SOIL;
    const nb = (tx, ty) => this.roomAtCell(Math.floor((room.cx * SCREEN_W + tx) / SCREEN_W), Math.floor((room.cy * SCREEN_H + ty) / SCREEN_H));
    edge('left', room.th, (y) => { const n = nb(-1, y); return n && n !== room && open(room.base[y * room.tw]) ? { to: n } : null; });
    edge('right', room.th, (y) => { const n = nb(room.tw, y); return n && n !== room && open(room.base[y * room.tw + room.tw - 1]) ? { to: n } : null; });
    edge('top', room.tw, (x) => { const n = nb(x, -1); return n && n !== room && open(room.base[x]) ? { to: n } : null; });
    edge('bottom', room.tw, (x) => { const n = nb(x, room.th); return n && n !== room && open(room.base[(room.th - 1) * room.tw + x]) ? { to: n } : null; });
    return out;
  }
}

// Camera: follows with look-ahead, clamps to the room, keeps the cricket in the upper-middle
// on touch devices. Coordinates are room pixels; view size is the logical view (1280x720 / zoom).
// Render-only: the sim never reads the camera (replays are unchanged by anything here).
// [polish-V] rewritten (replaces the [final-G]/[final-2] 40%/62% touch rule):
//   - hFrac: the view's height as a fraction of 720 (a phone's wide screen shows 1280 x ~590).
//   - touch: the cricket sits ~68% down (the floor ~73%), so little below-floor fill shows; he is never
//     under a thumb button or the HUD: `avoid` holds those rects (view fractions, main.js measures the DOM)
//     and update() pushes the view (sideways past the room's edge, which render.js fills) until the
//     cricket plus a tile round him clears them.
//   - gecko arenas (all sizes): frame the boss (`game.boss.focus()`, a room-px rect) and the cricket
//     together, zooming out a little (to 0.8x) when they are far apart, the boss kept out of the HUD band
//     and (touch) the button column; when they can't both fit the cricket wins and the view leans to the boss.
//   - the Carrier never runs past its floor (its sides are the dark room round the keeper).
export class Camera {
  constructor() {
    this.x = 0; this.y = 0; this.look = 0; this._zoom = 1; this.hFrac = 1; this.touchBias = false; this.shake = 0; this.lookV = 0;
    this.fitH = false; this.fz = 1; this.avoid = []; this.game = null; // [polish-V] fz: arena framing zoom (x base); game: set by main.js
  }
  set zoom(v) { this._zoom = v; }
  // [final-G] a gecko arena on a wide touch screen is 720 tall (zoom = hFrac); [polish-V] times the framing zoom
  get baseZoom() { return this.fitH && this.touchBias && this.hFrac < 1 ? this.hFrac : this._zoom; }
  get zoom() { return this.baseZoom * this.fz; }
  setRoom(room) {
    const d = room?.def || {};
    this.fitH = !!(d.entities || []).some((e) => e.type === 'boss' && e.boss !== 'tank');
    this.framed = !!(d.entities || []).some((e) => e.type === 'boss'); // [polish-V] the tank's Duchess too
    this.noOver = /^carrier-/.test(room?.id || '') || d.camera?.overscroll === false;
    this.hub = /^carrier-/.test(room?.id || '');
    this.fz = 1; this._fzT = 1; this.introT = 0;
  }
  get vw() { return SCREEN_PX_W / this.zoom; }
  get vh() { return SCREEN_PX_H * this.hFrac / this.zoom; }
  sync(room) { if (this._room !== room) { this._room = room; this.setRoom(room); } }
  // [polish-V] the boss to frame (a room-px rect {x0, y0, x1, y1}) or null
  bossRect() {
    const b = this.game?.boss;
    if (!b || b.done) return null;
    const r = typeof b.focus === 'function' ? b.focus() : b.rig?.lastBox; // the tank's set pieces: the rig's box
    return r && Number.isFinite(r.x0) && Number.isFinite(r.y1) ? r : null;
  }
  // [polish-V] the safe band of the view (fractions) for the framed pair: below the HUD, left of the
  // touch buttons' column
  safe() {
    let top = this.touchBias ? 0.16 : 0.1, right = 0.97;
    for (const r of this.avoid) {
      if (r.kind === 'btn') right = Math.min(right, r.x0 - 0.02);
      else if (r.x1 - r.x0 > 0.12) top = Math.max(top, r.y1 + 0.01);
    }
    return { l: 0.03, r: Math.max(0.5, right), t: top, b: 0.97 };
  }
  pipRect(p) { const m = 40; return { x0: p.x - m, y0: p.y - m, x1: p.x + p.w + m, y1: p.y + p.h + m }; }
  touchFrac() { return this.touchBias ? 0.68 : 0.55; }
  target(p, room) {
    this.sync(room);
    const ahead = p.facing * 90 * Math.min(1, Math.abs(p.vx) / 150 + 0.4);
    let tx = p.cx + this.look - this.vw / 2;
    let ty = p.cy - this.vh * this.touchFrac() + this.lookV;
    const B = this.framed ? this.bossRect() : null;
    this._fzT = 1;
    if (B && this.game?.boss?.chase) {
      // [issue 25] the tank's chase: no look-ahead; Pip in the third of the view away from her, so she's in
      // view behind him (the script draws her eye glinting at the edge if her head is off it)
      const behind = (B.x0 + B.x1) / 2 < p.cx;
      tx = p.cx - (behind ? 0.68 : 0.32) * this.vw;
      return { tx, ty, ahead: 0, chase: true };
    }
    if (B) {
      // [polish-V] frame the boss and the cricket together
      // the first 2.5 s in an arena: an establishing shot (down to 0.5x) so the boss is seen from the start
      const intro = this.fitH && this.introT < 150;
      const P = this.pipRect(p), s = this.safe(), vw = this.vw, vh = this.vh;
      const U = { x0: Math.min(P.x0, B.x0), y0: Math.min(P.y0, B.y0), x1: Math.max(P.x1, B.x1), y1: Math.max(P.y1, B.y1) };
      const sw = (s.r - s.l) * vw, sh = (s.b - s.t) * vh;
      const uw = U.x1 - U.x0, uh = U.y1 - U.y0;
      // the usual framing, moved only as far as it takes to bring the pair into the safe band
      if (uw <= sw) tx = Math.max(U.x1 - s.r * vw, Math.min(U.x0 - s.l * vw, tx));
      else if (intro) tx = (B.x0 + B.x1) / 2 > p.cx ? Math.min(P.x0, B.x1 - s.r * vw) : Math.max(P.x1 - vw, B.x0 - s.l * vw); // the boss in, the cricket at the very edge
      else tx = (B.x0 + B.x1) / 2 > p.cx ? P.x0 - s.l * vw : P.x1 - s.r * vw;
      if (uh <= sh) ty = Math.max(U.y1 - s.b * vh, Math.min(U.y0 - s.t * vh, ty));
      else ty = (B.y0 + B.y1) / 2 < p.cy ? P.y1 - s.b * vh : P.y0 - s.t * vh;
      // zoom out (to 0.8x) when they don't fit; back in when they do
      const k0 = this.fz, need = Math.min(sw / uw, sh / Math.max(1, uh)) * k0;
      this._fzT = this.fitH ? Math.max(intro ? 0.5 : 0.8, Math.min(1, need)) : 1; // (the tank keeps its zoom)
    }
    return { tx, ty, ahead };
  }
  // overscroll allowances (room px): how far the view may run past each edge
  over(room) {
    const vw = this.vw, vh = this.vh, t = this.touchBias;
    if (this.hub) return { l: t ? vw * 0.2 : 0, r: t ? vw * 0.45 : 0, t: 0, b: 0 };
    // an arena: below its floor only what a zoomed-out view needs (capped at a quarter of the view)
    if (this.fitH) return { l: t ? vw * 0.2 : 0, r: t ? vw * 0.45 : 0, t: vh * 0.03, b: Math.min(vh * 0.25, Math.max(0, vh - room.ph)) + vh * 0.02 };
    if (!t || this.noOver) return { l: 0, r: 0, t: 0, b: 0 };
    return { l: vw * 0.2, r: vw * 0.45, t: vh * 0.3, b: vh * 0.32 };
  }
  // keep the view on the room; `soft`: only the bottom/top allowance (the framing), not the sideways one
  clamp(room, soft = true) {
    this.sync(room);
    const o = this.over(room), vw = this.vw, vh = this.vh;
    const ol = soft ? 0 : o.l, or = soft ? 0 : o.r, ot = soft ? Math.min(o.t, vh * 0.04) : o.t;
    if (room.pw + ol + or <= vw) this.x = (room.pw - vw) / 2;
    else this.x = Math.max(-ol, Math.min(this.x, room.pw - vw + or));
    const y0 = -ot, y1 = room.ph - vh + o.b;
    if (y1 < y0) this.y = (y0 + y1) / 2;
    else this.y = Math.max(y0, Math.min(this.y, y1));
  }
  // [polish-V] push the view until the cricket (+ a tile round him) is clear of every HUD/button rect
  keepClear(p, room) {
    if (!this.touchBias || !this.avoid.length) return;
    const vw = this.vw, vh = this.vh, P = this.pipRect(p), e = 0.004;
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (const r of this.avoid) {
        const a = { x0: (P.x0 - this.x) / vw, y0: (P.y0 - this.y) / vh, x1: (P.x1 - this.x) / vw, y1: (P.y1 - this.y) / vh };
        if (a.x1 <= r.x0 || a.x0 >= r.x1 || a.y1 <= r.y0 || a.y0 >= r.y1) continue;
        // buttons (bottom right): slide the view right, he moves left of them. HUD (top): the shorter way
        // of moving him below it or beside it
        const dxR = (a.x1 - r.x0 + e) * vw, dxL = (r.x1 - a.x0 + e) * vw, dyU = (r.y1 - a.y0 + e) * vh;
        if (r.kind === 'btn') this.x += dxR;
        else if (r.x0 < 0.5 ? dxL < dyU : dxR < dyU) this.x += r.x0 < 0.5 ? -dxL : dxR;
        else this.y -= dyU;
        moved = true;
      }
      this.clamp(room, false);
      if (!moved) break;
    }
  }
  snap(p, room) {
    this.look = p.facing * 60;
    for (let i = 0; i < 2; i++) { // [final-2] twice: the framing reads the view's x
      const t = this.target(p, room); this.fz = this._fzT; this.x = t.tx; this.y = t.ty; this.clamp(room);
    }
    this.keepClear(p, room);
  }
  update(p, room, inp) {
    this.introT++; // [polish-V]
    const t0 = this.target(p, room);
    this.look += (t0.ahead - this.look) * 0.05;
    // look up/down while standing still holding up/down ([issue #27] look-up: stick / D-pad up only; ↑ jumps)
    const still = p.state === 'ground' && Math.abs(p.vx) < 5;
    this._lookHold = still && (inp.held.lookUp || (inp.held.down && p.stats.perk !== 'hugeLeap')) ? (this._lookHold || 0) + 1 : 0;
    const want = this._lookHold > 24 ? (inp.held.lookUp ? -160 : 160) : 0;
    this.lookV += (want - this.lookV) * 0.08;
    // [polish-V] the framing zoom eases (about the view's centre)
    if (Math.abs(this._fzT - this.fz) > 1e-4) {
      const cx = this.x + this.vw / 2, cy = this.y + this.vh / 2;
      this.fz += (this._fzT - this.fz) * 0.04;
      this.x = cx - this.vw / 2; this.y = cy - this.vh / 2;
    }
    const t = this.target(p, room);
    if (t.chase) this.look = 0; // [issue 25] the chase has no look-ahead
    this.x += (t.tx - this.x) * 0.14;
    const fy = p.state === 'ground' || p.state === 'cling' || p.state === 'hide' ? 0.1 : (p.vy > 300 ? 0.2 : 0.06);
    this.y += (t.ty - this.y) * fy;
    // never let the cricket leave a band of the view
    const marginY = this.vh * 0.18;
    if (p.cy - this.y < marginY) this.y = p.cy - marginY;
    if (p.cy - this.y > this.vh - marginY) this.y = p.cy - (this.vh - marginY);
    this.clamp(room);
    this.keepClear(p, room); // [polish-V]
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 1);
  }
}

// A deterministic random per room (replays must not depend on Math.random).
export function seeded(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return rngFrom(s || 1);
}
// [issue 11] A module constant that sim state may point at (and compare by identity): deep-frozen,
// so a rewind (src/rewind.js) shares it instead of copying it. Returns obj.
export function constant(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) { Object.freeze(obj); for (const v of Object.values(obj)) constant(v); }
  return obj;
}
// [issue 11] The generator from its raw state. rngState() reads that state, so a rewind snapshot
// (src/rewind.js) can copy a generator that is part way through its sequence.
export function rngFrom(s) {
  const r = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  r.rngState = () => s;
  return r;
}
