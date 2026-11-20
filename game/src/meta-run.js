// The meta layer's per-step glue (runs right after game.update in main.js's fixed step, so it
// is frame-exact in replays): reads the sim's events (game.fx) and the meta entities
// (game.metaEnts) and turns them into cards, dialog, crumbs, secrets, recruits and story beats.
//
// What zone builders use (all documented in design/ENGINE_NOTES.md, "UI and meta"):
//   entities: {type:'npc', who, x, y, talk:'npcs.rolo.meet' | lines:[...], recruit:'rolo'}
//             {type:'lair', boss:'duchess', x, y, w:2, h:3, to?:'room-id', at?:[x,y]}
//             {type:'crumbs', x, y, n:5}   {type:'secret', id:'heart:bed-1', x, y}
//             {type:'trigger', x, y, w, h, emit:'story'|'dialog'|..., ...data}  (fires once)
//             {type:'carrier', x, y}  (where the Carrier sits on the map)
//   events:   game.emit('dialog', {key:'geckos.duchess.post'} | {lines:[[who, text], ...]}, id?)
//             game.emit('ready', {boss, to, at})      the lair card, from code
//             game.emit('recruit', {id:'rolo'})       recruits and Not-Crickets join
//             game.emit('story', {name:'tankEscaped' | 'ending' | 'damper'})
//             game.emit('heard', {sound:'alarm'})     Sound Book entries
//             game.emit('crumbs', {n}), game.emit('secret', {id})
//             game.emit('rescue', ...) is the engine's own (cages): the zone-complete card follows.
import { TILE } from '../data/movement.js';
import { CRICKETS } from '../data/crickets.js';
import { ensure, RECRUITS, NOT_CRICKETS, canChirp, secretKind, lairCrack } from './meta.js';
import { SECRETS } from '../data/house.js';
const secretCrumbs = (id) => SECRETS.find((x) => x.id === id)?.crumbs || 0; // [fixer] house.js crumbs: n
import { line } from './lines.js';

const CARD_DELAY = 75;   // frames from a rescue to the "is safe!" card (the cricket hops off first)
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class MetaRun {
  constructor(A) { this.A = A; this.lastFx = -1; this.pendingCard = null; }
  reset() { this.lastFx = -1; this.pendingCard = null; this.nextScreen = null; }
  // [polish-T] the dialog -> next screen handoff (main.js calls it as any dialog closes): the screen that
  // follows a dialog starts on the frame it closes, so the arena never shows between them. A dialog
  // event's `then` (Nana's lines: the ending) or a pending rescue card (a gecko's post-fight lines) opens
  // now; tools/sim.mjs MetaLite opens it on the same frame. Returns true when it opened something.
  handoff() {
    const A = this.A, g = A.game;
    if (!g || A.ui.screen || A.dialog.active || A.story.active) return false;
    if (this.nextScreen) { const n = this.nextScreen; this.nextScreen = null; A.storyEvent(n); return true; }
    if (this.pendingCard && !g.inCarrier) { const c = this.pendingCard; this.pendingCard = null; A.zoneComplete(c.id); A.ui.guard = 30; return true; } // guard: a dialog-advancing press can't pick on the card
    return false;
  }

  // after game.update(f)
  step(f) {
    const A = this.A, g = A.game, m = ensure(g), p = g.player;
    // ---- events ----
    for (const e of g.fx) {
      if (e.f <= this.lastFx) continue;
      this.event(e.type, e.d || {}, e);
    }
    this.lastFx = g.frame;
    if (this.pendingCard && g.frame >= this.pendingCard.at) { const c = this.pendingCard; this.pendingCard = null; A.zoneComplete(c.id); return; }
    if (A.ui.screen || A.dialog.active) return;
    // ---- meta entities ----
    const pb = { x: p.x, y: p.y, w: p.w, h: p.h };
    let prompt = null;
    for (const e of g.metaEnts || []) {
      if (e.done) continue;
      // [playtest] a trigger's y is its top row (as every room writes them: the lair doorways, the fridge); the rest stand on y
      const box = { x: e.px, y: e.type === 'trigger' ? e.py : e.py - (e.h ? (e.h - 1) * TILE : 0), w: (e.w || 1) * TILE, h: (e.h || 1) * TILE };
      switch (e.type) {
        case 'crumbs':
          if (ov(pb, box)) { e.done = true; g.rs(g.room.id).taken.add(e.key); const first = this.collectCrumbs(e.n || 5); g.emit('crumb', { x: box.x + 20, y: box.y + 20, n: e.n || 5 }); A.sfx('crumb'); if (first) A.autosave(); }
          break;
        case 'secret':
          if (ov(pb, box)) { e.done = true; g.rs(g.room.id).taken.add(e.key); this.event('secret', { id: e.id || e.key }); }
          break;
        case 'trigger':
          if (ov(pb, box)) { e.done = true; g.rs(g.room.id).taken.add(e.key); const { type, x, y, w, h, key, px, py, emit, textKey, ...data } = e; if (textKey) data.key = textKey; void type; void x; void y; void w; void h; void key; void px; void py; g.emit(emit || 'story', data); this.event(emit || 'story', data); } // [playtest] handle it now: its fx event is stamped with this frame, which the events loop above has already passed (trigger dialogs and the Lashes/Peridot/Gargy Ready? cards never showed)
          break;
        case 'npc': {
          const near = Math.abs(p.cx - (box.x + TILE / 2)) < 56 && Math.abs(p.y + p.h - (box.y + TILE)) < 40;
          if (near && p.grounded) { prompt = ['up', 'Talk']; if (f.pressed.up) this.talk(e); }
          break;
        }
        case 'lair': {
          if (ov(pb, box) && p.grounded) { prompt = ['up', `${line(`geckos.${e.boss}.name`)}'s lair`]; if (f.pressed.up) { const door = { boss: e.boss, to: e.to, at: e.at, room: g.room.id }; if (g.bossBeaten?.(e.boss)) { A.enterLair(door); A.toast(e.boss === 'barty' ? `${line('geckos.barty.name')} waves you in.` : `${line(`geckos.${e.boss}.name`)} is asleep.`); } else A.lairReady(door); } } // [final-2] a won lair: in, no Ready? card
          break;
        }
        default: break;
      }
    }
    // [mech] door entities (Up to go through) and switches/thermostats you press Up at get a prompt too
    if (!prompt) for (const d of g.doors || []) if (!d.auto && ov(pb, d)) { prompt = ['up', d.label || 'Go in']; break; }
    if (!prompt) for (const s of [...(g.mech?.thermostats || []), ...(g.mech?.switches || []).filter((x) => x.by === 'up' && !x.on)]) if (ov({ x: pb.x - 8, y: pb.y - 8, w: pb.w + 16, h: pb.h + 16 }, s)) { prompt = ['up', s.target != null ? 'Read' : 'Pull']; break; }
    if (!prompt && m.flags.firstChirp) prompt = ['chirp', 'Call out. Somebody might answer.'];
    if (!g.inCarrier) A.ui.extraPrompt = prompt;
    // the ear on the map: where this zone's beacon was first heard
    if (p.listening && g.zone && !m.heardAt[g.zone.id]) {
      const ind = A.indicator();
      if (ind && ind.show) m.heardAt[g.zone.id] = { room: g.room.id, x: Math.round(p.cx / TILE), y: Math.round(p.cy / TILE) };
    }
  }

  // Tutorial copy is persisted with game.meta, once per save slot, for all crumb sources.
  collectCrumbs(n) {
    const A = this.A, m = ensure(A.game);
    m.crumbs += n;
    if (!m.flags.crumbHintShown) {
      m.flags.crumbHintShown = true;
      A.toast('A crumb! Hang on to these: someone in this house trades for them.');
      return true;
    }
    return false;
  }

  talk(e) {
    const A = this.A, g = A.game;
    // [fixer] someone who has already joined (Peeper after his chirp-off, ...) no longer offers to join:
    // their post-join line (npcs.<who>.after, else their Carrier line)
    const m0 = ensure(g), who = e.recruit || e.who;
    if (g.recruits.has(who) || m0.notCrickets.includes(who) || (who === 'barty' && m0.barty)) {
      let l = line(`npcs.${e.who}.after`);
      if (l === 'after') l = line(`npcs.${e.who}.carrier`);
      if (Array.isArray(l)) l = l[l.length - 1];
      if (l && l !== 'carrier') A.dialogSay([[e.who, l]]);
      return;
    }
    // [mech] give: an item the npc wants (Beep and the battery): with it, giveTalk plays, the item
    // is handed over (removed), flag `gave:<who>` is set and the npc joins if recruit is set
    if (e.give && g.player.has(e.give)) {
      const gl = e.giveLines || line(e.giveTalk || `npcs.${e.who}.${e.give}`);
      const list = (Array.isArray(gl) ? gl : [gl]).map((l) => (typeof l === 'string' ? [e.who, l] : l));
      A.dialogSay(list, () => { g.player.items.delete(e.give); ensure(g).flags[`gave:${e.who}`] = true; g.emit('gave', { who: e.who, item: e.give }); if (e.recruit) this.recruit(e.recruit, e); });
      return;
    }
    if (e.give && e.recruit) { const l0 = e.lines || line(e.talk || `npcs.${e.who}.meet`); A.dialogSay((Array.isArray(l0) ? l0 : [l0]).map((l) => (typeof l === 'string' ? [e.who, l] : l))); return; }
    const lines = e.lines || line(e.talk || `npcs.${e.who}.meet`);
    const list = (Array.isArray(lines) ? lines : [lines]).map((l) => (typeof l === 'string' ? [e.who, l] : l));
    if (e.recruit && !e.lines && !e.talk) { const j = line(`npcs.${e.who}.join`); if (j !== 'join') list.push([e.who, j]); }
    A.dialogSay(list, () => { if (e.recruit) this.recruit(e.recruit, e); });
  }
  recruit(id, ent) {
    const A = this.A, g = A.game, m = ensure(g);
    if (RECRUITS.includes(id)) g.recruits.add(id);
    else if (NOT_CRICKETS.includes(id)) { if (!m.notCrickets.includes(id)) m.notCrickets.push(id); }
    else if (id === 'barty') m.barty = true;
    else g.recruits.add(id);
    if (ent) { ent.done = true; g.rs(g.room.id).taken.add(ent.key); }
    if (line(`sounds.${id}.name`) !== 'name' && !m.sounds.includes(id)) m.sounds.push(id);
    A.toast(id === 'barty' ? line('npcs.barty.giftToast') : `${line(`npcs.${id}.name`)} will move into the Carrier.`); // [fixer] Barty sends a gift
    A.sfx('unlock');
    A.autosave();
  }

  event(type, d) {
    const A = this.A, g = A.game, m = ensure(g);
    switch (type) {
      case 'rescue': {
        const id = d.cricket;
        if (id && !m.sounds.includes(id)) m.sounds.push(id);
        m.lairCrack = lairCrack(g.world, d.boss || g.room.id) || null; // [final-S] "Return to the Carrier" then back to the lair's save crack
        A.autosave();
        // the sandbox (zone 99) has no story: no card there unless asked for
        if (d.final) break; // [builder D] the last rescue (Nana): the ending follows instead of the card
        if (!(g.zone?.n >= 98) || m.flags.cardsInSandbox) this.pendingCard = { id, at: g.frame + CARD_DELAY }; // [mech] test zones 98/99: no card
        break;
      }
      case 'save': {
        const c = g.saveCrack;
        if (c && !m.cracks.some((k) => k.room === c.room && k.tx === c.tx && k.ty === c.ty)) m.cracks.push({ ...c });
        A.crackMenu();
        break;
      }
      case 'room': {
        const tr = g.zone?.music || g.zone?.id;
        if (tr && !g.inCarrier && !m.songs.includes(tr)) m.songs.push(tr);
        break;
      }
      case 'recruit': this.recruit(d.id); break;
      case 'dialog': {
        const lines = d.lines || line(d.key);
        const who = d.who || (d.key && d.key.startsWith('geckos.') ? d.key.split('.')[1] : d.key && d.key.startsWith('npcs.') ? d.key.split('.')[1] : d.key && d.key.startsWith('crickets.') ? d.key.split('.')[1] : null);
        const list = (Array.isArray(lines) ? lines : [lines]).map((l) => (typeof l === 'string' ? [who, l] : l));
        A.dialogSay(list, () => { if (d.id || d.key) m.flags[`dialog:${d.id || d.key}`] = true; if (d.then) this.nextScreen = d.then; }); // [polish-T] then: the story that follows (handoff)
        break;
      }
      case 'ready': if (!g.bossBeaten?.(d.boss)) A.lairReady({ boss: d.boss, to: d.to, at: d.at, room: g.room.id }); break; // [final-2] no Ready? card in a won arena
      case 'story': if (!(g.zone?.n >= 98) || m.flags.cardsInSandbox) A.storyEvent(d.name, d); break; // [mech] no modal cards in the test zones
      case 'heard': if (d.sound && !m.sounds.includes(d.sound)) m.sounds.push(d.sound); break;
      case 'crumbs': if (this.collectCrumbs(d.n || 1)) A.autosave(); break;
      case 'secret': {
        const id = d.id;
        if (!id || m.secrets.includes(id)) break;
        m.secrets.push(id);
        const kind = secretKind(id);
        let firstCrumb = false;
        if (kind === 'heart') { g.player.maxHealth += 1; g.player.health = g.player.maxHealth; A.toast(line('ui.heart')); A.sfx('seed-heart'); }
        else if (kind === 'song') { A.toast(line('ui.songSeed')); A.sfx('seed-heart'); A.applyUpgrades(); }
        else if (kind === 'crumbs') { const n = d.n || secretCrumbs(id) || 10; firstCrumb = this.collectCrumbs(n); A.toast(line('ui.crumbs', { n })); A.sfx('crumb'); }
        else if (kind === 'duet') { // [fixer] Chip's duet music boxes: a crumb hoard and the Duet for the Stage
          const n = d.n || secretCrumbs(id) || 100; firstCrumb = this.collectCrumbs(n); A.toast(line('ui.duet', { n })); A.sfx('crumb');
          if (!m.songs.includes('finale')) m.songs.push('finale');
        }
        else if (kind === 'shortcut') { A.toast(line('ui.shortcut')); A.sfx('unlock'); } // [fixer]
        else A.toast('A secret!');
        if (firstCrumb) A.autosave();
        break;
      }
      default: break;
    }
  }
  // Lair door: Hump can't chirp, so the next trio member who can steps up.
  humpCheck() {
    const A = this.A, p = A.game.player;
    if (canChirp(p.id)) return;
    const i = p.trio.findIndex((id) => canChirp(id));
    if (i >= 0) { p.active = i; p.queuedSwap = null; p.setCricket(p.id); A.toast(line('hump.cheer')); }
  }
}
export { CRICKETS };
