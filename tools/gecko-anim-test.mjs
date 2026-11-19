#!/usr/bin/env node
// Headless check of the geckos' frame animations (issue #26, Duchess's run/pounce/wake/tongue):
// every frame in a meta.json "anims" exists as a built WebP (and its PNG source in art/), has its
// placement (at, size), a tail pivot inside its picture's height and an eye; the rig's files() list
// (what preload() loads) includes every one; the frame picker loops, holds and clamps; geckos
// without anims are unchanged.                          node tools/gecko-anim-test.mjs
import { readFileSync, existsSync } from 'node:fs';
import { NAMES, files, ANIMS, GeckoRig } from '../game/src/geckos.js';
import { ASSET_FILES } from '../game/data/assets.js';

let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) pass++; else { fail++; console.log('  FAIL', label); } };
const root = new URL('../', import.meta.url).pathname;
const have = new Set(ASSET_FILES);

let withAnims = 0;
for (const name of NAMES) {
  const meta = JSON.parse(readFileSync(`${root}game/assets/sprites/geckos/${name}/meta.json`, 'utf8'));
  const list = files(name);
  // the rig's own pieces are still listed, idle/portrait still left out
  ok(list.includes(`sprites/geckos/${name}/body.webp`), `${name}: files() lists body.webp`);
  ok(!list.some((f) => /\/(idle|portrait)\.webp$/.test(f)), `${name}: files() leaves out idle/portrait`);
  const anims = meta.anims || {};
  if (!Object.keys(anims).length) {
    ok(!list.some((f) => f.includes('/anim/')), `${name}: no anims, no anim files`);
    continue;
  }
  withAnims++;
  for (const [anim, frames] of Object.entries(anims)) {
    ok(ANIMS[anim], `${name}.${anim}: has a rate in ANIMS`);
    ok(frames.length >= 2, `${name}.${anim}: at least 2 frames`);
    frames.forEach((f, i) => {
      const tag = `${name}.${anim}[${i}]`;
      ok(f && f.file === `anim/${anim}/${String(i).padStart(2, '0')}.webp`, `${tag}: file name`);
      if (!f) return;
      const path = `sprites/geckos/${name}/${f.file}`;
      ok(existsSync(`${root}game/assets/${path}`), `${tag}: ${path} built`);
      ok(existsSync(`${root}art/${path.replace(/\.webp$/, '.png')}`), `${tag}: PNG source in art/`);
      ok(have.has(path), `${tag}: in data/assets.js`);
      ok(list.includes(path), `${tag}: in files() (preloaded)`);
      ok(Array.isArray(f.at) && f.at.length === 2 && Array.isArray(f.size) && f.size[0] > 0 && f.size[1] > 0, `${tag}: at/size`);
      ok(Array.isArray(f.pivot) && f.pivot.length === 2, `${tag}: has a tail pivot`);
      if (f.pivot && f.at && f.size) {
        ok(f.pivot[1] > f.at[1] && f.pivot[1] < f.at[1] + f.size[1], `${tag}: pivot inside the picture's height`);
        ok(Math.abs(f.pivot[0] - meta.pivot[0]) <= 2, `${tag}: pivot on the tail cut (x ${f.pivot[0]} vs ${meta.pivot[0]})`);
      }
      ok(Array.isArray(f.eye), `${tag}: has an eye`);
    });
    const floors = frames.map((f) => f.at[1] + f.size[1]);
    ok(Math.max(...floors) - Math.min(...floors) <= 2, `${name}.${anim}: every frame on one floor line`);
  }
  // the frame picker (no DOM needed: the rig's methods on a plain object)
  const pick = (o) => GeckoRig.prototype.animFrame.call({ meta, walkSpeed: 1, held: null, poseT: 0, ...o });
  for (const [anim, frames] of Object.entries(anims)) {
    const a = ANIMS[anim];
    ok(pick({ pose: anim, poseT: 0 }) === frames[0], `${name}.${anim}: starts on frame 0`);
    ok(pick({ pose: anim, poseT: 1 / a.fps + 1e-6 }) === frames[1], `${name}.${anim}: frame 1 after 1/fps`);
    const late = pick({ pose: anim, poseT: (frames.length + 0.5) / a.fps });
    ok(late === (a.loop ? frames[0] : frames[frames.length - 1]), `${name}.${anim}: ${a.loop ? 'loops' : 'holds its last frame'}`);
    ok(pick({ pose: anim, held: 1, poseT: 99 }) === frames[1], `${name}.${anim}: hold(1) stays on frame 1`);
  }
  ok(pick({ pose: 'idle' }) === null && pick({ pose: 'strike' }) === null, `${name}: idle/strike aren't frame animations`);
}
ok(withAnims >= 1, 'Duchess has her animations');
ok(['run', 'pounce', 'wake', 'tongue'].every((a) => JSON.parse(readFileSync(`${root}game/assets/sprites/geckos/duchess/meta.json`, 'utf8')).anims?.[a]), 'duchess: run, pounce, wake, tongue');

console.log(`gecko-anim-test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
