// Visual effects (design: "Juice"). Render-only: uses Math.random freely and never touches
// the sim. The renderer owns one FX and calls, per drawn frame:
//   fx.consume(game)          turn new game.fx events into particles / screen effects
//   fx.ambient(game, cam)     room emitters (steam, dust, light motes) from room/zone data
//   fx.draw(ctx)              world-space particles (inside the camera transform)
//   fx.drawScreen(ctx, game)  screen-space effects (spotlight, chirp pulse, hit flash, tells)
// Anyone may spawn directly: fx.puff(x, y, n, size), fx.ring(x, y, radius), fx.petals(x, y),
// fx.steam(x, y), fx.dust(x, y), fx.splat(x, y), fx.tell(x, y), fx.shake(px), fx.flash(n),
// fx.spotlight(x, y, frames). Hooks: fx.onHit = (event) => {} (rumble, audio), called on hurt.
const TAU = Math.PI * 2;
const R = Math.random;

export const tellMarks = { at: -1e9 }; // [polish-V] set by geckos.js when a rig draws its tell mark
export class FX {
  constructor() {
    this.p = [];             // world particles
    this.flashN = 0;         // white flash frames left
    this.shakeAmt = 0;       // renderer-side shake (px), decays; honoured only when shake is on
    this.spot = null;        // {x, y, f, dur}  item spotlight (world coords)
    this.pulse = 0;          // chirp screen pulse
    this.onHit = null;
    this.touch = false;      // bigger tell splats on touch screens
    this.tint = [244, 235, 221]; // zone paper tint for puffs
    this.emitT = 0;
    this.maxParticles = 260;
  }
  add(q) { if (this.p.length < this.maxParticles) this.p.push(q); }

  // ---- spawners ----
  // watercolor blot puff: overlapping translucent discs that bloom and fade, with a darker rim
  puff(x, y, n = 4, s = 1) {
    for (let i = 0; i < n; i++) this.add({ k: 'blot', x: x + (R() - 0.5) * 22 * s, y: y - 3 - R() * 4, vx: (R() - 0.5) * 110 * s, vy: -R() * 45 * s, r: (4 + R() * 5) * s, life: 26 + R() * 10, t: 0, rot: R() * TAU, sq: 0.7 + R() * 0.4 });
  }
  ring(x, y, max, col = '244,235,221', fill = false, ink = false) { this.add({ k: 'ring', x, y, r: 8, max, life: 34, t: 0, col, fill, ink, seed: R() * 9 }); }
  petals(x, y, n = 26) {
    const cols = ['#F2C46D', '#E8964A', '#D48A8A', '#C9DD8F', '#F4EBDD', '#B7A6D3'];
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.4; const v = 220 + R() * 260; this.add({ k: 'petal', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 420, drag: 0.985, life: 90 + R() * 50, t: 0, rot: R() * TAU, spin: (R() - 0.5) * 0.4, sway: R() * TAU, col: cols[i % cols.length], r: 5 + R() * 3 }); }
  }
  dots(x, y, n, col, spd = 180, g = 0, r = 3, life = 26) { for (let i = 0; i < n; i++) { const a = R() * TAU, v = spd * (0.5 + R() * 0.5); this.add({ k: 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (g ? spd * 0.6 : 0), g, life, t: 0, col, r }); } }
  steam(x, y) { this.add({ k: 'steam', x: x + (R() - 0.5) * 10, y, vx: (R() - 0.5) * 14, vy: -40 - R() * 30, r: 6 + R() * 6, life: 70 + R() * 30, t: 0 }); }
  dust(x, y) { this.add({ k: 'mote', x, y, vx: (R() - 0.5) * 8, vy: 6 + R() * 10, r: 1 + R() * 1.5, life: 200 + R() * 120, t: 0, glow: false, sway: R() * TAU }); }
  mote(x, y) { this.add({ k: 'mote', x, y, vx: (R() - 0.5) * 6, vy: (R() - 0.5) * 6, r: 1.2 + R() * 1.8, life: 160 + R() * 160, t: 0, glow: true, sway: R() * TAU }); }
  soil(x, y, n = 6) { this.dots(x, y, n, '#6E5236', 160, 900, 3, 34); }
  // the "!" ink splat over a boss (1.5x on touch screens)
  tell(x, y) { this.add({ k: 'tell', x, y, life: 50, t: 0, s: this.touch ? 1.5 : 1 }); }
  splat(x, y, col = '42,32,26') { this.add({ k: 'splat', x, y, life: 60, t: 0, col, r: 10 + R() * 8, seed: R() * 9 }); }
  shake(px) { this.shakeAmt = Math.max(this.shakeAmt, px); }
  flash(n = 4) { this.flashN = Math.max(this.flashN, n); }
  spotlight(x, y, dur = 90) { this.spot = { x, y, f: 0, dur }; }

  // ---- game events -> effects ----
  consume(game) {
    for (const e of game.fx) {
      if (e._fx) continue; e._fx = true;
      const d = e.d || {};
      switch (e.type) {
        case 'land': if (d.v > 250) this.puff(d.x, d.y, d.hard ? 7 : 4, d.hard ? 1.3 : 0.9); break;
        case 'jump': case 'leap': case 'superjump': case 'flutter': this.puff(d.x, d.y, 3, 0.7); break;
        case 'walljump': this.puff(d.x, d.y, 5, 0.85); break;
        case 'cling': this.puff(d.x, d.y, 2, 0.6); break;
        case 'dash': this.puff(d.x - d.dir * 10, d.y + 10, 3, 0.7); break;
        case 'chirp': this.ring(d.x, d.y, d.radius, '244,235,221', false, true); this.ring(d.x, d.y, d.radius * 0.7); this.pulse = 1; break;
        case 'flash': this.ring(d.x, d.y, 170, '207,242,122', true); break;
        case 'bonk': this.dots(d.x, d.y, 6, '#F2C46D', 200); this.puff(d.x, d.y + 10, 2, 0.6); break;
        case 'clonk': this.dots(d.x, d.y, 4, '#B9BDC4', 160); break;
        case 'stun': this.dots(d.x, d.y, 3, '#F4EBDD', 80, 0, 2, 20); break;
        case 'crumble': this.dots(d.x, d.y, 4, '#C48A3E', 150, 900, 4, 40); this.puff(d.x, d.y, 2, 0.8); break;
        case 'pound': this.puff(d.x, d.y, 9, 1.5); this.shake(10); break;
        case 'item': this.spotlight(d.x, d.y, 100); this.petals(d.x, d.y, 10); break;
        case 'rescue': this.petals(d.x, d.y, 34); this.spotlight(d.x, d.y, 70); break;
        case 'bob': this.dots(d.x, d.y, 5, '#A9C8E0', 150, 900, 3, 24); break; // [issue 20] the Raft bobs up: a small splash
        case 'pit': this.dots(d.x, d.y, 7, d.why === 'water' ? '#A9C8E0' : '#F4EBDD', 200, 900, 4, 30); break;
        case 'hurt': this.flash(4); this.shake(4); if (this.onHit) this.onHit(e); break;
        case 'swap': this.puff(d.x, d.y, 8, 1.1); break;
        case 'hide': case 'unhide': this.puff(d.x, d.y, 2, 0.5); break;
        case 'bellow': this.shake(14); break;
        case 'tell': this.tell(d.x, d.y); break;
        // [issue 25] the opening chase: Duchess lands (a sand spray, a 6 px shake: the setting applies), Pip is
        // gone in a puff of sand, her jaws hit the log (bark chips)
        case 'sandSpray': this.puff(d.x, d.y, 8, 1.4); this.dots(d.x, d.y - 6, 14, '#D9C29A', 260, 900, 3.5, 40); this.shake(d.shake || 6); break;
        case 'sandPuff': this.puff(d.x, d.y - 8, 9, 1.3); this.dots(d.x, d.y - 10, 10, '#E3CFA4', 200, 700, 3, 34); break;
        case 'barkChips': this.dots(d.x, d.y, 9, '#7A5230', 220, 900, 3.5, 40); this.dots(d.x, d.y, 5, '#B98A52', 160, 900, 2.5, 34); this.shake(3); break;
        default: break;
      }
    }
  }

  // room/zone emitters. Room data (render-only field, tile units):
  //   fx: [{ kind: 'steam', x, y }, { kind: 'motes', x, y, w, h }, { kind: 'dust', x, y, w, h }]
  // Zone default: zone.motes = true adds light motes across the view (sunroom, attic...).
  ambient(game, cam, T) {
    this.emitT++;
    const room = game.room; if (!room) return;
    for (const em of room.def.fx || []) {
      if (em.kind === 'steam' && this.emitT % (em.every || 8) === 0) this.steam((em.x + 0.5) * T, em.y * T);
      else if ((em.kind === 'motes' || em.kind === 'dust') && this.emitT % (em.every || 14) === 0) {
        const x = (em.x + R() * (em.w || 4)) * T, y = (em.y + R() * (em.h || 4)) * T;
        if (em.kind === 'motes') this.mote(x, y); else this.dust(x, y);
      }
    }
    if ((game.zone?.motes || MOTE_ZONES.has(game.zone?.bg || game.zone?.id)) && this.emitT % 18 === 0) this.mote(cam.x + R() * cam.vw, cam.y + R() * cam.vh);
  }

  // ---- drawing ----
  draw(c) {
    const dt = 1 / 60;
    let n = 0;
    for (const q of this.p) if (++q.t < q.life) this.p[n++] = q;
    this.p.length = n;
    for (const q of this.p) {
      const k = q.t / q.life;
      if (q.k === 'ring') { drawRing(c, q, k); continue; }
      if (q.drag) { q.vx *= q.drag; q.vy *= q.drag; }
      q.x += (q.vx || 0) * dt; q.y += (q.vy || 0) * dt; if (q.g) q.vy += q.g * dt;
      switch (q.k) {
        case 'blot': {
          const r = q.r * (1 + k * 1.3);
          c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.scale(1, q.sq);
          c.fillStyle = `rgba(${this.tint},${0.42 * (1 - k)})`;
          c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
          c.fillStyle = `rgba(${this.tint},${0.3 * (1 - k)})`;
          c.beginPath(); c.arc(r * 0.45, -r * 0.2, r * 0.7, 0, TAU); c.fill();
          c.strokeStyle = `rgba(120,96,72,${0.22 * (1 - k)})`; c.lineWidth = 1.2;
          c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
          c.restore(); break;
        }
        case 'petal': {
          q.rot += q.spin; q.sway += 0.08; q.x += Math.sin(q.sway) * 0.8;
          if (q.vy > 60) q.vy = 60;
          c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.scale(1, Math.abs(Math.sin(q.sway * 1.3)) * 0.8 + 0.2);
          c.globalAlpha = Math.min(1, (1 - k) * 2); c.fillStyle = q.col;
          c.beginPath(); c.ellipse(0, 0, q.r, q.r * 0.55, 0, 0, TAU); c.fill();
          c.strokeStyle = 'rgba(90,70,50,0.35)'; c.lineWidth = 0.8; c.stroke();
          c.restore(); break;
        }
        case 'steam': {
          const r = q.r * (1 + k * 2.2);
          c.fillStyle = `rgba(250,248,244,${0.22 * (1 - k) * Math.min(1, k * 6)})`;
          c.beginPath(); c.arc(q.x + Math.sin(q.t / 14) * 4, q.y, r, 0, TAU); c.fill(); break;
        }
        case 'mote': {
          q.sway += 0.03; q.x += Math.sin(q.sway) * 0.15;
          const a = Math.sin(k * Math.PI);
          if (q.glow) { c.fillStyle = `rgba(255,240,190,${0.18 * a})`; c.beginPath(); c.arc(q.x, q.y, q.r * 3, 0, TAU); c.fill(); }
          c.fillStyle = q.glow ? `rgba(255,248,220,${0.75 * a})` : `rgba(200,190,170,${0.5 * a})`;
          c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); c.fill(); break;
        }
        case 'tell': {
          if (q.skip || performance.now() - tellMarks.at < 150) { q.skip = true; break; } // [polish-V] the gecko's rig draws its "!" above its head
          const pop = k < 0.15 ? k / 0.15 : 1, s = q.s * (0.6 + 0.4 * pop) * (1 + 0.08 * Math.sin(q.t / 3));
          c.save(); c.translate(q.x, q.y - 20 * Math.min(1, k * 4)); c.scale(s, s); c.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
          c.fillStyle = 'rgba(42,32,26,0.92)';
          blob(c, 0, 0, 22, 1.7); c.fill();
          c.fillStyle = '#F4EBDD';
          c.beginPath(); c.moveTo(-4, -14); c.lineTo(4, -14); c.lineTo(2, 4); c.lineTo(-2, 4); c.closePath(); c.fill();
          c.beginPath(); c.arc(0, 10, 3.2, 0, TAU); c.fill();
          c.restore(); break;
        }
        case 'splat': { c.fillStyle = `rgba(${q.col},${0.8 * (1 - k)})`; blob(c, q.x, q.y, q.r * (1 + k * 0.3), q.seed); c.fill(); break; }
        default: { c.globalAlpha = 1 - k; c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); c.fill(); c.globalAlpha = 1; }
      }
    }
  }

  // screen-space overlays (after the camera transform is popped). VW/VH: logical view size.
  drawScreen(c, game, VW, VH) {
    const cam = game.camera;
    if (this.spot) {
      const s = this.spot, k = s.f / s.dur; s.f++;
      if (s.f >= s.dur) this.spot = null;
      else {
        const a = 0.55 * Math.min(1, k * 6, (1 - k) * 4);
        const x = (s.x - cam.x) * cam.zoom, y = (s.y - cam.y) * cam.zoom, r = 70 + 20 * Math.sin(k * 6);
        const g = c.createRadialGradient(x, y, r * 0.6, x, y, r * 2.4);
        g.addColorStop(0, 'rgba(20,14,10,0)'); g.addColorStop(1, `rgba(20,14,10,${a})`);
        c.fillStyle = g; c.fillRect(0, 0, VW, VH);
        c.fillStyle = `rgba(255,236,180,${a * 0.25})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      }
    }
    if (this.pulse > 0) {
      const a = 0.12 * this.pulse;
      const g = c.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.9);
      g.addColorStop(0, 'rgba(244,235,221,0)'); g.addColorStop(1, `rgba(244,235,221,${a})`);
      c.fillStyle = g; c.fillRect(0, 0, VW, VH);
      this.pulse = Math.max(0, this.pulse - 0.08);
    }
    if (this.flashN > 0) { c.fillStyle = `rgba(255,255,255,${this.flashN / 9})`; c.fillRect(0, 0, VW, VH); this.flashN--; }
  }
  // shake offset for this frame (and decay). on: the player's Screen shake setting.
  shakeOffset(on, camShake) {
    const amt = Math.max(this.shakeAmt, (camShake || 0) * 0.8);
    this.shakeAmt = Math.max(0, this.shakeAmt * 0.86 - 0.2);
    if (!on || amt <= 0.3) return [0, 0];
    return [(R() - 0.5) * amt, (R() - 0.5) * amt];
  }
}

const MOTE_ZONES = new Set(['z06-living', 'z08-sunroom', 'z10-attic']);

// a wavering watercolor ripple
function drawRing(c, q, k) {
  const r = q.r + (q.max - q.r) * Math.sqrt(k);
  c.beginPath();
  for (let a = 0; a <= 48; a++) {
    const an = (a / 48) * TAU;
    const rr = r + Math.sin(an * 5 + q.seed + q.t / 4) * 3 + Math.sin(an * 3 - q.t / 6) * 2;
    a ? c.lineTo(q.x + Math.cos(an) * rr, q.y + Math.sin(an) * rr) : c.moveTo(q.x + Math.cos(an) * rr, q.y + Math.sin(an) * rr);
  }
  c.closePath();
  // a sepia ink rim under the light wash, so the ripple reads on pale and dark ground alike
  if (q.ink) { c.strokeStyle = `rgba(90,70,50,${0.55 * (1 - k)})`; c.lineWidth = 5 + 3 * (1 - k); c.stroke(); }
  c.strokeStyle = `rgba(${q.col},${0.8 * (1 - k)})`; c.lineWidth = 2.5 + 2 * (1 - k); c.stroke();
  if (q.fill) { c.fillStyle = `rgba(${q.col},${0.22 * (1 - k)})`; c.fill(); }
  // a fainter inner bloom, like pigment pooling
  c.strokeStyle = `rgba(${q.col},${0.25 * (1 - k)})`; c.lineWidth = 8 * (1 - k) + 1;
  c.beginPath(); c.arc(q.x, q.y, Math.max(1, r - 6), 0, TAU); c.stroke();
}

// an irregular ink blob path
export function blob(c, x, y, r, seed = 0) {
  c.beginPath();
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * TAU;
    const rr = r * (1 + 0.16 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 5 + seed * 2));
    i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}
