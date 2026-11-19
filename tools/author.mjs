// Authoring helper for recorded solutions: drives the headless sim and records every key
// event with its frame, so the browser replay (tools/replay.mjs) presses the same keys on
// the same frames. Deterministic: the same events give the same end state.
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { makeSim } from './sim.mjs';

export class Author {
  constructor(start, simOpts = {}) {
    this.sim = makeSim(simOpts);
    this.g = this.sim.game;
    this.start = start;
    this.g.startAt(start.room, start.x, start.y, { items: start.items || [], party: start.party || ['pip'], rescued: start.rescued || [] });
    this.f = 0; this.events = []; this.held = new Set();
    if (this.sim.meta) this.sim.meta.lastFx = this.g.frame;
  }
  get p() { return this.g.player; }
  // [playtest] through sim.step: the browser's modals (trigger dialogs, cards...) are modelled (sim.mjs MetaLite)
  _step(n = 1) { for (let i = 0; i < n; i++) { if (this.sim.meta) this.sim.meta.press(this.held); this.f++; const m = this.sim.step(this.f); if (m) { this.modal(m); if (m.next) this.modal(m.next); } } } // [polish-T] m.next: the handoff's card/story on the same frame
  modal(m) { if (this.onModal) this.onModal(m); }
  down(...codes) { for (const c of codes) { this.events.push([this.f, c, 'down']); this.sim.input.keyDown(c); this.held.add(c); } return this; }
  up(...codes) { for (const c of codes) { this.events.push([this.f, c, 'up']); this.sim.input.keyUp(c); this.held.delete(c); } return this; }
  wait(n) { this._step(n); return this; }
  tap(code, n = 3) { this.down(code); this.wait(n); this.up(code); return this; }
  hold(code, n) { return this.tap(code, n); }
  // wait until cond(game) is true (max frames); throws if it never happens
  until(cond, max = 600, label = 'condition') {
    for (let i = 0; i < max; i++) { if (cond(this.g)) return this; this._step(1); }
    throw new Error(`timed out waiting for ${label} at frame ${this.f}: ${JSON.stringify(this.state())}`);
  }
  state() { const s = this.g.snapshot(); return { room: s.room, x: Math.round(s.pos.x), y: Math.round(s.pos.y), st: s.pstate, hp: s.health, items: s.items.join(','), f: this.f }; }
  log(msg = '') { console.log(String(this.f).padStart(5), msg.padEnd(28), JSON.stringify(this.state())); return this; }
  end() { for (const c of [...this.held]) this.up(c); this.wait(30); return this; }
  save(name, expect = {}) {
    const dir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'design', 'solutions');
    mkdirSync(dir, { recursive: true });
    const s = this.g.snapshot();
    const out = {
      name, start: this.start, frames: this.f, events: this.events,
      expect: { room: s.room, levelComplete: s.levelComplete, items: s.items, ...expect },
      endState: endState(s),
    };
    writeFileSync(path.join(dir, name + '.json'), JSON.stringify(out, null, 0).replace(/\],\[/g, '],\n['));
    console.log(`saved ${name}: ${this.f} frames, ${this.events.length} events, end ${JSON.stringify(out.endState)}`);
  }
}
export function endState(s) {
  return { room: s.room, x: Math.round(s.pos.x * 10) / 10, y: Math.round(s.pos.y * 10) / 10, state: s.pstate, health: s.health, items: [...s.items].sort(), rescued: [...s.rescued].sort(), levelComplete: s.levelComplete, frame: s.playFrames };
}

// ---------------------------------------------------------------------------------------------
// [playtest] BrowserAuthor: records a run in the real game (playwright-cli session), from the
// title screen, through story panels, menus, cards, dialogs and the Carrier: everything main.js
// runs from its fixed step. The page is frozen and advanced with __game.step(1); every key goes
// in as a real keyboard.down/up and is recorded with its step number (steps since the freeze), so
// tools/replay.mjs can press the same keys on the same steps. Recorded zone solutions are reused
// with segment(): their events are pressed on the same *game* frames (game.update calls) they were
// authored on, so menus in between don't shift them.
import { execFileSync } from 'node:child_process';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

export class BrowserAuthor {
  constructor({ session = 'pt', url = 'http://127.0.0.1:8173/', size = '1280x720', log = true } = {}) {
    this.session = session; this.url = url; this.size = size; this.events = []; this.S = 0; this.verbose = log;
    this.held = new Set(); this.marks = [];
  }
  cli(...a) { return execFileSync('playwright-cli', [`-s=${this.session}`, ...a], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 900000 }); }
  static result(out) {
    const m = out.match(/### Result\n([\s\S]*?)(\n### |\n*$)/);
    if (!m) throw new Error('no result:\n' + out.slice(0, 3000));
    let t = m[1].trim(); try { t = JSON.parse(t); } catch { /* keep */ }
    if (typeof t === 'string') { try { return JSON.parse(t); } catch { return t; } }
    return t;
  }
  // run an async body (source text) in run-code with helpers K (key), ST (steps), EV (evaluate)
  run(body, args = {}) {
    const code = `async page => {
      const A = ${JSON.stringify(args)};
      const rec = []; let S = ${this.S};
      const held = new Set(${JSON.stringify([...this.held])});
      const K = async (code, type) => { if (type === 'down') { await page.keyboard.down(code); held.add(code); } else { await page.keyboard.up(code); held.delete(code); } rec.push([S, code, type]); };
      const ST = async (n) => { if (n > 0) { await page.evaluate((n) => { for (let i = 0; i < n; i++) window.__game.step(1); }, n); S += n; } };
      const INFO = () => page.evaluate(() => { const s = window.__game.state(), m = window.__game.meta(); return { screen: s.screen, room: s.room, x: s.pos && Math.round(s.pos.x), y: s.pos && Math.round(s.pos.y), st: s.pstate, hp: s.health, frame: s.frame, lc: s.levelComplete, active: s.active, trio: s.trio, rescued: s.rescued, items: s.items, ui: m && m.ui, dialog: m && m.dialog, story: m && m.story, carrier: m && m.inCarrier }; });
      // step one at a time until cond(s, m) (source) holds; returns steps taken
      const UNTIL = async (cond, max, label) => {
        const r = await page.evaluate(([cond, max]) => {
          const fn = new Function('s', 'm', 'return (' + cond + ');');
          for (let i = 0; i <= max; i++) {
            const s = window.__game.state(), m = window.__game.meta() || {};
            if (fn(s, m)) return i;
            if (i < max) window.__game.step(1);
          }
          return -1;
        }, [cond, max]);
        if (r < 0) { S += max; throw new Error('timed out: ' + (label || cond) + ' ' + JSON.stringify(await INFO())); }
        S += r; return r;
      };
      const TAP = async (code, n = 3, after = 3) => { await K(code, 'down'); await ST(n); await K(code, 'up'); await ST(after); };
      const MODAL = () => page.evaluate(() => { const m = window.__game.meta(); return m ? (m.ui || (m.dialog ? 'dialog' : '') || m.story || '') : 'nogame'; });
      try {
        const out = await (async () => { ${body} })();
        return JSON.stringify({ ok: true, rec, S, held: [...held], out, info: await INFO() });
      } catch (e) {
        return JSON.stringify({ ok: false, rec, S, held: [...held], err: String(e && e.stack || e), info: await INFO().catch(() => null) });
      }
    }`;
    const r = BrowserAuthor.result(this.cli('run-code', code));
    this.events.push(...r.rec); this.S = r.S; this.held = new Set(r.held);
    if (!r.ok) { console.log('FAILED at step', r.S, r.err, JSON.stringify(r.info)); throw new Error(r.err); }
    return r;
  }
  mark(label) { return this.log(label); }
  log(label) { const r = this.run('return null;'); const i = r.info; if (this.verbose) console.log(String(this.S).padStart(6), (label || '').padEnd(30), JSON.stringify(i)); this.marks.push([this.S, label, i]); return i; }
  // a fresh page from the title: storage cleared, frozen
  open() {
    try { this.cli('close'); } catch { /* not open */ }
    this.cli('open', this.url);
    const [w, h] = this.size.split('x'); this.cli('resize', w, h);
    this.cli('run-code', `async page => { await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.__game && document.fonts.status === 'loaded'); await page.waitForTimeout(500); await page.evaluate(() => window.__game.freeze()); }`);
    this.S = 0; this.events = []; this.held = new Set();
  }
  steps(n) { this.run('await ST(A.n);', { n }); return this; }
  tap(code, n = 3, after = 3) { this.run('await TAP(A.code, A.n, A.after);', { code, n, after }); return this; }
  down(...codes) { this.run('for (const c of A.codes) await K(c, "down");', { codes }); return this; }
  up(...codes) { this.run('for (const c of A.codes) await K(c, "up");', { codes }); return this; }
  releaseAll() { if (this.held.size) this.up(...this.held); return this; }
  until(cond, max = 600, label) { this.run('return await UNTIL(A.cond, A.max, A.label);', { cond, max, label }); return this; }
  // pick a menu button by its text (moves focus with the arrow keys, then Enter)
  menu(label, { exact = false } = {}) {
    this.run(`
      for (let k = 0; k < 40; k++) {
        const f = await page.evaluate(() => { const el = document.querySelector('#overlay .menu-btn.focus, #overlay button.focus, #overlay [data-focus].focus'); return el ? el.textContent.trim() : null; });
        const hit = f && (A.exact ? f === A.label : f.toLowerCase().startsWith(A.label.toLowerCase()));
        if (hit) { await TAP('Enter', 2, 2); return f; }
        await TAP(A.k || 'ArrowDown', 2, 2);
      }
      throw new Error('menu item not found: ' + A.label);`, { label, exact });
    return this;
  }
  // advance an open dialog (and any that follow) until none is open
  dialog(max = 80) {
    this.run(`
      for (let k = 0; k < A.max; k++) { const md = await MODAL(); if (md !== 'dialog') return k; await TAP('KeyZ', 2, 4); }
      throw new Error('dialog never closed');`, { max });
    return this;
  }
  // press a recorded solution's events on the same game frames, from now.
  // stop: optional condition (source) that ends the segment early (e.g. a story starts).
  segment(sol, { stop = null, label, cut = null } = {}) {
    // cut: end the segment at that game frame (events from it on are dropped)
    if (cut != null) sol = { ...sol, events: sol.events.filter((e) => e[0] < cut), frames: cut };
    const r = this.run(`
      const f0 = (await page.evaluate(() => window.__game.state().frame));
      const toFrame = async (k) => {
        const r = await page.evaluate(([f0, k, stop]) => {
          const fn = stop ? new Function('s', 'm', 'return (' + stop + ');') : null;
          let n = 0, stuck = 0;
          for (;;) {
            const s = window.__game.state();
            if (fn && fn(s, window.__game.meta() || {})) return { n, stopped: true };
            if (s.frame - f0 >= k) return { n };
            const before = s.frame; window.__game.step(1); n++;
            if (window.__game.state().frame === before) { if (++stuck > 900) return { n, stuck: true }; } else stuck = 0;
          }
        }, [f0, k, A.stop]);
        S += r.n; return r;
      };
      for (const [k, code, type] of A.events) {
        const r = await toFrame(k);
        if (r.stopped) return { stopped: true, at: k };
        if (r.stuck) throw new Error('segment stuck in a modal at frame ' + k + ': ' + await MODAL());
        await K(code, type);
      }
      const r = await toFrame(A.frames);
      if (r.stuck) throw new Error('segment stuck in a modal at the end: ' + await MODAL());
      return { stopped: !!r.stopped };`, { events: sol.events, frames: sol.frames, stop });
    if (this.verbose) console.log(String(this.S).padStart(6), ('segment ' + (label || sol.name)).padEnd(30), JSON.stringify(r.info), r.out && r.out.stopped ? 'stopped' : '');
    return r;
  }
  // [playtest] play a RunAuthor chain from here (chain frame 0 = now): its keys on the same game frames,
  // each modal (it must open on the frame the model says) answered by its action with real keys,
  // landing where the model landed. One run-code per stretch between modals (progress per line).
  chain(ch, { label = 'chain' } = {}) {
    this.run('await page.evaluate(() => { window.__G0 = window.__game.state().frame; });');
    let ei = 0, carry = [];
    for (let mi = 0; mi <= ch.modals.length; mi++) {
      const md = ch.modals[mi] || null;
      const until = md ? md.f : ch.frames;
      const ev = []; while (ei < ch.events.length && (md ? ch.events[ei][0] < until : true)) ev.push(ch.events[ei++]);
      // events on the modal's own frame are pressed after it opened (the model does the same)
      const evAt = []; while (md && ei < ch.events.length && ch.events[ei][0] === until) evAt.push(ch.events[ei++]);
      const r = this.run(`
        const G0 = await page.evaluate(() => window.__G0);
        const modalNow = () => page.evaluate(() => { const m = window.__game.meta(); return m ? (m.ui || (m.dialog ? 'dialog' : null) || m.story) : null; });
        const advance = async (k, wantModal) => {
          const r = await page.evaluate(([G0, k, wantModal]) => {
            for (let n = 0; n < 400000; n++) {
              const s = window.__game.state(), m = window.__game.meta();
              const modal = m && (m.ui || (m.dialog ? 'dialog' : null) || m.story);
              if (modal) return { n, modal, f: s.frame - G0 };
              if (s.frame - G0 >= k && !wantModal) return { n, f: s.frame - G0 };
              if (s.frame - G0 > k) return { n, f: s.frame - G0, late: true };
              window.__game.step(1);
            }
            return { stuck: true };
          }, [G0, k, wantModal]);
          return r;
        };
        // the keys up to the modal (or the end)
        for (const [k, code, type] of A.ev) {
          const r = await advance(k, false); S += r.n || 0;
          if (r.modal) throw new Error('unexpected modal ' + r.modal + ' at chain frame ' + r.f + ' (next key at ' + k + ')');
          await K(code, type);
        }
        if (!A.md) { const r = await advance(A.until, false); S += r.n || 0; if (r.modal) throw new Error('unexpected modal ' + r.modal + ' at chain frame ' + r.f); return { end: r.f }; }
        const r = await advance(A.until, true); S += r.n || 0;
        if (!r.modal || r.f !== A.until) throw new Error('expected ' + A.md.kind + ' at chain frame ' + A.until + ', got ' + JSON.stringify(r));
        for (const [k, code, type] of A.evAt) await K(code, type);
        if (A.handed) await ST(31); // [polish-T] a card handed over from a dialog ignores input for 30 steps (ui.guard)
        const keep = [...new Set([...held, ...A.carry])]; // [polish-T] carry: lifted for the modal before (same frame)
        for (const c of keep) if (held.has(c)) await K(c, 'up');
        const kind = A.md.kind, act = A.md.action, want = { dialog: 'dialog', talk: 'dialog', ready: 'ready', complete: 'complete', save: 'crack', hubcrack: 'hubcrack', story: null }[kind];
        if (want && r.modal !== want) throw new Error('modal ' + r.modal + ' is not ' + kind + ' at chain frame ' + A.until);
        const focusTo = async (sel, text) => {
          for (let i = 0; i < 40; i++) {
            const d = await page.evaluate(([sel, text]) => {
              const f = document.querySelector('#overlay .focus');
              const t = [...document.querySelectorAll('#overlay ' + sel)].find((e) => !text || e.textContent.trim().toLowerCase().startsWith(text.toLowerCase()));
              if (!t) return { none: true };
              if (f === t) return { ok: true };
              const a = f.getBoundingClientRect(), b = t.getBoundingClientRect();
              const ay = a.y + a.height / 2, by = b.y + b.height / 2, ax = a.x + a.width / 2, bx = b.x + b.width / 2;
              if (by > a.bottom) return { key: 'ArrowDown' }; if (by < a.top) return { key: 'ArrowUp' };
              return { key: bx > ax ? 'ArrowRight' : 'ArrowLeft' };
            }, [sel, text || null]);
            if (d.ok) return;
            if (d.none) throw new Error('no ' + sel + ' ' + (text || ''));
            await TAP(d.key, 2, 2);
          }
          throw new Error('could not focus ' + sel + ' ' + (text || ''));
        };
        // the press that may close the modal steps once (no game frame may pass after it closes)
        const press1 = async (key) => { await K(key, 'down'); await ST(1); await K(key, 'up'); if (await modalNow()) await ST(2); };
        const pick = async (label) => { await focusTo('button', label); await press1('Enter'); };
        const closeDialogs = async () => { for (let i = 0; i < 80 && (await modalNow()) === 'dialog'; i++) { await K('Enter', 'down'); await ST(1); await K('Enter', 'up'); if ((await modalNow()) === 'dialog') await ST(3); } };
        const trio = async (ids) => {
          await pick('Change trio');
          const cur = await page.evaluate(() => window.__game.state().trio);
          for (const id of cur) { await focusTo('.cricket-cell[data-id=' + id + ']'); await press1('Enter'); }
          for (const id of ids) { await focusTo('.cricket-cell[data-id=' + id + ']'); await press1('Enter'); }
          await pick('Done');
        };
        if (act === 'close') { if (r.modal === 'dialog') await closeDialogs(); else { await K('Escape', 'down'); await ST(1); await K('Escape', 'up'); } }
        else if (act === 'enter') { await pick('Enter'); await closeDialogs(); }
        else if (act === 'carrier') await pick(kind === 'complete' ? 'Return to the Carrier' : 'Go to the Carrier');
        else if (act === 'back') await pick('Back to');
        else if (act === 'trio+back') { await trio(A.md.arg); await pick('Back to'); }
        else if (act === 'trio') { await trio(A.md.arg); await K('Escape', 'down'); await ST(1); await K('Escape', 'up'); }
        else if (act === 'notyet' || act === 'notnow') { await K('Escape', 'down'); await ST(1); await K('Escape', 'up'); }
        else if (act === 'none') { return { modal: kind, action: act, f: A.until, left: r.modal }; } // the caller takes it from here (the ending)
        else throw new Error('unknown action ' + act);
        const left = await modalNow();
        if (left && !A.sameNext) throw new Error('a modal is still open after ' + act + ': ' + left); // [polish-T] sameNext: the next modal opens as this one closes (meta-run handoff)
        if (left && A.sameNext) return { modal: kind, action: act, f: A.until, next: left, carry: keep }; // carry: the keys lifted here go down again after the next modal
        const s = await page.evaluate(() => window.__game.state());
        const x = Math.round(s.pos.x * 10) / 10, y = Math.round(s.pos.y * 10) / 10;
        if (s.room !== A.md.after.room || Math.abs(x - A.md.after.x) > 0.11 || Math.abs(y - A.md.after.y) > 0.11 || s.frame - G0 !== A.until) throw new Error('after ' + kind + '/' + act + ' at chain frame ' + A.until + ': model ' + JSON.stringify(A.md.after) + ', browser ' + JSON.stringify({ room: s.room, x, y, f: s.frame - G0 }));
        for (const c of keep) if (!held.has(c)) await K(c, 'down');
        return { modal: kind, action: act, f: A.until };`, { ev, evAt, md, until, sameNext: !!(md && ch.modals[mi + 1] && ch.modals[mi + 1].f === until), handed: !!(md && md.kind === 'complete' && mi > 0 && ch.modals[mi - 1].f === until), carry }); // [polish-T]
      carry = (r.out && r.out.carry) || [];
      if (this.verbose) console.log(String(this.S).padStart(6), `${label} ${md ? md.kind + '/' + md.action + ' @' + md.f : 'end @' + ch.frames}`.padEnd(30), JSON.stringify(r.info));
      if (md) this.marks.push([this.S, `${md.kind}/${md.action}`, r.info]);
      if (md && md.action === 'none') return r.info; // the caller takes over (the ending): the chain ends on this modal
    }
    const fin = this.run('return null;').info, e = ch.end;
    if (fin.room !== e.room || Math.abs(fin.x - e.x) > 1 || Math.abs(fin.y - e.y) > 1) throw new Error(`chain ended apart from the model: ${JSON.stringify(fin)} vs ${JSON.stringify(e)}`);
    return fin;
  }
  save(name, expect = {}) {
    const fin = this.log('end');
    // the same summary tools/replay.mjs reads at the end of a whole-game replay
    const endState = this.run(`return await page.evaluate(() => { const s = window.__game.state(), m = window.__game.meta() || {}; return { screen: s.screen, room: s.room, x: s.pos && Math.round(s.pos.x * 10) / 10, y: s.pos && Math.round(s.pos.y * 10) / 10, health: s.health, items: [...(s.items || [])].sort(), rescued: [...(s.rescued || [])].sort(), recruits: [...(s.recruits || [])].sort(), frame: s.frame, playFrames: s.playFrames, won: !!m.won, inCarrier: !!m.inCarrier, crumbs: m.crumbs, completion: m.completion, ui: m.ui || null, story: m.story || null }; });`).out;
    const out = { name, start: { from: 'title', size: this.size }, frames: this.S, events: this.events, marks: this.marks.map(([s, l, i]) => [s, l, i && i.room]), expect, endState };
    const file = path.join(ROOT, 'design', 'solutions', name + '.json');
    writeFileSync(file, JSON.stringify(out, null, 0).replace(/\],\[/g, '],\n['));
    console.log(`saved ${name}: ${this.S} steps, ${this.events.length} events, end ${JSON.stringify(fin)}`);
    return out;
  }
}

// ---------------------------------------------------------------------------------------------
// [playtest] RunAuthor: one continuous headless game for a whole-game run (the Carrier's rooms
// included), with the browser's modals and their outcomes modelled: a Ready? card's Enter moves
// you into the lair, "Return to the Carrier" / the save crack's "Go to the Carrier" and the
// Carrier crack's "Back to ..." move you there and back, "Change trio" sets the trio. Plan the
// choice for the next modal of a kind with plan(kind, action, arg); otherwise dialogs and cards
// close, Ready? cards Enter. modals[] (frame, kind, action, where you are after it) goes with the
// events to BrowserAuthor.chain(), which presses the same keys on the same game frames and does
// each modal's action with real keys in the browser.
import { HUB_ZONE, hubRoomFor } from '../game/src/hub.js';
import { ZONES as ALL_ZONES } from '../game/data/rooms/index.js';
import { shellStage, rescueCount, canChirp, secretKind, arrived, ensure as metaEnsure, lairCrack } from '../game/src/meta.js';
const CRACK = { x: 1102, y: 600 };
export class RunAuthor extends Author {
  constructor(start) {
    super(start, { zones: [...ALL_ZONES, HUB_ZONE] });
    this.modals = []; this.plans = []; this.returnCrack = null;
    metaEnsure(this.g);
    this.onModal = (m) => this._modal(m);
    // the Carrier's crack and the seed-hearts / song-seeds (meta-run.js effects on the sim)
    const meta = this.sim.meta, orig = meta.check.bind(meta);
    meta.check = (f) => {
      const g = this.g, p = g.player;
      for (const e of g.metaEnts || []) {
        if (e.done || e.type !== 'secret') continue;
        const box = { x: e.px, y: e.py, w: (e.w || 1) * 40, h: (e.h || 1) * 40 };
        if (p.x < box.x + box.w && p.x + p.w > box.x && p.y < box.y + box.h && p.y + p.h > box.y) {
          e.done = true; g.rs(g.room.id).taken.add(e.key);
          const id = e.id || e.key, m = metaEnsure(g);
          if (m.secrets.includes(id)) continue;
          m.secrets.push(id);
          const k = secretKind(id);
          if (k === 'heart') { p.maxHealth += 1; p.health = p.maxHealth; }
          if (k === 'song') { const songs = (m.upgrades.songs || 0) + m.secrets.filter((x) => secretKind(x) === 'song').length; p.chirpRefillMul = 1 / (1 + 0.25 * songs); }
        }
      }
      // hub.js update(): arrivals pop in one by one (50 frames, then 80 apart); after the 9th rescue's, the Carrier sings
      const hub = this.hub, m0 = metaEnsure(g);
      if (g.inCarrier && hub) {
        if (hub.queue.length && --hub.queueT <= 0) {
          m0.shown.push(hub.queue.shift()); hub.queueT = 80;
          if (!hub.queue.length && rescueCount(g) >= 9 && !m0.damperOpen) hub.sing = 60;
        }
        if (hub.sing && --hub.sing <= 0) {
          hub.sing = 0; m0.damperOpen = true; m0.flags.damperOpen = true;
          const m = { kind: 'dialog', sing: true, f }; meta.seen.push(m);
          this.sim.input.releaseAll(); this.sim.input.sample(); meta.repress = true;
          return m;
        }
      }
      if (g.inCarrier && g.inp?.pressed?.enter && p.grounded && Math.abs(p.cx - CRACK.x) < 40 && Math.abs(p.y + p.h - CRACK.y) < 30) {
        const m = { kind: 'hubcrack', f }; meta.seen.push(m);
        this.sim.input.releaseAll(); this.sim.input.sample(); meta.repress = true;
        return m;
      }
      return orig(f);
    };
  }
  plan(kind, action, arg) { this.plans.push({ kind, action, arg }); return this; }
  here() { const p = this.p; return { room: this.g.room.id, tx: Math.floor(p.cx / 40), ty: Math.floor((p.y + p.h - 1) / 40) }; }
  _modal(m) {
    const g = this.g, p = this.p;
    const i = this.plans.findIndex((x) => x.kind === m.kind);
    const pl = i >= 0 ? this.plans.splice(i, 1)[0] : null;
    const action = pl ? pl.action : (m.kind === 'ready' ? 'enter' : 'close');
    const arg = pl ? pl.arg : undefined;
    if (action === 'enter') {
      if (!canChirp(p.id)) { const j = p.trio.findIndex((id) => canChirp(id)); if (j >= 0) { p.active = j; p.queuedSwap = null; p.setCricket(p.id); } }
      if (m.to) g.startAt(m.to, m.at?.[0], m.at?.[1]);
    } else if (action === 'carrier') {
      const crack = m.kind === 'complete' ? (lairCrack(g.world, g.room.id) || g.saveCrack || this.here()) : g.saveCrack; // [final-S] the lair's save crack (main.js does the same)
      this.returnCrack = crack || this.returnCrack;
      g.startAt(hubRoomFor(shellStage(rescueCount(g)))); g.inCarrier = true;
      const m0 = metaEnsure(g); this.hub = { queue: arrived(g).filter((id) => !m0.shown.includes(id)), queueT: 50, sing: 0 };
    } else if (action === 'back' || action === 'trio+back') {
      if (action === 'trio+back') { const cur = p.id; p.trio = arg.slice(0, 3); p.active = Math.max(0, p.trio.indexOf(cur)); p.queuedSwap = null; p.setCricket(p.id); }
      const c = this.returnCrack; g.inCarrier = false;
      g.startAt(c.room, c.tx, c.ty); g.saveCrack = { ...c };
    } else if (action === 'trio') {
      const cur = p.id; p.trio = arg.slice(0, 3); p.active = Math.max(0, p.trio.indexOf(cur)); p.queuedSwap = null; p.setCricket(p.id);
    }
    const s = g.snapshot();
    this.modals.push({ f: this.f, kind: m.kind, action, arg, after: { room: s.room, x: Math.round(s.pos.x * 10) / 10, y: Math.round(s.pos.y * 10) / 10, active: p.id } });
    if (this.verbose) console.log(String(this.f).padStart(6), `modal ${m.kind} -> ${action}${arg ? ' ' + arg : ''}`.padEnd(28), JSON.stringify(this.state()));
  }
  // press a recorded solution's events from now (cut: stop at that solution frame)
  play(sol, { cut = null, stop = null } = {}) {
    const f0 = this.f, frames = cut ?? sol.frames;
    const ev = sol.events.filter((e) => e[0] < frames || (cut == null && e[0] <= frames));
    let i = 0;
    for (let k = 0; k <= frames; k++) {
      while (i < ev.length && ev[i][0] === k) { const [, c, t] = ev[i++]; if (t === 'down') this.down(c); else this.up(c); }
      if (k === frames) break;
      if (stop && stop(this.g)) break;
      this._step(1);
    }
    if (cut != null) for (const c of [...this.held]) this.up(c); // a cut segment lets go of everything
    if (this.verbose) console.log(String(this.f).padStart(6), `play ${sol.name}${cut ? ' (cut ' + cut + ')' : ''}`.padEnd(28), JSON.stringify(this.state()), `(${this.f - f0} frames)`);
    return this;
  }
  chain() { return { events: this.events, frames: this.f, modals: this.modals, start: this.start, end: endState(this.g.snapshot()) }; }
}
