// The gameplay simulation: one room at a time, the player, enemies, pickups, gates,
// transitions, pits, checkpoints. Fixed 60 Hz steps; deterministic (no Math.random, no
// wall-clock). No DOM, so node tools can run it headless.
import { TILE, FPS } from '../data/movement.js';
import { CRICKETS } from '../data/crickets.js';
import { ITEMS } from '../data/items.js';
import { K, clump, groundUnder } from './physics.js';
import { World, Camera } from './world.js';
import { Player } from './player.js';
import { spawnEnemy, updateEnemies, kickEnemies, stunEnemies, flashEnemies, overlap } from './enemies.js';
import * as Mech from './mechanics.js'; // [mech] gates, switches, lifts, springs, terrain, thermostats, decoys
import { BOSSES } from './bosses/index.js';
import { LAIRS } from '../data/house.js'; // [final-2] bossBeaten
import { targetInRoom as beaconTargetInRoom } from './beacon.js'; // [audio] beacon target
import { makeSign, floorProps, markerObstacles } from './notes.js'; // [issue 9] tutorial notes on the path

// [issue #27] The player's view of the input: the keyboard's ↑ / W ('upJump') is Jump, except on a hanging
// line, where it climbs (it is 'up' too) and never lets go. Its hold counts as Jump (variable height,
// glide) only after a press that jumped, so ↑ still held from a climb doesn't glide after a fling.
export function playerFrame(inp, p) {
  if (!inp.pressed.upJump && !inp.held.upJump) { if (p) p.upLatch = false; return inp; }
  const swinging = p?.state === 'swing';
  const press = !!inp.pressed.upJump && !swinging;
  if (p) { if (press) p.upLatch = true; else if (!inp.held.upJump) p.upLatch = false; }
  const latch = p ? p.upLatch : !swinging;
  return { ...inp, pressed: { ...inp.pressed, jump: inp.pressed.jump || press }, held: { ...inp.held, jump: inp.held.jump || (!!inp.held.upJump && latch && !swinging) } };
}

export class Game {
  constructor(zoneModules, opts = {}) {
    this.world = new World(zoneModules);
    this.camera = new Camera();
    this.frame = 0;          // the game clock: fixed updates since boot
    this.playFrames = 0;     // play time
    this.fx = [];            // effect events for the renderer: {type, d, f}
    this.toasts = [];        // {text, f, dur}
    this.card = null;        // item card {item, f}
    this.roomState = {};     // roomId -> {broken:Set<tileIndex>, taken:Set<entityKey>}
    this.rescued = new Set(); this.recruits = new Set();
    this.visited = new Set();
    this.levelComplete = false; this.gameWon = false; this.bossPhase = null;
    this.hold = 0;           // frames the sim is held (transition wipe, item freeze)
    this.trans = null;       // {f, dur, kind}
    this.bossWait = false;   // [art] set by main.js while the boss's gecko art loads: the boss doesn't act yet (never set headless)
    this.onSave = opts.onSave || null;
    this.lastCall = -999;
    this.player = new Player('pip');
    this.ctx = { grid: null, hooks: [], hideSpots: [], currents: [], emit: (t, d) => this.emit(t, d), breakUnder: (p) => this.breakUnder(p),
      // [mech] what the player reads from the room's mechanics
      surface: (p) => Mech.surfaceAt(this, p), liftAt: (p) => Mech.liftAt(this, p), springUnder: (p) => Mech.springUnder(this, p), dig: (p, dir) => Mech.dig(this, p, dir),
      unsafeTile: (tx, ty) => Mech.unsafeTile(this, tx, ty), edgeFloor: (p) => this.edgeFloor(p) };
    this.projectiles = [];
    // [mech] shut gates in a neighbouring room are solid across the shared edge too
    // [fixer] ... and broken cereal / dug soil there is open too (the hearth plug seen from chim-ash)
    this.world.tileHook = (room, lx, ly) => Mech.gateTileAt(this, room, lx, ly) ?? (this.roomState[room.id]?.broken.has(ly * room.tw + lx) ? K.EMPTY : null);
  }

  emit(type, d = {}) {
    this.fx.push({ type, d, f: this.frame });
    if (this.fx.length > 200) this.fx.splice(0, this.fx.length - 200);
    switch (type) {
      case 'chirp': {
        // [mech] boss arenas fix the chirp's radius and stun (house.js LAIRS[boss].chirp)
        if (this.boss?.chirp) { d.radius = this.boss.chirp.radius; d.stun = this.boss.chirp.stun; }
        stunEnemies(this.enemies || [], d.x, d.y, d.radius, Math.round(d.stun * FPS), this);
        this.lastCall = this.frame;
        Mech.onChirp(this, d);
        break;
      }
      case 'flash': flashEnemies(this.enemies || [], d.x, d.y, 170, 4 * FPS, this); this.lightAt = { x: d.x, y: d.y, f: this.frame }; break;
      case 'pound': Mech.onPound(this, d); break;
      case 'enter': if (!Mech.onEnter(this)) this.interact(); break; // [issue #27] a ↓ press (Enter) with no hiding spot near
      case 'tap': this.toast(d.msg, 120); break;
      case 'useNothing': break;
      case 'dazed': this.toast('Too loud! Your legs ring. (Cotton Earplugs)', 150); break;
      default: break;
    }
  }
  // seq: a scripted sequence's steps (the tank's lid): a toast with a seq replaces that sequence's earlier toasts, so
  // each step's line clears the last instead of stacking under it (issue #38 review)
  toast(text, dur = 150, seq = null) {
    if (this.toasts.length && this.toasts[this.toasts.length - 1].text === text && this.frame - this.toasts[this.toasts.length - 1].f < dur) return;
    if (seq) this.toasts = this.toasts.filter((t) => t.seq !== seq);
    this.toasts.push(seq ? { text, f: this.frame, dur, seq } : { text, f: this.frame, dur });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  // ---- set-up ----
  rs(id) { return (this.roomState[id] ||= { broken: new Set(), taken: new Set() }); }
  zoneOf(roomId) { return this.world.rooms[roomId]?.zone; }

  // Start (or restart) in a room at a tile (feet on the bottom of that tile), or at its P marker.
  startAt(roomId, tx, ty, opts = {}) {
    const room = this.world.rooms[roomId];
    if (!room) throw new Error(`no room ${roomId}`);
    const p = this.player;
    if (opts.party) { p.trio = opts.party.slice(0, 3); p.active = 0; p.setCricket(p.trio[0]); }
    if (opts.items) { p.items = new Set(opts.items); }
    if (opts.rescued) this.rescued = new Set(opts.rescued);
    if (tx == null) {
      const m = room.entities.find((e) => e.type === 'start') || room.entities.find((e) => e.type === 'save') || { x: 2, y: room.th - 3 };
      tx = m.x; ty = m.y;
    }
    p.reset();
    p.health = p.maxHealth;
    const x = tx * TILE + (TILE - p.w) / 2, y = (ty + 1) * TILE - p.h;
    this.enterRoom(room, room.wx + x, room.wy + y, 'start');
    p.state = 'air';
    this.checkpoint = null;
    this.hold = 0; this.trans = null;
  }

  enterRoom(room, wx, wy, how) {
    const p = this.player;
    const prev = this.room;
    this.room = room;
    this.zone = room.zone;
    this.grid = this.world.makeGrid(room, this.rs(room.id).broken);
    this.gridVersion = (this.gridVersion || 0) + 1;
    p.x = wx - room.wx; p.y = wy - room.wy;
    p.lastSafe = null;
    this.entry = { x: p.x, y: p.y };
    this.entrySafe = null;
    this.checkpoint = null;
    this.buildEntities();
    this.ctx.grid = this.grid;
    for (let y = 0; y < room.sh; y++) for (let x = 0; x < room.sw; x++) this.visited.add(`${room.cx + x},${room.cy + y}`);
    this.camera.snap(p, room);
    if (how === 'edge' && prev) { this.trans = { f: 0, dur: 16, kind: 'wipe' }; this.hold = 6; }
    this.emit('room', { id: room.id, how });
  }

  buildEntities() {
    const room = this.room, T = TILE, taken = this.rs(room.id).taken;
    this.hooks = []; this.hideSpots = []; this.currents = []; this.loud = []; this.pickups = []; this.signs = [];
    this.checkpoints = []; this.saves = []; this.beacons = []; this.doors = []; this.boss = null;
    this.metaEnts = []; // [meta] see buildEntities

    const enemyDefs = [], mechDefs = [], signDefs = [];
    room.entities.forEach((e, i) => {
      const key = `${e.type}@${e.x},${e.y}`;
      switch (e.type) {
        case 'hook': this.hooks.push({ x: (e.x + 0.5) * T, y: (e.y + 0.5) * T }); break;
        case 'hide': case 'hideSmall': this.hideSpots.push({ x: e.x * T, y: (e.y + 1) * T - 24, w: (e.w || 1) * T, h: 24, small: e.type === 'hideSmall' || !!e.small }); break;
        case 'current': this.currents.push({ x: e.x * T, y: e.y * T, w: e.w * T, h: e.h * T, vx: e.vx * T }); break;
        case 'loud': this.loud.push({ x: e.x * T, y: e.y * T, w: e.w * T, h: e.h * T }); break;
        case 'checkpoint': this.checkpoints.push({ x: e.x * T, y: e.y * T - T, w: T, h: 2 * T, tx: e.x, ty: e.y, on: false }); break;
        case 'save': this.saves.push({ x: e.x * T, y: e.y * T, w: T, h: T, tx: e.x, ty: e.y }); break;
        case 'beacon': this.beacons.push({ x: (e.x + 0.5) * T, y: (e.y + 0.5) * T }); break;
        case 'sign': signDefs.push(e); break; // [issue 9] anchored once the grid has its gates (below)
        case 'door': this.doors.push({ x: e.x * T, y: e.y * T - T, w: (e.w || 1) * T, h: 2 * T, to: e.to, at: e.at, auto: !!e.auto, needs: e.needs || null, msg: e.msg || null, label: e.label || null }); break;
        case 'item':
          if (!this.player.has(e.item)) this.pickups.push({ key, kind: 'item', item: e.item, x: e.x * T + 8, y: e.y * T + 8, w: T - 16, h: T - 16 });
          break;
        case 'cage':
          if (!this.rescued.has(e.cricket) && !taken.has(key)) this.pickups.push({ key, kind: 'cage', cricket: e.cricket, x: e.x * T - 10, y: e.y * T - 20, w: T + 20, h: T + 20 });
          break;
        case 'start': break;
        case 'boss': if (BOSSES[e.boss]) this.boss = BOSSES[e.boss].create(this, e); break;
        // [meta] talkers, lair doors, crumbs, secrets and the Carrier marker are read by src/meta-run.js
        case 'npc': case 'lair': case 'crumbs': case 'secret': case 'carrier': case 'trigger':
          if (!taken.has(key)) this.metaEnts.push({ ...e, textKey: e.key, key, px: e.x * T, py: e.y * T }); // [playtest] textKey: a trigger's own `key` (its dialog's text key) survives
          break;
        default:
          if (Mech.MECH_TYPES.includes(e.type)) mechDefs.push(e);
          else enemyDefs.push({ ...e, i });
      }
    });
    this.enemies = enemyDefs.map((d, n) => spawnEnemy(d, n, room.id));
    this.projectiles = [];
    Mech.buildMech(this, mechDefs); // [mech] after the grid exists: shut gates, springs and crumbling floors set tiles
    // [issue 9] each tip's paper note stands on the live grid (gates shut); ground broken earlier counts as
    // its old self, so a note whose ground is gone stays retired (notes.js noteLive)
    if (signDefs.length) {
      const pristine = this.rs(room.id).broken.size ? this.world.makeGrid(room) : null, props = floorProps(room.entities);
      const obstacles = markerObstacles(room.entities, room.def?.decor); // [issue 34] the hovering marker keeps off props
      for (const e of signDefs) this.signs.push(makeSign(e, `${room.id}:${e.x},${e.y}`, this.grid, pristine, props, obstacles));
    }
    this.ctx.hooks = this.hooks; this.ctx.hideSpots = this.hideSpots; this.ctx.currents = this.currents;
  }

  // ---- the fixed update ----
  update(inp) {
    this.frame++;
    this.inp = inp; // [builder A] scripted set pieces (the tank's squeeze) read the held buttons
    if (this.trans) { this.trans.f++; if (this.trans.f >= this.trans.dur) this.trans = null; }
    if (this.card && this.frame - this.card.f > 150) this.card = null;
    this.toasts = this.toasts.filter((t) => this.frame - t.f < t.dur);
    const pin = playerFrame(inp, this.player); // [issue #27] ↑ / W jump (but climb on a line)
    if (this.hold > 0) { this.hold--; if (pin.pressed.jump) this.player.jumpBuf = 7; return; }
    this.playFrames++;
    const p = this.player;
    if (!this.boss?.pipGone) p.update(pin, this.ctx); // [issue 25] eaten: he's gone until the retry
    // kick hits
    const kb = p.kickBox();
    if (kb) kickEnemies(this.enemies, kb, p.facing, this);
    updateEnemies(this.enemies, this);
    Mech.updateMech(this); // [mech]
    if (this.boss && !this.bossWait) { this.boss.update(this); this.bossPhase = this.boss.phase; }
    this.checkTriggers();
    this.checkHazards();
    this.checkExits();
    if (p.state === 'ground' && p.lastSafe && !this.entrySafe) this.entrySafe = { ...p.lastSafe };
    this.camera.update(p, this.room, inp);
  }

  checkTriggers() {
    const p = this.player, pb = { x: p.x, y: p.y, w: p.w, h: p.h };
    for (const c of this.checkpoints) if (!c.on && overlap(pb, c)) {
      for (const o of this.checkpoints) o.on = false;
      c.on = true; this.checkpoint = { x: c.x + (TILE - p.w) / 2, y: c.y + 2 * TILE - p.h };
      this.emit('checkpoint', { x: c.x + TILE / 2, y: c.y + TILE });
    }
    for (const it of this.pickups) {
      if (it.done || !overlap(pb, it)) continue;
      it.done = true;
      if (it.kind === 'item') {
        p.give(it.item);
        this.card = { item: it.item, f: this.frame };
        this.hold = 40;
        this.emit('item', { item: it.item, x: it.x, y: it.y });
      } else if (it.kind === 'cage') {
        this.rs(this.room.id).taken.add(it.key);
        this.rescue(it.cricket);
        this.levelComplete = true;
        this.emit('rescue', { cricket: it.cricket, x: it.x + it.w / 2, y: it.y });
      }
    }
    this.pickups = this.pickups.filter((i) => !i.done);
    // [mech] auto doors (the chute): falling or walking into them takes you through
    for (const d of this.doors) if (d.auto && overlap(pb, d)) { if (this.useDoor(d)) return; }
    // loud zones
    if (!p.has('earplugs')) for (const z of this.loud) if (p.cx > z.x && p.cx < z.x + z.w && p.cy > z.y && p.cy < z.y + z.h) {
      p.daze(p.cx < z.x + z.w / 2 ? -1 : 1, this.ctx);
    }
  }

  interact() {
    const p = this.player;
    for (const s of this.saves) if (Math.abs(s.x + TILE / 2 - p.cx) < TILE && Math.abs(s.y + TILE - (p.y + p.h)) < TILE) {
      p.health = p.maxHealth;
      this.saveCrack = { room: this.room.id, tx: s.tx, ty: s.ty };
      this.toast('Saved. (Feeling better.)', 120);
      this.emit('save', { room: this.room.id });
      if (this.onSave) this.onSave(this);
      return;
    }
    for (const d of this.doors) if (!d.auto && overlap({ x: p.x, y: p.y, w: p.w, h: p.h }, d)) { this.useDoor(d); return; }
  }
  // [mech] Through a door entity (non-adjacent links: the laundry chute, the attic hatch). Keeps
  // health and momentum-free; lands with feet on the bottom of the `at` tile (default: P/S marker).
  useDoor(d) {
    const p = this.player;
    if (d.needs && !p.has(d.needs)) { this.toast(d.msg || `You need the ${ITEMS[d.needs]?.name || d.needs} to go on.`, 150); return false; }
    const r = this.world.rooms[d.to];
    if (!r) return false;
    let tx = d.at?.[0], ty = d.at?.[1];
    if (tx == null) { const m = r.entities.find((e) => e.type === 'start') || r.entities.find((e) => e.type === 'save') || { x: 2, y: r.th - 3 }; tx = m.x; ty = m.y; }
    const x = tx * TILE + (TILE - p.w) / 2, y = (ty + 1) * TILE - p.h;
    const keepVy = Math.max(0, p.vy);
    p.reset(); p.vy = keepVy; p.state = 'air';
    this.enterRoom(r, r.wx + x, r.wy + y, 'door');
    this.trans = { f: 0, dur: 16, kind: 'wipe' }; this.hold = 6;
    this.emit('door', { to: d.to });
    return true;
  }
  // [mech] The robot vacuum (and anything else that "sends you back"): to the room's soft
  // checkpoint, else where you came in. No heart lost.
  sendBack(why = 'vacuum') {
    const p = this.player;
    const at = this.checkpoint || this.entrySafe || this.entry;
    this.emit('sentBack', { why, x: p.cx, y: p.cy });
    p.reset(); p.x = at.x; p.y = at.y; p.state = 'air'; p.invuln = 60;
    this.hold = 30; this.trans = { f: 0, dur: 30, kind: 'fade' };
    this.camera.snap(p, this.room);
  }

  checkHazards() {
    const p = this.player;
    const kinds = p.overlapKinds(this.grid);
    if (kinds.has(K.HAZARD)) return this.fallOut('hazard');
    if (kinds.has(K.WATER) && !p.has('raft')) {
      // in the water past the waist
      const ty = Math.floor((p.y + p.h * 0.6) / TILE), tx = Math.floor(p.cx / TILE);
      if (this.grid.at(tx, ty) === K.WATER) return this.fallOut('water');
    }
    if (p.y > this.room.ph + 30) {
      const below = this.world.roomAtPoint(this.room.wx + p.cx, this.room.wy + p.y + p.h);
      if (!below || below === this.room) return this.fallOut('pit');
    }
    if (p.health <= 0) { if (this.inFight()) this.boss.lose(); else this.die(); } // [final-S] in an arena a killing blow restarts the phase
  }
  // Pits, water without the raft, hazards: 1 heart, back on the last solid ground.
  fallOut(why) {
    const p = this.player;
    p.health -= 1;
    this.emit('pit', { why, x: p.cx, y: p.cy });
    if (p.health <= 0) return this.inFight() ? this.boss.lose() : this.die(); // [final-S] the phase restart, not die()
    const at = p.lastSafe || this.entrySafe || this.checkpoint || this.entry;
    p.reset(); p.x = at.x; p.y = at.y; p.state = 'air';
    p.invuln = 60;
    p.lastSafe = { ...at };
    this.hold = 18; this.trans = { f: 0, dur: 18, kind: 'blink' };
    this.camera.snap(p, this.room);
  }
  // [final-2] this boss's lair is won: its cricket is rescued (Sir Bartholomew: befriended, the Cloak)
  bossBeaten(name) {
    if (name === 'barty') return !!(this.meta?.barty || this.player?.has?.('cloak'));
    const c = LAIRS[name]?.cricket;
    return !!(c && this.rescued.has(c));
  }
  // [final-S] a gecko fight is on (the tank's scripted beats are not fights: no lose())
  // [issue 9] a tip a script puts up mid-scene (the tank's cup rim, the log): a note that flutters down.
  // key: its text id (the read set's key); e: a sign entity (tiles) in this room
  scriptNote(key, e) {
    if (this.signs.some((s) => s.key === key)) return null;
    const s = makeSign({ type: 'sign', ...e }, key, this.grid, null, floorProps(this.room.entities));
    s.born = this.frame;
    this.signs.push(s);
    if (s.kind === 'note') this.emit('sfx', { name: 'crinkle', gain: 0.35, rate: 1.5 }); // a paper sound (the tank's beats load it)
    return s;
  }
  // [issue 9] a script retires a note whose lesson is over (the tongs once they're gone): note and card go
  retireNote(key) { this.signs = this.signs.filter((s) => s.key !== key); }
  inFight() { return !!(this.boss && !this.boss.done && typeof this.boss.lose === 'function'); }
  // [final-S] Pause > "Back to room entrance": free; in a gecko fight it is the phase restart.
  backToEntrance() {
    if (this.inFight()) { this.boss.lose(); return 'phase'; }
    if (this.boss?.retry?.()) return 'room'; // [issue 25] the tank's chase: the same quick retry as being eaten
    const p = this.player, at = this.entrySafe || this.entry;
    p.reset(); p.x = at.x; p.y = at.y; p.state = 'air'; p.invuln = 60; p.lastSafe = { ...at };
    this.hold = 18; this.trans = { f: 0, dur: 24, kind: 'fade' };
    this.camera.snap(p, this.room);
    this.emit('entrance', {});
    return 'room';
  }
  // [issue 25] A quick retry of this room (the tank's chase after Duchess eats Pip; Pause > Back to room
  // entrance there): Pip at tile (tx, ty), feet on its bottom, as on a fresh entry (the room rebuilt: its
  // script, notes and toasts); health, items and everything else kept. Never die().
  retryRoom(tx, ty) {
    const room = this.room, p = this.player;
    p.reset();
    const x = tx * TILE + (TILE - p.w) / 2, y = (ty + 1) * TILE - p.h;
    this.toasts = [];
    this.enterRoom(room, room.wx + x, room.wy + y, 'retry');
    p.state = 'air';
    this.hold = 12; this.trans = { f: 0, dur: 24, kind: 'fade' };
    this.emit('retry', { room: room.id });
  }
  die() {
    const p = this.player;
    const at = this.checkpoint || this.entrySafe || this.entry;
    this.emit('die', {});
    p.reset(); p.health = p.maxHealth; p.x = at.x; p.y = at.y; p.state = 'air'; p.invuln = 60;
    this.enemies = this.enemies.map((e, i) => spawnEnemy(e.def, i, this.room.id)); this.projectiles = [];
    this.hold = 30; this.trans = { f: 0, dur: 30, kind: 'fade' };
    this.toast('Back on your feet.', 120);
    this.camera.snap(p, this.room);
  }

  checkExits() {
    const p = this.player, room = this.room;
    const cx = p.cx, cy = p.cy;
    if (cx >= 0 && cx < room.pw && cy >= 0 && cy < room.ph) return;
    const next = this.world.roomAtPoint(room.wx + cx, room.wy + cy);
    if (!next || next === room) return; // pit handled in checkHazards
    if (next.needs && !p.has(next.needs)) {
      // gate by kind: bounce back with a hint
      if (cx < 0) p.x = 0; else if (cx >= room.pw) p.x = room.pw - p.w;
      if (cy < 0) { p.y = 0; p.vy = Math.max(p.vy, 0); } else if (cy >= room.ph) {
        p.y = room.ph - p.h;
        // [issue #15] the bottom edge is a floor: land on it (a pound used to stay a pound here for good)
        if (p.vy >= 0) p.landOnEdge(this.ctx, this.inp || { held: {} });
        p.vy = Math.min(p.vy, 0);
      }
      p.vx = 0; p.dashT = 0;
      this.toast(next.needsMsg || `You need the ${ITEMS[next.needs]?.name || next.needs} to go on.`, 150);
      return;
    }
    // keep the upward momentum through a top exit so you land on the ledge above
    this.enterRoom(next, room.wx + p.x, room.wy + p.y, 'edge');
  }

  // [issue #15] Standing on the bottom edge of the room over one the cricket can't enter yet
  // (checkExits stops it there): that edge holds it up like a floor. Tiles as groundUnder gives them.
  edgeFloor(p) {
    const room = this.room;
    if (!room || Math.abs(p.y + p.h - room.ph) > 0.5) return null;
    const n = this.world.roomAtPoint(room.wx + p.cx, room.wy + room.ph);
    if (!n || n === room || !n.needs || p.has(n.needs)) return null;
    return [{ tx: Math.floor(p.cx / TILE), ty: room.th, kind: K.SLICK }];
  }

  // Ground-pound landing: break every cereal clump under the feet.
  breakUnder(p) {
    const g = groundUnder(this.grid, p.body);
    if (!g) return false;
    let any = false;
    const rs = this.rs(this.room.id);
    for (const t of g) {
      if (t.kind !== K.CEREAL) continue;
      for (const [x, y] of clump(this.grid, t.tx, t.ty, K.CEREAL)) {
        this.grid.set(x, y, K.EMPTY); rs.broken.add(y * this.grid.w + x); any = true;
        this.emit('crumble', { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
      }
    }
    if (any) { this.gridVersion++; this.camera.shake = 14; }
    return any;
  }

  // ---- progress ----
  give(item) { this.player.give(item); this.buildEntities(); }
  rescue(id) {
    if (!CRICKETS[id]) return false;
    this.rescued.add(id);
    const p = this.player;
    if (!p.trio.includes(id) && p.trio.length < 3) p.trio.push(id);
    this.toast(`${CRICKETS[id].name} is safe!`, 180);
    return true;
  }

  // [audio] The beacon target (sound hole, then lair) lives in beacon.js; this keeps the old
  // shape {x, y, room} in the current room's coordinates, plus `via` (the next exit on the path).
  beaconTarget() { return beaconTargetInRoom(this); }

  snapshot() {
    const p = this.player;
    return {
      zone: this.zone?.id, room: this.room?.id,
      pos: { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 },
      vel: { x: Math.round(p.vx), y: Math.round(p.vy) },
      pstate: p.state, facing: p.facing,
      health: p.health, maxHealth: p.maxHealth, chirp: p.chirpMeter,
      items: [...p.items], trio: [...p.trio], active: p.id, queuedSwap: p.queuedSwap == null ? null : p.trio[p.queuedSwap],
      rescued: [...this.rescued], recruits: [...this.recruits],
      bossPhase: this.bossPhase, levelComplete: this.levelComplete, gameWon: this.gameWon,
      hidden: p.hidden, cloaked: p.cloakT > 0, listening: p.listening, gliding: p.gliding, // [builder C] cloaked
      frame: this.frame, playFrames: this.playFrames,
    };
  }
}
