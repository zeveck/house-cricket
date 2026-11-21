// Story panels, the credits roll and the "Thank you" card: a full-screen DOM layer driven from
// the fixed step (replays stay frame-exact). Panels advance by themselves after ~4 s; a press
// of Jump (or a tap) skips one; holding Jump (or a long press) skips them all.
//
//   story.play(panels, {id, onDone, auto})   panels: [{img: 'story/open-1.webp', caption}]
//   story.credits({onDone})                   the roll, then "Thank you for playing"
// The higher-level flows (opening, tank escape, ending) live in main.js's `Story API`
// (window.__story / game events), documented in design/ENGINE_NOTES.md.
import { line } from './lines.js';

const AUTO = 240;        // frames per panel (4 s)
const HOLD_ALL = 45;     // frames of held Jump that skip everything
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

export class Story {
  constructor(root, opts = {}) {
    this.opts = opts;
    this.layer = el('div', 'story');
    this.layer.hidden = true;
    this.layer.setAttribute('data-screen', 'story');
    this.layer.setAttribute('role', 'dialog');
    this.layer.setAttribute('aria-modal', 'true');
    this.layer.setAttribute('aria-label', 'Story');
    this.imgA = el('img', 'story-img'); this.imgA.alt = '';
    this.cap = el('div', 'story-cap');
    this.hintEl = el('div', 'story-hint');
    this.bar = el('div', 'story-bar'); this.barFill = el('div', 'story-bar-fill'); this.bar.append(this.barFill);
    this.roll = el('div', 'credits'); this.roll.hidden = true;
    this.layer.append(this.imgA, this.cap, this.roll, this.hintEl, this.bar);
    this.layer.addEventListener('pointerdown', (e) => { e.preventDefault(); this.ptr = true; this.ptrDown = true; });
    const up = () => { this.ptrDown = false; };
    this.layer.addEventListener('pointerup', up); this.layer.addEventListener('pointercancel', up); this.layer.addEventListener('pointerleave', up);
    root.append(this.layer);
    this.active = false; this.kind = null;
  }
  hint(ui) {
    // "Jump: next   hold: skip" with the right cap
    this.hintEl.innerHTML = '';
    if (!ui) return;
    // [final-S] on touch: Tap / Hold (the screen), not the Jump button
    if (ui.input?.last === 'touch' || document.body.classList.contains('touch')) { const c = (t) => el('span', 'cap cap-touch', t); this.hintEl.append(c('Tap'), ' next    ', c('Hold'), ' skip all'); return; }
    this.hintEl.append(ui.cap('jump'), ' next    hold ', ui.cap('jump'), ' skip all');
  }
  play(panels, o = {}) {
    this.panels = panels; this.o = o; this.i = -1; this.active = true; this.kind = o.id || 'story';
    this.held = 0; this.layer.hidden = false; this.roll.hidden = true; this.cap.hidden = false; this.imgA.hidden = false; this.bar.hidden = false;
    this.layer.classList.remove('is-credits', 'is-thanks');
    this.hint(this.opts.ui);
    // preload all of them so a panel never shows half-loaded
    for (const p of panels) { const im = new Image(); im.src = 'assets/' + p.img; }
    this.next();
  }
  next() {
    this.i++;
    if (this.i >= this.panels.length) return this.end();
    const p = this.panels[this.i];
    this.f = 0;
    this.imgA.classList.remove('in');
    const src = 'assets/' + p.img;
    const show = () => { this.imgA.classList.add('in'); };
    if (this.imgA.getAttribute('src') !== src) { this.imgA.onload = show; this.imgA.src = src; if (this.imgA.complete) requestAnimationFrame(show); }
    else requestAnimationFrame(show);
    this.cap.textContent = p.caption || '';
    this.cap.hidden = !p.caption;
  }
  // The credits: a few pages that fade one into the next (each fits on screen), skippable.
  credits(o = {}) {
    this.o = o; this.active = true; this.kind = 'credits'; this.layer.hidden = false; this.f = 0; this.held = 0;
    this.layer.classList.add('is-credits'); this.layer.classList.remove('is-thanks');
    this.imgA.hidden = true; this.cap.hidden = true; this.bar.hidden = false; this.roll.hidden = false;
    const all = line('credits');
    this.pages = [all.slice(0, 2), all.slice(2, 4), all.slice(4, 6), all.slice(6)].filter((pg) => pg.length);
    this.page = -1; this.pageLen = 210;
    this.panels = null;
    this.hint(this.opts.ui);
    this.nextPage();
  }
  nextPage() {
    this.page++;
    if (this.page >= this.pages.length) return this.end();
    this.pf = 0;
    this.roll.innerHTML = '';
    const inner = el('div', 'credits-inner');
    for (const [role, who] of this.pages[this.page]) {
      const r = el('div', 'credit');
      if (!who) r.append(el('div', 'credit-title', role));
      else r.append(el('div', 'credit-role', role), el('div', 'credit-who', who));
      inner.append(r);
    }
    this.roll.append(inner);
  }
  thanks(o = {}) {
    this.o = o; this.active = true; this.kind = 'thanks'; this.layer.hidden = false; this.f = 0;
    this.layer.classList.add('is-thanks'); this.layer.classList.remove('is-credits');
    this.imgA.hidden = true; this.bar.hidden = true; this.roll.hidden = false; this.cap.hidden = true;
    this.roll.innerHTML = '';
    const t = el('div', 'thanks'); t.append(el('div', 'thanks-big', line('ending.thanks')));
    this.roll.append(t);
    this.hintEl.innerHTML = '';
    if (this.opts.ui) this.hintEl.append((this.opts.ui.input?.last === 'touch' || document.body.classList.contains('touch')) ? el('span', 'cap cap-touch', 'Tap') : this.opts.ui.cap('jump'), ' ' + line('ending.back')); // [final-S] Tap on touch
  }
  end() {
    const o = this.o || {}, skipped = !!this.skippedAll;
    this.active = false; this.layer.hidden = true; this.kind = null; this.o = null; this.skippedAll = false;
    o.onDone && o.onDone(skipped);
  }
  // Keep the layer up (frozen) while the next screen opens: callers hide it with release().
  // calm: [issue 16] held while the room after it loads: no "next / skip all" hints, no bar
  holdOpen(calm = false) { this.layer.hidden = false; this.layer.classList.toggle('held', !!calm); }
  release() { if (!this.active) this.layer.hidden = true; this.layer.classList.remove('held'); }
  step(f) {
    if (!this.active) return;
    this.f++;
    const press = this.ptr || f.pressed.jump || f.pressed.upJump || f.pressed.confirm; // [issue #37] ↑ / W is the jump: it skips too
    this.ptr = false;
    const holding = f.held.jump || f.held.upJump || f.held.confirm || this.ptrDown;
    if (this.kind === 'thanks') { if (this.f > 30 && (press || f.pressed.back)) this.end(); return; }
    if (this.kind === 'credits') {
      this.pf++;
      this.barFill.style.width = `${Math.min(100, ((this.page + this.pf / this.pageLen) / this.pages.length) * 100)}%`;
      if (f.pressed.back) { this.end(); return; }
      if ((press && this.pf > 10) || this.pf >= this.pageLen) this.nextPage();
      return;
    }
    this.held = holding ? this.held + 1 : 0;
    if (this.held >= HOLD_ALL || f.pressed.back) { this.i = this.panels.length; this.skippedAll = true; this.end(); return; }
    this.barFill.style.width = `${Math.min(100, (this.f / AUTO) * 100)}%`;
    if ((press && this.f > 6) || this.f >= AUTO) this.next();
  }
}
