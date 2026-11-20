// Boot, the loop (rAF + fixed 60 Hz steps = the game clock), screens, freeze/step for tests,
// and the debug hook window.__game.
import { FPS } from '../data/movement.js';
import { CRICKETS } from '../data/crickets.js';
import { ITEMS, USE_ITEMS } from '../data/items.js';
import { ZONES } from '../data/rooms/index.js';
import { ZONE_INFO } from '../data/zones.js';
import { Game } from './game.js';
import { Input, attachKeyboard, attachTouch } from './input.js';
import { Renderer } from './render.js';
import { UI } from './ui.js';
import * as S from './sprites.js';
import * as Save from './save.js';
import * as Audio from './audio.js';
import * as Screens from './menus/screens.js';
import * as Meta from './meta.js';
import { Dialog } from './dialog.js';
import { Story } from './story.js';
import { Hub, HUB_ZONE, hubRoomFor, isHubRoom } from './hub.js';
import { MetaRun } from './meta-run.js';
import { setupFeedback } from './feedback.js';
import { line } from './lines.js';
import { tempAt, beaconSpec, measure, route } from './beacon.js';
import { noteLive } from './notes.js'; // [issue 9]
import * as Ear from './ear.js'; // [issue 10] the ear guide (pure display state, kept out of the game)
import * as HOUSE from '../data/house.js';
import { ASSET_FILES as ASSET_LIST } from '../data/assets.js';
import { drawMech } from './mech-draw.js'; // [mech] engine mechanics drawing
import { ArtGate } from './room-art.js'; // [art] a room shows once its art is in (issue #5)
import { Rewinder, BACK } from './rewind.js'; // [issue 11] debug: Backspace rewinds about 5 s
import { zoneSfx, SONG_SFX } from './zone-sfx.js'; // [issue 14] a zone's sound effects load with its art

const STEP_MS = 1000 / FPS;
const PAUSE_TABS = new Set(['pause', 'map', 'crickets', 'sounds']); // [final-S] the pause menu's own tabs
const stage = document.getElementById('stage');
const canvas = document.getElementById('view');
const input = new Input();
const renderer = new Renderer(canvas);
renderer.drawMech = drawMech; // [mech] render.js calls it after the enemies
const gate = new ArtGate(); // [art] loads each room's art before it shows, then its neighbours'
gate.onZones = (zones) => { for (const z of zones) Audio.needSfx(zoneSfx(z)); }; // [issue 14] and their zones' sound effects
Audio.warm('title'); // [issue 14] music first: the title track, then the effects every room uses
window.__gate = { info: () => gate.info() }; // read-only
const ui = new UI(document.getElementById('overlay'), input);
const settings = Save.loadSettings();
Audio.configure(settings, Save.saveSettings); ui.muted = settings.muted; // [audio] volumes, mute, beacon options (persisted)

let game = null;
let screen = 'title';       // title | play
let paused = false;
let frozen = false;
let slot = 1;
let titleReady = !!window.__bootPressed; // "Press any key or button" until the first press ([final-S] a press while the game loaded counts)
window.__bootDone?.();
let padNote = '';
const frameLog = [];
// [issue 11] Debug rewind: Backspace in play jumps back about 5 s (src/rewind.js). On only with
// ?rewind in the URL (not ?dev, not localhost: replays and local playtests run the players' game).
// Off, Backspace is only the menus' Back, as before.
const REWIND = (() => { const q = new URLSearchParams(location.search); return q.has('rewind') && q.get('rewind') !== '0'; })();
const rewinder = REWIND ? new Rewinder() : null;
let rewindCue = null, rewindCueT = 0;
// [issue 10] ?earlost=N (seconds) shortens the ear guide's 60 s lost timer, for browser checks.
const EAR_LOST = (() => { const q = new URLSearchParams(location.search); const v = Number(q.get('earlost')); return q.has('earlost') && v > 0 ? Math.round(v * FPS) : null; })();
// [issue 9] the tutorial notes read in this save slot ('room:x,y'; a script tip by its text id). Never part of the
// game (a rewind or a replay doesn't touch it); saved with the slot, reset with a new one.
const tipsRead = ui.tipsRead;
const slotData = (gm) => Save.fromGame(gm, tipsRead);
function loadTips(d) { tipsRead.clear(); for (const k of (d && Array.isArray(d.tipsRead) ? d.tipsRead : [])) tipsRead.add(k); }
let heldOver = null; // [issue 16] 'story' | 'title': that screen stays up while the room after it loads (foldIntoStory, continueGame)

function newGameObject() {
  const g = new Game([...ZONES, HUB_ZONE], { onSave: (gm) => { Save.writeSlot(slot, slotData(gm)); } }); // [meta] + the Carrier's rooms
  g.camera.touchBias = isTouch; g.camera.zoom = phoneZoom(); g.camera.hFrac = viewFrac; // [final-G] hFrac
  g.camera.game = g; g.camera.avoid = avoidRects; // [polish-V] arena framing reads game.boss; the HUD/button rects
  Meta.ensure(g); g.gentle = !!settings.gentle; // [meta] crumbs, secrets, arrivals...; Gentle Mode for bosses
  g.homeCrack = Meta.homeCrack(g.world); g.returnCrack = null; // [final-S] the Carrier's way out when nothing else is known
  return g;
}

// ---- sizes ----
let isTouch = matchMedia('(pointer: coarse)').matches;
function phoneZoom() { return isTouch && Math.min(innerWidth, innerHeight) < 500 ? 1.1 : 1; } // [final-G] 1.1 on top of filling the width (~1.2x the letterboxed view)
let viewFrac = 1; // [final-G] a touch screen wider than 16:9 is filled edge to edge: the view shows 1280 x (720 * viewFrac)
function resize() {
  const vw = innerWidth, vh = innerHeight;
  const fill = isTouch && vw / vh > 16 / 9; // [final-G]
  const w = fill ? vw : Math.min(vw, (vh * 16) / 9), hh = fill ? vh : (w * 9) / 16;
  viewFrac = fill ? (hh / w) * (16 / 9) : 1; // [final-G]
  stage.style.width = w + 'px'; stage.style.height = hh + 'px';
  stage.style.setProperty('--ui', Math.max(0.75, Math.min(1.4, hh / 600)).toFixed(3));
  renderer.resize(w, hh, Math.min(devicePixelRatio || 1, 3));
  if (game) { game.camera.zoom = phoneZoom(); game.camera.hFrac = viewFrac; } // [final-G]
  // [final-S] a phone turned to portrait shows the rotate note (CSS): pause the game under it
  if (matchMedia('(orientation: portrait) and (pointer: coarse)').matches && screen === 'play' && !ui.screen && !story.active && !frozen) pause();
}
// [polish-V] the HUD and thumb-button rects as fractions of the stage (the camera keeps the cricket clear of
// them; the beacon ear stays out of them). The buttons count as one block (Use appears in its gap).
let avoidRects = [], avoidAt = -1e9;
function measureAvoid() {
  const sr = stage.getBoundingClientRect(); if (!sr.width || !sr.height) return avoidRects;
  const out = [], fr = (r, kind) => { if (r && r.width > 0 && r.height > 0) out.push({ kind, x0: (r.left - sr.left) / sr.width, y0: (r.top - sr.top) / sr.height, x1: (r.right - sr.left) / sr.width, y1: (r.bottom - sr.top) / sr.height }); };
  for (const sel of ['.hud .hud-left .hud-row', '.hud .hud-left .trio', '.hud .hud-right', '.hud .crumbs'] /* [issue 3] the crumbs sit under the icon row on phones */) for (const e of document.querySelectorAll(sel)) fr(e.getBoundingClientRect(), 'hud');
  if (isTouch && document.querySelector('.touch-layer.on')) {
    let u = null;
    for (const b of document.querySelectorAll('.touch-layer .touch-btn')) { const r = b.getBoundingClientRect(); if (!r.width) continue; u = u ? { left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) } : { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; }
    if (u) fr({ ...u, width: u.right - u.left, height: u.bottom - u.top }, 'btn');
  }
  avoidRects = out; avoidAt = performance.now();
  if (game) game.camera.avoid = out;
  ui.avoid = out; ui._indW = 0; // [polish-V] the ear re-measures its size
  ui.layoutTips(); // [issue 9] the tip card's width: the space between the HUD columns
  return out;
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 100));

// ---- input wiring ----
attachKeyboard(input, window);
const touch = attachTouch(input, document.body); // full viewport: buttons may sit over the letterbox bars
function enableTouch() { isTouch = true; input.touchUI = true; /* [polish-T] input.scheme() */ if (input.last === 'keyboard' && !input.keys.size) input.last = 'touch'; document.body.classList.add('touch'); touch.show(screen === 'play' && !paused); if (game) { game.camera.touchBias = true; game.camera.zoom = phoneZoom(); } setTimeout(resize, 0); } // [final-G] resize: fill a wide touch screen
if (isTouch) enableTouch();
addEventListener('touchstart', () => { if (!document.body.classList.contains('touch')) enableTouch(); }, { passive: true });
input.onAny = (src) => {
  Audio.unlock();
  if (src === 'keyboard') document.body.classList.remove('pad');
  if (src === 'gamepad') document.body.classList.add('pad');
};
addEventListener('gamepadconnected', () => { input.padConnected = true; padNote = ''; });
addEventListener('gamepaddisconnected', () => {
  input.padConnected = false;
  if (screen === 'play' && !ui.screen && !story.active) pause('Controller disconnected');
});
document.addEventListener('visibilitychange', () => { if (document.hidden && screen === 'play' && !ui.screen && !frozen) pause(); });
addEventListener('blur', () => { if (screen === 'play' && !ui.screen && !frozen && !fbk.isOpen()) pause(); });

ui.handlers = {
  pause: () => { if (screen === 'play' && !dialog.active && !story.active) (ui.screen ? resume() : pause()); },
  map: () => { if (screen === 'play' && !dialog.active && !story.active) { if (ui.screen === 'map') resume(); else if (ui.screen) { if (PAUSE_TABS.has(ui.screen)) Screens.pause(A, 'map'); } else pause(null, 'map'); } }, // [final-S] not from a card
  promptTap: () => { if (game?.inCarrier) hub.tapPrompt(); else if (game) { input._press(['up'], 'touch'); input._release(['up']); } },
  crumbHint: (text) => { if (screen === 'play' && game) game.toast(text, 180); },
  mute: () => toggleMute(),
  // [issue 10] the ear: a click does what the ear's state at the press says (Ear.clickAction): pin a
  // resting ear out, rest a pinned one, dismiss one that came out on its own; [issue 3] a double click
  // flips auto-chirp (Settings > Beacon chirps: Always <-> When I call; Off goes to Always)
  earAction: () => (earLive() && earShow ? Ear.clickAction(ear, Ear.earMode(settings)) : null),
  earClick: (act) => earClick(act),
  earAuto: () => {
    if (!earLive()) return;
    const on = settings.beaconChirps !== 'always';
    A.setSetting('beaconChirps', on ? 'always' : 'call');
    game.toast(on ? 'Auto-chirp on: the trapped cricket chirps by itself.' : 'Auto-chirp off: it chirps back when you call.', 150);
  },
  swapTo: (i) => { if (game && i !== game.player.active) game.player.queuedSwap = i; },
};
const earLive = () => screen === 'play' && !!game && !ui.screen && !story.active;
function earClick(act) {
  if (!earLive() || !earShow || !act) return;
  const dbl = line(settings.beaconChirps === 'always' ? 'ui.earDblCall' : 'ui.earDblAuto');
  if (act === 'pin') { A.setSetting('ear', 'always'); if (!settings.earTold) A.setSetting('earTold', true); game.toast(line('ui.earPinned', { dbl }), 210); }
  else if (act === 'rest') {
    if (settings.beaconChirps === 'off' && settings.ear === 'helps') game.toast(line('ui.earStaysOut'), 180); // Off: "When it helps" counts as "Always out"
    else { A.setSetting('ear', 'helps'); ear = Ear.restart(ear, earDist); game.toast(line('ui.earResting', { dbl }), 210); }
  } else if (act === 'dismiss') { ear = Ear.dismiss(ear, earDist, earAnswerAt); game.toast(line('ui.earDismissed'), 180); }
}
function toggleMute() { settings.muted = !settings.muted; Audio.setMuted(settings.muted); ui.muted = settings.muted; Save.saveSettings(settings); }

// ---- screens (meta and UI: src/menus/screens.js, story.js, dialog.js, hub.js, meta-run.js) ----
const overlayEl = document.getElementById('overlay');
const dialog = new Dialog(overlayEl, { settings, ui, onOpen: () => { touch.show(false); input.releaseAll(); }, onClose: () => { if (screen === 'play' && !ui.screen && !story.active) touch.show(isTouch); } });
const story = new Story(overlayEl, { ui });
const fbk = setupFeedback({ canvas, input, getState: () => window.__game.state(), pause: () => { if (screen === 'play' && !ui.screen) pause(); } });
const house = HOUSE; // data/house.js: the dollhouse (room cells, the Carrier's room)
const hub = new Hub({
  ui,
  onFacility: (kind, owner) => { openModal(); Screens.facility(A, kind, owner); },
  onCrack: () => { openModal(); Save.writeSlot(slot, slotData(game)); Audio.play('save-crack'); Screens.hubCrack(A); },
  onSing: () => carrierSings(),
  sfx: (n) => A.sfx(n),
  toast: (t) => game && game.toast(t, 180),
});
// The app context every screen gets.
const A = {
  get game() { return game; }, ui, input, settings, Save, story, dialog, hub,
  get slot() { return slot; }, get titleReady() { return titleReady; }, get house() { return house; },
  pauseMsg: null, mapMode: 'zone',
  padNote: () => padNote,
  sfx: (n) => { try { Audio.play(n); } catch { /* not loaded */ } },
  toast: (t) => game && game.toast(t, 150),
  setSetting: (k, v) => { if (Audio.setSetting) Audio.setSetting(k, v); else { settings[k] = v; Save.saveSettings(settings); } if (k === 'gentle' && game) game.gentle = v; },
  setMuted: (v) => { settings.muted = v; Audio.setMuted(v); ui.muted = v; Save.saveSettings(settings); },
  showReport: () => fbk.showReport(),
  openReport: () => fbk.open(),
  resume: () => resume(),
  backToEntrance: () => { resume(); if (game && !game.inCarrier) game.backToEntrance(); }, // [final-S] Pause > Back to room entrance (free)
  newGame: (n) => newGame(n),
  continueGame: (e) => continueGame(e),
  quitToTitle: () => quitToTitle(),
  credits: (back) => { ui.closeMenu(); story.credits({ onDone: back }); },
  playSong: (id) => { try { Audio.play(SONG_SFX[id] || ({ beep: 'alarm' })[id] || id, { bus: 'sfx', seed: 'book:' + id }); } catch { /* not loaded */ } },
  warmSongs: (ids) => Audio.needSfx(ids.map((id) => SONG_SFX[id]).filter(Boolean)), // [issue 14] the song book's recorded voices, as it opens
  playMusic: (name) => { try { Audio.music?.(name); } catch { /* ignore */ } },
  dialogSay: (lines, onDone) => { ui.closeMenu(); dialog.open(lines, { onDone: () => { onDone && onDone(); if (!metaRun.handoff()) afterModal(); } }); }, // [polish-T] handoff: the next screen opens as the dialog closes
  here: () => (game ? { room: game.room.id, tx: Math.floor(game.player.cx / 40), ty: Math.floor((game.player.y + game.player.h - 1) / 40) } : null),
  autosave: () => { if (game && !frozen) Save.writeSlot(slot, slotData(game)); },
  applyUpgrades: () => applyUpgrades(),
  indicator: () => (Audio.indicator && game ? Audio.indicator(game) : null),
  goCarrier: (crack) => goCarrier(crack),
  leaveCarrier: () => leaveCarrier(),
  travel: (crack) => travel(crack),
  enterLair: (door) => enterLair(door),
  zoneComplete: (id) => { openModal(); Screens.zoneComplete(A, id); },
  lairReady: (door) => { openModal(); Screens.lairReady(A, door); },
  crackMenu: () => { openModal(); Screens.crackMenu(A); },
  storyEvent: (name, d) => storyEvent(name, d),
  artAhead: (id) => { const r = game?.world.rooms[id]; if (r) gate.ahead(game, r, { zone: false, nbs: false, front: true }); }, // [issue 16] a Post destination in focus
  warmOpening: () => { const p = line('opening.panels')?.[0]?.img; if (p && !warmOpening.img) { const im = new Image(); im.src = 'assets/' + p; warmOpening.img = im; } }, // [issue 16]
};
const warmOpening = {};
const metaRun = new MetaRun(A);
// a tap or click counts as "any key" on the title, and as the first input for sound
overlayEl.addEventListener('pointerdown', () => {
  Audio.unlock();
  if (screen === 'title' && !titleReady && !story.active) { titleReady = true; setTimeout(showTitle, 0); }
});

// [final-2] on touch (or with a mouse) a tap anywhere on the game advances the dialog, not only on its box
stage.addEventListener('pointerdown', () => { if (dialog.active && !ui.screen && !story.active) dialog.tapped = true; });
function openModal() { touch.show(false); input.releaseAll(); }
function afterModal() { if (screen === 'play' && !ui.screen && !dialog.active && !story.active) { touch.show(isTouch); fbk.clearShot(); } }
function showTitle() {
  screen = 'title'; paused = false;
  ui.showHUD(false); touch.show(false); hub.active = false;
  Screens.title(A);
  warmTitle();
}
// [issue 16] While the title is up, load what the next minute needs (room-art.js gate.ahead): the
// Continue save's room, its zone's critical art and its neighbours (read from the save now), then
// the new game's: the tank's first room, the tank's critical art, the first Bedroom room; and the
// HUD's portraits. The lists are worked out on stand-in games set up as Continue / New Game will.
let warmedFor = null;
function warmTitle() {
  const latest = Save.latestSlot(), key = latest ? `${latest.n}:${latest.data.savedAt}` : 'new';
  if (warmedFor === key) return;
  warmedFor = key;
  const hud = (g) => g.player.trio.map((id) => `sprites/crickets/${id}/portrait.webp`);
  try {
    if (latest) {
      const g = newGameObject();
      Save.intoGame(g, latest.data); Meta.ensure(g);
      gate.ahead(g, g.room, { files: hud(g) });
    }
    const tank = ZONES.find((z) => z.n === 0), bed = ZONES.find((z) => z.n === 1);
    const first = tank || bed || ZONES[0], g = newGameObject();
    g.startAt(first.start.room, undefined, undefined, { party: ['pip'], items: [] });
    gate.ahead(g, g.room, { files: hud(g) });
    if (bed && bed !== first) gate.ahead(g, g.world.rooms[bed.start.room], { zone: false, nbs: false });
    gate.ahead(null, null, { files: ['ui/panel.webp'] }); // the dialog box and the map (big: last)
  } catch (e) { console.warn('[art] title preload', e); }
}
// [issue 16] A story just ended into play: if the room's art is still loading, its last panel stays
// up (story.holdOpen) until it's in, instead of the ink cover (tick releases it); then the fade.
function releaseHeld() {
  if (heldOver === 'story') story.release();
  else if (heldOver === 'title') { ui.titleArt.classList.remove('leaving'); if (screen === 'play') { ui.showTitleArt(false); ui.showHUD(true); touch.show(isTouch); } }
  heldOver = null;
}
function foldIntoStory() {
  game.trans = { f: 0, dur: 24, kind: 'fade' }; // the panel -> game fade (visual only)
  if (gate.check(game)) { story.holdOpen(true); heldOver = 'story'; } // calm: no "next / skip all" hints while it waits
}
function newGame(n) {
  slot = n;
  A.playMusic(null); // [final-S] drop a music override (the Carrier, Nana's finale) left by the last game
  Save.clearSlot(n);
  loadTips(null); // [issue 9] a new slot starts with no notes read
  game = newGameObject();
  metaRun.reset();
  ui.closeMenu(); ui.showTitleArt(false);
  screen = 'play'; paused = false; ui.showHUD(false); touch.show(false);
  const tank = ZONES.find((z) => z.n === 0);
  const first = tank || ZONES.find((z) => z.n === 1) || ZONES.find((z) => z.n === 99) || ZONES[0];
  game.startAt(first.start.room, undefined, undefined, { party: ['pip'], items: [] });
  const bed = ZONES.find((z) => z.n === 1); // [art] the tank doesn't link to the Bedroom: load its first room during the panels too
  if (bed && bed !== first) gate.prefetch([game.world.rooms[bed.start.room]]);
  story.play(line('opening.panels'), { id: 'opening', onDone: (skipped) => startTank(skipped) });
}
// After panels 1-3: the playable tank escape (zone 0) if it's built; it ends with
// game.emit('story', {name: 'tankEscaped'}). Without it, straight on to panel 4.
function startTank(skipped) {
  const tank = ZONES.find((z) => z.n === 0);
  if (!tank) { afterEscape(skipped); return; }
  game.startAt(tank.start.room, undefined, undefined, { party: ['pip'], items: [] });
  game.meta.flags.inTank = true;
  startPlay();
  foldIntoStory(); // [issue 16]
}
function afterEscape(skipPanel) {
  ui.showHUD(false); touch.show(false);
  const begin = () => {
    const first = ZONES.find((z) => z.n === 1) || ZONES.find((z) => z.n === 99) || ZONES[0];
    const keep = game.meta; keep.flags.inTank = false; keep.opened = true;
    game.startAt(first.start.room, undefined, undefined, { party: ['pip'], items: [] });
    startPlay();
    foldIntoStory(); // [issue 16]
    game.toast(line('opening.home'), 240);
    game.meta.flags.firstChirp = true;
    A.autosave();
  };
  // without the playable tank, a "skip all" also skips panel 4
  if (skipPanel) begin(); else story.play([line('opening.after')], { id: 'opening-4', onDone: begin });
}
function storyEvent(name) {
  if (name === 'tankEscaped') afterEscape();
  else if (name === 'ending') playEnding();
  else if (name === 'damper') { openModal(); Screens.damperCard(A); }
}
function playEnding() {
  const m = game.meta; m.won = true; game.gameWon = true;
  A.playMusic(null); // [polish-T] was nana.js after() (the ending now starts as her last line closes)
  ui.closeMenu(); ui.showHUD(false); touch.show(false);
  const crack = Meta.ensure(game).lairCrack || game.saveCrack || A.here(); // [final-S] back from the Carrier to Nana's door crack
  Save.writeSlot(slot, slotData(game));
  story.play(line('ending.panels'), { id: 'ending', onDone: () => story.credits({ onDone: () => story.thanks({ onDone: () => goCarrier(crack) }) }) });
}
function carrierSings() {
  const m = game.meta;
  m.damperOpen = true; m.flags.damperOpen = true;
  game.camera.shake = 18;
  A.sfx('unlock');
  const sing = line('carrier.sing');
  A.dialogSay([['stripe', sing[0]], ['katy', sing[1]], [null, sing[2]]], () => { game.toast(line('carrier.singToast'), 240); A.autosave(); });
}
function continueGame(latest) {
  if (!latest) return;
  A.playMusic(null); // [final-S]
  slot = latest.n;
  game = newGameObject();
  metaRun.reset();
  loadTips(latest.data); // [issue 9]
  try { Save.intoGame(game, latest.data); } catch (e) { console.warn('save could not be loaded', e); const z = ZONES.find((zz) => zz.n === 1) || ZONES[0]; game.startAt(z.start.room); }
  Meta.ensure(game); applyUpgrades();
  startPlay();
  game.trans = { f: 0, dur: 24, kind: 'fade' }; // [issue 16] the Continue fade
  // [issue 16] the save's room still loading (its load started at boot, warmTitle): the title stays
  // up, dimming, until it's in; then the fade
  if (!latest.data.carrier && gate.check(game)) { ui.showTitleArt(true); ui.titleArt.classList.add('leaving'); ui.showHUD(false); touch.show(false); heldOver = 'title'; }
  if (latest.data.carrier) goCarrier(latest.data.returnCrack || latest.data.crack || game.saveCrack, true);
}
function startPlay() {
  screen = 'play'; paused = false;
  ui.closeMenu(); ui.showTitleArt(false); ui.showHUD(true); touch.show(isTouch);
  updateTouchButtons();
}
function pause(msg, tab) {
  if (screen !== 'play' || story.active || heldOver) return; // [issue 16] not under a held panel / title
  if (dialog.active) return;
  fbk.snapshot();
  paused = true; openModal();
  A.pauseMsg = msg || null;
  Screens.pause(A, tab || 'pause', msg || null);
}
function resume() { paused = false; ui.closeMenu(); A.pauseMsg = null; A._trioDraft = null; afterModal(); } // [final-S] a closed picker drops its draft
function quitToTitle() {
  if (game) Save.writeSlot(slot, slotData(game));
  if (game?.inCarrier) hub.leave(game);
  A.playMusic(null); // [final-S] the Carrier's / the finale's override must not carry over to the title
  game = null; showTitle();
}
function updateTouchButtons() {
  if (!game) return;
  touch.setVisible('use', USE_ITEMS.some((i) => game.player.has(i)));
}
// Crumb Shop upgrades and song-seeds -> the player (song-seeds: faster chirp refill; ears: listen range).
function applyUpgrades() {
  if (!game) return;
  const m = Meta.ensure(game), p = game.player;
  const songs = (m.upgrades.songs || 0) + m.secrets.filter((s) => Meta.secretKind(s) === 'song').length; // [fixer] house.js song-seed ids too
  p.chirpRefillMul = 1 / (1 + 0.25 * songs);     // player.js: the chirp meter refills this much faster
  p.listenRange = 1 + 0.5 * (m.upgrades.ears || 0); // beacon.js listenReach: Listen hears the beacon this much farther
  game.gentle = !!settings.gentle;
}
// ---- the Carrier ----
function goCarrier(crack, fromLoad) {
  ui.closeMenu();
  const stage = Meta.shellStage(Meta.rescueCount(game));
  // [final-S] never a hub room; else where "Back" went last, else zone 1's start crack (hubCrack always has a way out)
  const ok = (c) => c && !isHubRoom(c.room) && game.world.rooms[c.room];
  const ret = ok(crack) ? { ...crack } : ok(game.returnCrack) ? game.returnCrack : game.homeCrack;
  game.returnCrack = ret;
  game.startAt(hubRoomFor(stage));
  game.trans = { f: 0, dur: 24, kind: 'fade' };
  hub.enter(game, ret);
  gate.ahead(game, game.world.rooms[ret.room]); // [issue 16] the way back loads while you're aboard
  if (!fromLoad) A.autosave();
  A.playMusic('carrier');
  try { Audio.setCarrierVoices?.(Meta.RESCUABLE.filter((id) => game.rescued.has(id))); } catch { /* ignore */ }
  paused = false; ui.showHUD(true); afterModal(); // [polish-T] the HUD (pause, map, mute) is back after the ending hands over
}
function leaveCarrier() {
  const c = game.returnCrack || game.homeCrack; // [final-S]
  ui.closeMenu();
  hub.leave(game);
  A.playMusic(null);
  if (c && game.world.rooms[c.room]) { game.startAt(c.room, c.tx ?? undefined, c.ty ?? undefined); game.saveCrack = c; }
  else { const z = ZONES.find((zz) => zz.n === 1) || ZONES[0]; game.startAt(z.start.room); }
  game.trans = { f: 0, dur: 24, kind: 'fade' };
  A.autosave();
  paused = false; afterModal();
}
function travel(crack) {
  ui.closeMenu();
  if (game.inCarrier) { hub.leave(game); A.playMusic(null); }
  game.startAt(crack.room, crack.tx ?? undefined, crack.ty ?? undefined);
  game.saveCrack = { ...crack };
  game.trans = { f: 0, dur: 24, kind: 'fade' };
  A.autosave();
  paused = false; afterModal();
}
function enterLair(door) {
  ui.closeMenu();
  metaRun.humpCheck();
  if (door.to && game.world.rooms[door.to]) { game.startAt(door.to, door.at?.[0], door.at?.[1]); game.trans = { f: 0, dur: 24, kind: 'fade' }; }
  game.emit('lairEnter', { boss: door.boss });
  const pre = line(`geckos.${door.boss}.pre`);
  if (Array.isArray(pre) && !game.meta.flags[`pre:${door.boss}`]) A.dialogSay(pre.map((t) => [door.boss, t]), () => { game.meta.flags[`pre:${door.boss}`] = true; });
  else { paused = false; afterModal(); }
}

// ---- the fixed step ----
let lastFxSound = 0;
function step() {
  input.pollPad(navigator.getGamepads ? navigator.getGamepads.bind(navigator) : null);
  if (input.padConnected && !input.padStandard && !padNote) padNote = 'Controllers work best in Chrome or Edge.';
  const f = input.sample();
  if (fbk.isOpen()) { if (f.pressed.back && input.last === 'gamepad') fbk.close(); return; } // the bug form is open: the game waits
  if (story.active) { story.step(f); return; }
  if (screen === 'title') {
    if (!titleReady) { if (Object.values(f.pressed).some(Boolean)) { titleReady = true; showTitle(); } return; }
    menuInputWithSound(f); return;
  }
  if (screen === 'play') {
    // [issue 18] a dialog or card that opens as a room comes in (a gecko's opening lines, a Ready?
    // card, a talk on entry) doesn't freeze the room's fade or wipe on its first, black frame: the
    // transition is visual only, so it runs on under the modal (not while the art is held)
    if ((dialog.active || ui.screen) && game?.trans && !gate.holding) { const tr = game.trans; if (++tr.f >= tr.dur) game.trans = null; }
    if (dialog.active) { dialog.step(f); return; }
    if (ui.screen) {
      // the map button toggles the map tab; pause closes the pause menu (its tabs). [final-S] In a
      // submenu (Settings, How to Play, the trio picker, a confirm, the stitch needle) Escape means
      // Back; on a card (zone complete, Ready?, a save crack, the damper, the Carrier's crack) the
      // map key does nothing.
      const top = PAUSE_TABS.has(ui.screen) && !ui.onKey;
      if (f.pressed.map) {
        if (!top) { if (!ui.onKey) return; }
        else if (ui.screen === 'map') { resume(); return; }
        else { ui.onKey = null; Screens.pause(A, 'map'); return; }
      }
      if (f.pressed.pause && top) { resume(); return; }
      if (f.pressed.pause && !f.pressed.back && !ui.onKey) { if (ui.onBack) { Audio.play('menu-back'); ui.onBack(); } else resume(); return; } // P: like Escape
      menuInputWithSound(f); return;
    }
    if (f.pressed.pause) { pause(); return; }
    if (f.pressed.map) { pause(null, 'map'); return; }
    if (f.pressed.mute) toggleMute();
    if (rewinder && f.pressed.rewind && !game.inCarrier) { rewind(); return; } // [issue 11] debug
    if (gate.check(game) && !frozen) return; // [art] the room's art is still loading: the sim waits (tests' __game.step don't)
    game.bossWait = !frozen && gate.bossWaiting(game); // [art] a gecko never acts before it can be seen
    hub.update(game, f);
    game.update(f);
    Audio.tick(game); // [audio] effects from game.fx, music, beacon, game-clock cues (100 ms lookahead)
    earStep(!game.card && !(game.hold > 0)); // [issue 10] after the game and the audio (the answer's frame)
    playRumble();
    metaRun.step(f);
    if (game.meta?.flags.firstChirp && game.fx.some((e) => e.type === 'chirp' && e.f === game.frame)) game.meta.flags.firstChirp = false;
    if (game.frame % 15 === 0) updateTouchButtons();
    if (rewinder) { if (game.inCarrier) rewinder.reset(null); else rewinder.record(game, () => ({ pendingCard: metaRun.pendingCard })); } // [issue 11]
  }
}
// [issue 11] Debug: back to the snapshot about 5 s ago (the whole game: src/rewind.js). The meta
// layer's pending rescue card goes back with it; sounds that were playing stop and nothing plays
// twice; the screen's own settings (camera size, Gentle Mode, upgrades) stay as they are now.
// Never writes or reads a save slot.
function rewind() {
  const cam = game.camera, keep = { zoom: cam.zoom, hFrac: cam.hFrac, touchBias: cam.touchBias, avoid: cam.avoid }, gentle = game.gentle;
  const r = rewinder.rewind(game);
  if (r) {
    Object.assign(game.camera, keep); game.gentle = gentle;
    metaRun.pendingCard = r.extra?.pendingCard || null; metaRun.lastFx = game.frame;
    lastFxSound = game.frame;
    renderer.fx.p.length = 0; renderer.fx.spot = null;
    try { Audio.rewound(game); } catch { /* audio not up */ }
    earReset(); // [issue 10] the ear starts over (and snaps) after a rewind
    applyUpgrades(); updateTouchButtons();
  }
  if (!rewindCue) { rewindCue = document.createElement('div'); rewindCue.className = 'rewind-cue'; rewindCue.setAttribute('aria-live', 'polite'); stage.appendChild(rewindCue); }
  // a short history (the room just started, or just rewound) says so
  rewindCue.textContent = !r ? '\u27F2 no older history' : `\u27F2 ${(r.frames / FPS).toFixed(1)} s${r.frames < BACK ? ' (no older history)' : ''}`;
  rewindCue.classList.add('on'); clearTimeout(rewindCueT); rewindCueT = setTimeout(() => rewindCue.classList.remove('on'), 900);
}
// [audio] menu move / select / back sounds around the one focus model
function menuInputWithSound(f) {
  const before = ui.focusIdx, scr = ui.screen;
  ui.menuInput(f);
  if (f.pressed.confirm && scr) Audio.play('menu-select');
  else if (f.pressed.back && scr) Audio.play('menu-back');
  else if (ui.focusIdx !== before) Audio.play('menu-move');
}
function playRumble() {
  for (const e of game.fx) {
    if (e.f <= lastFxSound) continue;
    if (e.type === 'hurt' || (e.type === 'land' && e.d.hard)) rumble(e.type === 'hurt' ? 0.6 : 0.3);
  }
  lastFxSound = game.frame;
}
function rumble(strength) {
  if (!settings.vibration || input.last !== 'gamepad') return;
  try { const pad = [...(navigator.getGamepads?.() || [])].find((p) => p && p.connected); pad?.vibrationActuator?.playEffect('dual-rumble', { duration: 120, strongMagnitude: strength, weakMagnitude: strength / 2 }); } catch { /* ignore */ }
}

// ---- the loop ----
let acc = 0, last = performance.now();
let modalShown = false; // [polish-T]
function frameName() {
  const parts = [screen];
  if (screen === 'title') parts[0] = titleReady ? 'title' : 'title-press';
  if (screen === 'play' && game?.inCarrier) parts[0] = 'carrier';
  if (story.active) return parts[0] === 'title' || parts[0] === 'title-press' ? `title>${story.kind}` : story.kind;
  if (ui.screen && ui.screen !== 'title' && ui.screen !== 'press') parts.push(ui.screen);
  if (dialog.active) parts.push('dialog');
  if (screen === 'play' && game?.card) parts.push('card');
  return parts.join('>');
}
// [meta] talkers drawn over the room (npc entities), and the meta HUD
function drawMetaWorld() {
  const ents = game.metaEnts; if (!ents || !ents.length) return;
  const c = renderer.ctx, cam = game.camera;
  c.save(); c.setTransform(renderer.scale, 0, 0, renderer.scale, 0, 0); c.scale(cam.zoom, cam.zoom); c.translate(-Math.round(cam.x), -Math.round(cam.y));
  for (const e of ents) {
    if (!e.done && (e.type === 'crumbs' || e.type === 'secret')) { // [builder B] crumb caches, seed-hearts and song-seeds were never drawn
      const file = Meta.pickupFile(e); // [art] shared with room-art.js
      const img = S.get(`items/${file}.webp`), bob = Math.sin(renderer.t / 18 + e.px * 0.01) * 3, hh = file === 'crumb' ? 24 : 32;
      if (img) c.drawImage(img, e.px + 20 - hh * img.width / img.height / 2, e.py + 38 - hh + bob, hh * img.width / img.height, hh);
      else { c.fillStyle = '#F2C46D'; c.beginPath(); c.arc(e.px + 20, e.py + 26 + bob, 8, 0, 7); c.fill(); }
      continue;
    }
    if (e.done || e.type !== 'npc') continue;
    const facing = game.player.cx < e.px + 20 ? -1 : 1, talking = dialog.active && dialog.who?.name === line(`npcs.${e.who}.name`);
    if (renderer.drawNPC) { renderer.drawNPC(c, e.who, e.px + 20, e.py + 40, { talking, h: e.size || 56, facing, t: renderer.t }); continue; }
    const img = S.get(`sprites/npcs/${e.who}.webp`); if (!img) continue;
    const hh = e.size || 56, w = hh * img.width / img.height, bob = Math.abs(Math.sin(renderer.t / 10)) * 2;
    c.save(); c.translate(e.px + 20, e.py + 40 - bob); c.scale(facing, 1); c.drawImage(img, -w / 2, -hh + 2, w, hh); c.restore();
  }
  c.restore();
}
// [issue 10] The ear guide (src/ear.js): its state lives here, outside the game, so replays, saves and
// rewind snapshots never see it. One step per fixed step; `inControl` is false under the item card and
// a hold (respawn, back to the entrance); paused, dialog, story and art-hold steps never get here.
let ear = Ear.initial(), earGame = null, earVia = null, earAim = null, earShow = false, earDist = null, earAnswerAt = null;
let earSnap = 0, earPulse = 0; // counters the HUD watches: snap the angle; the lost "this way" pulse
function earReset() { ear = Ear.initial(); earVia = null; earAim = null; earShow = false; earSnap++; }
function earStep(inControl) {
  if (earGame !== game) { earGame = game; earReset(); } // a new game (New Game, Continue, goToRoom)
  const spec = game.inCarrier ? null : beaconSpec(game), m = spec ? measure(game, spec) : null;
  earDist = m?.pathDist ?? null;
  earShow = !game.inCarrier && game.zone?.n >= 1 && !!spec && earDist != null && !game.inFight();
  if (game.fx.some((e) => e.type === 'die' && e.f === game.frame)) ear = Ear.restart(ear, earDist); // a respawn: best = here
  const r = earShow ? route(game, spec, earVia) : null;
  earVia = r?.via ?? null; earAim = r ? { ...r.aim, room: game.room.id, target: r.target, door: r.door } : null;
  const ind = Audio.indicator ? Audio.indicator(game) : null;
  earAnswerAt = ind?.answerFrame ?? null;
  ear = Ear.step(ear, { followable: earShow, key: spec ? `${spec.zone}|${spec.phase}` : null, pathDist: earDist, inControl, listening: !!game.player.listening, frame: game.frame, answerAt: earAnswerAt, mode: Ear.earMode(settings), lostFrames: EAR_LOST });
  if (ear.cameOut) {
    earSnap++;
    if (!settings.earTold) { A.setSetting('earTold', true); game.toast(line('ui.earFirst'), 300); } // the first time it ever comes out
  }
  if (ear.lostNow) { earPulse++; A.sfx('chime'); } // a "this way" pulse and a soft cue
}
// the way to walk as a screen angle (the HUD smooths it), and the doorway glint's spot (render.js)
function earAngle() { const p = game.player; return earAim && earAim.room === game.room?.id ? Math.atan2(earAim.y - p.cy, earAim.x - p.cx) : null; }
function earGlint() {
  if (!ear.out || !earShow || !earAim || earAim.target || earAim.room !== game.room?.id) return null;
  const room = game.room, k = 24; // a doorway on the room's edge: drawn just inside it
  return { x: Math.max(k, Math.min(room.pw - k, earAim.x)), y: Math.max(k, Math.min(room.ph - k, earAim.y)) };
}
function updateMetaHUD() {
  const p = game.player, m = game.meta || {};
  const d = !game.inCarrier ? A.indicator() : null; // [final-S] also feeds the ripples and the rhythm strip
  const a = earShow ? earAngle() : null;
  const earInfo = a != null ? {
    out: ear.out, reason: ear.reason, angle: a, mode: Ear.earMode(settings), snap: earSnap, pulseN: earPulse, room: game.room.id,
    strength: d?.show ? d.loudness ?? 0.5 : 0.5, pulseV: d?.show ? d.pulse || 0 : 0, chirpAt: d?.show ? d.lastChirpFrame : null,
  } : null;
  // [issue 10] one direction everywhere: the ripples come from the way to walk too
  const bc = d && d.show ? (a != null ? { ...d, dx: Math.cos(a), dy: Math.sin(a) } : d) : null;
  const temp = p.stats?.perk === 'thermometer' && !game.inCarrier ? Math.round(tempAt(game.room, p.cx)) : null;
  ui.updateMetaHUD({ crumbs: m.crumbs || 0, rolo: game.recruits.has('rolo'), temp, ear: earInfo, paused: paused || frozen, autoChirp: settings.beaconChirps === 'always', beacon: bc, listening: !!p.listening, alwaysRipples: !!settings.ripples });
}
function logFrame(name) {
  const l = frameLog[frameLog.length - 1];
  if (l && l[0] === name) l[1]++; else { frameLog.push([name, 1]); if (frameLog.length > 200) frameLog.shift(); }
}
function tick(now) {
  const dt = Math.min(now - last, 250); last = now;
  if (!frozen) {
    acc += dt;
    let n = 0;
    while (acc >= STEP_MS && n < 8) { step(); acc -= STEP_MS; n++; }
    if (n === 8) acc = 0;
  }
  if (screen === 'play' && game) gate.check(game, !story.active); // [art] under a story panel the room's art starts loading
  if (heldOver && (!gate.holding || screen !== 'play')) releaseHeld(); // [issue 16] the room's in: the panel / title goes, the fade runs
  if (screen === 'play' && game && !story.active) {
    if (game.inCarrier) hub.draw(renderer, game);
    else {
      // [issue 16] a held transition shows the frame before the room change, dimming: keep it before drawing the held room
      const heldTr = gate.heldKind(heldOver) === 'transition';
      if (heldTr) { if (!renderer.snapOk) renderer.snapshot(); } else renderer.dropSnapshot();
      S.setDrawing(game.room?.id || null, gate.holding); // [art] ?artcheck logs misses against this room
      renderer.draw(game, { shake: settings.shake, held: heldTr, glint: earGlint(), tipRead: (sg) => tipsRead.has(sg.key) }); drawMetaWorld(); // [issue 10] the ear's doorway glint
      S.setDrawing(null);
      const cv = gate.cover(heldOver); // [art] the wait, folded into the panel, the title or the transition; else ink until the room's art is in
      if (cv?.kind === 'transition') renderer.drawHeld(cv.alpha, cv.ink); else if (cv) renderer.drawCover(cv.alpha, cv.label, cv.ink);
    }
    ui.tipHold = !!heldOver || gate.holding; // [issue 9] the tip card hides during a held transition
    ui.updateHUD(game); if (now - avoidAt > 500) measureAvoid(); updateMetaHUD(); // [polish-V]
  } else if (!story.active) renderer.draw({ room: null }, {});
  paused = screen === 'play' && (!!ui.screen || dialog.active || story.active);
  { const mo = !!(ui.screen || dialog.active || story.active || (screen === 'play' && game?.card)); if (mo !== modalShown) { modalShown = mo; document.body.classList.toggle('modal-open', mo); } } // [polish-T] tips hide under any card, dialog or menu (meta.css)
  Audio.frame({ screen, paused, game }); // [audio] title/pause music, Carrier layers, default chirp indicator
  logFrame(frameName());
  requestAnimationFrame(tick);
}

// ---- debug hook (reads state and sets up situations; never plays for you) ----
// set-up calls start from a fresh game so replays are deterministic
function ensureGame() { if (game?.inCarrier) hub.leave(game); game = newGameObject(); // [final-S] leave the Carrier's prompt behind
  titleReady = true; input.releaseAll(); input.sample(); }
window.__game = {
  state: () => {
    const s = game ? game.snapshot() : {};
    return {
      screen: screen === 'play' ? (paused ? 'pause' : 'play') : screen, ...s,
      position: s.pos, input: input.last, padId: input.padId, padFamily: input.padFamily,
      frozen, slot,
    };
  },
  frames: () => frameLog.map((x) => [...x]),
  levels: () => 10,
  zones: () => ZONES.map((z) => ({ id: z.id, n: z.n, name: z.name, rooms: z.rooms.map((r) => r.id) })),
  goToLevel: (n, opts = {}) => {
    const z = ZONES.find((zz) => zz.n === n);
    if (!z) return { ok: false, reason: `zone ${n} is not built yet` };
    ensureGame();
    const info = ZONE_INFO[n] || {};
    const items = opts.items || info.minItems?.[0] || [];
    game.startAt(z.start.room, undefined, undefined, { items, party: opts.party || info.party || ['pip'], rescued: info.rescued || [] });
    startPlay();
    return { ok: true, room: game.room.id };
  },
  goToRoom: (id, opts = {}) => {
    ensureGame();
    // [builder C] a fresh game: drop a dialog or a pending card left open by the last run (replays)
    if (dialog.active) { dialog.active = false; dialog.box.hidden = true; dialog.o = null; }
    metaRun.pendingCard = null;
    game.startAt(id, opts.x, opts.y, { items: opts.items, party: opts.party, rescued: opts.rescued });
    startPlay();
    return { ok: true, room: game.room.id };
  },
  give: (item) => { if (!ITEMS[item] || !game) return false; game.give(item); updateTouchButtons(); return true; },
  rescue: (id) => (game && CRICKETS[id] ? game.rescue(id) : false),
  setBossPhase: (n) => { if (!game) return false; game.bossPhase = n; game.boss?.setPhase?.(n); return true; },
  freeze: () => { frozen = true; acc = 0; return true; },
  step: (n = 1) => { for (let i = 0; i < n; i++) step(); return game ? game.frame : 0; },
  unfreeze: () => { frozen = false; last = performance.now(); acc = 0; return true; },
  audioState: () => Audio.audioState(),
  beacon: () => Audio.beaconState(),                 // [audio] target, phase, pathDist, gain (dB), cutoff, pan, reverbWet
  renderChirp: (species, opts) => Audio.renderChirp(species, opts), // [audio] Promise<{sampleRate, samples, hz}>
  buttons: () => (game?.inCarrier ? hub.buttons() : []),
  // [meta] read meta state; open screens/cards for tests (set-up only, like goToRoom)
  meta: () => (game ? { ...JSON.parse(JSON.stringify(game.meta || {})), inCarrier: !!game.inCarrier, completion: Meta.completion(game), shell: hub.active ? hub.shell : null, ui: ui.screen, dialog: dialog.active, story: story.active ? story.kind : null } : null),
  carrier: () => { if (!game) return false; goCarrier(game.saveCrack || A.here()); return true; },
  recruit: (id) => { if (!game) return false; metaRun.recruit(id); return true; },
  open: (what, arg) => {
    if (!game) return false;
    if (what === 'complete') A.zoneComplete(arg || 'stripe');
    else if (what === 'ready') A.lairReady({ boss: arg || 'duchess', room: game.room.id });
    else if (what === 'crack') A.crackMenu();
    else if (what === 'damper') storyEvent('damper');
    else if (what === 'pause') pause(null, arg);
    else if (what === 'dialog') A.dialogSay(line(arg || 'geckos.lashes.pre').map((t) => [(arg || 'geckos.lashes.pre').split('.')[1], t]));
    else if (what === 'ending') playEnding();
    else if (what === 'escaped') afterEscape();
    else return false;
    return true;
  },
  // read-only: which actions the input layer sees held right now (replays wait on this)
  // [final-2] read-only: the camera and the boss (phone framing checks)
  avoid: () => measureAvoid(), // [polish-V] read-only: the HUD/button rects the camera keeps clear
  camera: () => (game ? { x: game.camera.x, y: game.camera.y, zoom: game.camera.zoom, vw: game.camera.vw, vh: game.camera.vh, hFrac: game.camera.hFrac, px: game.player.cx, py: game.player.cy, pw: game.player.w, ph: game.player.h } : null),
  boss: () => (game?.boss ? { name: game.boss.name, x: game.boss.x, y: game.boss.y, done: !!game.boss.done, phase: game.boss.phase, mode: game.boss.mode, inFight: game.inFight() } : null),
  rewind: () => (rewinder && game ? (rewind(), rewinder.snaps.length) : false), // [issue 11] debug; false when off
  // [issue 10] read-only: the ear guide (its state, the setting in effect, where it aims, the lost timer's length, what shows)
  ear: () => ({ ...ear, mode: Ear.earMode(settings), setting: settings.ear, shown: earShow, pathDist: earDist, answerAt: earAnswerAt, frame: game?.frame ?? null,
    aim: earAim ? { ...earAim } : null, angle: game ? earAngle() : null, shownAngle: ui._earC ?? null, glint: game ? earGlint() : null, lostFrames: EAR_LOST || Ear.LOST_FRAMES,
    dock: !ui.earDock.hidden && !ui.earDock.classList.contains('away'), edge: !ui.indicator.hidden }),
  // [issue 9] read-only: the tip card (what shows, its slot and rect in view fractions, the read set) and every
  // note in the room (where it stands, read, still standing); measure: tip texts -> their lines in the card as it is
  tips: (opts = {}) => {
    const info = ui.tipsInfo(opts.measure || null);
    info.notes = game ? (game.signs || []).map((s) => ({ key: s.key, kind: s.kind, text: s.text, tx: s.tx ?? null, gy: s.gy ?? null, x: s.nx ?? null, y: s.ny ?? null, bad: s.bad || null, read: tipsRead.has(s.key), live: noteLive(game, s) })) : [];
    return JSON.parse(JSON.stringify(info));
  },
  held: () => Object.fromEntries(['left', 'right', 'up', 'down', 'jump', 'use', 'chirp', 'kick', 'listen'].map((k) => [k, input.heldNow(k)])),
};

// [meta] once the service worker runs the page (installed / ?sw=1), warm its cache with the
// meta art (story panels, the Carrier, portraits) in idle time, so they work offline too.
// (Published builds precache every file; this only matters for unstamped copies.)
if (navigator.serviceWorker?.controller) {
  const metaArt = ASSET_LIST.filter((f) => /^(story\/|bg\/carrier\/|carrier\/|ui\/|items\/|sprites\/npcs\/|sprites\/crickets\/[a-z]+\/portrait\.webp|sprites\/geckos\/[a-z]+\/idle\.webp|audio\/sfx\/|audio\/music\/(title|carrier)\.mp3)/.test(f));
  let i = 0;
  const next = () => { if (i >= metaArt.length) return; fetch('assets/' + metaArt[i++]).catch(() => {}).finally(() => setTimeout(next, 30)); };
  setTimeout(next, 3000);
}
resize();
if (window.__bootPressed) Audio.unlock(); // [final-2] a press while the game loaded was a user gesture: the title music starts
showTitle();
requestAnimationFrame(tick);
