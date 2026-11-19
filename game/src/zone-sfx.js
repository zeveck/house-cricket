// [issue 14] The sound effects a zone needs beyond the ones every room uses (audio.js sfxFirst()):
// its ambience loops (ZONE_INFO loops, room `loops`, a robot vacuum's hum), its decoys' voices
// (zone and room `decoys`, decoy entities) and its gecko fights' sounds (each boss module's `sfx`).
// main.js asks audio.js for them when room-art.js's gate loads a zone's art (on entering it, for
// the neighbouring rooms' zones, for rooms loaded ahead), so they are in before they are heard.
// tools/sfx-check.mjs replays every solution and checks no effect is played outside these lists.
//
//   zoneSfx(zone) -> ['dryer-hum', 'gecko-growl', ...]   (zone: a data/rooms zone, as room.zone)
//   CHASE_SFX     [issue 25] the opening chase's effects (loaded with the tank)
//   SONG_SFX      the song book's recorded voices (screens.js soundsTab: asked for when it opens)
import { BOSSES } from './bosses/index.js';
import { SFX_NAMES, ZONED_SFX } from './audio.js';
import { info as zoneInfo } from './beacon.js';

export const CHASE_SFX = ['gecko-skitter', 'pounce-land', 'gulp', 'relief-sting'];
export const SONG_SFX = { soot: 'swift-chitter', velvet: 'bat-squeaks', tokay: 'bigtok-bellow' };

const memo = new WeakMap();
export function zoneSfx(zone) {
  if (!zone) return [];
  if (memo.has(zone)) return memo.get(zone);
  const out = new Set();
  const voices = (list) => { for (const d of list || []) if (d?.voice) out.add(d.voice); };
  for (const n of zoneInfo(zone).loops || []) out.add(n);
  voices(zone.decoys);
  for (const r of zone.rooms || []) {
    for (const n of r.loops || []) out.add(n);
    voices(r.decoys);
    for (const e of r.entities || []) {
      if (e.type === 'decoy') out.add(e.voice);
      else if (e.type === 'vacuum') out.add('vacuum');
      else if (e.type === 'boss') for (const n of BOSSES[e.boss]?.sfx || []) out.add(n);
    }
  }
  // [issue 25] the opening chase in the tank: Duchess's feet, her landing, the gulp and the escape's sting
  if (zone.id === 'z00-tank') for (const n of CHASE_SFX) out.add(n);
  // only the recorded effects (voices like 'alarm' are synthesized), and only the zoned ones (the rest load at start)
  const list = [...out].filter((n) => SFX_NAMES.includes(n) && ZONED_SFX.includes(n)).sort();
  memo.set(zone, list);
  return list;
}
