# House Cricket — design review log

## Round 1

Reviewers: Player, Builder and Art and sound director. Their condensed findings are in `review/round1-findings.md`. The refiner then rewrote GAME_DESIGN.md.

| Finding | Severity | Outcome |
|---|---|---|
| P1 The Carrier wasn't on the map and had no way back | must | Fixed: it sits on the Bedroom floor; every save crack can send you there from the start; Shelly adds crack-to-crack travel; after a rescue the game asks whether to go to the Carrier |
| P2 / B1 Swapping was banned in boss fights, but Nana's fight needs it; entering as Hump could leave you stuck | must | Fixed: you carry a trio and can swap during fights; lair doors check the trio; boss arenas use a fixed chirp radius |
| P3 The beacon led to a gated lair, and always-on ripples made Listen pointless | should | Fixed: the call comes from a sound hole by the item until it's found; ripples show only while listening or just after a call; an "Always show" setting |
| P4 On touch, Use shared the Kick button | should | Fixed: a permanent Use button |
| P5 The opening was a slideshow | should | Fixed: 3 panels, then a 6-beat playable escape, then the cup-tip panel |
| P6 The Laundry alarm beeped only every 40 s | should | Fixed: it beeps back when you chirp and every 8–10 s; Hump taps its case |
| P7 Falling in a pit sent you back to the start of a big room | should | Fixed: respawn on the last solid ground, plus a soft checkpoint per screen |
| P8 Nothing showed what each rescue changed in the Carrier | should | Fixed: an arrivals table of 22 painted objects |
| P9 Bosses restarted from phase 1 | should | Fixed: phase checkpoints in zones 6–10 and in Gentle Mode; Gentle Mode offered after 2 retries |
| P10 / B9 Key collisions | nice/should | Fixed: Jump is Space or Z; Listen is L or holding ↓; ↓+Jump drops through a platform; walls are cling-only |
| B2 Recorded solutions couldn't be replayed reliably, and the in-game `solve()` broke the play-test rule | must | Fixed: replays are frame-locked with real key presses in tools/; the debug hook was extended |
| B3 No movement model, so cricket stats could break the gates | must | Fixed: a movement table in tiles and a two-pass world check |
| B4 / A3 / A9 audiogen can't make stems, theme variations or a beat-locked finale | must | Fixed: one Carrier track plus synthesized chirp layers; the finale chorus runs on a code clock |
| B5 Phones would run out of memory | must | Fixed: a per-screen cache capped at 2×, per-zone loading, streamed music |
| B6 / A2 The gecko tail would tear and the poses wouldn't match | must | Fixed: poses are edits of the idle; the tail is a code chain |
| B7 / A4 The anchor was the wrong view, poses were missing, sizes disagreed | must | Fixed: a strict-profile anchor, 5 extra poses, one 128×80 size at 2×, a leap pose for each cricket |
| B8 The beacon's low-pass muted the chirp | should | Fixed: a −24 dB floor, reverb, a gentler filter, an easier-pitch setting. Not changed: chirp rate stays tied to temperature (for Dolbear's law) |
| B10 Phones show the game at about half size | should | Fixed: DOM overlays for the HUD and menus, bigger tells on touch, a 1.15× zoom in rooms |
| A1 Props and Carrier facilities weren't in the asset list | must | Fixed: about 40 props and 22 Carrier objects on sheets |
| A5 Portraits weren't listed | should | Fixed: portraits are cropped from the source images; close-ups go to the $35 option |
| A6 Nothing tied the scenes to the characters; no real palette | should | Fixed: a reference chain and hex colors for each zone |
| A7 Backgrounds might look like platforms and repeat | should | Fixed: low-contrast prompt rules, 2 variants per zone plus mirroring |
| A8 Decoy rhythms and about 20 missing sounds | should | Fixed: synthesized decoys; a full list of sounds |
| A10 No room left in the budget | should | Fixed: a quality rule and a reserve; the plan is $18.78 plus a $1.22 reserve, $20 in all |

Verdict: several must-fix findings were fixed in this round, so it hasn't converged yet. Round 2 follows.

## Round 2

The same three roles reviewed the revised design afresh. Their condensed findings are in `review/round2-findings.md`. The refiner rewrote GAME_DESIGN.md again.

| Finding | Severity | Outcome |
|---|---|---|
| P1 / B9 Jump did too many things; Hump's held leap clashed with "hold to jump higher" | must | Fixed: one meaning per input (press, early release, fresh press in the air to flutter, hold while falling to glide); Hump's huge leap is ↓ held 0.4 s, then Jump |
| P2 No movement forgiveness | should | Fixed: coyote time, jump buffer, corner nudge, wall-jump grace and a hook magnet in movement.js, plus a recorded "feel" solution |
| P3 Geckos 4–9 could be skipped | should | Fixed: the Attic opens at the 9th rescue, so the finale chorus always has all 10 crickets |
| P4 Nothing led to the Glider in zone 5 | should | Fixed: the beeps carry through the dryer vent next to the Glider |
| P5 Touch chains | should | Fixed: Use sits next to Jump; a deadzone and cone for ↓; the floss grab and release written out for every input |
| P6 Mossy's tag and Nana's stones had no action | should | Fixed: kick or touch Mossy during the glint; kick the stones |
| P7 Keyboard gaps | should | Fixed: S is down; Listen on B or L; key caps and pad glyphs in prompts; M mutes; Tab opens the map |
| P8 Frost's perk had no action | nice | Fixed: a HUD thermometer plus thermostat locks |
| P9 Early bosses restarted from phase 1 | nice | Fixed: every fight restarts the current phase |
| B1 Music through media elements | must | Fixed: AudioBuffers, at most 3 decoded at once |
| B2 The route branches, but only one order was checked | must | Fixed: a prerequisite graph; check-world searches every order; zone 6 recorded twice |
| B3 Swapping in mid-air | should | Fixed: a swap pressed in the air waits until you land |
| B4 check-world claimed too much | should | Fixed: reach figures generated from the real physics, with margins; moving parts as edges; arenas left to replays |
| B5 The finale clock ran on AudioContext time | should | Fixed: beats come from fixed-step game time |
| B6 / A1 / A3 Gecko sizes, tails and legs | must | Fixed: sized by length (≤1.1 screen widths); tail and legs cut from the idle first; spline tail; leg rig; a Kite glide pose; tall frames for Nana and Big Tok |
| B7 Retries and prices | should | Fixed: models pinned; 2.5 Flare for cheap art; 1.5 tries for characters; corrected cut triggers |
| B8 / A6 Antenna anchors per frame | should | Fixed: per-frame anchors from find-anchors.py; painted antennae cleaned off or the frame re-rolled |
| B10 The definition of done contradicted the design | should | Fixed: zone exceptions; a monotonic gain check per room entry; Gentle Mode checked with setBossPhase; textures remapped dark |
| A2 Crickets had no movement art | must | Fixed: an 8-pose sheet for each cricket |
| A4 The 5 kHz low-pass protected only 2 voices | should | Fixed: a peaking cut at the zone's voice plus a duck while listening; melodies kept under about 2 kHz |
| A5 The strike tell had no sound | should | Fixed: a synthesized rattle-swish |
| A7 Missing assets (tank props, chimney, water, the kid) | should | Fixed: tank prop sheets; palettes for the Hall, stairwell and chimney; water drawn in code; the kid shown off-face |
| A8 Breakable terrain wouldn't match the platforms | should | Fixed: drawn by the code painter from 6 swatches |
| A9 Crickets might come out as recolored Pips | should | Fixed: anatomy first in the prompt, "style NOT body shape", a fallback without the reference. The Katy mockup confirms a distinct shape |
| A10 The near layer would fringe | nice | Fixed differently: built in code from props |

**Follow-up by me:** the refiner had planned to pin a model in the person's `.env`. I changed that to a per-command environment variable, so `.env` is never edited. I also wrote the measured mockup prices into the cost section: about half the estimate.

**Verdict:** this round's must-fix findings were all fixed. The `--rounds` limit is 2, so the review stops here. The design is consistent and every request in the brief is covered (see the check below).

### Brief checklist, re-read as the person who asked

Every item is in the design:
- the name
- the escape opening, which is now playable
- the 10 room zones
- a gecko in each zone, guarding a different cricket
- real chirps from research
- the louder/softer beacon
- items and gates
- the map
- gecko fights that never hurt them (avoid, stealth, distract, sleep, stun, hide and seek, chase, dazzle, lullaby)
- swapping crickets with different stats
- watercolor art
- geckos that are scary but friendly
- a Carrier that grows Suikoden-style
- other insects joining (Hump plus 8 recruits)
- a range of enemies (16 types)
- the Not-Crickets joke and puzzle (bat, tree frog, chimney swift, smoke alarm, a chirping gecko, squeaks)
- gamepad support

## Change: issue #10, the ear guide (one round, 2026-11-19)

Player and Builder reviewed the change (no art or sound, so no art director).

| Finding | Severity | Outcome |
|---|---|---|
| Listen arrow points at the cricket while the ear points along the path | must-fix (Player) | Fixed: one direction everywhere; while Listening the ear is the arrow |
| Beacon chirps Off leaves almost no guide | must-fix (Player), should-fix (Builder) | Fixed: with Off, When it helps counts as Always out |
| "The doorway after" isn't in the path data; twin doorway nodes; door links | must-fix (Builder) | Fixed in design: switch on passing through the doorway, twins count as one, doors aimed at themselves; build records predecessors |
| Reusing the boolean `indicator` key; migration | must-fix (Builder) | Fixed: a new `ear` setting; old saves move to When it helps |
| Ear state must stay out of game state (replays, rewind, heardAt) | must-fix (Builder) | Fixed: pure display, own module, reset on rewind |
| Clicking an auto-out ear did nothing; decide at press | should-fix (both) | Fixed: dismiss until the next reason; decided at press; ignored while Listening |
| Lost and answer timing undefined | should-fix (both) | Fixed: in-control time, closer = beats best by a tile, out until 1280 px closer, 4 s from the answer |
| Smoothing wrap-around, exact flip, stale angle | should-fix (Builder) | Fixed: short way round, keep sign on a half-turn, snap on out/room change/rewind |
| No explanation when it appears | should-fix (Player) | Fixed: first-time toast, a "this way" pulse and cue when lost |
| Doorway pointing needs to read as a route | should-fix (Player) | Fixed: a glint on the target doorway when on screen |
| "Never" ambiguous; two "Ear" buttons on phones | should-fix (Player) | Fixed: renamed "Ear guide", "Only when I listen" |
| "Followable zone" not defined | should-fix (Builder) | Fixed: Carrier, Tank, rescued, unreachable and fights excluded |
| Keep the pulse and grow-with-closeness | nice | Kept |
| Testability: pure module, headless test, debug hook | nice | Taken into the build plan |

## Change: issue #7, Duchess hunts in the tank's sand room (one round, 2026-11-19)

Player and Builder reviewed (no new art or sound; existing growl/snore reused).

| Finding | Severity | Outcome |
|---|---|---|
| Waiting ~30 s for her to plod home before the exit opens | must-fix (both) | Fixed: the exit opens when she turns away; the plod and nap are ambient |
| Rushers reach a shut exit before any lunge; hiding before a lunge undefined | must-fix (Player), should-fix (Builder) | Fixed: hiding works whenever she's awake; she tells and lunges into the log; the sign also shows near the log; a new exit toast |
| Phone stick drift pops Pip out of the log mid-sniff | must-fix (Player) | Fixed: only Jump leaves the log while she comes and sniffs |
| z00.md is generated from house.js and gen-zone-briefs.mjs | must-fix (Builder) | Fixed: the spec lives in GAME_DESIGN.md; the build updates house.js and the generator and regenerates z00.md |
| Knockback could push Pip out of the room; only the snout should catch | must-fix (Builder) | Fixed: snout-only catches, skitter in her facing direction, never out of the room, she stays right of tile 8 |
| Don't reuse daze (earplugs toast) or hurt | must-fix (Builder) | Taken into the build: a plain shove with no event or damage |
| Gentle Mode not wired into the tank | must-fix (Builder) | Fixed: the tank uses the shared tell timing |
| Recorded solutions break; full-run pins the Bedroom's start frame | must-fix (Builder) | Taken into the build: re-author zone-00-path, pad to keep the full run's G0, or re-record and re-check |
| Skitter direction and grace period; repeated toasts | should-fix (Player) | Fixed: away from her head toward the log; a shake-off after a roar; rotating toasts |
| She must keep up with a rusher | should-fix (Player) | Fixed: scurry speed when he's far ahead or hidden |
| Odd moves: jumping over her, going back left, hiding mid-lunge | should-fix (Player) | Fixed: body and tail harmless, she turns; a lunge at a hidden Pip thunks into the log |
| Sleep flag storage; walking into her while asleep | should-fix (Builder) | Fixed: room state (survives rewind); asleep she's harmless |
| Berms: she must cross them; a berm isn't cover | should-fix (both) | Fixed: she follows the berm tops, lunges stop at a berm face, standing on a berm is safe, a one-time toast |
| Being seen at the log corners Pip | should-fix (Builder) | Fixed: a recoil without skitter; a Chirp from the log gives him away |
| Signs, text, snore preload, header comments | should-fix (Builder) | Taken into the build |
| Rewind and determinism; the checker can't see the gate | should-fix (Builder) | Taken into the build: plain fields, seeded RNG only, new rewind cases, a headless gate test |
| Staging of the sniff; one-time wake line | nice | Taken |

## Change: issue #9, tutorial notes on the path (one round, 2026-11-19)

Player and Builder reviewed (art is drawn in code, so no art director).

| Finding | Severity | Outcome |
|---|---|---|
| Trigger zones up to 14 tiles wide, note at the zone's left edge | must-fix (Player) | Fixed: about 2 tiles around the note, minimum show time, wide zones become notes where the lesson starts |
| The card covers the tongs in the first ten seconds | must-fix (Player) | Fixed: hazards and the gecko's tell are kept clear; per-tip lower slot (the tongs tip) |
| The card lands on the toasts | must-fix (both) | Fixed: one centred column, card first, toasts under it |
| A flat paper is a 2 px line from the side | must-fix (Player) | Fixed: a propped paper card with a "!" scribble, an outline and a shadow |
| "First solid ground" undefined for ~25 of 111 signs | must-fix (Builder) | Fixed: an anchor rule (spot or nx, at most 1 tile down, never water or hazard) plus data fixes in generators and a build check |
| Notes on breakable or gated ground float afterwards | must-fix (Builder) | Fixed: read from the live grid; the note retires when its ground breaks |
| Nana's moving hint isn't a note | must-fix (Builder) | Fixed: a card-only kind |
| The card jumps around mid-climb or mid-fight | should-fix (both) | Fixed: its slot is chosen once and it fades instead of moving; fights use the taller free band |
| Appear and disappear behaviour unspecified | should-fix (Player) | Fixed: dwell, calm fade, minimum time, hysteresis |
| The ear guide's spot collides with the card | should-fix (both) | Fixed: the ear avoids the card's rectangle |
| Dark rooms hide notes | should-fix (Builder) | Fixed: the unread glint draws through the darkness |
| "Read" undefined; storage | should-fix (both) | Fixed: 1.5 s fully shown; saved with the slot outside play state |
| Long tips on phones; the old width rules; held frames | should-fix (both) | Fixed: a wider card, 2 lines max with a build check, one card rule, hidden during transitions |
| Prompts taking over abruptly | nice | Fixed: a 300 ms fade, counted as read |
| Notes beside other floor props; test hooks | nice | Fixed: a sideways step; a sign check, a `__game.tips()` hook and sample screenshots in the build |

## Change: issues #24-#27, the opening chase, Duchess's animation, Up to jump (one round, 2026-11-19)

Player, Builder, and Art and sound director reviewed.

| Finding | Severity | Outcome |
|---|---|---|
| Every gecko's sleep/strike art stopped drawing after the WebP switch (meta.json named .png) | must-fix (Builder, Art) | Fixed on main at once (e3952b4), with a build check; split-gecko.py to write .webp in the build |
| She wakes off screen ~30 tiles behind: the chase is invisible or unfair | must-fix (Player, Builder) | Fixed: her rock mid-room (~22-27), wake at ~38, catch-up speed, a chase camera framing both, an edge glint |
| Pounce aim and dodge undefined | must-fix (Player) | Fixed: a fixed rhythm (stop, crouch, tell, shadow, leap); pounce 1 a near miss; later pounces lead a flat-out runner, so hop on the tell or the berm; a reacting Pip is never caught (tested) |
| Diving into the log at a sprint had a 0.25 s window | must-fix (Player) | Fixed: a wide catch zone here, a buffered ↓, held ↓ counts, only Jump comes out |
| ↑ still does talk, lair doors, switches, thermostats, the Carrier, the lid, look-up; the input layer can't merge "jump" and "enter" | must-fix (Player, Builder) | Fixed: an Enter action on ↓ on every scheme; ↑/W a second Jump key on the keyboard (climbs on a line); look-up on touch and pad only; the lid: jump into the gap |
| Cloak on hold ↓ freezes Pip and steals Hump's leap | must-fix (Builder), should-fix (Player) | Fixed: hold Shift on the keyboard, stick/D-pad up elsewhere |
| Whole-picture frames lose the tail tell; facing; registration | must-fix (Art), should-fix (Builder) | Fixed: frames without the tail (code tail at per-frame pivots), facing left like the art, registered to idle.webp, a crouch pose held for the tell |
| Retry flow unspecified; story cards skip on held Jump | should-fix (Builder, Player) | Fixed: in the sim (a gulp mode, then a room retry), a canvas or text card that can't be skipped by holding, a checkpoint before the wake, Gentle Mode offered after three catches |
| The gulp's tone | should-fix (Art) | Fixed: never shown: jaws close, a sand puff, black, sound; back on her asleep with a lip-lick |
| Readability and scare | should-fix (Art) | Fixed: a landing shadow, a darkening wash and vignette, an eye glint, a looming silhouette, a 6 px shake, a hit-stop at the log |
| Chase music can't play (the room's music wins) | should-fix (Builder) | Fixed: the boss overrides the room's music; the cue warm-loads |
| Audio list | should-fix (Art) | Fixed: five new audiogen clips, the rest reused |
| Trim the animation list; asset weight | should-fix (Art, Builder) | Fixed: run 6, pounce 4, wake 2, tongue 3 (~15 frames), ~800 px wide, preloaded ahead |
| Recordings press ArrowUp for hide/doors/saves; pad/touch replays; G0 | should-fix (Builder) | Taken into the build: re-author every affected solution and the full run (new G0); Enter on ↓ everywhere keeps replay translation 1:1; a key-level test |
| Stirs before the wake; leaving the log early; small ↓ notes | should-fix / nice (Player) | Fixed: stirs; a roar and a full tell before any pounce; ↓+Jump always drops through |
