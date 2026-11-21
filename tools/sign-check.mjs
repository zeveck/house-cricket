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
//   node tools/sign-check.mjs --floats        # [issue 40] every decor and floor prop and what holds it up
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
import { STANDABLE, BLOCK_KINDS, flagMount, floorProps, markerSize, markerObstacles, markerHits, NOTE, newArm, armStep, armAllows } from '../game/src/notes.js';
import { TEXT } from '../game/data/text.js';
import { LOOK } from '../game/data/look/index.js';

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

// ---- [issue 29] showing a note again (notes.js newArm/armStep/armAllows, the rule ui.js updateTips runs) ----
{
  const s = { key: 'r:1,1' }, signs = [s];
  let inStay = true;
  const stay = () => inStay, arm = newArm();
  ok(armAllows(arm, s, 0, false, false), 're-show: a note never shown may show');
  armStep(arm, signs, stay, s.key); // its card is up
  armStep(arm, signs, stay, null);  // the card went (a script card took over), he's still by it
  ok(!armAllows(arm, s, 10, false, true), 're-show: not while he lingers beside it');
  ok(!armAllows(arm, s, 11, true, false), 're-show: not under it while moving or in the air');
  let f = 20, shown = -1;
  for (; f < 80 && shown < 0; f++) if (armAllows(arm, s, f, true, true)) shown = f;
  ok(shown - 20 === NOTE.restand, `re-show: standing still under its marker shows it after ${NOTE.restand} frames (${shown - 20})`);
  armStep(arm, signs, stay, s.key); armStep(arm, signs, stay, null);
  ok(!armAllows(arm, s, 200, true, true), '... once: not again on the next frame he stands there');
  inStay = false; armStep(arm, signs, stay, null); inStay = true;
  ok(armAllows(arm, s, 201, false, false), 're-show: he left (out of its stay range) and came back: it may show');
}

// ---- [issue 40] nothing that just sits there floats ----
// Every decor prop (the rooms' and data/look's) and every point prop drawn standing on the floor rests on a
// surface: a solid tile or a one-way top under its middle or under half its width, its bottom within 0.15 tile
// above that top or sunk into it a little (a third of a tile in front of the platforms; behind them, where the
// platform hides it, up to half its height or a tile). The box is the art's real size (its WebP: the props are
// trimmed to their paint, so the picture's bottom is the thing's bottom), turned by its rot about its foot as
// render.js drawProp turns it. A back-layer prop whose foot is behind a block is hidden there (the block's top
// is what shows). A thing on a wall or hanging from something visible is allowed only by the lists below, each
// with its reason. A checkpoint's flag is held as render.js draws it (notes.js flagMount).
//   node tools/sign-check.mjs --floats   lists every decor and point prop with what holds it up
{
  const REST = STANDABLE;
  // fixed to a wall or a block's face, whatever is under them
  const ON_WALL = {
    'drawer-pull': 'a drawer handle, on the drawer front', hook: 'a screw-in cup hook, in the wall', 'smoke-alarm-wall': 'screwed to the wall',
    'thermostat-lock': 'a thermostat, on the wall', pin: 'a push pin, stuck in the wall', 'furnace-grate': 'a vent grate, in the wall',
    'dryer-vent': 'a vent, in the wall', 'spice-rack': 'a spice rack, on the wall', 'mister-nozzle': 'the tank mister, clipped to the glass',
    'faucet-handle': 'a tap, on the wall', 'sound-hole': 'a hole in the wall', 'steam-vent': 'a vent, in the wall',
  };
  // hanging: the top must be within half a tile of a solid tile or a one-way edge above (a ceiling, a shelf, a rafter)
  const HANGS = { 'pull-chain': 'a pull chain, from the ceiling', 'mesh-lid': 'a mesh vent cover, on the ceiling', 'sprites/npcs/velvet.webp': 'a moth asleep under a rafter' };
  // never resting by nature
  const AIRBORNE = { 'steam-puff': 'a puff of steam' };
  // single spots, 'room prop@x,y': why
  const SPOT = {
    'dragon-lair pull-chain@76,7': 'the chain of the hanging lamp (the light entity draws the shade on it)',
    'hall-top pull-chain@38,3': 'hangs from the light fixture painted on the hall ceiling (the hall opens upward there)',
  };
  // point props drawn standing on their tile's floor (main.js drawMetaWorld, render.js, mech-draw.js); hooks,
  // thermostats, switches, sound holes and lights are on walls and ceilings; springs and pianos are platforms
  // themselves (mechanics.js makes their row solid). A secret inside a breakable tile (cereal, a crack) waits there.
  const FLOOR_PROPS = new Set(['crumbs', 'secret', 'item', 'save', 'cage', 'npc', 'duet', 'push']);
  let checked = 0, held = 0;
  const floats = [], said = (where, why) => { held++; if (args.includes('--floats')) console.log(`  ${where}: ${why}`); };
  for (const room of Object.values(g0.world.rooms)) {
    if (room.zone?.n === 98) continue; // entity-test's fixture rooms
    const at = (x, y) => (x < 0 || x >= room.tw || y < 0 ? K.EMPTY : y >= room.th ? K.SOLID : room.base[y * room.tw + x]);
    const rests = (x0, x1, yb, sink) => { // tiles: left, right, bottom; the top it rests on, or null
      const cx = Math.floor((x0 + x1) / 2), wd = x1 - x0;
      for (let t = Math.ceil(yb - sink - 1e-6); t <= Math.floor(yb + 0.15); t++) {
        let sup = 0;
        for (let tx = Math.floor(x0); tx <= Math.floor(x1 - 1e-6); tx++) if (REST.has(at(tx, t))) sup += Math.min(tx + 1, x1) - Math.max(tx, x0);
        if ((REST.has(at(cx, t)) || sup >= wd / 2) && !REST.has(at(cx, t - 1))) return t;
      }
      return null;
    };
    for (const d of [...(room.def.decor || []), ...(LOOK[room.id]?.decor || [])]) {
      if (!d.prop || d.gecko) continue;
      checked++;
      const where = `${room.id} ${d.prop}@${d.x},${d.y}`, layer = d.layer || 'back';
      const h = d.h || 1.5, w = h * aspectOf(d.prop), fx = d.x + 0.5, fy = d.y + 1, r = d.rot || 0;
      // the turned box about the foot (fx, fy)
      const cs = [[-w / 2, -h], [w / 2, -h], [-w / 2, 0], [w / 2, 0]].map(([x, y]) => [fx + x * Math.cos(r) - y * Math.sin(r), fy + x * Math.sin(r) + y * Math.cos(r)]);
      const x0 = Math.min(...cs.map((c) => c[0])), x1 = Math.max(...cs.map((c) => c[0])), top = Math.min(...cs.map((c) => c[1])), yb = Math.max(...cs.map((c) => c[1]));
      const cx = Math.floor((x0 + x1) / 2);
      if (SPOT[where]) { said(where, SPOT[where]); continue; }
      if (AIRBORNE[d.prop]) { said(where, AIRBORNE[d.prop]); continue; }
      if (ON_WALL[d.prop]) { said(where, ON_WALL[d.prop]); continue; }
      if (layer === 'back' && BLOCK_KINDS.has(at(cx, Math.floor(yb - 0.5)))) { said(where, 'its foot is behind a block'); continue; }
      const t = rests(x0, x1, yb, layer === 'back' ? Math.min(h / 2, 1) : 0.34);
      if (t != null) { said(where, `on the ${KN[at(cx, t)]} top of row ${t}`); continue; }
      if (HANGS[d.prop]) {
        if ([Math.floor(top - 0.5), Math.floor(top)].some((ty) => REST.has(at(cx, ty)))) { said(where, HANGS[d.prop]); continue; }
        floats.push(`${where} (h ${h}): hangs from nothing (its top, row ${top.toFixed(1)}, is not within half a tile of a ceiling or edge)`); continue;
      }
      let nt = Math.ceil(yb); while (nt < room.th && nt - yb < 6 && !REST.has(at(cx, nt))) nt++;
      floats.push(`${where} (h ${h}, ${layer}${r ? `, rot ${r}` : ''}): nothing under it (${nt - yb >= 6 ? 'no top within 6 rows' : `the next top is row ${nt}, ${(nt - yb).toFixed(2)} below`})`);
    }
    for (const e of room.entities) {
      if (!FLOOR_PROPS.has(e.type) && e.type !== 'checkpoint') continue;
      checked++;
      const where = `${room.id} ${e.type}@${e.x},${e.y}`;
      if (SPOT[where]) { said(where, SPOT[where]); continue; }
      if (e.type === 'checkpoint') {
        const m = flagMount(at, e.x, e.y);
        if (m) said(where, `the flag's ${m.kind}`); else floats.push(`${where}: the flag has no floor, wall or ceiling near it`);
        continue;
      }
      if (e.type === 'secret' && (at(e.x, e.y) === K.CEREAL || at(e.x, e.y) === K.CRACK)) { said(where, 'inside a breakable tile'); continue; }
      const w = e.w || 1, yb = e.y + (e.type === 'push' ? e.h || 1 : 1);
      const t = rests(e.x, e.x + w, yb, 0.34);
      if (t != null) said(where, `on row ${t}`); else floats.push(`${where}: nothing under it`);
    }
  }
  for (const f of floats) console.log(`  FLOATS ${f}`);
  ok(!floats.length, `${floats.length} props float (nothing under them, nothing they hang from): put each on a surface, or list why above`);
  console.log(`${checked} decor and floor props: ${held} rest on something`);
}

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
