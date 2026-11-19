// Headless sim helper: runs the real game modules in node with key events at frames.
// Used by gen-reach, the feel test and for authoring recorded solutions.
import { Game } from '../game/src/game.js';
import { Input } from '../game/src/input.js';
import { ZONES } from '../game/data/rooms/index.js';

// [playtest] The modals the browser opens over the game (src/meta-run.js: trigger dialogs and
// Ready? cards, a boss's lines, the rescue card, the save-crack menu, story cards, talking to
// someone, a lair door). In the browser the sim pauses while one is up (no game frames pass) and
// every held key is released; the replays close it with real keys and press the held keys again.
// The headless sim does the same at the same game frame: release everything, let one input sample
// pass (the modal's), then (after that frame's own key events) press the keys still held. `onModal(kind, data, sim)` may do more
// (a Ready? card's Enter: startAt the lair). Returns the modals seen: [{f, kind, ...}].
const T = 40, CARD_DELAY = 75;
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export class MetaLite {
  constructor(game, input) { this.g = game; this.input = input; this.lastFx = game.frame; this.pendingCard = null; this.seen = []; this.onModal = null; }
  // after every game.update; returns the modal kind opened this frame (or null)
  check(f) {
    const g = this.g, p = g.player;
    let modal = null;
    for (const e of g.fx) {
      if (e.f <= this.lastFx) continue;
      const d = e.d || {};
      if (e.type === 'rescue' && !d.final && !(g.zone?.n >= 98)) this.pendingCard = { id: d.cricket, at: g.frame + CARD_DELAY };
      if (!modal && (e.type === 'dialog' || (e.type === 'ready' && !g.bossBeaten?.(d.boss)) || e.type === 'save' || (e.type === 'story' && !(g.zone?.n >= 98)))) modal = { kind: e.type, ...d };
    }
    this.lastFx = g.frame;
    if (!modal && this.pendingCard && g.frame >= this.pendingCard.at) { modal = { kind: 'complete', id: this.pendingCard.id }; this.pendingCard = null; }
    else if (!modal) {
      for (const e of g.metaEnts || []) {
        if (e.done) continue;
        const box = { x: e.px, y: e.type === 'trigger' ? e.py : e.py - (e.h ? (e.h - 1) * T : 0), w: (e.w || 1) * T, h: (e.h || 1) * T }; // as meta-run.js: a trigger's y is its top row
        if (e.type === 'trigger' && ov(p, box)) {
          e.done = true; g.rs(g.room.id).taken.add(e.key);
          const k = e.emit || 'story';
          if (!modal && (k === 'dialog' || (k === 'ready' && !g.bossBeaten?.(e.boss)) || (k === 'story' && !(g.zone?.n >= 98)))) modal = { kind: k, trigger: true, boss: e.boss, name: e.name }; // [final-2] no Ready? card in a won arena
        }
        const pressedUp = g.inp?.pressed?.enter; // [issue #27] Enter: a ↓ press
        if (!modal && e.type === 'npc' && pressedUp && p.grounded && Math.abs(p.cx - (box.x + T / 2)) < 56 && Math.abs(p.y + p.h - (box.y + T)) < 40) modal = { kind: 'talk', who: e.who };
        if (!modal && e.type === 'lair' && pressedUp && p.grounded && ov(p, box)) {
          if (g.bossBeaten?.(e.boss)) { if (e.to && g.world.rooms[e.to]) g.startAt(e.to, e.at?.[0], e.at?.[1]); } // [final-2] a won lair: straight in (meta-run.js)
          else modal = { kind: 'ready', boss: e.boss, to: e.to, at: e.at };
        }
      }
    }
    if (!modal) return null;
    modal.f = f; this.seen.push(modal);
    this.input.releaseAll(); this.input.sample();
    if (this.onModal) this.onModal(modal.kind, modal, this);
    // [polish-T] meta-run.js handoff(): as a dialog closes, its `then` story or a pending rescue card opens on
    // the same frame (no game frame passes between them)
    if (modal.kind === 'dialog' || modal.kind === 'talk') {
      const next = modal.then ? { kind: 'story', name: modal.then } : this.pendingCard && !g.inCarrier ? { kind: 'complete', id: this.pendingCard.id } : null;
      if (next) {
        if (next.kind === 'complete') this.pendingCard = null;
        next.f = f; this.seen.push(next);
        this.input.releaseAll(); this.input.sample();
        modal.next = next; // callers that take the returned modal (author.mjs _step) handle modal.next too
        if (this.onModal) this.onModal(next.kind, next, this);
      }
    }
    this.repress = true; // the keys still held after this frame's own events go down again (press())
    return modal;
  }
  // before the next update: press again the keys that are physically held
  press(held) {
    if (!this.repress) return;
    this.repress = false;
    for (const c of held) if (!this.input.keys.has(c)) this.input.keyDown(c);
  }
}

export function makeSim(opts = {}) {
  const game = new Game(opts.zones || ZONES);
  const input = new Input();
  const meta = opts.modals === false ? null : new MetaLite(game, input);
  const sim = {
    game, input, meta,
    // one fixed update (and the modal check after it); returns the modal opened, if any
    step(f = 0) { game.update(input.sample()); return meta ? meta.check(f) : null; },
    // events: [[frame, code, 'down'|'up'], ...] relative to the sim's current frame 0
    run(events, frames, onFrame) {
      const ev = [...events].sort((a, b) => a[0] - b[0]);
      let i = 0;
      const phys = new Set();
      if (meta) meta.lastFx = game.frame;
      for (let f = 0; f < frames; f++) {
        while (i < ev.length && ev[i][0] <= f) { const [, code, t] = ev[i++]; if (t === 'down') { input.keyDown(code); phys.add(code); } else { input.keyUp(code); phys.delete(code); } }
        if (meta) meta.press(phys);
        sim.step(f + 1);
        if (onFrame && onFrame(f, game) === false) return f;
      }
      return frames;
    },
  };
  return sim;
}
