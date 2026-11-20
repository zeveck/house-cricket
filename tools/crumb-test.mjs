#!/usr/bin/env node
// Source-integrated tests for the first-crumb tutorial and the HUD's help text (#33).
import assert from 'node:assert/strict';
import test from 'node:test';
import { MetaRun } from '../game/src/meta-run.js';
import { fresh } from '../game/src/meta.js';
import * as Save from '../game/src/save.js';

function fixture(meta = fresh(), ents = [{ type: 'crumbs', key: 'cache1', px: 0, py: 0, n: 5 }]) {
  const toasts = [], saved = [], sounds = [];
  const g = {
    meta, frame: 1, fx: [], room: { id: 'test-room' }, zone: { id: 'test-zone', n: 1 },
    player: { x: 0, y: 0, w: 20, h: 20, cx: 10, cy: 10, vx: 0, listening: false,
      items: new Set(), trio: ['pip'], active: 0, maxHealth: 3 },
    metaEnts: ents, doors: [], mech: {}, roomState: {}, inCarrier: false,
    rescued: new Set(), recruits: new Set(), visited: new Set(), playFrames: 0,
    rs(id) { return this.roomState[id] ||= { broken: new Set(), taken: new Set() }; },
    emit(type, d) { this.fx.push({ type, d, f: this.frame }); },
  };
  const A = { game: g, ui: { screen: null }, dialog: { active: false }, toast: t => toasts.push(t),
    sfx: s => sounds.push(s), autosave: () => saved.push(JSON.parse(JSON.stringify(g.meta))), indicator: () => null };
  const runner = new MetaRun(A);
  return { g, A, runner, toasts, saved, sounds };
}
function tick(x) { x.runner.step({ held: {}, pressed: {} }); x.g.frame++; }

const firstCopy = 'A crumb! Hang on to these: someone in this house trades for them.';

test('first floor cache explains crumbs exactly once and records it in game.meta', () => {
  const x = fixture();
  tick(x);
  assert.equal(x.g.meta.crumbs, 5);
  assert.deepEqual([...x.g.rs('test-room').taken], ['cache1']);
  assert.equal(x.g.meta.flags.crumbHintShown, true);
  assert.equal(x.toasts.filter(t => t === firstCopy).length, 1);
  assert.equal(x.saved.length, 1);
  tick(x);
  assert.equal(x.g.meta.crumbs, 5, 'same cache cannot be collected twice');
  x.g.metaEnts.push({ type: 'crumbs', key: 'cache2', px: 0, py: 0, n: 7 });
  tick(x);
  assert.equal(x.g.meta.crumbs, 12);
  assert.equal(x.toasts.filter(t => t === firstCopy).length, 1);
});

test('scripted crumb awards and hidden crumb secrets both run the one-time help path', () => {
  const scripted = fixture(fresh(), []);
  scripted.runner.event('crumbs', { n: 3 });
  scripted.runner.event('crumbs', { n: 2 });
  assert.equal(scripted.g.meta.crumbs, 5);
  assert.equal(scripted.toasts.filter(t => t === firstCopy).length, 1);

  const secret = fixture(fresh(), []);
  secret.runner.event('secret', { id: 'bed-crumbs-slipper' });
  assert.equal(secret.g.meta.crumbs, 15);
  assert.equal(secret.g.meta.flags.crumbHintShown, true);
  assert.equal(secret.toasts.filter(t => t === firstCopy).length, 1);
  assert.equal(secret.g.meta.secrets.length, 1);
  secret.runner.event('secret', { id: 'bed-crumbs-slipper' });
  assert.equal(secret.g.meta.crumbs, 15);
});

test('first-crumb tutorial survives real save serialization, and starts fresh in another slot', () => {
  const x = fixture(); tick(x);
  const raw = Save.fromGame(x.g);
  assert.equal(raw.meta.flags.crumbHintShown, true);
  const store = new Map();
  const previous = globalThis.localStorage;
  globalThis.localStorage = { getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k) };
  try {
    assert.equal(Save.writeSlot(1, raw), true);
    const saved = Save.readSlot(1);
    assert.equal(saved.meta.flags.crumbHintShown, true);
    const resumed = fixture(saved.meta);
    resumed.runner.event('crumbs', { n: 1 });
    assert.equal(resumed.toasts.filter(t => t === firstCopy).length, 0);
    const otherSlot = fixture(fresh()); tick(otherSlot);
    assert.equal(otherSlot.toasts.filter(t => t === firstCopy).length, 1);
  } finally { if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous; }
});

test('crumb HUD labels explain the counter before and after meeting Rolo', async () => {
  const { UI } = await import('../game/src/ui.js');
  const classes = () => {
    const values = new Set();
    return { contains: x => values.has(x), add: (...xs) => xs.forEach(x => values.add(x)),
      remove: (...xs) => xs.forEach(x => values.delete(x)),
      toggle: (x, enabled) => { if (enabled === undefined ? !values.has(x) : enabled) values.add(x); else values.delete(x); } };
  };
  const element = () => ({ classList: classes(), hidden: true, title: '', attrs: {},
    lastChild: { textContent: '' }, setAttribute(k, v) { this.attrs[k] = v; } });
  const ui = Object.create(UI.prototype);
  ui.crumbs = element(); ui.thermo = element(); ui.earDock = element(); ui.indicator = element(); ui.strip = element();
  const base = { crumbs: 5, rolo: false, temp: null, ear: null, beacon: null };
  ui.updateMetaHUD(base);
  assert.equal(ui.crumbs.lastChild.textContent, '5');
  assert.match(ui.crumbs.title, /someone in this house trades/);
  assert.match(ui.crumbs.attrs['aria-label'], /^5 crumbs\./);
  ui.updateMetaHUD({ ...base, crumbs: 8, rolo: true });
  assert.equal(ui.crumbs.lastChild.textContent, '8');
  assert.match(ui.crumbs.title, /Rolo's Crumb Shop/);
  assert.match(ui.crumbs.attrs['aria-label'], /^8 crumbs\./);
});

test('first duet reward saves its song and crumb hint, without repeating them on reload', () => {
  const x = fixture(fresh(), []);
  x.runner.event('secret', { id: 'stu-duet' });
  assert.equal(x.g.meta.crumbs, 100);
  assert.ok(x.g.meta.songs.includes('finale'), 'duet song unlocks with the crumb award');
  assert.equal(x.g.meta.flags.crumbHintShown, true);
  assert.equal(x.toasts.filter(t => t === firstCopy).length, 1);
  assert.equal(x.saved.length, 1, 'autosave happens after the song and secret are recorded');
  assert.ok(x.saved[0].songs.includes('finale'));
  assert.ok(x.saved[0].secrets.includes('stu-duet'));

  const resumed = fixture(x.saved[0], []);
  resumed.runner.event('secret', { id: 'stu-duet' });
  assert.equal(resumed.g.meta.crumbs, 100, 'the same duet cannot be awarded twice');
  resumed.runner.event('secret', { id: 'att-duet' });
  assert.equal(resumed.g.meta.crumbs, 250);
  assert.equal(resumed.toasts.filter(t => t === firstCopy).length, 0,
    'subsequent duet rewards should not repeat the one-time explanation');
});
