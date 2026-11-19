#!/usr/bin/env node
// Writes design/zones/zNN.md, lair.md and links.md (the zone builders' briefs) from the world
// bible: game/data/house.js (rooms, links, secrets, lairs), game/data/zones.js and the assets on
// disk. The per-zone flow notes below are the only hand-written part. Re-run after editing
// house.js:  node tools/gen-zone-briefs.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOMS, LINKS, SECRETS, LAIRS, RECRUITS, NOT_CRICKETS, BUILDERS, ROOM_BY_ID, DOZING } from '../game/data/house.js';
import { ZONE_INFO, PREREQ, BACKTRACK } from '../game/data/zones.js';
import { ITEMS } from '../game/data/items.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'design/zones');
fs.mkdirSync(out, { recursive: true });
const ls = (p) => { try { return fs.readdirSync(path.join(root, 'game/assets', p)).sort(); } catch { return []; } };
const lsArt = (p) => { try { return fs.readdirSync(path.join(root, 'art', p)).sort(); } catch { return []; } }; // [issue 14] terrain swatches are sources only
const PROPS = ls('props').map((f) => f.replace(/\.webp$/, ''));
const ENEMIES = ls('sprites/enemies');
const NPCS = ls('sprites/npcs').map((f) => f.replace(/\.webp$/, ''));
const TERRAIN = lsArt('terrain').map((f) => f.replace(/\.png$/, ''));
const ITEM_ART = ls('items').map((f) => f.replace(/\.webp$/, ''));
const SFX = ls('audio/sfx').map((f) => f.replace(/\.mp3$/, ''));
const MUSIC = ls('audio/music').map((f) => f.replace(/\.mp3$/, ''));

// Hand-written flow notes per zone (what the player does, in order; what's new).
const FLOW = {
  'z00-tank': {
    title: 'Opening: the Tank',
    new: 'run, hop, variable-height jump, kick, the tell (tail-tip wiggle), hiding (Up at a hide spot), squeeze (hold Up).',
    flow: [
      'Three story panels (open-1..3.webp, captions in TEXT.opening.panels), then control starts in the cup.',
      'tank-cup: dodge the tongs 3 times, then a held jump onto the rim (beats 1-2).',
      'tank-sand: the escape (beat 3, issues #24, #25): Duchess sleeps on her rock mid-room and wakes at tile 38 (or a head bump, or a chirp within 6 tiles); she chases and pounces (the tell: hop as she leaps); hide in the log: she sniffs, sleeps where she is, the exit opens.',
      'tank-decor: climb; kick the pebble off a ledge to make a step (beat 4).',
      'tank-lid: squeeze through the lid gap; the cup tips (beats 5-6) -> panel open-4 -> bed-carrier, first Chirp prompt (Stripe answers), Pip\'s vow (TEXT.opening.pipVow).',
    ],
    notes: [
      'These rooms sit off the house map at y 18-20 and are never revisited (the map hides zone z00).',
      'No damage anywhere in the tank: her snout at a pounce\'s landing eats Pip (a gulp, a card, g.retryRoom() from tile 33; never die() or health); Gentle Mode: a roar and a skitter (player.shove); falls just reset to the last ground.',
      'tank-sand\'s exit and her nap on coming back read the room flag duchess-asleep (g.rs(\'tank-sand\').taken), never her mode. Headless checks: tools/tank-test.mjs.',
      'Recorded solution: design/solutions/zone-00-path.json (tools/solutions/zones-a.mjs, the zone-00 block); the full run replays it (tools/solutions/full-run.mjs, G0).',
      'Music: title (slowed, per the design). Palette and paintings: bg/z00-tank.',
      'Props: tongs, feeder-cup, feeder-cup-tipped, hide-log, fake-plant, water-dish, pebble, pebble-chip, mesh-lid, sand-berm.',
    ],
  },
  'z01-bedroom': {
    title: 'Zone 1: the Bedroom',
    new: 'Listen, Chirp, hiding, wall-jump (Tape Booties); the Carrier.',
    flow: [
      'bed-carrier (start, save 1): first chirp; Stripe answers from the dresser; Listen sign.',
      'bed-rug: kick ants, hide under a bottle cap. Optional loop: up the shoe rack into the closet and over to the bed.',
      'bed-desk: climb with no items (one-way chair, 2-tile drawer pulls, books) to the Tape Booties; the sound hole (vent grille) is right beside them.',
      'Wall-jump tutorial shaft in the desk; down to the floor; right to bed-dresser.',
      'bed-dresser: wall-jump the 4-wide shaft up the dresser side to the top: save 2 + Ready card -> bed-lair (Duchess).',
      'After Stripe: the tank\'s right rim opens into hall-top (the way onward, exact link).',
    ],
    notes: [
      'Zones 1-3 teach one thing at a time: no spikes over pits, generous checkpoints.',
      'Teasers on the first visit: the seed-heart on the window sill (band) is visible from the pillows; Weft on the closet rail (floss).',
      'The bedroom door into the Hall (bed-dresser right edge) stays closed: its draft stopper is G.',
    ],
  },
  'z02-bathroom': {
    title: 'Zone 2: the Bathroom',
    new: 'floss swing, steam vents (lifts), silverfish and mosquitoes. Decoy: Chikchak\'s chirp leads into her lair.',
    flow: [
      'bath-door (start, save 1) from the Hall.',
      'bath-toilet: first real wall-jump test (toilet tank G, tile wall #); up to the tank lid.',
      'bath-sink: climb the vanity (#) to the counter: the Floss Line, sound hole = overflow hole.',
      'Floss tutorial at bath-cabinet (towel hooks) - optional loop back via the radiator (bath-steam).',
      'bath-sink y 4: save 2 + Ready card -> bath-lair (Chikchak). After Katy: the right edge opens onto stair-landing (exact link).',
    ],
    notes: [
      'Sneak sections: none here (the boss is the stealth lesson).',
      'Steam vents need a dynamic lift entity (see links.md, engine features). Until it exists, every steam spot must also be climbable by 2-tile fins.',
      'Backtracking: the bath water (raft), the drain plug (thimble: Shelly), the mirror cabinet top (band), the towel shelf (glider), the laundry chute (thimble).',
    ],
  },
  'z03-kitchen': {
    title: 'Zone 3: the Kitchen',
    new: 'water and the Bottle-Cap Raft; heat (hot burners); the first beetle sneak section. Decoy: the creaky fridge.',
    flow: [
      'kit-fridge (start, save 1) from the stair foot. Fridge creak decoy; thermostat lock for later.',
      'kit-stove: hot burners (^ on solid ground), cockroaches; floor left to the cabinet under the sink.',
      'kit-undersink: the Raft in the leak puddle; sound hole = the cracked drain pipe.',
      'Back to kit-stove, climb onto kit-counter: save 2 + Ready card -> kit-sink (Big Tok).',
      'After Duo: the window sill opens (kit-window) -> drop to kit-table (beetle sneak) -> kit-pantrydoor (raft the spill) -> Pantry (left) or Laundry (down).',
    ],
    notes: [
      'The west half is reachable only through the lair until the dishwasher shortcut (one-way rungs on its west face, drop on the east) is used from the west.',
      'Both exits west (Pantry door, laundry stair head) are exact links: see links.md.',
      'Backtracking: cabinet tops (band), range hood glide (glider), dark kick-plate crawl (glow), thermostat lock (Frost), beetle lane (cloak), Mote crack.',
    ],
  },
  'z04-pantry': {
    title: 'Zone 4: the Pantry',
    new: 'the Rubber Band super-jump; sticky syrup. Twist: the chirp that sounds wrong (a tree cricket indoors?) is the real one.',
    flow: [
      'pan-door (start, save 1) from kit-pantrydoor (water spill on the kitchen side).',
      'pan-floor: beetle sneak (the mealworm tub tipped), weevils roll rice.',
      'pan-shelves: climb (uprights #, jar glass G, bracket hooks, syrup) to the Rubber Band; sound hole = the knot hole. First super-jump right after pickup.',
      'Top-left: save 2 + Ready card -> pan-lair (Lashes).',
    ],
    notes: [
      'Zones 4-7 combine two movement skills per room and add tougher enemies (ant soldiers).',
      'Syrup is a new terrain (art/terrain/syrup.png): see links.md engine features. Until then, paint it but keep it a plain floor.',
      'pan-jars is the band playground; pan-high (Sgt. Crumb) is the 8-tile G wall above the door.',
    ],
  },
  'z05-laundry': {
    title: 'Zone 5: the Laundry',
    new: 'the Dryer-Sheet Glider and warm updrafts; washer-flood currents. The beacon IS the smoke alarm (Beep); Hump taps under her.',
    flow: [
      'Down the stair hole from kit-pantrydoor onto laun-stairs (start, save 1 at the stair foot).',
      'laun-sink: window well (cold) and water heater (warm): thermostat lock.',
      'laun-dryer: climb the lint-trap ledges to the Glider; the dryer vent beside it is the sound hole (beeps + Hump\'s taps). Glide off the dryer right away.',
      'Back up laun-stairs: from the stair head glide 10 tiles to the lair door (save 2 + Ready card at the stair head) -> laun-lair (Peridot, Beep, Hump).',
    ],
    notes: [
      'zone.beaconVoice is {hole: [alarm, knock], lair: [alarm]} (already in zones.js); put the B marker at the dryer vent.',
      'Beep\'s battery comes from bas-workbench (optional, late).',
      'The laundry chute from bath-door lands in laun-basket (a door entity in bath-door; nothing to build here but a soft landing).',
      'laun-washer holds the basement stair door (C rubble, exact link to bas-stairs).',
    ],
  },
  'z06-living': {
    title: 'Zone 6: the Living Room',
    new: 'ground-pound (Thimble), bouncy cushions, piano keys, the robot vacuum sneak. Decoy: the squeaky dog toy.',
    flow: [
      'Two ways in, both landing on the armchair seat (start, save 1): from stair-foot, super-jump the 9-tile G armchair back (Rubber Band); from stair-flight, glide onto the curtain pelmet (Glider).',
      'liv-rug: the vacuum sneak (it loops; hide under coasters, a magazine, the remote).',
      'liv-basket: up the side-table leg (cling) and the yarn-ball hooks to the Thimble; sound hole = the wall register. Pound the cracker clump right after.',
      'Back to liv-rug\'s right end: save 2 + Ready card -> liv-lair (Gargy).',
      'Onward (not through the lair): liv-basket -> liv-piano -> liv-lamp -> liv-hearth: Sunroom (pound the plaster), Basement (pound the ash dump, then dark), chimney (feather).',
    ],
    notes: [
      'TWO recorded solutions: zone-06-path-band (items BFR+band) and zone-06-path-glider (BFR+glider). goToLevel(6) uses minItems[0]; use goToRoom with the glider set for the second.',
      'check-world: run with --items for each set; neither variant may need the other item.',
      'Exact links: stair-flight and stair-foot (left), liv-hearth to sun-door, chim-ash and chim-flue.',
    ],
  },
  'z07-study': {
    title: 'Zone 7: the Study',
    new: 'the beacon maze: four sounds, pick the true chirp by its rhythm. The Glow Bead.',
    flow: [
      'Glide from stair-landing onto the stu-door ledge (start, save 1); the hinge creaks (decoy 1).',
      'stu-desk: Listen hears four sounds (hinge, the alarm through the vent, Peeper through the floor register, Rin).',
      'stu-shelves: floss up the brass shelf pins; four cubbies, three dead ends with gags, the true one leads up to the Glow Bead; sound hole = the hollow book spine.',
      'Down to y 4: save 2 + Ready card -> stu-lair (Mossy).',
    ],
    notes: [
      'Decoys: zone.decoys [{voice: "hinge-creak", room: "stu-door"}, {voice: "alarm", room: "stu-desk"}, {voice: "peeper", room: "stu-desk"}] plus the cubby decoys in stu-shelves (room-level decoys).',
      'stu-nook is dark (needs glow): Page, after the bead.',
    ],
  },
  'z08-sunroom': {
    title: 'Zone 8: the Sunroom',
    new: 'the plant canopy (gliding and swinging), misters, aphids as springs, soft soil, loud rain. Decoy: Peeper (chirp-off).',
    flow: [
      'In from liv-hearth (pounded plaster) to sun-door (start, save 1).',
      'sun-fern: climb the stand and fronds to the canopy.',
      'sun-canopy: glide basket to basket (8-10 tile gaps), hooks, misters; drop to the bench top.',
      'sun-bench: the Cotton Earplugs in a seed tray; sound hole = the drainage hole. Thermostat lock.',
      'sun-glass: the rain/downpipe loud zone (Earplugs) up the ivy: save 2 + Ready card -> sun-lair (Kite).',
    ],
    notes: [
      'Zones 8-10 need fast chains of moves and have noise or darkness layers.',
      'The rain-roof loop (+18 dB per ASSETS.md) plays in sun-glass and sun-canopy (room loops).',
    ],
  },
  'z09-basement': {
    title: 'Zone 9: the Basement',
    new: 'darkness (light radius 60 px, 240 with the Glow Bead; tap Use to flash), centipedes, cellar spiders. Decoy: Soot\'s chicks in the chimney.',
    flow: [
      'Pound the rubble in laun-washer, drop to bas-stairs (start, save 1).',
      'bas-storage: beetle sneak among boxes; centipede (flash it).',
      'bas-workbench: pegboard hooks in the dark; the spare battery.',
      'bas-sump: raft the sump. bas-coal (save 2 + Ready card at the chute foot). bas-furnace: lit by the furnace; thermostat lock. Flue walkway right to bas-chimney.',
      'bas-chimney: Soot\'s gag scene, the Swift Feather; sound hole = the flue cleanout door. Back to bas-coal and flutter up the coal chute -> bas-lair (Ember).',
    ],
    notes: [
      'Every room is dark with needs: glow except bas-furnace (lit while the furnace runs) and bas-lair (dark, the boss handles light).',
      'The Dragon\'s Lair gap is at the bottom right of bas-furnace (see lair.md).',
      'The ash pit (chim-ash, builder D) drops into bas-chimney from above: exact link.',
    ],
  },
  'z10-attic': {
    title: 'Zone 10: the Attic',
    new: 'loud zones everywhere (bat roost, attic fan), everything combined. Decoy: Velvet the bat.',
    flow: [
      'Up the chimney (feather) through the damper (opens at 9 rescues, a cutscene in the Carrier) to chim-top, then left into att-entry (start, save 1).',
      'att-entry: the bat roost loud zone (Earplugs).',
      'att-rafters (Velvet) or att-trunks (beetle sneak), then att-insulation (attic fan loud zone), att-boxes (save 2 + Ready card) -> att-lair (Nana).',
      'att-hatch: the latch over the Hall (pound it): the shortcut home.',
    ],
    notes: [
      'No item here: the beacon goes straight to the lair (Chip, house cricket voice).',
      'Nana\'s door checks the trio for low, middle and high voices (TEXT.nana).',
    ],
  },
  lair: {
    title: 'The Dragon\'s Lair (optional)',
    new: 'built around hiding; a boss you befriend by waving (hold Listen + Kick).',
    flow: [
      'From bas-furnace, crawl the 3-tile gap behind the furnace into lair-gap (save crack + Ready card with the golden-eye portrait).',
      'dragon-lair: three phases (LAIRS.barty), reward the Cellophane Cloak.',
    ],
    notes: [
      'Needs the Glow Bead (lair-gap is dark) and the Thimble (to reach the Basement at all).',
      'Music: lair.mp3. Background: assets/lair.webp. Sir Bartholomew is made of parts: sprites/npcs/barty-eye, barty-claw, barty-head, barty-head-black (beard black when he spots you), barty.',
      'The Cloak opens the cloak secrets (BACKTRACK.cloak) and counts for 100%. Carrier arrival 23: hoard-corner.',
    ],
  },
};

const md = [];
const tbl = (rows) => rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
const linksOf = (id) => LINKS.filter((l) => l.a === id || l.b === id);
const gateStr = (g) => {
  if (!g) return 'open';
  const bits = [g.kind];
  if (g.item) bits.push(`(${ITEMS[g.item]?.name || g.item})`);
  if (g.cricket) bits.push(`(${g.cricket} freed)`);
  if (g.rescues) bits.push(`(${g.rescues} rescues)`);
  if (g.oneWay) bits.push(`one-way ${g.oneWay}`);
  if (g.where) bits.push(`built in ${g.where === 'a' ? 'the first room' : 'the second room'}`);
  return bits.join(' ');
};
const linkLine = (l, id) => {
  const other = l.a === id ? l.b : l.a;
  const dir = l.a === id ? l.side : { left: 'right', right: 'left', top: 'bottom', bottom: 'top' }[l.side];
  if (l.door) return `- **door** ${l.a} -> ${l.b}: ${gateStr(l.gate)}. ${l.note || ''}`;
  const builderOther = Object.entries(BUILDERS).find(([, b]) => b.zones.includes(ROOM_BY_ID[other].zone))?.[0];
  return `- ${dir} -> **${other}** (${ROOM_BY_ID[other].zone}${builderOther ? `, builder ${builderOther}` : ''}) at cell ${l.cell.join(',')} ${l.side} of ${l.a}, ${['left', 'right'].includes(l.side) ? 'rows' : 'cols'} ${l.span[0]}-${l.span[1]}${l.exact ? ' **(exact)**' : ' (suggested)'}; gate: ${gateStr(l.gate)}${l.gate?.note ? ` (${l.gate.note})` : ''}${l.note ? `. ${l.note}` : ''}`;
};
const secretLine = (s) => `- \`${s.id}\` ${s.kind}${s.who ? ` (${s.who})` : ''}: ${s.note}; needs **${s.needs || 'nothing'}**`;

function roomSection(r) {
  const lines = [`### ${r.id}: ${r.name}`, '', `Cell ${r.x},${r.y}, ${r.w}x${r.h} screens (${r.w * 32}x${r.h * 18} tiles). Purpose: ${r.purpose.join(', ')}.${r.dark ? ` Dark${r.needs ? `, needs: '${r.needs}'` : ''}.` : ''}`, '', r.brief || ''];
  const facts = [];
  if (r.item) facts.push(`item: **${r.item}** (${ITEMS[r.item]?.name}); place it with \`{type:'item', item:'${r.item}'}\``);
  if (r.soundHole) facts.push(`sound hole: ${r.soundHole.what} (a \`B\` marker right beside the ${r.soundHole.near}; prop sound-hole)`);
  if (r.save) facts.push(`save cracks: ${r.save} (\`S\`)`);
  if (r.lairDoor) facts.push(`lair door -> ${r.lairDoor} (save crack + "Ready?" card at the door)`);
  if (r.boss) facts.push(`boss: \`{type:'boss', boss:'${r.boss}'}\`${r.cage ? `, cage: \`{type:'cage', cricket:'${r.cage}'}\`` : ''}${r.reward ? `, reward: ${r.reward}` : ''}`);
  if (r.sneak) facts.push(`sneak section: ${r.sneak} (unbeatable; a hiding spot within reach everywhere; never timed)`);
  if (r.thermostat) facts.push(`thermostat lock: ${r.thermostat.target}°F (warm: ${r.thermostat.warm}; cold: ${r.thermostat.cold}); room \`temp: {left, right}\` gradient`);
  if (r.loud) facts.push('loud zone(s): `{type:\'loud\'}` with a low ceiling across the passage');
  if (r.enemies?.length) facts.push(`enemies: ${r.enemies.join(', ')}`);
  if (r.hides?.length) facts.push(`hiding spots: ${r.hides.join(', ')}`);
  if (r.notCricket) facts.push(`Not-Cricket / gag: ${r.notCricket} (TEXT.npcs.${r.notCricket} or TEXT.oneLiners.${r.notCricket})`);
  if (r.signs?.length) facts.push(`signs: ${r.signs.map((s) => `TEXT.signs.${s}`).join(', ')}`);
  if (r.props?.length) facts.push(`props: ${r.props.join(', ')}`);
  for (const [who, g] of Object.entries(DOZING)) if (g === r.id) facts.push(`after its fight, ${who} dozes here (sleep frame, no contact damage)`);
  if (facts.length) lines.push('', ...facts.map((f) => `- ${f}`));
  const ls2 = linksOf(r.id);
  if (ls2.length) lines.push('', 'Exits:', ...ls2.map((l) => linkLine(l, r.id)));
  const ss = SECRETS.filter((s) => s.room === r.id);
  if (ss.length) lines.push('', 'Secrets:', ...ss.map(secretLine));
  return lines.join('\n');
}

function lairSection(boss) {
  const L = LAIRS[boss];
  if (!L) return '';
  return [`## Boss: ${boss} (${L.verb})`, '',
    `Arena: room ${L.room}, ${L.arena[0]}x${L.arena[1]} screens. Fixed chirp: radius ${L.chirp.radius} tiles, stun ${L.chirp.stun} s (never from the cricket's stats). Tell: tail-tip wiggle + rattle-swish, ${L.timings.tell} s (1.2 s in Gentle Mode); emit \`game.emit('tell', {x, y})\` when it starts. Losing restarts the current phase (restore health). Built for Jump 2 / Speed 2.${L.cricket ? ` Freed: ${L.cricket}.` : ''}${L.reward ? ` Reward: ${L.reward}.` : ''}`, '',
    `Layout: ${L.layout}`, '',
    ...L.phases.map((p) => `- ${p}`), '',
    `Hide spots: ${L.hides.length ? L.hides.join('; ') : 'none'}.`, '',
    `Timings: ${Object.entries(L.timings).map(([k, v]) => `${k} ${Array.isArray(v) ? v.join('/') : v}`).join(', ')}.`, '',
    `Props: ${L.props.join(', ')}${L.sprites ? `. Sprites: ${L.sprites.join(', ')}` : ''}. Gecko art: sprites/geckos/${boss}/ (idle, strike, sleep, body, tail, legs + meta.json; renderer's gecko rig).`, '',
    `Lines: TEXT.geckos.${boss}.pre (3) before the fight, .post (2) after${boss === 'chikchak' ? ', .lure during phase 1-2 (from the mirror)' : ''}${boss === 'lashes' ? ' (*slurp* beats: the safe window)' : ''}${boss === 'barty' ? ' (TEXT.npcs.barty: meet, search, sweep, wave, after)' : ''}.`,
    `Recorded solution: design/solutions/zone-${String(ZONE_INFO[ROOM_BY_ID[L.room].zone.slice(1, 3) * 1]?.n ?? 'lair').padStart(2, '0')}-boss.json with the weakest crickets available at that point.`].join('\n');
}

function zoneDoc(zid) {
  const rooms = ROOMS.filter((r) => r.zone === zid);
  const n = Number(zid.slice(1, 3));
  const info = isNaN(n) ? ZONE_INFO[zid] : ZONE_INFO[n];
  const F = FLOW[zid];
  const builder = Object.entries(BUILDERS).find(([, b]) => b.zones.includes(zid))?.[0];
  const L = [`# ${F.title}`, '', `*Generated by tools/gen-zone-briefs.mjs from game/data/house.js and zones.js: edit those, then re-run.*`, '',
    `Builder **${builder}**. Module: \`game/data/rooms/${isNaN(n) ? 'lair' : `zone-${String(n).padStart(2, '0')}`}.js\` (export \`{ id: '${info.id}', n: ${isNaN(n) ? `'${zid}'` : n}, name, palette, start: {room: '${info.start}'}, rooms }\`; add it to rooms/index.js).`, '',
    '## Zone facts', '',
    tbl([['field', 'value'], ['-', '-'],
      ['palette', (info.palette || []).join(' ') + ' (+ paper #F4EBDD, ink #5A4632)'],
      ['music', `${info.music} (assets/audio/music/${info.music}.mp3)${info.boss ? '; boss rooms: boss' : ''}`],
      ['temperature', `${info.temp}°F`],
      ['item', info.item ? `${info.item} (${ITEMS[info.item].name})` : '-'],
      ['rescue', info.cricket || '-'],
      ['boss', info.boss || '-'],
      ['beacon voice', JSON.stringify(info.beaconVoice ?? '-')],
      ['decoy', JSON.stringify(info.decoySound ?? '-')],
      ['sound hole room', info.soundHoleRoom || '-'],
      ['lair room', info.lairRoom || '-'],
      ['start / saves', `${info.start} / ${(info.saves || []).join(', ')}`],
      ['enter needs (PREREQ)', JSON.stringify(PREREQ[isNaN(n) ? zid : n] || {})],
      ['minItems', JSON.stringify(info.minItems)],
      ['rescued at start', (info.rescued || []).join(', ') || '-'],
    ]), '',
    `**New here:** ${F.new}`, '',
    '## Main path (Jump 2 / Speed 2: steps <= 2 tiles up, gaps <= 3 tiles)', '',
    ...F.flow.map((f, i) => `${i + 1}. ${f}`), '',
    '## Notes', '', ...F.notes.map((x) => `- ${x}`), '',
    '## Rooms', '',
    tbl([['room', 'cell', 'size', 'purpose'], ['-', '-', '-', '-'], ...rooms.map((r) => [r.id, `${r.x},${r.y}`, `${r.w}x${r.h}`, r.purpose.join(', ')])]), '',
    ...rooms.map(roomSection).flatMap((s) => [s, '']),
  ];
  const bosses = rooms.filter((r) => r.boss).map((r) => r.boss);
  for (const b of bosses) L.push(lairSection(b), '');
  // backtracking into this zone
  const back = Object.entries(BACKTRACK).flatMap(([item, ids]) => ids.filter((id) => SECRETS.find((s) => s.id === id && rooms.some((r) => r.id === s.room))).map((id) => `${id} (${item})`));
  if (back.length) L.push('## Backtracking secrets in this zone', '', back.map((b) => `- ${b}`).join('\n'), '');
  L.push(assetsSection());
  return L.join('\n');
}

function assetsSection() {
  return ['## Art and sound you can use (real file names)', '',
    `- props (assets/props/<name>.webp): ${PROPS.join(', ')}`,
    `- enemies (engine type = sprites/enemies/<name>): ${ENEMIES.join(', ')}`,
    `- npcs (sprites/npcs/<name>.webp): ${NPCS.join(', ')}`,
    `- items (assets/items/<name>.webp): ${ITEM_ART.join(', ')}`,
    `- terrain swatches (art/terrain/<kind>.png): ${TERRAIN.join(', ')}`,
    `- music: ${MUSIC.join(', ')}`,
    `- sfx (Audio.play): ${SFX.join(', ')}`,
    '- synth voices (Audio.play): house banded twospot field snowy katydid mole ground bell knock alarm peeper chikchak tell sweep whoosh swish brush steam clonk thunk ping fall ring chime sting',
    '- Only engine enemy types that exist are `ant` and `beetle` today: add the others to src/enemies.js TYPES (see ENGINE_NOTES "Enemies"); the sprites are already there.',
    ''].join('\n');
}

// links.md: the linking spaces, every cross-builder link, the gate cookbook, engine asks.
function linksDoc() {
  const link = ROOMS.filter((r) => ['hall', 'stairwell', 'chimney'].includes(r.zone));
  const cross = LINKS.filter((l) => {
    const ba = Object.entries(BUILDERS).find(([, b]) => b.zones.includes(ROOM_BY_ID[l.a].zone))?.[0];
    const bb = Object.entries(BUILDERS).find(([, b]) => b.zones.includes(ROOM_BY_ID[l.b].zone))?.[0];
    return ba !== bb || ROOM_BY_ID[l.a].zone !== ROOM_BY_ID[l.b].zone;
  });
  const B = (id) => Object.entries(BUILDERS).find(([, b]) => b.zones.includes(ROOM_BY_ID[id].zone))?.[0];
  return [`# Links: the Hall, the stairwell, the chimney, and every link between zones`, '',
    '*Generated by tools/gen-zone-briefs.mjs from game/data/house.js: edit that, then re-run.*', '',
    '## The house grid', '',
    '```',
    'y  0-2   attic            x 6-23 (att-*), chimney top x 24',
    'y  3-5   upstairs         bedroom x 0-7 | hall 8-9 | bathroom 10-15 | stairwell 16-17 | study 18-23 | chimney flue 24',
    'y  6-8   downstairs       pantry 0-4 | kitchen 5-15 | stairwell 16-17 | living room 18-24 (hearth 24, rows 7-8) | sunroom 25-31 (rows 5-8)',
    'y  9-10  laundry          laundry 2-9 | ash pit 24',
    'y 11-13  basement         basement 8-24 | dragon\'s lair 24-27',
    'y 18-20  the tank         (opening only, off the map) x 0-3',
    '```', '',
    'One cell = 32x18 tiles. Rooms may not overlap; exits are automatic on shared edges (open tiles at the same world position on both sides). Everything outside a room\'s own edges is wall, except that nothing below an open bottom edge is a pit.', '',
    '## Who builds what', '', tbl([['builder', 'zones', 'files'], ['-', '-', '-'], ...Object.entries(BUILDERS).map(([k, b]) => [k, b.zones.join(', '), b.files.join(', ')])]), '',
    'Linking spaces (hall, stairwell, chimney) go in `game/data/rooms/links.js` as three zone modules (n: \'hall\', \'stairwell\', \'chimney\'; ZONE_INFO has their palettes, bg folder and music) or one module per space; the optional lair goes in `lair.js` (n: \'lair\').', '',
    '## Links between zones (exact: both sides must match tile for tile)', '',
    'Spans are in the local tiles of the shared cell: rows 0-17 for a left/right edge, columns 0-31 for a top/bottom edge. A standard doorway is rows 12-15 open with rows 16-17 solid floor on both sides. `node tools/check-world.mjs` checks every exact span once both rooms exist (cereal and damper gates are skipped: they are solid by design).', '',
    tbl([['from (builder)', 'to (builder)', 'edge of the first room, cell', 'span', 'gate', 'note'], ['-', '-', '-', '-', '-', '-'],
      ...cross.map((l) => [`${l.a} (${B(l.a)})`, `${l.b} (${B(l.b)})`, l.door ? 'door entity' : `${l.side}, ${l.cell.join(',')}`, l.door ? '-' : `${l.span[0]}-${l.span[1]}${l.exact ? ' exact' : ''}`, gateStr(l.gate), (l.note || l.gate?.note || '').replace(/\|/g, '/')])]), '',
    '## The linking spaces', '',
    ...link.map(roomSection).flatMap((s) => [s, '']),
    '## Gate cookbook (gate by kind first)', '',
    tbl([['gate', 'build it as', 'proof'], ['-', '-', '-'],
      ['cling (booties)', 'a # shaft 3-4 tiles wide with no ledges, taller than any jump (>= 6); G where clinging must not work', '--deny booties'],
      ['hook (floss)', 'H markers 5-6 tiles apart, each next one a tile or two lower, over a gap or past a G obstacle', '--deny floss'],
      ['water (raft)', '~ wider than any jump (>= 7) with no stepping stones', '--deny raft'],
      ['height (band)', 'a G wall >= 7 tiles high (Hump\'s leap is 5); no # nearby for wall-jumps', '--deny band'],
      ['glide (glider)', 'a gap >= 8 tiles of open air at the same height or lower, no hooks or walls within reach of the far side', '--deny glider'],
      ['cereal (thimble)', 'a C clump with an exposed top you can land on; it is solid from below and the sides (so a latch is one-way)', '--deny thimble'],
      ['dark (glow)', 'the room: dark: true, needs: \'glow\', needsMsg: TEXT.gates.dark', '--deny glow'],
      ['loud (earplugs)', 'a {type:\'loud\'} box across the passage with a low ceiling so it can\'t be jumped over', '--deny earplugs'],
      ['chimney (feather)', 'a G shaft with 1-tile brick lips, alternating sides, 4.5 tiles apart, with a G overhang 2-3 tiles above each lip offset so a straight super-jump bonks; jump + flutter (2.5 + 2.5) reaches the next lip', '--deny feather (strongest pass too)'],
      ['crack (Mote)', '% tiles; m markers are Mote-only hides', 'optional only'],
      ['rescue', 'tiles that stay solid until the lair\'s cricket is rescued (lairs 1-3\'s onward exits); the gate entity, opens:{rescued}', 'replay'],
      ['damper', 'tiles that stay solid until 9 rescues; the card lists who\'s missing (TEXT.damper, TEXT.ui.missingEntry)', 'goToRoom with 8 / 9 rescued'],
      ['perk:*', 'optional secrets only: hugeLeap = a G ledge exactly 5 tiles up; wallRun = a # wall 3 tiles + a ledge; longGlide = a gap only 1-in-6 reaches; dash/shove/dig/duet need engine support', 'never on a main path'],
      ['thermostat', 'a thermostat-lock prop + the room temp {left, right} gradient; Frost chirps at the target spot ({type:\'thermostat\'})', 'check-world (--rescued frost)'],
      ['oneWay', 'a drop down a G wall, one-way rungs (=) on one face only, or a C latch pounded from above', '-'],
    ]), '',
    '## Engine features (built: exact syntax in design/ENGINE_NOTES.md, "Entities and mechanics"; zone-98 has a working example of each)', '',
    '- **rescue gates**: `{type:\'gate\', id, x, y, w, h, opens:{rescued:\'stripe\'}}` (leave the tiles empty; the gate fills them with G until the rescue).',
    '- **damper**: `{type:\'gate\', x, y, w, h, opens:{rescues: 9}, card:\'damper\'}` (chim-flue -> chim-top; touching it shows who is missing).',
    '- **other gates**: `opens:{item}`, `opens:{switch: id}` (a `{type:\'switch\', id, x, y, by:\'kick\'|\'up\'|\'pound\'|\'chirp\'|\'touch\'}`, a thermostat or a piano), `opens:{side:\'left\'}` (one-way shortcut).',
    '- **lifts**: `{type:\'lift\', kind:\'steam\'|\'updraft\'|\'mister\', x, y, w, h, vy, on, off, phase}` (updrafts only lift a gliding cricket).',
    '- **springs**: `{type:\'spring\', x, y, w, power}` (cushions; hold Down to land still); aphids are springs (`{type:\'aphid\'}`).',
    '- **terrain**: `{type:\'terrain\', kind:\'syrup\'|\'crumble\', x, y, w, h}`; soil/sand = `s` tiles (Digby digs); cereal/plaster = `C`.',
    '- **piano keys**: `{type:\'piano\', id, x, y, kw, keys, melody:[0,2,1]}` (pound to play).',
    '- **thermostat locks**: room `temp:{left, right}` + `{type:\'thermostat\', id, x, y, target}`; Frost chirps at the right spot.',
    '- **doors**: `{type:\'door\', x, y, to, at, auto?, needs?}` (the laundry chute: `auto: true`, no door back).',
    '- **NPCs**: `{type:\'npc\', who, x, y, talk, recruit, give?:\'battery\', giveTalk?}`; crumbs, seed-hearts, song-seeds: `{type:\'crumbs\'}`, `{type:\'secret\', id:\'heart:...\'|\'song:...\'}`.',
    '- **decoys**: `{type:\'decoy\', voice, x, y, every: 40 | [8, 10], answers: true}` (or zone.decoys / room decoys with the same fields).',
    '- **enemies**: every design enemy by its sprite folder name (ant mites silverfish mosquito cockroach fruitflies weevil antsoldier clothesmoth earwig dustbunny stinkbug booklouse wolfspider wasp aphid centipede cellarspider beetle vacuum).',
    '- **bosses**: `makeBoss(name, {phases, start, tick, draw})` from src/bosses/base.js (phase checkpoints, tells, Gentle Mode, fixed chirp, rescue); see src/bosses/practice.js.',
    '',
  ].join('\n');
}

const zones = ['z00-tank', 'z01-bedroom', 'z02-bathroom', 'z03-kitchen', 'z04-pantry', 'z05-laundry', 'z06-living', 'z07-study', 'z08-sunroom', 'z09-basement', 'z10-attic'];
const written = [];
for (const z of zones) { const f = path.join(out, `${z.slice(0, 3)}.md`); fs.writeFileSync(f, zoneDoc(z)); written.push(f); }
fs.writeFileSync(path.join(out, 'lair.md'), zoneDoc('lair')); written.push('lair.md');
fs.writeFileSync(path.join(out, 'links.md'), linksDoc()); written.push('links.md');
console.log(`wrote ${written.length} briefs to design/zones/`);
