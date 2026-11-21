# House Cricket

*Bought as gecko food. Escaped. Coming back for everyone.*

## Pitch

You are Pip, a house cricket bought from a pet store to feed a leopard gecko. On the night you escape the tank, the feeder cup tips over and your cupmates scatter through the house. Ten of them are caught in ten rooms, each guarded by a big, polite, very hungry gecko.

Explore a hand-painted watercolor house as one connected map. Follow each trapped cricket's real chirp, which gets louder as you get closer. Find household items that let you go where you couldn't before. Outwit each gecko without ever hurting it. Every friend you save moves into the Cricket Carrier, which grows from a bare plastic box into a little cricket town. And remember: almost everything in this house that chirps is *not* a cricket.

## Settings

- **Platform:** both (desktop is the main way to play; phones work in landscape)
- **Target:** web: plain HTML, CSS and JavaScript ES modules, no build step
- **Scope:** large, judged from the request: 10 zones, 10 boss encounters, a hub that grows, swappable characters and a story. About 2 to 3 hours to finish everything; about 1.5 hours on the main path.
- **Budget:** $20 for generated art and audio, all in. The mock pictures for the shared design ($1.08 actually spent, of a mockup allowance raised to $10) are the first real assets and are counted inside the $20.
- **Gamepad:** yes. A PS5 controller (or any standard pad) plays the whole game.
- **Feedback:** on (added after planning). A "Report a bug" button files a GitHub issue from the player's own account, with a screenshot. It shows once the game is published to a public repo.
- **Tools available:**
  - imagegen2 (OpenAI) and anim8gen
  - nanogen (Gemini)
  - audiogen (ElevenLabs, creator plan, so no credit line is needed)
  - playwright-cli, node, python3 + Pillow
- **Credit:** Rich Conlan (from GitHub)
- **Decisions made on the player's behalf:**
  - The name is **House Cricket** (they said "probably").
  - **10 zones**, one per room of the house; they said "say, 10".
  - The geckos are **ten different real species**, one per room, so each looks and fights differently.
  - "Different states" is read as "different stats". Swapping crickets changes speed, jump, chirp, weight and one perk.
  - The hero is male, because only male crickets sing. Pip's chirp is both an action and a call that trapped crickets answer.
  - "Chimney sparrow" is the **chimney swift**, the real bird that nests in chimneys and chitters. The joke: everyone calls her something wrong (sparrow, swallow, bat, *cricket*), and she's had enough.
  - "Maybe other crickets/insects can join you" is used two ways. A camel cricket (Hump) joins as a playable rescue. **Eight** optional non-cricket recruits, plus the four Not-Crickets, move into the Carrier and run its facilities: the Suikoden-style build-out.
  - "Not sure what enemies should be" is answered with **16 household critter types** (14 core, 2 extras on the cut list): insects, spiders, a dust bunny. They're "bonked" and scurry off, never killed, to match the gentle tone.
  - **Chirps are synthesized in code** from the research, rather than generated. So are the three decoys whose rhythm the puzzles depend on (smoke alarm, tree frog, chirping gecko). Each species then has its real pitch and rhythm, and the beacon can be exact (see Audio direction).
  - **The Attic opens only when all nine other crickets are home**, so the finale chorus is always everyone.

## The player's fantasy

Being tiny, quick and brave in an enormous, cozy, slightly spooky house. A gecko the size of a dragon peers down at you, says "oh, *hello* dinner", and you outsmart it. Then you bring your friends home one by one until the box you live in is a little town that sings.

## Core loop

- **10 seconds:** run, hop, wall-jump and swing through a room. Kick a bug out of the way. Stop, raise your front legs to **Listen** (crickets hear through their legs) and see which way the chirp is coming from.
- **1 minute:** clear a room. Find a crumb cache or a seed-heart, spot a ledge you can't reach yet, and mark it on the map.
- **One zone (10 to 15 minutes):**
  1. Enter a new room of the house, with its own painting, music, enemies and a decoy sound.
  2. Follow the trapped cricket's chirp. It leads first to the zone's item (the call carries through a vent or crack beside it), then on to the lair.
  3. Find the zone's item, which opens the way to the boss's lair.
  4. Outwit the gecko and free the cricket.
  5. Take the offered trip back to the Carrier and watch the newcomer move in, then return to the same spot.
- **Session:** each zone opens backtracking in earlier ones (new item, new secrets). The Carrier visibly improves with every arrival. Its empty spots show who is still missing, which pulls you on to 100%.
- **The three cricket verbs: Chirp, Jump, Hide.** Chirp to call, stun and find. Jump everywhere. Hide in crack-sized spaces that nothing bigger can reach.
- **The mechanic the game lives or dies by:** moving through a room should feel springy and precise, like a cricket hopping and landing with weight. Following the chirp should feel like real detective work by ear.

## Characters

### Pip, the hero
- Male house cricket (*Acheta domesticus*): straw-tan, dark bands on the head, long antennae, two cerci, big hind legs.
- Earnest, a little guilty that his escape spilled the cup.
- Says little; his chirps carry his feelings.

### Rescued crickets (all playable once rescued)
Stats are 1 to 5 for **Speed, Jump, Chirp** (radius and stun length against enemies) and **Weight** (heavy crickets press switches and push things; light ones fall slowly). Each has one **perk**. Perks open optional secrets only, never the main path, so swapping is a choice, never a chore. What each stat means in tiles is in the movement table.

| # | Name | Species | Chirp (synthesized) | Spd / Jmp / Chp / Wt | Perk |
|---|---|---|---|---|---|
| 0 | **Pip** | House cricket | 4.8 kHz, 2–3 pulses | 3/3/3/3 | **Listen** shows the beacon twice as far away |
| 1 | **Stripe** | Banded cricket | 6 kHz, quick 2-pulse | 5/3/2/2 | **Dash:** a burst of speed that runs through crumbling floors before they fall |
| 2 | **Katy** | True katydid (a cricket cousin, and proud of it) | 3 kHz rasping "ka-ty-did" | 3/3/3/2 | **Long glide** (once the Dryer-Sheet Glider is found) |
| 3 | **Duo** | Two-spotted cricket | 4.6 kHz, 4–5 pulses, rapid | 2/2/4/5 | **Shove:** pushes heavy crumbs, dice and spools |
| 4 | **Frost** | Snowy tree cricket | 3 kHz steady "treet" | 3/4/2/1 | **Thermometer:** while she leads, the HUD shows the temperature her chirp rate gives (Dolbear's law). It opens thermostat locks (below) |
| 5 | **Hump** | Camel cricket (wingless, **silent**) | none (taps a foot instead) | 3/5/0/3 | **Huge leap:** hold ↓ to crouch for 0.4 s, then Jump; can't chirp at all |
| 6 | **Jam** | Jamaican field cricket | 4.5 kHz, 3-pulse | 5/3/3/3 | **Wall-run:** runs 3 tiles up a wall |
| 7 | **Rin** | Bell cricket | bell-like ringing "ri-i-in", about 4 kHz | 2/3/5/2 | **Lullaby:** chirp-stun on enemies lasts 3× as long |
| 8 | **Digby** | Mole cricket | 2.5 kHz low drone | 2/2/4/4 | **Dig** through soft soil and sand patches |
| 9 | **Mote** | Ground cricket | 7.5 kHz faint trill | 4/3/1/1 | **Tiny:** fits through crack-sized gaps |
| 10 | **Chip** | House cricket, Pip's cupmate | 4.9 kHz, 3 pulses | 3/3/3/3 | **Duet:** Pip's and Chip's chirps together open "harmony" doors (post-game secrets) |

**Thermostat locks (Frost's secrets):** a lock shows a target, such as "70°F". Its room has a warm end (stove, dryer vent, furnace) and a cold end (window, fridge), and the reading changes as you walk. Find the spot where Frost reads the target, then chirp: the lock opens. The Sound Book explains the formula (°F = 50 + (N − 40)/4).

**Swapping (one rule, everywhere, boss fights included):**
- You travel with a **trio**: three crickets picked from everyone you've saved. Pick it at any save crack, in the Carrier, or on the "Ready?" card at a lair door.
- L1/R1 (Q/E, or tap a portrait on touch) swaps within the trio, in fights too. A little hop-off/hop-on puff covers the swap.
- **A swap pressed in the air waits until you next stand on the ground** (the portrait blinks meanwhile). So a swap never changes a jump in progress, and no perk chains across a swap.
- A trio always has at least one cricket who can chirp. If Hump is out front when you enter a lair, the door swaps in the next trio member automatically ("I'll cheer from here").
- Inside boss arenas, chirp radius and stun length are **fixed per fight**, not taken from the Chirp stat or perks. Movement stats still apply, and every arena is built for the weakest movement stats.

### The geckos (bosses)
**Eyes:** Duchess and Ember (eyelid geckos) blink. Every other gecko has no eyelids, so they never blink and lick their eyes now and then; Lashes does it constantly. The bestiary explains.

**Scary but friendly:** each is nearly a screen long, towering over a 64 px cricket, with glittering eyes, a huge mouth and a slow tail-wag. All of them are courteous, chatty and sincerely sorry that you look delicious. Every one shows the same tell before a strike: **the tail tip wiggles** (real gecko hunting behavior), with a **rattle-swish** sound panned to the gecko. After you win, each one is a good sport ("Fair's fair, little one") and later turns up dozing contentedly around the house.

| Zone | Gecko | Species | Personality |
|---|---|---|---|
| 1 Bedroom | **Duchess** | Leopard gecko (the one Pip was bought for) | grand, sleepy, smiling |
| 2 Bathroom | **Chikchak** | Common house gecko (she *chirps*: "chik-chak-chak") | a sly trickster |
| 3 Kitchen | **Big Tok** | Tokay gecko | LOUD ("TO-KAY!"), bites anything |
| 4 Pantry | **Lashes** | Crested gecko | a gourmand who loves fruit, and **keeps licking his own eyeball while he talks to you** (crested geckos have no eyelids and really do clean their eyes this way). It's his tic between lines, and a tell: when he licks, he isn't looking |
| 5 Laundry | **Peridot** | Giant day gecko (active by day, sleepy in the dark) | a bright-green fitness nut |
| 6 Living room | **Gargy** | Gargoyle gecko | a grumpy couch potato |
| 7 Study | **Mossy** | Leaf-tailed gecko (camouflage master) | a hide-and-seek champion |
| 8 Sunroom | **Kite** | Flying gecko (glides on skin flaps) | a show-off |
| 9 Basement | **Ember** | Cave gecko (red-eyed, lives in the dark) | shy, hates bright light |
| 10 Attic | **Nana** | New Caledonian giant gecko (the biggest gecko alive; growls) | ancient, enormous, grandmotherly |

### The Not-Crickets (the running joke)
Things in the house that sound like crickets but aren't. Each is first heard as a **decoy beacon**: a chirp you follow, thinking it's a friend. Each delivers the punchline "I'm *not* a cricket!". Then each helps you and moves into the Carrier, and all of them sing in the finale.

| Not-Crickets | Where | Sound | Joke | What it does for you |
|---|---|---|---|---|
| **The Smoke Alarm** ("Beep") | Hallway + Laundry | one high beep. In the Hallway, every ~40 s (the real low-battery rate). In the Laundry it's "very tired": it beeps back whenever you chirp nearby, and every 8–10 s on its own | The classic: everyone thinks it's a cricket. It's a battery, and it's tired. | Zone 5's "beacon". Hump (silent) sat under it so someone would come, and taps his case when you're near. Until you have the Glider, the beeps and taps carry through the dryer vent beside it. Give it a battery from the Basement to quiet it (optional) |
| **Chikchak** | Bathroom | 6–9 "chik-chak" chirps | A gecko that chirps: the beacon leads you into a gecko's lair | She's the zone 2 boss |
| **Peeper** | Sunroom plant pot | rising "peep" once a second (spring peeper tree frog) | Sings to impress frogs; very hurt you thought otherwise | **Chirp-off** puzzle: match his rhythm to win; then a lily pond in the Carrier |
| **Soot** | Chimney (Living Room ↔ Basement ↔ Attic) | rattling chitter of chimney-swift chicks | "Chimney *sparrow*? Chimney *swallow*? Chimney *bat*? Now *cricket*? I'm a SWIFT." | Gives the **Swift Feather** (a flutter in the air) for climbing the chimney. Warns that the Attic damper is stuck: "only a proper chorus will shake it" |
| **Velvet** | Attic rafters | squeaky bat social chitter | A bat, very much not blind and very much not a cricket | Echolocates the whole house: reveals every secret on the map (late game) |
| **Squeaky toy, dryer squeak, door hinge** | Living room, Laundry, Study | squeaks | Quick one-line gags | — |

The puzzle side: **Listen** shows the sound's rhythm as a small strip of pulses next to the direction arrow. Players learn that a real cricket is short pulse groups at a steady rate, a smoke alarm is one beep with a long wait, a frog is one rising note, and a swift is a messy rattle. The Study's beacon-maze (zone 7) depends on telling them apart.

### Carrier recruits (optional; found by exploring, Suikoden-style)
Each runs a facility that visibly appears in the Carrier.

| Recruit | Where found (needs) | Facility |
|---|---|---|
| **Rolo** (pill bug) | Kitchen, under the fridge (Raft) | **Crumb Shop:** spend crumbs on seed-hearts (+1 health), song-seeds (+chirp meter) and Listen range |
| **Page** (silverfish) | Study, in a dictionary (Glow Bead) | **Library:** the **Sound Book**, with every sound heard, played back with a real fact; and a bestiary |
| **Lumen** (moth) | Living room lamp (Glider) | **Lamp:** lights the Carrier; the **map table** shows found and missing items per zone |
| **Dot** (ladybug) | Sunroom (Earplugs) | **Clinic:** full heal at the Carrier; tips |
| **Weft** (spider) | Bedroom closet (Floss Line) | **Hammocks** and **Weaver:** sews a silk stitch onto the map to mark any spot |
| **Sgt. Crumb** (ant who quit) | Pantry (Rubber Band) | **Trainer:** a jump-course time trial per cricket |
| **Glim** (firefly) | Basement (Swift Feather) | **Night lights** and **the Stage:** a jukebox for every song heard |
| **Shelly** (snail; not an insect, insists it doesn't matter) | Bathroom drain (Thimble) | **Post:** crack-to-crack fast travel between any visited save cracks |

The four Not-Crickets add four more: Peeper's **Pond**, Soot's **Lookout tower**, Velvet's **Echo map**, and Beep's **very quiet doorbell**.

### The Carrier grows: what each of the 22 arrivals adds
The Carrier is a pet-store plastic cricket keeper the kid left on the **Bedroom floor beside Duchess's tank**. It's on the map. Its painting (the "shell") changes at four stages: bare box (0–2 rescues), moss floor and a second level (3), string lights, a ladder and cut windows (6), rooftops and a garden (9). On top of the shell, every arrival adds one painted object in its own slot, placed by code, with a pop and a sting.

| Arrival | Adds |
|---|---|
| Stripe | a chalk running track along the floor |
| Katy | a leaf hammock |
| Duo | a stack of dice: lookout and weight bench |
| Frost | a thermometer strip that shows her Dolbear reading |
| Hump | a bottle-cap drum (he can't chirp, so he drums along) |
| Jam | a painted wall-run lane up the side wall |
| Rin | a bamboo bell hung from the lid |
| Digby | a soil tray with a burrow |
| Mote | a matchbox bunk with a tiny door |
| Chip | the old feeder cup, turned into Pip's and Chip's bed |
| Rolo, Page, Lumen, Dot, Weft, Sgt. Crumb, Glim, Shelly | their 8 facilities (above) |
| Peeper, Soot, Velvet, Beep | Pond, Lookout tower, Echo map, doorbell |

Residents wander, bob and chirp. Every rescued cricket's synthesized song joins the Carrier music on its beat, so the Carrier sounds fuller with each arrival. **At the ninth rescue** the Carrier sings together for the first time; the sound carries up the chimney and the Attic damper rattles open (a short cutscene).

## Controls

Landscape on phones. A small side-view game needs both thumbs, so a "turn your phone" overlay shows in portrait.

| Action | Keyboard | Touch | Gamepad |
|---|---|---|---|
| Move / aim menus | ←→ or A/D | the joystick, bottom-left (radius 70 px; shown faintly at rest in the corner, and it jumps to wherever the thumb lands in the left third; issue #35) | Left stick / D-pad |
| Up (issue #27): on the keyboard **↑ / W is the jump** (see Jump rules) and climbs hanging lines; on touch and pad, stick up looks up and climbs | ↑ or W | stick up | stick up / D-pad up |
| Down: drop, ground-pound, Hump's crouch; and **Enter** (issue #27): a ↓ press next to something you can go into or use (a hiding spot, door, save crack, lair door, a talker, a switch or thermostat, a Carrier spot) does that, on every scheme | ↓ or S | stick down | stick down / D-pad down |
| Jump (see Jump rules) | **↑ / W** (issue #37: the one every hint names); Z / Space jump too, unadvertised | **Jump**, bottom-right corner (88 px) | ✕ (bottom) |
| Use item (floss grab, rubber-band charge, glow flash) | V / I | **Use**, directly left of Jump (72 px), shown once the Floss Line is found | R2 |
| Chirp (stun ring, wake resonant objects, call: trapped crickets answer) | C / K | **Chirp**, directly above Jump (72 px) | △ (top) |
| Kick (bonk bugs, hit switches) | X / J | **Kick**, above Use (64 px) | □ (left) |
| Cloak (hold; Cellophane Cloak, issue #27) | hold Shift | hold stick up | hold D-pad up |
| Listen (hold: beacon arrow, rhythm strip, ripples) | hold B / L | hold **Ear**, left of Use (64 px) | hold ○ (right) |
| Swap cricket (within the trio) | Q / E | tap one of the three trio portraits, top-left (52 px each) | L1 / R1 |
| Map | Tab | map icon, top-right | Create (8) |
| Pause / menu | Esc / P | pause icon, top-right | Options (9) |
| Mute | M | speaker icon, top-right | Settings (from pause) |
| Confirm / back (menus) | Enter, Space / Esc, Backspace | tap / back button | ✕ / ○ |
| Report a bug | Ctrl+Shift+F (Ctrl on a Mac too; the game never uses Ctrl+Shift, so F stays) | "Report a bug" in Pause and Settings | the same menu buttons |

The two keyboard layouts don't collide: arrows with Z X C V B under the left hand, or WASD with Space and J K L I under the right.

**Jump rules** (one button, no overlaps):
- **On the ground:** press to jump. Releasing early cuts the rise (variable height).
- **Flutter** (Swift Feather): a *fresh press* in the air. One per airtime; refilled on landing, clinging or grabbing a hook.
- **Glide** (Glider): *hold* Jump while falling, either after the apex or after a flutter. Let go to drop. Katy glides farther.
- **Wall-jump** (Tape Booties): press toward a wall in the air to cling and slide slowly; press Jump to kick away. Walls are cling-only; Jam's wall-run is the only way up a wall face.
- **Hump's Huge leap:** hold ↓ while standing; after 0.4 s he crouches and a ring fills; press Jump. A quicker ↓ + Jump is the normal drop-through.
- **↓ + Jump:** drops through a one-way platform when standing; ground-pounds in the air (Thimble). Holding ↓ in the air turns that press into a pound, not a flutter.
- **↑ / W as Jump** (issues #27, #37; keyboard only): ↑ and W are **the** Jump key: every hint, prompt, note, card, toast and How to Play names ↑ (arrows) or W (WASD) for jump, and they do everything Jump does (jump, the held full-height jump, flutter, glide, wall-kick, ↓ + Jump, the story's next / hold-to-skip). Z / Space still jump everywhere as quiet extras: How to Play's layout note mentions them once, no hint does. On a hanging line ↑ climbs and never lets go: ← or → pressed **together** with ↑ (each within 6 frames, 0.1 s, of the other, either first, both still held) jumps off that way, at least at run speed; ↑ held while pumping with ← / →, or ← / → held while climbing, never lets go. ↓ lowers Pip down the line and Use lets go (as before); Z / Space still let go with a fling (unadvertised). The line tips and the swing prompt say "{use} to grab, ↑ climb, ← → + ↑ jump off" on the keys and "Jump" on touch and pad (the {lineOff} token). Look-up is on touch and pad only (stick up).
- **Enter** (issue #27): one action, **↓ on every scheme** (keyboard ↓ / S, stick down, D-pad down): a ↓ press next to a hiding spot, door, save crack, lair door, talker, switch, thermostat or Carrier spot uses it. Where none is near, ↓ is as before (drop-through with Jump, the pound in the air, Hump's crouch). ↓ then Jump within 3 frames is always a drop-through, never Enter; Jump then ↓ is a plain jump (as before #27). Within reach of an Enter target, holding ↓ goes in, so Hump's crouch-leap and Digby's dig don't start beside a hiding spot, door or talker. Every prompt, tip and How to Play line names Enter's key for the scheme in use. The tank's lid gap: jump up into it (or press ↓ under it) and Pip wriggles through.
- **Cloak** (issue #27): hold Shift on the keyboard; hold stick up / D-pad up on touch and pad (up is free there, since they have a Jump button).

**Use rules** (one button, by priority): a hook within 1 tile → grab it; on the ground with the Rubber Band, hold for 0.25 s or more → charge, release to launch; otherwise a tap → glow flash (once the Glow Bead is found).

**Hide** (a core verb, from the start):
- **Hiding spots** are the cricket-sized gaps a bigger animal can't reach or see into: baseboard cracks, under a bottle cap or a crumb, inside a sock fold, between book spines, under a leaf. Each one shows a soft ink outline when you're close.
- **↓ near a spot** tucks you in (Enter, issue #27; the same on every scheme). Moving or jumping leaves it. Mote fits spots too small for anyone else (optional secrets).
- **While hidden**, enemies, hazards and geckos can't see you or reach you. You can still Listen. **Chirping gives you away** to anything that hunts by sound (Ember, Sir Bartholomew).
- **Sneak sections** are kept rare: at most 1 or 2 rooms per zone, from zone 2. Each is built around a readable route of unbeatable hazards (darkling beetles, the robot vacuum), always has a hiding spot within reach, and is never a timed chase.
- **In boss fights:**
  - Chikchak: hide in steam and grout cracks.
  - Ember: hiding means silence.
  - Nana phase 1: duck into rafter gaps from tail sweeps.
  - The Dragon's Lair is built around hiding.

**Floss swing, on every input:** Use grabs (keys V/I, touch Use, pad R2). ←→ pumps the swing; up climbs the line and down lowers you (keyboard ↑ / ↓, the stick or D-pad). Jump lets go with a fling in the swing's direction (touch Jump, pad ✕; on the keyboard ← or → together with ↑ jumps off that way, and Z / Space fling as before: issue #37). Use again lets go and drops straight down.

**Forgiveness** (all in `data/movement.js`): coyote time 100 ms; jump buffer 120 ms; corner nudge up to 8 px on head bumps and ledge lips; wall-jump grace 100 ms after leaving a wall; hook magnet 1 tile, with Use buffered 120 ms.

- **Stick ↓ counts only past 60% of the stick's radius and within ±30° of straight down** (touch stick and pad stick alike; D-pad and keys are exact). A drifting thumb never pounds or drops by accident.
- **Listen** works only while standing; moving or jumping cancels it.
- **The joystick on screen** (issue #35; it was invisible until touched, and tips called it "Stick", which helped no one find it): whenever the touch controls show, a faint base and knob rest in the bottom-left corner (centre 92 px in from the left and bottom edges, inside the safe area, about half as strong as the buttons). A thumb anywhere in the left third grabs it there; when the thumb lifts it goes back to rest. It isn't one of the blocks the camera keeps the cricket clear of (it's faint, and the camera already keeps him in the upper middle on touch screens).
- **Naming the joystick:** tips and How to Play never name it in words. Where a keyboard tip shows a keycap, a touch tip shows a small inline picture of the joystick as it looks on screen (the same base and knob, the knob pushed that way, an ink arrow on it; for moving, the knob centred with arrows both ways). Where words are needed (How to Play's Touch note, aria labels) it's "the joystick (bottom left)".
- **Touch placement:** the right-thumb cluster is Jump in the corner, with Use beside it and Chirp above it, so the swing chain (Jump, Use, Jump, hold Jump) rocks between two neighbours. Buttons are semi-transparent watercolor blots in a DOM overlay, kept inside the safe area. The camera keeps Pip in the upper-middle of the screen on touch devices, so thumbs never cover him.
- **Prompts** always show a key cap (a boxed "X") or a pad glyph, never a bare letter, so keyboard X (Kick) and pad ✕ (Jump) can't be confused.
- **Controller extras:**
  - Prompts show ✕○□△ drawn as shapes for PlayStation, or A/B/X/Y for others. They switch to keys the moment a key is pressed.
  - Unplugging pauses the game with "Controller disconnected".
  - Light rumble on landing hard, getting hit or a boss stun, with a **Vibration** toggle.
  - "Controllers work best in Chrome or Edge" shows if the mapping isn't standard.
  - The title shows "Press any key or button".
- **Rebind:** not offered (cut list); the defaults cover both hands.

## World and structure

The house is one connected map of ten zones. Each zone has 6 to 8 rooms (screens; some are 2 or 3 screens wide or tall), plus the Carrier hub, the opening tank, and three linking spaces (the Hall, the stairwell and the chimney shaft): **about 70 rooms in all**. Every zone has:
- **two save cracks** in the baseboard. From the start, every save crack offers **"Go to the Carrier"** (a scurry through the wall cavity), and the Carrier sends you back to the crack you came from. Shelly's Post later adds crack-to-crack travel;
- **one item** that gates progress;
- **two to four secrets** (crumb caches, seed-hearts, song-seeds, recruits, Not-Crickets);
- **one decoy sound** (the Pantry's twist: the chirp that sounds wrong is a real cricket);
- **the gecko lair**, a single arena room with a save crack and a "Ready?" card at its door.

**Everyone comes home.** In zones 1 to 3 the way onward runs through the lair. Zones 4 to 9 can be left unfinished for a while, but **the Attic needs all nine crickets home**: the damper at the top of the chimney opens only at the ninth rescue. Until then, the damper shows a card listing who's still missing and where ("Rin: Study"), and every unfreed lair is marked red on the map.

**House layout** (the map is drawn as a cut-away dollhouse):

```
            [10 ATTIC]              ← chimney top (damper: 9 rescues)
  [1 BEDROOM + Carrier][Hall][2 BATHROOM][7 STUDY]          upstairs
        ║ stairs (banister swing)       ║ chimney
  [4 PANTRY][3 KITCHEN][6 LIVING ROOM]═[8 SUNROOM] downstairs
        [5 LAUNDRY]                    ║ chimney
            [9 BASEMENT]═══════════════╝ furnace / chimney base
```

### Items (the Metroidvania keys)
Found household objects, each with a cricket-sized use:

| # | Item | Found in | Lets you | Opens |
|---|---|---|---|---|
| 1 | **Tape Booties** (double-sided tape) | Bedroom, the kid's craft desk | wall-cling and wall-jump | the climb out of the bedroom; Bathroom tub walls |
| 2 | **Floss Line** | Bathroom, the dental floss | swing from pins, hooks and drawer pulls (Use near a hook) | the banister swing down to the Kitchen; Study bookshelves |
| 3 | **Bottle-Cap Raft** | Kitchen | float across water and ride currents (sink, washer flood) | Laundry; Kitchen under-sink; Bathroom bath |
| 4 | **Rubber Band** | Pantry | charge a super-jump (hold Use, release) | the sofa ridge in the Living Room; high shelves everywhere |
| 5 | **Dryer-Sheet Glider** | Laundry | glide (hold Jump while falling) | crossing the stairwell to the Study; the Sunroom canopy |
| 6 | **Thimble Helmet** | Living Room, the sewing basket | ground-pound (↓ + Jump in the air): breaks cereal walls, plaster, piano keys | the Sunroom door; the Basement stairs' rubble |
| 7 | **Glow Bead** | Study, a glow-in-the-dark bead | lights dark rooms around you; tap Use to flash (stuns night creatures) | the Basement; the dark crawlspaces |
| 8 | **Cotton Earplugs** | Sunroom, the seed tray | walk through **loud zones** (vacuum, alarm, bat roost) without being dazed (crickets hear through their legs, so loud noise stuns) | the Attic approach; the noisy hallways' secrets |
| 9 | **Swift Feather** | Basement chimney base, from Soot | a flutter: press Jump again in the air | climbing the chimney toward the Attic |

**Route and choice** (the prerequisite graph lives in `data/zones.js`; tools and the debug hook read it):
- Bedroom → Bathroom → Kitchen are fixed, as the tutorial run.
- After the Kitchen, the **Pantry and Laundry can be done in either order.**
- The Living Room needs the Rubber Band *or* the Glider (two different ways in).
- The Study needs the Glider. The Sunroom needs the Thimble.
- The Basement needs the Glow Bead.
- The Attic needs the Earplugs, the Swift Feather **and nine rescues**.
- Every item opens 1 to 3 secrets in earlier zones, worth backtracking for.

### Movement table (`data/movement.js`; the target the physics is tuned to)
All in 40 px tiles. Speed shifts the running gap by ±0.5 tile per step from Speed 3.

| Move | Input | Rise | Gap |
|---|---|---|---|
| Jump, stat 2 | press Jump (release early = lower) | 2.5 | 4 |
| Jump, stat 3 | | 3 | 5 |
| Jump, stat 4 | | 3.5 | 5.5 |
| Jump, stat 5 | | 4 | 6 |
| Hump's Huge leap | hold ↓ 0.4 s, then Jump | 5 | 6 |
| Wall-jump (Booties) | Jump while clinging | 2 per kick off a clingable wall | pushes 2 out |
| Jam's wall-run | run into a wall | 3 up a wall | — |
| Glide (Glider) | hold Jump while falling | falls 1 per 4 across | — |
| Katy's long glide | same | falls 1 per 6 across | — |
| Super-jump (Rubber Band) | hold Use, release | 8 | 4 |
| Floss swing | Use near a hook; Jump to fling | hooks reach 5 | fling up to 6 |
| Flutter (Swift Feather) | fresh press in the air, once | +2.5 in the air | — |

**Gating rules:**
- Gate by **kind** first: water (Raft), darkness (Glow Bead), cereal walls and plaster (Thimble), loud zones (Earplugs), hooks (Floss), clingable walls (Booties), chimney (Feather).
- A pure height gate for the super-jump is **at least 7 tiles**, out of reach of Hump's 5.
- The main path is built for the weakest stats (Jump 2, Speed 2), so swapping is never required.

### Zones, in order, with what each adds

| # | Zone | Look (watercolor) | New mechanic | Enemies introduced | Decoy sound |
|---|---|---|---|---|---|
| 0 | **Opening: the Tank** | night, heat-lamp amber, glass | run, hop, kick; the tank escape (see Screens) | — | — |
| 1 | **Bedroom** | indigo night, nightlight gold, toy clutter | wall-jump (Tape Booties), Listen; the Carrier | ants, dust mites (tiny) | the smoke alarm in the hallway, heard first |
| 2 | **Bathroom** | aqua tile, steam, white porcelain | floss swing, steam vents lift you | silverfish (fast), mosquito | Chikchak's chirp, which leads to the lair |
| 3 | **Kitchen** | warm butter-yellow, copper pans | water and the raft; heat (stove glow) | cockroach (flees, then flies), fruit fly swarm | a creaky fridge |
| 4 | **Pantry** | brown paper, jars, spilled flour | rubber-band super-jump; sticky syrup slows you | weevils (roll grains), ant soldiers (charge) | the twist: Frost's chirp sounds wrong (a tree cricket indoors?) but it's real |
| 5 | **Laundry** | lavender, lint, soap suds | glider and the dryer's warm updrafts; washer-flood currents | moths (fly to light), earwigs (pincers block) | **the smoke alarm, for real:** the zone's "beacon" *is* the alarm; Hump is under it |
| 6 | **Living Room** | rose and olive, sunset through curtains, firelight | ground-pound; bouncy cushions; piano keys | dust bunny (rolls), stink bug (cloud) | the squeaky dog toy |
| 7 | **Study** | sepia ink, book spines, green lamp | **beacon maze:** four sounds, pick the true chirp by rhythm | jumping spider (pounces), bookworm | the door hinge, the alarm, Peeper (heard from below) |
| 8 | **Sunroom** | spring greens, glass roof, mist | plant canopy, misters, soft soil (Digby secrets) | wasp (hover then dive), aphid herds (harmless, bouncy) | Peeper the tree frog (chirp-off) |
| 9 | **Basement** | deep blue-grey, furnace orange, cobwebs | darkness and the Glow Bead light radius; the chimney base | house centipede (fast, long), cellar spider (drops on silk) | Soot's chitter from the chimney |
| 10 | **Attic** | dusty rafters, moonlight shafts, trunks | loud zones (Earplugs), everything combined | wasps, Velvet's flying friends (moths), all earlier types mixed | Velvet the bat |

### Difficulty curve
- **Zones 1 to 3** teach one thing at a time, have no spikes over pits, and give generous checkpoints.
- **Zones 4 to 7** combine two movement skills per room and add tougher enemies.
- **Zones 8 to 10** need fast chains of moves (wall-jump into floss swing into glide), and some rooms have a **noise** or **darkness** layer.
- **Health:** 5 seed-hearts, rising to 10 with upgrades. Touching an enemy or hazard costs 1 and knocks you back.
- **Pits** cost 1 heart and put you back on the last solid ground you stood on (or a marked respawn point where that ground is unsafe).
- **Losing all health** puts you back at the room's entrance, or at the room's last soft checkpoint: every room 2 or more screens wide or tall has one per screen. Losing never costs more than one screen's progress. There are no lives and no game over.
- **Assist option** (Settings): "Gentle Mode" makes hits cost half and slows boss tells to 1.2 s. It's offered once after two retries of the same boss.

## The ten gecko encounters

None of them involves hurting the gecko. Each is a single arena with 3 phases. The first phase teaches, the second adds a twist, and the third is the climax. A save crack sits at the arena door. **In every fight, losing restarts the current phase.** Every strike is shown by **the tail-tip wiggle** and its rattle-swish for 0.8 s (1.2 s in Gentle Mode).

1. **Duchess, leopard gecko (Bedroom): avoid.**
   - She stalks the floor of her old tank and lunges where you stand.
   - Make her lunge into the sand berm three times. Each miss leaves her snout stuck for 3 s.
   - While she's stuck, run up her back and pull one of three tabs on the feeding cup holding Stripe.
   - Phase 3: she lunges twice in a row.
2. **Chikchak, common house gecko (Bathroom): stealth.**
   - She hunts by sight and chirps decoy calls from the mirror ledge.
   - Steam bursts from the tub fill the room in timed clouds. She can't see you inside a cloud.
   - Use the clouds to cross and turn three faucet handles, which flood her ledge so she retreats to dry tile.
   - Then swing (floss) to Katy's soap dish.
3. **Big Tok, tokay gecko (Kitchen): distract.**
   - His "TO-KAY!" bellow is a shockwave you jump over. He bites anything that moves.
   - Kick (or Duo-shove) three decoys off the counter (a cork, a wooden spoon, a sponge). He chomps each and has to work his jaw free.
   - Each time, ride the raft across the sink to reach the spice rack where Duo is stuck.
4. **Lashes, crested gecko (Pantry): distract with fruit.**
   - He patrols the shelves. Swing and super-jump above him to knock fruit (a grape, jam, banana) into his path at the right moment.
   - He stops to lick it, so you can pass.
   - Phase 3 brings a fruit-fly swarm that blocks the way. Chirp to scatter it.
5. **Peridot, giant day gecko (Laundry): put her to sleep.**
   - She's active in the light and dozes in the dark.
   - Glide on the dryer's updrafts to three light pull-chains while she chases. Each dark corner slows her.
   - At full dark she naps. Hop to the smoke alarm and find Hump underneath.
6. **Gargy, gargoyle gecko (Living Room): stun.**
   - He lounges on the sofa and swats you off the cushions.
   - Ground-pound cushions to bounce a throw pillow into him. It's a soft "bonk": he's dazed, never hurt.
   - Three bonks and he sulks off, freeing Jam from the remote-control slot.
7. **Mossy, leaf-tailed gecko (Study): hide and seek.**
   - He vanishes into the bookshelves (camouflaged).
   - Chirp to make his eyes shine back. They glint for 1 s on screen and as an echo blip.
   - **Tag him** by kicking or touching him during the glint. A tag does no damage either way. Outside a glint, touching him costs a heart as usual.
   - Three tags; he gets faster and hides in harder spots. He concedes cheerfully and opens Rin's bamboo cage.
8. **Kite, flying gecko (Sunroom): chase.**
   - He glides off with the leaf where Digby clings.
   - Race him through the canopy, gliding and swinging, and chirp to startle him when you're within range. He drops lower each time.
   - On the third startle, Digby lets go into the soil.
9. **Ember, cave gecko (Basement): dazzle.**
   - She hunts in the dark by your sound. Standing still makes no sound, so she loses track.
   - When her red eyes are close, flash the Glow Bead: she's dazzled for 4 s.
   - Use those windows to free Mote from a crack she's guarding.
   - Phase 3: the furnace cycles on and off, changing how far you can see.
10. **Nana, New Caledonian giant gecko (Attic): the lullaby.**
    - She's vast and rumbles with growls (loud zones: wear the Earplugs).
    - **At the door:** the "Ready?" card says her stones want a **low, a middle and a high voice**. Low is 3.5 kHz or under (Katy, Frost, Digby), middle is 4–5 kHz (Pip, Duo, Jam, Rin), high is 5.5 kHz or over (Stripe, Mote). One press picks a suggested trio; the door opens once the trio covers all three. Everyone is home by now, so it can't lock you out.
    - **Phase 1:** survive her tail sweeps and **kick each of three "music stones"** (a tuning fork, a glass, a bell) to light it, between sweeps.
    - **Phase 2:** swap through your trio (L1/R1). Each stone glows the color of the voice it wants, and your matching portrait glows too. Chirp at each stone with the right voice.
    - **Phase 3: the chorus.** All ten rescued crickets and every Not-Cricket you've met join in a short rhythm sequence. Press Chirp on the beat, shown as rings on screen, with a forgiving timing window and no failure, only "louder". The beat comes from the game clock (see Audio direction).
    - Nana yawns, sings along a little, and falls asleep. Chip is free.

## The Dragon's Lair (optional)

- **Where:** behind the furnace, in the Basement's far corner, there's an old glass vivarium under a hot orange basking lamp. It's full of a **hoard of lost household treasures**: buttons, bottle caps, coins, marbles, thimbles, a lost earring, a key, foil candy wrappers. You can reach it once you have the Glow Bead. It isn't needed for the ending.
- **Who:** **Sir Bartholomew**, a bearded dragon. He isn't a gecko, and he takes that very seriously. He's pompous, dramatic, secretly lonely, and **far too big for the screen**. The camera only ever shows parts of him: a golden eye in the gloom, a clawed foot, the spiky beard. He head-bobs and his beard turns black when he spots you (both real bearded dragon displays).
- **The fight:**
  - **Phase 1:** skitter between hoard piles and hide while he searches, head-bobbing. Chirping gives you away.
  - **Phase 2:** his claw sweeps the hoard. Duck under bottle caps and into gaps between coins, and climb toward the lamp.
  - **Phase 3: befriending.** Standing on the top of the hoard, in plain view, you **wave**: hold Listen and press Kick. That's the slow arm-wave real bearded dragons use as a greeting and a sign of peace. He stops, waves back, and his beard pales. "...Nobody ever waves."
- **Reward: the Cellophane Cloak**, a crinkly clear candy wrapper from the hoard. Hold Shift (keyboard) or stick up (touch, pad) in the open for 3 s of near-invisibility (6 s to recharge), to slip past darkling beetles and the vacuum without a hiding spot. It opens optional shortcuts and 100% secrets. The suggestion was a ring from the hoard that makes you invisible. A candy wrapper does the same job at cricket scale, and avoids borrowing a famous story's magic ring.
- **Carrier arrival 23:** he's far too big to move in, so he sends a gift, a **hoard corner** (a button throne and a marble).

## Win, lose and progress

- **Win a zone:** free its cricket. The cricket hops off toward home, and the game asks **"Return to the Carrier?"** Yes: travel there, watch the arrival's object pop in, then go back to the lair's save crack. No: the arrival is waiting at your next visit.
- **Win the game:** free Chip. The finale and ending play, then the credits, and you return to the Carrier for 100% clean-up.
- **100%:** 10 crickets, 8 recruits, 4 Not-Crickets, Sir Bartholomew befriended, all seed-hearts and song-seeds. A completion stamp on the save shows the percentage.
- **Losing:** in a room, back to the last soft checkpoint. In a boss fight, back to the start of the current phase. There's no game over.
- **Saved:**
  - at every save crack and every rescue;
  - three save slots in localStorage;
  - each slot holds: items, rescued crickets, the trio, recruits, map cells visited, secrets taken, crumbs, upgrades, the current save crack, play time, and settings (shared across slots).

## Screens

- **Title:** watercolor key art of Pip on a floorboard under a looming gecko's chin. Shows New Game, Continue (latest slot), Load, Settings, Credits, and "Press any key or button".
- **Opening (about 2 minutes, mostly playable):**
  - Three painted panels, about 4 s each, captions drawn in the DOM. Jump skips a panel; holding it skips all.
    1. a pet-store shelf with cricket cups;
    2. the car ride, with the cup on the seat;
    3. the kid's bedroom and Duchess in her tank, the cup set on her rock.
  - **Control starts at the tongs. The tank escape, in 6 beats:**
    1. **In the cup:** the tongs dip three times. Hop left and right to dodge (teaches move and jump).
    2. **Out:** hold Jump for a full-height leap onto the cup rim and down to the sand (teaches variable height).
    3. **The escape** (issues #24, #25, reviewed; replaces #7's hunt). The game's opening scare: it should feel like a real escape. All numbers in tiles (40 px) and seconds; the tank's sand room is 64 tiles wide.
       - **Asleep when you come in:** Duchess lies curled on her rock in the middle of the room (her rock moves to about tiles 22-27, so Pip must creep past her nose), eyes shut (the sleep art, breathing, Zs). She stirs as he passes: a tail twitch, then an eye flicker, with a low growl note under the quiet music. Only her head counts as bumping her; walking past her body or tail is fine.
       - **She wakes** when Pip passes about tile 38 (she's about 12 tiles behind), or if he bumps her head or chirps within 6 tiles: an eye snaps open, a growl, the room darkens (a 0.4 s wash in the zone's darkest colour, a vignette tightening around Pip, her eye glinting amber), and the chase cue starts. The camera drops its look-ahead and frames both of them, Pip in the right third; if her head ever leaves the view, her eye glints at the screen edge.
       - **The chase:** she scrambles at about Pip's speed (with a deterministic catch-up when she's more than 10 tiles behind) and pounces. Every pounce: she stops and crouches, and the crouch is the warning (the tell, "get ready": 0.8 s, Gentle Mode 1.2 s; issue #32): a big, fast shake of her tail tip with the rattle-swish (again half-way), a large "!" over her, her hips wiggling like a cat about to pounce and her brow coming down over narrowed eyes; then as she springs the shake stops and her shadow drops on the sand where she'll land ("hop!"), then a big leap (0.6 s in the air; as long as her aim needs, about 6 tiles at a still cricket; her silhouette looming on the glass), landing with a 6 px shake (the Screen shake setting applies) and a sand spray. **Pounce 1 is always a near miss** that lands just behind him (the scare; it teaches the tell). **Later pounces aim where he'll be when she lands at his current speed** (a runner flat out is led), so a hop when her shadow drops, or hopping the berm at tiles 48-50, dodges them: a cricket who leaves the ground at any point after she springs is never caught (a test sweeps hop timings from the crouch to the landing). A catch is her snout at the landing. The tank's note (tile 14) names what's on screen: "When she crouches and shakes her tail, get ready. When her shadow drops, HOP!"
       - **She can eat you (not in Gentle Mode):** on a catch the landing frame shows her jaws closing, Pip vanishes in a sand puff, and the screen snaps to black for about 0.5 s with a gulp and a contented "mm" heard, never seen. It fades back in on her asleep with a lip-lick and a snore, and a card: "Duchess got her dinner. She crouches and shakes her tail: get ready. Her shadow drops: HOP! Then hide in the log →" (at most 1.5 s; any key or tap skips it after its first 0.5 s; holding Jump can't skip it). Then a quick retry from a spot about 6 tiles before the wake point, with her asleep again, nothing else lost. From the third catch her pounces quietly shorten, and after three catches Gentle Mode is offered (as fights do). Pause > "Back to room entrance" does the same retry. In Gentle Mode a catch is the old roar and skitter (no game over).
       - **Hiding is the escape:** the log's hiding zone is wide here (1.5 tiles each side), a ↓ press is remembered for 0.2 s, and ↓ held on arrival counts, so a panicked dive works. Pip slides in with a snap; her jaws close on bark (a 60 ms hit-stop, bark chips). Hidden, only Jump brings him out. She sniffs at the log (tongue flicks), then looks about for him, one way and then the other, with a "?" (issue #31). Then she gives up: as she turns away the way on opens, the warm light returns over 1.5 s, the chase music stops, a relief sting plays and Pip peeks out; she plods back left to her rock and curls up asleep there. Coming out early gets a roar and a full tell before any pounce, so he can duck back in.
       - **The way on** is a squeeze (issue #31): a cricket-sized crack where the tank's glass corner meets the sand, one tile high, plainly too small for her (drawn dark and chipped, the glass crazed above it, a little light from the far side). It's shut while she's hunting ("Not with her right behind you! Lose her first: hide in the log."); the log's note shows from the moment she wakes. Once she's lost him (the room's state, set as she turns away) he squeezes through to the decor; she stays asleep on her rock, and bumps or chirps don't wake her.
       - **Sound:** see the audio list (issue #25). The room's own music gives way to the chase cue while she hunts.

    4. **Climb the decor:** hide log, fake plant, water-dish rim. Kick a loose pebble off a ledge to make a step (teaches kick).
    5. **The lid gap:** the kid left the mesh lid ajar. Squeeze through: jump up into the gap (or press ↓ under it), issue #27.
    6. **The cup tips:** Pip's leap knocks the cup off the tank rim. Panel 4 shows the crickets scattering into the dark.
  - Right after, the first **Chirp** prompt: Stripe answers from the dark, the ripples point the way, and the Bedroom begins beside an empty cricket keeper on the floor ("Home, for now.").
- **How to play:** a one-screen card per control scheme (keys, touch, controller), shown first in the tutorial and available from pause.
- **HUD** (a DOM overlay at screen resolution; text at least 14 CSS px):
  - top-left: seed-hearts, the chirp meter, and the three trio portraits (tap to swap);
  - top-right: crumbs, speaker, map and pause icons;
  - bottom-center, while listening: the beacon arrow and rhythm strip;
  - beacon ripples on the screen edge while listening and for 4 s after a Chirp-call (always, with the accessibility option);
  - while Frost leads: a small thermometer with her reading in °F.
- **Tutorial notes** (issue #9, reviewed; were little wooden signs on posts drawn at a fixed height, so some floated): a tip is a **note on the path**, never a signpost.
  - **The marker** (issue #34, replacing #9's propped "!" paper, which read neither as a tutorial sign nor as on the ground): a round paper badge with a clear ink "?" and a small speech-bubble tail pointing down at the spot, hovering at about head height over it (centre 60 px above the ground, radius 15 px, 17 on touch screens), gently bobbing (about 2 px, each marker in its own phase) with a soft warm glow. **Unread**, it's bright yellow-paper and its glow pulses (and it swells a little with it); **read**, it's paler and about 60% opaque, its glow faint and still, but plain to see. In dark rooms it's drawn over the darkness, glow and all, the way beacons show through (dimmer once read). Drawn in code, so it needs no ground contact. With a thin plank a tile above the spot it hangs just under the plank, a little smaller; under a full block (the tank's lid) it tucks into the gap, small. It's never drawn on another thing: the note steps up to 2 tiles sideways (within its trigger, as it does for floor props) to keep the marker at least 4 px off a point prop (hook, crumb, item, switch, thermostat dial, save crack, beacon, light, talker) or a decor prop (a plant, a spool, a pull chain, a spice rack). A check (sign-check) fails the build if a marker would overlap a solid tile, a hazard or water, or still sit on a prop (then the room data moves the note), and `sign-check --shots DIR` pictures every marker, unread and read. Script notes that appear mid-scene drop in and settle with a little hop.
  - **Where it stands:** at the tip's own spot (the trigger's centre column, or an explicit `nx` in the data), on the first standable tile at or at most one tile below the tip's row (never water or a hazard; one-way platforms count; a solid tile at the spot holds it on top). It steps up to 2 tiles sideways to keep clear of a save crack, checkpoint, hide spot, door or item. The ground is read from the live grid: if it breaks or a gate opens under the note (the tips that teach a pound), the note retires, its lesson done. Room data that doesn't meet this rule gets fixed (a few signs move, in their generators where rooms are generated), and a check fails the build if any note would float, sink or crowd another floor prop.
  - **When its text shows:** when Pip comes within about 2 tiles of the note on the same floor, after about 0.15 s there (at once if he's standing still). It stays at least 2.5 s and until he's about 3 tiles past, then fades after 0.4 s (a slightly larger radius to stay than to appear, so it never flickers). It fades in calmly (150 ms and a 6 px rise), never with the toasts' bounce, and it shows again, read or not, whenever Pip comes back to it (issue #29): after its card has gone, it re-shows once he has been out of its stay range (about 3 tiles) and comes back within about 2 tiles, or when he stands still under its "?" marker (within a tile) for about 0.5 s. Never while he's in the air or stunned (for a read note), and not again and again while he lingers: once shown it stays while he's near, and after it goes it needs him to leave or to stand under it again (notes.js `armAllows`, checked by sign-check). A card shown again is the same card, fully visible (before #29 the same tip coming back stayed hidden: its text was cached and the card never un-hid). Read notes' markers stay dim. The wide tip zones (the tank's 14-tile "watch the tail") become ordinary notes where the lesson starts (before the wake ripple); the hunt's own toasts carry the rest.
  - **The card:** a paper card centred horizontally. Where it goes is chosen once, when it appears, and it never moves while shown: the upper slot (about a quarter of the way down, below the HUD) unless Pip, an active hazard (the tongs, a falling object) or the gecko's tell is there, in which case the lower slot; in a fight, the free band above or below the framed pair, whichever is taller. A tip can ask for the lower slot in its data (the tank's "The tongs!" tip does). If Pip moves into it later, it fades to about 30% instead of moving. It ignores clicks and shows at about 85% opacity.
  - **With everything else:** the card and the toasts share one centred column, the card first and toasts under it, so they never overlap; a toast is new information, so while one shows a long card shrinks to one line. The ear guide keeps clear of the card the way it keeps clear of the HUD. The card hides with dialogs, item cards, story panels and the pause menu, and during a held or running room transition. A tip that teaches the prompt's action fades out over 300 ms when the prompt appears (and counts as read); the prompt keeps its place.
  - **Read:** a note is read once its card has been fully shown for about 1.5 s. Read notes are saved with the save slot (kept outside the game's play state, so replays and rewind are untouched).
  - **Kinds:** a *note* (the default: the marker and the card) or a *card* only, with no marker, glint or read tracking, for script hints that follow the action (Nana's phase hints). Script notes that appear mid-scene (the tank's "Hide in the log!" at the log's mouth, the cup rim) drop in and settle with a paper sound, so they're noticed.
  - **Phones held sideways:** the card is wider, not narrower (up to the space between the left HUD column and the right icon column), at most 2 lines at 14 px. Any tip longer than about 80 characters is split or rewritten (a second note further on), and a check fails the build if a tip wraps past 2 lines at 667x375.
- **Map** (pause tab 1): the cut-away dollhouse with each room shown as a watercolor cell once visited. Icons for the Carrier, save cracks, items, unreached ledges (auto-marked), recruits and the boss lairs (red until freed). A "heard here" ear icon marks where the beacon was first heard. Zoom on the current zone.
- **Crickets** (pause tab 2): portraits, stat bars, perk, a chirp **play** button (the real synthesized song). The trio can be changed here only at a save crack or in the Carrier.
- **Sound Book** (pause tab 3, once Page is recruited): every sound heard, with a play button and a one-line real fact.
- **Pause:** Resume, Map, Crickets, How to Play, Settings, **Report a bug**, Save and Quit to Title.
- **Lair "Ready?" card:** the gecko's portrait, the trio (change it here), and Enter.
- **Zone complete:** "Stripe is safe!" with the cricket's portrait, then "Return to the Carrier?".
- **Carrier hub:** a side-view diorama inside the plastic keeper. Residents wander, and you walk up to facilities to use them. A save crack in the corner leads back.
- **Victory:** 4 ending panels, then the credits (roll, skippable), then "Thank you for playing", then back to the Carrier.
- **Settings:** Music volume, SFX volume, **Beacon volume**, **Beacon chirps** (Always / When I call / Off), **Ear guide** (When it helps by default, Always out, or Only when I listen), Mute, Vibration, Gentle Mode, **Always show beacon ripples** (off by default), **Easier beacon pitch** (off by default; plays voices above 5.5 kHz an octave lower), Screen shake (on/off), Text speed, and **Report a bug** (shown once published).
- **Credits:** "An idea by Rich Conlan", made with gamegen, font credits.

All menus, dialog and cards are DOM overlays, so they stay sharp and readable on phones and are pressable by mouse, touch, keys and pad (one focus model).

## Story and writing

- **Opening captions:**
  - "Every Saturday, the pet store sells crickets by the cup."
  - "This cup was for Duchess."
  - "Pip had other plans."
- **Almost everyone talks.** Geckos, crickets, Not-Crickets, recruits and Sir Bartholomew all have lines; the shared design shows a sample line for each.
- **Each gecko** gets 3 short lines before its fight (menace, mixed with manners) and 2 after (good sport). Dialog shows the speaker's portrait.
- **Each rescued cricket** gets a one-line thank-you and one line in the Carrier that changes as the Carrier grows.
- **Not-Crickets:** each gets a 4-line gag scene.
- **The kid** is never shown face-on: hands, a sleeve, sneakers.
- **Ending panels:**
  1. Nana asleep, crickets singing;
  2. the kid finds the Carrier full of crickets and a trail of crumbs;
  3. the kid gives the geckos fruit-mix gecko food ("crested-gecko diet", which is real), and Lashes approves;
  4. the Carrier, now a cricket town, set on the sunny windowsill by the open garden window. The crickets choose to stay, singing.
- **Tone:** gentle humor, no cruelty, no gore. Nobody gets eaten on screen. The closest call is the opening tongs.
- **Writing bible:** before the zones are built, all text lives in `game/data/text.js`: names, personalities, every line.

## Juice

- **Must-have:**
  - squash and stretch on every hop and landing;
  - dust puffs (watercolor blots) on landing and wall-jumps;
  - a chirp ring: a wavering watercolor ripple from the cricket, plus a small screen pulse;
  - **beacon ripples** at the screen edge (while listening and after a call);
  - a hit-pause of 60 ms and a white flash on taking a hit;
  - screen shake on ground-pound and on Big Tok's bellow (toggleable);
  - the boss tell: a tail wiggle, its rattle-swish, and a small "!" ink splat (1.5× bigger on touch screens);
  - a confetti of watercolor petals and a chord of cricket chirps on every rescue;
  - room transitions as an ink-wash wipe;
  - item pickup: a freeze, a spotlight, a name card, and a jingle.
- **Should-have:**
  - antennae and cerci drawn in code, swaying with movement;
  - near-layer silhouettes with parallax;
  - light motes in sunbeams;
  - steam and dust particles;
  - the Carrier's residents bob and chirp;
  - number pop-ups for crumbs;
  - rumble.
- **Nice:** paper-grain overlay shimmer; gecko eyes that track Pip; footprints in flour (Pantry).

## Art direction

- **Style line** (pasted into every image prompt): *"soft storybook watercolor illustration, visible cold-press paper grain, loose wet-on-wet washes with gentle color bleeding at the edges, fine sepia ink linework on characters, warm household lighting, muted cozy palette, no text"*
- **Sprite line** (characters, enemies and props): *"strict side profile facing right, bold sepia outline, simplified shapes, readable at 64 px, antennae and cerci omitted, isolated on a transparent background"*.
- **Style anchor:** **Pip** in **strict side profile, facing right**, painted for game scale, with **antennae and cerci left off** (they're code-drawn lines, so they never double up). Made first; the shared design's mockup doubles as it.
- **Character mockups with antennae (request 2):** every cricket has a full character picture with painted antennae and cerci, in `design/mockups/crickets/`. These are each cricket's official look: portraits, the Crickets tab, the Carrier and the story panels use them directly. In-game sprites are made from them as antenna-less `--image` edits ("same cricket, antennae and cerci removed"), so the code-drawn antennae can sway. The code antennae copy each picture's length, color and bands: Hump's extra-long ones, Rin's white band, Digby's short stubs. The species list lives in the mockups; RESEARCH.md backs it.
- **Antenna anchors, per frame:** `anchors[anim][frame] = {head, tail}` in `data/sprites.js`, for every frame and pose of every cricket. `tools/find-anchors.py` (Pillow) finds them from the silhouette (front-top of the head, tip of the abdomen); any can be set by hand. A frame with painted antennae or cerci is rejected: small strokes are erased with Pillow, anything bigger is re-rolled.
- **Reference chain** (so imagegen2 characters and nanogen scenes match):
  1. Pip anchor (imagegen2) →
  2. Bedroom far painting (nanogen, Pip anchor as reference) = the **scene anchor** →
  3. every other scene gets the scene anchor plus the Pip anchor →
  4. story, title and ending panels get the Pip anchor, Carrier stage 3 and the idles of the geckos they show (Duchess for the opening; Duchess, Big Tok and Lashes for ending panel 3).
  - Every character gets the Pip anchor; the other nine geckos also get Duchess's idle.
  - **Prompt order for other crickets:** species anatomy first (body shape, legs, wings, colors from RESEARCH.md), then *"match the painting style and ink line of the reference, NOT its body shape"*. If one still comes back as a recolored Pip, generate it without the reference, then do one style pass with it. Every cricket's silhouette is checked at 64 px against Pip's.
- **Camera:** side view, 2D platformer.
- **Logical resolution:** 1280×720, with 40 px tiles (32×18 per screen). The camera follows Pip with look-ahead. On phones (touch, short side under 500 CSS px) the camera zooms 1.15× in rooms (not boss arenas); level design keeps hazards from entering through the outer 7.5% of the view without a warning.
- **Sizes:**
  - Crickets: one **128×80 sprite drawn at 2×**, shown at 64×40 (species scale in code: Duo 1.2×, Mote 0.7×).
  - **Duchess's animation** (issue #26, reviewed). First, the rig bug: every gecko's sleep and strike art had silently stopped drawing (their meta named .png after the WebP switch); fixed, with a build check, so all fights show their real lunges and dozes again. Then, generated with anim8gen from her painted body on its 1520x557 canvas, **without her tail** (the code tail attaches at each frame's pivot, so the wiggle tell stays code-drawn and readable), **facing left** like the art (code flips her), registered to idle.webp's floor, nose and eye, "no prey visible, mouth closed" in every prompt, built at about 2x her drawn size (~800 px wide) through art/ and build-art.py, brightness-matched like the crickets: **run** (6 frames, a low belly-to-sand scramble), **pounce** (4 poses chosen by state: crouch, held for the whole tell; launch; airborne; land with jaws closing), **wake** (2: head jerks up, eyes snap wide), **tongue** (3: a flick that is her sniff at the log and her lip-lick after a catch). Sleep stays sleep.webp (with code breathing, a tail curl and an eyelid blink as she stirs); strike.webp is her snap at the log. Used in the tank and wherever her Bedroom fight shows these motions; other geckos keep their rigs. The gulp is never drawn (black screen and sound).
  - **Geckos are sized by length:** at most about 1.1 screen widths (1400 px) nose to tail tip, so about 300–420 px tall. Generated at 1536×1024, which gives about 1× sharpness at that size; soft watercolor hides it (2× gecko art is in the $35 option). **Nana and Big Tok** rear up or cling to a wall in a 1024×1536 portrait frame, standing up to about 600 px tall. Each gecko's frame (wide or tall) and on-screen length are in `data/geckos.js`; arenas are laid out around them.
- **Platforms and walls** are **drawn in code** from the room's tile grid. Each solid shape gets a wobbly-edged path filled with that zone's texture and a darker wet edge, with a paper-grain overlay on top. **Textures are remapped** to a gradient between the zone's two darkest palette colors, so platforms are always the darkest values and never blend into the background.
- **Breakable and soft terrain** (cereal wall, plaster, crumbling floor, soil and sand, syrup) is drawn by the same code painter, so it matches the platforms. Its fill comes from one low sheet of 6 seamless swatches; code adds edges by kind: cracks (plaster, crumbling floor), speckle (soil, sand), a glossy rim (syrup), knobbly bumps (cereal). True objects (piano keys, faucets, hooks, dice, spools) stay sprites.
- **Water** (sink, bath, washer flood) is code-drawn: a wobbly band in the zone's blue, a lighter wet edge on top, and moving ripple lines.
- **Backgrounds:** per zone, from nanogen:
  - **two far-painting variants** (the second a nanogen edit of the first: a different wall, window or shelf), assigned per room and mirrored or offset in code, so no single painting repeats across a whole zone;
  - prompts ask for **light values, low contrast, and "no horizontal surfaces in the lower two-thirds"**, so nothing reads as a platform;
  - **linking spaces:** the Hall uses the Bedroom's paintings and palette, the stairwell the Study's; the chimney shaft gets its own palette and one tall far painting, tiled vertically;
  - a **near layer** built in code: the zone's own prop sprites scaled 3–5×, filled with the zone's darkest color at 50–70% and blurred once (cached), drawn with parallax. No generation, no chroma fringes.
  - Painting size is measured on the first generation; the game scales whatever nanogen returns for "2K, 16:9" to cover 1280×720 at 2×.
- **Animation quality comes first** (request 5):
  - Pip's loops are idle, run, jump, kick, chirp, **hide** (tucking in) and **peek**.
  - Every loop is reviewed frame by frame on a contact sheet and in motion in the game, and re-rolled until it reads clearly at 64 px.
  - The measured prices (about half the estimates) pay for up to 3 re-rolls per loop.
  - Squash, stretch and the code-drawn antennae are tuned per cricket.
- **Characters:** imagegen2 with transparent backgrounds and the Pip anchor as reference.
  - Pip: anim8gen loops (idle, run, jump, kick, chirp), plus **one pose sheet** (an `--image` edit of the anchor, 1536×1024) with cling, hang, glide, listen and pound, cut apart with Pillow.
  - The other ten crickets: an idle, plus **one pose sheet each** (an edit with its idle and Pip's sheet as references): run-A, run-B, leap, cling, hang, glide, pound, listen. Everything else is code motion on these: the 2-frame run cycle, bob, squash and stretch, wall-run (run rotated up the wall), dash (run-B stretched, with speed lines), shove (run-A leaning), Hump's crouch (idle squashed), Digby's dig (pound plus soil particles). The dryer sheet is its own item sprite drawn above any gliding cricket.
- **Geckos** (`tools/split-gecko.py`):
  1. **Idle** with the **tail held straight out behind**.
  2. Cut the **tail** off the idle at `tailBox` first, and cut the **legs** into pieces with pivots. All of this is recorded in `data/geckos.js`.
  3. **Strike** (mouth open, lunging) and **asleep** are `--image` edits of the **tailless body**, prompted "no tail; the body ends at the tail base". Anything past the cut line is trimmed, then each is aligned to the idle body with Pillow.
  4. In code: the tail is **one strip bent along a spline**, drawn as 4 px column slices (each `drawImage`d along the curve with 1 px overlap), never rigid segments, so it bends without gaps or a double tail. It wiggles at the tip; asleep, it's drawn curled. Legs swing in a 2-beat walk on their pivots. Breathing is a slow scale; the eyes get a code-drawn glint.
  - **Kite** gets one extra edit: gliding with skin flaps spread.
- **Portraits:** cropped from the source images (crickets, Not-Crickets, recruits, geckos). `tools/make-portraits.py` draws the crickets' antennae and cerci on as sepia ink lines from the anchors. No extra generations.
- **Palettes** (in `data/zones.js` and in each zone's prompts; also used for the code-drawn wet edges and texture remaps). Every zone shares paper white #F4EBDD and sepia ink #5A4632.

| Zone | Hex |
|---|---|
| 0 Tank | #E3A857 #8FB8B0 #D9C29A #2E3550 |
| 1 Bedroom (and Hall) | #3B4A7A #F2C46D #C8564B #7C98C4 |
| 2 Bathroom | #8CC9C4 #E9F1EE #A9B8C2 #4F7F86 |
| 3 Kitchen | #F1D27A #C27A45 #D0614A #8EA67A |
| 4 Pantry | #C9A57A #D99A3E #EFE6D5 #7A5636 |
| 5 Laundry | #B7A6D3 #C9C3CC #A9C8E0 #6F7487 |
| 6 Living room | #D48A8A #8C8F55 #E8964A #6E4A5E |
| 7 Study (and stairwell) | #A07850 #4E7A55 #E7D7B5 #8A3B32 |
| 8 Sunroom | #9CC97A #5E9A52 #DDEBE3 #C77B56 |
| 9 Basement | #4F5B6E #E07A3A #B9BDC4 #26303D |
| 10 Attic | #9C7E6E #C9D6E8 #6B5240 #4D6E70 |
| Chimney | #A0523D #E0873A #B9C6D6 #3A2F2A |

## Audio direction

- **Music** (audiogen, instrumental, prompt and length only; looped in the game). Small chamber instruments (felt piano, harp, pizzicato strings, clarinet, soft brushes), so it feels like a storybook. Each prompt names a tempo and key, and asks for **melodies in the low and middle register, below about 2 kHz**. No glockenspiel, piccolo or whistling in zone tracks: they sit where the chirps are.

  | Track | Length | Mood |
  |---|---|---|
  | Title | 60 s | music-box lullaby (also plays, slowed, under the opening) |
  | Carrier | 90 s | cozy, warm acoustic, 72 BPM |
  | Boss | 60 s | playful-ominous bassoon and timpani |
  | Finale bed | 45 s | beatless, rubato, sustained low strings and harp, D major |
  | Zone 1 Bedroom | 60 s | dreamy felt piano and harp, low register |
  | Zone 2 Bathroom | 60 s | echoey harp |
  | Zone 3 Kitchen | 60 s | bouncy bassoon |
  | Zone 4 Pantry | 60 s | woody marimba, low register |
  | Zone 5 Laundry | 60 s | gentle swing |
  | Zone 6 Living room | 60 s | jazzy upright bass |
  | Zone 7 Study | 60 s | thoughtful solo piano |
  | Zone 8 Sunroom | 60 s | alto flute and strings |
  | Zone 9 Basement | 60 s | low drones and drips |
  | Zone 10 Attic | 60 s | slow felt-piano lullaby echoing the title's mood (its own track; audiogen can't vary a melody) |

  - **Playback:** looping `AudioBuffer`s, never `<audio>` elements (they can fail on iPhones when served from the offline cache). At most **3 music buffers are decoded at once**: the current zone's track, the Carrier and the boss track (the title track on the title and opening). Others are released on leaving a zone. On decode, the last 1.5 s are crossfaded into the start so the loop is seamless.
  - **The Carrier grows in sound** without stems: one track, and each rescued cricket's synthesized song is scheduled on the track's beat (72 BPM, set in the prompt and checked once by ear), one voice per rescue, plus Peeper's peeps once the pond exists. These layers are decoration, so they may follow the music buffer's AudioContext time.
  - **The finale's rhythm comes from the game clock:** the fixed-step game time drives the chorus rings and judges presses. The synthesized chirps and a soft brush beat are scheduled from it with a short lookahead (100 ms), which stops while the game is frozen or paused. The audiogen bed has no beat, so nothing can drift. **Gameplay never reads AudioContext time.**
  - **Keeping chirps clear:** a peaking cut on the music bus (−6 dB, Q 1.5) at the pitch of the zone's beacon voice, set per zone. While Listen is held, music ducks by 12 dB. No other ducking and no always-on low-pass.
- **Cricket chirps: synthesized in WebAudio** from `RESEARCH.md`, one voice per species:
  - **House cricket:** 4.8 kHz sine with a −20 dB 2nd harmonic; 2–3 pulses of 18 ms (2 ms attack, 4 ms decay) at a 45 ms period; chirps every 0.5–1.2 s.
  - **Banded cricket:** 6 kHz, faster chirps.
  - **Two-spotted cricket:** 4.6 kHz, 4–5 pulses, 3–4 chirps a second.
  - **Snowy tree cricket:** 3 kHz steady treet.
  - **Katydid:** 3 kHz rasp, 3 pulses in a "ka-ty-did" grouping.
  - **Mole cricket:** a 2.5 kHz droning trill.
  - **Ground cricket:** a 7.5 kHz faint trill.
  - **Bell cricket:** about 4 kHz with a ringing decay of about 300 ms.
  - Each individual is ±1.5% in pitch.
  - Chirp rate follows the local "temperature" (the Kitchen and the Laundry are warm, so their chirps are faster; the Basement is cold and slow; thermostat-lock rooms have a gradient). Frost's chirp rate follows Dolbear's law exactly.
  - Hump's foot-tap and case-tap: a short synthesized wooden knock.
- **Decoys synthesized in `chirps.js`** (their rhythm is the puzzle, so it must be exact): the smoke alarm (one short high piezo beep, about 3 kHz), Peeper (a clear rising peep, once a second), and Chikchak (a run of 6–9 "chik" clicks). Soot's swift chitter and Velvet's bat squeaks come from audiogen.
- **Beacon options** (from request 6):
  - **The ear guide** (issue #10, replacing the always-out ear of issue #3): the ear **rests** as a button beside mute/map/pause and **comes out** to the screen edge only when it helps. Following by ear stays the main skill; the ear is a helper.
    - **One direction everywhere:** the ear and the Listen arrow show the same thing, the way to walk (below). While Listening, the ear *is* the arrow: it comes out at the edge and the old straight-at-the-cricket arrow is gone.
    - **It comes out:** while Listening (hold B / Ear); for 4 s after your Chirp's answer arrives (from the answer, not the call); and when you seem lost: 60 s of in-control play (not paused, in a dialog, card, story panel or art hold) without getting closer, where closer means the path distance beats its best by a tile. Lost-out stays until the path distance drops a screen's width (1280 px) below where it was when it came out. The first time it ever comes out, a toast says "The ear points the way to go. Tap it to keep it out." Coming out for being lost gives it a short "this way" pulse and a soft cue.
    - **Where it points:** the way to walk. It aims at the next doorway on the path; once you pass through that doorway (enter the next room), it aims at the next one. Twin doorway nodes (the same opening seen from both rooms) count as one, and an interior door is aimed at itself, never at where it leads. A switch only reverses if you go back through the doorway. When the doorway it aims at is on screen, the doorway gets a small pulsing glint, so the ear reads as "go there". Turning is smoothed (at most a half-turn a second, the short way round, keeping its turn direction on an exact half-turn) and snaps without turning when it comes out, on a room change, and after a rewind; on a room change it fades out and back in.
    - **Pulse:** when out, it still pulses with each chirp and grows as the path distance shrinks; resting, the button gives a small pulse with each chirp.
    - **Where it exists at all:** only where there's a cricket to follow now: not in the Carrier, the Tank (zone 0), a zone already rescued, an unreachable target, or during a gecko fight. There the button is hidden too.
    - **Setting "Ear guide":** When it helps (default) / Always out / Only when I listen. With Beacon chirps Off, When it helps counts as Always out (Off is the no-sound path, so the ear stays out). Old saves move to When it helps, whatever they had.
    - **Clicks** (decided from the ear's state at the press): the resting ear pins it out (Always out); a pinned ear rests it (When it helps); an ear that came out on its own is dismissed until its next reason (the lost timer starts over). Clicks while Listening are ignored. A toast names the result ("Ear guide: pinned out. Double-click: the cricket sings only when you call."). Double-click or double-tap either form still switches Beacon chirps between Always and When I call (Off goes to Always); the ear is struck through while it isn't Always (issue #3).
    - **Pure display:** the ear's state (mode, reason, lost timer, best distance, smoothed angle) lives outside the game state, so replays, saves and rewind are untouched.
    - The full ripples and rhythm strip stay a Listen feature (or always on, with "Always show beacon ripples").
  - **Beacon chirps** setting:
    - **Always** (default): the trapped cricket sings on its own.
    - **When I call:** it chirps only in answer to your Chirp.
    - **Off:** silent; the ear guide stays out (When it helps counts as Always out).
  - **Beacon volume:** its own slider, apart from music and effects.
  - Your own **Chirp button** (C/K, △, touch Chirp) always works and always gets an answer.
- **The beacon:**
  - **Target:** until the zone's item is picked up, the call comes from a **sound hole** beside the item (a vent, pipe, drain or crack the trapped cricket's call carries through, drawn as a little ringed hole). Each hole sits on something it could go through: a wall, the floor or shelf it opens from at Pip's height, a vent hose's mouth; never on a curtain, a window or in mid-air (the Bedroom's is the heating vent in the wall of the shaft behind the desk). One drawing per hole (the B marker; no second decor copy), and the hole the call is coming through right now swells and glows a little with each chirp. The first time a save slot has a sound hole on screen, a tip says what it is ("A sound hole! Your friend's call comes through here. Get close and hold Listen.", once per slot, `meta.flags.holeTold`). After pickup it retargets to the lair. **Zone 5:** before the Glider, the alarm's beeps and Hump's taps come through the **dryer vent beside the Glider**; after, the target is the alarm in Peridot's arena.
  - **Loudness:** by path distance (rooms, then inside the room), from 0 dB at the target down to a **floor of −24 dB** at the zone's far side (its farthest room corner by path). Never silent. Where a zone's far rooms lie past the target, so the far side would squeeze the whole route into the loud end, the zone sets a span margin for that phase (`beaconSpan`): the beacon then falls from 0 to **−20 dB** over the margin times the path distance from the farthest place a player comes in (an opening or door from another zone, the zone's start spot, and in the lair phase the item's spot), and goes on falling from −20 to −24 dB out to the zone's far side, so rooms past the span still get warmer and colder. The Sunroom's sound-hole phase uses 1.15 (the bench floor and the Glass Corner are the long way back round by the canopy): the French Doors start near −17 dB, each room on the way is ~3 dB warmer, and the Glass Corner and the High Canopy run −22 to −24 dB.
  - **Far vs near:** far sounds get more reverb (a short generated room impulse) and a low-pass that closes only to **1.25× the voice's own pitch**, so it softens the harmonic and never mutes the call. Stereo pans toward the next exit on the path.
  - **Listen:** raises the beacon by 6 dB, ducks the music, and shows the arrow, rhythm strip and ripples.
  - **Chirp to call:** the trapped cricket answers one beat (in game time) later with a rivalry-song burst, so you can test "am I closer?". Ripples show for 4 s.
  - **Visual double:** the ripples and rhythm strip, so players with the sound off can still follow it. "Always show beacon ripples" keeps them on.
  - The real chirp rate is kept at every distance (it carries the temperature, which Frost's perk reads).
- **Sound effects.** audiogen makes 22; code makes the rest.
  - **The opening chase (issue #25), audiogen:** a **chase cue** (music, 30 s loop, instrumental, ~132 BPM in the title lullaby's key: driving pizzicato strings, low clarinet stabs, soft timpani; starts at full energy, no intro; warm-loaded on entering the tank's sand room), **gecko-skitter** (a 2 s loop of lizard feet on sand, rate tied to her speed), **pounce-land** (~0.7 s soft heavy thump into sand with a grainy hiss), **gulp** (~0.8 s cartoon gulp, wet but not gross, with a contented "mm"), **relief-sting** (~3 s harp and music box resolving in the title's key). Reused: gecko-growl (wake), gecko-chomp (jaws on bark), gecko-snore (the nap, re-checked for level), the code's air whoosh (the leap), the tell's rattle-swish.
  - **audiogen (22):** hop, land, tape-stick (wall-cling), kick, bonk-and-scurry (enemy flip), hurt, raft splash, rubber-band twang (also Hump's leap, pitched down), ground-pound thud, dig scrape (also Duo's shove, pitched), faucet squeak and gush, fruit splat, gecko lick, pillow bonk / cushion boing, jaw chomp-stuck, Big Tok's bellow, gecko growl (Nana; Ember's hiss pitched up), gecko snore, swift chitter, bat squeaks, squeaky toy, hinge creak (also the dryer squeak, pitched).
  - **Synthesized in code:** every chirp, the three decoys, Hump's tap, **the gecko tell's rattle-swish** (filtered noise with a 12 Hz flutter, panned to the gecko, same for every gecko), Nana's tail sweep (a longer swish), air whoosh (swing and glide), steam burst and misters, the flood-current and rain loops, dash and wall-run swish (noise sweeps), the rescue chord (from chirps), glow flash shimmer, stink puff, buzz loop (mosquito, wasp, fruit flies), the vacuum and furnace roars, dryer and fridge hums (filtered noise), piano keys, crumb ping, save-crack chime, swap puff, item-fail thunk, door and ledge unlock (a knock plus a music-box arpeggio), dialog blip, menu move and select, map and pause open, the item jingle, and the upgrade and zone-complete stings.

## Enemies

There are two kinds, and every one has a mock picture (`design/mockups/enemies/`).

**Bonkable critters** (16 types). They're non-lethal: kicked or stunned, they flip over, scurry off and come back later. Rin's Lullaby and the Chirp stat apply to these, not to geckos.

| Enemy | Zones | Behavior | How to deal with it |
|---|---|---|---|
| Ant (worker) | 1, 4 | patrols a platform | kick, or hop over |
| Dust mite cluster | 1 | drifts slowly | chirp scatters it |
| Silverfish | 2, 7 | darts fast along floors | jump timing |
| Mosquito | 2, 8 | hovers, then dives at you | kick |
| Cockroach | 3 | runs, flies when startled | stun first |
| Fruit fly swarm | 3, 4 | a cloud that blocks the path | chirp |
| Weevil | 4 | rolls grains of rice | jump |
| Ant soldier | 4, 10 | charges after a wind-up | dodge, then kick it from behind |
| Clothes moth | 5, 10 | flies to light, swoops | lure it away with the Glow Bead |
| Earwig | 5 | its pincers block a corridor | kick its tail end |
| Dust bunny | 6 | rolls downhill, grows | ground-pound it apart |
| Stink bug | 6 | leaves a stink cloud | wait for it to fade |
| Booklouse | 7 | nibbles shelves, crowds narrow gaps | chirp |
| Wolf spider | 7, 9 | watches, then pounces | chirp-stun, or hide |
| Wasp | 8, 10 | hovers, then dives along a line | dodge |
| Aphid herd | 8 | harmless; bouncy to land on | use them as springs |
| House centipede | 9 | very fast along walls | Glow flash |
| Cellar spider | 9 | drops on silk | time it |

(The friendly characters are the exceptions: Page is the one silverfish who reads instead of nibbles, Sgt. Crumb is an ant who quit, Weft is a jumping spider, and Lumen is a big fuzzy moth, not a clothes moth.)

**Unbeatable: hide and let them pass.** Kicks and chirps do nothing to these. You tuck into a hiding spot and wait (see Hide).

| Hazard | Zones | Behavior |
|---|---|---|
| **Darkling beetles** ("the mealworms grew up": mealworms, the *other* gecko food, are darkling beetle larvae) | 3, 4, 9, 10 | plod along a fixed route, bump you away on contact (1 heart), oblivious to everything |
| **The robot vacuum** | 6 (and the Hall) | sweeps a looping route through the Living Room; loud (a loud zone: Earplugs help); sucks you back to the room's checkpoint if it catches you |

## Asset list

**Models, pinned:**
- **imagegen2:** cheap work runs with `IMAGEGEN2_MODEL=gpt-image-2.5-flare` set in the environment of that one command (for example `IMAGEGEN2_MODEL=gpt-image-2.5-flare node …`); the person's `.env` is never edited. This model is about 4× cheaper and has native transparency. anim8gen takes no `--model`, so the variable is how its frames get the cheap model. Low sheets, anim8gen frames, cricket pose sheets and gecko sleep edits use it. **Medium character art passes `--model gpt-image-2.6-flare`**: the anchor, idles, Pip's pose sheet, Not-Crickets, gecko idles and strikes.
- **nanogen:** `--model gemini-3.1-flash-image` (listed at $0.034 at 1K and $0.05 at 2K; deprecated but still served). If it's withdrawn, use `gemini-nano-banana-2.1 --thinking minimal` (no thinking tokens) and measure the first call.

**Prices used** (estimates, rounded up; imagegen2 reports token usage, not prices, so the first call of each model is converted to dollars and checked against these):
- 2.6 Flare: medium $0.08 at 1024² ($0.09 with a reference), $0.13 at 1536×1024 with a reference;
- 2.5 Flare: low $0.02 with a reference; medium $0.045 at 1536×1024 with a reference (a quarter of the 2.6 output price, plus the reference input);
- nanogen 3.1 Flash: $0.05 at 2K;
- audiogen: music $0.30 a minute, sound effects $0.12 each.

**Tries:** every medium character image is budgeted at **1.5 tries** (rounded up). anim8gen is budgeted at 10 images per animation. Low sheets get 10 spare sheets in all.

**Quality rule:** 2.6 medium for the Pip anchor, the cricket idles, Pip's pose sheet, the Not-Crickets and the gecko idles and strikes. 2.5 Flare for everything at 64 px or smaller on screen, and for gecko sleep poses. Low sheets hold 4 objects per 1024² image, then are downscaled. imagegen2 has no 512² size, so everything is made at 1024² or larger and downscaled.

Mockups (marked M) are made first, for the shared design, and reused.

| ID | What it is | Tool | Size and format | Transparent | Animation | Priority |
|---|---|---|---|---|---|---|
| pip-anchor (M) | Pip, style anchor: strict profile facing right, no antennae or cerci | imagegen2 2.6 medium | 1024² → 128×80 sprite | yes | — | must |
| pip-{idle, run, jump, kick, chirp} | Pip animations | anim8gen (2.5 Flare low) | 2–4 frames each, 128×80 | yes | yes | must (idle, run, jump); should (kick, chirp) |
| pip-poses | Pip pose sheet: cling, hang, glide, listen, pound | imagegen2 2.6 medium, `--image` anchor | 1536×1024 → 128×80 each | yes | code | must |
| cricket-{stripe, katy, duo, frost, hump, jam, rin, digby, mote, chip} | rescued crickets, idle | imagegen2 2.6 medium (anchor ref) | 1024² → 128×80 | yes | code | must |
| cricket-×-poses | one sheet each: run-A, run-B, leap, cling, hang, glide, pound, listen | imagegen2 2.5 Flare medium, `--image` idle + Pip's sheet | 1536×1024 → 128×80 each | yes | code | must |
| gecko-duchess-idle (M) | leopard gecko, tail straight out | imagegen2 2.6 medium (anchor ref) | 1536×1024 → body, tail strip, legs | yes | code tail and legs | must |
| gecko-{the other 9}-idle | the other nine geckos (Nana, Big Tok in the tall frame) | imagegen2 2.6 medium (Duchess + anchor ref) | 1536×1024, or 1024×1536 | yes | code tail and legs | must |
| gecko-×-strike, gecko-kite-glide | 10 strikes + Kite's glide, edits of the tailless body | imagegen2 2.6 medium, `--image`, Pillow-aligned | same frame as the idle | yes | — | must |
| gecko-×-sleep | 10 sleep poses, edits of the tailless body | imagegen2 2.5 Flare medium | same frame as the idle | yes | code tail curled | should |
| notcricket-{peeper, soot, velvet, beep} | the Not-Crickets | imagegen2 2.6 medium | 1024² | yes | code | must |
| recruit-{rolo, page, lumen, dot, weft, crumb, glim, shelly} | recruits: one image each, sprite and portrait | imagegen2 2.5 Flare low, 2 sheets of 4 | 1024² sheet → about 96 px | yes | code | must |
| enemy-× 16 | enemies | 2.5 Flare low, 4 sheets of 4 | 1024² sheet → 64–96 px | yes | code | must (12), should (2), extra (2) |
| item-× 9 + crumb, seed-heart, song-seed, save-crack | items and pickups | 2.5 Flare low, 4 sheets | 1024² sheet → 64 px | yes | — | must |
| tank-props | tongs, feeder cup, hide log, fake plant, water dish, pebble, mesh lid | 2.5 Flare low, 2 sheets (7 objects) | 1024² sheet | yes | code | must |
| prop-× about 35 | boss and hazard props: Duchess's cup with 3 tabs; 3 faucet handles, soap dish; cork, wooden spoon, sponge, spice rack; grape, jam, banana slice; light pull-chain, dryer vent; throw pillow, cushion, TV remote; bamboo cage; Kite's leaf; furnace grate; tuning fork, glass, bell; steam vent, piano keys, vacuum, mister nozzle, hooks, pins, drawer pulls, dice, spool, heavy crumb, thermostat, sound hole, battery, dryer sheet | 2.5 Flare low, 9 sheets | 1024² sheet | yes | code | must |
| terrain-swatches | 6 seamless fills: cereal, plaster, crumbling floor, soil, sand, syrup | 2.5 Flare low, 1 sheet, made seamless with Pillow | 1024² sheet → 256² tiles | no | — | must |
| carrier-obj-× 22 | the 10 cricket objects and 12 facilities (Arrivals table) | 2.5 Flare low, 6 sheets | 1024² sheet | yes | code | must |
| ui-sheet × 2 | touch-button blots, panel frames, map cell washes | 2.5 Flare low | 1024² | yes | — | should (code fallback) |
| bg-{zone}-far-{a,b} + bg-tank + bg-chimney (M = bedroom-a, the scene anchor) | far paintings, 2 per zone; the chimney's tiles vertically | nanogen 3.1 Flash 2K (b is an edit of a) | measured; about 16:9 (chimney 9:16) → WebP; 1920×1080 copy for phones | no | — | must (a), should (b) |
| tex-{zone} × 10 (+ chimney) | seamless platform textures, remapped to the two darkest palette colors | cut from the zone's far painting with Pillow | 512² tile | no | — | must |
| carrier-stage-{0..3} (M = stage 3) | the Carrier shell at 4 stages, with empty slots (0–2 are edits of 3) | nanogen 3.1 Flash 2K | about 16:9 | no | — | must |
| story-open-1..4 (M = panel 3) | opening panels (3 before the escape, the cup tipping after) | nanogen 3.1 Flash 2K | about 16:9 | no | — | must |
| story-end-1..4 | ending panels | nanogen 3.1 Flash 2K | about 16:9 | no | — | must |
| title-art (M) | title key art | nanogen 3.1 Flash 2K | about 16:9 | no | — | must |
| near layer | blurred, tinted prop silhouettes | code | — | — | parallax | should |
| portraits | crickets (antennae drawn on), Not-Crickets, recruits, geckos | cropped from the source images (Pillow) | about 256² | yes | — | must |
| app-icon | favicon and app icons | Pillow, from the Pip anchor on a paper wash | 512² and smaller | no | — | must |
| social-card | 1200×630, screenshotted from the title screen | code | JPG | no | — | must |
| music × 14 | the tracks in Audio direction | audiogen music | 45–90 s MP3 | — | loop | must |
| sfx × 22 | the audiogen list in Audio direction | audiogen sfx | MP3 | — | — | must |
| synth sounds | chirps × 9 species, 3 decoys, tell, swishes, loops, UI, stings, hums | code (WebAudio) | — | — | — | must |
| fonts | a hand-lettered OFL font for headings (e.g. "Patrick Hand") and a clean one for text ("Nunito") | bundled | woff2 + OFL | — | — | must |

## Tech plan

**Layout:**
```
game/
  index.html  manifest.webmanifest  sw.js  icons…  fonts/
  src/
    main.js       boot, loop (60 Hz fixed step = the game clock), screen stack, freeze/step for tests
    input.js      keys, touch, gamepad → actions (edge-detected, buffered, ↓ cone, quick-tap safe)
    audio.js      music AudioBuffers (≤3 decoded, seamless loops), sfx, beacon, music-bus EQ,
                  scheduling from game time with lookahead
    chirps.js     species voices, the 3 decoys and the tell, from RESEARCH.md
    physics.js    AABB vs tile grid, one-way platforms, wall contact, forgiveness; reads data/movement.js;
                  no DOM, so node can run it
    player.js     movement state machine (ground, air, cling, swing, glide, raft, pound, crouch),
                  per-cricket stats, swap queued until grounded
    world.js      room loading, transitions, camera, save cracks, gates, per-zone asset load/release
    render.js     platform and terrain painter (cached per screen), water, near layer, parallax, particles
    geckos.js     tail spline strip, leg rig, breathing, eye glint
    enemies.js    the 16 behaviours, data-driven
    bosses/       one module per gecko: a phase state machine, fixed chirp radius and stun
    map.js        visited cells, markers, the dollhouse view
    hub.js        the Carrier, slots, arrivals, residents, facilities, stage changes, damper cutscene
    story.js      panels, dialog, cutscenes, the tank escape script
    ui.js         DOM HUD, menus, cards (one focus model for keys and pad), settings
    save.js       3 slots, versioned JSON, migration, corrupt-save guard
  data/
    rooms/zone-00.js … zone-10.js, links.js   rooms as ASCII grids plus entity lists and dynamic edges
    movement.js   the movement table and forgiveness values
    reach.js      generated reach envelopes per Speed/Jump (tools/gen-reach.mjs)
    sprites.js    sprite sizes, anchors[anim][frame] = {head, tail}
    geckos.js     frame (wide/tall), on-screen length, tailBox, tail pivot, leg boxes and pivots
    text.js       every line of text
    zones.js      palettes (hex), music, temperatures, beacon voices and sound holes, decoys,
                  the prerequisite graph and each zone's minimum item sets
  assets/ (per asset-guide)
tools/
  gen-reach.mjs     runs physics.js headless per stat and move; writes data/reach.js; fails if it
                    misses the movement table by more than 0.25 tile
  check-world.mjs   reachability and gate check (below)
  replay.mjs        frame-locked replay of recorded solutions in the browser
  split-gecko.py    cuts tail and legs from the idle, trims and aligns strike and sleep to the body
  find-anchors.py   finds head and tail anchors per frame; flags painted antennae
  make-textures.py  cuts, tiles and luminance-remaps each zone's texture and the terrain swatches
  make-portraits.py crops portraits and draws cricket antennae on
design/solutions/   opening.json, feel.json, zone-NN-path[-variant].json, zone-NN-boss.json
```

- **Rooms:** each room is an ASCII grid (32×18 per screen, any multiple), plus lists of entities, exits, soft checkpoints, secrets and **dynamic edges** (steam vents, updrafts, currents, raft routes, cushions, crumbling floors, syrup, piano keys), each with its condition.
- **World check** (`tools/check-world.mjs`, node):
  - builds a graph of standing spots; edges are moves from `data/reach.js` plus the rooms' dynamic edges;
  - searches over **states** (items held, crickets rescued) from New Game through the prerequisite graph, so **every valid order** is checked (Pantry or Laundry first; Living Room by Rubber Band or by Glider);
  - **weakest pass:** Jump 2 / Speed 2, no perks, every reach shrunk by 0.5 tile. Each zone's item, lair door and main path must be reachable with that zone's minimum item set;
  - **strongest pass:** every cricket obtainable in that state, all perks, reach grown by 0.5 tile, and swaps at any standing spot. No gate may open before its item or rescue (including the Attic damper before nine rescues);
  - also proves no gate needs a later item and every spot can get back to a save crack.
  - Boss arenas are not in check-world; boss replays cover them.
- **Phones and memory:**
  - Platform painting is cached **per screen** at `min(devicePixelRatio, 2)`: at most 2560×1440 (3.7 MP) per canvas, well under iOS's ~16.7 MP limit. A 3-screen room is three canvases.
  - Paintings, textures and gecko art load **per zone** and are released on leaving (current zone only; the next zone preloads at its exit). Phones get the 1920×1080 painting copies.
  - Music: at most 3 decoded buffers (about 75 MB at worst, stereo). SFX are short and decoded once.
- **Scaling:** 1280×720 letterboxed, backing store sized by devicePixelRatio, with safe-area insets. HUD, dialog and menus are DOM at screen resolution (minimum 14 CSS px). On phones, a 1.15× camera zoom in rooms.
- **Beacon distance:** room-graph shortest path (BFS over passable exits), plus distance inside the room.
- **Pausing:** pause on blur or when the page is hidden.
- **Audio:** starts on the first input; mute (M, or the speaker icon) is saved.
- **Saving:** in localStorage under `housecricket.v1.slotN`.
- **Offline:** a service worker with a versioned cache lets the game install as an app.
- **Randomness:** seeded per room, so replays are deterministic.
- **Debug hook** `window.__game` (reads state and sets up situations; never plays for you):
  - `state()`: screen, zone, room, position, health, items, trio, active cricket, queued swap, rescued, recruits, boss phase, `levelComplete` (this zone's cricket freed), `gameWon`, last input (`keyboard` | `touch` | `gamepad`) and pad id;
  - `frames()`: the log of screen changes (at most 200);
  - `levels()`: 10; `goToLevel(n, {items}?)`: start zone n at its first save crack with the rescues of the main path and, by default, the zone's minimum item set (zone 6 has two: with the Rubber Band or with the Glider);
  - `goToRoom(id, {items, party, rescued})`, `give(item)`, `rescue(id)`, `setBossPhase(n)`: set-up only;
  - `freeze()`, `step(frames)`, `unfreeze()`: advance fixed 60 Hz updates while frozen (audio scheduling stops too);
  - `audioState()`: context state, musicMuted, sfxMuted, current track, decoded music buffers, Listen duck on/off, music-bus cut frequency;
  - `beacon()`: target, pathDist, gain, cutoff, pan, reverb wet;
  - `renderChirp(species)`: renders one song through an OfflineAudioContext and returns the samples, for the play-test's FFT;
  - `buttons()`: canvas-drawn pressables only (the Carrier's facility prompts); every menu is DOM and is clicked directly.
- **Recorded solutions:** stored as `[frame, key, 'down'|'up']`. `tools/replay.mjs` calls `goToLevel`/`goToRoom`, freezes, and for each event steps to its frame and presses the real key with playwright-cli's `keyboard.down/up`. Each replays **twice**, and the two end states must match. The set:
  - the **opening**;
  - **feel**: a test room that checks coyote time, the jump buffer, wall-jump grace and the hook magnet at their limits;
  - each zone's **critical path** (first save crack → item → lair door) with its **minimum item set**; zone 6 twice (Rubber Band only, Glider only): 11 paths;
  - each **boss**, played with the weakest crickets available at that point (from zone 3 on, Duo or Digby at Speed 2 / Jump 2; Nana with Digby, Duo and Mote).

### Bug reports (`--feedback on`)
- **Component:** gh-feedback from gamegen's templates, copied to `game/vendor/gh-feedback.js`. It sits at the end of `<body>` as `<gh-feedback trigger="none">`, styled to the game: dark theme, nightlight-gold accent #E8B85A. It stays in link mode, so there's no server and no keys.
- **Button:** "Report a bug" in Pause and in Settings, in the game's own button style, usable by mouse, touch, keys and pad. Never a floating button. It's hidden until publishing fills in the repo.
- **Shortcut:** Ctrl+Shift+F works from anywhere, even when the game is stuck. `window.reportShortcut` pauses the game first. The How to Play card lists it.
- **While the form is open:** game input is ignored, and the press that closes the form does nothing else. The pause screenshot goes on the clipboard.
- **Each report includes:**
  - the zone and room;
  - Pip's position;
  - the trio and the cricket out front;
  - items, rescues, and the boss phase if in a fight;
  - last input and controller id;
  - play time and save slot;
  - recent console errors.
- **Issue template:** `.github/ISSUE_TEMPLATE/bug.yml`.

## Cut list

In order: cut the first item first. Savings in brackets.

1. Rebindable keys (not built); nice-to-have juice (gecko eye tracking, flour footprints, paper-grain shimmer) [$0].
2. The second far-painting variant per zone; mirror and offset the first in code instead [10 × $0.05 = $0.50].
3. Gecko sleep edits; draw closed eyes in code over the idle, lower the head with a code rotation, curl the code tail [$0.68].
4. Pip's kick and chirp animations; use the idle with code motion [2 × 10 × $0.02 = $0.40].
5. Carrier shell stages 1 and 2; keep stage 0 and stage 3, and let the 22 arrival objects carry the growth [2 × $0.05 = $0.10].
6. Two enemy types (the dust mite cluster, the cellar spider) [none: they share sheets].

Items 2–5 free $1.68.

**Price triggers** (checked on the first call of each model, before the bulk):
- 2.6 medium over $0.10 at 1024² with a reference: apply items 2 and 3 before generating gecko idles.
- 2.5 Flare low over $0.03 with a reference: apply item 4 before running anim8gen.
- nanogen 2K over $0.06: apply item 2 before the far paintings.

**Never cut:** any zone, any gecko, any rescued cricket, the cricket pose sheets, swapping, the beacon, the map, the items, the Carrier growing (shells or arrival objects), the recruits' painted art, the Not-Cricket cast, the playable tank escape, or gamepad support.

## Effort and cost estimate

A forecast, not a promise.

### Effort
- **World:** 10 zones, about 70 rooms, 9 items, the opening tank.
- **Characters:** 11 playable crickets, 10 geckos with 3-phase fights, 16 enemy types, 4 Not-Crickets, 8 recruits, 22 Carrier arrivals.
- **Art and sound:**
  - about 59 images on 2.6 medium, 119 on 2.5 Flare (50 animation frames, 15 pose sheets, 15 sleep edits, 39 low sheets), and 38 nanogen images;
  - Carrier: 4 shells and 22 objects; story: 8 panels;
  - animation: 5 loops and one pose sheet for Pip; one pose sheet per rescued cricket;
  - music: 14 tracks (14.25 minutes);
  - sound: 22 generated effects, plus synthesized chirps, decoys, the tell, UI and ambience.
- **Biggest and riskiest work:**
  - Level design for 70 rooms that are fun, gated correctly and backtrack well. The generated reach table, the state-search world check and the recorded solutions carry this.
  - Ten distinct boss fights.
  - Movement feel: wall-jump, floss swing, glide, super-jump, all on one Jump button.
  - Consistent gecko art across ten species (the tailless-edit pipeline, the spline tail and the leg rig).
  - The beacon feeling clear on phone speakers (tested with `beacon()` and on a real phone).

### Cost, against the $20 budget

**Measured on the mockups (2026-11-15):**
- imagegen2 2.6-flare medium came in at about $0.035–0.05 an image (1,132–1,449 output tokens), not the $0.08–0.13 assumed below.
- nanogen 3.1 flash 2K came in at $0.05 and returned 2752×1536.

So the lines below are on the cautious side; the real image spend should be roughly half. Whatever this frees goes first to the $35-option items, in this order:
1. 2048×1152 geckos
2. head close-up portraits
3. a two-frame run for each cricket
4. 90 s music

| Kind | Arithmetic | Cost |
|---|---|---|
| Mockups (shared design), reused as assets: **actual** | Pip anchor (2 takes), Duchess idle, Big Tok idle, Soot, Katy idle, Bedroom far-a, Carrier stage 3, title art, story-open-3 | $0.48 |
| Pip pose sheet (2.6 medium) | 2 × $0.13 | $0.26 |
| Pip animations (anim8gen, 2.5 Flare low) | 5 × 10 × $0.02 | $1.00 |
| Cricket idles: antenna-less edits of the character mockups (2.6 medium) | 10 × 1.5 = 15 × $0.05 | $0.75 |
| Cricket character mockups, with antennae: **actual** | 11 crickets + 1 retry (request 2) | $0.60 |
| Cricket pose sheets (2.5 Flare medium) | 10 × 1.5 = 15 × $0.045 | $0.68 |
| Not-Crickets (2.6 medium) | 4 × 1.5 = 6 × $0.09 | $0.54 |
| Other 9 gecko idles (2.6 medium) | 9 × 1.5 = 14 × $0.13 | $1.82 |
| Gecko strikes + Kite glide (2.6 medium) | 11 × 1.5 = 17 × $0.13 | $2.21 |
| Gecko sleeps (2.5 Flare medium) | 10 × 1.5 = 15 × $0.045 | $0.68 |
| Low sheets (2.5 Flare): enemies 4, recruits 2, items 4, tank props 2, props 9, terrain 1, Carrier objects 6, UI 2 = 30, + 9 spare | 39 × $0.02 | $0.78 |
| Far paintings (20 left after the mockup, + chimney) | 21 × $0.05 | $1.05 |
| Carrier shells 0–2 (edits) | 3 × $0.05 | $0.15 |
| Story panels (7 left after the mockup) | 7 × $0.05 | $0.35 |
| Textures, terrain edges, near layer, portraits, app icon | code and Pillow | $0.00 |
| Music | (60 + 90 + 60 + 45 + 10 × 60) s = 855 s = 14.25 min × $0.30 | $4.28 |
| Sound effects | 22 × $0.12 | $2.64 |
| **Planned spend** | images 11.72 + music 4.28 + sound 2.64 | **$18.64** |
| Reserve | 20.00 − 18.64 | $1.36 |
| **Total** | | **$20.00** |

- Images: 0.85 + 0.26 + 1.00 + 1.35 + 0.68 + 0.54 + 1.82 + 2.21 + 0.68 + 0.78 + 1.05 + 0.15 + 0.35 = $11.72.
- **What the reserve is for:** character retries are already inside the lines (1.5 tries). The $1.36 covers the rest: 6 painting re-rolls ($0.30), 2 music re-rolls of 60 s ($0.60) and 3 effect re-rolls ($0.36) = $1.26, plus $0.10 slack. Price surprises are met by the price triggers and cut-list items 2–5 ($1.68 more).
- **A $35 budget** would add: gecko art at 2048×1152 for full 2× sharpness (+$2.00), Pip's animation frames on 2.6 (+$0.75), portrait close-ups by edit for the 15 crickets and Not-Crickets (+$1.35), 90 s zone music (+$1.50), its own opening track (+$0.30), a third far painting per zone (+$0.50), 10 more generated effects (+$1.20), and a bigger reserve. That's about $26 planned plus $9 reserve, and it's the version we'd recommend if they're happy to spend it.

## Definition of done

- [ ] Starts with no errors at desktop (1280×720 and 1920×1080) and phone landscape (844×390, 667×375).
- [ ] The opening plays; the panels can be skipped; the 6-beat tank escape works and its recorded solution replays.
- [ ] `gen-reach` matches the movement table within 0.25 tile. `check-world` passes both passes over every valid route order. Every recorded solution (opening, feel, 11 critical paths with minimum item sets, 10 bosses with the weakest crickets) replays twice to the same end state.
- [ ] The feel replay shows coyote time (100 ms), the jump buffer (120 ms), wall-jump grace (100 ms) and the hook magnet (1 tile) working. Flutter, glide, variable height and Hump's crouch-leap each fire only from their own input.
- [ ] All ten gecko encounters are won by their replays. Losing restarts the current phase. Gentle Mode, checked with `setBossPhase`, halves hits and makes tells 1.2 s. Every tell plays its rattle-swish. Swapping works in fights; a swap in the air waits for landing; Hump at a lair door is swapped out; Nana's door won't open without low, middle and high voices.
- [ ] The Attic damper stays shut with 8 rescues (`goToRoom` with `rescued`) and opens at 9.
- [ ] The full game is played from New Game to the credits in one run.
- [ ] Beacon, in every zone, along the recorded critical path: `beacon()` gain at each room entry is at least the previous room's, resetting once at the retarget; it never drops below −24 dB; the target is the item's sound hole, then the lair (zone 5: the dryer vent by the Glider, then the alarm). The ripples point the right way while listening and after a call. Listen ducks the music 12 dB, and the music-bus cut sits at the zone's voice. Each zone's listed decoy plays (the Pantry's is Frost's real chirp).
- [ ] Every chirp voice and the three synthesized decoys match `RESEARCH.md` (pitch by an FFT of `renderChirp`, pulse timing from the samples).
- [ ] Swapping works between all 11 crickets via the trio; each one's stats match the movement table and its perk works as listed, including Frost's thermometer and a thermostat lock.
- [ ] The Carrier is on the map; every save crack reaches it and returns to the same crack; Shelly's Post adds crack-to-crack travel. Each of the 22 arrivals adds its object, and the shell changes at 3, 6 and 9 rescues.
- [ ] Pits respawn on the last solid ground for 1 heart; multi-screen rooms have soft checkpoints.
- [ ] Every control works with keyboard (both layouts, S as down), touch and controller (PlayStation and Xbox names), including every menu, drop-through and the floss release. Prompts show key caps or glyphs, never a bare letter. A stick resting just off-centre never drops or pounds. Unplugging the controller pauses the game.
- [ ] On a phone: HUD text is at least 14 CSS px, no canvas is over 4 MP, only one zone's paintings are loaded, and no more than 3 music buffers are decoded.
- [ ] Every screen looks finished at every targeted size, from the first load: platforms are darker than the painting behind them; no cricket shows painted antennae or a doubled tail; every gecko fits within 1.1 screen widths.
- [ ] Music and sound play after the first input. Mute (M and the speaker icon) and the volume sliders work.
- [ ] Progress is saved and restored across all three slots. A corrupt save doesn't crash the game.
- [ ] Installs as an app and works offline.
- [ ] "Report a bug" (Pause, Settings, Ctrl+Shift+F) opens the form, filled in with the game's details, by keyboard, touch and controller. Game input is ignored while it's open. It's hidden until the repo is set.
- [ ] Spend stays within $20; the first call of each model (2.6 medium, 2.5 Flare, nanogen) is priced and checked against the estimate and its trigger.
