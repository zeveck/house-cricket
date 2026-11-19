// [builder A] The tank escape (zone 0): the scripted set pieces of the opening's six beats, as
// boss-registry scripts (one per room; they never hurt: "No damage anywhere in the tank").
//   { type: 'boss', boss: 'tank', beat: 'cup' | 'sand' | 'decor' | 'lid', x, y }
//   cup   (beats 1-2) the tongs dip three times (left, right, middle): dodge them; a catch just
//         lifts Pip and plops him back in the middle. Then hold Jump to leap out over the rim.
//   sand  (beat 3)    Duchess hunts (issue #7): she wakes, stalks and lunges after the tail tell
//         (taught here); only her snout catches, with a roar and a skitter (no damage). Hide in the
//         log until she sniffs, shrugs and turns away: then the way on opens. No-fail.
//   decor (beat 4)    a loose pebble on a ledge: kick it off and it lands as a step.
//   lid   (beats 5-6) jump up into the lid gap (or ↓ under it, issue #27) to squeeze through; Pip's leap off the rim tips the
//         feeder cup off the tank; then story 'tankEscaped' (panel 4, the Bedroom).
// Deterministic, no DOM in update; draws with the renderer's props and the gecko rig.
// [issue 11] Each beat's state is an object whose methods (update, draw, finish) live on a shared
// prototype and read it through `this`, never a closure: a rewind (src/rewind.js) copies the state and
// the copy runs. Room constants come from the entity (s.e); the game is s.g.
import { TILE, DT, FPS } from '../../data/movement.js';
import { TEXT } from '../../data/text.js';
import * as S from '../sprites.js';
import { K } from '../physics.js';
import * as Geckos from '../geckos.js';
import { TELL } from './base.js';
import { constant } from '../world.js';

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

// ---------------------------------------------------------------- beat 3: Duchess hunts (issue #7)
// A no-fail hunt that teaches the tail tell and hiding (design: Screens, Opening, beat 3). No damage:
// only her snout catches, and a catch is a roar and a skitter (player.shove), never hurt() or daze().
//   asleep -> eye (she wakes as Pip passes the first ripple) -> stalk -> tell -> lunge -> shake -> stalk ...
//   Pip hidden in the log while she's awake: seek (straight to the log) -> [logTell -> logLunge, if she
//   hasn't lunged yet] -> sniff -> shrug (the exit opens) -> home -> nap. Seen at the log (Jump out, or a
//   Chirp from inside): recoil, then she hunts on.
// The exit (and a quiet nap on coming back) read the room's flag SLEPT, never the mode.
const SLEPT = 'duchess-asleep';               // g.rs(room).taken: she has lost him (survives rewind)
const LEN = 400, NOSE = LEN * 0.31;            // her drawn length; centre to nose tip (px)
const SAND = constant({
  plod: 80, scurry: 300,                       // stalk speeds, px/s (scurry: he's far ahead, or she's going to the log)
  lunge: 11 * T, near: 3.2 * T, reach: 5 * T,  // lunge px/s; she stops this far (nose to Pip) and tells inside reach
  shake: 90, recoil: 90, sniff: 120, cool: 100, // frames: shake it off, seen at the log, the sniff, the roar's cooldown
  minX: 8 * T, wake: 19 * T, edge: 1.5 * T,    // she never stalks left of this; Pip past this wakes her; the skitter's left limit
});
function sand(g, e) {
  const lost = g.rs(g.room.id).taken.has(SLEPT);
  return Object.assign(Object.create(Sand), { g, e, phase: null, music: 'title', mode: lost ? 'nap' : 'asleep', t: 0, x: (e.x + 0.5) * T, y: (e.y + 1) * T,
    facing: 1, pose: 'sleep', rig: null, wig: 0, quiet: lost, woke: false, lunges: 0, catches: 0, cool: 0, roarCool: 0, aim: 0, stop: 0, bite: 'sand',
    tellN: 0, skit: 0, signed: false, bermTold: false, lastToast: null, heldBack: false, pulse: false });
}
const Sand = {
  setPhase() {},
  nose() { return this.x + this.facing * NOSE; },
  log() { return this.g.hideSpots[0] || { x: 58 * T, y: 16 * T - 24, w: T, h: 24 }; },
  logFace() { const l = this.log(); return this.facing > 0 ? l.x : l.x + l.w; },
  // her feet: the sand, or a berm or ripple top under her middle (she walks over them)
  floorAt(x) { const c = Math.floor(x / T); for (let r = 8; r < 17; r++) if (this.g.grid.at(c, r) === K.SOLID) return r * T; return 16 * T; },
  // the berm faces ahead of her nose (the side she faces), nearest first; none while she's up on one
  facesAhead() {
    const s = this, f = s.facing, n = s.nose();
    if (s.y < 15.5 * T) return [];
    return (s.e.berms || [31, 49]).map((b) => (f > 0 ? (b - 1) * T : (b + 2) * T)).filter((face) => (face - n) * f > -2).sort((a, b) => (a - b) * f);
  },
  // the snout box sits on the floor under the nose (not under her middle: on a ripple that lifted it a tile)
  snout() { const n = this.nose(), fy = this.floorAt(n - this.facing * 2); return { x: n - (this.facing > 0 ? 1.4 * T : 0), y: fy - 1.7 * T, w: 1.4 * T, h: 1.7 * T }; },
  tellFrames() { return Math.round((this.g.gentle ? TELL.gentle : TELL.normal) * FPS); }, // Gentle Mode's longer tell
  startTell(mode) {
    const s = this, n = s.tellFrames();
    s.mode = mode; s.t = 0; s.pose = 'idle'; s.tellN = n; s.wig = n; s.aim = s.g.player.cx;
    s.g.emit('tell', { x: s.nose(), y: s.y - 70, boss: 'duchess', frames: n });
  },
  // the lunge's end is fixed when it starts: where he was when the tell began, stopping at a berm face
  startLunge() {
    const s = this, f = s.facing;
    let stop = s.aim + f * 0.8 * T, bite = 'sand';
    const face = s.facesAhead()[0];
    if (face != null && (stop - face) * f > 0) { stop = face; bite = 'berm'; }
    if (f < 0) stop = Math.max(stop, SAND.minX - NOSE);
    s.stop = stop; s.bite = bite; s.mode = 'lunge'; s.t = 0; s.pose = 'strike';
    s.g.emit('sfx', { name: 'gecko-growl', gain: 0.4, rate: 1.2, x: s.x });
  },
  endLunge(bite) {
    const s = this, g = s.g, n = s.nose();
    s.lunges++; s.mode = 'shake'; s.t = 0; s.pose = 'idle';
    g.emit('dust', { x: n, y: s.y - 20 });
    if (bite === 'log') { // a thunk and bark chips: the log keeps him safe
      g.emit('sfx', { name: 'bonk', gain: 0.8, rate: 0.55, x: s.x }); g.emit('crumble', { x: n, y: s.y - 24 });
      g.emit('land', { x: n, y: s.y, hard: true });
    } else g.emit('sfx', { name: 'gecko-chomp', gain: 0.6, x: s.x });
    if (bite === 'berm' && !s.bermTold) { s.bermTold = true; g.toast(TK.bermBite, 180); }
  },
  // a catch (her snout, never her body): a roar and a skitter the way she faces; no damage
  catchPip(walkedIn) {
    const s = this, g = s.g, p = g.player;
    if (s.mode === 'lunge') s.lunges++;
    s.roarCool = SAND.cool; s.mode = 'shake'; s.t = 0; s.pose = 'idle'; s.skit = 40;
    g.emit('sfx', { name: 'gecko-growl', gain: 0.7, rate: 0.7, x: s.x });
    p.shove(s.facing, g.ctx, { vx: 380, vy: -420, lock: 30 });
    const l = s.log(), toLog = p.cx + s.facing * 4 * T > l.x + l.w ? TK.caughtLogBack : TK.caughtLog; // the arrow points to the log from where he lands
    const pick = walkedIn ? [TK.caughtWalk, toLog] : s.catches === 0 ? [TK.caughtFirst, toLog] : [toLog, TK.caughtFirst];
    const text = pick[0] === s.lastToast ? pick[1] : pick[0];   // never the same one twice in a row
    s.lastToast = text; g.toast(text, 150);
    s.catches++; if (s.catches >= 2) s.pulse = true;
  },
  seen() { // he left the log (or chirped in it) while she was at it: a roar and a recoil, no skitter
    const s = this;
    s.mode = 'recoil'; s.t = 0; s.pose = 'idle'; s.roarCool = SAND.cool;
    s.g.emit('sfx', { name: 'gecko-growl', gain: 0.7, rate: 0.7, x: s.x });
  },
  toward(x, v) { const s = this, d = x - s.x; s.x += Math.sign(d) * Math.min(Math.abs(d), v * DT); return Math.abs(d) <= v * DT; },
  update() {
    const s = this, g = s.g, p = g.player, rs = g.rs(g.room.id);
    const EXIT = (s.e.exit ?? 60) * T;
    s.t++;
    if (s.cool > 0) s.cool--;
    if (s.roarCool > 0) s.roarCool--;
    const lost = rs.taken.has(SLEPT);
    // the way on stays shut until she has lost him
    if (!lost && p.x + p.w > EXIT) {
      p.x = EXIT - p.w; if (p.vx > 0) p.vx = 0;
      if (!s.heldBack) { s.heldBack = true; g.toast(TK.exitShut, 180); }
    } else if (p.x + p.w < EXIT - T) s.heldBack = false;
    // a skitter never takes him out of the room
    if (s.skit > 0) { s.skit--; if (p.x < SAND.edge) { p.x = SAND.edge; if (p.vx < 0) p.vx = 0; } }
    s.y += (s.floorAt(s.x) - s.y) * 0.25;
    const hidden = p.state === 'hide';
    let revealed = false;
    if (hidden) for (let i = g.fx.length - 1; i >= 0 && g.fx[i].f === g.frame; i--) if (g.fx[i].type === 'reveal') revealed = true;
    const awake = s.mode !== 'asleep' && s.mode !== 'eye' && !lost;
    // the "Hide in the log!" sign: once she has lunged, or once he's near the log
    if (!s.signed && !lost && s.mode !== 'asleep' && (s.lunges > 0 || Math.abs(p.cx - (s.log().x + s.log().w / 2)) < 6 * T)) {
      // [issue 9] a note at the log's opening (it faces right), fluttering down
      const l = s.log(), rx = Math.floor((l.x + l.w) / T); // the first column right of the hide spot; the note just past the opening
      s.signed = true; g.scriptNote('opening.tank.hideLog', { x: rx, y: s.e.y ?? 15, w: 2, nx: rx + 1, text: TK.hideLog });
    }
    const live = () => !p.hidden && s.roarCool === 0 && ov(s.snout(), { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 });
    switch (s.mode) {
      case 'asleep':
        s.pose = 'sleep';
        if (!lost && p.cx > SAND.wake) {
          s.mode = 'eye'; s.t = 0; s.pose = 'idle'; g.emit('sfx', { name: 'gecko-growl', gain: 0.5, rate: 1.1 });
          if (!s.woke) g.toast(TK.duchessWakes[0], 150); // the wake line, once per visit
        }
        break;
      case 'eye':
        if (s.t === 70 && !s.woke) g.toast(TK.duchessWakes[1], 150);
        if (s.t > 110) { s.woke = true; s.mode = 'stalk'; s.t = 0; s.cool = 30; }
        break;
      case 'stalk': {
        if (hidden) { s.mode = 'seek'; s.t = 0; break; }
        if ((p.cx - s.x) * s.facing < -1.5 * T) s.facing = -s.facing; // he got behind her: she turns
        const ahead = (p.cx - s.nose()) * s.facing;
        let want = Math.max(SAND.minX, p.cx - s.facing * (SAND.near + NOSE));
        // a berm between them with him close behind it: she stops at its face (and lunges into it);
        // further on, she walks over it
        const face = s.facesAhead()[0];
        if (face != null && (want + s.facing * NOSE - face) * s.facing > 0 && (p.cx - face) * s.facing + 2 < SAND.reach) want = face - s.facing * (NOSE + 2); // the same reach she tells inside
        const there = s.toward(want, ahead > 9 * T ? SAND.scurry : SAND.plod);
        s.pose = there ? 'idle' : 'walk';
        if (live()) { s.catchPip(true); break; }
        if (s.cool === 0 && ahead > -0.5 * T && ahead < SAND.reach && p.y + p.h > 13.4 * T && !p.hidden) s.startTell('tell');
        break;
      }
      case 'tell':
        if (hidden) { s.mode = 'seek'; s.t = 0; break; }
        if (live()) { s.catchPip(true); break; }
        if (s.t >= s.tellN) s.startLunge();
        break;
      case 'lunge': {
        const n = s.nose();
        let stop = s.stop, bite = s.bite;
        if (hidden && (s.logFace() - n) * s.facing >= -2 && (stop - s.logFace()) * s.facing > 0) { stop = s.logFace(); bite = 'log'; } // a lunge at a hidden Pip thunks into the log
        const arrived = s.toward(s.x + (stop - n), SAND.lunge);
        if (live()) { s.catchPip(false); break; }
        if (arrived || s.t > 45) s.endLunge(bite);
        break;
      }
      case 'shake':                 // she shakes it off (sand, a berm, a catch)
        s.pose = 'idle';
        if (s.t > SAND.shake) { s.mode = hidden ? 'seek' : 'stalk'; s.t = 0; s.cool = 30; }
        break;
      case 'seek': {                // straight to the log at her scurry speed
        if (!hidden) { s.mode = 'stalk'; s.t = 0; s.cool = 20; break; }
        if (revealed) { s.seen(); break; }
        const l = s.log(), lc = l.x + l.w / 2;
        s.facing = Math.sign(lc - s.x) || 1;
        const noseAt = s.logFace() - s.facing * (s.lunges === 0 ? 3 * T : 0.4 * T);
        s.pose = 'walk';
        if (s.toward(noseAt - s.facing * NOSE, SAND.scurry)) {
          if (s.lunges === 0) s.startTell('logTell');   // she hasn't lunged yet: the tell, at the log
          else { s.mode = 'sniff'; s.t = 0; s.pose = 'idle'; g.toast(TK.sniff, 150); }
        }
        break;
      }
      case 'logTell':
        if (!hidden || revealed) { s.seen(); break; }
        if (s.t >= s.tellN) { s.mode = 'logLunge'; s.t = 0; s.pose = 'strike'; g.emit('sfx', { name: 'gecko-growl', gain: 0.4, rate: 1.2, x: s.x }); }
        break;
      case 'logLunge':
        if (!hidden || revealed) { s.seen(); break; }
        if (s.toward(s.x + (s.logFace() - s.nose()), SAND.lunge) || s.t > 45) {
          s.endLunge('log'); s.mode = 'sniff'; s.t = -30; g.toast(TK.sniff, 150); // the thunk, a beat, then the sniff
        }
        break;
      case 'sniff':
        s.pose = s.t > 0 && Math.floor(s.t / 20) % 2 ? 'walk' : 'idle';
        if (!hidden || revealed) { s.seen(); break; }
        if (s.t > SAND.sniff) { // she shrugs and turns away: the way on opens right then
          rs.taken.add(SLEPT);
          g.retireNote('opening.tank.hideLog'); // the note's job is done
          s.mode = 'shrug'; s.t = 0; s.pose = 'idle'; s.pulse = false;
          g.toast(TK.shrug, 150); g.toast(TK.lost, 180);
        }
        break;
      case 'recoil':                // seen at the log: she rears back, roars, and gives him a moment
        s.pose = 'idle';
        if (s.t < 20) s.x = Math.max(SAND.minX, s.x - s.facing * 4.5 * T * DT);
        if (s.t > SAND.recoil) { s.mode = hidden ? 'seek' : 'stalk'; s.t = 0; s.cool = 30; }
        break;
      case 'shrug':                 // a step back from the log (her tail clear of it), then she turns away
        s.pose = s.t <= 30 ? 'walk' : 'idle';
        if (s.t <= 30) s.x -= s.facing * 2.5 * T / 30;
        if (s.t === 30) s.facing = -1;
        if (s.t > 50) { s.mode = 'home'; s.t = 0; }
        break;
      case 'home':                  // her plod home and her nap play on behind him
        s.pose = 'walk'; s.facing = -1;
        if (s.toward((s.e.x + 0.5) * T, SAND.plod * 0.8)) { s.mode = 'nap'; s.t = 0; s.pose = 'sleep'; s.facing = 1; }
        break;
      case 'nap':
        s.pose = 'sleep';
        if (!s.quiet && s.t % 150 === 1) g.emit('sfx', { name: 'gecko-snore', gain: 0.35, x: s.x });
        break;
      default: break;
    }
    // hidden while she comes and sniffs: only Jump leaves the log (player.js _hide)
    p.hideHold = hidden && awake;
  },
  draw(c, r) {
    const s = this, g = s.g;
    // from the second catch: the log's outline pulses
    if (s.pulse && !g.player.hidden) {
      const l = s.log(), k = 0.5 + 0.5 * Math.sin(r.t / 6);
      c.save(); c.setLineDash([7, 5]); c.strokeStyle = `rgba(242,196,109,${0.45 + 0.5 * k})`; c.lineWidth = 3 + k * 2;
      c.beginPath(); c.ellipse(l.x + l.w / 2, l.y + l.h, l.w * 0.9 + k * 6, l.h * 1.9 + k * 4, 0, Math.PI, 0); c.stroke(); c.restore();
    }
    if (!s.rig) { s.rig = Geckos.create('duchess'); Geckos.preload('duchess'); }
    if (!Geckos.ready('duchess')) return;
    if (s.wig) { s.rig.wiggle(s.wig); s.wig = 0; }
    s.rig.setPose(s.pose); s.rig.walkSpeed = s.mode === 'seek' ? 2.4 : 1.2;
    const jig = s.mode === 'shake' && s.t < 40 ? Math.sin(s.t * 1.3) * 4 : 0;
    s.rig.draw(c, s.x + jig, s.y, s.rig.scaleFor(LEN), s.facing);
    if (s.mode === 'asleep' || s.mode === 'nap') {
      const tt = (r.t % 150) / 150;
      c.save(); c.globalAlpha = Math.sin(tt * Math.PI) * 0.8; c.fillStyle = '#5A4632'; c.font = `bold ${18 + 10 * tt}px "Patrick Hand", sans-serif`;
      c.fillText('z', s.x + 90 + 10 * tt, s.y - 110 - 30 * tt); c.restore();
    }
    if (s.mode === 'sniff' && s.t > 0) { // a "?" above her head
      const qx = s.nose() - s.facing * 0.9 * T, qy = s.y - 170 - 5 * Math.sin(s.t / 9);
      c.save(); c.globalAlpha = Math.min(1, s.t / 20); c.font = 'bold 48px "Patrick Hand", sans-serif'; c.textAlign = 'center';
      c.lineJoin = 'round'; c.lineWidth = 6; c.strokeStyle = '#F4EBDD'; c.strokeText('?', qx, qy);
      c.fillStyle = '#5A4632'; c.fillText('?', qx, qy); c.restore();
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
      if (p.cx > (e.edge ?? 27) * T) { s.mode = 'leap'; s.t = 0; p.vy = -520; p.vx = 300; p.state = 'air'; g.emit('jump', { x: p.cx, y: p.y + p.h }); }
    } else if (s.mode === 'leap') {
      if (s.t === 14) { s.cupVx = 160; s.cupVy = -260; g.emit('bonk', { x: s.cupX, y: s.cupY - 40 }); }
      if (s.t > 14) { s.cupVy += 1200 * DT; s.cupX += s.cupVx * DT; s.cupY += s.cupVy * DT; s.cupRot += 0.07; }
      if (s.t === 50) { g.emit('bellow', {}); g.emit('sfx', { name: 'splat', gain: 0.7 }); }
      if (s.t === 75) { s.mode = 'done'; if (g.meta?.flags?.inTank) g.emit('story', { name: 'tankEscaped' }); else g.toast('Free! (The story carries on from New Game.)', 180); } // only a real New Game hands over to panel 4
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
  cup: { gecko: null, props: ['feeder-cup-open', 'tongs'] }, sand: { gecko: 'duchess', props: [] },
  decor: { gecko: null, props: ['pebble'] }, lid: { gecko: null, props: ['mesh-lid', 'store-cup', 'store-cup-tipped'] },
};
export default {
  create(game, e) { return (BEATS[e.beat] || cup)(game, e); },
  sfx: ['bonk', 'crinkle', 'gecko-chomp', 'gecko-growl', 'gecko-snore', 'hinge-creak', 'splat', 'squeak-toy'], // [issue 14] the recorded effects the beats play (src/zone-sfx.js)
  art(e) { return { crickets: {}, ...(ART[e.beat] || ART.cup) }; },
};
