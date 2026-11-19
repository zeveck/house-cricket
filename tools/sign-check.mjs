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
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game } from '../game/src/game.js';
import { ZONES } from '../game/data/rooms/index.js';
import { TILE } from '../game/data/movement.js';
import { K } from '../game/src/physics.js';
import { STANDABLE, floorProps } from '../game/src/notes.js';
import { TEXT } from '../game/data/text.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const T = TILE;
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) pass++; else { fail++; console.log('  FAIL', label); } };
const KN = Object.fromEntries(Object.entries(K).map(([a, b]) => [b, a]));

const tips = new Map(); // text -> where (every tip the game can show)
const addTip = (text, where) => { if (!tips.has(text)) tips.set(text, where); };

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
  if (s.kind === 'note') ok(!s.bad, `script note ${s.key}: ${s.bad}`);
  else ok(s.tx == null, `script card ${s.key} has no note`);
}

// ---- length: over ~80 characters is split or rewritten (key caps count as ~3) ----
const shown = (t) => String(t).replace(/\{left\}\s*(?:\/|or)?\s*\{right\}/g, '{mv}').replace(/\{[a-zA-Z]+\}/g, '###');
const long = [...tips].filter(([t]) => shown(t).length > 84);
for (const [t, w] of long) console.log(`  long tip (${shown(t).length}): ${w}: ${t}`);
ok(!long.length, `${long.length} tips are longer than about 80 characters`);

if (stepped.length) { console.log('stepped clear of a floor prop:'); for (const s of stepped) console.log('  ' + s); }
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

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
