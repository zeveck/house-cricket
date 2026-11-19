// The Cricket Carrier: the hub room. A plastic keeper on the Bedroom floor whose painting
// ("shell") changes at 3, 6 and 9 rescues, with one painted object per arrival in its own slot,
// residents who wander and bob and talk when you come close, and facilities you walk up to
// (Enter: ↓, issue #27) to use. The player moves with the normal physics in an invisible tile room that matches
// the painting; hub.draw() paints the room instead of the renderer's platform painter.
import { CRICKETS } from '../data/crickets.js';
import * as S from './sprites.js';
import { line } from './lines.js';
import { arrived, rescueCount, shellStage, RECRUITS, NOT_CRICKETS, ensure } from './meta.js';

export const HUB_ZONE_ID = 'carrier';
const FLOOR = 600, SHELF = 360; // tile tops (feet) of the floor and the shelf

// ---- the invisible rooms (one per shelf layout) ----
function grid(stage) {
  const rows = [];
  for (let y = 0; y < 18; y++) {
    let r = '';
    for (let x = 0; x < 32; x++) {
      let ch = '.';
      if (x <= 3 || x >= 28 || y <= 4 || y >= 15) ch = '#';
      if (stage >= 1 && y === 9 && x >= 4 && x <= 27) ch = '=';
      if (stage === 1 && ((y === 13 && (x === 10 || x === 11)) || (y === 11 && (x === 7 || x === 8)))) ch = '=';
      if (stage >= 2 && ((y === 13 && (x === 11 || x === 12)) || (y === 11 && (x === 10 || x === 11)))) ch = '=';
      r += ch;
    }
    rows.push(r);
  }
  return rows;
}
export const HUB_ZONE = {
  id: HUB_ZONE_ID, n: 100, name: 'The Carrier', bg: 'carrier',
  palette: ['#C9A46A', '#F2C46D', '#8FB35A', '#3B4A7A'],
  start: { room: 'carrier-0' },
  rooms: [0, 1, 2].map((st) => ({ id: `carrier-${st}`, name: 'The Carrier', x: 300 + st * 3, y: 300, grid: grid(st), entities: [{ type: 'start', x: 27, y: 14 }] })),
};
export const hubRoomFor = (stage) => `carrier-${Math.min(2, stage)}`;
export const isHubRoom = (id) => typeof id === 'string' && id.startsWith('carrier-');

// ---- arrival objects: where each sits (stage 1-3 layout; stage 0 has no shelf) ----
// place: floor | shelf (feet line) | hang (top y) | wall (bottom y) | flat (on the floor front)
// [polish-V] every object has its own slot (stage 9: nothing overlaps): the floor row runs 240-1048 (the
// climbing-wall poster leans on the left glass, inside it; the crack and Pip's spawn are at the right),
// the shelf row 172-1108, the hanging things under the shelf clear of the painted ladder and of the floor
// row's tops. npc: where that resident stands (x; at its stall's edge, or on its own home).
const OBJ = {
  stripe: { img: 'chalk-track', place: 'flat', x: 640, h: 56, w: 430 },
  katy:   { img: 'leaf-hammock', place: 'hang', x: 735, top: 392, h: 66 },
  frost:  { img: 'thermometer-strip', place: 'hang', x: 900, top: 400, h: 108 },
  rin:    { img: 'bamboo-bell', place: 'hang', x: 818, top: 388, h: 112 },
  jam:    { img: 'wall-run-lane', place: 'wall', x: 184, bottom: 596, h: 190 },
  chip:   { img: 'feeder-cup-bed', place: 'floor', x: 275, h: 58 },
  rolo:   { img: 'crumb-shop', place: 'floor', x: 362, h: 86, facility: 'shop', npc: 388 },
  hump:   { img: 'bottle-cap-drum', place: 'floor', x: 461, h: 46 },
  dot:    { img: 'clinic', place: 'floor', x: 542, h: 74, facility: 'clinic', npc: 580 },
  duo:    { img: 'dice-stack', place: 'floor', x: 646, h: 79 },
  glim:   { img: 'stage', place: 'floor', x: 732, h: 83, facility: 'stage', npc: 761 },
  peeper: { img: 'pond', place: 'floor', x: 832, h: 48, npc: 832 },
  shelly: { img: 'post', place: 'floor', x: 916, h: 83, facility: 'post', npc: 946 },
  digby:  { img: 'soil-tray', place: 'floor', x: 1014, h: 38 },
  mote:   { img: 'matchbox-bunk', place: 'shelf', x: 208, h: 74 },
  page:   { img: 'library', place: 'shelf', x: 300, h: 95, facility: 'library', npc: 319 },
  lumen:  { img: 'lamp', place: 'shelf', x: 408, h: 106, facility: 'maptable', npc: 434 },
  weft:   { img: 'hammocks', place: 'shelf', x: 523, h: 91, facility: 'weaver', npc: 551 },
  crumb:  { img: 'trainer', place: 'shelf', x: 652, h: 82, facility: 'trainer', npc: 690 },
  soot:   { img: 'lookout-tower', place: 'shelf', x: 768, h: 125, npc: 768 },
  velvet: { img: 'echo-map', place: 'shelf', x: 867, h: 86, facility: 'echo', npc: 901 },
  beep:   { img: 'doorbell', place: 'shelf', x: 973, h: 62, npc: 973 }, // up on the shelf, as a smoke alarm should be
  barty:  { img: 'hoard-corner', place: 'shelf', x: 1069, h: 84 },
};
const CRACK = { x: 1102, y: FLOOR };
const FACILITY_NAME = { shop: 'npcs.rolo.facility', library: 'npcs.page.facility', maptable: 'npcs.lumen.facility', clinic: 'npcs.dot.facility', weaver: 'npcs.weft.facility', trainer: 'npcs.crumb.facility', stage: 'npcs.glim.facility', post: 'npcs.shelly.facility', echo: 'npcs.velvet.facility' };

// where an object is drawn in a given stage: {x, y (bottom), w, h, baseline (feet), level}
function slot(id, stage) {
  const o = OBJ[id]; const img = S.get(`carrier/${o.img}.webp`);
  const ar = img ? img.width / img.height : 1;
  let h = o.h, w = o.w || h * ar, x = o.x, bottom, baseline = FLOOR, level = 'floor';
  switch (o.place) {
    case 'floor': bottom = FLOOR + 8; break;
    case 'flat': bottom = FLOOR + 44; break;
    case 'shelf':
      if (stage === 0) { h *= 0.8; w *= 0.8; bottom = FLOOR - 6; baseline = FLOOR; level = 'back'; }
      else { bottom = SHELF + 10; baseline = SHELF; level = 'shelf'; }
      break;
    case 'hang': bottom = o.top + h; if (stage === 0 && id === 'katy') bottom = 210 + h; break;
    case 'wall': bottom = o.bottom; break;
    default: bottom = FLOOR;
  }
  return { x, y: bottom, w, h, baseline, level };
}

// a tiny deterministic hash for resident wander
const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

export class Hub {
  constructor(opts) {
    this.opts = opts; // {ui, onFacility(kind, ownerId), onCrack(), onSing(), sfx(name), toast(text)}
    this.active = false; this.residents = []; this.queue = []; this.pops = []; this.fade = null;
  }
  // Called after game.startAt(hub room). returnCrack: where "Back" goes.
  enter(game, returnCrack) {
    const m = ensure(game);
    this.active = true; game.inCarrier = true;
    this.returnCrack = returnCrack || this.returnCrack || null;
    this.t = 0;
    const stage = shellStage(rescueCount(game));
    if (m.shellShown == null) m.shellShown = stage;
    this.shell = m.shellShown;
    // arrivals not yet shown pop in one by one
    this.queue = arrived(game).filter((id) => !m.shown.includes(id));
    this.queueT = 50;
    this.buildResidents(game);
    S.preload([0, 1, 2, 3].map((i) => `bg/carrier/shell-${i}.webp`));
    S.preload(Object.values(OBJ).map((o) => `carrier/${o.img}.webp`));
  }
  leave(game) { this.active = false; game.inCarrier = false; this.opts.ui.extraPrompt = null; }
  buildResidents(game) {
    const shown = new Set(ensure(game).shown);
    this.residents = [];
    for (const id of Object.keys(CRICKETS)) {
      if (id !== 'pip' && !game.rescued.has(id)) continue;
      if (!shown.has(id) && id !== 'pip') continue;
      const r = hash(id);
      this.residents.push({ id, kind: 'cricket', x: 240 + r * 800, y: FLOOR, dir: r > 0.5 ? 1 : -1, wait: Math.floor(r * 120), speed: 30 + r * 30 });
    }
    for (const id of [...RECRUITS, ...NOT_CRICKETS, 'barty']) {
      if (!shown.has(id) || id === 'barty') continue;
      const s = slot(id, this.shell);
      const off = id === 'beep' ? 0 : (s.x > 640 ? -1 : 1) * (s.w / 2 + 18);
      const x = this.shell >= 1 && OBJ[id].npc != null ? OBJ[id].npc : s.x + off; // [polish-V] its own spot (stage 0: beside its thing)
      this.residents.push({ id, kind: 'npc', x, y: s.baseline, home: x, dir: -1, wait: 0, speed: 0 });
    }
  }
  objectsShown(game) { return ensure(game).shown.filter((id) => OBJ[id]); }

  // ---- one fixed update (before game.update) ----
  update(game, f) {
    if (!this.active) return;
    this.t++;
    const m = ensure(game), p = game.player, ui = this.opts.ui;
    // arrivals
    if (this.queue.length && --this.queueT <= 0) {
      const id = this.queue.shift();
      m.shown.push(id);
      const stage = shellStage(rescueCount(game));
      if (CRICKETS[id] && stage > this.shell) { this.fade = { from: this.shell, to: stage, f: 0 }; this.shell = stage; m.shellShown = stage; this.opts.toast(line('carrier.grew')); }
      if (OBJ[id]) { const s = slot(id, this.shell); this.pops.push({ x: s.x, y: s.y - s.h / 2, f: 0 }); }
      this.opts.sfx('arrive');
      const name = CRICKETS[id]?.name || line(`npcs.${id}.name`);
      this.opts.toast(line(id === 'barty' ? 'carrier.gift' : 'carrier.arrive', { name })); // [fixer] Barty sends a gift
      this.buildResidents(game);
      this.queueT = 80;
      if (!this.queue.length && rescueCount(game) >= 9 && !m.damperOpen) this.singPending = 60;
    }
    if (this.singPending && --this.singPending <= 0) { this.singPending = 0; this.opts.onSing(); }
    if (this.fade) { this.fade.f++; if (this.fade.f > 90) this.fade = null; }
    for (const pp of this.pops) pp.f++;
    this.pops = this.pops.filter((pp) => pp.f < 50);
    // residents wander and bob
    for (const r of this.residents) {
      if (r.kind !== 'cricket') continue;
      if (r.wait > 0) { r.wait--; continue; }
      r.x += r.dir * r.speed / 60;
      if (r.x < 190 || r.x > 1080) { r.dir *= -1; r.x = Math.max(190, Math.min(1080, r.x)); }
      if (hash(r.id + Math.floor(this.t / 37)) < 0.02) { r.wait = 60 + Math.floor(hash(r.id + this.t) * 120); if (hash(r.id + 'd' + this.t) < 0.5) r.dir *= -1; }
    }
    // what's in reach: facilities, the crack, someone to talk to
    const feet = p.y + p.h;
    let near = null;
    if (Math.abs(p.cx - CRACK.x) < 40 && Math.abs(feet - CRACK.y) < 30) near = { kind: 'crack', label: 'Leave the Carrier' };
    if (!near) for (const id of this.objectsShown(game)) {
      const o = OBJ[id]; if (!o.facility) continue;
      const s = slot(id, this.shell);
      if (Math.abs(p.cx - s.x) < s.w / 2 + 14 && Math.abs(feet - s.baseline) < 34) { near = { kind: 'facility', facility: o.facility, owner: id, label: line(FACILITY_NAME[o.facility]) }; break; }
    }
    this.talk = null;
    for (const r of this.residents) {
      if (r.id === p.id) continue;
      if (Math.abs(p.cx - r.x) < 60 && Math.abs(feet - r.y) < 34) { this.talk = r; break; }
    }
    ui.extraPrompt = near && p.grounded ? ['enter', near.label] : null; // [issue #27] Enter: ↓
    this.near = near;
    if (near && p.grounded && f.pressed.enter) this.use(near);
  }
  use(near) {
    if (!near) return;
    if (near.kind === 'crack') this.opts.onCrack();
    else this.opts.onFacility(near.facility, near.owner);
  }
  tapPrompt() { if (this.near) this.use(this.near); }
  bubbleText(game, r) {
    const stage = this.shell;
    if (r.kind === 'cricket') { const l = line(`crickets.${r.id}.carrier`); return Array.isArray(l) ? l[Math.min(stage, l.length - 1)] : l; }
    return line(`npcs.${r.id}.carrier`);
  }

  // ---- drawing (instead of renderer.draw while in the Carrier) ----
  draw(renderer, game) {
    const c = renderer.ctx, cam = game.camera;
    renderer.t++;
    c.setTransform(renderer.scale, 0, 0, renderer.scale, 0, 0);
    c.fillStyle = '#2A201A'; c.fillRect(0, 0, 1280, 720);
    c.save();
    c.scale(cam.zoom, cam.zoom);
    c.translate(-Math.round(cam.x), -Math.round(cam.y));
    const shellImg = (n) => S.get(`bg/carrier/shell-${n}.webp`);
    const base = this.fade ? shellImg(this.fade.from) : shellImg(this.shell);
    if (base) c.drawImage(base, 0, 0, 1280, 720);
    else { c.fillStyle = '#7C88A8'; c.fillRect(0, 0, 1280, 720); }
    if (this.fade) { const im = shellImg(this.fade.to); if (im) { c.globalAlpha = Math.min(1, this.fade.f / 90); c.drawImage(im, 0, 0, 1280, 720); c.globalAlpha = 1; } }
    // steps up to the shelf (stage 1: little matchstick planks; stage 2+ climbs the painted ladder)
    if (this.shell === 1) {
      c.fillStyle = '#B98A55'; c.strokeStyle = '#5A3E26'; c.lineWidth = 2;
      for (const [x, y] of [[400, 520], [280, 440]]) { c.beginPath(); c.roundRect ? c.roundRect(x, y, 80, 10, 4) : c.rect(x, y, 80, 10); c.fill(); c.stroke(); }
    }
    // the crack in the corner
    // a split in the plastic: a dark jagged slit with a warm glint (the wall cavity beyond)
    c.fillStyle = 'rgba(30,22,18,.9)'; c.strokeStyle = 'rgba(242,196,109,.75)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(CRACK.x - 9, CRACK.y + 6); c.lineTo(CRACK.x - 5, CRACK.y - 18); c.lineTo(CRACK.x - 9, CRACK.y - 30); c.lineTo(CRACK.x - 2, CRACK.y - 46); c.lineTo(CRACK.x + 3, CRACK.y - 30); c.lineTo(CRACK.x + 1, CRACK.y - 16); c.lineTo(CRACK.x + 7, CRACK.y + 6); c.closePath(); c.fill(); c.stroke();
    // arrival objects, back to front
    const order = { hang: 0, wall: 1, shelf: 2, back: 2, flat: 3, floor: 4 };
    const objs = this.objectsShown(game).map((id) => ({ id, s: slot(id, this.shell), o: OBJ[id] })).sort((a, b) => (order[a.s.level === 'back' ? 'back' : a.o.place] - order[b.s.level === 'back' ? 'back' : b.o.place]) || a.s.x - b.s.x);
    for (const { id, s, o } of objs) {
      const img = S.get(`carrier/${o.img}.webp`);
      if (!img) continue;
      const pop = this.pops.find((pp) => Math.abs(pp.x - s.x) < 1);
      const k = pop ? Math.min(1, pop.f / 14) * (1 + Math.sin(Math.min(1, pop.f / 14) * Math.PI) * 0.18) : 1;
      c.save(); c.translate(s.x, s.y); c.scale(k, k);
      c.drawImage(img, -s.w / 2, -s.h, s.w, s.h);
      c.restore();
      void id;
    }
    // residents
    for (const r of this.residents) {
      if (r.id === game.player.id && r.kind === 'cricket') continue;
      const bob = Math.abs(Math.sin((this.t + hash(r.id) * 100) / 9)) * 3;
      if (r.kind === 'cricket') {
        const moving = r.wait <= 0;
        renderer.drawCricketAt?.(c, r.id, r.x, r.y - (moving ? bob : 0), r.dir, { pose: moving ? 'run' : 'idle', t: renderer.t + hash(r.id) * 50, vx: moving ? r.speed * r.dir : 0, scale: 0.9 });
      } else {
        const talking = this.talk === r && Math.floor(this.t / 8) % 2;
        const img = S.get(`sprites/npcs/${r.id}${talking ? '-talk' : ''}.webp`) || S.get(`sprites/npcs/${r.id}.webp`);
        if (img) { const h = r.id === 'velvet' ? 60 : 46, w = h * img.width / img.height; c.save(); c.translate(r.x, r.y - bob * 0.6); c.scale(r.x > game.player.cx ? -1 : 1, 1); c.drawImage(img, -w / 2, -h + 4, w, h); c.restore(); }
      }
    }
    renderer.drawPlayer?.(c, game);
    // sparkles where arrivals pop in
    for (const pp of this.pops) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2, d = 10 + pp.f * 2.2;
        c.fillStyle = ['#F2C46D', '#C8564B', '#8FB35A', '#7C98C4'][i % 4]; c.globalAlpha = Math.max(0, 1 - pp.f / 50);
        c.beginPath(); c.arc(pp.x + Math.cos(a) * d, pp.y + Math.sin(a) * d, 4, 0, 7); c.fill();
      }
      c.globalAlpha = 1;
    }
    // a speech bubble over whoever is close
    if (this.talk) this.drawBubble(c, this.talk.x, this.talk.y - (this.talk.kind === 'npc' ? 64 : 48), this.bubbleText(game, this.talk), cam); // [polish-V] cam: clear of the buttons/HUD
    c.restore();
    renderer.drawTransition?.(c, game);
  }
  drawBubble(c, x, y, text, cam = null) {
    if (!text) return;
    c.font = '700 17px Nunito, "Trebuchet MS", sans-serif';
    const words = String(text).split(' '); const lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > 240 && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    const W = Math.max(...lines.map((l) => c.measureText(l).width)) + 24, H = lines.length * 21 + 14;
    let bx = Math.max(150, Math.min(1130 - W, x - W / 2)), by = y - H;
    // [polish-V] on a touch screen, never under a thumb button (slide left of them) or the HUD (slide below it)
    for (const r of cam?.touchBias ? cam.avoid || [] : []) {
      const a = { x0: (bx - cam.x) / cam.vw, x1: (bx + W - cam.x) / cam.vw, y0: (by - cam.y) / cam.vh, y1: (by + H + 10 - cam.y) / cam.vh };
      if (a.x1 <= r.x0 || a.x0 >= r.x1 || a.y1 <= r.y0 || a.y0 >= r.y1) continue;
      if (r.kind === 'btn') bx = cam.x + (r.x0 - 0.01) * cam.vw - W; else by = cam.y + (r.y1 + 0.01) * cam.vh;
    }
    x = Math.max(bx + 14, Math.min(bx + W - 14, x));
    c.fillStyle = 'rgba(244,235,221,.96)'; c.strokeStyle = '#5A4632'; c.lineWidth = 2;
    c.beginPath(); c.roundRect ? c.roundRect(bx, by, W, H, 12) : c.rect(bx, by, W, H); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 7, by + H - 1); c.lineTo(x, by + H + 10); c.lineTo(x + 7, by + H - 1); c.fill();
    c.fillStyle = '#3E2A20'; c.textAlign = 'left'; c.textBaseline = 'top';
    lines.forEach((l, i) => c.fillText(l, bx + 12, by + 8 + i * 21));
  }
  // for __game.buttons(): canvas-drawn pressables (the facility prompt) in CSS pixels
  buttons() { return this.near ? [{ label: this.near.label, kind: this.near.kind }] : []; }
}
export { OBJ as CARRIER_OBJECTS, slot as carrierSlot };
