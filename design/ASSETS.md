# House Cricket — assets and spending

## Prices used for estimates

Looked up 2026-11-15 at developers.openai.com/api/docs/pricing.

- **imagegen2 (gpt-image-2.6-flare/sunburst):**
  - $30 per 1M image output tokens
  - $8 per 1M image input tokens (reference images)
  - $5 per 1M text input tokens
  - OpenAI doesn't list a per-image price. Low quality at 1024² is about 824 output tokens (about $0.025). Estimate each image from the `usage` it reports.
- **nanogen** (from its skill): flash-3.1 is $0.034 at 1K and $0.050 at 2K; pro is $0.134.
- **audiogen** (from its skill): music about $0.30 a minute; a sound effect about $0.12.

## Budget

- **Mockups** (the shared design): $3.93 of a $10 allowance (raised from $5 in request 2).
- **Build assets** (request 9, $50 budget) and later issues: everything below.
- **Running total: $30.83** = $3.93 mockups + $10.89 audio + $2.10 scenes + $1.87 objects + $2.00 geckos + $0.30 orchestrator fixes + $2.25 crickets B + $3.97 crickets A + $0.05 final-review fixes + $1.37 issue #6 + $2.10 issues #25/#26. (The old line said $27.36 for the first eight items; they add up to $27.31.)

| ID | File | Tool | Prompt (short) | Tries | Est. cost |
|---|---|---|---|---|---|
| mock-pip (style anchor) | design/mockups/pip.png | imagegen2 medium 1536×1024, transparent | strict-profile house cricket, no antennae/cerci | 2 (take 2 kept: bigger hind legs) | $0.07 (1132 output tokens each) |
| mock-duchess | design/mockups/duchess.png | imagegen2 medium 2048×1152, transparent, Pip as style ref | leopard gecko, tail straight out, scary-friendly | 1 | $0.05 |
| mock-bedroom (scene anchor) | design/mockups/bedroom.jpg | nanogen gemini-3.1-flash-image 2K (2752×1536) | bedroom from floor level, tank glow | 1 | $0.05 |
| mock-carrier (stage 3) | design/mockups/carrier.jpg | nanogen 3.1 flash 2K, bedroom + Pip refs | cricket keeper turned cricket town | 1 | $0.05 |
| mock-story-tongs (opening panel 3) | design/mockups/story-tongs.jpg | nanogen 3.1 flash 2K, Pip + Duchess + bedroom refs | tongs lower toward the cup | 1 | $0.05 |
| mock-title | design/mockups/title.jpg | nanogen 3.1 flash 2K, Pip + Duchess + bedroom refs | Duchess looms over Pip | 1 | $0.05 |
| mock-bigtok | design/mockups/bigtok.png | imagegen2 medium 1024×1536, transparent, Pip + Duchess style refs | tokay rearing on a wall, bellowing | 1 | $0.05 |
| mock-soot | design/mockups/soot.png | imagegen2 medium 1024², transparent, Pip style ref | chimney swift clinging, exasperated | 1 | $0.05 |
| mock-katy | design/mockups/katy.png | imagegen2 medium 1536×1024, transparent, Pip style ref | katydid, leaf wings, no antennae | 1 | $0.04 |
| mock-cricket-pip | design/mockups/crickets/pip.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | Pip anchor edited to add antennae + cerci | 1 | $0.05 |
| mock-cricket-katy | design/mockups/crickets/katy.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | Katy edited to add long antennae | 1 | $0.05 |
| mock-cricket-stripe | design/mockups/crickets/stripe.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | banded cricket, sprinter | 1 | $0.05 |
| mock-cricket-duo | design/mockups/crickets/duo.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | two-spotted, glossy black, yellow spots | 1 | $0.05 |
| mock-cricket-frost | design/mockups/crickets/frost.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | snowy tree cricket, pale, calm | 1 | $0.05 |
| mock-cricket-hump | design/mockups/crickets/hump.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | camel cricket, wingless, toothpick drumstick | 1 | $0.05 |
| mock-cricket-jam | design/mockups/crickets/jam.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | Jamaican field cricket, waving | 1 | $0.05 |
| mock-cricket-rin | design/mockups/crickets/rin.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | bell cricket, glassy wings (take 2: black head) | 2 | $0.10 |
| mock-cricket-digby | design/mockups/crickets/digby.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | mole cricket, shovel legs, short antennae | 1 | $0.05 |
| mock-cricket-mote | design/mockups/crickets/mote.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | ground cricket, tiny and fuzzy | 1 | $0.05 |
| mock-cricket-chip | design/mockups/crickets/chip.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | house cricket with a chipped wing | 1 | $0.05 |
| mock-cast ×20 | design/mockups/cast/ | imagegen2 2.6-flare medium, transparent; geckos at 1536×1024 (Nana at 1024×1536) with Pip + Duchess refs; others at 1024² with the Pip ref | 8 geckos, Sir Bartholomew, Peeper, Velvet, Beep, 8 recruits | 22 (Weft and Dot retried: anatomy, no red cross) | $1.33 |
| mock-enemies ×20 | design/mockups/enemies/ | imagegen2 2.6-flare medium 1024² (beetle 1536×1024), Pip style ref | 18 bonkable critters, darkling beetle, robot vacuum | 22 (cockroach and centipede retried for anatomy) | $1.20 |
| mock-dragons-lair | design/mockups/dragons-lair.jpg | nanogen 3.1 flash 2K, Barty + Pip + bedroom refs | the bearded dragon's hoard | 2 (the second edit removed real brand logos from bottle caps) | $0.10 |
| mock-cast fixes | design/mockups/cast/{shelly,lashes,kite,rolo}.png | imagegen2 2.6-flare medium (Shelly and Lashes as edits of their own picture) | person's notes: Shelly's extra head eyes, Rolo's anatomy and apron, Kite's anatomy, Lashes' fifth leg | 4 | $0.22 |

**Measured:** imagegen2 2.6-flare medium is about $0.035 per 1536×1024 image (1132 output tokens), well under the $0.08 estimate. nanogen 3.1 flash 2K comes back at 2752×1536.

## Build assets (request 9, $50 budget)

### Audio (audio helper, 2026-11-16): $10.89
- **15 music tracks** in `game/assets/audio/music/` ($5.73), one try each:
  - zones are about 77–80 s, not 90 s, to stay within the share;
  - silence trimmed and levelled; less than 1% of each track's energy is above 2.5 kHz.
- **40 sound effects** in `game/assets/audio/sfx/` ($5.16, 43 tries).
- **Loop gains to apply in code:** vacuum +12 dB, dryer-hum +25 dB, rain-roof +18 dB, furnace +16 dB.
- **Boosted +24 dB, may be a little noisy:** land, wall-cling, raft-splash, gecko-snore.
- Full list: `.gamegen/candidates/audio/LIST.tsv`.

### Scenes (scenes helper): $2.10
- **Paintings:** 21 far paintings (2 per zone, plus the tank and the chimney), 4 Carrier shells, 8 story panels, the title and the lair, in `game/assets/bg/`, `story/`, `title.webp` and `lair.webp`.
- **Notes for the build:**
  - bedroom far-a has a light floor band in its bottom third, so pair it with a code floor;
  - flip alternate chimney tiles vertically to hide the seam;
  - the Carrier box frame shifts slightly between shells, so set object slots per stage.

### Objects (objects helper): $1.87
- **Enemies:** 20 enemies × 2 frames, plus flipped frames for the 18 critters.
- **Pickups and props:** 14 items, 54 props.
- **Carrier and UI:** 23 Carrier objects, 6 terrain swatches, 5 UI blots, a panel and the app-icon source.
- All on 2.5-flare medium, except the icon. The cost log is `.gamegen/candidates/objects/costs.log`.

### Geckos and talking characters (gecko helper): $2.00
- **Geckos:** 10 geckos, each with idle, strike and sleep frames plus a tail and leg rig (`meta.json`, from `tools/split-gecko.py`).
- **Sir Bartholomew:** 4 parts.
- **Talking characters:** 12, each with a talk frame.

### Orchestrator fixes: $0.30
- **Kite's glide pose:** two open eyes, no wink. Geckos without eyelids can't wink; it took 2 tries.
- **Sir Bartholomew:** round pupils on all 4 of his pictures, since bearded dragons have round pupils. The mockups were updated to match.

### Crickets B (jam, rin, digby, mote, chip): $2.25
- **Per cricket:** base, portrait, 4-frame idle (5 fps) and 4-frame run (10 fps) loops from anim8gen, 10 poses (Digby also has dig), and anchors.json.
- **Shrunk poses:** some poses carry `"fit": k` in anchors.json; draw them at 1/k.

### Crickets A (pip, stripe, katy, duo, frost, hump): $3.97
- **Per cricket:** base, portrait, idle and run loops, 10 poses and anchors.
- **Pip:** also has jump, kick, chirp, hide and peek loops.
- **Pose scales:** these are in `poses/fit.json`. The orchestrator wrote one for crickets B as well, from their anchors.

### Final-review fixes: about $0.05
- `bg/z01-bedroom/far-c.webp` (the Rug room's own painting, plus a phone copy). Made with imagegen2, using the bedroom painting as the style reference.

### Polish pass [polish-V]: $0
- `sprites/geckos/bigtok/portrait.png`, `sprites/geckos/nana/portrait.png`: face portraits for the Ready? card and dialogs, cropped from each rig's `idle.png` (soft fade at the bottom edge). No generation.

### Issue #6, the feeder cup and the pet-store cup: about $1.37
| ID | File | Tool | Prompt (short) | Tries | Est. cost |
|---|---|---|---|---|---|
| cup-open a-d | .gamegen/candidates/i6/cup-{a,b,c,d}.png | imagegen2 2.6-flare medium 1536×1024, transparent; Pip anchor + feeder-cup refs | open pet-store cricket cup from the side: clear + egg crate (a), frosted white + egg crate (b), amber-clear + bran and potato (c), clear + egg crate + lid leaning (d) | 4 (came out about 2:1, too tall for the 6×2-tile cup) | $0.20 (1132 out, 1896 image in each) |
| cup-open a2-d2 | .gamegen/candidates/i6/cup-{a,b,c,d}2.png | imagegen2 2.6-flare medium 1536×1024, transparent; each first take + Pip anchor as refs | the same cup, a third as tall as it is wide | 4 | $0.24 (1132 out, about 3000 image in each) |
| cup-final (B, picked) | art/props/feeder-cup-open.png (cup-b2), feeder-cup.png (lidded), feeder-cup-tipped.png (upside down), cup-tab.png, cup-tab-pulled.png | imagegen2 2.6-flare medium, transparent; cup-b2 + Pip anchor refs | the lidded tub (lid fits the rim), knocked over upside down (3 tries: the first two came out too tall or with an open top; the third repainted a flipped copy of the lidded tub), front-view pull tab and pulled tab | 6 | $0.39 |
| store-cup | art/props/store-cup.png, store-cup-tipped.png | imagegen2 2.6-flare medium, transparent; a crop of open-1's front cup + Pip anchor (tipped: store-cup as ref) | the white paper cricket cup of the opening panels, lidded; the same cup tumbling, lid popping off | 2 | $0.13 |
| open-3 edit | game/assets/story/open-3.webp | nanogen 2.1 2K edit of the old panel, with cup-b2 and store-cup as refs | store cup on the tank's mesh lid, the tongs lowering Pip into the feeding tub (2 takes, then a second turn to open the mesh under the hand and widen the tub) | 3 | about $0.24 (2.1 isn't priced in the skill; counted like 3.1 flash 2K plus thinking) |

| open-4 edit | game/assets/story/open-4.webp | nanogen 2.1 2K edit of the old panel, with open-3 and store-cup as refs | only the falling cup: the white store cup with its lid popping off (2 takes; kept the one that keeps the cup's spot and size) | 2 | about $0.16 |

Issue #6 total: about $1.37 ($0.45 candidates + $0.76 final + $0.16 panel 4).

### Issues #25/#26, Duchess's animation and the opening chase's sound: about $2.10

Images ($1.23): anim8gen packages `.anim8gen/runs/duchess-{run,pounce,wake,tongue}/` (candidates.jsonl has every prompt and its usage), imagegen2 gpt-image-2.6-flare medium 1536×1024, native alpha, `--no-history`; the reference is her tailless body (`duchess-notail-clean.png`: `duchess-notail-canvas.png` with the hidden tail's colour cleared), plus the previous accepted frame. Each image is about $0.047 with one reference and $0.060 with two (1132 output tokens, about 1600 image input tokens per reference).

| ID | File | Tool | Prompt (short) | Tries | Est. cost |
|---|---|---|---|---|---|
| duchess run | art/sprites/geckos/duchess/anim/run/00-05.png | anim8gen / imagegen2, as above | a low belly-to-sand scramble, near legs reaching and pushing in turn, tailless, facing left, no prey, mouth closed | 8 (frame 5 twice: lost her teeth, then her eye came out too big) | $0.46 |
| duchess pounce | anim/pounce/00-03.png | the same | crouch, launch (stretched), airborne (jaws opening), land (belly down, jaws shut) | 6 (launch and airborne again: the hips came out thin, so the code tail looked too fat) | $0.35 |
| duchess wake | anim/wake/00-01.png | the same | head jerks up, then eye wide | 2 | $0.11 |
| duchess tongue | anim/tongue/00-02.png | the same | tongue flick, lip-lick, settle | 6 (all three again, asked to keep her idle stance) | $0.32 |

Audio ($0.87): audiogen, creator plan (no credit line). Loudness measured in Chromium (decodeAudioData, BS.1770 integrated LUFS) since there's no ffmpeg here, so levels are set in code (audio.js) rather than in the files:

| ID | File | Tool | Prompt (short) | Tries | Est. cost | LUFS / peak (file) |
|---|---|---|---|---|---|---|
| chase cue | game/assets/audio/music/chase.mp3 | audiogen music 30 s, instrumental | 132 BPM, D major, pizzicato strings, low clarinet stabs, soft timpani, no intro | 1 | $0.15 | -16.0 / -1.2 dBFS; MUSIC_DB -2 dB (the tracks run -15 to -22, boss -19.8, title -17.2) |
| gecko-skitter | sfx/gecko-skitter.mp3 | audiogen sfx 2 s `--loop` | a lizard running on sand, continuous patter | 2 (take 1 was 3 sparse bursts) | $0.24 | -32.5 / -15.0; LOOP_DB +12 (like the other loops) |
| pounce-land | sfx/pounce-land.mp3 | audiogen sfx 0.7 s | soft heavy belly thump into sand, grainy hiss | 1 | $0.12 | -28.0 / -7.8; levelled +9.7 at decode |
| gulp | sfx/gulp.mp3 | audiogen sfx 1 s, then whole MP3 frames trimmed (no re-encode) | a wet but clean cartoon gulp, then a contented "mm" | 2 (take 1 was 0.3 s of sound with 0.3 s silence each side) | $0.24 | -13.8 / -1.4; 0.78 s |
| relief-sting | sfx/relief-sting.mp3 | audiogen sfx 3 s | harp and music box resolving on D major | 1 | $0.12 | -18.6 / -2.9; levelled +6.4, trim -4 |

gecko-snore (re-checked, unchanged): -19.0 LUFS, peak -5.3 dBFS, 1.9 s. It is one snore decaying smoothly from -16 to -46 dBFS (50 ms RMS), with no steady hiss floor under it, so the +24 dB boost didn't leave audible noise; in game it is levelled +6.7 and trimmed -6.
