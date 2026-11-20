#!/usr/bin/env node
// [issue 9] Tutorial notes on the path (design: HUD, Tutorial notes). For every sign in every room:
// its paper note stands on a standable tile (never water or a hazard) at the sign's row or one below,
// clear of the floor props (save cracks, checkpoints, hides, doors, items), inside its own trigger;
// card-only tips have no note. Also runs the scripts that put tips up mid-scene (the tank's cup rim
// and log, Nana's phase hints) and lists them, and lists any tip longer than about 80 characters.
//   node tools/sign-check.mjs                 # the data checks (headless)
//   node tools/sign-check.mjs --wrap [--url http://127.0.0.1:8131/?dev] [--session s]
//       ... plus the 2-line check: every tip set in the HUD card at 667x375 (touch), 14 px, must fit
//       in 2 lines (needs the server and playwright-cli, run from the project root)
//   node tools/sign-check.mjs --list          # every note and where it stands
//   node tools/sign-check.mjs --shots DIR [--url ...] [--only room,room] [--touch]
//       ... [issue 34] a picture of every note's marker at 1280x720 (844x390 with --touch), Pip two
//       tiles off: DIR/<room>_<x>_<y>.png unread, then ..._read.png once its card has been read
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game } from '../game/src/game.js';
import { ZONES } from '../game/data/rooms/index.js';
import { TILE } from '../game/data/movement.js';
import { K } from '../game/src/physics.js';
import { STANDABLE, floorProps, markerSize, markerObstacles, markerHits } from '../game/src/notes.js';
import { TEXT } from '../game/data/text.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const T = TILE;
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) pass++; else { fail++; console.log('  FAIL', label); } };
const KN = Object.fromEntries(Object.entries(K).map(([a, b]) => [b, a]));

const shotList = []; // [issue 34] {room, key, tx, gy, mx, my} for --shots
const tips = new Map(); // text -> where (every tip the game can show)
const addTip = (text, where) => { if (!tips.has(text)) tips.set(text, where); };

// [issue 34] The marker (a "?" badge hovering over the note) sits in open air: no solid tile, hazard or
// water under any part of it (the tail included), and it isn't drawn on a point prop (a hook, crumb, item,
// switch, thermostat, save crack, beacon, light, talker) or a decor prop (notes.js markerObstacles).
const MARK_BLOCK = new Set([K.SOLID, K.SLICK, K.CEREAL, K.CRACK, K.SOIL, K.PROP, K.HAZARD, K.WATER]);
let markers = 0, lowMarkers = [];
// the tank's script notes stay where its script puts them (the log's mouth: the tip is the log): listed, not failed
const tankNote = (cond, label) => { if (!cond) console.log(`  (tank, left in place) ${label}`); };
// the decor art's real width (the game's own guess, notes.js, is 0.8 of its height): read from the WebP header
const webpSize = (file) => {
  try {
    const b = readFileSync(file);
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (kind === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
    if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  } catch { /* no art */ }
  return null;
};
const artAspect = new Map();
const aspectOf = (prop) => {
  if (!artAspect.has(prop)) { const sz = webpSize(path.join(root, 'game', 'assets', prop.includes('/') ? prop : `props/${prop}.webp`)); artAspect.set(prop, sz ? sz[0] / sz[1] : 0.8); }
  return artAspect.get(prop);
};
function markerClear(g, room, s, where, onProp = ok) {
  markers++;
  ok(s.mx != null && s.my != null, `${where}: no marker spot`);
  if (s.my == null) return;
  if (s.mark !== 'hover') lowMarkers.push(`${where}: ${s.mark === 'low' ? 'tucked low (a block above)' : 'under a plank'}`);
  // the disc (touch size, at the top and bottom of its bob) and the tail's tip, in px; tiles and props as their cells
  const { r, bob, tail } = markerSize(s, true);
  const disc = { x0: s.mx - r, x1: s.mx + r, y0: s.my - r - bob, y1: s.my + r + bob };
  const hits = (q, tx, ty) => q.x0 < (tx + 1) * T && q.x1 > tx * T && q.y0 < (ty + 1) * T && q.y1 > ty * T;
  const tip = { x0: s.mx - 1, x1: s.mx + 1, y0: s.my, y1: s.my + r + tail + bob };
  for (let ty = Math.floor(disc.y0 / T); ty <= Math.floor(tip.y1 / T); ty++) for (let tx = Math.floor(disc.x0 / T); tx <= Math.floor(disc.x1 / T); tx++) {
    const k = g.grid.at(tx, ty);
    if (!hits(disc, tx, ty) && !hits(tip, tx, ty)) continue;
    // a one-way plank is drawn along its tile's top: the marker may hang below it
    const plank = k === K.ONEWAY && disc.y0 >= ty * T + 13;
    ok(!MARK_BLOCK.has(k) && !(k === K.ONEWAY && !plank), `${where}: the marker overlaps ${KN[k]} at (${tx},${ty})`);
  }
  const near = markerHits(markerObstacles(room.entities, room.def?.decor), s, (x, y) => g.grid.at(x, y)); // what the note steps aside from (notes.js)
  onProp(!near && !s.markCrowd, `${where}: the marker is drawn on a ${near || s.markCrowd} (no step within its trigger clears it: move the note, nx)`);
  // and against the decor's real width (85% of its art, for the art's margins)
  const wide = (room.def?.decor || []).find((d) => {
    if (!d.prop || d.gecko || (d.h || 1.5) > 4) return false;
    const h = (d.h || 1.5) * T, w = h * aspectOf(d.prop) * 0.85, cx = (d.x + 0.5) * T, by = (d.y + 1) * T;
    return cx - w / 2 < disc.x1 && cx + w / 2 > disc.x0 && by - h < disc.y1 + tail && by > disc.y0;
  });
  onProp(!wide, `${where}: the marker is drawn on the ${wide?.prop} at (${wide?.x},${wide?.y}) (move the note, nx)`);
}

// ---- room signs ----
const newGame = () => new Game(ZONES);
let n = 0, notes = 0, cards = 0, stepped = [];
const g0 = newGame();
for (const room of Object.values(g0.world.rooms)) {
  const defs = room.entities.filter((e) => e.type === 'sign');
  if (!defs.length) continue;
  const g = newGame();
  g.startAt(room.id, undefined, undefined, { party: ['pip'], items: [] });
  const props = floorProps(room.entities);
  for (const e of defs) {
    n++;
    const s = g.signs.find((q) => q.key === `${room.id}:${e.x},${e.y}`);
    const where = `${room.id} (${e.x},${e.y}) "${String(e.text).slice(0, 36)}"`;
    addTip(e.text, where);
    ok(!!s, `${where}: no game sign`);
    if (!s) continue;
    if (s.kind === 'card') { cards++; ok(s.tx == null, `${where}: a card-only tip has no note`); continue; }
    notes++;
    ok(!s.bad, `${where}: the note ${s.bad || ''} (column ${e.nx ?? Math.floor(e.x + (e.w || 4) / 2)})`);
    if (s.bad) continue;
    const k = g.grid.at(s.tx, s.gy);
    ok(STANDABLE.has(k) && k !== K.WATER && k !== K.HAZARD, `${where}: stands on ${KN[k]}`);
    ok(s.gy - e.y >= 0 && s.gy - e.y <= 1, `${where}: drops ${s.gy - e.y} tiles`);
    ok(s.tx >= e.x && s.tx < e.x + (e.w || 4), `${where}: the note (col ${s.tx}) is outside its trigger`);
    const crowd = props.find((p) => s.tx >= p.x0 && s.tx <= p.x1 && p.y1 >= s.gy - 2 && p.y0 <= s.gy);
    ok(!crowd, `${where}: crowds a ${crowd?.type}`);
    const twin = g.signs.find((q) => q !== s && q.kind === 'note' && q.tx === s.tx && q.gy === s.gy);
    ok(!twin, `${where}: shares its tile with another note`);
    markerClear(g, room, s, where);
    shotList.push({ room: room.id, key: s.key, tx: s.tx, gy: s.gy, mx: s.mx, my: s.my, px: [s.tx - 2, s.tx + 2, s.tx].find((x) => x >= 1 && x < room.tw - 1 && g.grid.at(x, s.gy - 1) === K.EMPTY && STANDABLE.has(g.grid.at(x, s.gy))) ?? s.tx });
    if (s.tx !== (e.nx ?? Math.floor(e.x + (e.w || 4) / 2))) stepped.push(`${where}: stepped to col ${s.tx}`);
    if (args.includes('--list')) console.log(`  ${where.padEnd(64)} note col ${s.tx}, ground row ${s.gy} (${KN[k]})`);
  }
}

// ---- script tips (run their scripts) ----
const script = [];
{ // the tank cup: the tongs finish, the rim note flutters down
  const g = newGame(); g.startAt('tank-cup', undefined, undefined, { party: ['pip'], items: [] });
  ok(g.signs.some((q) => q.text === TEXT.opening.tank.tongs), 'the tongs note is up before the tongs finish');
  g.boss.finish();
  ok(!g.signs.some((q) => q.text === TEXT.opening.tank.tongs), 'the tongs note retires when the tongs finish');
  for (const s of g.signs.filter((q) => q.born != null)) script.push(['tank-cup', s]);
}
{ // the sand: Duchess wakes (issue 25): "Hide in the log!" at its mouth
  const g = newGame(); g.startAt('tank-sand', undefined, undefined, { party: ['pip'], items: [] });
  const b = g.boss, l = b.log();
  b.startWake('test'); g.player.x = l.x - 3 * T; g.player.y = l.y + l.h - g.player.h;
  for (let i = 0; i < 3; i++) g.update({ held: {}, pressed: {} });
  for (const s of g.signs.filter((q) => q.born != null)) script.push(['tank-sand', s]);
}
{ // Nana's phase hints: card-only
  const room = Object.values(g0.world.rooms).find((r) => r.entities.some((e) => e.type === 'boss' && e.boss === 'nana'));
  if (room) {
    const g = newGame(); g.startAt(room.id, undefined, undefined, { party: ['pip'], items: [] });
    for (const ph of [1, 2, 3]) { g.boss.setPhase(ph); for (const s of g.signs.filter((q) => q.nana)) script.push([`${room.id} phase ${ph}`, s]); }
  }
}
ok(script.some(([, s]) => s.key === 'opening.tank.rim'), 'the cup rim note is put up');
ok(script.some(([, s]) => s.key === 'opening.tank.hideLog'), 'the "Hide in the log!" note is put up');
ok(script.filter(([, s]) => s.nana).length >= 3, 'Nana has a hint for each phase');
console.log('script tips:');
for (const [where, s] of script) {
  addTip(s.text, `${where} (script ${s.key})`);
  const at = s.kind === 'card' ? 'card only' : s.bad ? `BAD ${s.bad}` : `note col ${s.tx}, ground row ${s.gy}`;
  console.log(`  ${where.padEnd(18)} ${s.kind.padEnd(4)} ${at.padEnd(28)} ${s.text}`);
  if (s.kind === 'note') { ok(!s.bad, `script note ${s.key}: ${s.bad}`); if (!s.bad) markerClear(g0.world.rooms[where] ? (() => { const g = newGame(); g.startAt(where, undefined, undefined, { party: ['pip'], items: [] }); return g; })() : g0, g0.world.rooms[where] || { entities: [] }, s, `${where} (script ${s.key})`, where.startsWith('tank-') ? tankNote : ok); }
  else ok(s.tx == null, `script card ${s.key} has no note`);
}

// ---- length: over ~80 characters is split or rewritten (key caps count as ~3) ----
const shown = (t) => String(t).replace(/\{left\}\s*(?:\/|or)?\s*\{right\}/g, '{mv}').replace(/\{[a-zA-Z]+\}/g, '###');
const long = [...tips].filter(([t]) => shown(t).length > 84);
for (const [t, w] of long) console.log(`  long tip (${shown(t).length}): ${w}: ${t}`);
ok(!long.length, `${long.length} tips are longer than about 80 characters`);

if (stepped.length) { console.log('stepped clear of a floor prop:'); for (const s of stepped) console.log('  ' + s); }
if (lowMarkers.length) { console.log('markers lower than head height:'); for (const s of lowMarkers) console.log('  ' + s); }
console.log(`${markers} markers in open air`);
console.log(`${n} signs (${notes} notes, ${cards} cards), ${script.length} script tips, ${tips.size} distinct tips`);

// ---- the 2-line check in the browser ----
if (args.includes('--wrap')) {
  const url = opt('--url', 'http://127.0.0.1:8131/?dev'), session = opt('--session', 'signcheck');
  const cli = (...a) => execFileSync('playwright-cli', [`-s=${session}`, ...a], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 300000 });
  const PROBE = ['Hop.', 'A probe far longer than any tip may be: '.repeat(6)]; // the line count itself: 1 line, and more than 2
  const texts = [...PROBE, ...tips.keys()];
  const code = `async page => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto(${JSON.stringify(url)});
    await page.waitForFunction(() => window.__game, null, { timeout: 60000 });
    await page.waitForTimeout(600);
    await page.touchscreen.tap(300, 200); await page.waitForTimeout(400);
    await page.evaluate(() => window.__game.goToRoom('bed-carrier'));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__game.avoid());
    await page.waitForTimeout(200);
    const measured = await page.evaluate((texts) => window.__game.tips({ measure: texts }).measured, ${JSON.stringify(texts)});
    // the cup: the tongs card shows; when the tongs finish, the rim note's card takes over within a second, Pip not moving
    await page.evaluate(() => { const R = window.__renderer; if (!R.__sc) { const o = R.draw.bind(R); R.draw = (g, v) => { if (g && g.room) window.__SC = g; return o(g, v); }; R.__sc = 1; } window.__game.goToRoom('tank-cup'); });
    await page.waitForTimeout(1500);
    const before = await page.evaluate(() => window.__game.tips().shown?.key || null);
    await page.evaluate(() => window.__SC.boss.finish());
    const t0 = Date.now(); let after = null;
    while (Date.now() - t0 < 1000) { after = await page.evaluate(() => window.__game.tips().shown?.key || null); if (after === 'opening.tank.rim') break; await page.waitForTimeout(50); }
    return JSON.stringify({ measured, cup: { before, after, ms: Date.now() - t0 } });
  }`;
  try { cli('close'); } catch { /* not open */ }
  cli('open', '--device', 'iPhone 15', url); // a phone held sideways (touch), then 667x375
  let out = '';
  try { out = cli('run-code', code); } finally { try { cli('close'); } catch { /* gone */ } }
  const res = out.split('### Result')[1]?.split('###')[0]?.trim();
  let m = null;
  let cup = null;
  try { const r = JSON.parse(JSON.parse(res)); m = r.measured; cup = r.cup; } catch { console.log(out); }
  ok(cup?.before === 'tank-cup:10,9' && cup?.after === 'opening.tank.rim', `the cup: the tongs card, then the rim card within a second of the tongs finishing (${JSON.stringify(cup)})`);
  ok(!!m, 'the wrap check ran');
  if (m) {
    const [one, many] = m.splice(0, 2);
    ok(one.lines === 1 && many.lines > 2, `the wrap check counts lines (a word: ${one.lines}, a paragraph: ${many.lines})`);
    const worst = Math.max(...m.map((r) => r.lines));
    for (const r of m) ok(r.lines <= 2, `wraps to ${r.lines} lines at 667x375 (${r.width}px wide, ${r.font}): ${tips.get(r.text)}: ${r.text}`);
    console.log(`wrap check: ${m.length} tips at 667x375 touch, the card at most ${m[0]?.max} wide, ${m[0]?.font}; the most lines: ${worst}`);
  }
}

// ---- [issue 34] a picture of every marker ----
if (args.includes('--shots')) {
  const dir = path.resolve(opt('--shots')), url = opt('--url', 'http://127.0.0.1:8131/?dev'), session = opt('--session', 'signshots');
  const only = opt('--only', null)?.split(',');
  const list = shotList.filter((q) => !only || only.includes(q.room));
  const touch = args.includes('--touch');
  const cli = (...a) => execFileSync('playwright-cli', [`-s=${session}`, ...a], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 1800000 });
  const code = `async page => {
    const list = ${JSON.stringify(list)}, dir = ${JSON.stringify(dir)}, touch = ${touch};
    if (!touch) await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(${JSON.stringify(url)});
    await page.waitForFunction(() => window.__game && document.fonts.status === 'loaded', null, { timeout: 60000 });
    await page.waitForTimeout(600);
    if (touch) await page.touchscreen.tap(300, 200); else await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    const out = [];
    const shot = async (q, name) => {
      const at = await page.evaluate((q) => { const c = window.__game.camera(), r = document.querySelector('canvas').getBoundingClientRect(), k = r.width / 1280;
        return { x: r.left + (q.mx - c.x) * c.zoom * k, y: r.top + (q.my - c.y) * c.zoom * k, vw: innerWidth, vh: innerHeight }; }, q);
      const w = touch ? 300 : 420, h = touch ? 190 : 260;
      const x = Math.max(0, Math.min(at.vw - w, at.x - w / 2)), y = Math.max(0, Math.min(at.vh - h, at.y - h * 0.55));
      await page.screenshot({ path: dir + '/' + name + '.png', clip: { x, y, width: w, height: h } });
      return { x: Math.round(at.x), y: Math.round(at.y), onScreen: at.x > 0 && at.x < at.vw && at.y > 0 && at.y < at.vh };
    };
    for (const q of list) {
      await page.evaluate((q) => window.__game.goToRoom(q.room, { x: q.px, y: q.gy - 1 }), q);
      await page.waitForTimeout(700);
      const base = q.room + '_' + q.key.split(':')[1].replace(',', '_');
      const a = await shot(q, base);
      await page.waitForTimeout(2600); // the card shows (Pip is in range) and is read after 1.5 s
      const n = await page.evaluate((key) => window.__game.tips().notes.find((s) => s.key === key), q.key);
      await page.evaluate((q) => window.__game.goToRoom(q.room, { x: q.px, y: q.gy - 1 }), q);
      await page.waitForTimeout(300);
      const b = await shot(q, base + '_read');
      out.push({ key: q.key, unread: a, read: b, wasRead: !!n?.read });
    }
    return JSON.stringify(out);
  }`;
  try { cli('close'); } catch { /* not open */ }
  if (touch) cli('open', '--device', 'iPhone 15', url); else cli('open', url);
  if (touch) cli('resize', '844', '390');
  let out = '';
  try { out = cli('run-code', code); } finally { try { cli('close'); } catch { /* gone */ } }
  const res = out.split('### Result')[1]?.split('###')[0]?.trim();
  let r = null;
  try { r = JSON.parse(JSON.parse(res)); } catch { console.log(out.slice(0, 3000)); }
  ok(!!r && r.length === list.length, `shots: ${r?.length} of ${list.length} markers`);
  for (const q of r || []) {
    ok(q.unread.onScreen, `shots: ${q.key}: the marker is off screen (${q.unread.x},${q.unread.y})`);
    if (!q.wasRead) console.log(`  shots: ${q.key}: not read yet in its read picture (Pip didn't stay in range: a dialog, a drop)`);
  }
  console.log(`shots: ${r?.length || 0} markers (unread and read) in ${dir}`);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
