#!/usr/bin/env node
// [issue 30] A contact sheet of every Duchess pose and frame drawn by the real rig (src/geckos.js) with its
// code tail, at her drawn size in the tank (400 px nose to tail, facing right as in the chase) and at 2x
// below each, on the sand colour: to look at the tail joins (one tail, at the hips, in every pose).
//   node tools/gecko-tail-sheet.mjs <out.png> [--url http://127.0.0.1:8131/] [--session s]
// Needs the game served (python3 .../serve.py <port> game).
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; };
const url = opt('--url', 'http://127.0.0.1:8131/'), session = opt('--session', 'tailsheet');
const out = args[0] || path.join(root, '.gamegen', 'tail-sheet.png');
const cli = (...a) => execFileSync('playwright-cli', [`-s=${session}`, ...a], { cwd: root, encoding: 'utf8', maxBuffer: 256 << 20, timeout: 300000 });
const code = `async page => {
  await page.goto(${JSON.stringify(url)});
  await page.waitForFunction(() => window.__game, null, { timeout: 60000 });
  return await page.evaluate(async () => {
    const G = await import('./src/geckos.js');
    G.preload('duchess');
    for (let i = 0; i < 200 && !G.ready('duchess'); i++) await new Promise((r) => setTimeout(r, 50));
    const meta = G.anims('duchess');
    const poses = [['idle'], ['walk'], ['sleep'], ['strike']];
    for (const [a, l] of Object.entries(meta)) l.forEach((_, i) => poses.push([a, i]));
    const cw = 900, ch = 470, cols = 3, rows = Math.ceil(poses.length / cols);
    const cv = document.createElement('canvas'); cv.width = cw * cols; cv.height = ch * rows;
    const c = cv.getContext('2d');
    c.fillStyle = '#D9C29A'; c.fillRect(0, 0, cv.width, cv.height);
    poses.forEach(([p, i], k) => {
      const x0 = (k % cols) * cw, y0 = Math.floor(k / cols) * ch;
      const rig = G.create('duchess', { autoTick: false });
      rig.t = 0.6; rig.phase = 1.2; rig.breathe = false;
      if (i == null) rig.setPose(p); else rig.hold(p, i);
      c.strokeStyle = 'rgba(90,70,50,0.35)'; c.strokeRect(x0 + 0.5, y0 + 0.5, cw - 1, ch - 1);
      c.fillStyle = '#3A2A1C'; c.font = '16px sans-serif'; c.fillText(i == null ? p : p + ' ' + i, x0 + 8, y0 + 20);
      const s = rig.scaleFor(400);
      rig.draw(c, x0 + 230, y0 + 150, s, 1);           // her drawn size in the tank
      rig.draw(c, x0 + 470, y0 + 450, s * 2, 1);       // and 2x
    });
    return cv.toDataURL('image/png');
  });
}`;
try { cli('close'); } catch { /* not open */ }
cli('open', url);
let res = '';
try { res = cli('run-code', code); } finally { try { cli('close'); } catch { /* gone */ } }
const data = res.split('### Result')[1]?.split('###')[0]?.trim();
const b64 = JSON.parse(data).split(',')[1];
writeFileSync(out, Buffer.from(b64, 'base64'));
console.log('wrote', out);
