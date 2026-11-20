// Shared boss plumbing (design: "The ten gecko encounters"). A gecko fight is a 3-phase machine:
//
//   import { BossBase, makeBoss } from './base.js';
//   export default makeBoss('duchess', {
//     phases: 3,
//     start(b) { b.x = 16 * 40; b.mode = 'stalk'; },        // once, and again on every phase (re)start
//     tick(b, game) { ... b.tell(); ... b.hit(1); ... b.nextPhase(); },   // every step while fighting
//     draw(b, ctx, renderer) { ... },                          // optional; default: the gecko rig or shapes
//   });
//
// What the base gives every fight:
//   - phases 1..n; nextPhase() advances (the last one calls rescue()); setPhase(n) (debug hook
//     __game.setBossPhase) restarts phase n. Losing (health 0) restores health, puts you back at
//     the phase checkpoint (entity checkpoints: [[x,y], ...] tiles per phase, else where you stood
//     when the phase began) and restarts the phase: game.die() never runs inside an arena.
//   - tell(x, y): the tail-tip wiggle; lasts 0.8 s (house.js LAIRS[name].timings.tell) or 1.2 s in
//     Gentle Mode (game.gentle); emits game.emit('tell', {x, y}) for the audio rattle-swish and
//     the "!" splat; returns its length in frames. b.telling is true while it runs.
//   - hit(n, fromX): a gecko strike; Gentle Mode halves it (every other strike is free).
//   - chirp: the fight's fixed chirp {radius px, stun s} (LAIRS[name].chirp, tiles/s); game.js uses
//     it instead of the cricket's stats while the boss is in the room.
//   - rescue(): frees the lair's cricket (LAIRS[name].cricket or entity.cricket), sets
//     levelComplete, emits 'rescue' (the meta layer shows the zone-complete card; rescue gates
//     in the room open on the next step).
//   - ready(): emits 'ready' {boss} (the "Ready?" card; usually a {type:'lair'} entity at the
//     arena door does this).
//   - draw: the renderer's gecko rig (src/geckos.js) when it exists (b.pose: idle walk strike sleep
//     or an extra frame; b.len: nose-to-tail px; b.facing), else an ink-and-wash ellipse.
// Deterministic: b.rng is seeded per boss and phase. No DOM in update.
import { TILE, FPS } from '../../data/movement.js';
import { LAIRS } from '../../data/house.js';
import { seeded, constant } from '../world.js';
import * as Geckos from '../geckos.js';

export const TELL = { normal: 0.8, gentle: 1.2 };

export class BossBase {
  constructor(game, e, spec = {}) {
    this.game = game; this.e = e; this.spec = spec;
    this.name = spec.name || e.boss;
    const L = LAIRS[this.name] || {};
    this.lair = L;
    this.cricket = e.cricket || spec.cricket || L.cricket || null;
    const ch = e.chirp || spec.chirp || L.chirp || { radius: 4, stun: 1 };
    this.chirp = { radius: ch.radius * TILE, stun: ch.stun };
    this.phases = spec.phases || e.phases || 3;
    this.tellS = e.tell ?? spec.tell ?? L.timings?.tell ?? TELL.normal;
    this.x = (e.x + 0.5) * TILE; this.y = (e.y + 1) * TILE; this.facing = -1;
    this.pose = 'idle'; this.len = spec.len || e.len || 360; this.rigName = e.rig || spec.rig || this.name;
    this.phase = 1; this.t = 0; this.done = false; this.tellUntil = -1; this.gentleSkip = false;
    this.checkpoints = (e.checkpoints || []).map(([x, y]) => ({ x, y }));
    this.phaseAt = null;
    this.rig = null;
    // [builder C] optional render hooks (render.js): drawDark replaces a dark room's darkness,
    // drawOver paints after it (eyes that shine in the dark, screen-space overlays)
    // [polish] drawBack: render-only, behind the platforms (after the far painting and back decor)
    // [issue 11] getters below, not closures over `this`: a rewound boss (a copy) draws itself
    this.setPhase(1);
  }
  get drawDark() { return this.spec.drawDark ? (c, r, g) => this.spec.drawDark(this, c, r, g) : undefined; }
  get drawOver() { return this.spec.drawOver ? (c, r, g) => this.spec.drawOver(this, c, r, g) : undefined; }
  get drawBack() { return this.spec.drawBack ? (c, r, g) => this.spec.drawBack(this, c, r, g) : undefined; }
  get tellFrames() { return Math.round((this.game.gentle ? TELL.gentle : this.tellS) * FPS); }
  get telling() { return this.game.frame < this.tellUntil; }

  // ---- the machine ----
  update(game) {
    this.t++;
    if (this.done) { this.spec.after?.(this, game); return; }
    const p = game.player;
    if (p.health <= 0) { this.lose(); return; }
    this.spec.tick?.(this, game);
  }
  setPhase(n) {
    const g = this.game, p = g.player;
    this.phase = Math.max(1, Math.min(this.phases, n)); this.t = 0; this.tellUntil = -1; this.mode = null;
    this.rng = seeded(`boss:${this.name}:${this.phase}`);
    const cp = this.checkpoints[this.phase - 1];
    this.phaseAt = cp ? { x: cp.x * TILE + (TILE - p.w) / 2, y: (cp.y + 1) * TILE - p.h } : (this.phaseAt || { x: p.x, y: p.y });
    g.bossPhase = this.phase;
    this.spec.start?.(this, g);
    g.emit('bossPhase', { boss: this.name, phase: this.phase });
  }
  nextPhase() {
    if (this.phase >= this.phases) return this.rescue();
    const p = this.game.player;
    if (!this.checkpoints[this.phase]) this.phaseAt = { x: p.x, y: p.y };
    this.setPhase(this.phase + 1);
  }
  // Losing restarts the current phase (design: "In every fight, losing restarts the current phase").
  lose() {
    const g = this.game, p = g.player;
    g.emit('die', { boss: this.name });
    p.reset(); p.health = p.maxHealth; p.invuln = 60;
    if (this.phaseAt) { p.x = this.phaseAt.x; p.y = this.phaseAt.y; }
    g.hold = 30; g.trans = { f: 0, dur: 30, kind: 'fade' };
    g.camera.snap(p, g.room);
    g.emit('phaseRestart', { boss: this.name, phase: this.phase });
    this.setPhase(this.phase);
  }
  tell(x = this.x, y = this.y - 40) {
    const n = this.tellFrames;
    this.tellUntil = this.game.frame + n; this._wiggle = n;
    this.game.emit('tell', { x, y, boss: this.name, frames: n });
    return n;
  }
  hit(n = 1, fromX = this.x) {
    const g = this.game;
    if (g.gentle) { this.gentleSkip = !this.gentleSkip; if (!this.gentleSkip) { g.player.invuln = Math.max(g.player.invuln, 30); return false; } }
    return g.player.hurt(n, fromX, g.ctx);
  }
  rescue() {
    if (this.done) return;
    this.done = true;
    const g = this.game;
    if (this.cricket) g.rescue(this.cricket);
    g.levelComplete = true;
    g.emit('rescue', { cricket: this.cricket, x: this.x, y: this.y - 40, boss: this.name });
    if (this.spec.postLines) g.emit('dialog', { key: `geckos.${this.name}.post` }); // [playtest] their after-fight lines never played
  }
  ready() { this.game.emit('ready', { boss: this.name }); }
  // [polish-V] render-only: the rect (room px) the arena camera frames with the cricket, or null.
  // spec.focus(b) overrides; else the rig's last drawn box; else a box from x, y and len.
  focus() {
    if (this.spec.focus) return this.spec.focus(this);
    const r = this.rig?.lastBox;
    if (r) return r;
    const w = this.len * 0.5;
    return { x0: this.x - w, y0: this.y - this.len * 0.35, x1: this.x + w, y1: this.y };
  }

  // ---- drawing (render time only) ----
  draw(c, renderer) {
    if (this.spec.draw && this.spec.draw(this, c, renderer) !== false) return;
    if (Geckos.NAMES.includes(this.rigName)) {
      if (!this.rig) { this.rig = Geckos.create(this.rigName); Geckos.preload(this.rigName); }
      if (this._wiggle) { this.rig.wiggle(this._wiggle); this._wiggle = 0; }
      if (Geckos.ready(this.rigName)) {
        // [issue 26] Duchess's frame animations in her Bedroom fight too: her stalk is the run (slower), her
        // tell the pounce's crouch; the lunge stays strike.webp, the doze sleep.webp
        if (this.rigName === 'duchess' && this.rig.meta?.anims?.run) {
          if (this.pose === 'walk') { this.rig.play('run'); this.rig.walkSpeed = 0.55; }
          else if (this.mode === 'tell' || this.mode === 'tell2') this.rig.hold('pounce', 0);
          else this.rig.setPose(this.pose);
        } else this.rig.setPose(this.pose);
        this.rig.draw(c, this.x, this.y, this.rig.scaleFor(this.len), this.facing);
        return;
      }
    }
    // shapes: a wash body, a tail that wiggles during a tell
    const w = this.len * 0.5, h = this.len * 0.14, x = this.x, y = this.y - h;
    c.save();
    c.fillStyle = 'rgba(200,86,75,0.55)'; c.strokeStyle = '#5A4632'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(x, y, w / 2, h, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    const tail = -this.facing, wig = this.telling ? Math.sin(this.game.frame * 0.9) * 14 : 0;
    c.beginPath(); c.moveTo(x + tail * w / 2, y); c.quadraticCurveTo(x + tail * w * 0.85, y - 10 + wig, x + tail * w * 1.05, y + wig); c.stroke();
    c.fillStyle = '#5A4632'; c.beginPath(); c.arc(x + this.facing * w * 0.38, y - h * 0.3, 4, 0, 7); c.fill();
    if (this.telling) { c.font = 'bold 34px sans-serif'; c.fillStyle = '#C8564B'; c.fillText('!', x - 6, y - h - 16); }
    c.restore();
  }
}

// A boss module from a spec (see the top of this file). Register it in bosses/index.js.
export function makeBoss(name, spec = {}) {
  const full = constant({ name, ...spec }); // [issue 11] frozen: shared, never copied, by a rewind
  return { create(game, e) { return new BossBase(game, e, full); }, art: (e, game) => bossArt(name, spec, e, game), sfx: spec.sfx || [] }; // [issue 14] sfx: src/zone-sfx.js
}
// [art] What a fight draws, for src/room-art.js to load before the lair shows:
//   { gecko: the rig's name or null, props: ['props/ names or paths'], crickets: { id: [looks] } }
// spec.art(e, { game, cricket }) lists the fight's own props and captives (next to its draw code;
// cricket: the lair's captive, game: may be null); the rig defaults
// to the one draw() uses (e.rig, spec.rig, else the boss's name when it is a gecko).
export function bossArt(name, spec, e, game = null) {
  const a = spec.art?.(e, { game, cricket: e.cricket || spec.cricket || LAIRS[name]?.cricket || null }) || {};
  const rig = e.rig || spec.rig || name;
  return { gecko: a.gecko !== undefined ? a.gecko : (Geckos.NAMES.includes(rig) ? rig : null), props: a.props || [], crickets: a.crickets || {} };
}
