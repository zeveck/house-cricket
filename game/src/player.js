// The cricket: movement state machine with the design's exact Jump and Use rules.
// States: ground (crouch, listen, raft are sub-modes), air (glide is a sub-mode), cling,
// wallrun, swing, pound, charge (rubber band), hide.
// No DOM: the headless sim and tools run this.
import { TILE, DT, MOVES, FORGIVE, FEEL, HEALTH, CHIRP, toFrames } from '../data/movement.js';
import { CRICKETS } from '../data/crickets.js';
import { K, moveX, moveY, groundUnder, wallBeside, overlapKinds, makeProfiles, stepVy, boxFree } from './physics.js';

const F = {
  coyote: toFrames(FORGIVE.coyote),
  buffer: toFrames(FORGIVE.jumpBuffer),
  wallGrace: toFrames(FORGIVE.wallGrace),
  useBuffer: toFrames(FORGIVE.useBuffer),
  crouch: toFrames(MOVES.hugeLeap.crouchTime),
  charge: toFrames(MOVES.superJump.chargeTime),
  kick: toFrames(FEEL.kickTime),
  invuln: toFrames(FEEL.hurtInvuln),
  hitStop: toFrames(FEEL.hitStop),
  poundWind: toFrames(MOVES.pound.windup),
  poundRecover: toFrames(MOVES.pound.recover),
  dash: toFrames(MOVES.dash.time),
  dashCd: toFrames(MOVES.dash.cooldown),
};
// [builder C] Cellophane Cloak (design: "The Dragon's Lair"): hold Shift / stick up in the open (no hiding spot
// near) for up to 3 s of near-invisibility, then 6 s to recharge. Frames.
export const CLOAK = { arm: 8, last: 180, recharge: 360 };
// [issue #37] on a hanging line ↑ / W climbs; ← or → pressed together with it (each within LINE_CHORD frames
// of the other, either first, both still held) jumps off that way. ↑ held while pumping, or ← / → held while
// climbing, never lets go.
export const LINE_CHORD = 6;
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const deg = Math.PI / 180;

export class Player {
  constructor(cricketId = 'pip') {
    const hb = FEEL.hitbox;
    this.w = hb.w; this.h = hb.h;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.state = 'air';
    this.health = HEALTH.start; this.maxHealth = HEALTH.start;
    this.items = new Set();
    this.trio = [cricketId];
    this.active = 0;
    this.queuedSwap = null;
    this.chirpMeter = CHIRP.meter; this.chirpRefill = 0;
    this.cloakT = 0; this.cloakCd = 0; this.cloakHold = 0; // [builder C] the Cellophane Cloak
    this.setCricket(cricketId);
    this.reset();
  }
  reset() {
    this.state = 'air'; this.vx = 0; this.vy = 0;
    this.prof = this.P.fall; this.cutDone = true; this.jumpHeldFrames = 0;
    this.coyote = 0; this.jumpBuf = 0; this.useBuf = 0;
    this.wallGrace = 0; this.graceDir = 0; this.clingDir = 0;
    this.lock = 0; this.canFlutter = true; this.dropping = 0;
    this.crouchFrames = 0; this.useHold = 0; this.useHoldFromGround = false;
    this.kickT = 0; this.invuln = 0; this.hitStop = 0;
    this.swing = null; this.hideSpot = null; this.listening = false; this.gliding = false;
    this.poundT = 0; this.recover = 0; this.wallRunLeft = 0;
    this.dashT = 0; this.dashCd = 0; this.lastTap = { dir: 0, t: 99 };
    this.squash = 0; this.onRaft = false; this.bobbing = false; this.dazed = 0; this.hideHold = false;
    this.lastSafe = null; this.anim = 0; this.landedHard = false;
    if (this.cloakT > 0) { this.cloakT = 0; this.cloakCd = CLOAK.recharge; } // [builder C] knocked about: the cloak drops
  }
  get id() { return this.trio[this.active]; }
  get stats() { return CRICKETS[this.id]; }
  setCricket(id) {
    const s = CRICKETS[id];
    this.cricket = id;
    this.P = makeProfiles(s);
    this.tiny = s.perk === 'tiny';
  }
  has(item) { return this.items.has(item); }
  give(item) { this.items.add(item); }
  get body() { return { x: this.x, y: this.y, w: this.w, h: this.h, tiny: this.tiny, dropping: this.dropping > 0, raft: this.has('raft'), lip: this.state === 'air' || this.state === 'pound', nudge: true }; }
  _apply(b) { this.x = b.x; this.y = b.y; }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get grounded() { return this.state === 'ground' || this.state === 'hide' || this.state === 'charge'; }
  // [builder C] the Cellophane Cloak counts as hidden: enemies, geckos and projectiles ignore you
  get hidden() { return this.state === 'hide' || this.cloakT > 0; }
  get cloaked() { return this.cloakT > 0; }

  // ---- swapping (queued until grounded) ----
  requestSwap(dir) {
    if (this.trio.length < 2) return;
    const next = (this.active + dir + this.trio.length) % this.trio.length;
    this.queuedSwap = next;
  }
  _doSwap(ctx) {
    if (this.queuedSwap == null) return;
    this.active = this.queuedSwap; this.queuedSwap = null;
    this.setCricket(this.id);
    ctx.emit('swap', { id: this.id, x: this.cx, y: this.y + this.h });
  }

  hurt(n, fromX, ctx, opts = {}) {
    if (this.invuln > 0 && !opts.force) return false;
    this.health = Math.max(0, this.health - n);
    this.invuln = F.invuln; this.hitStop = F.hitStop;
    if (this.state === 'swing' || this.state === 'hide' || this.state === 'cling' || this.state === 'charge') this.state = 'air';
    if (!opts.noKnock) {
      const dir = fromX == null ? -this.facing : Math.sign(this.cx - fromX) || -this.facing;
      this.vx = dir * FEEL.hurtKnock.vx; this.vy = FEEL.hurtKnock.vy;
      this.state = 'air'; this.prof = this.P.fall; this.lock = toFrames(FEEL.hurtKnock.lock); this.cutDone = true;
    }
    ctx.emit('hurt', { x: this.cx, y: this.cy });
    return true;
  }
  daze(dir, ctx) { // loud zone without earplugs: shoved back out, no damage
    if (this.dazed > 0) return;
    this.dazed = 40; this.vx = dir * 300; this.vy = -260; this.state = 'air'; this.prof = this.P.fall; this.lock = 20; this.cutDone = true;
    ctx.emit('dazed', { x: this.cx, y: this.y });
  }

  // [issue 7] a plain shove (Duchess's skitter in the tank): no damage, no event, no invulnerability
  // flash; half a second without control. ctx is unused (the call matches daze and hurt).
  shove(dir, ctx, { vx = 380, vy = -420, lock = 30 } = {}) {
    this.vx = dir * vx; this.vy = vy; this.state = 'air'; this.prof = this.P.fall; this.lock = lock; this.cutDone = true;
    this.hideSpot = null; this.hideHold = false; this.listening = false; this.coyote = 0; this.crouchFrames = 0;
  }

  launch(prof, ctx, kind = 'jump', dir = 0) {
    this.prof = prof; this.vy = -prof.v0;
    this.cutDone = !prof.cut; this.jumpHeldFrames = 0;
    if (dir) { this.vx = dir * prof.airSpeed; this.facing = dir; } // leap/super-jump spring off at full air speed
    this.state = 'air'; this.coyote = 0; this.jumpBuf = 0; this.crouchFrames = 0;
    this.squash = -0.18;
    ctx.emit(kind, { x: this.cx, y: this.y + this.h });
  }

  // ---- main update ----
  update(inp, ctx) {
    const H = inp.held, Pr = inp.pressed;
    this.anim++;
    if (this.hitStop > 0) { this.hitStop--; if (Pr.jump) this.jumpBuf = F.buffer; return; }
    if (this.invuln > 0) this.invuln--;
    if (this.dazed > 0) this.dazed--;
    if (this.kickT > 0) this.kickT--;
    if (this.dropping > 0) this.dropping--;
    if (this.dashCd > 0) this.dashCd--;
    if (this.dashT > 0) this.dashT--;
    this.squash *= 0.8;
    this.lastTap.t++;

    // chirp meter ([fixer] chirpRefillMul: song-seeds and the Crumb Shop's songs refill it faster; set by main.js applyUpgrades)
    if (this.chirpMeter < CHIRP.meter) { this.chirpRefill += DT; if (this.chirpRefill >= CHIRP.refill * (this.chirpRefillMul ?? 1)) { this.chirpRefill = 0; this.chirpMeter++; } }

    // buffers
    if (Pr.jump) this.jumpBuf = F.buffer; else if (this.jumpBuf > 0) this.jumpBuf--;
    if (Pr.use) this.useBuf = F.useBuffer; else if (this.useBuf > 0) this.useBuf--;
    if (Pr.swapNext) this.requestSwap(1);
    if (Pr.swapPrev) this.requestSwap(-1);
    if (this.wallGrace > 0) this.wallGrace--;

    const dir = (H.right ? 1 : 0) - (H.left ? 1 : 0);
    // dash: double-tap a direction (Stripe)
    for (const d of [-1, 1]) {
      if (Pr[d < 0 ? 'left' : 'right']) {
        if (this.stats.perk === 'dash' && this.lastTap.dir === d && this.lastTap.t < 14 && this.dashCd === 0 && this.state !== 'swing') {
          this.dashT = F.dash; this.dashCd = F.dashCd; this.vx = d * this.P.run * MOVES.dash.mult; ctx.emit('dash', { x: this.cx, y: this.cy, dir: d });
        }
        this.lastTap = { dir: d, t: 0 };
      }
    }

    this._cloak(inp, ctx); // [builder C]

    // kick and chirp (not while swinging, hidden, pounding)
    const free = !['swing', 'hide', 'pound', 'charge'].includes(this.state);
    if (Pr.kick && free && this.kickT === 0) { this.kickT = F.kick; ctx.emit('kick', { x: this.cx, y: this.cy, dir: this.facing }); }
    if (Pr.chirp && this.state !== 'pound') this._chirp(ctx);

    const st = this.state;
    if (this._submerged(ctx)) this._bob(inp, dir, ctx); // [issue 20] the Raft floats
    else if (st === 'ground') this._ground(inp, dir, ctx);
    else if (st === 'air') this._air(inp, dir, ctx);
    else if (st === 'cling') this._cling(inp, dir, ctx);
    else if (st === 'wallrun') this._wallrun(inp, dir, ctx);
    else if (st === 'swing') this._swing(inp, dir, ctx);
    else if (st === 'pound') this._pound(inp, ctx);
    else if (st === 'charge') this._charge(inp, dir, ctx);
    else if (st === 'hide') this._hide(inp, dir, ctx);
    if (this.state !== 'air' || !this._submerged(ctx)) this.bobbing = false;

    if (this.grounded && this.queuedSwap != null) this._doSwap(ctx);
    if (this.state === 'ground' && !this.onRaft) this._markSafe(ctx);
  }

  // [builder C] the Cellophane Cloak: held in the open ([issue #27] Shift; stick / D-pad up) (ground or air, no hiding spot near)
  _cloak(inp, ctx) {
    if (this.cloakCd > 0) this.cloakCd--;
    if (!this.has('cloak')) return;
    const open = (this.state === 'ground' || this.state === 'air') && !this._nearHide(ctx);
    if (this.cloakT > 0) {
      this.cloakT--;
      if (!inp.held.cloak || this.cloakT === 0 || !(this.state === 'ground' || this.state === 'air')) {
        this.cloakT = 0; this.cloakCd = CLOAK.recharge; this.cloakHold = 0;
        ctx.emit('uncloak', { x: this.cx, y: this.cy });
      }
      return;
    }
    if (inp.held.cloak && open) this.cloakHold++; else this.cloakHold = 0;
    if (this.cloakHold >= CLOAK.arm && this.cloakCd === 0) {
      this.cloakT = CLOAK.last; this.cloakHold = 0;
      ctx.emit('cloak', { x: this.cx, y: this.cy });
    }
  }

  _chirp(ctx) {
    const s = this.stats;
    if (s.chp <= 0) { ctx.emit('tap', { x: this.cx, y: this.y + this.h, msg: `${s.name} can't chirp (taps a foot)` }); return; }
    if (this.chirpMeter <= 0) { ctx.emit('chirpEmpty', {}); return; }
    this.chirpMeter--;
    const radius = CHIRP.baseRadius + CHIRP.perStat * s.chp;
    const stun = (CHIRP.baseStun + CHIRP.stunPerStat * s.chp) * (s.perk === 'lullaby' ? CHIRP.lullaby : 1);
    ctx.emit('chirp', { x: this.cx, y: this.cy, radius, stun, khz: s.khz, id: this.id });
    if (this.state === 'hide') ctx.emit('reveal', {});
  }

  _markSafe(ctx) {
    const g = groundUnder(ctx.grid, this.body);
    if (!g) return;
    // solid ground only (not one-way edges), both feet supported, no hazard next to us
    const solid = g.every((t) => t.kind !== K.ONEWAY && t.kind !== K.WATER && t.kind !== K.CEREAL);
    const c0 = Math.floor(this.x / TILE), c1 = Math.floor((this.x + this.w - 1e-6) / TILE);
    if (!solid || g.length < c1 - c0 + 1) return;
    if (ctx.unsafeTile && g.some((t) => ctx.unsafeTile(t.tx, t.ty))) return; // [mech] crumbling floors, cushions
    const r = g[0].ty;
    for (let c = c0 - 1; c <= c1 + 1; c++) if (ctx.grid.at(c, r) === K.HAZARD || ctx.grid.at(c, r - 1) === K.HAZARD) return;
    this.lastSafe = { x: this.x, y: this.y };
  }

  _horizontal(dir, speed, accelT, decelT, drag = FEEL.flingDrag) {
    if (this.lock > 0) { this.lock--; return; }
    const target = dir * speed;
    const acc = (speed / accelT) * DT, dec = (speed / decelT) * DT;
    if (dir !== 0 && Math.sign(this.vx) === dir && Math.abs(this.vx) > speed) {
      this.vx = approach(this.vx, target, drag * DT); // keep fling/dash momentum, decaying
    } else if (dir !== 0) {
      // turning round is instant-ish: braking uses the stronger rate
      this.vx = approach(this.vx, target, Math.sign(this.vx) === -dir ? dec + acc : acc);
    } else {
      this.vx = approach(this.vx, 0, (this.prof.carry || Math.abs(this.vx) > speed) && drag < 1000 ? drag * DT : Math.max(dec, drag * DT));
    }
    if (dir !== 0) this.facing = dir;
  }

  _moveBody(ctx) {
    const b = this.body;
    const rx = moveX(ctx.grid, b, this.vx * DT);
    const res = { hitX: rx.hit ? rx.dir : 0 };
    const ry = moveY(ctx.grid, b, this._dy);
    this._apply(b);
    res.landed = !!ry.landed; res.ceiling = !!ry.ceiling;
    if (rx.hit) this.vx = 0;
    return res;
  }

  // ---- ground ----
  _ground(inp, dir, ctx) {
    const H = inp.held, Pr = inp.pressed;
    const g = this._under(ctx);
    if (!g) { this._toAir(ctx, true); return this._air(inp, dir, ctx); }
    this.onRaft = g.every((t) => t.kind === K.WATER);
    this.canFlutter = true;
    if (this.recover > 0) this.recover--;

    // down: crouch (Hump: the leap ring fills after 0.4 s)
    if (H.down) this.crouchFrames++; else this.crouchFrames = 0;
    const crouched = this.crouchFrames > 0;
    const leapReady = this.stats.perk === 'hugeLeap' && this.crouchFrames >= F.crouch;

    // listen: hold while standing still
    this.listening = !!H.listen && dir === 0 && Math.abs(this.vx) < 30 && !crouched;

    // [mech] syrup halves speed and jump; a steam vent / mister under you lifts you off
    const surf = ctx.surface ? ctx.surface(this) : null;
    this.surf = surf;
    const lift = ctx.liftAt ? ctx.liftAt(this) : null;
    if (lift && !lift.glide) { this._toAir(ctx, false); this.vy = -lift.v * 0.5; return this._air(inp, dir, ctx); }
    let speed = this.P.run * (this.onRaft ? FEEL.raftSpeed : 1) * (surf ? surf.speed : 1);
    if (this.dashT > 0) speed *= MOVES.dash.mult;
    const moveDir = crouched || this.listening || this.recover > 0 ? 0 : dir;
    this._horizontal(moveDir, speed, FEEL.groundAccel, FEEL.groundDecel, FEEL.groundDrag);
    if (crouched && dir) this.facing = dir;
    // [mech] Digby digs soil: hold Down on soil (or Down + a direction into a soil wall)
    if (this.stats.perk === 'dig' && crouched && this.crouchFrames >= 24 && this.crouchFrames % 12 === 0 && ctx.dig) ctx.dig(this, dir);

    // currents push the raft
    if (this.onRaft) for (const c of ctx.currents || []) if (this._inRect(c)) this.x += c.vx * DT;

    // Use: hook grab, band charge (hold), tap = glow flash
    if (this._tryHook(ctx)) return;
    if (this._useGround(inp, ctx)) return;

    // [issue #27] Enter (a ↓ press, input.js): hide / interact. ↓ is held, so it is crouched: that's fine
    if (Pr.enter) {
      const spot = this._nearHide(ctx);
      if (spot) { this._enterHide(spot, ctx); return; }
      ctx.emit('enter', { x: this.cx, y: this.cy });
    }

    // Jump (fresh or buffered)
    if (this.jumpBuf > 0) {
      const onOneWay = g.every((t) => t.kind === K.ONEWAY);
      const sj = surf ? Math.sqrt(surf.jump) : 1; // [mech] syrup: jump height x surf.jump
      if (leapReady) { this.launch(sj < 1 ? { ...this.P.leap, v0: this.P.leap.v0 * sj } : this.P.leap, ctx, 'leap', dir); }
      else if (H.down && onOneWay) {
        this.dropping = 12; this.jumpBuf = 0; this.state = 'air'; this.prof = this.P.fall; this.cutDone = true; this.vy = 60;
        this.coyote = 0; this.crouchFrames = 0;
        ctx.emit('drop', {});
      } else { this.launch(sj < 1 ? { ...this.P.jump, v0: this.P.jump.v0 * sj } : this.P.jump, ctx, 'jump'); }
      return this._air(inp, dir, ctx);
    }

    // Jam's wall-run: running into a wall
    if (this.stats.perk === 'wallRun' && dir !== 0) {
      const w = wallBeside(ctx.grid, this.body, dir);
      if (w && w.cling && !crouched) { this.state = 'wallrun'; this.clingDir = dir; this.wallRunLeft = MOVES.wallRun.rise * TILE; this.vx = 0; ctx.emit('wallrun', {}); return; }
    }

    this._dy = 0;
    this._moveBody(ctx);
    // walking off an edge
    if (!this._under(ctx)) this._toAir(ctx, true);
  }
  // What the feet stand on: tiles, or (issue #15) the floor edge over a room you can't enter yet.
  _under(ctx) { return groundUnder(ctx.grid, this.body) || (ctx.edgeFloor ? ctx.edgeFloor(this) : null); }
  // [issue #15] game.checkExits stopped us at the bottom edge of a room we can't enter yet: that edge
  // is a floor. Any falling state ends there as a landing (a pound ends as a pound landing), never
  // held in its state while gravity pulls it over the edge again every frame.
  landOnEdge(ctx, inp) {
    const st = this.state;
    if (st === 'pound') {
      this.poundT = 0;
      ctx.emit('pound', { x: this.cx, y: this.y + this.h, broke: false });
      this.state = 'ground'; this.vy = 0; this.recover = F.poundRecover; this.squash = FEEL.squashLand * 1.4; this.prof = this.P.fall;
    } else if (st === 'air' && this.vy >= 0) this._land(ctx, inp);
    else if (st === 'cling' || st === 'wallrun') { this.state = 'ground'; this.vy = 0; ctx.emit('land', { x: this.cx, y: this.y + this.h, hard: false, v: 0 }); }
  }
  _toAir(ctx, coyote) {
    this.state = 'air'; this.prof = this.P.fall; this.cutDone = true; this.vy = Math.max(this.vy, 0);
    this.coyote = coyote ? F.coyote + 1 : 0; this.listening = false; this.crouchFrames = 0; this.onRaft = false;
  }

  _useGround(inp, ctx) {
    const H = inp.held, Pr = inp.pressed;
    if (Pr.use) { this.useHold = 0; this.useHoldFromGround = true; }
    if (!this.useHoldFromGround) return false;
    if (H.use) {
      this.useHold++;
      if (this.has('band') && this.useHold >= F.charge) { this.state = 'charge'; this.vx = 0; this.useBuf = 0; ctx.emit('charge', {}); return true; }
      if (!this.has('band') && this.useHold === 1 && !this._hookNearish(ctx)) { this.useHoldFromGround = false; this._flash(ctx); }
    } else {
      // released before the charge time: a tap
      if (this.useHold > 0 && !this._hookNearish(ctx)) this._flash(ctx);
      this.useHoldFromGround = false; this.useHold = 0;
    }
    return false;
  }
  _flash(ctx) { this.useBuf = 0; if (this.has('glow')) ctx.emit('flash', { x: this.cx, y: this.cy }); else ctx.emit('useNothing', {}); }

  _charge(inp, dir, ctx) {
    if (dir) this.facing = dir;
    this.vx = 0;
    if (!inp.held.use) {
      this.useHoldFromGround = false; this.useHold = 0;
      this.launch(this.P.sup, ctx, 'superjump', dir);
      return this._air(inp, dir, ctx);
    }
    if (!this._under(ctx)) this._toAir(ctx, false);
  }

  // ---- air ----
  _air(inp, dir, ctx) {
    const H = inp.held, Pr = inp.pressed;
    if (this.coyote > 0) this.coyote--;
    this.listening = false;
    this.useHoldFromGround = false;
    this.jumpHeldFrames++; // frames since launch

    // Jump rules, in order
    const fresh = Pr.jump;
    if (this.jumpBuf > 0) {
      if (this.coyote > 0) { this.launch(this.P.jump, ctx, 'jump'); }
      else if (this.wallGrace > 0) { this._wallKick(-this.graceDir, ctx); }
      else if (fresh && H.down && this.has('thimble')) { this._startPound(ctx); return; }
      else if (fresh && this.has('feather') && this.canFlutter && !H.down && !this._landingSoon(ctx)) {
        this.canFlutter = false; this.launch(this.P.flutter, ctx, 'flutter'); this.prof = { ...this.P.flutter, airSpeed: Math.max(this.prof.airSpeed, this.P.run) };
      }
    }
    // variable height: releasing early cuts the rise once
    if (!this.cutDone && this.vy < 0 && !H.jump && this.jumpHeldFrames >= FEEL.minJumpFrames) { this.vy *= FEEL.jumpCut; this.cutDone = true; }
    if (!this.cutDone && this.vy >= 0) this.cutDone = true;

    if (this._tryHook(ctx)) return;
    if (Pr.use && !this._hookNearish(ctx)) this._flash(ctx);

    // glide: hold Jump while falling
    this.gliding = false;
    let g = this.vy < 0 ? this.prof.gUp : this.prof.gDown;
    let vmax = this.P.vmax;
    if (this.has('glider') && H.jump && this.vy >= 0) {
      this.gliding = true;
      const ratio = this.stats.perk === 'longGlide' ? MOVES.longGlide.ratio : MOVES.glide.ratio;
      vmax = Math.max(Math.abs(this.vx), this.P.run) / ratio;
      if (this.vy > vmax) { this.vy = approach(this.vy, vmax, 2400 * DT); g = 0; vmax = 99999; }
    }
    let speed = this.prof.airSpeed;
    if (this.dashT > 0) speed = Math.max(speed, this.P.run * MOVES.dash.mult);
    this._horizontal(dir, speed, FEEL.airAccel, FEEL.airDecel);

    // [mech] lifts: steam vents and misters push anyone up; updrafts (glide: true) only a glider
    const lift = ctx.liftAt ? ctx.liftAt(this) : null;
    if (lift && (!lift.glide || (this.has('glider') && H.jump))) {
      this.vy = approach(this.vy, -lift.v, lift.acc * DT);
      this._dy = this.vy * DT; this.cutDone = true; this.lifted = true;
    } else {
      const sv = stepVy(this.vy, g, vmax);
      this._dy = sv.dy; this.vy = sv.vy; this.lifted = false;
    }
    // Use + down in mid-air is nothing; Kick handled above.
    this._airMove(ctx, inp, dir);
  }
  _landingSoon(ctx) {
    if (this.vy <= 0) return false;
    const look = this.vy * DT * F.buffer + 4;
    const b = this.body;
    const r = moveY(ctx.grid, { ...b }, look);
    return !!r.landed;
  }
  _airMove(ctx, inp, dir = 0) {
    const res = this._moveBody(ctx);
    if (res.ceiling && this.vy < 0) { this.vy = 0; }
    if (res.landed) { this._land(ctx, inp); return; }
    // cling: in the air, pressing toward a clingable wall (Tape Booties)
    if (this.has('booties') && this.vy > -220) {
      for (const d of [-1, 1]) {
        if (dir !== d) continue;
        const w = wallBeside(ctx.grid, this.body, d);
        if (w && w.cling) {
          this.state = 'cling'; this.clingDir = d; this.facing = d; this.vx = 0; this.canFlutter = true;
          this.vy = Math.max(this.vy, 0) * 0.3; this.lock = 0;
          ctx.emit('cling', { x: d > 0 ? this.x + this.w : this.x, y: this.cy });
          if (this.jumpBuf > 0) this._wallKick(-d, ctx);
          return;
        }
      }
    }
  }
  _land(ctx, inp) {
    const hard = this.vy > 700;
    this.landedHard = hard;
    this.squash = hard ? FEEL.squashLand : FEEL.squashLand * 0.6;
    ctx.emit('land', { x: this.cx, y: this.y + this.h, hard, v: this.vy });
    this.vy = 0; this.state = 'ground'; this.lock = 0; this.canFlutter = true; this.coyote = 0;
    this.prof = this.P.fall;
    // [mech] springs (cushions): bounce unless holding Down
    const sp = ctx.springUnder ? ctx.springUnder(this) : null;
    if (sp && !inp.held.down) { this.bounce(sp.power, ctx); return; }
    // a buffered jump fires on the landing frame
    if (this.jumpBuf > 0 && !inp.held.down) { this.launch(this.P.jump, ctx, 'jump'); }
  }
  // A spring launch rising `rise` tiles (cushions, aphids); keeps the horizontal speed.
  bounce(rise, ctx) {
    const v0 = Math.sqrt(2 * this.P.jump.gUp * rise * TILE);
    this.prof = { ...this.P.jump, v0, cut: false, airSpeed: Math.max(this.P.run, this.prof.airSpeed || 0) };
    this.vy = -v0; this.state = 'air'; this.cutDone = true; this.coyote = 0; this.jumpBuf = 0; this.canFlutter = true;
    this.squash = -0.2;
    ctx.emit('spring', { x: this.cx, y: this.y + this.h, rise });
  }

  // ---- the Raft floats (issue 20) ----
  // Holding the Bottle-Cap Raft, Pip never wades along a flood's bottom: in water below its surface
  // (walked in at the bottom, fallen or knocked in from the side, slid down a wall into it) he bobs up
  // to the surface. Passive, no button. An eased rise, steered at raft speed and pushed by currents;
  // a covered surface (an overhang) stops him under it, and he drifts out sideways and on up. No jump
  // until he is on the surface. Plain fields only (bobbing, vy): rewind and replays hold.
  _submerged(ctx) {
    if (!this.has('raft') || this.state === 'swing') return false;
    return overlapKinds(ctx.grid, this.body).has(K.WATER);
  }
  // The top of the water the body is in: the highest surface over the columns it overlaps.
  _waterTop(grid) {
    const c0 = Math.floor(this.x / TILE), c1 = Math.floor((this.x + this.w - 1e-6) / TILE);
    const r0 = Math.floor(this.y / TILE), r1 = Math.floor((this.y + this.h - 1e-6) / TILE);
    let top = Infinity;
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) {
      if (grid.at(c, r) !== K.WATER) continue;
      let s = r;
      for (let n = 0; n < 64 && grid.at(c, s - 1) === K.WATER; n++) s--;
      top = Math.min(top, s * TILE);
      break;
    }
    return top;
  }
  _bob(inp, dir, ctx) {
    const B = FEEL.bob;
    if (!this.bobbing) { // in: drop whatever he was doing; one splash (fx here, the raft's sound as onRaft turns on)
      this.bobbing = true;
      ctx.emit('bob', { x: this.cx, y: Math.min(this._waterTop(ctx.grid), this.y + this.h) });
    }
    this.state = 'air'; this.prof = this.P.fall; this.cutDone = true; this.coyote = 0; this.canFlutter = true;
    this.gliding = false; this.listening = false; this.crouchFrames = 0; this.poundT = 0; this.recover = 0;
    this.hideSpot = null; this.hideHold = false; this.useHoldFromGround = false; this.useHold = 0; this.lifted = false;
    this.onRaft = true;
    if (this._tryHook(ctx)) { this.bobbing = false; this.onRaft = false; return; }
    this._horizontal(dir, this.P.run * FEEL.raftSpeed, FEEL.groundAccel, FEEL.groundDecel, FEEL.groundDrag);
    let drift = 0;
    for (const c of ctx.currents || []) if (this._inRect(c)) drift += c.vx * DT;
    const top = this._waterTop(ctx.grid), feet = this.y + this.h;
    const want = -Math.min(B.speed, Math.max(B.min, (feet - top) * B.ease));
    this.vy = approach(this.vy, want, B.accel * DT);
    let dy = this.vy * DT;
    if (dy < 0 && feet + dy <= top + 0.5) dy = top - feet; // arrive exactly on the surface
    const b = this.body; b.lip = false;
    const rx = moveX(ctx.grid, b, this.vx * DT + drift);
    const ry = moveY(ctx.grid, b, dy);
    this._apply(b);
    if (rx.hit) this.vx = 0;
    if (ry.ceiling || ry.landed) this.vy = 0;
    if (Math.abs(this.y + this.h - top) < 0.01 && groundUnder(ctx.grid, this.body)) { // up: afloat on the surface
      this.y = top - this.h; this.state = 'ground'; this.vy = 0; this.bobbing = false; this.squash = FEEL.squashLand * 0.4;
    }
  }

  // ---- cling and wall-kick ----
  _cling(inp, dir, ctx) {
    const H = inp.held;
    const d = this.clingDir;
    const w = wallBeside(ctx.grid, this.body, d);
    if (!w || !w.cling) { this.state = 'air'; this.prof = this.P.fall; this.cutDone = true; this.wallGrace = F.wallGrace + 1; this.graceDir = d; return this._air(inp, dir, ctx); }
    if (this.jumpBuf > 0) { this._wallKick(-d, ctx); return this._air(inp, dir, ctx); }
    if (dir === -d) { // pressing away lets go (a Jump in the next 100 ms still kicks)
      this.state = 'air'; this.prof = this.P.fall; this.cutDone = true; this.wallGrace = F.wallGrace + 1; this.graceDir = d;
      this.vx = -d * 60;
      return this._air(inp, dir, ctx);
    }
    if (this._tryHook(ctx)) return;
    const slide = H.down ? FEEL.wallSlideFast : FEEL.wallSlide;
    this.vy = approach(this.vy, slide, 1600 * DT);
    this.vx = 0;
    this._dy = this.vy * DT;
    const b = this.body;
    const ry = moveY(ctx.grid, b, this._dy);
    this._apply(b);
    if (ry.landed) { this.state = 'ground'; this.vy = 0; ctx.emit('land', { x: this.cx, y: this.y + this.h, hard: false, v: 0 }); }
  }
  _wallKick(away, ctx) {
    const p = this.P.wall;
    this.prof = { ...p, airSpeed: Math.max(this.P.run, p.outSpeed) };
    this.vy = -p.v0; this.vx = away * p.outSpeed; this.lock = p.lockFrames; this.facing = away;
    this.state = 'air'; this.cutDone = true; this.jumpBuf = 0; this.wallGrace = 0; this.coyote = 0;
    this.squash = -0.15;
    ctx.emit('walljump', { x: away > 0 ? this.x : this.x + this.w, y: this.cy, dir: away });
  }
  _wallrun(inp, dir, ctx) {
    const d = this.clingDir;
    const w = wallBeside(ctx.grid, this.body, d);
    const speed = MOVES.wallRun.speed * TILE;
    if (!w || dir !== d || this.wallRunLeft <= 0 || this.jumpBuf > 0) {
      if (this.jumpBuf > 0 && w && this.has('booties')) { this._wallKick(-d, ctx); return; }
      this.state = 'air'; this.prof = this.P.fall; this.cutDone = true; this.vy = 0;
      if (!w) { this.vx = d * 80; } // popped over the top
      return;
    }
    this.vy = -speed; this.vx = 0;
    const b = this.body; const ry = moveY(ctx.grid, b, -speed * DT); this._apply(b);
    this.wallRunLeft -= speed * DT;
    if (ry.ceiling) { this.state = 'air'; this.prof = this.P.fall; this.vy = 0; }
  }

  // ---- ground-pound (Thimble) ----
  _startPound(ctx) {
    this.state = 'pound'; this.poundT = F.poundWind; this.vx = 0; this.vy = 0; this.jumpBuf = 0;
    ctx.emit('poundStart', {});
  }
  _pound(inp, ctx) {
    if (this.poundT > 0) { this.poundT--; if (this.poundT === 0) this.vy = MOVES.pound.speed; return; }
    this.vy = MOVES.pound.speed;
    this._dy = this.vy * DT;
    const b = this.body;
    moveX(ctx.grid, b, 0);
    const ry = moveY(ctx.grid, b, this._dy);
    this._apply(b);
    if (ry.landed) {
      const broke = ctx.breakUnder ? ctx.breakUnder(this) : false;
      ctx.emit('pound', { x: this.cx, y: this.y + this.h, broke });
      if (broke) return; // keep falling through
      this.state = 'ground'; this.vy = 0; this.recover = F.poundRecover; this.squash = FEEL.squashLand * 1.4; this.prof = this.P.fall;
    }
  }

  // ---- floss swing ----
  _hookNearish(ctx) {
    if (!this.has('floss')) return false;
    for (const h of ctx.hooks || []) if (Math.hypot(h.x - this.cx, h.y - this.cy) < 2.5 * TILE) return true;
    return false;
  }
  _tryHook(ctx) {
    if (this.useBuf <= 0 || !this.has('floss')) return false;
    const m = FORGIVE.hookMagnet * TILE;
    let best = null, bd = 1e9;
    for (const h of ctx.hooks || []) {
      // distance from the hook to the hitbox (0 inside)
      const dx = Math.max(this.x - h.x, 0, h.x - (this.x + this.w));
      const dy = Math.max(this.y - h.y, 0, h.y - (this.y + this.h));
      const d = Math.hypot(dx, dy);
      if (d <= m && d < bd) { best = h; bd = d; }
    }
    if (!best) return false;
    this.useBuf = 0;
    const dx = this.cx - best.x, dy = this.cy - best.y;
    const len = Math.max(Math.hypot(dx, dy), 4);
    const ang = Math.atan2(dx, dy); // 0 = hanging straight down
    // carry momentum into the swing (tangential component)
    const tx = Math.cos(ang), ty = -Math.sin(ang);
    const vt = this.vx * tx + this.vy * ty;
    this.swing = { hook: best, len, target: Math.max(MOVES.swing.startLen * TILE, len), ang, w: vt / Math.max(len, TILE) };
    this.state = 'swing'; this.canFlutter = true; this.vx = 0; this.vy = 0; this.jumpBuf = 0;
    this.lineUpAge = this.lineSideAge = 99; this.lineSide = 0; // [issue #37]
    ctx.emit('grab', { x: best.x, y: best.y });
    return true;
  }
  _swing(inp, dir, ctx) {
    const s = this.swing, S = MOVES.swing, H = inp.held;
    // climb the line: up shortens, down lengthens
    if (H.up) s.target = Math.max(S.minLen * TILE, s.target - S.climbSpeed * TILE * DT);
    if (H.down) s.target = Math.min(S.reach * TILE, s.target + S.climbSpeed * TILE * DT);
    s.len = approach(s.len, s.target, 260 * DT);
    // pendulum, pumped by left/right
    let alpha = -(S.gravity / s.len) * Math.sin(s.ang);
    if (dir) { alpha += dir * S.pump * (TILE * 2.5 / s.len); this.facing = dir; }
    s.w += alpha * DT;
    s.w *= 0.996;
    s.ang += s.w * DT;
    const max = S.maxAngle * deg;
    if (s.ang > max) { s.ang = max; s.w = Math.min(s.w, 0); }
    if (s.ang < -max) { s.ang = -max; s.w = Math.max(s.w, 0); }
    // place the body on the line, colliding with the room
    const tx = s.hook.x + Math.sin(s.ang) * s.len - this.w / 2;
    const ty = s.hook.y + Math.cos(s.ang) * s.len - this.h / 2;
    const b = this.body; b.lip = false;
    const rx = moveX(ctx.grid, b, tx - this.x);
    const ry = moveY(ctx.grid, b, ty - this.y);
    this._apply(b);
    if (rx.hit || ry.ceiling || ry.landed) {
      s.w *= -0.25;
      const ddx = this.cx - s.hook.x, ddy = this.cy - s.hook.y;
      s.ang = Math.atan2(ddx, ddy);
      if (ry.landed && Math.abs(s.w) < 0.6) { s.len = Math.hypot(ddx, ddy); }
    }
    // tangential velocity, for flinging
    const vt = s.w * s.len;
    this.vx = Math.cos(s.ang) * vt; this.vy = -Math.sin(s.ang) * vt;
    // [issue #37] ← or → with ↑ / W, pressed together: jump off that way
    const P = inp.pressed;
    this.lineUpAge = P.upJump ? 0 : (this.lineUpAge ?? 99) + 1;
    const side = P.right && !P.left ? 1 : P.left && !P.right ? -1 : 0;
    if (side) { this.lineSide = side; this.lineSideAge = 0; } else this.lineSideAge = (this.lineSideAge ?? 99) + 1;
    const chord = (P.upJump || side) && H.upJump && this.lineSide && (this.lineSide > 0 ? H.right : H.left)
      && this.lineUpAge <= LINE_CHORD && this.lineSideAge <= LINE_CHORD;
    if (inp.pressed.jump || chord) { // fling in the swing's direction (Z / Space), or the ←/→ + ↑ side
      let vx = this.vx * S.flingScale;
      const vy = this.vy * S.flingScale - S.flingBoost * TILE;
      if (chord && !inp.pressed.jump) { vx = this.lineSide * Math.max(this.lineSide * vx, this.P.run); this.facing = this.lineSide; this.upLatch = true; } // ↑ still held is a held Jump
      this.state = 'air'; this.swing = null; this.vx = vx; this.vy = vy; this.cutDone = true; this.canFlutter = true;
      this.prof = { ...this.P.fall, airSpeed: Math.max(this.P.run, Math.abs(vx)), carry: true };
      this.jumpBuf = 0; this.coyote = 0;
      ctx.emit('fling', { x: this.cx, y: this.cy });
      return;
    }
    if (inp.pressed.use) { // let go and drop straight down
      this.state = 'air'; this.swing = null; this.vx = 0; this.vy = 0; this.prof = this.P.fall; this.cutDone = true; this.useBuf = 0;
      ctx.emit('release', {});
    }
  }

  // ---- hiding ----
  _nearHide(ctx) {
    for (const s of ctx.hideSpots || []) {
      if (s.small && !this.tiny) continue;
      const cx = s.x + s.w / 2;
      if (Math.abs(cx - this.cx) < s.w / 2 + 14 && Math.abs((this.y + this.h) - (s.y + s.h)) < 12) return s;
    }
    return null;
  }
  _enterHide(spot, ctx) {
    this.state = 'hide'; this.hideSpot = spot; this.vx = 0; this.listening = false;
    this.x = spot.x + spot.w / 2 - this.w / 2;
    ctx.emit('hide', { x: this.cx, y: this.y + this.h });
  }
  // [issue 7] hideHold (set each step by a script, the tank's Duchess while she comes and sniffs): only
  // Jump leaves, so a stick drifting sideways can't pop you out
  _hide(inp, dir, ctx) {
    this.listening = !!inp.held.listen;
    if ((dir !== 0 && !this.hideHold) || this.jumpBuf > 0) {
      this.state = 'ground'; this.hideSpot = null; this.hideHold = false;
      ctx.emit('unhide', {});
      return this._ground(inp, dir, ctx);
    }
  }

  _inRect(r) { return this.cx >= r.x && this.cx <= r.x + r.w && this.cy >= r.y && this.cy <= r.y + r.h; }

  // ---- for render/debug ----
  kickBox() {
    if (this.kickT <= 0) return null;
    const r = FEEL.kickReach;
    return { x: this.facing > 0 ? this.x + this.w - 4 : this.x - r + 4, y: this.y + 2, w: r, h: this.h - 4 };
  }
  overlapKinds(grid) { return overlapKinds(grid, this.body); }
  placeAt(x, y) { this.x = x; this.y = y; }
  fits(grid) { return boxFree(grid, this.body); }
}
