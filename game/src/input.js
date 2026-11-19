// Keys, touch and gamepad -> one set of actions, edge-detected and sticky until the next
// fixed update reads them (a tap shorter than a frame still counts).
// The Input class has no DOM at import time, so node (the headless sim, tools) can use it;
// attachKeyboard / attachTouch / the pad poll take the DOM objects they need.
import { FORGIVE } from '../data/movement.js';

export const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'use', 'chirp', 'kick', 'listen',
  'swapPrev', 'swapNext', 'map', 'pause', 'mute', 'confirm', 'back', 'rewind', // [issue 11] rewind: Backspace only (main.js: a debug flag)
  'upJump', 'enter', 'cloak', 'lookUp']; // [issue #27]
// [issue #27] Up to jump, Down to go in:
// - upJump: the keyboard's ↑ / W. The game treats it as Jump (game.js playerFrame) except on a hanging
//   line, where it only climbs (it is also 'up'); Z / Space are 'jump' and let go with a fling.
// - enter: a ↓ press on every scheme (↓ / S, stick down, D-pad down), resolved ENTER_WAIT samples later
//   unless Jump came within that many samples either side (↓ + Jump is always a drop-through).
//   Held, it is just 'down'. A direct press (the touch prompt tap) is immediate.
// - cloak: hold Shift on the keyboard; stick up / D-pad up on touch and pad.
// - lookUp: stick up / D-pad up only (the keyboard's ↑ is a jump key).
export const ENTER_WAIT = 3;
const STICK_UP = ['up', 'cloak', 'lookUp']; // what stick up / D-pad up mean on touch and pad

// Two layouts that never collide: arrows + Z X C V B, or WASD + Space J K L I.
export const KEYMAP = {
  ArrowLeft: ['left'], ArrowRight: ['right'], ArrowUp: ['up', 'upJump'], ArrowDown: ['down'],
  KeyA: ['left'], KeyD: ['right'], KeyW: ['up', 'upJump'], KeyS: ['down'],
  ShiftLeft: ['cloak'], ShiftRight: ['cloak'], // [issue #27] the Cellophane Cloak (hold)
  Space: ['jump', 'confirm'], KeyZ: ['jump'],
  KeyV: ['use'], KeyI: ['use'],
  KeyC: ['chirp'], KeyK: ['chirp'],
  KeyX: ['kick'], KeyJ: ['kick'],
  KeyB: ['listen'], KeyL: ['listen'],
  KeyQ: ['swapPrev'], KeyE: ['swapNext'],
  Tab: ['map'], Escape: ['pause', 'back'], KeyP: ['pause'], KeyM: ['mute'],
  Enter: ['confirm'], NumpadEnter: ['confirm'], Backspace: ['back', 'rewind'],
};
const ARROW_LAYOUT = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB']);
const WASD_LAYOUT = new Set(['KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'KeyJ', 'KeyK', 'KeyL', 'KeyI']);
// Key caps shown in prompts, per layout.
const CAPS = {
  arrows: { left: '←', right: '→', up: '↑', down: '↓', upJump: '↑', enter: '↓', cloak: 'Shift', jump: 'Z', use: 'V', chirp: 'C', kick: 'X', listen: 'B', swapPrev: 'Q', swapNext: 'E', map: 'Tab', pause: 'Esc', mute: 'M', confirm: 'Enter', back: 'Esc' },
  wasd:   { left: 'A', right: 'D', up: 'W', down: 'S', upJump: 'W', enter: 'S', cloak: 'Shift', jump: 'Space', use: 'I', chirp: 'K', kick: 'J', listen: 'L', swapPrev: 'Q', swapNext: 'E', map: 'Tab', pause: 'Esc', mute: 'M', confirm: 'Enter', back: 'Esc' },
};
// [polish-T] on touch every action is named by the control that does it (ui.js cap(); 'move' and 'swap' are
// the {left} {right} and {swapPrev} {swapNext} pairs, drawn as one chip)
const TOUCH_NAMES = { jump: 'Jump', use: 'Use', chirp: 'Chirp', kick: 'Kick', listen: 'Ear', up: 'Stick ↑', down: 'Stick ↓', enter: 'Stick ↓', cloak: 'Stick ↑', lookUp: 'Stick ↑', upJump: 'Jump', left: 'Stick ←', right: 'Stick →', move: 'Stick', swapPrev: 'Tap a face', swapNext: 'Tap a face', swap: 'Tap a face', map: 'Map icon', pause: 'Pause icon', mute: 'Sound icon', confirm: 'Tap', back: 'Back' };

// Standard-mapping gamepad buttons -> actions.
export const PADMAP = {
  0: ['jump', 'confirm'], 1: ['listen', 'back'], 2: ['kick'], 3: ['chirp'],
  4: ['swapPrev'], 5: ['swapNext'], 7: ['use'], 8: ['map'], 9: ['pause'],
  12: STICK_UP, 13: ['down'], 14: ['left'], 15: ['right'],
};
const PAD_GLYPH = {
  ps:       { jump: 'cross', listen: 'circle', kick: 'square', chirp: 'triangle', use: 'R2', swapPrev: 'L1', swapNext: 'R1', map: 'Create', pause: 'Options', confirm: 'cross', back: 'circle' },
  xbox:     { jump: 'A', listen: 'B', kick: 'X', chirp: 'Y', use: 'RT', swapPrev: 'LB', swapNext: 'RB', map: 'View', pause: 'Menu', confirm: 'A', back: 'B' },
  nintendo: { jump: 'B', listen: 'A', kick: 'Y', chirp: 'X', use: 'ZR', swapPrev: 'L', swapNext: 'R', map: '−', pause: '+', confirm: 'B', back: 'A' },
};
export function padFamily(id = '') {
  if (/045e|xbox|xinput/i.test(id)) return 'xbox'; // first: "Xbox Wireless Controller" also says "wireless controller"
  if (/054c|dualsense|dualshock|playstation|wireless controller/i.test(id)) return 'ps';
  if (/057e|pro controller|joy-con/i.test(id)) return 'nintendo';
  return 'xbox';
}

// Map a stick (x right, y down, both -1..1 of its radius) to directions, with the cones.
export function stickDirs(x, y, deadzone = 0) {
  const mag = Math.hypot(x, y);
  const out = { left: false, right: false, up: false, down: false };
  if (mag <= deadzone) return out;
  out.left = x < -FORGIVE.stickSide;
  out.right = x > FORGIVE.stickSide;
  const ang = (Math.atan2(x, y) * 180) / Math.PI; // 0 = straight down
  if (mag >= FORGIVE.stickDown.min && Math.abs(ang) <= FORGIVE.stickDown.halfAngle) out.down = true;
  const upAng = 180 - Math.abs(ang); // 0 = straight up
  if (mag >= FORGIVE.stickUp.min && upAng <= FORGIVE.stickUp.halfAngle) out.up = true;
  return out;
}

export class Input {
  constructor() {
    this.keys = new Set();          // held key codes
    this.touch = {};                // action -> bool (buttons)
    this.touchStick = { left: false, right: false, up: false, down: false };
    this.pad = {};                  // action -> bool (from the last poll)
    this.padStick = { left: false, right: false, up: false, down: false };
    this.pending = {};              // action -> pressed since last sample (sticky)
    this.pendingUp = {};
    this.prevHeld = {};
    this.frame = { held: {}, pressed: {}, released: {} };
    this.last = 'keyboard';
    this.layout = 'arrows';
    this.padId = null;
    this.padFamily = 'xbox';
    this.padStandard = true;
    this.padConnected = false;
    this.enabled = true;
    this.onAny = null;              // callback(kind) on any fresh press (first input, notices)
    this.prevPadButtons = [];
  }
  _press(actions, src) {
    for (const a of actions) this.pending[a] = true;
    this.last = src;
    if (this.onAny) this.onAny(src, actions);
  }
  _release(actions) { for (const a of actions) this.pendingUp[a] = true; }
  keyDown(code) {
    if (this.keys.has(code)) return; // auto-repeat
    this.keys.add(code);
    if (KEYMAP[code]) this.keyEver = true; // [polish-T] scheme()
    if (ARROW_LAYOUT.has(code)) this.layout = 'arrows'; else if (WASD_LAYOUT.has(code)) this.layout = 'wasd';
    this._press(KEYMAP[code] || [], 'keyboard');
  }
  keyUp(code) { if (!this.keys.delete(code)) return; this._release(KEYMAP[code] || []); }
  cancelEnter() { this.enterWait = 0; } // [issue #27] menus, dialogs: a ↓ there is not an Enter
  releaseAll() { this.enterWait = 0; for (const c of [...this.keys]) this.keyUp(c); for (const a in this.touch) this.setTouch(a, false); this.setTouchStick(0, 0); }
  setTouch(action, down) {
    if (!!this.touch[action] === down) return;
    this.touch[action] = down;
    if (down) this._press([action], 'touch'); else this._release([action]);
  }
  setTouchStick(x, y) {
    const d = stickDirs(x, y);
    for (const k of ['left', 'right', 'up', 'down']) {
      if (d[k] && !this.touchStick[k]) this._press(k === 'up' ? STICK_UP : [k], 'touch');
      if (!d[k] && this.touchStick[k]) this._release(k === 'up' ? STICK_UP : [k]);
    }
    this.touchStick = d;
  }
  // Read the first connected controller; call once per fixed update (before sample()).
  pollPad(getGamepads) {
    let pads = [];
    try { pads = getGamepads ? getGamepads() || [] : []; } catch { pads = []; }
    const pad = [...pads].find((p) => p && p.connected);
    if (!pad) { this.pad = {}; this.padStick = { left: false, right: false, up: false, down: false }; this.prevPadButtons = []; return; }
    this.padId = pad.id; this.padFamily = padFamily(pad.id); this.padStandard = pad.mapping === 'standard';
    const now = {};
    pad.buttons.forEach((b, i) => {
      const down = typeof b === 'object' ? (b.pressed || b.value > 0.5) : b > 0.5;
      const was = !!this.prevPadButtons[i];
      if (down && !was) this._press(PADMAP[i] || [], 'gamepad');
      if (!down && was) this._release(PADMAP[i] || []);
      if (down) for (const a of PADMAP[i] || []) now[a] = true;
      this.prevPadButtons[i] = down;
    });
    const sd = stickDirs(pad.axes[0] || 0, pad.axes[1] || 0, FORGIVE.padDeadzone);
    for (const k of ['left', 'right', 'up', 'down']) {
      if (sd[k] && !this.padStick[k]) this._press(k === 'up' ? STICK_UP : [k], 'gamepad');
      if (!sd[k] && this.padStick[k]) this._release(k === 'up' ? STICK_UP : [k]);
    }
    this.padStick = sd;
    this.pad = now;
  }
  heldNow(a) {
    if (!this.enabled) return false;
    if (a === 'enter') return this.heldNow('down'); // [issue #27]
    for (const c of this.keys) if ((KEYMAP[c] || []).includes(a)) return true;
    if ((a === 'cloak' || a === 'lookUp') && (this.touchStick.up || this.padStick.up)) return true; // [issue #27] stick up
    return !!(this.touch[a] || this.touchStick[a] || this.pad[a] || this.padStick[a]);
  }
  // Called at the start of every fixed update. Returns {held, pressed, released}.
  sample() {
    const held = {}, pressed = {}, released = {};
    for (const a of ACTIONS) {
      held[a] = this.heldNow(a);
      pressed[a] = this.enabled && !!this.pending[a];
      released[a] = this.enabled && (!!this.pendingUp[a] || (!held[a] && !!this.prevHeld[a]));
    }
    // [issue #27] Enter: a ↓ press, ENTER_WAIT samples on, unless Jump (Z / Space / ↑ / W / the button)
    // came within ENTER_WAIT samples either side of it
    const jumpNow = pressed.jump || pressed.upJump;
    this.sinceJump = jumpNow ? 0 : (this.sinceJump ?? 99) + 1;
    if (jumpNow) this.enterWait = 0;
    if (this.enterWait > 0 && --this.enterWait === 0) pressed.enter = this.enabled;
    if (pressed.down && !jumpNow && this.sinceJump > ENTER_WAIT) this.enterWait = ENTER_WAIT;
    this.pending = {}; this.pendingUp = {};
    this.prevHeld = held;
    this.frame = { held, pressed, released };
    return this.frame;
  }
  // [polish-T] which controls to name: what the player touched last, but a touch screen where no key was ever
  // pressed names its touch controls (the boot state is 'keyboard'; "Hold B" showed on phones)
  scheme() { if (this.forceScheme) return this.forceScheme; return this.last === 'keyboard' && this.touchUI && !this.keyEver ? 'touch' : this.last; }
  // A prompt label for an action, for whatever the player touched last.
  label(action) {
    const last = this.scheme(); // [polish-T]
    if (last === 'gamepad') {
      const g = PAD_GLYPH[this.padFamily][action];
      if (g) return { kind: this.padFamily === 'ps' && ['cross', 'circle', 'square', 'triangle'].includes(g) ? 'glyph' : 'pad', text: g };
      const dir = { left: 'Left', right: 'Right', up: 'Up', down: 'Down', enter: 'Down', cloak: 'Up', lookUp: 'Up' }[action]; // [issue #27] Enter is down, the cloak up
      if (dir) return { kind: 'pad', text: dir };
      if (action === 'upJump') return this._padJump();
    }
    if (last === 'touch') return { kind: 'touch', text: TOUCH_NAMES[action] || 'Tap' }; // [polish-T] the touch control's own name, never an action id
    if (last === 'gamepad') return { kind: 'pad', text: { move: 'Stick', swap: 'L1 R1', mute: 'Mute' }[action] || 'Button' }; // [polish-T]
    return { kind: 'key', text: CAPS[this.layout][action] || '?' }; // [polish-T]
  }
  _padJump() { const g = PAD_GLYPH[this.padFamily].jump; return { kind: this.padFamily === 'ps' ? 'glyph' : 'pad', text: g }; }
}

// ---- DOM attachment ---------------------------------------------------------
const GAME_CODES = new Set(Object.keys(KEYMAP));
export function attachKeyboard(input, win) {
  win.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey) return; // Ctrl+Shift+F belongs to the bug reporter
    if (win.document?.getElementById('report')?.isOpen) return; // [meta] the bug form is typing
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (GAME_CODES.has(e.code)) e.preventDefault();
    input.keyDown(e.code);
  });
  win.addEventListener('keyup', (e) => { input.keyUp(e.code); });
  win.addEventListener('blur', () => input.releaseAll());
}

// The touch overlay: floating stick (left third) and the right-thumb button cluster.
// Sizes from the design: Jump 88 px in the corner, Use 72 directly left, Chirp 72 above Jump,
// Kick 64 above Use, Ear 64 left of Use. Stick radius 70 px.
export function attachTouch(input, root) {
  const el = (tag, cls, parent = root) => { const e = document.createElement(tag); e.className = cls; parent.appendChild(e); return e; };
  const layer = el('div', 'touch-layer');
  const stickZone = el('div', 'touch-stick-zone', layer);
  const base = el('div', 'touch-stick-base', layer);
  const knob = el('div', 'touch-stick-knob', base);
  base.hidden = true;
  const R = 70;
  let stickId = null, sx = 0, sy = 0;
  stickZone.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return;
    e.preventDefault();
    stickId = e.pointerId; stickZone.setPointerCapture(e.pointerId);
    const r = layer.getBoundingClientRect();
    sx = e.clientX - r.left; sy = e.clientY - r.top;
    base.style.left = sx + 'px'; base.style.top = sy + 'px'; base.hidden = false;
    knob.style.transform = 'translate(-50%,-50%)';
    input.setTouchStick(0, 0);
  });
  const moveStick = (e) => {
    if (e.pointerId !== stickId) return;
    const r = layer.getBoundingClientRect();
    let dx = e.clientX - r.left - sx, dy = e.clientY - r.top - sy;
    const m = Math.hypot(dx, dy);
    if (m > R) { dx *= R / m; dy *= R / m; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    input.setTouchStick(dx / R, dy / R);
  };
  const endStick = (e) => { if (e.pointerId !== stickId) return; stickId = null; base.hidden = true; input.setTouchStick(0, 0); };
  stickZone.addEventListener('pointermove', moveStick);
  stickZone.addEventListener('pointerup', endStick);
  stickZone.addEventListener('pointercancel', endStick);

  const buttons = {};
  const mk = (action, label, cls) => {
    const b = el('div', 'touch-btn ' + cls, layer);
    b.dataset.action = action;
    b.setAttribute('role', 'button');
    b.setAttribute('aria-label', label);
    b.textContent = label;
    const on = (e) => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('down'); input.setTouch(action, true); };
    const off = (e) => { e.preventDefault(); b.classList.remove('down'); input.setTouch(action, false); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('lostpointercapture', off);
    buttons[action] = b;
    return b;
  };
  mk('jump', 'Jump', 'tb-jump');
  mk('use', 'Use', 'tb-use');
  mk('chirp', 'Chirp', 'tb-chirp');
  mk('kick', 'Kick', 'tb-kick');
  mk('listen', 'Ear', 'tb-ear');
  return {
    layer, buttons,
    show(v) { layer.classList.toggle('on', v); },
    setVisible(action, v) { if (buttons[action]) buttons[action].hidden = !v; },
  };
}
