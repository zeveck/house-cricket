// Gecko rig (design: "Geckos", tools/split-gecko.py). Render-only; never touches the sim.
//
//   import * as Geckos from './geckos.js';
//   const rig = Geckos.create('duchess');         // loads sprites/geckos/duchess/{meta.json, body, tail, legs, frames}
//   rig.setPose('walk'); rig.walkSpeed = 1.5;      // 'idle' | 'walk' | 'strike' | 'sleep' | any extra frame ('glide', 'lick')
//   rig.play('run');  rig.play('wake', 0)          // [issue 26] a frame animation (meta.anims): plays at ANIMS' rate from
//                                                   // t seconds (0 restarts; omitted carries on); rig.animDone once a one-shot ends
//   rig.hold('pounce', 0)                           // show one frame of it and stay there (the pounce's crouch/launch/air/land)
//   rig.wiggle(60);                                 // tail-tip tell for 60 frames (+ "!" splat, + Geckos.onTell / rig.onTell hook)
//   rig.twitchT = 40;                               // [issue 24] a sleepy tail twitch for 40 frames (no "!", no hook)
//   rig.draw(ctx, x, y, scale, facing);             // see "Anchor" below; facing -1 = left (as painted), +1 = right
//   rig.box(x, y, scale, facing)  -> {x, y, w, h}   the body's on-screen box (no tail), for hitboxes
//   rig.point('eye'|'nose'|'pivot'|'tail', x, y, scale, facing) -> {x, y}  on-screen points (tail = tail tip)
//   rig.scaleFor(lengthPx)                           scale giving that nose-to-tail length (wide) / height (tall)
//
// Anchor: wide geckos (side view, tail to the right in the art): (x, y) is the floor point under
// the middle of the body (nose to tail base). Tall geckos (clinging upright, tail down: bigtok,
// nana): (x, y) is the centre of the body (without tail). meta.json is in idle.webp pixels.
//
// Drawing (the design's pipeline): the tail is ONE strip bent along a curve and drawn as 4 px
// slices (1 px overlap) so it bends without gaps; the body covers the 12 px seam overlap; the two
// near lower legs swing on their pivots in a 2-beat walk; breathing is a slow vertical scale;
// the eye gets a code-drawn glint. Strike/sleep frames are placed at meta.frames[f].at with the
// tail attached at their own pivot (sleep curls it). Extra frames (Kite's glide, Lashes' lick)
// are whole pictures (with their tail) drawn bottom-centred on the idle canvas.
// [issue 26] Frame animations (meta.anims, from split-gecko.py --frame <name> <anim>/<n>): whole-body
// pictures without the tail, each drawn at its `at` and `size` (idle px; the WebP may be stored
// smaller) with the code tail attached at its own `pivot`, so the tell's wiggle stays code-drawn.
// While a frame plays the code legs, walk bob and leg swing are off (the picture has its legs).
import * as S from './sprites.js';
import { blob, tellMarks } from './fx.js'; // [polish-V] tellMarks: a rig drew its own "!" (fx skips the event's splat)

export const NAMES = ['duchess', 'chikchak', 'bigtok', 'lashes', 'peridot', 'gargy', 'mossy', 'kite', 'ember', 'nana'];
const TAU = Math.PI * 2;
const SLICE = 4;

// per-gecko feel: tail sway amplitude (rad), curl when asleep, leg swing (rad), breath
const TUNE = {
  default: { amp: 0.10, walkAmp: 0.22, curl: 1.7, leg: 0.32, breath: 0.012, wig: 0.55 },
  nana:    { amp: 0.04, walkAmp: 0.08, curl: 0.5, wig: 0.35,   // fat curled tail already
             // [final-G] both eyes in body.webp pixels [cx, cy, rx, ry] (near, far) for drowsy lids (rig.lids 0..1)
             eyes: [[375, 170, 74, 66], [152, 78, 46, 50]], lid: '#BE9862' },
  bigtok:  { amp: 0.12, walkAmp: 0.18, curl: 1.2 },
  mossy:   { amp: 0.07, curl: 0.9, pivots: { sleep: [975, 518] } }, // leaf tail: stiffer; meta's sleep pivot missed the stub
  gargy:   { amp: 0.08 },
  kite:    { amp: 0.09, curl: 1.4 },
};

// Hooks: Geckos.onTell(rig) when any rig starts a tail wiggle (the audio rattle-swish);
// Geckos.touch = true makes the "!" splat 1.5x (touch screens).
export let onTell = null;
export function setOnTell(fn) { onTell = fn; }
export const opts = { touch: false };

const base = (n) => `sprites/geckos/${n}`;
// [art] every picture a rig can draw: body, tail, legs, strike/sleep frames and the extra poses
// (Kite's glide, Lashes' lick): each .webp in its folder but idle.webp and portrait.webp (dialog
// portraits, never drawn by the rig). From the asset list, so it doesn't wait on meta.json.
// [issue 26] plus the frame animations in anim/<anim>/NN.webp.
const filesMemo = new Map();
export function files(name) {
  if (!filesMemo.has(name)) {
    const dir = base(name) + '/';
    filesMemo.set(name, S.list(dir).filter((f) => f.endsWith('.webp') && !/\/(idle|portrait)\.webp$/.test(f) &&
      (!f.includes('/', dir.length) || /^anim\/[a-z-]+\/\d+\.webp$/.test(f.slice(dir.length)))));
  }
  return filesMemo.get(name);
}
// [issue 26] frame animations: frames per second and whether it loops (a one-shot holds its last
// frame). The pounce is posed by state (rig.hold), so its rate only matters if it's played.
export const ANIMS = { run: { fps: 12, loop: true }, pounce: { fps: 8, loop: false }, wake: { fps: 6, loop: false }, tongue: { fps: 7, loop: false } };
// the animations a gecko has: { run: [frame, ...], ... } from its meta.json (null until it loads)
export function anims(name) { const m = S.getJSON(`${base(name)}/meta.json`); return m ? (m.anims || {}) : null; }
// start loading a gecko's art (call on entering the lair room or earlier); held with the zone
export function preload(name) { S.getJSON(`${base(name)}/meta.json`); S.preload(files(name)); S.zoneHold(base(name) + '/'); }
export function ready(name) { return !!S.getJSON(`${base(name)}/meta.json`) && S.ready(files(name)); }

export function create(name, o = {}) { return new GeckoRig(name, o); }

export class GeckoRig {
  constructor(name, o = {}) {
    this.name = name;
    this.dir = base(name);
    this.tune = { ...TUNE.default, ...(TUNE[name] || {}), ...(o.tune || {}) };
    this.pose = 'idle';
    this.walkSpeed = 1;      // steps per second-ish (leg cycle rate); 0 holds the legs
    this.t = 0;              // seconds (advanced by tick; draw ticks once per call unless autoTick=false)
    this.phase = 0;          // walk phase (rad)
    this.wiggleT = 0; this.wiggleDur = 0; this.twitchT = 0;
    this.tellMark = true;    // draw the "!" ink splat during a wiggle
    this.onTell = o.onTell || null;
    this.autoTick = o.autoTick !== false;
    this.breathe = true;
    this.glint = true;
    this.alpha = 1;
    preload(name);
  }
  get meta() { return S.getJSON(`${this.dir}/meta.json`); }
  setPose(p) { if (p !== this.pose) { this.pose = p; this.poseT = 0; this.held = null; } return this; }
  // [issue 26] play a frame animation from t seconds (omit t to carry on if it's already playing)
  play(anim, t) {
    if (anim !== this.pose || this.held != null) { this.pose = anim; this.poseT = 0; this.held = null; }
    if (t != null) this.poseT = t;
    return this;
  }
  // [issue 26] show frame i of an animation and stay on it
  hold(anim, i) { if (anim !== this.pose) { this.pose = anim; this.poseT = 0; } this.held = i; return this; }
  // [issue 26] the frame animation frame being shown ({file, at, size, pivot, eye}), or null
  animFrame() {
    const list = this.meta?.anims?.[this.pose];
    if (!list || !list.length) return null;
    const a = ANIMS[this.pose] || { fps: 8, loop: false };
    let i = this.held != null ? this.held : Math.floor((this.poseT || 0) * a.fps * (this.pose === 'run' ? this.walkSpeed || 1 : 1));
    if (this.held == null && a.loop) i %= list.length;
    i = Math.max(0, Math.min(list.length - 1, i));
    return list[i];
  }
  // [issue 26] a one-shot animation has reached its last frame
  get animDone() {
    const list = this.meta?.anims?.[this.pose], a = ANIMS[this.pose];
    if (!list || !a || a.loop || this.held != null) return false;
    return (this.poseT || 0) * a.fps >= list.length;
  }
  wiggle(frames = 60) {
    this.wiggleT = frames; this.wiggleDur = frames;
    if (this.onTell) this.onTell(this);
    if (onTell) onTell(this);
    return this;
  }
  tick(dt = 1 / 60) {
    this.t += dt; this.poseT = (this.poseT || 0) + dt;
    if (this.pose === 'walk' || this.pose === 'run') this.phase += dt * this.walkSpeed * TAU; // run: the tail's sway
    else this.phase *= 0.85; // legs settle
    if (this.wiggleT > 0) this.wiggleT--;
    if (this.twitchT > 0) this.twitchT--;
  }
  scaleFor(len) { const m = this.meta; if (!m) return 0.5; return len / (m.frame === 'tall' ? m.size[1] : m.size[0]); }

  // art-space anchor (see header)
  anchor() {
    const m = this.meta, bb = S.bbox(`${this.dir}/body.webp`) || { x: 0, y: 0, w: m.size[0], h: m.size[1] };
    if (m.frame === 'tall') return [bb.x + bb.w / 2, bb.y + (m.pivot[1] - bb.y) / 2];
    return [(bb.x + m.pivot[0]) / 2, m.size[1]];
  }
  artFacing() {
    const m = this.meta;
    if (m.frame === 'wide') return -1;
    return m.eye[0] > m.size[0] / 2 ? 1 : -1;
  }
  // art coords -> screen
  _xf(x, y, scale, facing) {
    const [ax, ay] = this.anchor(), f = facing === this.artFacing() ? 1 : -1;
    return (px, py) => ({ x: x + (px - ax) * scale * f, y: y + (py - ay) * scale });
  }
  box(x, y, scale, facing) {
    const m = this.meta; if (!m) return { x, y, w: 0, h: 0 };
    const bb = S.bbox(`${this.dir}/body.webp`) || { x: 0, y: 0, w: m.size[0], h: m.size[1] };
    const xf = this._xf(x, y, scale, facing);
    const a = xf(bb.x, bb.y), b = xf(m.frame === 'tall' ? bb.x + bb.w : m.pivot[0], m.frame === 'tall' ? m.pivot[1] : bb.y + bb.h);
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
  }
  point(name, x, y, scale, facing) {
    const m = this.meta; if (!m) return { x, y };
    const xf = this._xf(x, y, scale, facing);
    const bb = S.bbox(`${this.dir}/body.webp`) || { x: 0, y: 0, w: m.size[0], h: m.size[1] };
    const af = this.animFrame(); // [issue 26] a playing frame's own eye and tail root
    if (name === 'eye') return af?.eye ? xf(af.eye[0], af.eye[1]) : xf(m.eye[0], m.eye[1]);
    if (name === 'pivot') return af ? xf(af.pivot[0], af.pivot[1]) : xf(m.pivot[0], m.pivot[1]);
    if (name === 'nose') return m.frame === 'tall' ? xf(m.eye[0], bb.y) : xf(bb.x, m.eye[1] + 0.12 * bb.h);
    if (name === 'tail') { const tb = m.tailBox; return m.frame === 'tall' ? xf(m.pivot[0], tb[3]) : xf(tb[2], m.pivot[1]); }
    return xf(m.pivot[0], m.pivot[1]);
  }

  // ---- drawing ----
  draw(c, x, y, scale = 0.5, facing = -1) {
    if (this.autoTick) this.tick();
    const m = this.meta;
    const body = S.get(`${this.dir}/body.webp`), tail = S.get(`${this.dir}/tail.webp`);
    if (!m || !body || !tail) return false;
    const [ax, ay] = this.anchor();
    const flip = facing === this.artFacing() ? 1 : -1;
    const tn = this.tune, pose = this.pose, wide = m.frame === 'wide';
    const af = this.animFrame(), afImg = af ? S.get(`${this.dir}/${af.file}`) : null; // [issue 26]
    c.save();
    c.globalAlpha *= this.alpha;
    c.translate(x, y);
    c.scale(scale * flip, scale);
    // breathing (about the floor for wide, about the body centre for tall)
    const br = this.breathe && pose !== 'strike' && pose !== 'run' && pose !== 'pounce' ? Math.sin(this.t * TAU / (pose === 'sleep' ? 4.2 : 3.0)) * tn.breath * (pose === 'sleep' ? 1.6 : 1) : 0;
    c.scale(1 - br * 0.3, 1 + br);
    // walk bob
    const bob = pose === 'walk' && !af ? -Math.abs(Math.sin(this.phase)) * 6 : 0;
    c.translate(-ax, -ay + bob);

    const extra = !af && !['idle', 'walk', 'strike', 'sleep'].includes(pose) ? S.get(`${this.dir}/${pose}.webp`) : null;
    if (af) {
      // [issue 26] a frame animation: the code tail at this frame's pivot, then the picture over its seam.
      // Until the frame's picture loads, the plain body stands in (tail at the idle pivot).
      if (this.showTail !== false) this._tail(c, m, tail, afImg ? af.pivot : m.pivot, pose, afImg ? af.tail || 1 : 1, afImg ? af.ang || 0 : 0);
      if (afImg) {
        c.drawImage(afImg, af.at[0], af.at[1], af.size[0], af.size[1]);
        if (this.glint && af.eye) this._glint(c, { eye: af.eye });
      } else {
        c.drawImage(body, 0, 0);
        this._legs(c, m);
      }
    } else if (extra) {
      c.drawImage(extra, m.size[0] / 2 - extra.width / 2, m.size[1] - extra.height);
    } else {
      const fr = (pose === 'strike' || pose === 'sleep') && m.frames?.[pose] ? m.frames[pose] : null;
      const frImg = fr ? S.get(`${this.dir}/${fr.file}`) : null;
      const pivot = frImg ? (tn.pivots?.[pose] || fr.pivot) : m.pivot;
      if (this.showTail !== false) this._tail(c, m, tail, pivot, pose, frImg ? fr.tail || 1 : 1, frImg && !tn.pivots?.[pose] ? fr.ang || 0 : 0); // [polish] Nana hides hers while it sweeps the arena
      if (frImg) {
        c.drawImage(frImg, fr.at[0], fr.at[1]);
      } else {
        c.drawImage(body, 0, 0);
        this._legs(c, m);
        if (this.glint) this._glint(c, m);
        if (this.lids > 0 && tn.eyes) this._lids(c, tn); // [final-G] drawn in art space: they sit on the eyes
      }
    }
    // the tell: "!" ink splat over the head
    if (this.wiggleT > 0 && this.tellMark) {
      const k = 1 - this.wiggleT / this.wiggleDur;
      const pop = Math.min(1, k * 6), s = (opts.touch ? 1.5 : 1) * (this.markScale || 1) / scale * pop; // [issue 32] markScale: a bigger "!" (the tank's crouch)
      // [polish-V] above the head only (never over the eye): clear of the body's top by the splat's size
      const bbT = Math.min((S.bbox(`${this.dir}/body.webp`) || { y: 0 }).y, af && afImg ? af.at[1] : Infinity);
      const ey = af?.eye && afImg ? af.eye : m.eye; // [issue 26] over a frame's own head
      const hx = ey[0], hy = Math.min(ey[1] - 80 / scale, bbT - 46 * (opts.touch ? 1.5 : 1) / scale);
      tellMarks.at = performance.now();
      c.save(); c.translate(hx, hy); c.scale(s * flip, s);
      c.fillStyle = 'rgba(42,32,26,0.92)'; blob(c, 0, 0, 22, 1.7); c.fill();
      c.fillStyle = '#F4EBDD';
      c.beginPath(); c.moveTo(-4, -14); c.lineTo(4, -14); c.lineTo(2, 4); c.lineTo(-2, 4); c.closePath(); c.fill();
      c.beginPath(); c.arc(0, 10, 3.2, 0, TAU); c.fill();
      c.restore();
    }
    c.restore();
    this.lastBox = this.frameBox(x, y, scale, facing); // [polish-V] what the camera frames in an arena
    return true;
  }
  // [polish-V] the drawn gecko in room px: the body, half its tail, room above the head for the "!"
  frameBox(x, y, scale, facing) {
    const b = this.box(x, y, scale, facing), m = this.meta;
    if (!b.w) return null;
    const tall = m.frame === 'tall', tail = this.point('tail', x, y, scale, facing);
    let x0 = b.x, x1 = b.x + b.w, y0 = b.y - 70, y1 = b.y + b.h;
    if (tall) y1 = Math.max(y1, y1 + (tail.y - y1) * 0.4);
    else { const tx = b.x + b.w / 2 + (tail.x - (b.x + b.w / 2)) * 0.6; x0 = Math.min(x0, tx); x1 = Math.max(x1, tx); }
    return { x0, y0, x1, y1 };
  }

  // bend angle (rad) at u = 0..1 along the tail, relative to the tail's rest direction
  _bend(u, pose) {
    const tn = this.tune, t = this.t;
    let a;
    if (pose === 'sleep') a = -tn.curl * Math.pow(u, 1.5) + Math.sin(t * 0.8) * 0.03 * u;
    else if (pose === 'walk' || pose === 'run') a = tn.walkAmp * Math.sin(this.phase - u * 3.5) * u;
    else if (pose === 'strike') a = -0.18 * u + 0.08 * Math.sin(t * 9 - u * 4) * u;
    else a = tn.amp * Math.sin(t * 1.3 - u * 2.4) * u + 0.03 * Math.sin(t * 0.5) * u;
    if (this.twitchT > 0) a += 0.32 * Math.sin(t * 16) * Math.min(1, this.twitchT / 12) * u * u; // [issue 24] a sleepy tail twitch (no tell)
    if (this.wiggleT > 0) {
      const env = Math.min(1, this.wiggleT / 10, (this.wiggleDur - this.wiggleT) / 6 + 0.2);
      // [issue 32] wigBoost (set by a script, the tank's crouch): a bigger, faster shake over more of the tail
      const wb = this.wigBoost || 1, from = wb > 1 ? 0.35 : 0.55;
      const tip = Math.max(0, (u - from) / (1 - from));
      a += tn.wig * wb * env * Math.sin(t * (wb > 1 ? 36 : 28)) * tip * tip;
    }
    return a;
  }

  // the tail strip, bent, in 4 px slices (on-screen px) with 1 px overlap. The strip is first
  // resampled to the on-screen scale (cached per scale step) so each slice is copied 1:1;
  // drawing tiny slices of the full-size art would lose alpha at every slice edge.
  _scaledTail(img, k) {
    const step = Math.max(0.02, Math.round(k * 50) / 50);
    if (this._tc && this._tc.k === step && this._tc.img === img) return this._tc;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.width * step)); cv.height = Math.max(1, Math.round(img.height * step));
    const g = cv.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, cv.width, cv.height);
    this._tc = { k: step, img, cv };
    return this._tc;
  }
  // [issue 30] k0: the frame's tail scale (meta frames[f].tail: a sleep picture drawn smaller than the idle) and
  // ang: how far the frame's back slopes past the idle's at the cut (meta "ang"), both about the tail root
  _tail(c, m, img, pivot, pose, k0 = 1, ang = 0) {
    if (k0 !== 1 || ang) { c.save(); c.translate(pivot[0], pivot[1]); c.rotate(ang); c.scale(k0, k0); c.translate(-pivot[0], -pivot[1]); this._tail(c, m, img, pivot, pose, 1, 0); c.restore(); return; }
    const tb = m.tailBox, ov = m.overlap || 0;
    const wide = m.tailAxis !== 'y';
    const tr = c.getTransform();
    const k = Math.max(0.02, Math.hypot(tr.a, tr.b)); // device px per art px
    const { cv, k: ks } = this._scaledTail(img, k);
    const len = wide ? img.width : img.height;             // art px
    const L = Math.max(1, len - ov);
    const cOff = wide ? m.pivot[1] - tb[1] : m.pivot[0] - tb[0];
    const baseAng = wide ? 0 : Math.PI / 2;
    const slice = SLICE / ks;                               // art px per slice
    const lenS = wide ? cv.width : cv.height;               // scaled px
    let px = pivot[0] - (wide ? ov : 0), py = pivot[1] - (wide ? 0 : ov);
    for (let s0 = 0; s0 < lenS; s0 += SLICE) {
      const sArt = s0 / ks - ov;
      const u = Math.max(0, sArt / L);
      const a = sArt > 0 ? this._bend(u, pose) : 0;
      const w = Math.min(SLICE + 1, lenS - s0);
      c.save();
      c.translate(px, py); c.rotate(a);
      if (wide) c.drawImage(cv, s0, 0, w, cv.height, 0, -cOff, w / ks, cv.height / ks);
      else c.drawImage(cv, 0, s0, cv.width, w, -cOff, 0, cv.width / ks, w / ks);
      c.restore();
      const ang = baseAng + a;
      px += Math.cos(ang) * slice; py += Math.sin(ang) * slice;
    }
    this._tip = [px, py];
  }

  _legs(c, m) {
    const amp = this.tune.leg;
    m.legs.forEach((l, i) => {
      const img = S.get(`${this.dir}/${l.file}`);
      if (!img) return;
      const ph = this.phase + (i % 2 ? Math.PI : 0);
      const a = Math.sin(ph) * amp * Math.min(1, Math.abs(this.phase) > 0.01 ? 1 : 0);
      const lift = Math.max(0, Math.cos(ph)) * 10 * (this.pose === 'walk' ? 1 : 0);
      c.save();
      c.translate(l.pivot[0], l.pivot[1] - lift);
      c.rotate(a);
      c.drawImage(img, l.box[0] - l.pivot[0], l.box[1] - l.pivot[1]);
      c.restore();
    });
  }

  // [final-G] drowsy eyelids over each eye (art space, so they follow the scale, flip and breathing)
  _lids(c, tn) {
    const k = Math.min(1, this.lids);
    for (const [cx, cy, rx, ry] of tn.eyes) {
      c.save();
      c.beginPath(); c.ellipse(cx, cy, rx * 1.04, ry * 1.04, 0, 0, TAU); c.clip();
      const edge = cy - ry * 1.05 + ry * 2.1 * k;       // the lid's lower rim
      c.fillStyle = tn.lid || '#B9955F';
      c.beginPath(); c.moveTo(cx - rx * 1.2, cy - ry * 1.2); c.lineTo(cx + rx * 1.2, cy - ry * 1.2);
      c.lineTo(cx + rx * 1.2, edge - ry * 0.12); c.quadraticCurveTo(cx, edge + ry * 0.22, cx - rx * 1.2, edge - ry * 0.12); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,240,210,0.18)'; c.beginPath(); c.ellipse(cx - rx * 0.2, cy - ry * 0.75, rx * 0.6, ry * 0.18, -0.2, 0, TAU); c.fill();
      c.strokeStyle = '#4A3420'; c.lineWidth = Math.max(4, rx * 0.09); c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - rx * 1.2, edge - ry * 0.12); c.quadraticCurveTo(cx, edge + ry * 0.22, cx + rx * 1.2, edge - ry * 0.12); c.stroke();
      c.restore();
      // [polish-V] the eye's own rim over the lid, so the lid reads as inside the eye (not a brow above it)
      c.save(); c.strokeStyle = '#4A3420'; c.lineWidth = Math.max(4, rx * 0.1);
      c.beginPath(); c.ellipse(cx, cy, rx * 1.02, ry * 1.02, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); c.restore();
    }
  }
  _glint(c, m) {
    const [ex, ey] = m.eye;
    const tw = 0.75 + 0.25 * Math.sin(this.t * 2.1);
    c.fillStyle = `rgba(255,255,255,${0.85 * tw})`;
    c.beginPath(); c.ellipse(ex - 6, ey - 7, 6, 4.5, -0.5, 0, TAU); c.fill();
    c.fillStyle = `rgba(255,255,255,${0.5 * tw})`;
    c.beginPath(); c.arc(ex + 5, ey + 5, 2.5, 0, TAU); c.fill();
    // an occasional sparkle
    const sp = (this.t * 0.37) % 1;
    if (sp < 0.12) {
      const k = Math.sin((sp / 0.12) * Math.PI), r = 14 * k;
      c.strokeStyle = `rgba(255,255,255,${0.8 * k})`; c.lineWidth = 2;
      c.beginPath(); c.moveTo(ex - 6 - r, ey - 7); c.lineTo(ex - 6 + r, ey - 7); c.moveTo(ex - 6, ey - 7 - r); c.lineTo(ex - 6, ey - 7 + r); c.stroke();
    }
  }
}
