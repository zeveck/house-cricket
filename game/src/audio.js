// Audio: music, sound effects, ambience loops, synthesized voices (chirps.js) and the beacon.
//
// - The AudioContext starts on the first input (unlock()).
// - Music: looping AudioBuffers (never <audio>), at most 3 decoded at once (the current track plus
//   the Carrier and boss tracks if they were used); others are released on a track change. On decode
//   the last 1.5 s are crossfaded into the start so the loop is seamless; tracks crossfade.
// - Sound effects [issue 14]: fetched ahead of need, never all up front. Music comes first: warm()
//   (main.js, at load) fetches the title track, then the effects every room uses (sfxFirst(): the
//   cricket's moves, menus, pickups...). The rest belong to zones (src/zone-sfx.js: ambience loops,
//   decoys, a gecko's growl, Big Tok's bellow...) and are asked for with needSfx() as the art for a
//   zone is (room-art.js's gate: on entering a zone, for its neighbours and for rooms loaded ahead).
//   Bytes are fetched before the AudioContext exists and decoded once it does. A sound played
//   before it is in is skipped and fetched for next time (?artcheck logs it: "[sfxcheck]").
// - Buses: master (mute) <- music (volume <- Listen/pause duck <- peaking cut at the zone's beacon
//   voice, -6 dB Q 1.5) | sfx (volume; effects, ambience, own chirp, decoys) | beacon (volume; the
//   trapped cricket: distance gain -> low-pass -> pan -> dry + reverb).
// - Game-clock sounds (beacon chirps, answers, decoys, cue()) are scheduled from tick(game), which
//   main.js calls once per fixed step, with a 100 ms (6 frame) lookahead; when the game is frozen
//   or paused there are no steps, so nothing new is scheduled. Gameplay never reads AudioContext
//   time: this module only reads the game.
//
// Public API (see design/ENGINE_NOTES.md "Audio"):
//   unlock(), configure(settings, save), setSetting(k, v), setMuted(m), isMuted(),
//   play(name, {gain, rate, pan, detune}), cue(frame, name, opts), clearCues(),
//   music(nameOrNull) (override), setCarrierVoices(ids), setLoops(names),
//   tick(game), frame({screen, paused, game}), indicator(), audioState(), beacon(), renderChirp(v),
//   warm(track), needSfx(names), sfxFirst(), fxSound(event)
import * as Chirps from './chirps.js';
import { beaconSpec, measure, FLOOR_DB, info as zoneInfo, listenGainDb } from './beacon.js';

const MUSIC_DIR = 'assets/audio/music/', SFX_DIR = 'assets/audio/sfx/';
export const SFX_NAMES = ['bat-squeaks', 'beetle-plod', 'bigtok-bellow', 'bonk', 'crinkle', 'crumb', 'dialog-blip', 'dragon-hiss', 'dryer-hum', 'floss-swing', 'furnace', 'gecko-chomp', 'gecko-growl', 'gecko-skitter', 'gecko-snore', 'glide-whoosh', 'glow-flash', 'ground-pound', 'gulp', 'hinge-creak', 'hop', 'hurt', 'item-get', 'kick', 'land', 'menu-back', 'menu-move', 'menu-select', 'pillow-bonk', 'pounce-land', 'raft-splash', 'rain-roof', 'relief-sting', 'rubber-band-twang', 'save-crack', 'seed-heart', 'splat', 'squeak-toy', 'swap-puff', 'swift-chitter', 'unlock', 'vacuum', 'wall-cling', 'wall-jump'];
// [issue 14] Effects only some zones use (src/zone-sfx.js asks for them; beetle-plod is unused). Every
// other effect is in sfxFirst(), loaded right after the title music. [issue 25] The opening chase's
// gecko-skitter, pounce-land, gulp and relief-sting load with the tank (src/zone-sfx.js).
export const ZONED_SFX = ['bat-squeaks', 'beetle-plod', 'bigtok-bellow', 'dragon-hiss', 'dryer-hum', 'furnace', 'gecko-chomp', 'gecko-growl', 'gecko-skitter', 'gecko-snore', 'gulp', 'pounce-land', 'rain-roof', 'relief-sting', 'squeak-toy', 'swift-chitter', 'vacuum'];
export const sfxFirst = () => SFX_NAMES.filter((n) => !ZONED_SFX.includes(n));
// Loop gains from design/ASSETS.md (the files are quiet on purpose).
// [issue 25] gecko-skitter (Duchess's feet, -32.5 LUFS as made): +12 puts it with the others (~-20.5).
const LOOP_DB = { vacuum: 12, 'dryer-hum': 25, 'rain-roof': 18, furnace: 16, 'gecko-skitter': 12 };
const AMBIENCE_LEVEL = 0.35;
// Per-sound trim (dB) on top of the automatic loudness levelling done at decode.
const TRIM_DB = { hop: -5, land: -6, 'wall-cling': -6, 'wall-jump': -4, kick: -2, 'menu-move': -9, 'menu-back': -7, 'menu-select': -5, 'dialog-blip': -10, crumb: -4, 'item-get': 0, crinkle: -8, 'swap-puff': -4, 'glide-whoosh': -5, 'floss-swing': -4, 'raft-splash': -4, 'save-crack': -2, 'glow-flash': -3, 'ground-pound': -1, 'gecko-snore': -6,
  // [issue 25] the skitter is a loop (no levelling): played with play() it gets its LOOP_DB here; the
  // relief sting is music, so it sits under the effects (levelled -12.2 -> -16 LUFS)
  'gecko-skitter': 12, 'relief-sting': -4 };
// [issue 25] Per-track music gain (dB). The tracks were levelled to about -15..-22 LUFS (boss -19.8,
// title -17.2); the chase cue came in at -16, so -2 puts it with the boss music.
const MUSIC_DB = { chase: -2 };
const JITTER = { hop: 0.07, land: 0.07, 'wall-jump': 0.05, kick: 0.04, crumb: 0.05, 'wall-cling': 0.05 };
const POOL = 4;               // max simultaneous copies of one sound
const LOOKAHEAD = 6;          // frames (100 ms at 60 Hz)
const BEAT = 50;              // one beat at 72 BPM, in frames: the trapped cricket answers this long after your call
const RIPPLE_FRAMES = 240;    // ripples show 4 s after a call
const LISTEN_DUCK_DB = -12, PAUSE_DUCK_DB = -12, LISTEN_BOOST_DB = 6;
const CUT_DB = -6, CUT_Q = 1.5;
const LEVEL = { music: 0.55, sfx: 0.85, beacon: 1.0 };
const db = (x) => Math.pow(10, x / 20);

let ac = null, N = null;                  // context and nodes
let settings = { muted: false, music: 0.8, sfx: 0.9, beacon: 0.9, beaconChirps: 'always', ear: 'helps', easyPitch: false };
let saveFn = null;
const st = {
  screen: 'title', paused: false, listen: false, want: null, override: null, cutHz: null,
  loopsWanted: [], carrier: [], lastFxObj: null, glide: false, raft: false,
};
const mus = { decoded: new Map(), loading: new Map(), cur: null, fading: [] };
const sfx = { buf: new Map(), norm: new Map(), asked: new Set(), decoding: new Set(), live: new Map(), late: new Set() };
const bytes = new Map();                  // url -> Promise<ArrayBuffer | null> until decoded [issue 14]
const sfxCheck = typeof location !== 'undefined' && new URLSearchParams(location.search).has('artcheck');
const synthCache = new Map();
const loops = new Map();                  // name -> {src, g}
let cues = [];                            // [{frame, name, opts}]
const bc = {                              // beacon runtime
  key: null, spec: null, m: null, timelines: [], pulses: [], lastPulse: -999, answerAt: null,
  ripplesUntil: -1, frame: 0, count: 0, decoys: [], decoyKey: null, room: null, hist: [], decoyHist: [],
};

// ---------------------------------------------------------------- context
export function unlock() {
  try {
    if (!ac) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      ac = new AC({ latencyHint: 'interactive' });
      buildGraph();
      if (st.want) startTrack(st.want, true);
      for (const name of sfx.asked) decodeSfx(name); // fetched before the context existed
      warmSfx();
      applyLoops();
    }
    if (ac.state === 'suspended') ac.resume();
  } catch (e) { console.warn('audio unavailable', e); }
}
function buildGraph() {
  const g = (v = 1) => { const n = ac.createGain(); n.gain.value = v; return n; };
  N = {};
  N.master = g(settings.muted ? 0 : 1); N.master.connect(ac.destination);
  N.musicVol = g(); N.musicVol.connect(N.master);
  N.duck = g(); N.duck.connect(N.musicVol);
  N.cut = ac.createBiquadFilter(); N.cut.type = 'peaking'; N.cut.Q.value = CUT_Q; N.cut.gain.value = 0; N.cut.frequency.value = 4800; N.cut.connect(N.duck);
  N.sfxVol = g(); N.sfxVol.connect(N.master);
  N.amb = g(AMBIENCE_LEVEL); N.amb.connect(N.sfxVol);
  N.beaconVol = g(); N.beaconVol.connect(N.master);
  // beacon chain: in (distance gain) -> lpf -> pan -> dry / reverb
  N.bIn = g(db(FLOOR_DB)); N.bLpf = ac.createBiquadFilter(); N.bLpf.type = 'lowpass'; N.bLpf.Q.value = 0.5; N.bLpf.frequency.value = 18000;
  N.bPan = ac.createStereoPanner ? ac.createStereoPanner() : g();
  N.bDry = g(1); N.bWet = g(0.1); N.verb = ac.createConvolver(); N.verb.buffer = impulse(0.9);
  N.bIn.connect(N.bLpf); N.bLpf.connect(N.bPan); N.bPan.connect(N.bDry); N.bPan.connect(N.bWet);
  N.bWet.connect(N.verb); N.verb.connect(N.beaconVol); N.bDry.connect(N.beaconVol);
  applyVolumes();
}
// A short generated room impulse (decaying stereo noise).
function impulse(sec) {
  const len = Math.round(sec * ac.sampleRate), b = ac.createBuffer(2, len, ac.sampleRate);
  const r = Chirps.rng('verb');
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (i < 40 ? i / 40 : 1); }
  return b;
}
const running = () => ac && N && ac.state === 'running';
const now = () => ac.currentTime;

// ---------------------------------------------------------------- settings
/** Use main's settings object (from save.js loadSettings) and its saver; applies everything. */
export function configure(s, save) {
  settings = Object.assign(s, { beaconChirps: 'always', ear: 'helps', easyPitch: false, ...s });
  saveFn = save || null;
  applyVolumes();
}
/** Change one setting (music | sfx | beacon 0..1, muted, beaconChirps 'always'|'call'|'off', ear 'helps'|'always'|'listen', easyPitch) and save it. */
export function setSetting(k, v) {
  settings[k] = v;
  if (k === 'easyPitch') { synthCache.clear(); bc.key = null; }
  applyVolumes();
  if (saveFn) saveFn(settings);
  return settings[k];
}
export function getSettings() { return { ...settings }; }
export function setMuted(m) { settings.muted = !!m; applyVolumes(); }
export function isMuted() { return !!settings.muted; }
export function setListen(on) { st.listen = !!on; applyDuck(); }
function applyVolumes() {
  if (!N) return;
  const t = now();
  N.master.gain.setTargetAtTime(settings.muted ? 0 : 1, t, 0.02);
  N.musicVol.gain.setTargetAtTime(LEVEL.music * clamp01(settings.music), t, 0.03);
  N.sfxVol.gain.setTargetAtTime(LEVEL.sfx * clamp01(settings.sfx), t, 0.03);
  N.beaconVol.gain.setTargetAtTime(LEVEL.beacon * clamp01(settings.beacon), t, 0.03);
  applyDuck();
}
function applyDuck() {
  if (!N) return;
  const d = (st.listen ? LISTEN_DUCK_DB : 0) + (st.paused ? PAUSE_DUCK_DB : 0);
  N.duck.gain.setTargetAtTime(db(d), now(), 0.08);
}
const clamp01 = (x) => Math.max(0, Math.min(1, Number(x) || 0));

// ---------------------------------------------------------------- buffers
function seamless(buf, fadeS) {
  const sr = buf.sampleRate, n = Math.floor(fadeS * sr);
  if (buf.length < n * 3) return buf;
  const out = ac.createBuffer(buf.numberOfChannels, buf.length - n, sr);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c), o = out.getChannelData(c), L = buf.length;
    o.set(d.subarray(0, L - n));
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI / 2; o[i] = d[i] * Math.sin(a) + d[L - n + i] * Math.cos(a); }
  }
  return out;
}
// [issue 14] a file's bytes, fetched once (before the AudioContext exists too); dropped once decoded
function fetchBytes(url, priority) {
  if (!bytes.has(url)) {
    bytes.set(url, fetch(url, priority ? { priority } : undefined) // [art] sfx 'low': a room's art goes first on a slow line
      .then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.arrayBuffer(); })
      .catch((e) => { bytes.delete(url); throw e; }));
  }
  return bytes.get(url);
}
async function fetchDecode(url, priority) {
  const data = await fetchBytes(url, priority);
  bytes.delete(url); // decodeAudioData takes the buffer: a later load fetches again (from the HTTP cache)
  return await new Promise((res, rej) => { const p = ac.decodeAudioData(data, res, rej); if (p && p.then) p.then(res, rej); });
}
// [issue 14] Music first: the track (the title's) is fetched now, the effects every room uses after it.
let warmed = false;
export function warm(track = 'title') {
  if (warmed) return; warmed = true;
  const done = () => { warmSfx(); };
  if (typeof fetch === 'undefined') return;
  fetchBytes(MUSIC_DIR + track + '.mp3').then(done, done);
}
let sfxWarm = false;
function warmSfx() { if (!sfxWarm) { sfxWarm = true; needSfx(sfxFirst()); } }
/** Fetch (and, once audio is unlocked, decode) these effects ahead of need; unknown names are ignored. */
export function needSfx(names, priority = 'low') {
  if (typeof fetch === 'undefined') return;
  for (const name of names || []) {
    if (sfx.asked.has(name) || !SFX_NAMES.includes(name)) continue;
    sfx.asked.add(name);
    fetchBytes(SFX_DIR + name + '.mp3', priority).catch((e) => { sfx.asked.delete(name); console.warn('sfx', name, e.message); });
    if (ac) decodeSfx(name);
  }
}
function decodeSfx(name) {
  if (sfx.buf.has(name) || sfx.decoding.has(name)) return;
  sfx.decoding.add(name);
  fetchDecode(SFX_DIR + name + '.mp3', 'low').then((b) => {
    const isLoop = name in LOOP_DB;
    const buf = isLoop ? seamless(b, 0.3) : b;
    sfx.buf.set(name, buf);
    // loudness levelling: one-shots to a common RMS (at most +12 dB), loops use LOOP_DB
    if (!isLoop) { const d = buf.getChannelData(0); let s = 0, c = 0; for (let i = 0; i < d.length; i += 4) { if (Math.abs(d[i]) > 0.003) { s += d[i] * d[i]; c++; } } const rms = Math.sqrt(s / Math.max(1, c)) || 0.1; sfx.norm.set(name, Math.min(db(12), 0.18 / rms)); }
    if (isLoop && st.loopsWanted.includes(name)) applyLoops();
  }).catch((e) => { sfx.asked.delete(name); console.warn('sfx', name, e.message); }).finally(() => sfx.decoding.delete(name));
}
// a sound wanted before it was in: fetch it for next time (and say so under ?artcheck)
function lateSfx(name) {
  needSfx([name]);
  if (sfxCheck && !sfx.late.has(name)) { sfx.late.add(name); console.warn(`[sfxcheck] ${name} was played before it loaded (src/zone-sfx.js or sfxFirst() should ask for it)`); }
}
function synthBuffer(name, opts = {}) {
  const easier = !!settings.easyPitch;
  const key = `${name}|${(opts.pitch || 1).toFixed(4)}|${Math.round(opts.temp || 70)}|${opts.song || 'calling'}|${easier}|${opts.seed || ''}|${opts.chord ? 1 : 0}`;
  let b = synthCache.get(key);
  if (!b) {
    const data = opts.chord ? Chirps.renderRescueChord(opts.cricket || name, ac.sampleRate, { ...opts, easier }) : Chirps.render(name, ac.sampleRate, { ...opts, easier });
    b = ac.createBuffer(1, data.length, ac.sampleRate); b.getChannelData(0).set(data);
    if (synthCache.size > 96) synthCache.delete(synthCache.keys().next().value);
    synthCache.set(key, b);
  }
  return b;
}

// ---------------------------------------------------------------- one-shots
/**
 * Play a sound now (or at audio time opts.when): an audiogen effect (SFX_NAMES) or a synth voice
 * (chirps.js VOICES: 'house', 'alarm', 'tell', 'whoosh', ...; or a cricket id for its chirp).
 * opts: gain (linear), rate, pan (-1..1), bus ('sfx' | 'beacon' | 'music'), song, pitch, temp.
 */
export function play(name, opts = {}) {
  if (!running()) return null;
  let buf = sfx.buf.get(name), g = opts.gain ?? 1;
  if (buf) g *= (sfx.norm.get(name) || 1) * db(TRIM_DB[name] || 0);
  else if (SFX_NAMES.includes(name)) { lateSfx(name); return null; }
  else {
    const v = opts.chord ? 'chord' : Chirps.voiceFor(name);
    if (!v) return null;
    buf = synthBuffer(v, { pitch: opts.pitch, temp: opts.temp, song: opts.song, seed: opts.seed || name, chord: opts.chord, cricket: opts.cricket });
  }
  const src = ac.createBufferSource(); src.buffer = buf;
  let rate = opts.rate ?? 1;
  if (JITTER[name] && opts.rate == null) rate *= 1 + (Math.random() * 2 - 1) * JITTER[name];
  src.playbackRate.value = rate;
  const gn = ac.createGain(); gn.gain.value = g;
  src.connect(gn);
  let out = gn;
  if (opts.pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, opts.pan)); gn.connect(p); out = p; }
  out.connect(opts.bus === 'beacon' ? N.bIn : opts.bus === 'music' ? N.cut : N.sfxVol);
  const when = Math.max(now(), opts.when || 0);
  src.start(when);
  // small pool per sound: stop the oldest copy
  const list = sfx.live.get(name) || []; list.push(src);
  while (list.length > POOL) { const old = list.shift(); try { old.stop(); } catch { /* done */ } }
  sfx.live.set(name, list);
  src.onended = () => { const l = sfx.live.get(name); if (l) { const i = l.indexOf(src); if (i >= 0) l.splice(i, 1); } };
  return src;
}
// Old stub names, kept so other code keeps working.
export function sfxName(name) { return ({ jump: 'hop', item: 'item-get', pound: 'ground-pound', cling: 'wall-cling', grab: 'floss-swing', save: 'save-crack', flash: 'glow-flash', pit: 'fall' })[name] || name; }
export const sfxPlay = (name) => play(sfxName(name));
export { sfxPlay as sfx };
export function chirp(khz = 4.8) { play(khz ? 'house' : 'knock', { bus: 'sfx', pitch: khz ? khz / 4.8 : 1 }); }

/** Schedule a sound on the game clock (frame number); played by tick() with a 100 ms lookahead.
 *  For the finale (chorus voices, 'brush' beat), bosses' tells, anything rhythmic. */
export function cue(frame, name, opts = {}) { cues.push({ frame, name, opts }); }
export function clearCues() { cues = []; }
export const queuedCues = () => cues.map((c) => c.name); // [issue 14] read-only, for tools/sfx-check.mjs

// ---------------------------------------------------------------- music
function trackFor(game) {
  if (st.override) return st.override;
  if (st.screen !== 'play' || !game) return 'title';
  const room = game.room, zone = zoneInfo(game.zone);
  if (room?.def?.music) return room.def.music;
  if (game.boss) return zone?.id === 'lair' ? 'lair' : (game.boss.music || 'boss');
  if (zone?.music) return zone.music;
  const id = zone?.id || '';
  if (/^z\d\d-/.test(id) && id !== 'z00-tank') return id;
  if (id === 'carrier' || id === 'lair' || id === 'finale') return id;
  if (id === 'z00-tank') return 'title';
  return 'z01-bedroom';
}
/** Force a track ('finale', 'carrier', ...) until music(null). */
export function music(name) { st.override = name || null; wantTrack(st.override || st.want); }
function wantTrack(name) {
  if (!name || name === st.want) return;
  st.want = name;
  if (ac) startTrack(name);
}
async function loadTrack(name) {
  if (mus.decoded.has(name)) { const e = mus.decoded.get(name); e.used = performance.now(); return e.buf; }
  if (!mus.loading.has(name)) {
    mus.loading.set(name, fetchDecode(MUSIC_DIR + name + '.mp3').then((b) => {
      const buf = seamless(b, 1.5);
      mus.loading.delete(name);
      return buf;
    }).catch((e) => { mus.loading.delete(name); console.warn('music', name, e.message); return null; }));
  }
  const buf = await mus.loading.get(name);
  if (buf && st.want === name) { mus.decoded.set(name, { buf, used: performance.now() }); release(); }
  return buf;
}
// Keep only the wanted track plus the Carrier and boss tracks (if decoded), at most 3.
function release() {
  const keep = new Set([st.want, 'carrier', 'boss']);
  for (const k of [...mus.decoded.keys()]) if (!keep.has(k)) mus.decoded.delete(k);
  while (mus.decoded.size > 3) {
    const lru = [...mus.decoded.entries()].filter(([k]) => k !== st.want).sort((a, b) => a[1].used - b[1].used)[0];
    if (!lru) break; mus.decoded.delete(lru[0]);
  }
  // a fading track whose buffer was released stops now
  for (const f of mus.fading) if (!mus.decoded.has(f.name)) { try { f.src.stop(); } catch { /* */ } }
}
async function startTrack(name, instant = false) {
  const buf = await loadTrack(name);
  if (!buf || st.want !== name || !N) return;
  if (mus.cur?.name === name) return;
  const t = now(), fade = instant ? 0.3 : 1.2;
  const old = mus.cur;
  if (old) {
    old.g.gain.cancelScheduledValues(t); old.g.gain.setValueAtTime(old.g.gain.value, t); old.g.gain.linearRampToValueAtTime(0, t + fade);
    old.src.stop(t + fade + 0.05);
    mus.fading.push(old); old.src.onended = () => { mus.fading = mus.fading.filter((f) => f !== old); };
  }
  const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
  const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(db(MUSIC_DB[name] || 0), t + fade);
  src.connect(g); g.connect(N.cut); src.start(t);
  mus.cur = { name, src, g, t0: t, dur: buf.duration };
  st.carrierBeat = -1;
  release();
}

// ---------------------------------------------------------------- ambience loops
/** Ambience loops from the zone/room (zone.loops / room def `loops`), e.g. ['dryer-hum']. */
export function setLoops(names) { st.loopsWanted = [...(names || [])]; applyLoops(); }
function applyLoops() {
  if (!N) return;
  const t = now();
  for (const [name, l] of loops) if (!st.loopsWanted.includes(name)) { l.g.gain.setTargetAtTime(0, t, 0.3); l.src.stop(t + 1.5); loops.delete(name); }
  for (const name of st.loopsWanted) {
    if (loops.has(name)) continue;
    const buf = sfx.buf.get(name); if (!buf) { lateSfx(name); continue; }
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.setTargetAtTime(db(LOOP_DB[name] || 0), t, 0.4);
    src.connect(g); g.connect(N.amb); src.start(t);
    loops.set(name, { src, g });
  }
}

// ---------------------------------------------------------------- the Carrier's layered songs
/** Rescued cricket ids (and 'peeper' once the pond exists) sung on the Carrier track's 72 BPM beat. */
export function setCarrierVoices(ids) { st.carrier = [...(ids || [])]; }
function carrierLayers() {
  const cur = mus.cur;
  if (!cur || cur.name !== 'carrier' || !st.carrier.length || !running()) return;
  // decoration only: it may follow the music buffer's AudioContext time
  const beat = 60 / 72, t = now(), pos = (t - cur.t0);
  const next = Math.floor(pos / beat) + 1;
  if (next <= st.carrierBeat) return;
  const when = cur.t0 + next * beat;
  if (when - t > 0.25) return;
  st.carrierBeat = next;
  // one voice per beat, cycling through 8-beat bars; each rescued cricket owns a beat
  const slot = next % 8, id = st.carrier[slot];
  if (id) play(Chirps.CHORUS[id] || id, { when, gain: 0.3, bus: 'music', pitch: Chirps.individualPitch(id), seed: id });
}

// ---------------------------------------------------------------- game events
const FX = {
  jump: 'hop', flutter: 'hop', walljump: 'wall-jump', superjump: 'rubber-band-twang',
  kick: 'kick', bonk: 'bonk', clonk: 'clonk', hurt: 'hurt', item: 'item-get', pound: 'ground-pound',
  cling: 'wall-cling', grab: 'floss-swing', fling: 'whoosh', release: 'whoosh', flash: 'glow-flash',
  save: 'save-crack', swap: 'swap-puff', pit: 'fall', chirpEmpty: 'thunk', useNothing: 'thunk',
  checkpoint: 'ping', dash: 'swish', wallrun: 'swish', dazed: 'ring', crumb: 'crumb', hide: 'crinkle',
  unhide: 'crinkle', unlock: 'unlock', heart: 'seed-heart', die: 'fall',
  // [mech] engine mechanics and enemies (src/mechanics.js, src/enemies.js)
  spring: 'pillow-bonk', steam: 'steam', updraft: 'whoosh', switch: 'clonk', dig: 'crinkle', door: 'hinge-creak',
  sentBack: 'whoosh', scatter: 'whoosh', startle: 'swish', stink: 'splat', split: 'pillow-bonk', crumbleStart: 'crinkle',
  cloak: 'crinkle', uncloak: 'crinkle', // [builder C] the Cellophane Cloak
  shove: 'clonk', duet: 'chime', // [fixer] Duo's shove, Chip's duet
};
// [issue 14] The recorded effect (SFX_NAMES) or synth voice an fx event plays, or null: what onFx
// below plays, for tools/sfx-check.mjs (keep the two in step).
export function fxSound(e) {
  const d = e.d || {};
  switch (e.type) {
    case 'leap': return 'rubber-band-twang';
    case 'crumble': return 'crinkle';
    case 'decoy': return d.voice || null;
    case 'sfx': return d.name || null;
    case 'chirp': case 'tell': case 'tailSweep': case 'tap': case 'rescue': case 'note': return null; // synthesized
    default: return FX[e.type] || (e.type === 'land' ? 'land' : null);
  }
}
function onFx(e, game) {
  const d = e.d || {};
  switch (e.type) {
    case 'leap': play('rubber-band-twang', { rate: 0.7, gain: 0.8 }); break; // Hump's leap: the twang pitched down
    case 'land': play('land', { gain: d.hard ? 1 : 0.45 }); break;
    case 'crumble': if (!st._crumbleF || st._crumbleF !== e.f) { st._crumbleF = e.f; play('crinkle', { gain: 1.4, rate: 0.8 }); } break;
    case 'chirp': { // your own chirp (the active cricket's voice), then the trapped cricket answers a beat later
      const id = d.id || game.player.id;
      play(Chirps.CRICKET_VOICE[id] || 'house', { pitch: Chirps.individualPitch(id), seed: id, temp: 70, gain: 0.8 });
      callAnswer(e.f, game);
      break;
    }
    // a gecko's tell: the same rattle-swish for every gecko, panned to it (boss modules: game.emit('tell', {x, y}))
    case 'tell': case 'tailSweep': play(e.type === 'tell' ? 'tell' : 'sweep', { pan: d.x != null ? (d.x - game.player.cx) / 600 : 0 }); break;
    case 'tap': play('knock', { seed: 'hump', gain: 0.9 }); callAnswer(e.f, game); break;
    case 'rescue': play('sting', { gain: 0.8 }); play('rescue', { chord: true, cricket: d.cricket, gain: 0.9, when: running() ? now() + 0.35 : 0 }); break;
    // [mech] decoys are timed by the sim (mechanics.js: zone.decoys, room decoys, {type:'decoy'}); positional here
    case 'decoy': {
      bc.decoyHist.push(e.f ?? game.frame); // [final-S] the rhythm strip shows decoys too (grey)
      if (d.far) { play(d.voice, { gain: 0.15 }); break; }
      const p = game.player, dist = Math.hypot(d.x - p.cx, d.y - p.cy);
      play(d.voice, { gain: Math.max(0.15, 1 - dist / 1600) * 0.8, pan: Math.max(-0.8, Math.min(0.8, (d.x - p.cx) / 600)) });
      break;
    }
    // [builder C] any named sound from sim code (bosses): game.emit('sfx', {name, gain, rate, pitch})
    case 'sfx': play(d.name, { gain: d.gain ?? 1, rate: d.rate, pitch: d.pitch, pan: d.x != null ? Math.max(-0.8, Math.min(0.8, (d.x - game.player.cx) / 600)) : 0 }); break;
    case 'note': play('chime', { pitch: [1, 1.122, 1.26, 1.335, 1.498, 1.682, 1.888, 2][d.i % 8], gain: 0.7 }); break; // piano keys: a major scale
    default: if (FX[e.type]) play(FX[e.type]);
  }
}
function callAnswer(f, game) {
  if (!bc.spec) return;
  bc.answerAt = f + BEAT;
  bc.ripplesUntil = f + RIPPLE_FRAMES;
  cues.push({ frame: bc.answerAt, name: '__answer' });
  // keep the next regular chirp clear of the answer
  for (const tl of bc.timelines) if (tl.next < bc.answerAt + 30 && tl.next > f) tl.next = bc.answerAt + 30;
}
function roomChanged(game) {
  const room = game.room, zone = zoneInfo(game.zone);
  const loops = [...(room?.def?.loops || zone?.loops || [])];
  if ((game.enemies || []).some((e) => e.type === 'vacuum') && !loops.includes('vacuum')) loops.push('vacuum'); // [mech] the robot vacuum hums
  setLoops(loops);
  // decoys moved to the sim (src/mechanics.js emits 'decoy' events on the game clock)
}

// ---------------------------------------------------------------- the fixed-step hook
/** Call once per fixed step while playing (main.js). Reads the game; never changes it. */
export function tick(game) {
  if (!game) return;
  if (bc.game !== game) { // a fresh game (New Game, Continue, goToRoom): its clock starts again
    bc.game = game; bc.key = null; bc.room = null; bc.pulses = []; bc.lastPulse = -999; bc.answerAt = null; bc.ripplesUntil = -1; bc.hist = []; bc.decoyHist = [];
    bc.decoyKey = null; cues = []; st.lastFxObj = null;
  }
  const f = game.frame; bc.frame = f;
  // effect events since the last tick (game.fx is a rolling list of {type, d, f})
  const fx = game.fx; let start = 0;
  if (st.lastFxObj) { const i = fx.lastIndexOf(st.lastFxObj); start = i >= 0 ? i + 1 : fx.findIndex((e) => e.f >= f); if (start < 0) start = fx.length; }
  for (let i = start; i < fx.length; i++) onFx(fx[i], game);
  if (fx.length) st.lastFxObj = fx[fx.length - 1];
  if (bc.room !== game.room) { bc.room = game.room; roomChanged(game); }
  // glide and raft have no events: watch the player
  const p = game.player;
  if (p.gliding && !st.glide) play('glide-whoosh'); st.glide = !!p.gliding;
  if (p.onRaft && !st.raft) play('raft-splash'); st.raft = !!p.onRaft;
  setListen(p.listening);
  wantTrack(trackFor(game));
  updateBeacon(game);
  // cues (game clock, 100 ms lookahead)
  if (cues.length) {
    const due = cues.filter((c) => c.frame <= f + LOOKAHEAD);
    if (due.length) {
      cues = cues.filter((c) => c.frame > f + LOOKAHEAD);
      for (const c of due) {
        if (c.frame < f - LOOKAHEAD) continue; // too late: drop
        if (c.name === '__answer') { answer(c.frame); continue; }
        play(c.name, { ...c.opts, when: atFrame(c.frame) });
      }
    }
  }
}
// [issue 11] The game was rewound (main.js, debug): the sounds that were playing stop (scheduled ones
// too), nothing from the restored fx list plays again, the beacon's song restarts on the game clock
// and the room's ambience loops are set again.
export function rewound(game) {
  for (const list of sfx.live.values()) for (const s of list) { try { s.stop(); } catch { /* done */ } }
  sfx.live.clear();
  cues = [];
  st.lastFxObj = game.fx.length ? game.fx[game.fx.length - 1] : null;
  bc.key = null; bc.spec = null; bc.pulses = []; bc.answerAt = null; bc.ripplesUntil = -1; bc.room = null; bc.lastPulse = -999;
  bc.hist = bc.hist.filter((f) => f <= game.frame); bc.decoyHist = bc.decoyHist.filter((f) => f <= game.frame);
  st.glide = !!game.player.gliding; st.raft = !!game.player.onRaft;
}
const atFrame = (fr) => (ac ? now() + Math.max(0, fr - bc.frame) / 60 + 0.02 : 0);

function updateBeacon(game) {
  const spec = beaconSpec(game);
  const key = spec ? `${spec.zone}|${spec.phase}|${spec.target.room}|${spec.voices}|${settings.easyPitch}` : null;
  if (key !== bc.key) {
    bc.key = key; bc.spec = spec; bc.count = 0;
    bc.timelines = spec ? spec.voices.map((v, i) => ({ voice: v, next: game.frame + 30 + i * 37, n: 0 })) : [];
    st.cutHz = spec ? Chirps.pitchOf(spec.voice, { pitch: spec.pitch, easier: settings.easyPitch }) : null;
    if (N) {
      N.cut.gain.setTargetAtTime(st.cutHz ? CUT_DB : 0, now(), 0.1);
      if (st.cutHz) N.cut.frequency.setTargetAtTime(Math.min(st.cutHz, 18000), now(), 0.05);
    }
  }
  if (!spec) { bc.m = null; return; }
  const m = measure(game, spec); bc.m = m;
  const p = game.player;
  // gain, low-pass (closes to 1.25x the voice's pitch at the far side), reverb, pan
  const hz = st.cutHz || 4800;
  const fc = Math.exp(Math.log(18000) + (Math.log(Math.min(18000, hz * 1.25)) - Math.log(18000)) * m.frac);
  const wet = 0.08 + 0.5 * m.frac, dry = 1 - 0.35 * m.frac;
  const pan = Math.max(-0.85, Math.min(0.85, (m.waypoint.x - p.cx) / 520));
  const gDb = p.listening ? listenGainDb(m, p, LISTEN_BOOST_DB) : m.gainDb; // [fixer] listen range (big ears, Pip)
  m.cutoff = Math.round(fc); m.reverbWet = +wet.toFixed(3); m.pan = +pan.toFixed(3); m.listenDb = gDb;
  if (N) {
    const t = now();
    N.bIn.gain.setTargetAtTime(db(gDb), t, 0.12);
    N.bLpf.frequency.setTargetAtTime(fc, t, 0.12);
    N.bWet.gain.setTargetAtTime(wet, t, 0.2); N.bDry.gain.setTargetAtTime(dry, t, 0.2);
    if (N.bPan.pan) N.bPan.pan.setTargetAtTime(pan, t, 0.12);
  }
  // the calling song, on the game clock
  const f = game.frame, temp = spec.temp;
  for (const [i, tl] of bc.timelines.entries()) {
    while (tl.next <= f + LOOKAHEAD) {
      const at = tl.next;
      if (at >= f - LOOKAHEAD) {
        if (i === 0 && settings.beaconChirps !== 'call') bc.pulses.push(at);
        if (settings.beaconChirps === 'always') play(tl.voice, { bus: 'beacon', when: atFrame(at), pitch: spec.pitch, temp, seed: `${spec.cricket}:${tl.voice}` });
      }
      tl.n++;
      tl.next = at + Math.max(6, Math.round(Chirps.songInterval(tl.voice, temp, `${spec.cricket}:${tl.n}`) * 60));
    }
  }
  while (bc.pulses.length && bc.pulses[0] <= f) { bc.lastPulse = bc.pulses.shift(); bc.hist.push(bc.lastPulse); } // [final-S] history: the HUD's rhythm strip
  while (bc.hist.length && bc.hist[0] < f - 300) bc.hist.shift();
  while (bc.decoyHist.length && bc.decoyHist[0] < f - 300) bc.decoyHist.shift();
  if (bc.pulses.length > 32) bc.pulses.splice(0, bc.pulses.length - 32);
}
function answer(frame) {
  const spec = bc.spec; if (!spec) return;
  bc.pulses.push(frame); bc.pulses.sort((a, b) => a - b);
  if (settings.beaconChirps !== 'off') play(spec.voice, { bus: 'beacon', when: atFrame(frame), song: 'rivalry', pitch: spec.pitch, temp: spec.temp, seed: `${spec.cricket}:answer` });
}

// ---------------------------------------------------------------- the per-render-frame hook
/** Call every animation frame from main.js: screen changes, pause duck, Carrier layers, the indicator. */
export function frame({ screen, paused, game } = {}) {
  if (screen && screen !== st.screen) { st.screen = screen; if (screen !== 'play') { bc.key = null; bc.spec = null; bc.m = null; setLoops([]); } }
  if (!!paused !== st.paused) { st.paused = !!paused; applyDuck(); }
  if (st.screen !== 'play') wantTrack(trackFor(null));
  else if (game && !st.want) wantTrack(trackFor(game));
  carrierLayers();
  drawIndicator(st.screen === 'play' && !st.paused ? game : null);
}

// ---------------------------------------------------------------- the chirp indicator
/**
 * Data for the HUD's chirp indicator (design "Beacon options"):
 * {show, angle (radians, screen space, 0 = right), dx, dy (unit vector), loudness 0..1,
 *  pulse 0..1 (1 at each chirp, fading in ~0.25 s), lastChirpFrame, nextChirpFrame,
 *  answerFrame, ripples (true for 4 s after a call), mode, enabled}.
 */
export function indicator(game) {
  const m = bc.m, spec = bc.spec;
  if (!m || !spec) return { show: false, enabled: true, mode: settings.beaconChirps };
  const p = game?.player;
  const dx0 = p ? m.waypoint.x - p.cx : 1, dy0 = p ? m.waypoint.y - p.cy : 0, len = Math.hypot(dx0, dy0) || 1;
  const listenDb = p?.listening ? listenGainDb(m, p, LISTEN_BOOST_DB) - m.gainDb : 0; // [fixer] listen range
  const nextT = bc.timelines[0]?.next ?? null;
  return {
    show: true, enabled: true, mode: settings.beaconChirps,
    angle: Math.atan2(dy0, dx0), dx: dx0 / len, dy: dy0 / len,
    loudness: Math.max(0, Math.min(1, (m.gainDb + listenDb - FLOOR_DB) / -FLOOR_DB)),
    pulse: bc.frame >= bc.lastPulse ? Math.exp(-(bc.frame - bc.lastPulse) / 9) : 0,
    lastChirpFrame: bc.lastPulse, nextChirpFrame: settings.beaconChirps === 'call' ? null : nextT,
    answerFrame: bc.answerAt, ripples: bc.frame < bc.ripplesUntil, voice: spec.voice, hz: st.cutHz,
    frame: bc.frame, history: bc.hist.slice(), decoys: bc.decoyHist.slice(), // [final-S] the rhythm strip
  };
}
// A minimal default indicator (an ear at the screen edge), drawn only if the HUD has none:
// the UI can take over by creating its own element with id "chirp-indicator" (then this one hides)
// or by setting window.__customChirpIndicator = true and calling indicator() itself.
let indEl = null;
function drawIndicator(game) {
  if (typeof document === 'undefined') return;
  const custom = globalThis.__customChirpIndicator || (document.getElementById('chirp-indicator') && document.getElementById('chirp-indicator') !== indEl);
  const d = game && !custom ? indicator(game) : null;
  if (!indEl) {
    if (!d || !d.show) return;
    const stage = document.getElementById('stage') || document.body;
    indEl = document.createElement('div'); indEl.id = 'chirp-indicator-default'; indEl.setAttribute('aria-hidden', 'true');
    indEl.style.cssText = 'position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;pointer-events:none;z-index:5;transition:opacity .2s;';
    indEl.innerHTML = '<svg viewBox="-22 -22 44 44" width="44" height="44"><g class="arrow"><path d="M15 0 L7 -6 L7 6 Z" fill="#E8B85A" opacity=".9"/></g>'
      + '<circle r="11" fill="rgba(42,32,26,.72)" stroke="#E8B85A" stroke-width="2"/>'
      + '<path d="M-3 6 C-7 2 -6 -7 1 -7 C6 -7 7 -2 4 1 C2 3 1 4 1 6 C1 8 -2 8 -3 6 Z" fill="none" stroke="#F4EBDD" stroke-width="1.8" stroke-linecap="round"/></svg>';
    stage.append(indEl);
  }
  if (!d || !d.show || !d.enabled) { indEl.style.opacity = '0'; return; }
  const x = 50 + d.dx * 45, y = 50 + d.dy * 40;
  indEl.style.left = Math.max(4, Math.min(96, x)) + '%'; indEl.style.top = Math.max(8, Math.min(92, y)) + '%';
  const s = 0.75 + 0.45 * d.loudness + 0.25 * d.pulse;
  indEl.style.transform = `scale(${s.toFixed(3)})`;
  indEl.style.opacity = (0.45 + 0.5 * Math.max(d.pulse, d.loudness * 0.6)).toFixed(2);
  indEl.querySelector('.arrow').setAttribute('transform', `rotate(${(d.angle * 180 / Math.PI).toFixed(1)})`);
}

// ---------------------------------------------------------------- debug hook
export function audioState() {
  return {
    context: ac ? ac.state : 'none', muted: !!settings.muted,
    musicMuted: !!settings.muted || !(settings.music > 0), sfxMuted: !!settings.muted || !(settings.sfx > 0),
    beaconMuted: !!settings.muted || !(settings.beacon > 0) || settings.beaconChirps === 'off',
    volumes: { music: settings.music, sfx: settings.sfx, beacon: settings.beacon },
    gains: N ? { master: +N.master.gain.value.toFixed(3), music: +N.musicVol.gain.value.toFixed(3), sfx: +N.sfxVol.gain.value.toFixed(3), beacon: +N.beaconVol.gain.value.toFixed(3), duck: +N.duck.gain.value.toFixed(3) } : null,
    beaconChirps: settings.beaconChirps, ear: settings.ear, easyPitch: !!settings.easyPitch,
    track: mus.cur?.name || null, wantTrack: st.want, decoded: mus.decoded.size, decodedTracks: [...mus.decoded.keys()],
    listenDuck: st.listen, duckDb: (st.listen ? LISTEN_DUCK_DB : 0) + (st.paused ? PAUSE_DUCK_DB : 0), paused: st.paused,
    cutHz: st.cutHz ? Math.round(st.cutHz) : null, cutDb: st.cutHz ? CUT_DB : 0, cutQ: CUT_Q,
    loops: [...loops.keys()], sfxLoaded: sfx.buf.size, sfxAsked: sfx.asked.size, sfxLate: [...sfx.late], cues: cues.length,
  };
}
export function beaconState() {
  const s = bc.spec, m = bc.m;
  if (!s) return { target: null, phase: null, gain: null };
  return {
    target: { room: s.target.room, x: s.target.tx, y: s.target.ty }, phase: s.phase, voice: s.voice, voices: s.voices,
    hz: st.cutHz ? Math.round(st.cutHz) : null, temp: Math.round(s.temp),
    pathDist: m?.pathDist ?? null, maxDist: m?.maxDist ?? null,
    gain: m ? +m.gainDb.toFixed(2) : null, gainWithListen: m ? +m.listenDb.toFixed(2) : null,
    cutoff: m?.cutoff ?? null, pan: m?.pan ?? null, reverbWet: m?.reverbWet ?? null,
    nextExit: m && !m.sameRoom ? { x: Math.round(m.waypoint.x), y: Math.round(m.waypoint.y) } : null,
    mode: settings.beaconChirps, nextChirpFrame: bc.timelines[0]?.next ?? null, answerFrame: bc.answerAt,
  };
}
/**
 * Render one song through an OfflineAudioContext and return its samples, for the FFT check.
 * species: a cricket id ('pip'), a voice ('house', 'alarm', 'peeper', 'chikchak', 'tell'), or 'rescue'.
 * opts: song ('calling' | 'rivalry'), temp (F), pitch, easier.
 */
export async function renderChirp(species = 'house', opts = {}) {
  const sr = 44100;
  const voice = species === 'rescue' ? 'house' : Chirps.voiceFor(species);
  if (!voice) return null;
  const o = { temp: 77, seed: voice, easier: !!(opts.easier ?? settings.easyPitch), ...opts };
  const data = species === 'rescue' ? Chirps.renderRescueChord(opts.cricket || 'pip', sr, o) : Chirps.render(voice, sr, o);
  let samples = data;
  const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (OAC) {
    const oc = new OAC(1, data.length, sr);
    const b = oc.createBuffer(1, data.length, sr); b.getChannelData(0).set(data);
    const src = oc.createBufferSource(); src.buffer = b; src.connect(oc.destination); src.start();
    samples = (await oc.startRendering()).getChannelData(0);
  }
  return { species, voice, sampleRate: sr, hz: Math.round(Chirps.pitchOf(voice, o)), durationMs: Math.round(samples.length / sr * 1000), samples: Array.from(samples, (x) => Math.round(x * 1e5) / 1e5) };
}
