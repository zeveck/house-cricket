# House Cricket: engine notes (milestone 1)

For the helpers who build zones, bosses and screens on top of the core. Everything here is in
`game/` (plain ES modules, no build step) and `tools/` (node scripts). The sandbox zone
(`game/data/rooms/zone-99.js`) is a working example of every feature below.

## Running it

```bash
# serve (from the project root; any free port; no caching)
python3 <gamegen skill folder>/scripts/serve.py 8131 game
# open http://127.0.0.1:8131/   (?debug draws hitboxes, ?shapes=1 ignores sprites, ?dev also loads zones 98/99)

node tools/gen-reach.mjs        # physics vs the movement table; writes game/data/reach.js; exit 1 if off by > 0.25 tile
node tools/feel-test.mjs        # coyote / buffer / wall grace / hook magnet / nudge / stick cone at their limits
node tools/check-world.mjs      # reachability per zone with reach.js (skeleton, see below)
node tools/check-world.mjs --deny band   # prove what an item gates
node tools/replay.mjs           # every design/solutions/*.json, twice, real keys (needs the server on 8131)
node tools/replay.mjs --pad     # ... pretend PS5 pad, d-pad;  --pad-stick: left stick
node tools/replay.mjs --touch   # ... iPhone 15 session at 852x393, real touches on the stick and buttons
node tools/list-assets.mjs      # re-scan game/assets after adding art (see Sprites)
node tools/entity-test.mjs      # every mechanic, enemy and the boss plumbing, headless (see Entities and mechanics)
node tools/replay-headless.mjs  # every recorded solution through the node sim (quick check before the browser replay)
node tools/controls-test.mjs    # [issue #27] real key codes, both layouts: ↑/W/Z/Space jump, ↓ Enter, Shift cloak, the labels per scheme
```

`playwright-cli` must run from the project root (it reads `.playwright/cli.config.json`).

## Input actions (issue #27: Up to jump)

`src/input.js` turns keys, touch and the pad into actions. Besides the directions and buttons:
- **upJump**: the keyboard's ↑ / W (also `up`). `game.js playerFrame()` makes it Jump for the player (press,
  and its hold for height and glide after a press that jumped), except while swinging, where it only climbs
  (`up`) and never lets go; `player.js _swing` jumps off when ← or → is pressed together with it (each within
  `LINE_CHORD`, 6 frames, of the other, both held; issue #37). Z / Space (`jump`) fling off a line too.
  Pad and touch have their Jump button. Issue #37: the keyboard's `{jump}` cap is ↑ / W (`CAPS`), and
  `{lineOff}` names the line's jump-off (← → + ↑ on the keys, Jump elsewhere; `ui.js cap()` draws the keys).
  The story reads `upJump` as well as `jump` (next, hold to skip).
- **enter**: a ↓ press on every scheme (↓ / S, stick down, D-pad down), resolved `ENTER_WAIT` (3) samples later
  unless Jump came within 3 samples either side (↓ + Jump is always a drop-through). Hide spots, doors, save
  cracks, lair doors, talkers, `by:'up'` switches, thermostats, Carrier spots and the tank's lid read it.
  `main.js` cancels a pending Enter while a menu, dialog or story is up. The touch prompt tap presses it at once.
- **cloak**: hold Shift; stick up / D-pad up on touch and pad. **lookUp**: stick up / D-pad up only.
- Labels: `input.label()` names each per scheme (Enter: ↓ / S / Stick ↓ / Down; Cloak: Shift / Stick ↑ / Up);
  text uses `{enter}` and `{cloak}`. `tools/controls-test.mjs` checks keys and labels.

## Files

| File | Job |
|---|---|
| `src/main.js` | boot, rAF + fixed 60 Hz step (the game clock), screens, pause, `window.__game` |
| `src/game.js` | the gameplay sim: room, player, enemies, pickups, gates, pits, checkpoints, transitions. **No DOM** |
| `src/physics.js` | tile kinds, AABB vs grid, one-way, walls, corner nudge, launch profiles. **No DOM** |
| `src/player.js` | the cricket state machine and the exact Jump/Use rules. **No DOM** |
| `src/world.js` | room parsing, house-wide placement, exits by adjacency, camera, `seeded()` |
| `src/enemies.js` | enemy types + behaviours (data-driven; every design enemy) |
| `src/mechanics.js` | gates, switches, doors, lifts, springs, terrain, thermostat locks, decoys, lights, dig. **No DOM** |
| `src/mech-draw.js` | render-only drawing of the mechanics and enemy extras (`renderer.drawMech`) |
| `src/bosses/base.js` | shared boss plumbing (`makeBoss`), `src/bosses/practice.js` the example fight |
| `src/bosses/index.js` | boss registry (empty but wired; see "Bosses") |
| `src/input.js` | keys (both layouts), touch overlay + floating stick, gamepad, edges, buffering, prompt labels |
| `src/render.js` | canvas: per-screen cached platform painter, water, entities, cricket, fx, darkness |
| `src/sprites.js` | sprite registry with shape fallbacks |
| `src/ui.js` | DOM HUD, menus (one focus model), prompts, signs, item card |
| `src/save.js` | 3 slots, versioned JSON, corrupt guard, settings |
| `src/audio.js` | music buffers, sfx bank, ambience loops, buses, settings, game-clock scheduling, the beacon's sound (see "Audio") |
| `src/chirps.js` | synthesized voices: every cricket species, the 3 decoys, the gecko tell, code-made effects (pure sample math) |
| `src/beacon.js` | beacon target (sound hole, then lair), path distance over room exits, gain curve, temperatures. **No DOM** |
| `data/movement.js` | the movement table, forgiveness and feel numbers (the only place to tune feel) |
| `data/crickets.js` | the 11 crickets: stats, perk, shape colours, antenna look |
| `data/items.js` | the 10 items and the gate kind each opens |
| `data/zones.js` | per-zone facts: palette, item, cricket, `minItems`, `rescued` (used by `goToLevel`) |
| `data/rooms/index.js` | **the list of zone modules the game loads: add your zone here** |
| `data/reach.js` | generated by gen-reach |
| `data/assets.js` | generated by list-assets |

The sim (`game.js`, `player.js`, `physics.js`, `world.js`, `enemies.js`) never touches the DOM,
`Math.random` or wall-clock time, so node tools run the exact same code and replays are
frame-exact. Keep it that way: use `seeded(roomId)` from `world.js` for any randomness.

## Room file format

A zone is one module, `game/data/rooms/zone-NN.js`, exporting:

```js
export default {
  id: 'z01-bedroom', n: 1, name: 'Bedroom',
  palette: ['#3B4A7A', '#F2C46D', '#C8564B', '#7C98C4'],   // the zone's 4 colours (platforms use the darkest)
  bg: 'z01-bedroom',                     // folder under assets/bg/ for far-a.webp (optional; defaults to id)
  start: { room: 'bed-1' },              // where goToLevel / New Game puts you (its P or S marker)
  beacon: { room: 'bed-6', x: 20, y: 9 },// Listen arrow target when no B marker is in the current room
  rooms: [ /* rooms */ ],
};
```

A room:

```js
{
  id: 'bed-1', name: 'Under the bed',
  x: 10, y: 4,                 // position on the HOUSE-WIDE grid of screen cells (1 cell = 32x18 tiles)
  dark: false,                 // darkness layer (light radius 60 px, 240 with the Glow Bead)
  needs: 'glow',               // optional: entering is refused without this item (gate by kind)
  needsMsg: 'Too dark to go in without a light. (Glow Bead)',
  grid: [ /* 18*h strings of 32*w chars */ ],
  entities: [ /* see below */ ],
}
```

- **Size:** a grid of 32×18 tiles per screen; any multiple (64×18 = 2 screens wide, 32×36 = 2 tall).
  Tiles are 40 px; one screen is 1280×720.
- **Exits are automatic.** Rooms sit on one house-wide grid of screen cells (`x`, `y`, in screens).
  An open tile on a room's edge leads into whatever room occupies the next cell, at the same
  world position, so line up the openings on both sides. Movement across the edge is seamless
  (physics sees the neighbour's tiles). Nothing below an open bottom edge = a pit.
  Cross-zone links work the same way: give the rooms neighbouring cells. Rooms may not overlap.
- **Pick cells far apart per zone** (e.g. the Bedroom around x 0–15, y 0–6) so zones never collide;
  the sandbox lives at x 90–105, y 99–100.

### Tile legend

| Char | Tile |
|---|---|
| `.` or space | empty |
| `#` | solid wall/floor (clingable with the Tape Booties) |
| `G` | glass/porcelain: solid, **never clingable** (use it to stop wall-jump bypasses) |
| `=` | one-way platform: jump up through it; Down+Jump drops through |
| `C` | cereal wall/floor: solid; a ground-pound landing on it breaks the **whole connected clump** (Thimble) |
| `%` | crack: solid for everyone except Mote (Tiny) |
| `~` | water: a pit without the Raft; its top surface is a floor with it, and in it below the surface the Raft bobs you up to it (issue 20: no wading along the bottom; an overhang stops you under it until you drift out) |
| `^` | tacks/thorns: 1 heart, back on the last solid ground |
| `s` | soft soil: solid (Digby's dig is a later perk) |

### Markers in the grid (become entities; the tile under them is empty)

| Char | Entity |
|---|---|
| `P` | player start (feet on the floor below the marker's tile) |
| `S` | save crack (Up to save; heals) |
| `k` | soft checkpoint (one per screen in rooms 2+ screens big; touch to set) |
| `H` | floss hook (the hook point is the tile's centre) |
| `h` | hiding spot on the floor of this tile |
| `m` | hiding spot only Mote fits |
| `B` | beacon / sound hole (the Listen arrow points here) |

### Entity list (tile coordinates: `x` = column, `y` = the row the thing stands in)

```js
{ type: 'item', item: 'booties', x: 28, y: 7 }           // pickup: freeze + name card; items in data/items.js
{ type: 'cage', cricket: 'stripe', x: 27, y: 10 }        // rescue: frees the cricket, sets levelComplete
{ type: 'ant', x: 20, y: 15, range: [16, 26] }           // enemy (see Enemies); range = columns it may walk
{ type: 'beetle', x: 8, y: 33, range: [1, 12] }
{ type: 'hide', x: 4, y: 33, w: 1, small: false }        // same as the h / m markers, with a width
{ type: 'hook', x: 18, y: 10 }                            // same as H
{ type: 'checkpoint', x: 3, y: 33 }  { type: 'save', x: 6, y: 15 }  { type: 'beacon', x: 27, y: 10 }
{ type: 'sign', x: 1, y: 15, w: 9, text: '{jump} jumps (hold it for higher).' } // a tip's paper note (see below); nx, kind, at optional
{ type: 'loud', x: 20, y: 28, w: 5, h: 6 }                // loud zone: shoves you back out without Earplugs
{ type: 'current', x: 7, y: 13, w: 14, h: 3, vx: 1.2 }    // pushes the raft, tiles per second
{ type: 'door', x: 5, y: 15, to: 'room-id', at: [3, 15] } // Up to use; for non-adjacent links (auto, needs: see Entities and mechanics)
{ type: 'boss', boss: 'duchess', x: 16, y: 15 }           // see Bosses
```

**Signs are notes on the path** ([issue 9], `src/notes.js`): the note stands at column `nx` (else the span's centre
column) on the first standable tile at the sign's row or one below (never water or a hazard; a one-way plank counts; a
solid tile at the row holds it on top), stepping up to 2 columns to keep clear of a save, checkpoint, hide, door, lair
door, item or cage; if its ground breaks or opens later it retires. `kind: 'card'` is a card with no note (Nana's phase
hints); `at: 'low'` asks for the card's lower slot (the tongs). The HUD card shows when the cricket comes within 2 tiles
of the note on its floor (ui.js `updateTips`). A script tip mid-scene: `game.scriptNote(textId, signEntity)` (it flutters
down). `node tools/sign-check.mjs` checks every note (and `--wrap`: every tip fits 2 lines at 667x375).

**Text with `{action}` tokens** (signs; also usable via `ui.richText`) renders each token as a
key cap or pad glyph for whatever the player used last (`{jump}`, `{use}`, `{down}`, `{left}`…).
Never write a bare key letter in game text.

## Gates (gate by kind first)

| Gate | How to build it | Opened by |
|---|---|---|
| clingable walls | `#` shafts 3–4 tiles wide; use `G` where clinging must not work | `booties` |
| hooks | `H` markers; hooks 5–6 tiles apart, the next one a tile or two **lower** (the swing hangs 2.5 tiles under the hook) | `floss` |
| water | `~` (a pit without the raft) | `raft` |
| height | a wall **≥ 7 tiles** high (Hump's leap is 5), made of `G` so it can't be wall-jumped | `band` |
| glide | a gap ≥ 8 tiles (jump 5–6, huge leap 6) | `glider` |
| cereal/plaster | `C` clump that blocks the way; you pound from on top of it | `thimble` |
| darkness | room `dark: true, needs: 'glow'` | `glow` |
| loud | `loud` entity across the passage, with a low ceiling so it can't be jumped over | `earplugs` |
| chimney | (later: a flutter-only climb) | `feather` |
| crack | `%` | Mote only (optional secrets) |

Check every gate with `node tools/check-world.mjs --deny <item>`: the item's region must become
unreachable. The main path must work with the zone's `minItems` (in `data/zones.js`).

## Reach (what the level designer can count on)

From `game/data/reach.js` (tiles; gap = widest pit cleared at the same height):

| Move | Rise | Gap |
|---|---|---|
| Jump 2 / 3 / 4 / 5 (at Speed 3) | 2.5 / 3 / 3.5 / 4 | 4 / 5 / 5.5 / 6 |
| Speed ±1 | — | ±0.5 |
| Duo, Digby (2/2), the weakest | 2.5 | 3.5 |
| Hump's huge leap | 5 | 6 |
| Wall-kick | 2 per kick (≈1.85 net) | 2 out |
| Flutter | +2.5 | — |
| Super-jump | 8 | 4 |
| Glide | 1 down per 4 across (Katy 6) | — |
| Floss fling (best release) | — | ≈6 |
| Jam's wall-run | 3 | — |

A tap of Jump rises about 1 tile; a full hold the full rise. Main paths are built for Jump 2 /
Speed 2 (rise 2.5, gap 3.5), so swapping is never required.

## Enemies

`src/enemies.js`: add an entry to `TYPES`:

```js
silverfish: { bonkable: true, behaviour: 'patrol', w: 34, h: 12, speed: 160, damage: 1,
              sprite: 'sprites/enemies/silverfish', color: '#A9B8C2', dark: '#4F5B6E', name: 'Silverfish' },
```

- `bonkable: true` → a kick flips it (it lies on its back, scurries off, comes back 6 s later at
  its spawn), a chirp stuns it (radius and stun from the Chirp stat; Rin ×3). `false` → kicks
  "clonk", chirps do nothing; it can only be avoided or hidden from (darkling beetle, vacuum).
- `behaviour` names a function in `BEHAVIOURS` (every design enemy is built: see "Entities and
  mechanics" for the table). Write new ones
  there: `(e, g) => {...}` moves `e.x/e.y` using `g.grid`, `g.player`, `DT`. Contact damage,
  hiding and invulnerability are handled for you after the behaviour runs.
- A **hidden** player (`h`/`m` spots, Up) is never touched or seen. Hunters that hear should
  check `g.lastCall` (frame of the player's last chirp; chirping gives you away).
- Sprites: `sprites/enemies/<name>/0.png` and `1.png`, facing **left**; shapes are drawn until then.

## Bosses

`src/bosses/index.js` holds a registry. A boss module exports `create(game, entity)` returning
`{ phase, update(game), draw(ctx, renderer), setPhase(n) }`; register it in `BOSSES` and put a
`{ type: 'boss', boss: 'name', x, y }` entity in the lair room. `game.bossPhase` follows `phase`,
and `__game.setBossPhase(n)` calls `setPhase(n)`. Losing in a fight should restart the phase:
call `setPhase(this.phase)` from your module when `game.player.health` hits 0 (and restore
health). Arena chirp radius/stun are fixed per fight: read the `chirp` events from `game.fx`
rather than the cricket's stats. The shared plumbing (phases, checkpoints, tells, Gentle Mode,
fixed chirp, rescue, the gecko rig) is in `src/bosses/base.js`: see "Entities and mechanics".

## Items and progress

`game.give(id)`, `game.rescue(id)`, `player.has(id)`. Items are in `data/items.js`; to add a
gate kind, add the item there and test `player.has()` where the gate lives. The touch **Use**
button appears once the player has any of `USE_ITEMS`.

## Swapping and stats

`player.trio` (up to 3 ids), `player.active`. Q/E (L1/R1, tap a portrait) queue a swap that
happens the next time the cricket stands on the ground. Stats come from `data/crickets.js`;
`makeProfiles()` in physics.js turns them into launch speeds and gravity, so new crickets need
no physics edits. Perks wired: `hugeLeap`, `wallRun`, `longGlide`, `tiny`, `dash`, `lullaby`.
Also wired: `thermometer`, `dig` (engine steward), `shove`, `duet`, `listen2` (fixer: see Builder changes).

## Debug hook `window.__game`

| Call | Does |
|---|---|
| `state()` | screen, zone, room, pos, vel, pstate, health, items, trio, active, queuedSwap, rescued, recruits, bossPhase, levelComplete, gameWon, hidden, listening, input (`keyboard`/`touch`/`gamepad`), padId, padFamily, frame, playFrames, frozen, slot |
| `frames()` | the screen-change log (≤ 200 entries of `[name, frames]`) |
| `levels()` | 10 |
| `zones()` | the loaded zones and their room ids |
| `goToLevel(n, {items, party}?)` | **fresh game** in zone n at its start with `ZONE_INFO[n].minItems[0]` and `rescued`; `{ok:false}` if the zone isn't built |
| `goToRoom(id, {x, y, items, party, rescued}?)` | **fresh game** in a room (x/y = tile; default its P/S marker) |
| `give(item)`, `rescue(id)`, `setBossPhase(n)` | set-up only |
| `freeze()`, `step(n)`, `unfreeze()` | advance fixed 60 Hz updates while frozen |
| `held()` | which actions the input layer sees held (replays use it to sync touch) |
| `audioState()` | context state, muted/musicMuted/sfxMuted, volumes, track, decoded (≤ 3) and decodedTracks, listenDuck, duckDb, cutHz/cutDb, loops, beaconChirps |
| `beacon()` | target {room, x, y (tiles)}, phase (`hole`/`lair`), voice, hz, temp, pathDist, maxDist, gain (dB, ≥ −24), gainWithListen, cutoff, pan, reverbWet, nextExit |
| `renderChirp(species, {song, temp, easier})` | Promise of `{voice, sampleRate, hz, samples}` rendered through an OfflineAudioContext (species: cricket id, voice name or `'rescue'`) |
| `buttons()` | stub for now |

`goToRoom`/`goToLevel` always start a fresh game (no broken cereal or taken items carried over),
which is what makes replays repeatable.

## Recorded solutions

A solution is `design/solutions/<name>.json`:
`{ name, start: {room, x, y, items, party}, frames, events: [[frame, code, 'down'|'up'], …], expect, endState }`.
Author them with the headless sim, never by hand-timing in a browser:

```js
import { Author } from '../author.mjs';      // tools/author.mjs
const a = new Author({ room: 'bed-1', items: [] });
a.down('ArrowRight').until((g) => g.player.x > 400, 300, 'ledge').tap('KeyZ', 14)
 .until((g) => g.levelComplete, 2000, 'rescue').end();
a.save('zone-01-path', { levelComplete: true });
```

`until()` waits on the live sim; the saved events are plain frame numbers, so the browser replay
(`tools/replay.mjs`) presses the same real keys on the same frames, twice, and must reach the same
`endState`. See `tools/solutions/sandbox.mjs` and `tools/solutions/feel.mjs` (which asserts each
forgiveness window at its limit while authoring). Re-run the authoring script after changing a
room or the physics, then replay.

## check-world (skeleton)

Joins all rooms into one tile grid; nodes are standing spots, cling cells (with Booties) and hooks
(with Floss); edges are parabola envelopes from `reach.js` for jump / flutter / super-jump / glide /
wall-kick / fling, with a coarse clearance check (up-over-down or across-then-down must be clear;
it does not trace real arcs). Items are collected when reached, to a fixpoint, so every pickup
order is covered. Passes: `pip`, `weakest` (Jump 2 / Speed 2, −0.5 tile) and `strongest`
(+0.5 tile). Real zones default to weakest + strongest; it exits 1 if the main pass misses an item
or rescue. Mechanics (gates, doors, lifts, springs, terrain, thermostats) are understood: see "Entities
and mechanics". **Traps** ([issue #4]): in every state of the zone (one change at a time: an item, a
rescue, a switch, a side gate; from every entry state `data/zones.js` allows), every spot reached
must reach a way out (an edge into another zone, a save crack, a door out, the Carrier, the tank's
lid) or a way on (a change, a gecko fight's ground) with the abilities held then. Reach and escape
use the pass's exact stats; the strongest pass is the crickets home in that state ([issue #17]: each
cricket nobody home beats on both rise and gap, any of whom can make a move; a rescue in the zone adds
its cricket), and both passes start from every entry state that differs in the crickets the zone reads
(its own, Frost for a thermostat, Duo for a push block, a rescue gate's) or, in the strongest pass, in
the best crickets home (so the Laundry is judged without Frost and with her). The escape graph is
strict: a wall kick goes away from its wall. The kick peaks at 2 for every cricket, Duo included;
catching a wall again (kick to kick up a shaft) nets `reach.js` `wallClimb`, about 1.64-1.78
depending on the cricket (gen-reach measures both). The graph still counts a kick to another cling as up to 2 cells: a
cling cell can't hold the quarter tile (kicked from the top of its cell, a cricket does reach the cell
two up), and charging 1.75 an edge made the bath-sink floor read as stuck when the sim gets Duo, Pip
and Stripe out. The climb keeps gaining, so only the final hop of a long chain to a ledge can read a little better
than it is (escape-test is the proof); a bounce edge into a room you can't enter yet is a floor, as in the game since [issue #15] (stand,
walk, jump off it). It exits 1 on any pocket that can't, in any pass. Never resolved by the
fall-respawn or damage: deliberate hazards (walls over thorns) and the test zones are listed in
`data/trap-exempt.js`, with the fights' ground; every exempted pocket, the hazard-wall rule's
included, prints an `exempt stuck` line. Duo's push blocks ([issue #17]) are solid where they are; with
Duo home a shove (one tile, or on until it stops, then any fall) makes a state that is judged too
(not searched on from, and not itself a way on). **Moving enemies are not modelled**: an enemy is
never a step, a block or a way on, so a spot that only an enemy's back gets you out of reads as
stuck, and one an enemy walls off reads as fine. `tools/escape-test.mjs` puts the cricket on a
reported spot in the headless sim and searches the controls for a way out (`--traps-json` writes
the candidates; strongest-pass pockets list each of the best crickets home). **Not done yet:** "no
gate opens before its item" across zones. ([cracks] `tools/check-cracks.mjs` proves every save crack can be
left on foot: see Builder changes.) The recorded
solutions are the real proof of a route.

## Sprites

`sprites.get('sprites/crickets/pip/base.png')` returns the image or `null`; every draw falls back
to shapes when it's null. Only files listed in `data/assets.js` are requested, so **run
`node tools/list-assets.mjs` after adding art**; until then the game keeps drawing shapes
(and never 404s). Paths follow `design/BUILD_PLAN.md`. Already used when present:

- crickets: `anim/idle/NN.png`, `anim/run/NN.png`, `poses/{run-a,run-b,leap,cling,hang,glide,pound,listen}.png`,
  `base.png`, `portrait.png` (HUD trio), `anchors.json` (antennae from `head`, cerci from `tail`, per anim/pose and frame);
- `sprites/enemies/<type>/0.png, 1.png`; `items/<id>.png` (pickups, the glider sheet); `props/hook.png`,
  `props/hide-cap.png`, `props/crack-small.png`; `bg/<zone>/far-a.webp`.

Platforms are always code-painted (darkest palette values, wobbly wet edges), cached per screen
at `min(devicePixelRatio, 2)` and repainted only when the tiles change (cereal breaking).

## Feel numbers (data/movement.js)

- Gravity is derived per cricket from its rise and gap (Pip: 1800 px/s² up, ×1.6 falling,
  launch 657 px/s; Duo/Digby 2565 up), so the table holds exactly; max fall 1100 px/s
  (950 / 1025 for Weight 1 / 2).
- Run speed (tiles/s) by Speed: 5.5 / 6.5 / 7.25 / 8 for 2 / 3 / 4 / 5. Full speed in 0.07 s,
  stop in 0.05 s; in the air 0.11 s / 0.22 s.
- Releasing Jump while rising multiplies the upward speed by 0.45 (once), after at least
  4 frames, so a tap is a ~1-tile hop.
- Forgiveness: coyote 100 ms, jump buffer 120 ms, corner nudge 8 px (head bumps and ledge lips),
  wall grace 100 ms, hook magnet 1 tile from the hitbox edge, Use buffered 120 ms.
- Hitbox 30×24 px (a 1-tile tunnel fits). Wall slide 80 px/s (280 holding Down).
- Swing: 1900 px/s² pendulum, pump 5 rad/s², max 80°, rope 2.5 tiles (Up/Down climb 1.5–5),
  fling = tangential × 0.92 + 120 px/s up; fling momentum carries in the air (300 px/s² drag),
  bleeds off fast on landing (2400 px/s²).
- Stick: Down only past 60% of the radius and within ±30° of straight down (pad and touch);
  pad dead zone 0.25.
- Hit-pause 60 ms, 1 s of invulnerability, knock-back 260/320 px/s.

## Audio

Files: `src/audio.js` (everything that makes sound), `src/chirps.js` (synthesized voices, pure
sample math: runs in node too), `src/beacon.js` (beacon target and path distance, no DOM).
Hooks in other files are marked `[audio]`: `main.js` calls `Audio.configure(settings, Save.saveSettings)`
at boot, `Audio.tick(game)` every fixed step, `Audio.frame({screen, paused, game})` every animation
frame, and plays menu move/select/back around `ui.menuInput`; `game.beaconTarget()` delegates to
`beacon.js` (so the Listen arrow and the sound agree).

**Rules.** The context starts on the first input. Gameplay never reads AudioContext time:
`tick(game)` reads `game.fx`, the player and the room, and schedules game-clock sounds with a
100 ms (6 frame) lookahead; frozen or paused = no steps = nothing new scheduled.

**Playing sounds** (`import * as Audio from './audio.js'`):

```js
Audio.play('dialog-blip');                       // any file in assets/audio/sfx (name without .mp3)
Audio.play('tell', { pan: -0.5 });               // or a synth voice from chirps.js VOICES
Audio.play('house', { pitch: 1.01, song: 'rivalry' });  // a cricket voice (or a cricket id: 'frost')
Audio.cue(game.frame + 30, 'brush');             // on the game clock (finale beat, rhythmic stuff)
Audio.cue(f, 'frost', { gain: 0.6 });            // chorus voice on frame f
Audio.music('finale'); Audio.music(null);        // force a track / back to automatic
Audio.setCarrierVoices(['stripe', 'katy', 'peeper']); // the Carrier's layered songs on its 72 BPM beat
Audio.setLoops(['dryer-hum']);                   // ambience (normally from zone/room data, see below)
```

Synth voices: crickets `house banded twospot field snowy katydid mole ground bell knock`; decoys
`alarm peeper chikchak`; `tell` (the gecko rattle-swish), `sweep` (Nana's tail), `whoosh swish
brush steam clonk thunk ping fall ring chime sting`. Audiogen effects: the 40 names in
`SFX_NAMES` (hop, land, kick, bonk, hurt, crumb, item-get, floss-swing, raft-splash,
rubber-band-twang, glide-whoosh, ground-pound, glow-flash, save-crack, swap-puff, menu-move,
menu-select, menu-back, dialog-blip, unlock, seed-heart, gecko-chomp, gecko-growl, gecko-snore,
bigtok-bellow, swift-chitter, bat-squeaks, squeak-toy, pillow-bonk, splat, hinge-creak,
beetle-plod, dragon-hiss, crinkle, wall-cling, wall-jump; loops vacuum, dryer-hum, rain-roof, furnace).
One-shots are loudness-levelled at decode (`TRIM_DB` trims), hop/land/kick get rate jitter, 4 copies max each.

**Game events already wired** (from `game.fx`, nothing to do): jump/flutter → hop, leap → twang
pitched down, superjump → twang, walljump, land (soft/hard), cling, kick, bonk, clonk, hurt, pit,
die, item → item-get, pound, crumble, grab → floss-swing, fling/release → whoosh, flash, save,
swap, dash/wallrun → swish, chirpEmpty/useNothing → thunk, checkpoint → ping, dazed → ring,
hide/unhide, chirp → your cricket's own voice + the trapped cricket's answer one beat (50 frames)
later, tap → Hump's knock (+ answer), rescue → sting + rescue chord. Glide and raft starts are
detected from the player. **New events other helpers can emit** with `game.emit(type, d)` and get
sound for free: `tell` / `tailSweep` (`{x, y}`: panned rattle-swish), `crumb`, `unlock`, `heart`.
Boss modules: emit `tell` when a tell starts (not from the renderer's rig, which has no position).

**Data the audio reads** (zone module or `ZONE_INFO[n]` in data/zones.js; room defs override):

| Field | Where | Meaning |
|---|---|---|
| `music` | zone or room | track name in assets/audio/music (default: the zone id, e.g. `z03-kitchen`; boss rooms `boss`, lair `lair`, tank `title`, sandbox `z01-bedroom`) |
| `loops` | zone or room | ambience loops, e.g. `['dryer-hum']` |
| `decoys` | zone (with `room`) or room | `[{voice: 'peeper', room, x, y, every: 1}]` (x/y tiles, every seconds; audible in its room, quietly one room away) |
| `temp` | zone; room `temp: 80` or `{left: 60, right: 85}` | °F; sets chirp rates (Dolbear for Frost). Defaults per zone in `beacon.js ZONE_TEMP`; `tempAt(room, x)` is exported for Frost's thermometer |
| `soundHole` | zone | `{room, x, y}` beacon before the item is picked up (else a `B` marker without `after`, else `zone.beacon`, else the item) |
| `lair` | zone | `{room, x, y}` beacon after the item (else a `beacon` entity with `after: true`, else the cage, else the boss) |
| `beaconVoice` | zone | `'alarm'`, `['alarm','knock']` or `{hole: [...], lair: [...]}`; default the zone cricket's species. Zone 5: `{hole: ['alarm','knock'], lair: ['alarm']}` with the soundHole at the dryer vent |

**Beacon.** Distance = straight line to the best exit of the current room + Dijkstra over exit
midpoints (and doors) to the target. Gain: 0 dB at the target to −24 dB at the zone's farthest
corner (never lower, never silent); Listen +6 dB and music −12 dB; low-pass from 18 kHz down to
1.25× the voice's pitch and reverb wet 0.08 → 0.58 with distance; pan toward the next exit.
Music bus: peaking −6 dB, Q 1.5 at the beacon voice's pitch. Settings (`save.js` keys):
`music`, `sfx`, `beacon` (0..1), `muted`, `beaconChirps` (`'always'` | `'call'` | `'off'`: call =
only the answers; off = silent, the indicator still pulses), `indicator`, `easyPitch` (voices
above 5.5 kHz an octave lower). Change them with `Audio.setSetting(key, value)` (applies and saves).

**Chirp indicator.** `Audio.indicator(game)` → `{show, enabled, mode, angle, dx, dy, loudness 0..1,
pulse 0..1, lastChirpFrame, nextChirpFrame, answerFrame, ripples (4 s after a call), voice, hz}`.
A minimal default (an ear at the screen edge, `#chirp-indicator-default`) is drawn until the HUD
makes its own element with id `chirp-indicator` (or sets `window.__customChirpIndicator = true`).

**Music.** Looping AudioBuffers; ≤ 3 decoded (the wanted track + `carrier` + `boss` if used;
everything else released on a change); 1.5 s loop-seam crossfade on decode; 1.2 s crossfade
between tracks; −12 dB while paused.

**Tests.** `node tools/chirp-check.mjs` (node) or `--browser http://127.0.0.1:8131/` (renders every
voice through `__game.renderChirp`): FFT peak, pulse count, period and length against RESEARCH.md.

## Rendering (milestone 2)

Files: `src/render.js` (renderer, backgrounds, platform painter, water, entities, enemies, NPCs),
`src/cricket-art.js` (crickets), `src/geckos.js` (gecko rig), `src/fx.js` (particles and screen
effects), `src/sprites.js` (registry, per-zone load/release), `tools/make-textures.py`,
`gallery.html` (+ `src/gallery.js`). Everything here is render-only: it reads the sim and never
writes it (replays are unchanged). After adding art run `node tools/list-assets.mjs`; after
adding a zone painting run `python3 tools/make-textures.py <bg>`.

### Room and zone fields the renderer reads (the sim ignores them)

Put these on a room object next to `grid`/`entities` (tile units like entities; **never** as
entities: unknown entity types become enemies). `zone-99.js` (via `tools/make-sandbox.py`) uses
all of them.

```js
// zone module
bg: 'z01-bedroom',            // painting/texture folder (the Hall uses the Bedroom's, the stairwell the Study's)
near: ['spool', 'sock'],      // near-layer props (default: a table per zone in render.js)
motes: true,                  // light motes across the view (default on for living, sunroom, attic)

// room
bg: { v: 'b', mirror: true, x: 0.3, y: 0.6 },   // far painting variant, mirror, where the view sits (0..1).
                                                // Default: a hash of the room id. bg: 'b' also works.
decor: [{ prop: 'spool', x: 7, y: 15, h: 2.2, layer: 'back', flip: false, rot: 0, alpha: 1 }],
        // x = centre column, y = the row it stands in, h = height in tiles (width from the art).
        // layer: 'back' (behind platforms) | 'mid' (in front of platforms, behind actors) | 'front'
        // (over the cricket). prop: a props/ name or any assets path ('carrier/lamp.png').
paint: [{ kind: 'plaster', x: 0, y: 10, w: 14, h: 3 }],
        // solid tiles in the box are painted as a terrain kind: cereal plaster crumbling-floor soil sand syrup
terrainKinds: { C: 'plaster', s: 'sand' },      // what C and s tiles look like in this room (default cereal, soil)
near: false | [{ prop, x, scale: 3..5, flip }], // near layer for this room (false = none)
fx: [{ kind: 'steam', x, y, every: 8 },         // ambient emitters: steam puffs rising from (x, y)
     { kind: 'motes' | 'dust', x, y, w, h }],   // light motes / falling dust in a box
noWay: [{ from: [x, y, w, h], to: [x, y, w, h] }], // tiles: nothing in `from` can get to `to` inside this room
        // (a floor below an unclimbable side, a drop that only comes down). The beacon's path (src/beacon.js)
        // otherwise takes every straight line between a room's openings as walkable. sun-bench, laun-sink.
```

Hiding spots: `{ type: 'hide', x, y, w, art: 'sock' }` picks the art (`props/<art>.png` or a path;
`'none'` = code gap). Default: `hide-log` for big spots, a code-drawn crack for Mote spots. The
hidden cricket is drawn tucked (hide loop, then held; a peek every ~3 s) and shaded over the art.

### Painter, backgrounds, memory

- Platforms: each solid class (zone stone, glass `G`, each terrain kind) is one clipped fill with
  its seamless texture (`textures/<bg>.webp`, made by `make-textures.py`: quilted from the zone's
  far-a painting, luminance remapped between its two darkest palette colours, deepened), wet-edge
  pooling, paper grain (multiply), then a wobbly ink edge whose corners line up between tiles, a
  lighter rim on top surfaces and marks by kind (cracks, speckle, knobbly cereal, glossy syrup
  with drips). Cached per screen at `min(DPR, 2)`; repainted when `game.gridVersion` changes or a
  texture finishes loading. One-way planks, tacks and `%` cracks are drawn over.
- Water: one wobbly band per surface run plus the body as a single fill, a light wet edge, moving
  ripples; currents as arrows.
- Far painting: covers the view at 1.18x and pans across it as the camera crosses the room (slow
  parallax). Tall paintings (the chimney) tile vertically, every other tile flipped. The Bedroom's
  far-a has a light floor band in its lower third: give those rooms a floor of tiles there.
- Near layer: zone props as blurred dark silhouettes along the bottom edge, parallax 1.25, 38%.
- Per-zone memory: on a zone change the renderer calls `S.setZone([bg/<bg>/, textures/<bg>.webp])`,
  which releases the previous zone's paintings, textures and anything added with `S.zoneHold()`
  (gecko rigs add their folder). Rooms bordering another zone preload its painting. Phones (coarse
  pointer and short side < 500, or a small backing store) get the `-phone` paintings via `S.bgPath()`.
- Art ahead of need (`src/room-art.js`, issue #16): the gate holds a room until its art is in (#5),
  but the art is asked for well before: during the title (`main.js warmTitle`: the Continue save's
  room, its zone's critical art and neighbours, then the new game's tank and first Bedroom room),
  on entering a zone (`zoneArt`: every room's gecko rigs, boss props, captives, decor, hiding spots,
  mechanics, enemies and near layer, the lairs first; a small-memory device, `S.lowMemory()`
  (touch-first small screen, or `navigator.deviceMemory` <= 4, never the canvas size): the lairs
  only), aboard the Carrier (the way back) and for the Post destination in focus. A wait that is
  left goes into what's on screen, never with a "Loading" label: the last story panel stays up
  without its hints (`foldIntoStory`; Pause waits), Continue keeps the title up, dimming; a door /
  edge wipe or a travel fade shows the frame before the room change dimming under its ink
  (`renderer.snapshot/drawHeld`). The bare "Loading" ink cover is the fallback (a debug
  `goToRoom`). Check: per frame, the room visible, flat ink or a label drawn, rig and props loaded.

### Crickets

`drawCricket(ctx, id, x, y, facing, {look, t, frame, at, rot, squash, vx, vy, scale, alpha, shade, sheet})`
from `src/cricket-art.js` (or `renderer.drawCricketAt(c, id, x, y, facing, {pose|look, ...})`).
Looks: anims `idle run jump kick chirp hide peek` (Pip has all; others fall back: jump→leap,
kick→run-b, chirp→idle, peek→hide) and poses `leap cling hang glide pound listen dig run-a run-b`,
scaled by `poses/fit.json`. `at`: `'feet'` (default), `'wall'` (cling: x = the wall, facing = the
wall side), `'hands'` (hang from a rope end), `'center'`. Antennae and cerci are code-drawn from
`anchors.json` per frame, rotated with the body axis, tapering, lagging with `vx`/`vy`; per-species
style in `ANT` (Hump very long, Digby stubs, Rin's white band, Katy longer than her body). The
player's look is picked in `Renderer.playerLook()` from the sim state (squash on land, stretch
rising, tilt by vy, the dryer sheet while gliding).

### Geckos (`src/geckos.js`)

```js
import * as Geckos from '../geckos.js';
const rig = Geckos.create('duchess');        // loads meta.json + body/tail/legs/frames; held with the zone
rig.setPose('walk'); rig.walkSpeed = 1.5;    // 'idle' | 'walk' | 'strike' | 'sleep' | extra frames: kite 'glide', lashes 'lick'
rig.wiggle(60);                               // tail-tip tell + "!" ink splat for 60 frames
Geckos.setOnTell((rig) => audio.sfx('rattle')); // audio hook for every tell (or rig.onTell)
Geckos.opts.touch = true;                     // 1.5x "!" on touch screens
const s = rig.scaleFor(1200);                 // nose-to-tail 1200 px (tall: height)
rig.draw(ctx, x, y, s, facing);               // in boss.draw(ctx, renderer); facing -1 = as painted (left)
rig.box(x, y, s, facing); rig.point('nose' | 'eye' | 'pivot' | 'tail', x, y, s, facing);
Geckos.preload('bigtok'); Geckos.ready('bigtok');
```

Anchor: wide geckos stand with (x, y) = the floor under the middle of the body; tall ones (bigtok,
nana) are centred on the body. The tail is one strip bent along a curve, drawn in 4 px on-screen
slices (resampled to the drawn scale first, so no alpha loss), wiggling at the tip; asleep it
curls; legs swing on their pivots in a 2-beat walk; breathing is a slow vertical scale; the eye
gets a glint (not in strike/sleep). Strike/sleep frames are placed at `meta.frames[f].at` with the
tail at their own pivot (`TUNE.<name>.pivots` overrides a bad one: Mossy's sleep). The rig ticks
once per `draw()` (render time); drive poses from the boss's sim state. Sir Bartholomew's parts
(`sprites/npcs/barty*.png`) are plain images: see `gallery.html` for a sample animation.
Gallery: `gallery.html?geckos` (`&pose=sleep` to hold a pose), `?crickets`, `?enemies`.

### Enemies, NPCs, FX

- Enemies: `0.png`/`1.png` alternate every `T.frameRate` frames (default 9; scurry 4; frozen while
  stunned), `2.png` (on its back) while flipped, else frame 0 upside down. `T.drawW` sets the drawn
  width (default 1.35 × hitbox width). Facing left; flipped by `e.dir`.
- NPCs: `renderer.drawNPC(ctx, name, x, feetY, {talking, h, facing, t})`; `npcFrame(name, talking, t)`
  (exported from render.js) gives the path to use this frame (talk flap ~7.5/s) for DOM portraits.
- Items: `itemArt(id)` → `items/<file>.png` (ids differ from file names: glider = dryer-sheet...).
- FX (`renderer.fx`): game events become effects automatically (land/walljump blot puffs, chirp
  ink ripple + screen pulse, item spotlight, rescue petals, hurt flash + small shake, pound shake,
  bonk dots, swap puff). Emit `game.emit('bellow')` for a big shake, `game.emit('tell', {x, y})` for
  a "!" splat. Direct calls from boss draw code: `renderer.fx.puff(x, y, n, size)`, `.ring(x, y, r)`,
  `.petals(x, y)`, `.steam(x, y)`, `.dust(x, y)`, `.mote(x, y)`, `.soil(x, y)`, `.tell(x, y)`,
  `.splat(x, y)`, `.shake(px)` (honours the Screen shake setting), `.flash(n)`, `.spotlight(x, y, frames)`.
  Hook: `renderer.fx.onHit = (event) => {}` (rumble) on every hurt.
- `window.__renderer.perf` = `{paint, frame}` ms (last screen paint, last frame).

### Polish pass: painted objects, look overlay, boss framing

- **Look overlay** `game/data/look/` (`index.js` + `look-a.js` zones 0-3, `look-b.js` 4-6,
  `look-c.js` 7-9 + the Dragon's Lair, `look-d.js` hall/stairwell/chimney/attic): render-only fields
  per room id, merged by `render.js roomLook(room)` (memoised per room def). Its paint regions come
  BEFORE the room's own (the first region that holds a tile wins), decor is appended, and
  `bg` / `near` / `hazard` / `burners` replace the room's fields. Room files stay untouched, and generators
  can re-run safely. Check with `node tools/check-look.mjs` (`--show <room>` letters the regions on
  the grid; `--grid <room>` prints a grid with column numbers).
- **Object painters** `src/objpaint.js`: a paint region with `obj` paints its solid tiles (slick
  'G' included) as a household thing: `appliance` (panel + dials, `door: 'front'|'oven'`,
  `handle`, `vents`, `seams`, `ring: [cx, cy, r]` porthole, `holes: [[x,y,w,h]]` + `inside: 'drum'`;
  holes get a chrome rim), `porcelain`, `wood` (`grain`, `drawers`, `doors`, `planks`, `knobs`),
  `fabric` (`pattern: plain|quilt|stripe|plaid|dots|fluff|knit`, `accent`; full boxes get soft
  rounded corners), `cardboard` (`tape`, `flaps`, `marks`, `label`), `terracotta` (`rim`, `soil`),
  `metal` (`axis`, `bands`, `rivets`), `brick` (`course`, `brick`), `paper` (`books: row|stack`,
  `spines`), `glass`, `stone` (tinted zone stone). Each has `color` (local colour, toned toward the
  zone's darkest by `tone`, so solids stay the darkest values), a light-from-upper-left wash, form
  shadow, watercolour blots with dried rims, a soft-light pass of the zone texture, wet-edge pooling,
  paper grain, details, and an ink outline. The marks are seeded per region (`room:obj:i`), so an
  object that spans several screens lines up. Slick tiles inside an object get soft gloss streaks (the
  "can't cling" cue). All of it is painted into the per-screen platform cache: zero cost per frame.
- `hazard: 'burner'` (or `burners: [{x, y, w, h}]`) draws '^' runs as glowing electric coil rings
  on a drip pan (kit-counter). Default slick 'G' (glass) now has two soft broad reflections per
  screen instead of stripes every 90 px.
- `mech-draw.js`: Duo's push box (`kind: 'box'`) and the duet music boxes are painted with the
  same painters (cached canvases per size).
- **Boss framing** (render only; the sim positions are unchanged): `makeBoss` spec `drawBack(b, ctx,
  renderer, game)` draws behind the platforms (after the far painting). Nana now lives on the attic's
  far wall: she drifts with the view (parallax 0.25 toward the arena centre) with her eye at 27% of
  the view height, at 74% alpha (90% asleep). She is visible in all three phases, faces the cricket,
  sways on the beat and her lids droop as the chorus grows, then she sleeps. Her sweeping tail is
  painted in front: a round, banded, tapering tail along the band (her rig hides its own tail while it
  sweeps; `rig.showTail`). Big Tok is drawn at a render-side position eased along the backsplash, so
  his head stays below the HUD and inside the view (`b._dx/_dy`); his bites and bellows still come from
  the sim's HOME. Barty's eye (`E`) is sim geometry and is left as it was.
- `tools/polish-shots.mjs`: whole-room overviews (`--mode overview`: every screen stitched at
  half scale) or play screenshots, `room[@x,y][#phase][~ms][=name]`, `--all`.

## UI and meta (milestone 4)

Files: `src/menus/screens.js` (every menu and card), `src/story.js` (panels, credits, thanks),
`src/dialog.js` (dialog box), `src/hub.js` (the Carrier), `src/map.js` (the dollhouse map),
`src/meta.js` (meta state on `game.meta`, completion, voices), `src/meta-run.js` (per-step glue
that turns sim events and meta entities into cards, dialog, crumbs, recruits), `src/feedback.js`
(Report a bug), `src/lines.js` (text lookup: `line('geckos.duchess.pre')` reads `data/text.js`,
then a fallback), `meta.css`, `fonts/` (Patrick Hand, Nunito, OFL), `manifest.webmanifest`,
`sw.js`, icons. `main.js` holds the app context `A` that screens get, and the step order:
bug form open → story → title → dialog → menu/card → `hub.update` → `game.update` →
`Audio.tick` → `metaRun.step`. Story, dialog and menus all run from the fixed step, so replays
that include them stay frame-exact. The sim is paused while any of them is up.

### Meta state (`game.meta`, saved with the slot)

`crumbs, upgrades {hearts, songs, ears}, secrets [ids], notCrickets [ids], barty, shown [arrival
ids already popped into the Carrier], stitches, heardAt {zoneId: {room, x, y}}, sounds [Sound Book
ids], songs [tracks heard], lairsSeen, cracks [{room, tx, ty}] (Post), flags {}, damperOpen,
opened, won`. Recruits stay in `game.recruits`; rescues in `game.rescued`. `Meta.completion(game)`
is the % stamp (10 crickets, 8 recruits, 4 Not-Crickets, Sir Bartholomew, all seed-hearts and
song-seeds; totals from `data/house.js` TOTALS). Saves (`save.js`) also keep `taken` per room,
`carrier` (saved inside the Carrier: loads back into it) and `zoneName`.

### What zone builders put in rooms

Entities (the sim lists them in `game.metaEnts`; `meta-run.js` acts on them):

```js
{ type: 'npc', who: 'rolo', x, y, recruit: 'rolo' }   // Up: talk (npcs.rolo.meet + .join), then joins
{ type: 'npc', who: 'peeper', x, y, talk: 'npcs.peeper.meet', recruit: 'peeper' } // Not-Crickets too
{ type: 'npc', who: 'soot', x, y, lines: [['soot', 'Chimney SPARROW?'], ['pip', '...']] }
{ type: 'lair', boss: 'duchess', x, y, w: 2, h: 3, to: 'bed-lair', at: [3, 15] } // Up: the Ready? card
{ type: 'crumbs', x, y, n: 15 }                        // touch: +15 crumbs (once)
{ type: 'secret', id: 'bed-seedheart-sill', x, y }     // house.js SECRETS id: seedHeart +1 heart, songSeed, crumbs
{ type: 'trigger', x, y, w, h, emit: 'story', name: 'tankEscaped' }  // fires game.emit(emit, data) once
{ type: 'carrier', x, y }                              // where the Carrier sits on the map (else house.js bed-carrier)
```

NPCs are drawn with `renderer.drawNPC` (talk flap while their dialog is open). Taken crumbs,
secrets, triggers and joined NPCs are remembered in `roomState[room].taken` and saved.

### Events zone builders and bosses emit (the sim stays DOM-free)

| `game.emit(...)` | Does |
|---|---|
| `'dialog', {key: 'geckos.duchess.post'}` or `{lines: [[who, text], ...], id}` | opens dialog; when it closes `game.meta.flags['dialog:<id or key>'] = true` |
| `'ready', {boss, to?, at?}` | the lair "Ready?" card (also from a `lair` entity) |
| `'recruit', {id}` | a recruit or Not-Cricket (`peeper soot velvet beep`) or `'barty'` joins; toast; autosave |
| `'story', {name: 'tankEscaped'}` | the opening's end: panel 4, then the Bedroom start (`ZONE_INFO[1]`) with the first Chirp prompt |
| `'story', {name: 'ending'}` | ending panels 1-4, credits, "Thank you for playing", then the Carrier |
| `'story', {name: 'damper'}` | the damper card listing who's still missing and where |
| `'heard', {sound: 'alarm'}` | adds a Sound Book entry (ids in `text.js` sounds) |
| `'crumbs', {n}` / `'secret', {id}` | crumbs / a secret from code |
| `'rescue'` (the engine's cage) | autosave; 75 frames later the "X is safe! Return to the Carrier?" card (not in the test zones 98 and 99 unless `game.meta.flags.cardsInSandbox`) |

**Lair door flow:** Enter (↓, issue #27) at a `lair` entity (or `emit('ready')`) opens the card: the gecko's
picture, the trio (Change trio opens the picker), Enter, Not yet. Nana's card shows the voice
rule and keeps Enter disabled until the trio covers low ≤3.5 kHz, middle 4-5 kHz, high ≥5.5 kHz
(Suggest a trio fills one). Enter: Hump out front is swapped for the next chirper ("I'll cheer
from here."), the player moves to `to`/`at` if given, `game.emit('lairEnter', {boss})` fires, and
the gecko's three `pre` lines play once (then `game.meta.flags['pre:<boss>'] = true`: a boss
module waits for that flag before phase 1). After the win, emit `'dialog', {key:
'geckos.<boss>.post'}`, then the rescue (a cage touch, or `game.rescue(id); game.levelComplete =
true; game.emit('rescue', {cricket: id, x, y})`).

**Gentle Mode:** `game.gentle` (true/false, from Settings): hits cost half, tells 1.2 s.

**The tank escape:** New Game plays panels 1-3, then `game.startAt(zone 0's start)` if a zone with
`n: 0` is loaded, and play begins (`game.meta.flags.inTank`). End it with
`game.emit('story', {name: 'tankEscaped'})`. Without zone 0 the game goes straight to panel 4.

### The Carrier (`src/hub.js`)

Invisible tile rooms `carrier-0/1/2` (no shelf / shelf with planks / shelf with the ladder) at
cells (300..306, 300) are added to the World by main.js (`[...ZONES, HUB_ZONE]`); `hub.draw()`
paints the shell (`bg/carrier/shell-N.webp`, stage by rescues 0-2/3-5/6-8/9+), the arrival objects
in per-shell slots (`CARRIER_OBJECTS` in hub.js: floor, shelf, hanging, wall), residents (rescued
crickets wander; recruits and Not-Crickets stand by their objects, bob, and talk in a bubble when
you come close), the crack in the corner, then the player. Facilities: walk up and press Up (or
tap the prompt): Crumb Shop (seed-hearts, song-seeds, big ears for crumbs), Library (Sound Book),
Lamp/map table (map + per-zone item tally), Clinic (full heal + tip), Weaver (map stitches),
Trainer (stub line), Stage (jukebox of tracks heard), Post (crack-to-crack travel), Echo map.
Arrivals not yet `shown` pop in one by one (sting, toast); the 9th rescue's arrivals end in the
Carrier singing (dialog, shake) and set `game.meta.damperOpen` / `flags.damperOpen` (the Attic
damper reads it). Every save crack's menu offers "Go to the Carrier"; the Carrier's crack goes
back to the crack you came from (`hub.returnCrack`), or travels by Post.

### Debug hook additions

`__game.meta()` (meta state + `inCarrier`, `completion`, `ui` (open menu), `dialog`, `story`),
`__game.carrier()`, `__game.recruit(id)`, `__game.open(what, arg)` with what = `complete`
(cricket id), `ready` (boss), `crack`, `damper`, `pause` (tab), `dialog` (a text key),
`ending`, `escaped`. `__game.buttons()` lists the Carrier's facility prompt. `frames()` names:
`title-press`, `title`, `title>settings`, `opening`, `opening-4`, `play`, `play>pause`, `play>map`,
`play>crickets`, `play>sounds`, `play>complete`, `play>ready`, `play>trio`, `play>crack`,
`play>dialog`, `carrier`, `carrier>shop`, `ending`, `credits`, `thanks`...

### Bug reports

`<gh-feedback id="report" trigger="none" repo="">` in index.html (vendor/gh-feedback.js). With
`repo` set: "Report a bug" in Pause and Settings, Ctrl+Shift+F anywhere (pauses first, screenshot
taken as the game pauses), game input ignored while open, pad ○ closes it. Context fields: zone,
room, position, trio, out_front, items, rescues, boss_phase, input, controller, play_time, slot,
errors. `.github/ISSUE_TEMPLATE/bug.yml`.

### Install and offline

`manifest.webmanifest` (fullscreen, landscape), `sw.js` (versioned cache `house-cricket-<build>`,
cache-as-you-go locally; the Pages workflow stamps VERSION and FILES), registered when not on
localhost or with `?sw=1`. Icons from `assets/ui/app-icon-source.png` (Pillow): favicon.png,
apple-touch-icon.png, icon-192/512, icon-maskable-512. Sharing tags in index.html point at
`social-card.jpg` (not made yet).

### Tests

`node tools/meta-shots.mjs [--size 844x390 --tag phone --device "iPhone 15"]` opens every
screen by keys, screenshots `design/screenshots/m4-*-<tag>.png` and runs the text scanner;
`node tools/meta-pad.mjs` drives them with a pretend DualSense only (and Xbox names, unplugging);
`node tools/meta-touch.mjs` by touch on a phone. All take `--url` (default port 8157).

## Entities and mechanics (engine steward)

Files: `src/mechanics.js` (gates, switches, lifts, springs, terrain, thermostat locks, decoys,
lights, Digby's dig; **no DOM**), `src/enemies.js` (every enemy), `src/bosses/base.js` (shared
boss plumbing) + `src/bosses/practice.js` (a complete small fight), `src/mech-draw.js` (render
only: installed by main.js as `renderer.drawMech`, called by render.js after the enemies). The
test zone `data/rooms/zone-98.js` (cells 110-116, 99-100) has one room per mechanic and every
enemy; `tools/entity-test.mjs` checks each headless; `tools/solutions/entities.mjs` records
`design/solutions/entities-*.json`.

```bash
node tools/entity-test.mjs [filter]       # 140 headless checks: gates doors lifts springs terrain thermostat decoys meta enemies boss
node tools/replay-headless.mjs            # every recorded solution through the node sim (fast; then tools/replay.mjs in the browser)
node tools/solutions/entities.mjs         # re-author the zone-98 solutions after engine changes
node tools/check-world.mjs --zone 98      # check-world understands everything below
```

All coordinates are tiles (`x` = column, `y` = row; a thing "standing" on row `y` has its feet
on the bottom of that row). Everything here is deterministic (seeded per room) and persistent
state lives in `game.meta.flags` (saved with the slot): `sw:<id>` for switches, thermostat locks
and piano melodies, `gate:<room>:<id>` for side gates that were pushed open.

### Gates

A gate is a box of tiles that is **solid until its condition holds**, then opens for good
(`unlock` event: sound + puff). Leave the tiles empty (`.`) in the grid; the gate fills them
(default `G`, so no wall-jumping it; `tile: '#'` or `'C'` or `'='` to change). Shut gates are
also solid when seen from the neighbouring room across a shared edge.

```js
{ type: 'gate', id: 'bed-exit', x: 31, y: 10, w: 1, h: 4, opens: { rescued: 'stripe' } }   // a rescue opens it (lair exits)
{ type: 'gate', id: 'damper', x: 12, y: 0, w: 8, h: 1, opens: { rescues: 9 }, card: 'damper' } // N rescues; touching it shows the damper card
{ type: 'gate', x: 5, y: 12, w: 1, h: 4, opens: { item: 'band' } }        // an item (toast "You need the Rubber Band" on touch)
{ type: 'gate', x: 9, y: 12, w: 1, h: 4, opens: { switch: 'pipe-valve' } } // a lever, a thermostat lock or a piano melody with that id
{ type: 'gate', x: 20, y: 12, w: 1, h: 4, opens: { side: 'right' } }      // one-way shortcut: opens when touched from the right
{ type: 'gate', ..., opens: { flag: 'damperOpen' } }                        // any game.meta.flags name (e.g. set by the Carrier singing)
// several conditions = all must hold: opens: { rescues: 9, flag: 'damperOpen' }
// msg: 'text' -> toast on touch while shut; card: '<story name>' -> game.emit('story', {name}) on touch (once per touch)
```

- **The Attic damper** (chim-flue top): `opens: { rescues: 9 }, card: 'damper'`, tiles `G`. With
  8 rescued it is solid and the card lists who is missing; with 9 it opens on the next step.
- **Rescue gates** (bed-lair, bath-lair, kit-sink): `opens: { rescued: '<cricket>' }`. The boss's
  rescue opens them on the next step; no code in the boss module.
- **One-way shortcuts:** a side gate (a latch you push from the far side), a `C` latch pounded from
  above (plain tiles), one-way rungs `=` on one face, or a drop down a `G` wall.
- `Mech.setSwitch(game, id)` (import `* as Mech from '../mechanics.js'`) sets a switch from code
  (boss phases, triggers).

### Switches (levers, pull-chains, valves)

```js
{ type: 'switch', id: 'pipe-valve', x: 5, y: 15 }               // by: 'kick' (default): kick it
{ type: 'switch', id: 'chain-1', x: 8, y: 13, by: 'up' }         // press Enter (↓; issue #27) within 2 tiles below/beside it (pull-chain art)
{ type: 'switch', id: 'bell', x: 20, y: 6, by: 'chirp' }         // a chirp whose radius reaches it
{ type: 'switch', id: 'plate', x: 12, y: 15, by: 'pound' }       // a ground-pound landing on that tile (the Thimble)
{ type: 'switch', id: 'mat', x: 3, y: 15, by: 'touch' }          // walk into it
```

Once on, a switch stays on (`sw:<id>`); emits `switch {id, x, y}`.

### Doors (non-adjacent links: the laundry chute, the attic hatch)

```js
{ type: 'door', x: 16, y: 3, to: 'laun-basket', at: [12, 4] }               // Up to go through (prompt "Go in", or label: 'Climb in')
{ type: 'door', x: 16, y: 3, w: 2, to: 'laun-basket', at: [12, 4], auto: true } // falling/walking into it takes you (the chute)
{ type: 'door', x: 4, y: 15, to: 'att-hatch', at: [6, 15], needs: 'thimble', msg: 'Stuck. Pound it open from above.' }
```

`at` = the tile whose bottom the feet land on (default: the target room's `P`/`S` marker). No door
back = one-way. A door keeps health (no heal) and downward speed. The beacon's path distance and
check-world follow doors, one way (in at the door, out at `at`).

### Lifts (steam vents, dryer updrafts, misters)

```js
{ type: 'lift', kind: 'steam',   x: 3, y: 3, w: 3, h: 13, vy: 9, on: 2.5, off: 1, phase: 0 }   // pushes anyone up; timed
{ type: 'lift', kind: 'updraft', x: 26, y: 4, w: 4, h: 11, vy: 6 }        // glide: true by default: only lifts a gliding cricket
{ type: 'lift', kind: 'mister',  x: 10, y: 1, w: 2, h: 4, vy: 5, on: 1, off: 2 }
```

The box (`x, y, w, h`; `y` = its top row) is the column of moving air; the vent sits at its bottom.
`vy` tiles/s upward (accel `acc`, default 40 tiles/s²), `on`/`off` seconds (omit either = always
on), `phase` seconds offset; it puffs a warning 0.5 s before it starts (`steam`/`updraft` event).
A cricket in an active lift rises at `vy` and pops out ~1 tile above its top (gen-reach measures
a 5-tile vent: rise 6.0); standing in a steam/mister column lifts you off the floor. `glide: true`
(updrafts) lifts only while the Glider is held open (hold Jump), and holds you up at the top.
check-world: any spot in or at the foot of the column reaches the column's top, then a hop (rise
1) or a glide (with the Glider).

### Springs (cushions, the armchair seat) and aphids

```js
{ type: 'spring', x: 20, y: 15, w: 2, power: 9 }   // row y, columns x..x+w-1 become a cushion; bounce = power tiles
{ type: 'aphid', x: 22, y: 15, range: [21, 23] }    // an enemy: harmless, landing on it bounces 5 tiles (spring: n to change)
```

Landing on a cushion bounces you exactly `power` tiles (every cricket; gen-reach checks 4/6/8),
keeping your run speed; **hold Down** to land without bouncing. Cushions and crumbling floors are
never "last safe ground" for pits. check-world adds a launch of rise `power` from spots on them.

### Terrain

```js
{ type: 'terrain', kind: 'syrup', x: 3, y: 16, w: 6, h: 1 }       // solid tiles you draw: run speed x0.5, jump height x0.5 (speed, jump to change)
{ type: 'terrain', kind: 'crumble', x: 11, y: 16, w: 2, h: 1, delay: 0.4, respawn: 3 } // fills its box (#, painted crumbly); falls 0.4 s after first stood on
{ type: 'piano', id: 'liv-keys', x: 20, y: 15, kw: 2, keys: 4, melody: [0, 2, 1] }      // key tiles; pound to play; the melody sets sw:liv-keys
```

- Terrain boxes add their `paint` for the renderer (syrup, crumbling-floor, sand, soil, plaster).
- **Crumbling floor:** each entity is one unit: the whole strip falls `delay` after it is first
  stood on and comes back after `respawn` (if you are not in it). Several 2-tile strips = run
  across; one long strip = only Stripe's Dash crosses (in 0.4 s a run covers 2.2-3.2 tiles, her
  dash about 5.4): put a ceiling over it so it can't be jumped. check-world treats it as floor.
- **Piano keys:** a row of `keys` keys `kw` tiles wide on row `y` (filled as tiles). A ground-pound
  landing on a key sinks it and plays its note (`note {i}`: a major scale); the last
  `melody.length` notes matching the melody solve it (gates `opens: {switch: 'liv-keys'}`).
- **Soil and sand** are the `s` tile (`terrainKinds: { s: 'sand' }` to paint it as sand). Digby
  digs: hold Down on soil (0.4 s, then a tile every 0.2 s) or Down + a direction into a soil wall.
  Dug soil stays dug (saved like broken cereal). Nobody else digs; check-world treats it as solid.
- **Cereal / plaster / soot:** the `C` tile (pound from on top; `terrainKinds: { C: 'plaster' }`).
- **Water currents:** `{type:'current', x, y, w, h, vx}` (unchanged).

### Thermostat locks (Frost)

```js
// room: temp: { left: 60, right: 84 }   (°F at the left and right edges; src/beacon.js tempAt reads it)
{ type: 'thermostat', id: 'laun-thermo', x: 16, y: 13, target: 72, tol: 1 }
{ type: 'gate', x: 26, y: 12, w: 1, h: 4, opens: { switch: 'laun-thermo' } }   // or crumbs/secret behind it
```

When **Frost** chirps anywhere in the room where `tempAt(room, x)` is within `tol` °F of the
target, the lock opens (`sw:<id>`, `unlock`, toast). Chirping at the wrong spot reads the
temperature out ("68°F. It wants 72°F."). Enter (↓) at the lock: its target, and the Frost hint for
anyone else. check-world counts a lock as open once it is reachable and Frost is home
(`--rescued frost` for zones before the Pantry's rescue).

### Sound holes and decoys

- **Sound hole:** the `B` marker (or `{type:'beacon', x, y}`; `after: true` = the lair target), unchanged.
- **Decoys** are timed by the sim on the game clock and emit `decoy {voice, x, y, far, answer}`
  events that audio.js plays positionally (quietly one room away):

```js
{ type: 'decoy', voice: 'alarm', x: 20, y: 2, every: 40 }                      // the Hall's smoke alarm: one beep every 40 s
{ type: 'decoy', voice: 'alarm', x: 28, y: 3, every: [8, 10], answers: true }  // the Laundry's: 8-10 s, beeps back a beat after your chirp
// zone module: decoys: [{ voice: 'peeper', room: 'sun-pots', x: 9, y: 14, every: 1 }]  (same fields; heard faintly next door)
// room def:    decoys: [{ voice: 'chikchak', x: 4, y: 3, every: [3, 4.5] }]
```

`every`: seconds, or `[min, max]` (seeded per beep); default the voice's own rate (`chirps.js`:
the alarm voice is now 8-10 s, not 4 s). `answers: true`: a chirp within `hear` tiles (default
14) gets a beep 50 frames (one 72-BPM beat) later. The first beep you hear emits
`heard {sound}` (Sound Book). The Laundry beacon (`beaconVoice` alarm) answers your chirp anyway
(the beacon's answer).

### Lights, hiding, loud, dark

```js
{ type: 'light', x: 28, y: 3 }   // a lamp/window clothes moths flutter to (a Glow flash beats it for 8 s)
```

Hiding spots (`h`, `m`, `{type:'hide'}`), loud zones (`{type:'loud'}`), dark rooms (`dark: true,
needs: 'glow'`) are unchanged. Hidden crickets are never touched, targeted or seen.

### People, collectibles, save cracks (the meta layer: `meta-run.js`, see "UI and meta")

```js
{ type: 'npc', who: 'beep', x: 22, y: 15, talk: 'npcs.beep.meet', give: 'battery', giveTalk: 'npcs.beep.battery', recruit: 'beep' }
//   give: with the item, Up plays giveTalk, takes the item, sets flags['gave:beep'], then joins (Not-Crickets: peeper soot velvet beep)
{ type: 'npc', who: 'rolo', x, y, recruit: 'rolo' }        // recruit join; or game.emit('recruit', {id}) from code
{ type: 'item', item: 'battery', x: 8, y: 15 }             // the battery quest item (data/items.js: quest: true, opens no gate)
{ type: 'crumbs', x, y, n: 5 }                             // crumbs
{ type: 'secret', id: 'heart:bed-sill', x, y }             // seed-heart (+1 heart); 'song:<name>' = song-seed
{ type: 'save', x, y } or S                                // Up: heal + save; its menu has "Go to the Carrier" (and Post)
```

Test zones (n 98, 99) never open modal cards (zone complete, damper) so replays stay frame-exact.

### Enemies (all data-driven, `src/enemies.js`)

Entity: `{ type, x, y, range: [x0, x1], dir: -1|1, path: [[x, y], ...], ...numbers }`. Any of
`speed every sight diveSpeed chargeSpeed spring loud damage grainSpeed upT downT watchT restT
tellT cloudT maxSpeed` on the entity overrides the type. A one-tile `range` ([20, 20]) = stands
its ground. Flyers spawn centred in their tile. Sprites: `sprites/enemies/<type>/0.png, 1.png`
(walk), `2.png` (flipped by a kick).

| type | behaviour | deal with it |
|---|---|---|
| `ant` | patrols its platform / range | kick, hop |
| `mites` | drifts slowly, leans toward you | **chirp scatters** (gone 6 s) |
| `silverfish` | darts along the floor (300 px/s bursts, pauses) | jump timing |
| `mosquito` | hovers; sees you within `sight` 5 → tell 0.45 s → dives at where you were → back | kick |
| `cockroach` | scuttles; you come within 2.5 tiles or kick it unstunned → **flies off** in an arc | chirp-stun, then kick |
| `fruitflies` | a 70x90 px cloud that **blocks** (pushes you back, no damage) | **chirp scatters** (gone 10 s) |
| `weevil` | sits (speed 0) facing `dir`; rolls a rice grain along the floor every `every` 2.5 s | jump the grains |
| `antsoldier` | patrols; sees you ahead within 7 → wind-up 0.6 s → charge 330 px/s → dazed 1.2 s | kick from **behind** (or while dazed); front kicks clonk |
| `clothesmoth` | flutters to light: a Glow flash (8 s), your glow in a dark room, a `light`; else swoops if close | lure it with the Glow Bead |
| `earwig` | slow patrol; its pincer end hurts, its tail end blocks | kick its **tail end** |
| `dustbunny` | rolls; downhill it speeds up (to 240) and grows (to 2x); walls bounce it; kicks push it | **ground-pound splits it** |
| `stinkbug` | plods; a stink cloud (3x2 tiles) every `every` 5 s and when kicked; lingers `cloudT` 4 s and hurts | wait for it to fade |
| `booklouse` | crowds a gap, jittering | **chirp scatters** |
| `wolfspider` | sees you within 7 → watches (turns, 0.9 s tell) → pounces where you stand → rests 1 s | chirp-stun, or hide (can't see you) |
| `wasp` | hovers; sees you within 8 → tell 0.6 s → dives in a straight line → flies home | dodge |
| `aphid` | grazes; harmless; **a spring** (5 tiles) | bounce on it |
| `centipede` | races a looped `path` of tile waypoints (walls, ceilings) at 420 px/s, or its floor | **Glow flash stuns** (chirps don't); kick only when stunned |
| `cellarspider` | hangs high, drops on silk (every `upT` 2 s or when you pass below) to the floor (`drop: n` tiles), waits 1 s, climbs | time it |
| `beetle` | darkling beetle (unbeatable): plods its route, pauses at the ends | hide |
| `vacuum` | robot vacuum (unbeatable): a looped `path` (or back and forth); a **moving loud zone** (`loud` 2.5 tiles: dazes without Earplugs); catching you **sends you to the room checkpoint** (no heart); the `vacuum` hum loop plays | hide, Earplugs, the Cloak |

Kicks flip bonkables (they fall, lie on their backs, scurry off, return to their spawn 6 s later);
chirps stun them for the Chirp stat's time (Rin's Lullaby x3) unless the type scatters or ignores
chirps; a Glow flash stuns everything bonkable in 170 px for 4 s. Events: `bonk clonk stun scatter
startle stink grain split enemyTell sentBack` (enemyTell = an enemy's own "!" tell, not a gecko's).
Projectiles (grains, clouds) live in `game.projectiles`.

### Bosses: the shared plumbing (`src/bosses/base.js`)

```js
// src/bosses/duchess.js
import { makeBoss } from './base.js';
export default makeBoss('duchess', {
  phases: 3, len: 420,                     // len: nose-to-tail px of the drawn rig
  start(b, game) { b.mode = 'stalk'; },     // on phase start and every restart (b.phase, b.rng seeded per phase)
  tick(b, game) {                           // every step while fighting
    if (b.mode === 'stalk' && near) { b.mt = b.tell(b.x, b.y - 40); b.mode = 'tell'; }   // 0.8 s (1.2 Gentle) + 'tell' event
    if (hitPlayer) b.hit(1, b.x);            // Gentle Mode: every other strike is free
    if (tabPulled) b.nextPhase();            // after the last phase: b.rescue()
  },
  draw(b, ctx, renderer) { return false; }, // optional extras; return false to also draw the body
});
// bosses/index.js: import duchess from './duchess.js'; BOSSES = { duchess, ... }
// room: { type: 'boss', boss: 'duchess', x: 16, y: 15, checkpoints: [[3, 15], [3, 15], [20, 11]], cricket?: 'stripe', rig?: 'duchess' }
// door: { type: 'lair', boss: 'duchess', x, y, w: 2, h: 3 } + a save crack: the "Ready?" card (meta-run)
```

What the base does: phases 1..n (`game.bossPhase` follows; `__game.setBossPhase(n)` works);
**losing restarts the phase** (health 0: health restored, back to that phase's checkpoint, or
where you stood when it began; `phaseRestart` event; `game.die()` never runs in the arena);
`tell()` (0.8 s or the lair's `timings.tell`, 1.2 s with `game.gentle`; emits `tell {x, y}` for the
rattle-swish and "!"; `b.telling`); `hit()`; the fight's **fixed chirp** (`LAIRS[name].chirp`
radius tiles / stun s; game.js swaps it into every chirp while the boss is in the room);
`rescue()` (frees `LAIRS[name].cricket`, `levelComplete`, `rescue` event → the zone-complete card;
`opens: {rescued}` gates open next step); `ready()` (the Ready? card); drawing with the gecko
rig from `src/geckos.js` (pose from `b.pose`: idle walk strike sleep or an extra frame; `b.facing`;
the tell wiggles its tail) or a wash-and-ink shape until the art loads. `b.x`/`b.y` = the floor under
its body (room px). See `bosses/practice.js` (paces, tells, lunges; kick a target per phase).

### check-world and gen-reach

check-world now understands gates (all `opens` kinds; the fixpoint collects items, rescues from
cages and bosses, levers, thermostats with Frost home, piano melodies with the Thimble, side
gates touched from their side), doors, lifts, springs and aphids, syrup and crumbling floors.
New flags: `--rescued a,b`, `--flags x,y`. Test zones may carry `minItems`/`rescued` themselves.
gen-reach also measures spring bounces (power 4/6/8 must rise exactly that, any cricket) and a
5-tile steam vent and updraft (must lift at least 5 tiles); results in `reach.js moves.spring*`,
`moves.lift`.

### Not done (engine)

- Enemies don't collide with gate tiles' neighbours specially, and flyers ignore walls (keep them
  in open air or give them a `range`/`path`).
- (Duo's shove, Chip's duet doors and the Cellophane Cloak are built: see Builder changes, builder C and fixer.)
- Gentle Mode's "hits cost half" is applied to boss strikes (`b.hit`), not to enemy contact.

## Builder changes

- [builder D] **The Hall and the stairwell are in** (`game/data/rooms/links.js`, generated by
  `tools/make-zone-d.mjs`; registered in `rooms/index.js`). Link spans exactly as in house.js:
  hall-top left rows 10-13 (floor row 14) for bed-lair; hall-floor right rows 30-33 (= cell 9,5
  rows 12-15) for bath-door; stair-landing left rows 30-33 (cell 16,4) for bath-lair, right rows
  26-29 (cell 17,4, a glide from the picture ledge) for stu-door; stair-flight right rows 22-25
  (cell 17,6, a glide from the steps) for the liv-armchair pelmet; stair-foot left/right rows 30-33
  (cell 16,8 / 17,8) for kit-fridge / liv-armchair. Test your links from these starts:
  `goToRoom('hall-top', {x: 3, y: 13})` (the door-frame ledge), `goToRoom('hall-floor')` (P near
  the Bathroom door), `goToRoom('stair-landing', {x: 3, y: 33})`, `goToRoom('stair-foot')` (the
  save crack), `goToRoom('stair-flight', {x: 50, y: 21})` (the step the pelmet glide starts from).
  Solutions: `design/solutions/link-hall.json`, `link-stairs.json`, `link-stairs-glide.json`.
- [builder D] **The chimney** (chim-flue, chim-top, chim-ash, same file): the flue's lips are G,
  2 deep, at rows 70 (right, cols 18-19), 66 (left, cols 12-13), 62 (right)... every 4 rows; a
  jump + flutter crosses 4 up / 4 across. **Builder B (liv-hearth):** give a standing spot about 4
  rows below and 4 tiles across from the first lip, e.g. a smoke shelf at liv-hearth rows 2-3,
  cols 12-13 (surface row 2: chim-flue row 70 is 4 rows up, cols 18-19 are 4 across). chim-ash's
  lowest lip is row 34 right (cols 18-19), 4 up from bas-chimney's row-2 lips; its top lip is row 2
  right, under the hearth floor (liv-hearth rows 34-35): the climb comes up through the plug hole
  (cols 14-17) onto the hearth floor beside it. The damper is a gate in chim-top row 53.
  The first flue lip (row 70) and chim-top's first lip (row 52) are 3 deep: a jump that crosses a
  room edge loses a few frames. A second damper gate (chim-flue row 0) shows the damper card from
  below. Known: the climb is gated by the flutter for every jump except Hump's 4-rise jump and a
  pixel-exact Rubber Band super-jump; the damper (nine home) is the real gate to the Attic.
  check-world's coarse arcs can't see jump + flutter across 4 tiles (the chimney zone reports only
  the start room); `design/solutions/link-chimney.json` (hearth shelf -> flue -> damper -> attic) is
  the proof.
- [builder D] **Zone 10 (the Attic) and Nana are in** (`rooms/zone-10.js`, same generator;
  `src/bosses/nana.js`). Nana's door in att-boxes is a gate `opens: {flag: 'pre:nana'}` (the Ready
  card's Enter teleports to att-lair; once her lines are heard the passage stays open). Nana emits
  her own rescue with `final: true`, then `dialog geckos.nana.post` and `story ending`.
  check-world: `--zone 10 --flags pre:nana`. Solutions: `zone-10-path.json`, `zone-10-boss.json`,
  `link-stairs-pelmet.json`, `link-chimney.json`. Authoring: `node tools/solutions/zone-d.mjs`.
- [builder D] `ui.js`: `game.portraitGlow = {cricketId: '#colour'}` (set by a boss, null to clear) makes
  those HUD trio portraits glow (Nana phase 2). `meta-run.js`: a `rescue` event with `final: true`
  skips the zone-complete card (Nana's rescue: the boss emits the ending story itself).
- [builder A] `game.js`: `this.inp = inp` at the top of `update()` (the last sampled input, so a
  scripted set piece can read held buttons: the tank's lid reads `pressed.enter`: ↓ under the gap; jumping into it needs no input read). Nothing else reads it.
- [builder A] `bosses/tank.js`: the opening's set pieces as boss-registry scripts
  (`{type:'boss', boss:'tank', beat:'cup'|'sand'|'decor'|'lid'}`), with `music: 'title'` and
  `phase: null`; the lid beat emits `story {name:'tankEscaped'}` only when
  `game.meta.flags.inTank` is set (New Game), so `goToRoom` replays of the tank stay frame-exact.
- [builder A] `game/data/rooms/grid-a.js`: a tiny grid painter the zone-00..03 modules use
  (`grid(sw, sh).clear/box/row/put/rows()`); the rooms are still plain string grids.
- [builder A] Recorded solutions are authored by `tools/solutions/zones-a.mjs` (walk/jump/climb/
  wall-climb helpers on top of `Author`). New prop `props/carrier-keeper.png` (the Carrier, seen
  from outside in bed-carrier).
- [builder B] `render.js` decor: `after: '<cricket>'` shows a decor item only once that cricket is
  home, and `{ gecko: 'lashes', x, y, len: 300, pose: 'sleep', flip, after: 'frost', layer: 'mid' }`
  draws a gecko with its rig (curled tail, breathing, a slow "z"): the after-fight dozing geckos
  (house.js DOZING). Used in pan-jars, laun-sink, liv-armchair.
- [builder B] `main.js` drawMetaWorld: `crumbs` and `secret` entities were never drawn; they now
  bob as `items/crumb.png` / `seed-heart.png` / `song-seed.png` (by the secret's kind) until taken.
- [builder B] Bosses `lashes`, `peridot`, `gargy` (src/bosses/). They read `game.fx` `pound`
  events (Gargy), set `Mech.setSwitch` (Lashes opens his top-shelf stairs gate), tweak
  `game.mech.springs[i].power` at run time (Gargy's shoved cushions) and shorten a fruit-fly
  swarm's `goneT` (Lashes: it re-forms in 3 s). Their lair doors use a `trigger` entity
  (`emit: 'ready'`) in the arena doorway so walking in shows the Ready? card once.
- [builder A] `render.js drawBackground`: a room's `bg` object may name a painting folder,
  `bg: { folder: 'z00-tank', v: 'a' }` (bed-lair uses the tank's painting: you're inside Duchess's tank).
- [builder C] **The Cellophane Cloak** (`player.js`, `CLOAK = {arm: 8, last: 180, recharge: 360}`
  frames): hold the Cloak key (Shift; stick / D-pad up: issue #27) in the open (ground or air, no hiding spot within reach) for 8 frames and you
  vanish for up to 3 s while Up stays held; then 6 s to recharge. While cloaked `p.hidden` is true
  (`p.cloaked` / `state().cloaked` too), so every enemy, gecko and projectile ignores you exactly as
  if you were in a hiding spot; tacks, pits and loud zones still count. Being hurt or reset drops it.
  Events `cloak` / `uncloak` (crinkle); render: a faint shimmer, and a recharge arc over the head.
- [builder C] Boss render hooks: a `makeBoss` spec may give `drawDark(b, ctx, renderer, game)`
  (replaces a dark room's darkness: call `renderer.drawDark(ctx, game)` and add light) and
  `drawOver(b, ctx, renderer, game)` (screen space, after the darkness: Ember's red eyes).
- [builder C] `audio.js`: `game.emit('sfx', {name, gain, rate, pitch, x})` plays any sfx or synth
  voice from sim code, panned to x (bosses use it for chomps, hisses, echo blips).
- [builder C] `mechanics.js`: switch `by: 'rhythm'` (`n`, `beat` frames, `tol`, `hear` tiles, `good`,
  `miss` toasts): n chirps in a row, a beat apart (Peeper's chirp-off), and on any switch
  `then: [[event, data], ...]` emitted when it flips; `mech-draw.js`: `draw: false` hides a switch.
- [builder C] `main.js`: `__game.goToRoom` closes an open dialog and a pending card (a fresh game for
  replays). `menus/screens.js`: the Ready card falls back to `sprites/npcs/<boss>-eye.png` when the
  boss has no gecko rig (Sir Bartholomew). `text.js`: `geckos.barty` (name, species, pre, post, waveHint).
- [builder C] Rooms are drawn by `tools/make-zone-07.py`, `make-zone-08.py`, `make-zone-09.py`,
  `make-lair.py` (helper `tools/zonegen_c.py`); solutions by `tools/solutions/zone-07.mjs`,
  `zone-08.mjs`, `zone-09.mjs`, `lair.mjs` (zone-07.mjs has `navTo` / `wallClimb` / `runTo` helpers).
  `tools/shots-c.mjs` screenshots rooms and runs the text scanner. **Dialogs pause the sim in the
  browser**: a boss emits its `post` dialog on the same step as its rescue, and boss solutions end
  on that frame (else the browser replay's play frames fall behind the headless ones).
- [fixer] **Duo's Shove** (`mechanics.js`, `{ type: 'push', id, kind: 'box'|'dice'|'spool', x, y, w, h, heavy?, prop? }`,
  x/y = the top-left tile like a gate; leave the tiles `.`). Its tiles become the new kind **`K.PROP`** (physics.js:
  solid, never clingable, never painted by the platform painter; `mech-draw.js drawPush` draws the block, a prop image
  for dice/spool or `prop:`). Standing beside it on the ground pressing into it for 8 frames moves it a whole tile if
  the next column is free (it slides visually; the pusher is held against its drawn edge); with nothing under it, it
  falls. Heavy blocks (default) move only for the `shove` perk (Duo; others get a toast), `heavy: false` for anyone.
  Push speed `(1 + wt) / 2` tiles/s (`Mech.pushSpeed`: Duo 3, Pip 2, Frost 1). Position saved in
  `flags['push:<room>:<id>']`; push tiles are never "last safe ground". Event `shove`. check-world treats a block as
  solid where it starts (reach); its trap check also judges each shove ([issue #17], see check-world). Used: laun-shelf's detergent box (the `laun-duo` cubby behind it).
- [fixer] **Chip's Duet** (`{ type: 'duet', id, x, y, hear: 6, window: 2, then: [[event, data], ...] }`): a two-keyhole
  music box. A chirp by Pip or Chip within `hear` tiles lights its keyhole; the other one's chirp within `window` s
  (swap in between) opens it (`sw:<id>`, `unlock`, `duet` events, then the `then` events once). Anyone else's chirp
  gets a hint toast. Post-game by construction (Chip is freed by beating Nana). Used: `stu-duet` (stu-globe) and
  `att-duet` (att-boxes), each `then: [['secret', {id}]]`; meta-run gives a `duet` secret its house.js `crumbs`
  (100 / 150) and adds the `finale` track to the Stage. Drawn by `mech-draw.js drawDuet`.
- [fixer] Enemy entities may override `block` and `knock` too (`spawnEnemy`): a `block: true` beetle fills a 1-tile
  tunnel (pushes you out like a wall, and hurts), so only a hidden/cloaked cricket passes: the `kit-cloak` beetle nest
  under kit-table's dishwasher (row 33, cols 80-89; a Cloak-only shortcut west from the under-sink cabinet).
- [fixer] A ground-pound splits a dust bunny within a slightly larger box (+12 px each side, +16 above).
- [fixer] `game.js` tileHook: a neighbour room's **broken** tiles (cereal pounded, soil dug; `roomState[id].broken`) are
  open when seen across the shared edge (before: its base tiles, so the pounded hearth plug was still a ceiling from
  chim-ash).
- [fixer] Upgrades: `player.chirpRefillMul` (refill time multiplier; main.js applyUpgrades: 1 / (1 + 0.25 x song-seeds
  found + songs bought), song-seeds counted by house.js kind) is read by player.js; `beacon.js listenReach(p)`
  (= `p.listenRange` x 2 for Pip's listen2) and `listenGainDb(m, p, boost)` give the beacon's gain while listening
  (audio.js gain and the indicator's loudness): the distance fraction shrinks by the reach.
- [fixer] `meta-run.js`: talking to an NPC who has already joined plays `npcs.<who>.after` (else their Carrier line);
  `recruit {id:'barty'}` toasts `npcs.barty.giftToast` and autosaves (barty.js emits it on befriending; the Carrier
  arrival says `carrier.gift`); a `shortcut` secret toasts `ui.shortcut`; `crumbs` secrets use house.js `crumbs`.
  `ui.js`: toasts render `{action}` tokens as key caps.
- [fixer] Bosses: Duchess phase 3, a first lunge into a berm glances off (the second always comes); Peridot phase 2
  starts under the middle lamp, 1.2x speed, 1.2 s rests; Nana phase 2 stones hear 9 tiles, sweeps every 340 frames
  at 1.7 tiles/frame, the chorus count-in 130 frames, Chip hops down beside you on the win; Barty's knock-back can't
  push you past x 1.5 tiles (the arena door).
- [fixer] Solutions: `tools/solutions/fixer.mjs` writes `fixer-laun-duo`, `fixer-stu-duet`, `fixer-att-duet`,
  `fixer-kit-cloak`, `fixer-chim-ash` (the top hop through the hearth plug hole). Re-recorded: zone-01-path/-boss
  (zones-a.mjs), zone-05-boss, zone-06-path-band/-glider (zones-b.mjs), zone-10-boss (zone-d.mjs; the Nana brain now
  walks to the edge of its platform before dropping). `node tools/entity-test.mjs fixer` checks all of the above.
- [playtest] `meta-run.js`: a `trigger` is handled on the step it is touched (its fx event used to be skipped), its box
  uses `y` as its **top** row (the other meta entities stand on `y`), and its own `key` field reaches the event (game.js
  keeps it as `textKey` on metaEnts). Write triggers as `{type:'trigger', x, y (top row), w, h, emit, key|lines|...}`.
- [playtest] `bosses/base.js`: `makeBoss(name, {postLines: true})` emits `dialog {key: 'geckos.<name>.post'}` on the
  rescue step (Duchess, Chikchak, Big Tok, Kite). The other bosses emit their own.
- [playtest] Level fixes (see OPEN_ISSUES "Play-test"): bed-lair low leaf; kit-pantrydoor hole 2 wide (cols 18-19) +
  laun-stairs ladder rungs (house.js link span 18-19); pan-shelves rungs (cols 19-20); laun-lair "Climb the hose" and
  laun-sink "Climb the pipe" doors to the stair head; liv-hearth firebox lips 2 deep + a low lip (row 31) + the mid lip at row 5.
- [playtest] **Modals in the headless sim** (`tools/sim.mjs` MetaLite, on by default in `makeSim()`): after each update
  it opens the modals the browser would (trigger dialogs/Ready? cards, `dialog`/`ready`/`save`/`story` events, the rescue
  card 75 frames on, talking (Up near an NPC), a lair door's Up), releases every key and takes one input sample (the
  modal's), then, after that frame's own key events, presses the still-held keys again. `tools/replay.mjs` does the same
  in the browser (steps by **game** frames; Enter closes a dialog, Escape a card), so solutions that cross a trigger
  (zone-03-path: the fridge; zone-05-path: the dryer) replay identically. Tap modal-opening keys (↓ at a door: Enter fires 3 frames after the press) for one frame.
- [playtest] **Whole-game run** `design/solutions/full-run.json` (`start: {from: 'title'}`, events on *step* numbers
  since the freeze; replay: `node tools/replay.mjs design/solutions/full-run.json`; browser only). Authored by
  `tools/solutions/full-run.mjs`: the gameplay is one continuous headless game (`RunAuthor`: Carrier rooms, arrivals and
  the singing modelled; each modal gets an action: enter / carrier / back / trio+back / close), reusing recorded zone
  solutions where they start at an exact state (a Ready? card's teleport, a save crack after the Carrier) and the
  builders' authoring functions elsewhere; `BrowserAuthor.chain()` then plays it in the browser with real keys, checking
  each modal opens on the model's frame and lands where the model did. Re-run it after any change to rooms, physics,
  bosses or menus.
- [final-S] **First load.** index.html holds the press-any-key title as static HTML (`#overlay > .title-art[data-boot]`,
  `.menus[data-boot] > .panel-press[data-boot]`) plus an inline script that sizes the stage (as main.js's resize), waits
  for title.webp to decode and both fonts, adds `body.title-ready`, and then `import('./src/main.js')` (then gh-feedback.js).
  `ui.js` adopts the boot nodes in place (never re-inserted: that would restart the fade/animations) and `ui.menu('press')`
  keeps the boot panel. A press before the game loads sets `window.__bootPressed` (main.js starts with the title menu).
  **Tools must wait for `window.__game` after open/goto/reload** (replay.mjs, meta-shots/-pad/-touch, shots-c, lair-shots,
  chirp-check, polish-shots now do; author.mjs and pt-checks already did). title.webp is 1920x1072.
- [final-S] **Test zones only in dev:** `data/rooms/index.js` loads zone-98/99 with a top-level `await import()` only when
  there is no `location` (node tools) or the URL has `?dev`. `tools/replay.mjs` adds `?dev` to its URL.
- [final-S] `game.inFight()` (a boss with `lose()` that isn't done); `checkHazards`/`fallOut` call `boss.lose()` instead of
  `die()` in a fight. `game.backToEntrance()` (Pause > "Back to room entrance"): the phase restart in a fight, else back to
  `entrySafe || entry` with health kept, event `entrance`.
- [final-S] **Cracks:** `meta.js lairCrack(world, arenaOrBoss)` (the save crack nearest the lair door in the house.js room whose
  `lairDoor` is the arena), `homeCrack(world)` (zone 1's start crack), `isHubCrack(c)`. meta-run stores `meta.lairCrack` on
  each rescue; the zone-complete card's Return uses it; `game.returnCrack` is where the Carrier's "Back" goes (saved as
  `returnCrack`; `hub.returnCrack` is no longer read by main.js); `game.homeCrack` is the last fallback. `save.js` never
  writes a `carrier-*` crack and repairs old saves that did. `tools/author.mjs` RunAuthor uses `lairCrack` for complete cards.
- [final-S] **Menus:** `ui.onKey` is cleared by `menu()` and `closeMenu()`; main.js `PAUSE_TABS`: the pause key closes only
  the pause tabs, elsewhere it is Back (`ui.onBack`); the map key works only from the pause tabs; `resume()` clears
  `A._trioDraft`. A portrait phone pauses on resize. `Audio.music(null)` on quit, new game and continue.
- [final-S] **Beacon HUD:** `Audio.indicator()` also returns `frame`, `history` (beacon chirp frames, last 5 s) and `decoys`
  (decoy event frames); `ui.updateMetaHUD({..., beacon, listening, alwaysRipples})` draws the ear indicator (SVG, `--pu` pulse),
  edge ripples (`.beacon-ripples > .ripple`, one per chirp) and the rhythm strip (`canvas.beacon-strip`, `ui.drawStrip`).
  `meta.flags.indicatorHint`: the one-time Bedroom toast (`ui.indicatorHint` in text.js).
- [final-S] `map.js rooms()` leaves out zones with n >= 90 and the tank; zone names are clamped inside the canvas.
- [final-S] `.github/workflows/pages.yml` at the repository root publishes `game/` with the sw.js stamp step.
- [final-G] **Touch camera** (`world.js Camera`): `hFrac` (view height / 720; main.js sets it when a touch screen wider than 16:9 is
  filled edge to edge) and, with `touchBias`, the cricket 40% from the top and `clamp()` allowing a third of the view past the
  room's bottom (0.12 past its top). `render.js drawOverscroll` continues the edge tiles there (an interior slice, mirrored,
  darkening). main.js: `viewFrac`/`resize()` fill and `phoneZoom()` 1.1 (marked [final-G] lines); `fx.drawScreen` and the near
  layer use the real view height. The camera is never read by the sim, so replays are unchanged.
- [final-G] `text.js geckos.<name>.hint` (all ten geckos + barty): one line on the Ready? card; `screens.js lairReady` renders it
  (`p.nana-rule.boss-hint`, a marked line). Also `signs.berm`, `geckos.peridot.flicker`,
  `geckos.gargy.again/otherSide`.
- [final-G] `bosses/tank.js`: decor `land: [x, y, w, h]` (a 2x2 rock of `K.PROP` tiles). zone-00 tank-decor: a sand bank at cols 24-29.
- [issue 7] `bosses/tank.js` sand, **Duchess hunts** (design: Screens, Opening, beat 3): a state machine of plain fields on the beat
  (no closures, no randomness). Real lunges after the tell (`TELL` from base.js: Gentle Mode's longer tell, `'tell'` with `frames`),
  the end fixed at the lunge's start and stopped at a berm face (`e.berms`: the berms' middle columns); only the snout box catches:
  a roar (`gecko-growl` at rate 0.7) and **`player.shove(dir, ctx, {vx, vy, lock})`** (a plain push: state air, fall profile, lock,
  no event, no damage, no flash; not `daze()`, whose event shows the earplugs toast, nor `hurt()`), a roar cooldown, the skitter
  clamped 1.5 tiles from the left edge. Hidden in the log ('h') while she's awake: she comes, tells and lunges into it if she hasn't
  lunged yet, sniffs 2 s and shrugs; the beat sets **`player.hideHold`** each step while she's awake and he's hidden (player.js
  `_hide`: only Jump leaves; ui.js prompts "Jump to leave"). A Chirp in the log (the `'reveal'` event, read from `game.fx`) or a Jump
  out while she's at it: a recoil, no skitter. The shrug adds `'duchess-asleep'` to `g.rs('tank-sand').taken`: the exit hold
  (`e.exit`, col 60) and a quiet nap on coming back read that flag, never her mode. The "Hide in the log!" note is put up at the log's mouth by
  the script (`g.scriptNote`, [issue 9]). Checks: `tools/tank-test.mjs`; rewind cases in tools/rewind-test.mjs.
- [final-G] `chikchak.js`: `b.away` (2.5 s facing away at every phase start: no sight), knock-back clamp at x 2 tiles.
  `peridot.js` phase 1: two tugs (`b.half`, `b.needFloor`, lamp flicker). `gargy.js` phase 1: two bonks, the second from the
  other side cushion (`b.once`, `b.side1`).
- [final-G] `geckos.js`: `rig.lids` (0..1) draws eyelids over `TUNE.<name>.eyes` ([cx, cy, rx, ry] in body.png px) inside the
  rig's transform; Nana sets it (her old screen-space lids are gone).
- [final-G] `render.js`: look `racks: [{x, y, w, h, color, slat}]` paints one-way planks inside as a wooden rack's slats between two
  uprights (bed-rug's shoe rack); `drawCarrierGrowth` draws the Carrier's stages through the plastic on the `carrier-keeper` decor
  (meta.js `shellStage(rescueCount)`). New painting `bg/z01-bedroom/far-c.webp` (+ `-phone`), bed-rug `bg: {v: 'c'}` (look-a.js).
- [final-G] Re-recorded: zone-00-path, zone-02-boss (zones-a.mjs), zone-05-boss, zone-06-boss (zones-b.mjs; full-run reuses
  peridotFight/gargyFight). zone-01-boss and zone-10-boss are unchanged in the sim (a sign; render-only lids) and still pass.
  full-run.json needs re-authoring (orchestrator).
- [final-G] Camera, more: in a room with a gecko boss entity a wide touch screen shows the arena's full height (`Camera.fitH`:
  `zoom` reads as `hFrac`, so the view is 720 tall and wider than 1280; no overscroll), so Chikchak on her ledge, lunges and
  sweeps stay in sight. The Carrier rooms (`carrier-*`, or a room `camera: {overscroll: false}`) never run past their floor.
  `camera.zoom` is now a setter/getter (`_zoom` holds main.js's value).
- [final-G] `style.css` (marked, `(max-height: 500px) and (pointer: coarse)`): the sign banner sits at the top between the
  hearts and the icon row, and toasts start just below it, so neither covers the cricket ~40% down. Fixer S / orchestrator:
  this overrides the orchestrator's `.hint` phone rule on short touch screens only.
- [fullrun] `zone-07.js` stu-shelves: one-way rails (cols 42-44, rows 42-50, 2 apart) out of the drop shaft's pit onto
  P3's step; the lair-ledge crack was a dead end (see OPEN_ISSUES). `make-zone-07.py` draws them (marked).
  `tools/solutions/full-run.mjs` re-authored for the lair-crack Return (helpers `glassToDoor`, `coalToHearth`, `flTo`:
  jump or super-jump, flutter at the apex, rise beside a lip and land on it); design/solutions/full-run.json re-recorded.
- [fullrun] **Absolute game.frame in the sim:** gargy.js phase 1 sways with `sin(game.frame / 90)` (and peridot's tap toast uses
  `frame % 150`), so a headless model must start on the browser's game frame: full-run.mjs sets the RunAuthor's
  `game.frame` to G0 (3123, the frame the Bedroom starts on after the opening and the tank; `--g0` to change) and the
  browser part checks it. Without this the browser's Gargy fight diverged (phase lost, rescue never came).
- [final-2] **No refights:** every gecko's `start()` ends the fight at once when its cricket is already rescued
  (`b.done = true`, as duchess/chikchak/bigtok did): Lashes dozes on his shelf (`b.dozing`, `lashes-stairs` set), Peridot
  naps in the dark at col 78, Gargy dozes on the sofa back (`b.dozing`: no sulk-off), Mossy sleeps in plain sight at his
  first spot, Kite dozes on the high basket (56, 15), Ember sleeps (closed-eye glow). Nana (`chip`) and Barty (the Cloak)
  already did. `game.bossBeaten(name)` (LAIRS cricket rescued; barty: `meta.barty` or the Cloak). meta-run: Enter at a won
  lair's door goes straight in (`A.enterLair`) with the toast "<name> is asleep." ("Sir Bartholomew waves you in."); a
  `ready` event/trigger in a won arena opens no card. `tools/sim.mjs` MetaLite does the same (no Ready? modal; a won
  door is a `startAt`). Since the boss is done, `inFight()` is false: Pause > "Back to room entrance" is the room
  entrance. Test: `node tools/entity-test.mjs no-refight` (all 10 + Barty). First-time play is unchanged.
- [final-2] **Arena camera on wide touch screens** (`world.js Camera`): `fitH` still zooms to `hFrac` (720 tall, wider than
  1280), but the view now follows the cricket vertically: `touchFrac(p)` is 0.62 (more arena above him) while he is in
  the middle of the view (`sideZone`: screen x 28-62%) and 0.4 near the sides (the buttons on the right, the stick's thumb
  on the left), where `update()` also pulls him back above ~43% (`_side`; this side rule holds in every touch room, e.g. at liv-rug's
  right end he was at 52%, under Chirp); `clamp()` allows half a view of overscroll in an arena or at a side (else 0.34).
  `snap()` targets twice (the framing reads the view's x). Render-only: the sim never reads the camera.
- [final-2] index.html's boot `fit()` uses main.js `resize()`'s rule (a coarse-pointer screen wider than 16:9 is filled
  edge to edge), so the stage doesn't move when main.js takes over. main.js calls `Audio.unlock()` at start when
  `window.__bootPressed` is set (that press was a user gesture: the title music starts). A pointerdown anywhere on
  `#stage` advances an open dialog. `ui.updateMetaHUD`: with Beacon chirps "Off", Listen shows the ear and the arrow only
  (no ripples or strip; after a call they show for 4 s, as with "When I call"). meta.css: on small touch screens the
  rhythm strip sits 104 px up, above the bottom button row. `window.__game.camera()` / `.boss()`: read-only debug readouts.
- [polish-V] **Camera rewritten** (`world.js Camera`, replaces the [final-G]/[final-2] 40%/62% touch rule; still render-only, the sim never reads it and replay-headless passes): touch rooms keep the cricket ~68% down (`touchFrac`); `camera.avoid` (view-fraction rects, kind `hud`/`btn`, measured from the DOM by main.js `measureAvoid()` every 0.5 s and on demand; `__game.avoid()`) and `keepClear()` push the view until the cricket's hitbox + 1 tile clears them (buttons: sideways; HUD: the shorter way). `over(room)` gives per-edge overscroll allowances (touch: 0.2 left / 0.45 right / 0.3 top / 0.32 bottom; the Carrier sideways only; arenas: below the floor only what a zoomed-out view needs, max 25%); `clamp(room, soft)` uses only the bottom/top part for the framing and the full allowance after `keepClear`. Arenas (`framed`: any boss entity; `fitH`: a gecko) frame `boss.focus()` (BossBase: `spec.focus(b)` or the rig's `lastBox`; Big Tok: head and shoulders; Mossy: only while he can be seen; Nana: null, she is view-relative; Barty: his eye) with the cricket inside `safe()` (below the HUD, left of the button block), easing a framing zoom `fz` 0.8-1 (0.5 during the first 150 frames: `introT`, an establishing shot); the tank's set pieces frame Duchess without zooming. main.js sets `camera.game`.
- [polish-V] `render.js drawOverscrollSides` (the view past a side: the edge column mirrored, darkening) and `drawOverscroll` also fills the corners. `geckos.js` `rig.lastBox`/`frameBox()` (body + half the tail + room for the "!"), the tell splat above the body's top, `fx.tellMarks` (fx skips an event splat while a rig draws its own). `bigtok.js` draw stays inside `camera.safe()`. Nana: slides off the stones, lids from fully open, eye rim over the lid.
- [polish-V] `ui.js` (marked lines) the beacon ear slides in along its ray off `ui.avoid` rects; main.js hides it in a fight. `hub.js` new `OBJ` slots with `npc` x per resident, bubbles avoid the buttons/HUD (`drawBubble(..., cam)`). Ready? card (`screens.js`) and dialog (`dialog.js`) prefer `sprites/geckos/<name>/portrait.png`.
- [cracks] **`tools/check-cracks.mjs`**: every save crack (22: zones 1-10, stair-foot, lair-gap) in every state you can
  first stand there (each zone's minimal entry states from `exploreRoutes`, the crack's first-reach state minimized from
  it, and the state right after the rescue; link cracks: every zone state that reaches them) must reach (a) the zone's
  other crack or start and (b) onward progress (the zone's item/rescue, else the start room of an enterable zone), in the
  weakest pass, house-wide, without the Post. Its model is check-world's with: column buckets + early exit; per-clump
  cereal (breaks when stood on with the Thimble; a zone entered through a house.js cereal link starts with it broken);
  Down+Jump through one-way planks; lair doors with `to` and door entities as one-way edges; Raft wading along a water's
  bottom; spring/aphid bounce then glide; a gecko fight won once its arena is reached; cling kicks keep their 2-tile rise
  (no -0.5) but never climb the same wall (real sim: a kick goes away); springs drawn on solid tiles (liv-armchair's
  seat: check-world's overlay ignored them). The weakest pass's jump, flutter and super-jump are **measured at start-up**
  in the real sim (Duo and Digby from a standstill on an opened sb-meadow; widest centre travel per 0.5 tile of height,
  +1.25 tiles landing slack): check-world's guesses called the sun-glass staircase and the chimney lips impossible.
  `CRACKS_LIB=1` + import gives `_dbg` (world, cracks, fixpoint, mkState, apply, ...) for scratch debugging.
- [cracks] Level fixes (OPEN_ISSUES "[cracks]"): bas-stairs flight 2 is 17 steps (was 14: 5 rows short of landing 2) and two
  treads under the laundry hole (rows 2 and 0), in `tools/make-zone-09.py` (marked) and zone-09.js; zone-06.js:
  liv-armchair one-way slats rows 50/48/46 cols 24-26 (look-b `racks`: a magazine rack), liv-piano 7 brackets
  ([12,32] [12,30] [12,26] [9,24] [12,22] [9,20] [12,18]) and two book piles on the lamp side (57-58 rows 30-33, 59-60 rows
  32-33; look-b `paper` stacks), liv-hearth mantel 8 wide (look-b shelf too) and its top ledge at row 16 cols 6-8 (was row
  15 cols 5-7). zone-07.js / zone-08.js were regenerated (by accident) from their unchanged scripts: zone-09's
  script reproduced its file byte for byte (header aside), and every zone-07/08 solution replays unchanged; only a
  hand comment in zone-07.js (the [fullrun] rails note) is gone (the script keeps its marked line). Every recorded solution except full-run still replays headless with the same end state.

- [polish-T] **Labels:** `input.label(action)` on touch uses `TOUCH_NAMES` (never the action id; pad/key fall back to "Button"/"?"); `input.scheme()` (what label() uses: `forceScheme` (How to Play's tabs), else touch when `touchUI` and no game key was ever pressed (`keyEver`), else `last`). `ui.cap('move'|'swap')`: the `{left} {right}` / `{swapPrev} {swapNext}` pairs (`ui.js pairTokens`, used by richText and dialog tokens): one chip on touch, two caps on keys/pad. `ui.capKey()` keys the toast/prompt/sign caches. Tab bars show no Q/E chips on touch. A sign containing the prompt's own action token is hidden while that prompt shows.
- [polish-T] **Handoff:** `MetaRun.handoff()` runs as any `A.dialogSay` dialog closes (main.js): `nextScreen` (a `dialog` event's `then: '<story name>'`) → `A.storyEvent`, else a `pendingCard` → `A.zoneComplete` at once with `ui.guard = 30` (menuInput ignores 30 steps). nana.js `after()`: `emit('dialog', {key: 'geckos.nana.post', then: 'ending'})`, no story emit; main.js `playEnding()` stops the music. tools/sim.mjs MetaLite: after a `dialog`/`talk` modal, the `then` story or the pending card is `modal.next` on the same frame (author.mjs `_step` handles it); `BrowserAuthor.chain()` accepts a modal left open when the next one is on the same frame (`sameNext`) and waits 31 steps before acting on a handed-over card (`handed`); replay.mjs picks Enter/Escape per open modal.
- [polish-T] **UI:** `body.modal-open` (main.js tick: menu, dialog, story or item card) hides `.hint/.prompt/.toasts` (meta.css); opaque panels; `.panel-howto` / `.panel-pause` fixed size (`calc(740/750px * --ui)` x `calc(500/516px * --ui)`, 94% on short screens); title menu: `.title-row[data-row]` pairs (screens.js) in a top-right panel; `pauseTabs(A, tab)` shows the Sound Book tab when it is open; map `bounds()` min window 1.6 x 1 cells; `goCarrier()` → `ui.showHUD(true)`; damper card `damper.allFound`; feedback.js retitles the gh-feedback heading ("Report a bug", MutationObserver), meta.css styles it (`--gh-feedback-*`, `::part(popup)`), index.html `popup-color="#B0702A"`. Text: text.js `damper.allFound`, `carrier.gift`, Press {up}/{use} signs, nana `p1`; lair.js / make-lair.py "Press {up} near a bottle cap".
- [polish-T] `BrowserAuthor.chain()`: keys lifted for a modal whose next modal opens on the same frame are carried (`carry`) and pressed again after that next modal (the model's `repress`); without this a held key (KeyE at Lashes' card) was lost and the run drifted a frame.
