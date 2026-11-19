#!/usr/bin/env node
// Frame-locked replay of recorded solutions in the browser, with real input via playwright-cli.
// For each solution: goToRoom (a fresh game), freeze, then for every event step to its frame
// and press the real key (keyboard.down/up). Each solution runs twice; both end states must
// match each other and the state recorded when it was authored.
//
//   node tools/replay.mjs [solution.json ...] [--url http://127.0.0.1:8131/] [--session replay]
//        [--pad]            replay with a pretend controller (d-pad + face buttons) instead of keys
//        [--pad-stick]      ... with the left stick for directions
//        [--touch]          replay with touches on the on-screen stick and buttons (phone session)
//        [--device "iPhone 15"] [--size 852x393] [--times 2]
// Defaults: every design/solutions/*.json, session "replay", 2 runs each.
// Run from the project root (playwright-cli reads .playwright/cli.config.json there).
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes(name);
const url0 = opt('--url', 'http://127.0.0.1:8131/');
const url = /[?&]dev\b/.test(url0) ? url0 : url0 + (url0.includes('?') ? '&' : '?') + 'dev'; // [final-S] zones 98/99 (entities, sandbox) load only with ?dev
const session = opt('--session', flag('--touch') ? 'replay-touch' : 'replay');
const times = Number(opt('--times', 2));
const mode = flag('--touch') ? 'touch' : flag('--pad-stick') ? 'pad-stick' : flag('--pad') ? 'pad' : 'keys';
const device = opt('--device', mode === 'touch' ? 'iPhone 15' : null);
const size = opt('--size', mode === 'touch' ? '852x393' : '1280x720');
const optVals = new Set(['--url', '--session', '--times', '--device', '--size'].map((n) => opt(n)).filter(Boolean));
let files = args.filter((a) => !a.startsWith('--') && !optVals.has(a));
if (!files.length) {
  const dir = path.join(root, 'design', 'solutions');
  files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(dir, f));
}

function cli(...a) {
  return execFileSync('playwright-cli', [`-s=${session}`, ...a], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 600000 });
}
function result(out) {
  const m = out.match(/### Result\n([\s\S]*?)(\n### |\n*$)/);
  if (!m) throw new Error('no result in playwright-cli output:\n' + out.slice(0, 2000));
  let txt = m[1].trim();
  try { txt = JSON.parse(txt); } catch { /* keep */ }
  if (typeof txt === 'string') { try { return JSON.parse(txt); } catch { return txt; } }
  return txt;
}

// The pretend controller (gamepad.md), installed before the game loads.
const PAD_INIT = `() => {
  const blank = () => ({ pressed: false, touched: false, value: 0 });
  const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: false, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, blank) };
  const fire = (type) => { const e = new Event(type); Object.defineProperty(e, 'gamepad', { value: pad }); window.dispatchEvent(e); };
  window.__pad = {
    connect(id) { if (id) pad.id = id; pad.connected = true; fire('gamepadconnected'); },
    disconnect() { pad.connected = false; fire('gamepaddisconnected'); },
    button(i, down) { pad.buttons[i] = down ? { pressed: true, touched: true, value: 1 } : blank(); pad.timestamp = performance.now(); },
    stick(x, y) { pad.axes[0] = x; pad.axes[1] = y; pad.timestamp = performance.now(); },
    get axes() { return pad.axes; },
  };
  navigator.getGamepads = () => [pad.connected ? pad : null, null, null, null];
}`;

// One replay, all inside the page session: returns the end state.
function replayCode(sol) {
  const start = { ...sol.start };
  return `async page => {
    const sol = ${JSON.stringify({ start, events: sol.events, frames: sol.frames })};
    const mode = ${JSON.stringify(mode)};

    const PADB = { KeyZ: 0, Space: 0, KeyB: 1, KeyL: 1, KeyX: 2, KeyJ: 2, KeyC: 3, KeyK: 3, KeyQ: 4, KeyE: 5, KeyV: 7, KeyI: 7, ArrowUp: 12, ArrowDown: 13, ArrowLeft: 14, ArrowRight: 15, KeyW: 12, KeyS: 13, KeyA: 14, KeyD: 15, ShiftLeft: 12, ShiftRight: 12 };
    // [issue #27] 1:1 because Enter is ↓ on every scheme; the Cloak (Shift) is D-pad / stick up. Recordings press
    // ArrowUp only to climb a line (a keyboard ↑ elsewhere jumps, which the pad's up does not: author jumps with KeyZ)
    const DIRS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', ShiftLeft: 'up', ShiftRight: 'up' };
    const TB = { KeyZ: 'jump', Space: 'jump', KeyV: 'use', KeyI: 'use', KeyC: 'chirp', KeyK: 'chirp', KeyX: 'kick', KeyJ: 'kick', KeyB: 'listen', KeyL: 'listen' };
    const held = new Set();
    const setup = () => page.evaluate((st) => { window.__game.goToRoom(st.room, { x: st.x, y: st.y, items: st.items || [], party: st.party || ['pip'], rescued: st.rescued || [] }); window.__game.freeze(); }, sol.start);
    let cdp = null, touchBtn = {}, active = [];
    await setup();
    if (mode === 'touch') {
      cdp = await page.context().newCDPSession(page);
      try { await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); } catch { /* no fingers down */ }
      // button positions are read when pressed: Use only appears once a Use item is held
      touchBtn = await page.evaluate(() => { const z = document.querySelector('.touch-stick-zone').getBoundingClientRect(); return { stick: { x: z.x + z.width * 0.45, y: z.y + z.height * 0.55 } }; });
    }
    const touchPoints = () => {
      const pts = [];
      const dirs = [...held].map((k) => DIRS[k]).filter(Boolean);
      if (dirs.length) {
        let dx = 0, dy = 0;
        if (dirs.includes('left')) dx -= 1; if (dirs.includes('right')) dx += 1; if (dirs.includes('up')) dy -= 1; if (dirs.includes('down')) dy += 1;
        const m = Math.hypot(dx, dy) || 1; const R = 62;
        pts.push({ x: touchBtn.stick.x + dx / m * R, y: touchBtn.stick.y + dy / m * R, id: 1 });
      }
      let id = 2;
      for (const k of held) { const a = TB[k]; if (a && touchBtn[a]) pts.push({ x: touchBtn[a].x, y: touchBtn[a].y, id: id++ }); }
      return pts;
    };
    const apply = async (code, type) => {
      if (type === 'down') held.add(code); else held.delete(code);
      if (mode === 'keys') { if (type === 'down') await page.keyboard.down(code); else await page.keyboard.up(code); return; }
      if (mode === 'pad' || (mode === 'pad-stick' && !DIRS[code])) { await page.evaluate(([b, d]) => window.__pad.button(b, d), [PADB[code], type === 'down']); return; }
      if (mode === 'pad-stick') {
        const ds = [...held].map((k) => DIRS[k]).filter(Boolean);
        const x = (ds.includes('right') ? 1 : 0) - (ds.includes('left') ? 1 : 0), y = (ds.includes('down') ? 1 : 0) - (ds.includes('up') ? 1 : 0);
        await page.evaluate(([x, y]) => window.__pad.stick(x * 0.95, y * 0.95), [x, y]); return;
      }
      if (TB[code] && type === 'down') {
        touchBtn[TB[code]] = await page.evaluate((a) => { const b = document.querySelector('.touch-btn[data-action=' + a + ']'); if (!b || b.hidden) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, TB[code]);
        if (!touchBtn[TB[code]]) throw new Error('touch button ' + TB[code] + ' is not on screen at frame ' + f);
      }
      // touch: one CDP event per changed finger, listing that finger (as Puppeteer's touchscreen does)
      const next = touchPoints();
      const nextIds = new Set(next.map((p) => p.id));
      for (const p of active.filter((p) => !nextIds.has(p.id))) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [p] });
      active = active.filter((p) => nextIds.has(p.id));
      for (const p of next) {
        const q = active.find((a) => a.id === p.id);
        if (!q) {
          // a new stick finger lands at the zone's centre, then slides to its direction
          const at = p.id === 1 ? { ...touchBtn.stick, id: 1 } : p;
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at] });
          active.push({ ...at });
        }
        const cur = active.find((a) => a.id === p.id);
        if (cur.x !== p.x || cur.y !== p.y) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] }); cur.x = p.x; cur.y = p.y; }
      }
    };
    // wait until the game's input layer sees what we hold (touch and pad events land asynchronously)
    const PADA = { KeyZ: 'jump', Space: 'jump', KeyV: 'use', KeyI: 'use', KeyC: 'chirp', KeyK: 'chirp', KeyX: 'kick', KeyJ: 'kick', KeyB: 'listen', KeyL: 'listen' };
    const settle = async () => {
      if (mode !== 'touch') return; // keys land synchronously; the pad is read at each step
      const want = {};
      for (const k of ['left', 'right', 'up', 'down', 'jump', 'use', 'chirp', 'kick', 'listen']) want[k] = false;
      for (const k of held) { if (DIRS[k]) want[DIRS[k]] = true; if (PADA[k]) want[PADA[k]] = true; }
      // opposite directions cancel on a stick
      if (mode !== 'pad' && want.left && want.right) { want.left = want.right = false; }
      for (let i = 0; i < 100; i++) {
        const h = await page.evaluate(() => window.__game.held());
        if (Object.keys(want).every((k) => h[k] === want[k])) return;
        await page.waitForTimeout(5);
      }
      throw new Error('input never settled at frame ' + f + ': want ' + JSON.stringify(want) + ' have ' + JSON.stringify(await page.evaluate(() => window.__game.held())) + ' fingers ' + JSON.stringify(active));
    };
    // [playtest] events are pressed on game frames (game.update calls), as the headless sim counts
    // them. A modal the game opens on the way (a trigger's dialog or Ready? card: src/meta-run.js)
    // pauses the sim and releases every key: lift what we hold, close it (Enter for a dialog,
    // Escape for a card or menu), then press the held keys again. tools/sim.mjs models the same.
    const f0 = await page.evaluate(() => window.__game.state().frame);
    let f = 0, modals = 0;
    const advance = async (k, final) => {
      for (let guard = 0; guard < 400; guard++) {
        const r = await page.evaluate(([f0, k]) => {
          for (let n = 0; n < 200000; n++) {
            const m = window.__game.meta(), s = window.__game.state();
            const modal = m && (m.ui || (m.dialog ? 'dialog' : null) || m.story);
            const reached = s.frame - f0 >= k;
            if (modal || reached) return { modal, reached };
            window.__game.step(1);
          }
          return { stuck: true };
        }, [f0, k]);
        if (r.stuck) throw new Error('replay stuck at frame ' + f);
        if (r.modal && !(final && r.reached)) {
          modals++;
          const keep = [...held];
          for (const c of keep) await apply(c, 'up');
          await settle();
          for (let i = 0; i < 60; i++) {
            const open = await page.evaluate(() => { const m = window.__game.meta(); return m ? (m.ui || (m.dialog ? 'dialog' : null) || m.story) : null; });
            if (!open) break;
            const key = open === 'dialog' ? 'Enter' : 'Escape'; // [polish-T] per modal: a rescue card now follows its gecko's lines at once (meta-run handoff)
            await page.keyboard.down(key); await page.evaluate(() => window.__game.step(1)); await page.keyboard.up(key);
            await page.evaluate(() => { const m = window.__game.meta(); if (m && (m.ui || m.dialog || m.story)) window.__game.step(1); });
          }
          for (const c of keep) await apply(c, 'down');
          await settle();
          continue;
        }
        if (r.reached) return;
      }
      throw new Error('too many modals at frame ' + f);
    };
    let pending = false;
    for (const [frame, code, type] of sol.events) {
      if (frame > f) { if (pending) { await settle(); pending = false; } await advance(frame, false); f = frame; }
      else if (frame === f && f > 0 && !pending) await advance(frame, false);
      await apply(code, type);
      pending = true;
    }
    if (pending) await settle();
    await advance(sol.frames, true);
    for (const k of [...held]) await apply(k, 'up');
    const s = await page.evaluate(() => window.__game.state());
    await page.evaluate(() => window.__game.unfreeze());
    return JSON.stringify({ room: s.room, x: Math.round(s.pos.x * 10) / 10, y: Math.round(s.pos.y * 10) / 10, state: s.pstate, health: s.health, items: [...s.items].sort(), rescued: [...s.rescued].sort(), levelComplete: s.levelComplete, frame: s.playFrames });
  }`;
}

// [playtest] A whole-game run recorded from the title (tools/solutions/full-run.mjs): a fresh page
// (storage cleared), frozen, then each key on its step number (steps since the freeze). Played in
// chunks (one run-code each, ending at the run's chapter marks) so progress shows as it goes.
const FULL_INFO = `() => { const s = window.__game.state(), m = window.__game.meta() || {}; return { screen: s.screen, room: s.room, x: s.pos && Math.round(s.pos.x * 10) / 10, y: s.pos && Math.round(s.pos.y * 10) / 10, health: s.health, items: [...(s.items || [])].sort(), rescued: [...(s.rescued || [])].sort(), recruits: [...(s.recruits || [])].sort(), frame: s.frame, playFrames: s.playFrames, won: !!m.won, inCarrier: !!m.inCarrier, crumbs: m.crumbs, completion: m.completion, ui: m.ui || null, story: m.story || null }; }`;
function fullRunChunk(events, from, to, first) {
  return `async page => {
    if (${first}) {
      await page.evaluate(() => localStorage.clear()); await page.reload();
      await page.waitForFunction(() => window.__game && document.fonts.status === 'loaded'); await page.waitForTimeout(500);
      await page.evaluate(() => { window.__game.freeze(); window.__S = 0; });
    }
    const ev = ${JSON.stringify(events)};
    let S = await page.evaluate(() => window.__S);
    const go = (n) => page.evaluate((n) => { for (let i = 0; i < n; i++) window.__game.step(1); window.__S += n; return window.__S; }, n);
    for (const [s, code, type] of ev) { if (s > S) S = await go(s - S); if (type === 'down') await page.keyboard.down(code); else await page.keyboard.up(code); }
    if (${to} > S) S = await go(${to} - S);
    return JSON.stringify(await page.evaluate(${FULL_INFO}));
  }`;
}
function replayFull(sol) {
  const cuts = [...(sol.marks || []).map((m) => m[0]).filter((s) => s > 0 && s < sol.frames), sol.frames].sort((a, b) => a - b);
  let from = 0, last = null;
  const t0 = Date.now();
  for (const to of cuts) {
    if (to <= from) continue;
    const ev = sol.events.filter((e) => e[0] >= from && e[0] < to || (to === sol.frames && e[0] >= from));
    last = result(cli('run-code', fullRunChunk(ev, from, to, from === 0)));
    const mark = (sol.marks || []).find((m) => m[0] === to);
    console.log(`    step ${String(to).padStart(6)} ${(mark ? mark[1] : 'end').padEnd(26)} ${last.room} ${last.screen}${last.ui ? '>' + last.ui : ''}${last.story ? '>' + last.story : ''} rescued ${last.rescued.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    from = to;
  }
  return last;
}

// ---- open the session ----
console.log(`replay: ${files.length} solution(s), mode ${mode}, session ${session}, ${times}x each`);
try { cli('close'); } catch { /* not open */ }
const openArgs = ['open', url];
if (device) openArgs.push('--device', device);
cli(...openArgs);
cli('run-code', 'async page => { await page.waitForFunction(() => window.__game, null, { timeout: 60000 }); }'); // [final-S] the game loads after the title is up
const [w, h] = size.split('x');
cli('resize', w, h);
if (mode.startsWith('pad')) {
  cli('run-code', `async page => { await page.addInitScript(${PAD_INIT}); await page.reload(); }`);
  cli('run-code', 'async page => { await page.waitForFunction(() => window.__game, null, { timeout: 60000 }); }'); // [final-S] the game loads after the title is up
  cli('eval', '() => window.__pad.connect()');
}
if (mode === 'touch') {
  const coarse = result(cli('eval', "() => matchMedia('(pointer: coarse)').matches"));
  if (coarse !== true) throw new Error('touch replay needs a phone session (pointer: coarse)');
}
// past the title (a real key press), so the game is running
cli('press', 'Enter');

let fails = 0;
for (const file of files) {
  const sol = JSON.parse(readFileSync(file, 'utf8'));
  const ends = [];
  for (let i = 0; i < times; i++) {
    const t0 = Date.now();
    const end = sol.start && sol.start.from === 'title' ? replayFull(sol) : result(cli('run-code', replayCode(sol)));
    ends.push(end);
    console.log(`  ${sol.name} run ${i + 1}: ${JSON.stringify(end)} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
  const same = ends.every((e) => JSON.stringify(e) === JSON.stringify(ends[0]));
  const want = sol.endState;
  const matches = want ? JSON.stringify(ends[0]) === JSON.stringify(want) : true;
  const expOk = Object.entries(sol.expect || {}).every(([k, v]) => k === 'items' ? JSON.stringify([...v].sort()) === JSON.stringify(ends[0].items) : ends[0][k] === v);
  const ok = same && matches && expOk;
  if (!ok) { fails++; console.log(`  FAIL ${sol.name}: ${!same ? 'runs differ; ' : ''}${!matches ? 'end differs from the recorded ' + JSON.stringify(want) + '; ' : ''}${!expOk ? 'expectation not met ' + JSON.stringify(sol.expect) : ''}`); }
  else console.log(`  ok   ${sol.name}`);
}
const errs = cli('console', 'error');
const errCount = (errs.match(/Errors: (\d+)/) || [])[1];
console.log(`console errors: ${errCount ?? '?'}`);
if (fails || (errCount && errCount !== '0')) { console.log(`replay: ${fails} failed`); process.exit(1); }
console.log('replay: all passed');
