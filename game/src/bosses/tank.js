// [builder A] The tank escape (zone 0): the scripted set pieces of the opening's six beats, as
// boss-registry scripts (one per room; they never hurt: no damage anywhere in the tank, and the
// opening chase's "eaten" is a quick room retry, never die()).
//   { type: 'boss', boss: 'tank', beat: 'cup' | 'sand' | 'decor' | 'lid', x, y }
//   cup   (beats 1-2) the tongs dip three times (left, right, middle): dodge them; a catch just
//         lifts Pip and plops him back in the middle. Then hold Jump to leap out over the rim.
//   sand  (beat 3)    the escape (issues #24, #25): she sleeps on her rock, wakes as Pip passes, chases
//         and pounces (the tail tell, taught here); her snout at a landing eats him (a gulp, a card and
//         a quick retry; Gentle Mode: #7's roar and skitter). Hide in the log: she sniffs and sleeps.
//   decor (beat 4)    a loose pebble on a ledge: kick it off and it lands as a step.
//   lid   (beats 5-6) jump up into the lid gap (or ↓ under it, issue #27) to squeeze through; the store cup stands at
//         the rim in his way (issue #38): Kick knocks it off the tank and he leaps off the rim after it; then story
//         'tankEscaped' (panel 4, the Bedroom).
// Deterministic, no DOM in update; draws with the renderer's props and the gecko rig.
// [issue 11] Each beat's state is an object whose methods (update, draw, finish) live on a shared
// prototype and read it through `this`, never a closure: a rewind (src/rewind.js) copies the state and
// the copy runs. Room constants come from the entity (s.e); the game is s.g.
import { TILE, DT, FPS, RUN_SPEED } from '../../data/movement.js';
import { TEXT } from '../../data/text.js';
import * as S from '../sprites.js';
import { K } from '../physics.js';
import * as Geckos from '../geckos.js';
import { TELL } from './base.js';
import { constant } from '../world.js';
import { blob, tellMarks } from '../fx.js';

const T = TILE;
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const TK = TEXT.opening.tank;

function img(c, path, x, y, w, h, alpha = 1, rot = 0) {
  const im = S.get(path);
  if (!im) return false;
  c.save(); c.globalAlpha *= alpha; c.translate(x, y); if (rot) c.rotate(rot);
  c.drawImage(im, -w / 2, -h, w, h); c.restore();
  return true;
}

// ---------------------------------------------------------------- beat 1-2: the tongs
const CUP_XS = Object.freeze([12.5, 15.5, 14]); // tile columns of the three dips (left, right, middle)
const cupFloor = (e) => (e.floor ?? 10) * T;   // the cup floor (px)
// [issue 6] The feeding cup (props/feeder-cup-open: the frosted tub Duchess's crickets are served in) is
// drawn whole, 6.2 tiles wide, its rim on the 2-tile walls. Every picture of it (open, lidded, tipped) is
// drawn at this width and this vertical stretch, so it's the same cup in every scene.
export const FEEDER = Object.freeze({ w: 6.2 * T, stretch: 1.26 });
function cup(g, e) {
  // its walls are slick tiles (solid, never clingable): make them props (the same, but unpainted) so the
  // painted cup stands in for them instead of two dark glass slabs
  const x0 = e.cup?.[0] ?? 11, x1 = (e.cup?.[1] ?? 17) - 1, fy = e.floor ?? 10;
  let n = 0;
  for (const x of [x0, x1]) for (let y = fy - 2; y < fy; y++) if (g.grid.at(x, y) === K.SLICK) { g.grid.set(x, y, K.PROP); n++; }
  if (n) g.gridVersion++;
  return Object.assign(Object.create(Cup), { g, e, phase: null, music: 'title', i: 0, t: -90, mode: 'wait', tipY: -6 * T, x: CUP_XS[0] * T, caught: 0, done: false });
}
const Cup = {
  setPhase() {},
  notesOver: true, // [issue 9] the cup is drawn over the floor: the notes in it go on top (render.js)
  // [issue 9] the tongs while they come down: the tip card keeps clear of them (ui.js tipHazards)
  hazards() { const s = this; return !s.done && (s.mode === 'aim' || s.mode === 'dip' || s.mode === 'lift') ? [{ x0: s.x - T, x1: s.x + T, y0: s.tipY - 6 * T, y1: s.tipY + 0.5 * T }] : []; },
  inCup() { const { g, e } = this, p = g.player; return p.cx > (e.cup?.[0] ?? 11) * T && p.cx < (e.cup?.[1] ?? 17) * T && p.y + p.h > cupFloor(e) - 2.5 * T; },
  update() {
    const s = this, g = s.g, xs = CUP_XS, floorY = cupFloor(s.e), inCup = () => s.inCup();
    const p = g.player;
    if (s.done) return;
    s.t++;
    if (s.mode === 'wait') {
      s.tipY += (-6 * T - s.tipY) * 0.1;
      if (s.t > 0 && inCup()) { s.mode = 'aim'; s.t = 0; s.x = xs[s.i] * T; g.emit('sfx', { name: 'hinge-creak', gain: 0.4, rate: 1.6 }); }
      if (!inCup() && p.y + p.h < floorY - 2.5 * T) s.finish();
    } else if (s.mode === 'aim') {           // the tongs hover over a spot (a shadow on the floor): the warning
      s.tipY += (floorY - 4.2 * T - s.tipY) * 0.12;
      if (s.t > 50) { s.mode = 'dip'; s.t = 0; }
    } else if (s.mode === 'dip') {
      s.tipY = Math.min(floorY - 0.2 * T, s.tipY + 22 * T * DT);
      const box = { x: s.x - 0.6 * T, y: s.tipY - 1.2 * T, w: 1.2 * T, h: 1.2 * T };
      if (ov(box, { x: p.x, y: p.y, w: p.w, h: p.h })) { s.mode = 'lift'; s.t = 0; s.caught++; g.emit('sfx', { name: 'squeak-toy', gain: 0.5, rate: 1.4 }); g.toast('Pinched! (Gently.) Plop.', 90); }
      else if (s.tipY >= floorY - 0.25 * T) { s.mode = 'up'; s.t = 0; g.emit('land', { x: s.x, y: floorY, hard: false }); s.i++; if (s.i < 3) g.toast(['Missed you!', 'Missed again!', ''][s.i - 1], 80); }
    } else if (s.mode === 'lift') {           // caught: up a little, then dropped back in the middle
      s.tipY = Math.max(floorY - 3.5 * T, s.tipY - 6 * T * DT);
      p.x = s.x - p.w / 2; p.y = s.tipY - p.h * 0.6; p.vx = 0; p.vy = 0; p.state = 'air';
      if (s.t > 40) { p.x = 14 * T - p.w / 2; p.vy = -100; s.mode = 'up'; s.t = 0; }
    } else if (s.mode === 'up') {
      s.tipY += (-6 * T - s.tipY) * 0.08;
      if (s.t > 40) { if (s.i >= 3) s.finish(); else { s.mode = 'wait'; s.t = -20; } }
    }
  },
  finish() {
    const s = this, g = s.g, e = s.e, floorY = cupFloor(e);
    if (s.done) return;
    s.done = true; s.mode = 'gone';
    // [issue 9] the rim tip flutters down in the middle of the cup floor (where the tongs note stood: in reach from both walls)
    const c0 = e.cup?.[0] ?? 11, c1 = e.cup?.[1] ?? 17;
    for (const sg of g.signs) if (sg.text === TK.tongs) g.retireNote(sg.key); // the tongs are gone: their note too
    g.scriptNote('opening.tank.rim', { x: c0 + 1, y: Math.round(floorY / T) - 1, w: c1 - c0 - 1, nx: Math.floor((c0 + c1) / 2), text: TK.rim });
  },
  draw(c) {
    const s = this, e = s.e, floorY = cupFloor(e);
    // the feeding cup, whole and open, behind Pip: its rim (the lip's widest row, 25.4% down the
    // picture) on the 2-tile walls, its base on the floor
    const im = S.get('props/feeder-cup-open.webp');
    if (im) { const cx = ((e.cup?.[0] ?? 11) + (e.cup?.[1] ?? 17)) / 2 * T, w = FEEDER.w, h = w * im.height / im.width * FEEDER.stretch;
      c.save(); c.globalAlpha = 0.96; c.drawImage(im, cx - w / 2, floorY + 2 - h * 0.99, w, h); c.restore(); }
    if (s.mode === 'gone' && s.tipY < -5 * T) return;
    if (s.mode === 'gone') s.tipY += (-7 * T - s.tipY) * 0.05;
    if (s.mode === 'aim') { // the shadow where they'll land
      c.save(); c.globalAlpha = 0.18 + 0.12 * Math.sin(s.t * 0.4); c.fillStyle = '#2E3550';
      c.beginPath(); c.ellipse(s.x, floorY - 4, 26, 7, 0, 0, 7); c.fill(); c.restore();
    }
    const h = 11 * T, w = h * 68 / 474;
    if (!img(c, 'props/tongs.webp', s.x, s.tipY + 6, w * 1.1, h)) {
      c.save(); c.strokeStyle = '#8A7A5A'; c.lineWidth = 8; c.beginPath(); c.moveTo(s.x - 6, s.tipY - h); c.lineTo(s.x - 3, s.tipY); c.moveTo(s.x + 6, s.tipY - h); c.lineTo(s.x + 3, s.tipY); c.stroke(); c.restore();
    }
  },
};

// ---------------------------------------------------------------- beat 3: the escape (issues #24, #25, #26)
// The opening scare (design: Screens, Opening, beat 3 "The escape"). Duchess sleeps curled on her rock in
// the middle of the room (tiles 22-27: the sleep art, breathing, Zs; a tail twitch and an eye flicker as
// Pip creeps past). She wakes when he passes tile 38, bumps her head, or chirps within 6 tiles of it; the
// room darkens and the chase cue plays (musicNow, audio.js trackFor). She scrambles after him and pounces:
// stop, crouch (the tail tell), the landing shadow, a big leap, a shaking landing. Pounce 1 always lands
// just behind him; later ones lead him. Her snout at a landing eats him (not in Gentle Mode, where it is
// #7's roar and skitter): a sand puff, black, the gulp, her asleep, a card, then g.retryRoom() from the
// checkpoint with nothing lost. Hiding in the log is the escape: jaws on bark, a sniff, she curls up and
// sleeps where she is, the light and music settle, the way on opens (the room's flag SLEPT).
//   asleep -> wake -> run -> crouch (the tell) -> spring (the shadow) -> air -> land -> run ...
//   Pip in the log: [toLog] -> snap (jaws on bark) -> sniff -> curl (SLEPT) -> nap
//   out of the log early (or a chirp in it): roar -> crouch (a full tell) ...;  a catch: gulp -> retry
// Every bit of state is a plain field of this object (src/rewind.js copies it); no randomness. The rig
// is render-only: the sim names the pose or frame (pose / anim, animAt, held) and draw() shows it.
const SLEPT = 'duchess-asleep';               // g.rs(room).taken: she has lost him (survives rewind)
const LEN = 400, NOSE = LEN * 0.31;            // her drawn length; centre to nose tip (px)
const PIP_RUN = RUN_SPEED[3] * T;              // Pip's run speed (px/s)
const SAND = constant({
  wake: 38 * T, chirp: 6 * T,                  // Pip past this wakes her; so does a chirp this close to her head
  run: 1.25, catchUp: 2.2, far: 10 * T,        // her scramble (x Pip's speed); faster when more than `far` behind
  first: 10 * T, later: 5 * T,                 // her nose to Pip: pounce 1 starts inside this, later pounces inside this
  spring: 8, air: 36, land: 18, recover: 24,   // frames: the launch (the shadow is down), the flight, the landing, before the next pounce
  catchF: 1,                                   // the landing's frames that can catch (her jaws closing on him)
  leapMin: 0.5 * T, leapMax: 18 * T, arc: 2.4 * T, // the leap's length limits and its arc's height
  nearMiss: 1.6 * T,                           // pounce 1 lands this far behind where he'll be
  shorten: 0.5 * T, shortenMax: 1.5 * T,       // from the 3rd catch on, each pounce lands this much shorter per catch past 2
  wakeF: 33, darkIn: 24, lightOut: 90,         // frames: the wake; the wash darkening (0.4 s); the light coming back (1.5 s)
  minX: 4.5 * T, maxX: 59.5 * T,               // her middle stays in here: she never leaves the room
  zone: 1.5 * T, downBuf: 12,                  // the log's wide hiding zone (each side); a ↓ press remembered 0.2 s
  snap: 24, sniff: 110, look: 80, roar: 30, shake: 60, // frames: jaws on bark, the sniff, looking about, the roar, a Gentle Mode catch's shake-off
  hitStop: 4,                                  // the hit-stop when her jaws hit the bark (~60 ms)
  edge: 1.5 * T,                               // a Gentle Mode skitter's left limit
  gulp: { puff: 14, black: 30, fade: 20, card: 90, skip: 30 }, // frames: the puff, black (~0.5 s), the fade back, the card (<= 1.5 s, skippable after 0.5 s)
  head: [71, 131, 52],                         // asleep: her head from the middle (px, near and far) and its height
});
// [issue 25] her silhouette on the glass: the airborne frame (with its code tail) drawn once into a small
// canvas, filled dark and softened, then scaled up each frame (a canvas filter every frame was far too slow)
const SIL_K = 0.5; // the cached picture's size: SIL_K canvas px per room px at her drawn length
let silCache = null;
function silhouette() {
  if (silCache) return silCache;
  if (typeof document === 'undefined' || !Geckos.ready('duchess')) return null;
  const rig = Geckos.create('duchess', { autoTick: false });
  if (!rig.meta?.anims?.pounce) return null;
  rig.hold('pounce', 2); rig.breathe = false; rig.glint = false; rig.tellMark = false;
  const sc = rig.scaleFor(LEN) * SIL_K, W = Math.ceil(LEN * 1.25 * SIL_K), H = Math.ceil(LEN * 0.6 * SIL_K), pad = 8;
  const a = document.createElement('canvas'); a.width = W + 2 * pad; a.height = H + 2 * pad;
  const g = a.getContext('2d');
  rig.draw(g, a.width / 2, a.height - pad, sc, -1);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = '#141626'; g.fillRect(0, 0, a.width, a.height);
  const b = document.createElement('canvas'); b.width = a.width; b.height = a.height;
  const g2 = b.getContext('2d'); g2.filter = 'blur(2px)'; g2.drawImage(a, 0, 0);
  b.ax = 0.5;
  silCache = b;
  return b;
}
const HUNT = new Set(['wake', 'run', 'crouch', 'spring', 'air', 'land', 'toLog', 'snap', 'sniff', 'look', 'roar', 'shake']); // (look: she's still hunting until she gives up)
function sand(g, e) {
  const lost = g.rs(g.room.id).taken.has(SLEPT);
  return Object.assign(Object.create(Sand), { g, e, phase: null, music: 'title', musicNow: null, warmMusic: 'chase',
    mode: lost ? 'nap' : 'asleep', t: 0, x: (e.x + 0.5) * T, y: (e.y + 1) * T, facing: 1,
    pose: 'sleep', anim: null, animAt: 0, held: null, rig: null, wig: 0, twitch: 0, flick: 0, stir: 0,
    quiet: lost, woke: false, pounces: 0, cool: 0, roarCool: 0, tellN: 0, speed: 0,
    x0: 0, y0: 0, x1: 0, y1: 0, bite: 'sand', skit: 0, why: null, hopped: false, dark: 0, black: 0, card: -1, downBuf: 0, peekAt: -1,
    pipGone: false, chase: false, loopName: null, loopRate: 1, signed: false, bermTold: false, heldBack: false, lastToast: null });
}
const Sand = {
  setPhase() {},
  nose() { return this.x + this.facing * NOSE; },
  homeX() { return (this.e.x + 0.5) * T; }, // her rock
  log() { return this.g.hideSpots[0] || { x: 58 * T, y: 16 * T - 24, w: T, h: 24 }; },
  logFace() { const l = this.log(); return this.facing > 0 ? l.x : l.x + l.w; },
  awake() { return HUNT.has(this.mode) && !this.g.rs(this.g.room.id).taken.has(SLEPT); },
  // her feet: the sand, or a ripple, berm or her rock under her middle (she runs over them)
  floorAt(x) { const c = Math.floor(x / T); for (let r = 8; r < 17; r++) if (this.g.grid.at(c, r) === K.SOLID) return r * T; return 16 * T; },
  // asleep, only her head counts as bumping her (not her body or tail)
  headBox() { const s = this, [a, b, h] = SAND.head, x0 = s.x + s.facing * a, x1 = s.x + s.facing * b; return { x: Math.min(x0, x1), y: s.y - h, w: Math.abs(x1 - x0), h }; },
  // a catch: her snout at the landing (low, at the sand: a cricket in the air clears it)
  snout() { const n = this.nose(), f = this.facing, fy = this.floorAt(n - f * 2); return { x: f > 0 ? n - 1.3 * T : n - 0.3 * T, y: fy - 0.6 * T, w: 1.6 * T, h: 0.6 * T }; }, // on the floor under her nose (a ripple under her middle lifts her, not her jaws)
  pipBox() { const p = this.g.player; return { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 }; },
  tellFrames() { return Math.round((this.g.gentle ? TELL.gentle : TELL.normal) * FPS); }, // Gentle Mode's longer tell
  // the rig: a still pose ('sleep', 'strike', 'idle'), or a frame animation played from now or held on frame i
  still(p) { this.pose = p; this.anim = null; this.held = null; },
  play(a) { this.anim = a; this.animAt = this.g.frame; this.held = null; },
  hold(a, i) { this.anim = a; this.held = i; },
  clampX() { this.x = Math.max(SAND.minX, Math.min(SAND.maxX, this.x)); },
  sfx(name, o = {}) { this.g.emit('sfx', { name, x: this.x, ...o }); },
  // [camera] while she hunts the camera frames them both (world.js Camera: Pip in the right third)
  focus() {
    const s = this;
    if (!s.chase) return null;
    const n = s.nose();
    return { x0: Math.min(n, s.x - s.facing * 3.2 * T), y0: s.y - 3.2 * T, x1: Math.max(n, s.x - s.facing * 3.2 * T), y1: s.y, head: n };
  },
  // Pause > "Back to room entrance" while she hunts (or has just eaten him): the same quick retry
  retry() {
    const s = this;
    if (!(s.awake() || s.mode === 'gulp')) return false;
    const [tx, ty] = s.e.retry || [33, 15];
    s.g.retryRoom(tx, ty);
    return true;
  },

  startWake(why) {
    const s = this, g = s.g, p = g.player;
    s.mode = 'wake'; s.t = 0; s.facing = Math.sign(p.cx - s.x) || 1; s.play('wake');
    s.musicNow = 'chase'; s.chase = true;
    s.sfx('gecko-growl', { gain: 0.8, rate: 0.85 });
    if (!s.woke) g.toast(TK.duchessWakes[0], 120);
    s.why = why;
    // [issue 9] the log's note shows from the wake (a note at the log's opening, fluttering down)
    if (!s.signed) { const l = s.log(), rx = Math.floor((l.x + l.w) / T); s.signed = true; g.scriptNote('opening.tank.hideLog', { x: rx, y: s.e.y + 1, w: 2, nx: rx + 1, text: TK.hideLog }); }
  },
  startCrouch() {
    const s = this, g = s.g, p = g.player, n = s.tellFrames();
    if (!p.hidden) s.facing = Math.sign(p.cx - s.x) || s.facing;
    s.mode = 'crouch'; s.t = 0; s.hold('pounce', 0); s.tellN = n; s.speed = 0;
    s.wig = n; // the tail tip wiggles through the crouch ("get ready"); it stops as she springs and the shadow drops ("hop!")
    g.emit('tell', { x: s.nose(), y: s.y - 70, boss: 'duchess', frames: n });
  },
  // the leap's end is fixed as she springs (the shadow goes down there): where he'll be when she lands if he
  // keeps going as he is (a runner flat out); pounce 1 just behind that; the log if he's in it; a berm face
  // if he's on or just past a berm (she slams into it)
  startSpring() {
    const s = this, g = s.g, p = g.player, f = s.facing, n0 = s.nose();
    const flight = (SAND.spring + SAND.air) / FPS;
    const ahead = p.cx + Math.max(-PIP_RUN, Math.min(PIP_RUN, p.vx)) * flight;
    let target = ahead, bite = 'sand';
    if (s.pounces === 0) target -= f * SAND.nearMiss;
    const caught = g.duchessCatches || 0;
    if (caught >= 3) target -= f * Math.min(SAND.shortenMax, SAND.shorten * (caught - 2)); // [issue 25] quietly shorter
    let d = Math.max(SAND.leapMin, Math.min(SAND.leapMax, (target - n0) * f));
    target = n0 + f * d;
    if (s.floorAt(n0 - f * 2) > 15.5 * T) for (const b of s.e.berms || [31, 49]) { // (her front feet on the sand, not up on a berm)
      const face = f > 0 ? (b - 1) * T : (b + 2) * T;
      if ((face - n0) * f > 0 && (target - face) * f > 0 && (ahead - face) * f > -0.5 * T && (ahead - face) * f < 4.5 * T) { target = face; bite = 'berm'; break; }
    }
    const lf = s.logFace();
    if (p.hidden && (target - lf) * f >= 0 && (lf - n0) * f > 0) { target = lf; bite = 'log'; }
    target = Math.max(1.5 * T, Math.min(62.5 * T, target));
    s.x0 = s.x; s.y0 = s.y; s.x1 = Math.max(SAND.minX, Math.min(SAND.maxX, target - f * NOSE)); s.y1 = s.floorAt(s.x1); s.bite = bite;
    s.mode = 'spring'; s.t = 0; s.hold('pounce', 1);
    s.hopped = !p.grounded; // [review] a hop at or after the shadow always dodges (see tryCatch)
    s.sfx('gecko-growl', { gain: 0.45, rate: 1.25 });
  },
  land() {
    const s = this, g = s.g;
    s.x = s.x1; s.y = s.y1; s.mode = 'land'; s.t = 0; s.hold('pounce', 3);
    const n = s.nose();
    g.emit('sandSpray', { x: n, y: s.y, shake: 6 });
    s.sfx('pounce-land', { gain: 0.9 });
    s.pounces++;
    if (s.bite === 'log') return s.snap();
    if (s.bite === 'berm' && !s.bermTold) { s.bermTold = true; g.toast(TK.bermBite, 150); }
    s.tryCatch();
  },
  tryCatch() {
    const s = this, p = s.g.player;
    if (s.bite !== 'sand' || s.pounces <= 1 || p.hidden || s.roarCool > 0) return false; // pounce 1 is always a near miss
    if (s.hopped) return false; // he left the ground at some point since she sprang (a hop on the shadow): safe
    if (!ov(s.snout(), s.pipBox())) return false;
    if (s.g.gentle) s.shove(); else s.eat();
    return true;
  },
  // Gentle Mode: #7's catch, a roar and a skitter the way she faces; no damage, no game over
  shove() {
    const s = this, g = s.g, p = g.player;
    s.roarCool = SAND.shake + SAND.recover; s.mode = 'shake'; s.t = 0; s.still('strike');
    s.sfx('gecko-growl', { gain: 0.7, rate: 0.7 });
    p.shove(s.facing, g.ctx, { vx: 380, vy: -420, lock: 30 });
    s.skit = 40;
    const l = s.log(), toLog = p.cx + s.facing * 4 * T > l.x + l.w ? TK.caughtLogBack : TK.caughtLog;
    const pick = s.lastToast === TK.caughtFirst ? toLog : TK.caughtFirst;
    s.lastToast = pick; g.toast(pick, 150);
  },
  // a catch (not in Gentle Mode): her jaws close, he's gone in a puff of sand; black, a gulp, her asleep, a card, a retry
  eat() {
    const s = this, g = s.g, p = g.player;
    g.duchessCatches = (g.duchessCatches || 0) + 1;
    s.mode = 'gulp'; s.t = 0; s.pipGone = true; s.chase = false; s.loopName = null;
    g.emit('sandPuff', { x: p.cx, y: p.y + p.h });
    s.sfx('gecko-chomp', { gain: 0.8 });
  },
  gulpStep(inp) {
    const s = this, g = s.g, G = SAND.gulp, t = s.t, p = g.player;
    p.vx = 0; p.vy = 0;
    if (t === G.puff) { s.black = 1; s.dark = 0; s.musicNow = null; s.sfx('gulp', { gain: 1 }); }
    if (t === G.puff + G.black) s.play('tongue'); // back on her, licking her lips
    if (t > G.puff + G.black) s.black = Math.max(0, 1 - (t - G.puff - G.black) / G.fade);
    if (t === G.puff + G.black + 26) { s.still('sleep'); s.sfx('gecko-snore', { gain: 0.45 }); }
    const at = G.puff + G.black + G.fade;
    if (t >= at) {
      s.card = t - at;
      const any = Object.keys(inp.pressed || {}).some((k) => inp.pressed[k]);
      if (s.card >= G.card || (s.card >= G.skip && any)) {
        const offer = (g.duchessCatches || 0) >= 3 && !g.gentleOffered;
        s.retry();
        if (offer) { g.gentleOffered = true; g.emit('story', { name: 'gentleOffer' }); }
      }
    }
  },
  // Pip went into the log: she comes and snaps at it (jaws on bark)
  snap() {
    const s = this, g = s.g;
    s.mode = 'snap'; s.t = 0; s.still('strike'); s.speed = 0;
    g.hold = Math.max(g.hold, SAND.hitStop);
    g.emit('barkChips', { x: s.logFace(), y: s.log().y - 6 });
    s.sfx('gecko-chomp', { gain: 0.9 });
  },
  // seen (out of the log early, or a chirp in it): a roar, then a full tell before any pounce
  seen() {
    const s = this;
    s.mode = 'roar'; s.t = 0; s.still('strike'); s.roarCool = SAND.roar; s.speed = 0;
    s.sfx('gecko-growl', { gain: 0.8, rate: 0.7 });
  },
  // [issue 31] she gives up: she turns away and sets off back to her rock; the way on opens right then, the light
  // comes back and the music settles (the relief); she curls up asleep once she's home
  giveUp() {
    const s = this, g = s.g;
    g.rs(g.room.id).taken.add(SLEPT);
    g.retireNote('opening.tank.hideLog');
    s.mode = 'home'; s.t = 0; s.facing = Math.sign(s.homeX() - s.x) || -1; s.play('run'); s.musicNow = null; s.chase = false; s.speed = 0;
    s.sfx('relief-sting', { gain: 1 });
    s.peekAt = g.frame + 40;
    g.toast(TK.shrug, 150); g.toast(TK.lost, 180);
  },
  // the log's wide hiding zone while she hunts: a ↓ press is remembered for 0.2 s, and ↓ held on arrival counts
  logZone(inp) {
    const s = this, g = s.g, p = g.player, l = s.log();
    if (inp.pressed?.down && !inp.pressed?.jump) s.downBuf = SAND.downBuf; else if (s.downBuf > 0) s.downBuf--;
    if (p.state !== 'ground') return;
    const near = Math.abs(p.cx - (l.x + l.w / 2)) < l.w / 2 + SAND.zone && Math.abs(p.y + p.h - (l.y + l.h)) < 0.5 * T;
    if (near && (s.downBuf > 0 || inp.held?.down)) {
      const from = p.cx;
      p._enterHide(l, g.ctx); s.downBuf = 0;  // a slide-in snap
      g.emit('dust', { x: from, y: p.y + p.h });
    }
  },
  toward(x, v) { const s = this, d = x - s.x; s.x += Math.sign(d) * Math.min(Math.abs(d), v * DT); return Math.abs(d) <= v * DT; },

  update() {
    const s = this, g = s.g, p = g.player, rs = g.rs(g.room.id), inp = g.inp || { pressed: {}, held: {} };
    const EXIT = (s.e.exit ?? 60) * T;
    s.t++;
    if (s.cool > 0) s.cool--;
    if (s.roarCool > 0) s.roarCool--;
    if (s.twitch > 0) s.twitch--;
    if (s.flick > 0) s.flick--;
    const lost = rs.taken.has(SLEPT);
    // the way on stays shut until she has lost him
    if (!lost && p.x + p.w > EXIT) {
      p.x = EXIT - p.w; if (p.vx > 0) p.vx = 0;
      if (!s.heldBack) { s.heldBack = true; g.toast(TK.exitShut, 180); }
    } else if (p.x + p.w < EXIT - T) s.heldBack = false;
    if (s.skit > 0) { s.skit--; if (p.x < SAND.edge) { p.x = SAND.edge; if (p.vx < 0) p.vx = 0; } } // a skitter never takes him out of the room
    if (s.mode === 'gulp') return s.gulpStep(inp);
    const hidden = p.state === 'hide';
    let revealed = false, chirpAt = null;
    for (let i = g.fx.length - 1; i >= 0 && g.fx[i].f === g.frame; i--) {
      if (g.fx[i].type === 'reveal' && hidden) revealed = true;
      if (g.fx[i].type === 'chirp') chirpAt = g.fx[i].d;
    }
    if (!lost && !hidden && s.awake()) s.logZone(inp);
    const hiddenNow = p.state === 'hide';
    const f = s.facing;
    if (s.mode !== 'air' && s.mode !== 'spring') s.y += (s.floorAt(s.x) - s.y) * 0.25;
    if ((s.mode === 'spring' || s.mode === 'air' || s.mode === 'land') && !p.grounded) s.hopped = true; // off the ground since she sprang
    switch (s.mode) {
      case 'asleep': {
        if (lost) { s.mode = 'nap'; break; }
        // she stirs as he creeps past: a tail twitch as he passes her middle, an eye flicker (and a low growl) past her nose
        if (!(s.stir & 1) && p.cx > s.x - 1.5 * T) { s.stir |= 1; s.twitch = 45; }
        if (!(s.stir & 2) && p.cx > s.nose() + 1.2 * T) { s.stir |= 2; s.flick = 12; s.sfx('gecko-growl', { gain: 0.22, rate: 0.55 }); }
        const hb = s.headBox();
        const bumped = !p.hidden && ov(hb, s.pipBox());
        const chirped = chirpAt && Math.abs((chirpAt.x ?? p.cx) - (hb.x + hb.w / 2)) < SAND.chirp;
        if (p.cx > SAND.wake || bumped || chirped) s.startWake(bumped ? 'bump' : chirped ? 'chirp' : 'past');
        break;
      }
      case 'wake':
        if (s.t >= SAND.wakeF) {
          s.woke = true; s.mode = 'run'; s.t = 0; s.cool = 0; s.play('run');
          if (s.why === 'past') g.toast(TK.duchessWakes[1], 120);
        }
        break;
      case 'run': {
        if (hiddenNow) { s.mode = 'toLog'; s.t = 0; break; }
        let gap = (p.cx - s.nose()) * s.facing;
        if (gap < -0.3 * T && (p.cx - s.x) * s.facing < 0) { s.facing = -s.facing; gap = (p.cx - s.nose()) * s.facing; } // he got behind her: she turns
        const v = PIP_RUN * (gap > SAND.far ? SAND.catchUp : SAND.run);
        if (gap < 0.5 * T) { s.speed = PIP_RUN * 0.6; s.x -= s.facing * s.speed * DT; } // he's under her chin: she backs off a step
        else { s.speed = gap > 0.8 * T ? v : 0; s.x += s.facing * Math.min(s.speed * DT, Math.max(0, gap - 0.8 * T)); }
        s.clampX();
        if (s.anim !== 'run') s.play('run');
        if (s.cool === 0 && gap <= (s.pounces === 0 ? SAND.first : SAND.later) && gap >= 0.5 * T) s.startCrouch();
        break;
      }
      case 'crouch':                // the tell: stopped, crouched, the tail tip shaking (a second rattle half-way)
        if (s.t === Math.round(s.tellN / 2)) s.sfx('tell', { gain: 0.8 });
        if (s.t >= s.tellN) s.startSpring();
        break;
      case 'spring':                // the launch frame: the shadow is down where she'll land
        if (s.t >= SAND.spring) { s.mode = 'air'; s.t = 0; s.hold('pounce', 2); s.sfx('whoosh', { gain: 0.9, rate: 0.8 }); }
        break;
      case 'air': {
        // he dived into the log while she was in the air: her jaws find the bark
        const lf = s.logFace();
        if (hiddenNow && s.bite !== 'log' && (s.x1 + f * NOSE - lf) * f > 0 && (lf - (s.x0 + f * NOSE)) * f > 0) { s.x1 = lf - f * NOSE; s.y1 = s.floorAt(s.x1); s.bite = 'log'; }
        const k = Math.min(1, s.t / SAND.air), d = Math.abs(s.x1 - s.x0);
        s.x = s.x0 + (s.x1 - s.x0) * k;
        s.y = s.y0 + (s.y1 - s.y0) * k - SAND.arc * (0.55 + 0.45 * Math.min(1, d / (10 * T))) * Math.sin(Math.PI * k);
        if (s.t >= SAND.air) s.land();
        break;
      }
      case 'land':                  // jaws closing, sand flying: the first frames can catch him
        if (s.t <= SAND.catchF && s.tryCatch()) break;
        if (s.t >= SAND.land) { s.mode = hiddenNow ? 'toLog' : 'run'; s.t = 0; s.cool = SAND.recover; s.play('run'); }
        break;
      case 'shake':                 // Gentle Mode: she shakes off the catch
        if (s.t >= SAND.shake) { s.mode = hiddenNow ? 'toLog' : 'run'; s.t = 0; s.cool = SAND.recover; s.play('run'); }
        break;
      case 'toLog': {               // straight to the log, then jaws on bark
        if (!hiddenNow) { s.seen(); break; }
        const l = s.log(), lc = l.x + l.w / 2;
        s.facing = Math.sign(lc - s.x) || 1;
        const goal = s.logFace() - s.facing * (0.2 * T + NOSE);
        s.speed = PIP_RUN * SAND.run * 1.2;
        if (s.anim !== 'run') s.play('run');
        if (s.toward(goal, s.speed)) s.snap();
        break;
      }
      case 'snap':
        if (s.t >= SAND.snap) {
          if (!hiddenNow) { s.seen(); break; }
          s.mode = 'sniff'; s.t = 0; s.play('tongue'); g.toast(TK.sniff, 150);
        }
        break;
      case 'sniff':                 // the sniff: her tongue flicks at the bark, twice
        if (!hiddenNow || revealed) { s.seen(); break; }
        if (s.t === 50) s.play('tongue');
        if (s.t >= SAND.sniff) { s.mode = 'look'; s.t = 0; s.still('idle'); }
        break;
      case 'look':                  // [issue 31] she looks about for him (away, then back at the log), puzzled; then gives up
        if (!hiddenNow || revealed) { s.seen(); break; }
        if (s.t === 22 || s.t === 52) s.facing = -s.facing;
        if (s.t >= SAND.look) s.giveUp();
        break;
      case 'home': {                // [issue 31] the plod home to her rock (the way on is already open)
        s.speed = PIP_RUN * 0.55;
        if (s.anim !== 'run') s.play('run');
        if (s.toward(s.homeX(), s.speed)) { s.mode = 'curl'; s.t = 0; s.facing = 1; s.still('sleep'); s.speed = 0; }
        break;
      }
      case 'roar':                  // seen: a roar, then a full tell before any pounce
        if (s.t >= SAND.roar) { if (hiddenNow) { s.mode = 'sniff'; s.t = 0; s.play('tongue'); } else s.startCrouch(); }
        break;
      case 'curl':                  // home on her rock: she curls up asleep
        if (s.t >= 30) s.mode = 'nap';
        break;
      case 'nap':
        if (s.pose !== 'sleep' || s.anim) s.still('sleep');
        if (!s.quiet && s.t % 150 === 1) s.sfx('gecko-snore', { gain: 0.35 });
        break;
      default: break;
    }
    // the darkening wash (0.4 s) while she hunts; the light comes back over 1.5 s once she's lost him
    if (s.awake()) s.dark = Math.min(1, s.dark + 1 / SAND.darkIn);
    else if (s.dark > 0) s.dark = Math.max(0, s.dark - 1 / SAND.lightOut);
    s.chase = s.awake();
    // her feet on the sand: the skitter loop, its rate tied to her speed (audio.js)
    const moving = (s.mode === 'run' || s.mode === 'toLog' || s.mode === 'home') && s.speed > 0;
    s.loopName = moving ? 'gecko-skitter' : null; s.loopRate = moving ? Math.max(0.7, Math.min(1.8, s.speed / PIP_RUN)) : 1;
    // hidden while she hunts: only Jump leaves the log (player.js _hide)
    p.hideHold = hiddenNow && s.awake();
  },

  // ---- drawing (render only) ----
  drawBack(c, r) { // her silhouette looming on the glass while she's in the air
    const s = this;
    if (s.mode !== 'air' && s.mode !== 'spring') return;
    const sil = silhouette();
    if (!sil) return;
    const k = s.mode === 'air' ? Math.sin(Math.PI * Math.min(1, s.t / SAND.air)) : 0.2, sc = 1.7 + 0.4 * k;
    const w = sil.width * sc / SIL_K, h = sil.height * sc / SIL_K, cx = s.x - s.facing * 30, by = s.y - 1.2 * T - 1.4 * T * k;
    c.save(); c.globalAlpha = 0.16 + 0.14 * k; c.translate(cx, by); if (s.facing > 0) c.scale(-1, 1);
    c.drawImage(sil, -w * sil.ax, -h, w, h);
    c.restore();
    void r;
  },
  draw(c, r) {
    const s = this, g = s.g;
    // her rock (tiles 22-27): a flat stone
    const rock = s.e.rock;
    if (rock) {
      const im = S.get('props/pebble.webp'), x0 = rock[0] * T - 6, w = rock[1] * T + 12, y1 = (rock[2] + 1) * T + 4, h = 1.35 * T;
      if (im) c.drawImage(im, x0, y1 - h, w, h);
      else { c.fillStyle = '#9A9486'; c.beginPath(); c.ellipse(x0 + w / 2, y1 - h / 2, w / 2, h / 2, 0, 0, 7); c.fill(); }
    }
    s.drawCrack(c);
    if (!s.rig) { s.rig = Geckos.create('duchess'); Geckos.preload('duchess'); }
    if (!Geckos.ready('duchess')) return;
    // the landing shadow: down as she springs, darker as she comes down
    if (s.mode === 'spring' || s.mode === 'air') {
      const k = s.mode === 'air' ? Math.min(1, s.t / SAND.air) : 0, sx = s.x1 + s.facing * NOSE * 0.35;
      c.save(); c.globalAlpha = 0.22 + 0.4 * k; c.fillStyle = '#2E3550';
      c.beginPath(); c.ellipse(sx, s.y1 - 3, (2.4 + 1.6 * k) * T, (0.22 + 0.12 * k) * T, 0, 0, 7); c.fill(); c.restore();
    }
    const rig = s.rig;
    if (s.wig) { rig.wiggle(s.wig); s.wig = 0; }
    // [issue 32] the shake follows the sim's crouch (not render frames): it runs exactly the tell, then stops as she springs
    if (s.mode === 'crouch') { rig.wiggleDur = s.tellN; rig.wiggleT = Math.max(1, s.tellN - s.t); } else rig.wiggleT = 0;
    if (s.twitch > 0) rig.twitchT = Math.max(rig.twitchT || 0, s.twitch);
    if (s.anim) { if (s.held != null) rig.hold(s.anim, s.held); else rig.play(s.anim, (g.frame - s.animAt) / FPS); }
    else rig.setPose(s.pose);
    rig.walkSpeed = s.mode === 'run' || s.mode === 'toLog' || s.mode === 'home' ? Math.max(0.6, s.speed / PIP_RUN) : 1;
    // [issue 32] the crouch is the warning: a big fast tail shake, a bigger "!", her hips wiggling (like a cat
    // about to pounce) and her brow coming down over narrowed eyes; the shadow drops as she springs
    const crouch = s.mode === 'crouch';
    rig.wigBoost = crouch ? 2.3 : 1; rig.tellMark = false; // the "!" is drawn over the darkening (drawOver), so it reads in the dark
    const jig = s.mode === 'shake' && s.t < 40 ? Math.sin(s.t * 1.3) * 4 : crouch ? Math.sin(s.t * 1.1) * 5 : 0;
    const sc = rig.scaleFor(LEN);
    rig.draw(c, s.x + jig, s.y, sc, s.facing);
    if (crouch) { // narrowed eyes: a heavy brow slanting down over the eye
      const e = rig.point('eye', s.x + jig, s.y, sc, s.facing), f = s.facing, k = Math.min(1, s.t / 8);
      c.save(); c.strokeStyle = '#3A2414'; c.lineCap = 'round'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(e.x - f * 14, e.y - 16 * k + 2); c.lineTo(e.x + f * 12, e.y - 4 * k - 2); c.stroke();
      c.fillStyle = 'rgba(150,100,45,0.85)'; c.beginPath(); c.moveTo(e.x - f * 15, e.y - 20); c.lineTo(e.x + f * 13, e.y - 20); c.lineTo(e.x + f * 12, e.y - 4 * k - 2); c.lineTo(e.x - f * 14, e.y - 16 * k + 2); c.closePath(); c.fill();
      c.restore();
    }
    // asleep: an eye flicker as he passes (her eye opens a crack, then shuts)
    if (s.flick > 0 && s.pose === 'sleep' && !s.anim) {
      const e = rig._xf(s.x, s.y, sc, s.facing)(156, 377), k = Math.sin(Math.PI * s.flick / 12);
      c.save(); c.fillStyle = '#E8A93A'; c.beginPath(); c.ellipse(e.x, e.y, 11, 6 * k + 1, 0, 0, 7); c.fill();
      c.fillStyle = '#2A1E14'; c.fillRect(e.x - 1.5, e.y - 6 * k, 3, 12 * k); c.restore();
    }
    // awake: her eye glints amber in the dark
    if (s.dark > 0.05 && s.pose !== 'sleep') {
      const e = rig.point('eye', s.x, s.y, sc, s.facing), a = s.dark * (0.55 + 0.25 * Math.sin(r.t / 5));
      const gr = c.createRadialGradient(e.x, e.y, 0, e.x, e.y, 22);
      gr.addColorStop(0, `rgba(255,190,70,${a.toFixed(2)})`); gr.addColorStop(1, 'rgba(255,170,40,0)');
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.beginPath(); c.arc(e.x, e.y, 22, 0, 7); c.fill(); c.restore();
    }
    if ((s.mode === 'asleep' || s.mode === 'nap' || s.mode === 'curl' || (s.mode === 'gulp' && s.pose === 'sleep' && !s.anim))) {
      const tt = (r.t % 150) / 150, zx = s.x + s.facing * 70;
      c.save(); c.globalAlpha = Math.sin(tt * Math.PI) * 0.8; c.fillStyle = '#5A4632'; c.font = `bold ${18 + 10 * tt}px "Patrick Hand", sans-serif`;
      c.fillText('z', zx + 10 * tt, s.y - 80 - 30 * tt); c.restore();
    }
    if ((s.mode === 'sniff' && s.t > 10) || s.mode === 'look') { // a "?" above her head (she can't find him)
      const qx = s.nose() - s.facing * 0.9 * T, qy = s.y - 150 - 5 * Math.sin(s.t / 9);
      c.save(); c.globalAlpha = s.mode === 'look' ? 1 : Math.min(1, (s.t - 10) / 20); c.font = 'bold 48px "Patrick Hand", sans-serif'; c.textAlign = 'center';
      c.lineJoin = 'round'; c.lineWidth = 6; c.strokeStyle = '#F4EBDD'; c.strokeText('?', qx, qy);
      c.fillStyle = '#5A4632'; c.fillText('?', qx, qy); c.restore();
    }
  },
  // [issue 31] the way on: a cricket-sized crack where the tank's glass corner meets the sand (e.crack: [x, w, row]
  // tiles, the open tile row under the glass): dark inside, chipped edges, crazed glass above, plainly too small for her
  drawCrack(c) {
    const k = this.e.crack;
    if (!k) return;
    const x0 = k[0] * T, x1 = (k[0] + k[1]) * T, y0 = k[2] * T, y1 = (k[2] + 1) * T, t = this.g.frame;
    c.save();
    const gr = c.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, 'rgba(30,24,22,0.92)'); gr.addColorStop(1, 'rgba(12,10,12,0.98)');
    c.fillStyle = gr; c.beginPath();
    c.moveTo(x0 - 4, y1); c.lineTo(x0 + 2, y0 + 10); c.lineTo(x0 + 14, y0 + 2); c.lineTo(x0 + 30, y0 + 6); c.lineTo(x0 + 46, y0); c.lineTo(x1, y0 + 4); c.lineTo(x1, y1); c.closePath(); c.fill();
    c.strokeStyle = '#4A3420'; c.lineWidth = 2.5; c.stroke();
    // crazing in the glass above the gap
    c.strokeStyle = 'rgba(235,245,250,0.55)'; c.lineWidth = 1.5; c.beginPath();
    for (const [a, b, d] of [[x0 + 12, y0, -1], [x0 + 30, y0 + 4, 0.4], [x0 + 46, y0, 1]]) { c.moveTo(a, b); c.lineTo(a + d * 10, b - 26); c.lineTo(a + d * 4, b - 44); }
    c.stroke();
    // a faint draught of light from the other side, so it reads as a way through
    c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,214,150,${(0.10 + 0.05 * Math.sin(t / 20)).toFixed(3)})`;
    c.fillRect(x1 - 18, y0 + 8, 18, y1 - y0 - 8);
    c.restore();
  },
  // screen space: the darkening wash and the vignette round Pip, her eye glinting at the screen's edge
  // when her head is off the view, the black of the gulp, and the card after it
  drawOver(c, r, g) {
    const s = this, cam = g.camera, z = cam.zoom, W = 1280, H = 720 * (cam.hFrac || 1), p = g.player;
    const S2 = (x, y) => ({ x: (x - cam.x) * z, y: (y - cam.y) * z });
    if (s.dark > 0.01) {
      const d = s.dark, pc = S2(p.cx, p.cy);
      c.save();
      c.fillStyle = `rgba(46,53,80,${(0.34 * d).toFixed(3)})`; c.fillRect(0, 0, W, H);
      const r0 = 900 - 520 * d, vg = c.createRadialGradient(pc.x, pc.y, r0 * 0.35, pc.x, pc.y, r0);
      vg.addColorStop(0, 'rgba(20,22,40,0)'); vg.addColorStop(1, `rgba(20,22,40,${(0.62 * d).toFixed(3)})`);
      c.fillStyle = vg; c.fillRect(0, 0, W, H);
      c.restore();
    }
    if (s.chase && s.rig) {
      const e = S2(s.nose() - s.facing * 0.6 * T, s.y - 1.6 * T);
      if (e.x < 0 || e.x > W) {
        const ex = e.x < 0 ? 16 : W - 16, ey = Math.max(30, Math.min(H - 30, e.y)), k = 0.6 + 0.4 * Math.sin(r.t / 4);
        const gr = c.createRadialGradient(ex, ey, 0, ex, ey, 34);
        gr.addColorStop(0, `rgba(255,200,90,${(0.9 * k).toFixed(2)})`); gr.addColorStop(0.4, `rgba(232,150,40,${(0.5 * k).toFixed(2)})`); gr.addColorStop(1, 'rgba(232,150,40,0)');
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.beginPath(); c.arc(ex, ey, 34, 0, 7); c.fill();
        c.fillStyle = `rgba(40,20,10,${(0.8 * k).toFixed(2)})`; c.fillRect(ex - 1.5, ey - 7, 3, 14); c.restore();
      }
    }
    if (s.mode === 'crouch') { // [issue 32] the tell's "!": a warm splat with a light rim and a dark "!", over the wash
      const h = S2(s.nose() - s.facing * 0.7 * T, s.y - 3.1 * T), pop = Math.min(1, s.t / 6), sc = (1.3 + 0.08 * Math.sin(s.t * 0.9)) * pop * z;
      tellMarks.at = performance.now(); // (fx skips the tell event's own charcoal splat)
      c.save(); c.translate(h.x, h.y); c.scale(sc, sc);
      c.fillStyle = '#F2B441'; blob(c, 0, 0, 22, 1.7); c.fill(); c.strokeStyle = '#FFF4D6'; c.lineWidth = 4; c.stroke();
      c.fillStyle = '#2A1E14'; c.beginPath(); c.moveTo(-4, -14); c.lineTo(4, -14); c.lineTo(2, 4); c.lineTo(-2, 4); c.closePath(); c.fill();
      c.beginPath(); c.arc(0, 10, 3.2, 0, 7); c.fill(); c.restore();
    }
    if (s.black > 0) { c.save(); c.fillStyle = `rgba(8,8,14,${s.black.toFixed(3)})`; c.fillRect(0, 0, W, H); c.restore(); }
    if (s.mode === 'gulp' && s.card >= 0) {
      const a = Math.min(1, s.card / 8), cw = 900, ch = 124, cx = (W - cw) / 2, cy = H * 0.22;
      c.save(); c.globalAlpha = a;
      c.fillStyle = 'rgba(42,32,26,0.35)'; c.fillRect(cx + 6, cy + 8, cw, ch);
      c.fillStyle = '#F4EBDD'; c.fillRect(cx, cy, cw, ch);
      c.strokeStyle = '#5A4632'; c.lineWidth = 3; c.strokeRect(cx + 1.5, cy + 1.5, cw - 3, ch - 3);
      c.fillStyle = '#2A201A'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const i = TK.eaten.indexOf('. '), l1 = TK.eaten.slice(0, i + 1), rest = TK.eaten.slice(i + 2);
      c.font = 'bold 34px "Patrick Hand", sans-serif'; c.fillText(l1, W / 2, cy + 30);
      c.font = '24px "Patrick Hand", sans-serif';
      const words = rest.split(' '), lines = [''];  // the rest, wrapped to the card
      for (const w of words) { const tl = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (c.measureText(tl).width > cw - 40 && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = tl; }
      lines.slice(0, 2).forEach((l, k) => c.fillText(l, W / 2, cy + 66 + k * 30));
      c.restore();
    }
  },
};

// ---------------------------------------------------------------- beat 4: kick the pebble
function decor(g, e) {
  return Object.assign(Object.create(Decor), { g, e, phase: null, music: 'title', mode: 'sit', t: 0, px: (e.x + 0.2) * T, py: (e.y + 1) * T, vy: 0, rot: 0, land: e.land });
}
// [final-G] land: [x, y, w, h] tiles (default 1x1): a 2x2 rock makes a step 2 below the ledge (a 3 rise was pixel-exact)
const landSize = (s) => [s.land[2] || 1, s.land[3] || 1];
const Decor = {
  setPhase() {},
  place() { const s = this, g = s.g, [LW, LH] = landSize(s); for (let i = 0; i < LW; i++) for (let j = 0; j < LH; j++) g.grid.set(s.land[0] + i, s.land[1] + j, LH > 1 ? K.PROP : 1); g.gridVersion++; /* a big rock: solid, unpainted (the rock is drawn) */ s.px = (s.land[0] + LW / 2) * T; s.py = (s.land[1] + LH) * T; },
  update() {
    const s = this, g = s.g, [LW, LH] = landSize(s), place = () => s.place();
    const p = g.player;
    s.t++;
    if (s.mode === 'sit') {
      const kb = p.kickBox();
      const box = { x: s.px - 0.9 * T, y: s.py - 1.1 * T, w: 1.5 * T, h: 2.1 * T }; // it overhangs the ledge: kick it from below
      if (kb && ov(kb, box)) { s.mode = 'fall'; s.vx = (s.land[0] + LW / 2) * T - s.px; s.t = 0; g.emit('kick', { x: s.px, y: s.py - 20, dir: p.facing }); g.emit('bonk', { x: s.px, y: s.py - 20 }); }
    } else if (s.mode === 'fall') {
      const k = Math.min(1, s.t / 24);
      s.vy += 1600 * DT;
      s.px += s.vx / 24; s.py += s.vy * DT; s.rot += 0.25;
      const landY = (s.land[1] + LH) * T;
      if (k >= 1 && s.py >= landY) {
        s.mode = 'step'; s.rot = 0; place();
        g.emit('land', { x: s.px, y: s.py, hard: true }); g.emit('sfx', { name: 'bonk', gain: 0.7, rate: 0.6 });
        g.toast('Clonk! A step.', 100);
        // keep the player out of the new tile
        const tb = { x: s.land[0] * T, y: s.land[1] * T, w: LW * T, h: LH * T };
        if (ov(tb, { x: p.x, y: p.y, w: p.w, h: p.h })) p.y = tb.y - p.h;
      }
    }
  },
  draw(c) {
    const s = this, g = s.g, [LW, LH] = landSize(s);
    const big = LH > 1, h = big ? (s.mode === 'step' ? LH * T + 6 : LH * T * 0.92) : (s.mode === 'step' ? 1.1 * T : 0.9 * T), w = big ? LW * T * 1.18 : h * 343 / 233;
    if (!img(c, 'props/pebble.webp', s.px, s.py + (s.mode === 'step' ? 4 : 2), w * (s.mode === 'step' && !big ? 1.15 : 1), h, 1, s.rot)) {
      c.fillStyle = '#9A9486'; c.beginPath(); c.ellipse(s.px, s.py - h / 2, w / 2, h / 2, 0, 0, 7); c.fill();
    }
    if (s.mode === 'sit' && (g.frame % 90) < 45) { c.save(); c.globalAlpha = 0.6; c.fillStyle = '#F4EBDD'; c.font = 'bold 22px "Patrick Hand", sans-serif'; c.fillText('?', s.px - 5, s.py - h - 8); c.restore(); }
  },
};

// ---------------------------------------------------------------- beats 5-6: the lid gap
// [issue #38] the store cup on the lid, after the squeeze: it stands in his way (walking into it stops him, with a
// "Kick the cup off!" toast); a kick knocks it off the rim (the bonk, the tumble, the splat and bellow) and LID.leap
// frames later he leaps off the rim after it; LID.done frames after the kick the story takes over.
const LID = constant({ block: 0.75 * T, box: [1.0 * T, 2.8 * T], leap: 10, splat: 36, done: 61 }); // block: his right edge stops this far left of the cup's middle; box: the kick's target (half width, height)
function lid(g, e) {
  return Object.assign(Object.create(Lid), { g, e, phase: null, music: 'title', mode: 'wait', t: 0, cupX: (e.cup[0] + 0.5) * T, cupY: (e.cup[1] + 1) * T, cupRot: 0, cupVy: 0, cupVx: 0 });
}
const Lid = {
  setPhase() {},
  update() {
    const s = this, g = s.g, e = s.e;
    const gx = e.gap[0], gy = e.gap[1];       // the gap tile (solid until squeezed)
    const p = g.player, inp = g.inp;
    s.t++;
    if (s.mode === 'wait') {
      // [issue #27] jump up into the gap (his head at its mouth, still rising), or press Enter (↓) under it
      const under = Math.abs(p.cx - (gx + 0.5) * T) < 0.9 * T && p.y < (gy + 3) * T && p.y > gy * T;
      const jumpIn = under && !p.grounded && p.state === 'air' && p.vy <= 0 && p.y <= (gy + 1) * T + 4;
      if (jumpIn || (under && p.grounded && inp?.pressed?.enter)) { s.mode = 'squeeze'; s.t = 0; p.squash = -0.25; g.emit('sfx', { name: 'crinkle', gain: 0.8 }); }
    } else if (s.mode === 'squeeze') {    // through the mesh, one wriggle at a time
      p.vx = 0; p.vy = 0; p.state = 'air'; p.x = (gx + 0.5) * T - p.w / 2;
      p.y = (gy + 1) * T - p.h - (s.t / 40) * (T + p.h + 4);
      if (s.t >= 40) { p.y = gy * T - p.h - 1; p.vy = -200; s.mode = 'out'; s.t = 0; g.toast('Out! Now, off the rim...', 150); }
    } else if (s.mode === 'out') {
      // [issue #38] the cup stands in his way on the lid (a wall at its side, however high he jumps) until he kicks it
      const stop = s.cupX - LID.block;
      if (p.y + p.h <= gy * T + 4 && p.x + p.w > stop) {
        p.x = stop - p.w; if (p.vx > 0) p.vx = 0;
        if (!s.blocked) { s.blocked = true; g.toast(TK.kickCup, 180); }
      } else if (p.x + p.w < stop - T) s.blocked = false;
      const kb = p.kickBox(), [bw, bh] = LID.box;
      if (kb && ov(kb, { x: s.cupX - bw, y: s.cupY - bh, w: 2 * bw, h: bh })) { // knocked off the rim
        s.mode = 'leap'; s.t = 0; s.cupVx = 160; s.cupVy = -260;
        g.emit('bonk', { x: s.cupX, y: s.cupY - 40 });
      }
    } else if (s.mode === 'leap') {      // the cup tumbles off; he leaps after it
      s.cupVy += 1200 * DT; s.cupX += s.cupVx * DT; s.cupY += s.cupVy * DT; s.cupRot += 0.07;
      if (s.t === LID.leap) { p.vy = -520; p.vx = 300; p.state = 'air'; p.facing = 1; p.cutDone = true; p.prof = { ...p.P.fall, airSpeed: Math.max(p.P.run, 300), carry: true }; g.emit('jump', { x: p.cx, y: p.y + p.h }); } // a leap that carries him on after it
      if (s.t === LID.splat) { g.emit('bellow', {}); g.emit('sfx', { name: 'splat', gain: 0.7 }); }
      if (s.t === LID.done) { s.mode = 'done'; if (g.meta?.flags?.inTank) g.emit('story', { name: 'tankEscaped' }); else g.toast('Free! (The story carries on from New Game.)', 180); } // only a real New Game hands over to panel 4
    }
  },
  draw(c) {
    const s = this, g = s.g, gx = s.e.gap[0], gy = s.e.gap[1];
    const mesh = S.get('props/mesh-lid.webp');
    if (mesh) {
      const y0 = gy * T - 6, hh = T + 10;
      for (const [a, b] of [[2, gx], [gx + 1, 30]]) { c.drawImage(mesh, 0, 0, mesh.width, mesh.height, a * T, y0, (b - a) * T, hh); }
      c.save(); c.fillStyle = 'rgba(46,53,80,0.55)'; c.fillRect(gx * T + 4, gy * T, T - 8, T); c.restore();
    }
    // [issue 6] the pet-store cup Pip came home in (the white paper cup of the opening panels), on the
    // lid: the same cup upright and tumbling (lying on its side its length is the upright cup's height)
    const tipped = s.mode === 'leap' || s.mode === 'done';
    const h = tipped ? 1.92 * T : 2.8 * T;
    img(c, tipped ? 'props/store-cup-tipped.webp' : 'props/store-cup.webp', s.cupX, s.cupY, h * (tipped ? 440 / 277 : 346 / 400), h, 1, s.cupRot);
  },
};

const BEATS = { cup, sand, decor, lid };
// [art] what each beat draws (room-art.js loads it before the room shows); the sand's Duchess rig
const ART = {
  cup: { gecko: null, props: ['feeder-cup-open', 'tongs'] }, sand: { gecko: 'duchess', props: ['pebble'] },
  decor: { gecko: null, props: ['pebble'] }, lid: { gecko: null, props: ['mesh-lid', 'store-cup', 'store-cup-tipped'] },
};
export default {
  create(game, e) { return (BEATS[e.beat] || cup)(game, e); },
  sfx: ['bonk', 'crinkle', 'gecko-chomp', 'gecko-growl', 'gecko-skitter', 'gecko-snore', 'gulp', 'hinge-creak', 'pounce-land', 'relief-sting', 'splat', 'squeak-toy'], // [issue 14] the recorded effects the beats play (src/zone-sfx.js)
  art(e) { return { crickets: {}, ...(ART[e.beat] || ART.cup) }; },
};
