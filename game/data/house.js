// House Cricket: the world bible. The whole house as one map on the engine's house-wide grid
// of screen cells (1 cell = 32x18 tiles = 1280x720 px). Zone builders build their rooms at
// exactly these cells and sizes (tools/check-world.mjs compares the built rooms with this file).
//
// Coordinates: x grows right, y grows DOWN (y 0 = the attic roof). A room is { x, y, w, h } in
// cells. Exits are automatic in the engine (open tiles on a shared edge), so every connection
// below lists which edge and, for links between builders, the exact tile span to leave open.
//
// Floors (cell rows):  attic y 0-2 | upstairs y 3-5 | downstairs y 6-8 | laundry y 9-10 |
//                      basement y 11-13 | the opening tank (off the house map) y 18-20.
// Columns: bedroom x 0-7, hall 8-9, bathroom 10-15, stairwell 16-17, study 18-23,
//          chimney 24, sunroom 25-31; pantry 0-4, kitchen 5-15, living room 18-24;
//          laundry 2-9; basement 8-24; dragon's lair 24-27.
//
//            [10 ATTIC  x6-23, y0-2 ]                         [chim-top x24]
//  [1 BEDROOM x0-7][HALL 8-9][2 BATHROOM 10-15][STAIR 16-17][7 STUDY 18-23][chim-flue]
//  [4 PANTRY 0-4][3 KITCHEN 5-15 ]             [  STAIR    ][6 LIVING 18-24 hearth][8 SUNROOM 25-31]
//        [5 LAUNDRY 2-9]                                                   [chim-ash]
//                [9 BASEMENT 8-24 .................................. chimney base][LAIR 24-27]
//
// Gate kinds (by item kind first; see design/zones/links.md for how to build each):
//   cling (booties) hook (floss) water (raft) height (band, >= 7 tiles of G) glide (glider, gap >= 8)
//   cereal (thimble: a C clump pounded from above) dark (glow: room dark + needs) loud (earplugs)
//   chimney (feather: flutter-only climb) crack (Mote only, %) rescue (a lair's onward exit,
//   opened when that cricket is freed) damper (9 rescues) cloak (Cellophane Cloak) perk:<name>
//   thermostat (Frost's thermometer lock) oneWay (a drop or a latch opened from one side only)
//
// Main paths are built for Jump 2 / Speed 2 (rise 2.5, gap 3.5; check-world's weakest pass
// shrinks that to rise 2 and gap 3). Swapping is never required.

export const CELL = { w: 32, h: 18 };

// Who builds what (four zone builders work in parallel from this file).
export const BUILDERS = {
  A: { zones: ['z00-tank', 'z01-bedroom', 'z02-bathroom', 'z03-kitchen'], files: ['zone-00.js', 'zone-01.js', 'zone-02.js', 'zone-03.js'] },
  B: { zones: ['z04-pantry', 'z05-laundry', 'z06-living'], files: ['zone-04.js', 'zone-05.js', 'zone-06.js'] },
  C: { zones: ['z07-study', 'z08-sunroom', 'z09-basement', 'lair'], files: ['zone-07.js', 'zone-08.js', 'zone-09.js', 'lair.js'] },
  D: { zones: ['z10-attic', 'chimney', 'hall', 'stairwell'], files: ['zone-10.js', 'links.js'] },
};

// ---------------------------------------------------------------------------------------------
// Rooms. purpose tags: start save item soundHole lairDoor arena traversal tutorial secret sneak
// recruit notCricket thermostat loud shortcut hub link carrier
// features: enemies (engine type names = sprites/enemies/<name>), props (assets/props/<name>.webp),
// hides (hiding spots to place), secrets (ids in SECRETS), notes.
// ---------------------------------------------------------------------------------------------
const R = (id, zone, name, x, y, w, h, o = {}) => ({ id, zone, name, x, y, w, h, purpose: [], ...o });

export const ROOMS = [
  // ===== z00 The Tank (the opening; off the house map, never revisited) =====
  R('tank-cup', 'z00-tank', 'In the Cup', 0, 20, 1, 1, { purpose: ['start', 'tutorial'],
    brief: 'Beat 1-2. Pip starts inside the feeder cup on Duchess\'s rock. The tongs dip three times (left, right, middle): hop left and right to dodge (teaches move + jump). Then hold Jump for a full-height leap onto the cup rim (cup wall 2.5 tiles: only a held jump clears it) and drop to the sand on the right.',
    props: ['feeder-cup-open', 'tongs'], signs: ['move', 'jumpHold'] }),
  R('tank-sand', 'z00-tank', 'The Sand', 1, 20, 2, 1, { purpose: ['tutorial'],
    brief: 'Beat 3: the escape (issues #24, #25). Duchess sleeps curled on her rock mid-room (tiles 22-27; the sleep art, breathing, Zs; a tail twitch and an eye flicker as Pip creeps past; only her head counts as a bump). She wakes when he passes tile 38, bumps her head, or chirps within 6 tiles: the wake animation, a growl, the room darkens (a wash, a vignette, her eye glinting amber), the chase cue overrides the room music, the camera frames them both (Pip in the right third, an edge glint if her head is off the view). She scrambles at about his speed (catching up beyond 10 tiles) and pounces: stop, crouch as the warning (get ready: 0.8 s, Gentle 1.2 s; a big fast tail shake with the rattle-swish, a big "!", a hip wiggle, narrowed eyes), then her shadow drops as she springs (hop!), a big leap with her silhouette on the glass, a 6 px shake and a sand spray. Pounce 1 always lands just behind him; later ones lead him, so hop when her shadow drops (leaving the ground at any point after she springs is always safe), or hop the berm at 48-50. Her snout at a landing eats him (not in Gentle Mode, where it is a roar and a skitter): a sand puff, black with a gulp, her asleep with a lip-lick and a snore, a card ("Duchess got her dinner. She crouches and shakes her tail: get ready. Her shadow drops: HOP! Then hide in the log ->"), then a quick retry from tile 33 with nothing lost (from the third catch her pounces shorten; Gentle Mode is offered after three). The log is the escape: a wide zone, a buffered or held Down; jaws on bark (a hit-stop, bark chips); she sniffs, turns her back on the log and curls up asleep, the light and music settle, a relief sting, and the exit opens (room flag duchess-asleep). Out of the log early: a roar and a full tell first. The exit is held shut until then ("She\'d follow you out! Lose her first: hide in the log.").',
    props: ['sand-berm', 'water-dish', 'hide-log'], signs: ['tell'] }),
  R('tank-decor', 'z00-tank', 'The Decor', 3, 19, 1, 2, { purpose: ['tutorial'],
    brief: 'Beat 4: climb the decor, 2 screens tall: hide log, fake plant leaves (one-way), the water-dish rim. One ledge is 1 tile too high: a loose pebble sits on the ledge above; kick it off so it lands as a step (teaches kick). The kick target is a scripted prop (pebble) that becomes a solid tile when it lands.',
    props: ['hide-log', 'fake-plant', 'water-dish', 'pebble', 'pebble-chip'], signs: ['kick'] }),
  R('tank-lid', 'z00-tank', 'The Lid Gap', 3, 18, 1, 1, { purpose: ['tutorial'],
    brief: 'Beat 5-6: the mesh lid is ajar. Squeeze through the 1-tile gap (jump up into it, or Enter (↓) under it: sign; issue #27). Pip\'s leap off the rim knocks the pet-store cup (store-cup, on the lid) off the tank (scripted), then story panel 4 (open-4.webp) and the Bedroom begins in bed-carrier with the first Chirp prompt.',
    props: ['mesh-lid', 'store-cup', 'store-cup-tipped'], signs: ['squeeze'] }),

  // ===== z01 Bedroom (x 0-7, y 3-5) =====
  R('bed-carrier', 'z01-bedroom', 'Beside the Carrier', 2, 5, 1, 1, { purpose: ['start', 'save', 'carrier', 'tutorial', 'secret'],
    brief: 'The zone start. The empty plastic cricket keeper (the Carrier) sits on the floorboards; Enter (↓) at its door enters the hub. First Chirp prompt: Stripe answers from the dark (the dresser, right). Sign: Listen. Save crack 1 in the baseboard. A Mote crack (%) in the baseboard behind the Carrier hides a song-seed (after zone 9).',
    save: 1, carrierDoor: true, signs: ['chirp', 'listen', 'carrier'], secrets: ['bed-mote'], props: ['save-crack'] }),
  R('bed-underbed', 'z01-bedroom', 'Under the Bed', 0, 5, 2, 1, { purpose: ['traversal', 'tutorial'],
    brief: 'Dusty dark-blue gloom under the bed (not a dark room). Dust mites drift: chirp scatters them (teaches chirp as a verb). Lost toys: a block letter, a marble, a sock (hide spot). Dead end to the left with a crumb cache under a slipper.',
    enemies: ['mites'], hides: ['sock'], secrets: ['bed-crumbs-slipper'], props: ['sock', 'marble'] }),
  R('bed-rug', 'z01-bedroom', 'The Rug', 3, 5, 2, 1, { purpose: ['traversal', 'tutorial'],
    brief: 'Rug floor with toy clutter: blocks (2-tile steps), a toy car, a bottle cap (hiding spot: sign "{enter} near a gap to hide"). Worker ants patrol: kick them (sign). Up through the shoe rack (one-way slats) into the closet above.',
    enemies: ['ant'], hides: ['bottle-cap'], signs: ['kick', 'hide'], props: ['bottle-cap', 'dice'] }),
  R('bed-desk', 'z01-bedroom', 'The Craft Desk', 5, 3, 1, 3, { purpose: ['item', 'soundHole', 'tutorial'],
    brief: '3 screens tall. Climb the kid\'s craft desk without any item: chair rungs and seat (one-way), drawer pulls as 2-tile ledges, a stack of picture books, the pencil cup. At the top (y 3): the Tape Booties on a roll of double-sided tape. Sound hole: the heating-vent grille in the wall right beside the tape (Stripe\'s call carries through the duct). After pickup, a 4-wide # shaft between the desk hutch and the wall teaches wall-jump (sign), with G porcelain mug walls showing what can\'t be clung to. Left at y 3-4 opens to the closet\'s upper shelf.',
    item: 'booties', soundHole: { what: 'heating-vent grille', near: 'booties' }, signs: ['jumpHold', 'wallJump'], props: ['sound-hole', 'spool', 'pin'] }),
  R('bed-closet', 'z01-bedroom', 'The Closet', 2, 3, 3, 2, { purpose: ['traversal', 'secret', 'recruit'],
    brief: 'Shoe rack at the bottom (from the rug), hanging clothes, shoe boxes, the clothes rail high up with hanger hooks (H) in a row: Weft sits at the far end of the rail (floss, after zone 2). The top shelf is a G ledge 7+ tiles above the rail (Rubber Band) with a crumb cache; a 5-tile G ledge in the corner only Hump\'s huge leap reaches (crumb cache). Left opens to the bed top, right (y 3) to the desk.',
    hides: ['sock', 'shoe'], secrets: ['bed-weft', 'bed-crumbs-shelf', 'bed-hump'], props: ['hook', 'sock'] }),
  R('bed-bedtop', 'z01-bedroom', 'The Bed', 0, 3, 2, 2, { purpose: ['traversal', 'secret'],
    brief: 'The mattress (a floor), pillow mountain (soft 2-tile steps), the headboard, the window above with curtains and a nightlight glow. The window sill is a G ledge 8 tiles above the headboard top: the Rubber Band reaches the seed-heart on the sill. Teaser: the sill and its glinting seed-heart are in plain view from the pillows.',
    secrets: ['bed-seedheart-sill'], props: ['throw-pillow'] }),
  R('bed-dresser', 'z01-bedroom', 'The Dresser', 6, 4, 2, 2, { purpose: ['save', 'lairDoor'],
    brief: 'The dresser side is a 4-wide # shaft between the dresser and the wall (no ledges): only wall-jumps get up (Tape Booties, the zone\'s gate). The floor is 2 screens of floorboards from the desk (y 5). On the dresser top (y 4): save crack 2, the "Ready?" card and the tank\'s glass wall (G) with the mesh lid ajar above: the lair door. The bedroom door to the hall (right edge, y 4-5) is shut; its draft stopper is G (no way through).',
    save: 1, lairDoor: 'bed-lair', props: ['save-crack'] }),
  R('bed-lair', 'z01-bedroom', 'Duchess\'s Tank', 6, 3, 2, 1, { purpose: ['arena'],
    brief: 'Duchess\'s old tank (boss: duchess). See LAIRS. After the rescue, the feeder cup, knocked over upside down, becomes a step to the right rim and the right edge (rows 10-13) opens into the Hall top: the way onward.',
    boss: 'duchess', cage: 'stripe' }),

  // ===== Hall (link; Bedroom palette and paintings) =====
  R('hall-top', 'hall', 'The Hall, Up High', 8, 3, 2, 1, { purpose: ['link', 'notCricket', 'shortcut'],
    brief: 'You arrive on top of the bedroom door frame (a ledge at row 14 on the left). The smoke alarm on the ceiling (smoke-alarm-wall prop; not Beep, a cousin) chirps one high beep every 40 s: the first decoy, unreachable on the ceiling. The attic hatch is in the ceiling (cols 36-41 of the room): a C latch that can only be pounded from the attic side (shortcut down, late game). No walls within 12 tiles of the hatch are clingable (G).',
    notCricket: 'hallAlarm', props: ['smoke-alarm-wall'] }),
  R('hall-floor', 'hall', 'The Hall', 8, 4, 2, 2, { purpose: ['link', 'loud', 'secret'],
    brief: 'Drop from the door frame down picture frames and a coat hook (one-way ledges, no item needed downward; they do not climb back up past the door frame without Booties). Long runner rug to the Bathroom door (right, y 5). The robot vacuum sleeps on its dock in the linen-closet nook (left, y 5): its hum is a loud zone with a low ceiling; with the Cotton Earplugs you walk past it to a song-seed on the bottom linen shelf.',
    loud: true, secrets: ['hall-songseed-closet'], enemies: [], props: [] }),

  // ===== z02 Bathroom (x 10-15, y 3-5) =====
  R('bath-door', 'z02-bathroom', 'The Bathroom Door', 10, 5, 1, 1, { purpose: ['start', 'save', 'shortcut'],
    brief: 'Zone start: save crack 1 by the bath mat. Silverfish dart along the tile floor (jump timing). A small hatch low in the wall is the old laundry chute: a lint plug (C) sits in front of it and must be pounded (Thimble); then Up on the hatch (door entity) drops you into the Laundry basket (one-way shortcut).',
    save: 1, enemies: ['silverfish'], secrets: ['bath-chute'], props: ['save-crack'] }),
  R('bath-steam', 'z02-bathroom', 'The Radiator', 10, 3, 1, 2, { purpose: ['traversal'],
    brief: 'A tall column above the door: a hot-water radiator whose valves puff steam on a timer (steam vents lift you 4 tiles: dynamic edge; also reachable by 2-tile fins of the radiator without the steam). Mosquitoes hover and dive: kick them. Opens right at y 3 into the mirror cabinet ledge.',
    enemies: ['mosquito'], props: ['steam-vent', 'steam-puff'] }),
  R('bath-toilet', 'z02-bathroom', 'The Toilet', 11, 4, 2, 2, { purpose: ['traversal', 'secret'],
    brief: 'First real wall-jump test: the toilet tank is porcelain (G) but the tiled wall beside it is # and the gap is a 4-wide shaft; the toilet-paper roll is a soft step. Up top (y 4) the tank lid leads right to the sink. A Mote crack (%) behind the bowl hides a crumb cache.',
    enemies: ['silverfish'], secrets: ['bath-mote'], hides: ['grout crack'] }),
  R('bath-cabinet', 'z02-bathroom', 'The Mirror Ledge', 11, 3, 2, 1, { purpose: ['tutorial', 'secret'],
    brief: 'The glass shelf under the mirror and the towel rack. After the Floss: towel hooks (H) spaced 5 tiles apart over a gap (the floss tutorial: sign Use to grab, Jump to fling). The mirror cabinet top is 8 tiles of G mirror above the shelf: the Rubber Band reaches a song-seed.',
    signs: ['floss'], enemies: ['mosquito'], secrets: ['bath-songseed-cabinet'], props: ['hook'] }),
  R('bath-sink', 'z02-bathroom', 'The Sink', 13, 3, 1, 3, { purpose: ['item', 'soundHole', 'save', 'lairDoor'],
    brief: '3 screens tall: the vanity cabinet (# wood: wall-jump) up to the countertop. On the counter (y 3): the Floss Line beside the toothbrush cup. Sound hole: the sink\'s overflow hole right beside it (Katy\'s call carries through the pipes from the tub). At y 4 a ledge on the right (the tub-side shelf) holds save crack 2 and the "Ready?" card: the lair door (right edge, y 4). Teaser: the high shelf (y 3, right) is visible across a 9-tile G gap.',
    item: 'floss', soundHole: { what: 'sink overflow hole', near: 'floss' }, save: 1, lairDoor: 'bath-lair', props: ['sound-hole', 'save-crack'] }),
  R('bath-shelf', 'z02-bathroom', 'The High Shelf', 14, 3, 2, 1, { purpose: ['secret'],
    brief: 'The towel shelf over the tub. Reached from the countertop across a 9-tile gap: the Dryer-Sheet Glider. A crumb cache and a teaser view down into the steam. Closed to the stairwell on the right.',
    secrets: ['bath-crumbs-shelf'] }),
  R('bath-lair', 'z02-bathroom', 'The Bathtub Rim', 14, 4, 2, 1, { purpose: ['arena'],
    brief: 'Chikchak\'s arena (boss: chikchak). See LAIRS. After the rescue the shower curtain rail\'s end opens the right edge (rows 12-15) onto the stairwell landing: the way onward.',
    boss: 'chikchak', cage: 'katy' }),
  R('bath-tub', 'z02-bathroom', 'Inside the Tub', 14, 5, 2, 1, { purpose: ['secret', 'recruit'],
    brief: 'A cutaway of the tub at floor level, reached from the sink cabinet\'s floor (left, y 5). Porcelain G walls. Bath water (~) from wall to wall: with the Raft float to the soap ledge (seed-heart). The drain at the bottom is clogged with a hair-and-soap plug (C): pound it (Thimble) to find Shelly the snail in the drain pocket. Closed to the stairwell on the right.',
    secrets: ['bath-seedheart-soap', 'bath-shelly'], props: ['soap-dish'] }),

  // ===== Stairwell (link; Study palette and paintings) =====
  R('stair-landing', 'stairwell', 'The Landing', 16, 3, 2, 2, { purpose: ['link'],
    brief: 'You arrive on the landing (left, y 4, from the tub rim). A baby gate (free-standing mesh, G, 9 tiles tall, no walls near it) blocks the top step. Two floss hooks above and before it let you swing and fling over (Floss: the gate between the Bathroom and the Kitchen). Beyond the gate the stairs go down (into stair-flight). To the right, across the open stairwell void (>= 10 tiles of air, G walls, no hooks within 7 tiles of the far side) is the Study door ledge (right edge, y 4): only a glide crosses (Glider). The Study ledge and its green lamp-glow are in view from the landing from the first visit (teaser). Falling into the void lands on the stairs below (not a pit).',
    gates: ['hook', 'glide'] }),
  R('stair-flight', 'stairwell', 'The Stairs', 16, 5, 2, 2, { purpose: ['link'],
    brief: 'Carpeted steps (2 tiles high each, walkable both ways) zig-zag down. The banister rail runs above with spindle-top hooks (optional fun swings). Halfway down, a gap in the spindles on the right looks out over the Living Room: the curtain pelmet ledge (right edge, y 6) is 8+ tiles across open air from the nearest step: glide in (Glider; one of the two ways into the Living Room).',
    gates: ['glide'] }),
  R('stair-foot', 'stairwell', 'The Foot of the Stairs', 16, 7, 2, 2, { purpose: ['link', 'save', 'hub'],
    brief: 'The hallway floor at the bottom. A save crack (the hub between the Kitchen and the Living Room). Left (y 8): the Kitchen doorway, open. Right (y 8): the Living Room doorway, where the back of the armchair stands right inside (the Rubber Band\'s 9-tile G wall: the other way into the Living Room). Silverfish.',
    save: 1, enemies: ['silverfish'] }),

  // ===== z03 Kitchen (x 5-15, y 6-8) =====
  R('kit-fridge', 'z03-kitchen', 'The Fridge', 14, 6, 2, 3, { purpose: ['start', 'save', 'thermostat', 'secret', 'recruit', 'notCricket'],
    brief: 'Zone start: save crack 1 on the floor by the doorway (right, y 8, from the stair foot). The fridge hums and creaks (decoy: "creaky fridge"). Its side is # (wall-jump) up to the fridge top (y 6): cookie jar crumb cache. Under the fridge (floor, left part): the drip tray (water) with Rolo the pill bug behind it (Raft). Thermostat lock (Frost): the condenser grille at the bottom blows warm, the freezer door seal at the top leaks cold; the lock on the side panel wants 66°F.',
    save: 1, secrets: ['kit-rolo', 'kit-crumbs-cookiejar', 'kit-thermo'], thermostat: { target: 66, warm: 'condenser grille (bottom)', cold: 'freezer seal (top)' }, props: ['thermostat-lock', 'save-crack'] }),
  R('kit-stove', 'z03-kitchen', 'The Stove', 12, 7, 2, 2, { purpose: ['traversal'],
    brief: 'The oven front and the stovetop. New: heat. The glowing burner rings on the stovetop (y 7 top) are hot tiles (^, 1 heart) on solid ground, never over a pit. The oven-door handle is a long bar to run along; the knobs are 2-tile steps. Cockroaches run, then fly when startled: chirp-stun first, then kick. Floor continues left to the under-sink cabinet. The kick-plate under the cabinets is a dark crawlspace (Glow Bead) with a crumb cache.',
    enemies: ['cockroach'], secrets: ['kit-crumbs-crawl'] }),
  R('kit-counter', 'z03-kitchen', 'The Counter', 12, 6, 2, 1, { purpose: ['save', 'lairDoor', 'secret'],
    brief: 'The counter run between the fridge top and the sink: a fruit bowl with a fruit-fly swarm (chirp to scatter), the bread bin. Save crack 2 by the sink and the "Ready?" card: the lair door (left edge, y 6). The upper cabinets are glass-fronted G 8 tiles above the counter: the Rubber Band reaches a seed-heart on top (teaser: you see it glint through the glass). From the fridge top, a 10-tile glide to the range hood finds a song-seed (Glider).',
    save: 1, lairDoor: 'kit-sink', enemies: ['fruitflies'], secrets: ['kit-seedheart-cabinet', 'kit-songseed-hood'], props: ['save-crack'] }),
  R('kit-sink', 'z03-kitchen', 'The Sink', 10, 6, 2, 2, { purpose: ['arena'],
    brief: 'Big Tok\'s arena (boss: bigtok). See LAIRS. After the rescue the window sill (left edge, rows 4-7 of y 6) opens: the way onward to the west half of the Kitchen.',
    boss: 'bigtok', cage: 'duo' }),
  R('kit-undersink', 'z03-kitchen', 'Under the Sink', 10, 8, 2, 1, { purpose: ['item', 'soundHole', 'secret'],
    brief: 'The cabinet under the sink: pipes, a U-bend, sponges, a leak puddle. The Bottle-Cap Raft sits in the puddle. Sound hole: the crack in the drain pipe right beside it (Duo\'s call carries down the drain from the spice rack above). With the Raft, float the puddle (~) to a song-seed behind the pipes. A Mote crack (%) in the back panel hides a crumb cache. Left wall: the dishwasher\'s side, G and 9 tiles tall, so you can\'t go west from here; from the west it\'s a drop (one-way shortcut, see kit-table).',
    item: 'raft', soundHole: { what: 'cracked drain pipe', near: 'raft' }, secrets: ['kit-songseed-puddle', 'kit-mote'], props: ['sponge', 'sound-hole'] }),
  R('kit-window', 'z03-kitchen', 'The Window Sill', 7, 6, 3, 1, { purpose: ['traversal'],
    brief: 'From Big Tok\'s arena (right, y 6) along the window sill: herb pots (one-way leaves), a jar of utensils (hooks on ladle handles, 5 tiles apart). Fruit flies. Drop down to the table below. Hump\'s G ledge (5 tiles) above the curtain rod holds a crumb cache.',
    enemies: ['fruitflies'], secrets: ['kit-hump'], props: ['wooden-spoon', 'hook'] }),
  R('kit-table', 'z03-kitchen', 'Under the Table', 7, 7, 3, 2, { purpose: ['sneak', 'shortcut'],
    brief: 'Sneak section 1: darkling beetles plod a fixed loop along the floor under the table and chairs (unbeatable; 1 heart on contact). Hide under a napkin, a fallen crumb, a chair-leg cap (one within reach at every point; never timed). Chair seats are one-way platforms. Right side: the dishwasher. Its pulled-out rack is a ladder of one-way rungs on the west face; from its top you drop down the east side into the under-sink cabinet (one-way shortcut back east). The Cellophane Cloak lets you walk the beetle lane straight through (shortcut).',
    sneak: 'beetle', enemies: ['beetle'], hides: ['napkin', 'crumb', 'chair-leg cap'], secrets: ['kit-cloak'] }),
  R('kit-pantrydoor', 'z03-kitchen', 'The Back Door', 5, 7, 2, 2, { purpose: ['traversal', 'hub'],
    brief: 'A mop bucket tipped over: the floor is a spill (~) 7+ tiles wide. Raft across it (the Raft is the gate to both the Pantry and the Laundry). Left (y 8): the Pantry door. In the floor (y 8 bottom, cols 18-25 of x 5): the head of the laundry stairs, down to the Laundry.',
    gates: ['water'] }),

  // ===== z04 Pantry (x 0-4, y 6-8) =====
  R('pan-door', 'z04-pantry', 'The Pantry Door', 4, 7, 1, 2, { purpose: ['start', 'save', 'traversal'],
    brief: 'Zone start: save crack 1 on the floor (y 8). Spilled flour (footprints, juice). Worker ants. The door-frame side is # (wall-jump). Up above: the top shelf (pan-high) is 8 tiles of G jar-glass above the highest ledge here: Rubber Band only.',
    save: 1, enemies: ['ant'] }),
  R('pan-high', 'z04-pantry', 'The Top Shelf', 4, 6, 1, 1, { purpose: ['secret', 'recruit'],
    brief: 'Reached by super-jump from pan-door (Rubber Band). Sgt. Crumb, an ant who quit, is drilling alone up here. A wall of cereal boxes (C) hides a song-seed: pound it (Thimble). Teaser for players who come back.',
    secrets: ['pan-crumb', 'pan-songseed-cereal'] }),
  R('pan-floor', 'z04-pantry', 'The Bottom Shelf', 2, 8, 2, 1, { purpose: ['sneak'],
    brief: 'Sneak section: the mealworm tub has tipped, and the darkling beetles that hatched ("the mealworms grew up") plod along the floor between flour and rice sacks. Hide in sack folds and under a dropped bottle cap. Weevils roll rice grains down the sack slopes: jump them. A crumbling cracker floor (Stripe\'s dash crosses before it falls) leads to a crumb cache.',
    sneak: 'beetle', enemies: ['beetle', 'weevil'], hides: ['sack fold', 'bottle-cap'], secrets: ['pan-dash'], props: ['bottle-cap'] }),
  R('pan-shelves', 'z04-pantry', 'The Shelves', 2, 6, 2, 2, { purpose: ['item', 'soundHole', 'save', 'lairDoor'],
    brief: 'Tall shelving: wooden uprights (#) to wall-jump, jar walls (G) to stop it, shelf brackets as floss hooks. New: sticky syrup (a puddle that halves run speed and jump; terrain swatch syrup). The Rubber Band (on a jam jar\'s lid) on the top shelf (y 6). Sound hole: a knot hole in the shelf\'s back board right beside it (Frost\'s call, "a tree cricket indoors?"). Save crack 2 and the "Ready?" card at the top-left: the lair door (left edge, y 6). After pickup: a G wall of 7 tiles to super-jump right away (the item\'s first use).',
    item: 'band', soundHole: { what: 'knot hole in the back board', near: 'band' }, save: 1, lairDoor: 'pan-lair', enemies: ['antsoldier'], props: ['sound-hole', 'jam-blob', 'save-crack'] }),
  R('pan-jars', 'z04-pantry', 'The Jar Wall', 0, 7, 2, 2, { purpose: ['traversal', 'secret'],
    brief: 'Reached along the floor from pan-floor. Ant soldiers wind up and charge (dodge, kick from behind). A cliff of G jars: super-jump practice (7- and 8-tile walls) to a song-seed. Syrup floor. A Mote crack (%) behind the honey jar (crumb cache); Hump\'s 5-tile G ledge (crumb cache).',
    enemies: ['antsoldier', 'ant'], secrets: ['pan-songseed-jars', 'pan-mote', 'pan-hump'] }),
  R('pan-lair', 'z04-pantry', 'The Fruit Shelf', 0, 6, 2, 1, { purpose: ['arena'],
    brief: 'Lashes\'s arena (boss: lashes). See LAIRS.', boss: 'lashes', cage: 'frost' }),

  // ===== z05 Laundry (x 2-9, y 9-10) =====
  R('laun-stairs', 'z05-laundry', 'The Laundry Stairs', 5, 9, 2, 1, { purpose: ['start', 'save', 'lairDoor'],
    brief: 'You come down from the Kitchen\'s floor hole (top, cols 18-25 of x 5) onto the stair head. Save crack 1 (zone start) at the stair foot, bottom-left. The stairs go down-left to the sink room below (bottom edge). From the stair head, a ledge sticks out right over the open drop: 10 tiles of air to the lair door on the right edge (Peridot\'s ceiling, y 9): glide only (Glider is the gate). Save crack 2 and the "Ready?" card sit at the stair head beside the ledge. Earwigs block the steps with their pincers (kick the tail end).',
    save: 2, lairDoor: 'laun-lair', enemies: ['earwig'], gates: ['glide'] }),
  R('laun-sink', 'z05-laundry', 'The Utility Sink', 5, 10, 2, 1, { purpose: ['thermostat', 'traversal'],
    brief: 'Below the stairs: the utility sink and the window well. Thermostat lock (Frost): the water heater pipe at the right is warm, the window well at the left is cold; target 72°F, opens a crumb cache. Clothes moths flutter toward the window light (lure them with the Glow Bead later). Left to the dryer, right to the washer.',
    thermostat: { target: 72, warm: 'water-heater pipe (right)', cold: 'window well (left)' }, enemies: ['clothesmoth'], secrets: ['laun-thermo'], props: ['thermostat-lock'] }),
  R('laun-dryer', 'z05-laundry', 'The Dryer', 3, 9, 2, 2, { purpose: ['item', 'soundHole', 'secret', 'loud'],
    brief: '2x2: the dryer (2 screens tall). Its enamel sides are G; climb the lint-trap ledges and the vent hose (2-tile steps) to the top (y 9): the Dryer-Sheet Glider. Sound hole: the dryer vent right beside it: before the Glider, the smoke alarm\'s beeps and Hump\'s case-taps come through it. New: warm updrafts rise from the vent hose (dynamic: they hold you up while gliding). After pickup: glide off the dryer top across the room (the item\'s first use). Inside the running drum (a loud zone, porthole door at y 10): the Cotton Earplugs reach a song-seed. The dryer squeaks (one-line gag).',
    item: 'glider', soundHole: { what: 'dryer vent', near: 'glider' }, loud: true, secrets: ['laun-songseed-drum'], notCricket: 'dryerSqueak', props: ['dryer-vent', 'sound-hole'] }),
  R('laun-basket', 'z05-laundry', 'The Laundry Basket', 2, 9, 1, 2, { purpose: ['secret', 'shortcut'],
    brief: 'The laundry basket under the chute from the Bathroom (the one-way shortcut lands you here). Sock piles (hiding spots, a sock fold), a heap of towels (soft steps). A Mote crack (%) in the baseboard: crumb cache.',
    hides: ['sock'], secrets: ['laun-mote'], props: ['sock'] }),
  R('laun-washer', 'z05-laundry', 'The Washer', 7, 10, 2, 1, { purpose: ['traversal'],
    brief: 'The washing machine has flooded the right end of the floor: a current (current entity) runs left to right across the water; ride it on the Raft to the shelf on the right. Just before the flood, on a dry step, is the old basement stair door (bottom edge, cols 12-17 of x 8): a pile of fallen plaster rubble (C) plugs it; pound it (Thimble) and drop into the dark (Glow Bead). Earwigs.',
    enemies: ['earwig'], gates: ['water', 'cereal'] }),
  R('laun-shelf', 'z05-laundry', 'The Detergent Shelf', 9, 10, 1, 1, { purpose: ['secret'],
    brief: 'Detergent jugs and an ironing board. The top shelf is 8 tiles of G above the jugs: Rubber Band, song-seed. A heavy detergent box Duo can shove (perk) hides a crumb cache.',
    secrets: ['laun-songseed-shelf', 'laun-duo'] }),
  R('laun-lair', 'z05-laundry', 'The Laundry Ceiling', 7, 9, 3, 1, { purpose: ['arena', 'notCricket'],
    brief: 'Peridot\'s arena (boss: peridot), with Beep on the wall and Hump under her. See LAIRS.', boss: 'peridot', cage: 'hump', notCricket: 'beep' }),

  // ===== z06 Living Room (x 18-24, y 6-8) =====
  R('liv-armchair', 'z06-living', 'The Armchair', 18, 6, 2, 3, { purpose: ['start', 'save', 'traversal'],
    brief: 'The two ways in. (a) From the stair foot (left, y 8): the back of the armchair stands right inside, a 9-tile G wall: super-jump it (Rubber Band). (b) From the stairs (left, y 6): glide in onto the curtain pelmet (Glider) and drop down the curtain. Both land on the armchair seat (y 7), where save crack 1 is (zone start). Bouncy seat cushion (a spring: dynamic). Leaving is free: drop off the back to the floor. The curtain rod above the pelmet holds a song-seed (Rubber Band, for players who came by glider: teaser).',
    save: 1, secrets: ['liv-songseed-rod'], props: ['cushion', 'save-crack'], gates: ['height', 'glide'] }),
  R('liv-rug', 'z06-living', 'The Rug', 20, 8, 2, 1, { purpose: ['sneak', 'save', 'lairDoor', 'notCricket'],
    brief: 'Sneak section: the robot vacuum sweeps a looping route across the rug (unbeatable; loud zone around it; it sucks you back to the room\'s checkpoint if it catches you). Hide under the coffee-table coasters, a magazine edge, the TV remote. Dust bunnies roll and grow (ground-pound them apart once you have the Thimble). The squeaky dog toy (one-line gag decoy). Save crack 2 and the "Ready?" card at the right end: the lair door (right edge, y 8). The Cellophane Cloak lets you cross the vacuum lane openly.',
    sneak: 'vacuum', save: 1, lairDoor: 'liv-lair', enemies: ['vacuum', 'dustbunny'], hides: ['coaster', 'magazine', 'tv-remote'], loud: true, notCricket: 'squeakyToy', secrets: ['liv-cloak'], props: ['tv-remote', 'save-crack'] }),
  R('liv-basket', 'z06-living', 'The Sewing Basket', 20, 6, 1, 2, { purpose: ['item', 'soundHole', 'secret'],
    brief: 'The side table (its leg is # to wall-jump; knitting needles in a yarn ball are hooks) up to the sewing basket on top (y 6): the Thimble Helmet among spools and pins. Sound hole: the wall register grille right beside the basket (Jam\'s call from the remote caddy). After pickup: a cereal (C) clump of dropped crackers under the table to pound right away. Under the table: dark (Glow Bead) crumb cache in the shadow.',
    item: 'thimble', soundHole: { what: 'wall register grille', near: 'thimble' }, enemies: ['stinkbug'], secrets: ['liv-crumbs-dark'], props: ['spool', 'pin', 'sound-hole'] }),
  R('liv-piano', 'z06-living', 'The Piano', 21, 6, 2, 2, { purpose: ['traversal', 'secret', 'loud'],
    brief: 'An upright piano. The keys (piano-key prop) are platforms that sink and play a note when you ground-pound them (Thimble; a three-note melody opens the lid: crumb cache). Stink bugs leave clouds (wait for them to fade). Inside the open top, the hammers are a loud zone (Earplugs) guarding a seed-heart. Jam\'s wall-run up the piano\'s side reaches a crumb cache (perk).',
    loud: true, enemies: ['stinkbug'], secrets: ['liv-crumbs-keys', 'liv-seedheart-piano', 'liv-jam'], props: ['piano-key'] }),
  R('liv-lamp', 'z06-living', 'The Floor Lamp', 23, 6, 1, 2, { purpose: ['traversal', 'recruit'],
    brief: 'The lamp\'s tall pole and its base. The lampshade at the top (y 6) is 10 tiles across air from the piano top: glide there (Glider) to meet Lumen the moth. The path through is the lamp base at y 7: from the piano to the mantel.',
    secrets: ['liv-lumen'] }),
  R('liv-hearth', 'z06-living', 'The Fireplace', 24, 7, 1, 2, { purpose: ['traversal', 'hub', 'secret'],
    brief: 'The mantel (y 7, from the lamp), then down the brick side to the hearth (y 8). Three ways on: (1) right (y 8): the Sunroom threshold, plugged with fallen plaster (C): pound it (Thimble). (2) the hearth floor\'s ash-dump door (bottom edge, cols 14-17): a soot plug (C); pound it and drop into the dark ash pit (Glow Bead) to the Basement\'s chimney base. (3) up the flue (top edge, cols 12-19): the chimney (Swift Feather). A Mote crack (%) between bricks: crumb cache.',
    secrets: ['liv-mote'], gates: ['cereal', 'chimney'] }),
  R('liv-lair', 'z06-living', 'The Sofa', 22, 8, 2, 1, { purpose: ['arena'],
    brief: 'Gargy\'s arena (boss: gargy). See LAIRS.', boss: 'gargy', cage: 'jam' }),

  // ===== z07 Study (x 18-23, y 3-5) =====
  R('stu-door', 'z07-study', 'The Study Door', 18, 4, 1, 2, { purpose: ['start', 'save', 'notCricket'],
    brief: 'You glide in from the landing onto the door-frame ledge (left, y 4, row 12) and drop to the floor. Save crack 1 (zone start). The door hinge creaks (decoy 1 of the beacon maze, one-line gag). Booklice crowd the baseboard.',
    save: 1, enemies: ['booklouse'], notCricket: 'hinge' }),
  R('stu-nook', 'z07-study', 'The Reading Nook', 18, 3, 1, 1, { purpose: ['secret', 'recruit'],
    dark: true, needs: 'glow',
    brief: 'A dark nook behind the books (dark room; needs the Glow Bead). Page the silverfish reads inside a dictionary. Entered from the hutch (right, y 3).',
    secrets: ['stu-page'] }),
  R('stu-desk', 'z07-study', 'The Writing Desk', 19, 4, 2, 2, { purpose: ['traversal', 'secret'],
    brief: 'The writing desk under the green banker\'s lamp: typewriter keys (steps), an ink bottle, a letter opener. The beacon maze starts here: Listen hears four sounds (door hinge, the hallway alarm through the air vent, Peeper\'s peep from the floor register, and Rin\'s true ringing chirp): the rhythm strip tells them apart. A plaster patch on the wall (C) hides a crumb cache (Thimble). A Mote crack in a book spine: song-seed.',
    enemies: ['booklouse', 'silverfish'], secrets: ['stu-crumbs-plaster', 'stu-mote'], props: ['book-spine'] }),
  R('stu-globe', 'z07-study', 'The Hutch and Globe', 19, 3, 2, 1, { purpose: ['traversal', 'secret'],
    brief: 'The desk hutch top: a globe that spins when you land on it, a mantel clock. Wolf spiders watch, then pounce (chirp-stun or hide in a pen cup). The clock top is 8 G tiles up: Rubber Band, crumb cache. A music box with two keyholes: Pip and Chip\'s duet opens it (post-game).',
    enemies: ['wolfspider'], hides: ['pen cup'], secrets: ['stu-crumbs-clock', 'stu-duet'] }),
  R('stu-shelves', 'z07-study', 'The Bookcase', 21, 3, 2, 3, { purpose: ['item', 'soundHole', 'save', 'lairDoor'],
    brief: 'The tall bookcase, 3 screens: book-spine ledges, brass shelf pins as floss hooks (Floss is the main climb here), silverfish and wolf spiders. The beacon maze proper: four cubbies, each holding one of the four sounds; three lead to dead ends with a gag (a hinge, a beeping clock radio, a frog peep through a vent), one (the true ringing chirp) leads up to the Glow Bead in a jar on the top shelf (y 3). Sound hole: a hollow book spine right beside the jar. Save crack 2 and the "Ready?" card at y 4 on the right: the lair door (right edge, y 4).',
    item: 'glow', soundHole: { what: 'hollow book spine', near: 'glow' }, save: 1, lairDoor: 'stu-lair', enemies: ['silverfish', 'wolfspider'], props: ['book-spine', 'pin', 'sound-hole', 'save-crack'] }),
  R('stu-window', 'z07-study', 'The Study Window', 23, 3, 1, 1, { purpose: ['secret'],
    brief: 'The high window ledge (right of the bookcase top, y 3). You can see the Sunroom\'s glass roof below and hear Peeper. The curtain rod 5 tiles over a G sill: jump plus a flutter (Swift Feather) reaches a song-seed.',
    secrets: ['stu-songseed-window'] }),
  R('stu-lair', 'z07-study', 'The Shelves of Mossy', 23, 4, 1, 2, { purpose: ['arena'],
    brief: 'Mossy\'s arena (boss: mossy). See LAIRS.', boss: 'mossy', cage: 'rin' }),

  // ===== z08 Sunroom (x 25-31, y 5-8) =====
  R('sun-door', 'z08-sunroom', 'The French Doors', 25, 7, 1, 2, { purpose: ['start', 'save'],
    brief: 'In through the plaster you pounded at the hearth (left, y 8). Save crack 1 (zone start) on the doormat. Aphid herds graze the doormat: harmless and bouncy (springs: land on them). The fern stand rises above.',
    save: 1, enemies: ['aphid'] }),
  R('sun-fern', 'z08-sunroom', 'The Fern Stand', 25, 5, 1, 2, { purpose: ['traversal', 'secret'],
    brief: 'A tall plant stand and a palm: fronds are one-way platforms, the stand\'s legs # (wall-jump). Up to the canopy (right, y 5-6). A Mote crack in the stand\'s base: crumb cache.',
    enemies: ['mosquito'], secrets: ['sun-mote'] }),
  R('sun-canopy', 'z08-sunroom', 'The Canopy', 26, 5, 4, 2, { purpose: ['traversal', 'secret'],
    brief: '4x2 under the glass roof (G: never clingable). Hanging baskets on chains (hooks), macrame hangers, misters that puff on a timer (a mist puff pushes you up 3 tiles: dynamic). Glide basket to basket (gaps of 8-10 tiles: the Glider is the gate). Wasps hover then dive on a line. Drop through the bottom (y 6, x 28-29) onto the potting bench top. A far basket 14 tiles out only Katy\'s long glide reaches (song-seed). The roof ridge: a flutter (Swift Feather) reaches a song-seed.',
    enemies: ['wasp'], secrets: ['sun-katy', 'sun-songseed-ridge'], props: ['mister-nozzle', 'leaf-glider', 'hook'], gates: ['glide'] }),
  R('sun-pots', 'z08-sunroom', 'The Potted Plants', 26, 7, 2, 2, { purpose: ['notCricket', 'secret'],
    brief: 'Floor of big pots and a plant stand: soft soil (s) patches. Peeper the spring peeper sits in a pot, peeping once a second (the decoy) and runs a chirp-off (match his rhythm with Chirp). Digby can dig the deepest soil patch (perk) to a song-seed. Aphids.',
    notCricket: 'peeper', enemies: ['aphid'], secrets: ['sun-peeper', 'sun-digby'] }),
  R('sun-bench', 'z08-sunroom', 'The Potting Bench', 28, 7, 2, 2, { purpose: ['item', 'soundHole', 'thermostat'],
    brief: 'The potting bench: seed trays on a heat mat on the top shelf (y 7), reached by dropping from the canopy (the top shelf is 9 G tiles above the floor). The Cotton Earplugs are in a seed tray. Sound hole: the tray\'s drainage hole right beside them (Digby\'s drone). Thermostat lock (Frost): the heat mat at the left is warm, the cold glass at the right; target 78°F, crumb cache. From the floor (y 8) walk right to the glass corner.',
    item: 'earplugs', soundHole: { what: 'seed-tray drainage hole', near: 'earplugs' }, thermostat: { target: 78, warm: 'seed-tray heat mat (left)', cold: 'glass wall (right)' }, secrets: ['sun-thermo'], props: ['thermostat-lock', 'sound-hole'] }),
  R('sun-glass', 'z08-sunroom', 'The Glass Corner', 30, 7, 2, 2, { purpose: ['loud', 'save', 'lairDoor', 'recruit'],
    brief: 'Rain drums on the glass roof (rain-roof loop) and the gutter downpipe roars: a loud zone across the passage up the ivy trellis, with a low ceiling (Cotton Earplugs: the item opens the lair way). Dot the ladybug shelters behind the downpipe (Earplugs). At the top (y 7): save crack 2 and the "Ready?" card: the lair door (top edge, x 30-31).',
    loud: true, save: 1, lairDoor: 'sun-lair', secrets: ['sun-dot'], gates: ['loud'] }),
  R('sun-lair', 'z08-sunroom', 'The High Canopy', 30, 5, 2, 2, { purpose: ['arena'],
    brief: 'Kite\'s arena (boss: kite). See LAIRS.', boss: 'kite', cage: 'digby' }),

  // ===== z09 Basement (x 8-24, y 11-13); dark rooms (needs the Glow Bead) except the furnace room, lit by its glow =====
  R('bas-stairs', 'z09-basement', 'The Basement Stairs', 8, 11, 2, 3, { purpose: ['start', 'save'], dark: true, needs: 'glow',
    brief: 'Rickety open stairs down from the Laundry floor (top, cols 12-17 of x 8). New: darkness (light radius 60 px, 240 with the Glow Bead). Cellar spiders drop on silk (time it). Save crack 1 (zone start) at the bottom.',
    save: 1, enemies: ['cellarspider'] }),
  R('bas-storage', 'z09-basement', 'The Storage Boxes', 10, 12, 3, 2, { purpose: ['sneak', 'secret'], dark: true, needs: 'glow',
    brief: 'Sneak section: darkling beetles plod around stacked boxes and paint cans. Hide in paint-can lids and under box flaps. A house centipede runs the walls (flash the Glow Bead to stun it). A beetle nest corridor with no hiding spots at all: only the Cellophane Cloak gets through (song-seed).',
    sneak: 'beetle', enemies: ['beetle', 'centipede'], hides: ['paint-can lid', 'box flap'], secrets: ['bas-cloak'] }),
  R('bas-workbench', 'z09-basement', 'The Workbench', 13, 12, 3, 2, { purpose: ['traversal', 'recruit', 'secret'], dark: true, needs: 'glow',
    brief: 'The workbench: the pegboard is a field of hooks (Floss swings in the dark), jars of screws, a vise. A spare battery on the bench (optional: carry it to Beep). Glim the firefly blinks up in the joists (top, y 12): only a flutter reaches (Swift Feather). Cellar spiders.',
    enemies: ['cellarspider', 'centipede'], secrets: ['bas-battery', 'bas-glim'], props: ['hook'] }),
  R('bas-sump', 'z09-basement', 'The Sump', 16, 12, 3, 2, { purpose: ['traversal', 'secret'], dark: true, needs: 'glow',
    brief: 'The sump pit: cold black water (~) across the floor (Raft) with a slow current toward the pump. Centipedes on the walls. A Mote crack behind the pump: crumb cache.',
    enemies: ['centipede'], secrets: ['bas-mote'] }),
  R('bas-coal', 'z09-basement', 'The Old Coal Bin', 19, 12, 3, 2, { purpose: ['save', 'lairDoor'], dark: true, needs: 'glow',
    brief: 'An old coal bin and cold-air return ducts. The coal chute goes up from the bin\'s ceiling (top edge, x 19-21) to Ember\'s den: a flutter-only climb (Swift Feather: the zone\'s item opens its lair). Save crack 2 and the "Ready?" card at the chute foot.',
    save: 1, lairDoor: 'bas-lair', enemies: ['centipede'], gates: ['chimney'] }),
  R('bas-furnace', 'z09-basement', 'The Furnace', 22, 11, 2, 3, { purpose: ['thermostat', 'traversal'],
    brief: 'The furnace roars on and off (furnace loop; its glow lights the room while it runs). Thermostat lock (Frost): furnace warm at the bottom, the cold-air intake at the top; target 60°F, song-seed. The flue pipe walkway at the top leads right to the chimney base (y 11-12). Behind the furnace, low on the right (y 13, rows 13-15): a gap with orange light: the way to the Dragon\'s Lair.',
    thermostat: { target: 60, warm: 'furnace (bottom)', cold: 'cold-air intake (top)' }, secrets: ['bas-thermo'], props: ['furnace-grate', 'thermostat-lock'] }),
  R('bas-chimney', 'z09-basement', 'The Chimney Base', 24, 11, 1, 2, { purpose: ['item', 'soundHole', 'notCricket'], dark: true, needs: 'glow',
    brief: 'The ash pit at the chimney\'s base. Soot the chimney swift is here with her chicks (the decoy chitter heard across the basement). Her gag scene, then she gives the Swift Feather. Sound hole: the flue cleanout door right beside her (Mote\'s faint trill carries through the flue). After pickup: flutter up the ash-pit ledges (the item\'s first use) toward the Living Room (only if the ash-dump plug was pounded from above).',
    item: 'feather', soundHole: { what: 'flue cleanout door', near: 'feather' }, notCricket: 'soot', props: ['sound-hole'] }),
  R('bas-lair', 'z09-basement', 'Ember\'s Den', 19, 11, 3, 1, { purpose: ['arena'], dark: true,
    brief: 'Ember\'s arena (boss: ember). See LAIRS.', boss: 'ember', cage: 'mote' }),

  // ===== Chimney (link; chimney palette and painting) =====
  R('chim-flue', 'chimney', 'The Flue', 24, 3, 1, 4, { purpose: ['link', 'secret'],
    brief: '4 screens of soot-slick brick (G: never clingable). A flutter-only climb (Swift Feather): brick lips 1 tile deep, alternating sides, each 4.5 tiles above the last, with soot overhangs that stop a straight super-jump; prove it with check-world --deny feather. Soot\'s lookout ledge halfway up (Lookout tower in the Carrier once she moves in) has a song-seed. The damper plate at the top (top edge, cols 12-19) is shut until nine crickets are home.',
    secrets: ['chim-songseed-lookout'], gates: ['chimney', 'damper'] }),
  R('chim-top', 'chimney', 'The Chimney Top', 24, 0, 1, 3, { purpose: ['link'],
    brief: 'Above the damper: the chimney top, moonlight down the flue. The attic side (left edge, y 1, rows 10-13) is a gap in the brick into the attic.',
    gates: ['damper'] }),
  R('chim-ash', 'chimney', 'The Ash Pit', 24, 9, 1, 2, { purpose: ['link', 'shortcut'], dark: true, needs: 'glow',
    brief: 'Between the hearth\'s ash dump (top) and the chimney base (bottom). Dark. Falling down is free; climbing back up is a flutter climb (Swift Feather): a shortcut loop between the Basement and the Living Room.',
    gates: ['dark', 'chimney'] }),

  // ===== z10 Attic (x 6-23, y 0-2) =====
  R('att-entry', 'z10-attic', 'The Bat Roost', 22, 1, 2, 2, { purpose: ['start', 'save', 'loud'],
    brief: 'In from the chimney top (right, y 1). Save crack 1 (zone start). Bats chatter in the roost: a loud zone across the way on with a low ceiling (Cotton Earplugs).',
    save: 1, loud: true, gates: ['loud'] }),
  R('att-rafters', 'z10-attic', 'The Rafters', 18, 0, 4, 2, { purpose: ['traversal', 'notCricket'],
    brief: 'Moonlight shafts between rafters. Everything combined: wall-jump the posts (#), swing nails (hooks), glide between beams, flutter to recover. Wasps from a paper nest; clothes moths drift into the moonlight. Velvet the bat hangs from the ridge beam: her gag scene, then her Echo map.',
    notCricket: 'velvet', enemies: ['wasp', 'clothesmoth'], secrets: ['att-velvet'] }),
  R('att-trunks', 'z10-attic', 'The Trunks', 18, 2, 4, 1, { purpose: ['sneak', 'secret'],
    brief: 'Sneak section: darkling beetles plod between steamer trunks along the floorboards. Hide in a hat box, under a trunk strap. The Cellophane Cloak crosses a hide-less stretch to a crumb cache.',
    sneak: 'beetle', enemies: ['beetle', 'antsoldier'], hides: ['hat box', 'trunk strap'], secrets: ['att-cloak'] }),
  R('att-insulation', 'z10-attic', 'The Attic Fan', 14, 1, 4, 2, { purpose: ['traversal', 'loud'],
    brief: 'Pink insulation drifts (soft floors), the attic fan thrumming in the gable: its loud zone fills the low passage (Earplugs). Ant soldiers patrol the joists. Chains of wall-jump to swing to glide to flutter.',
    loud: true, enemies: ['antsoldier', 'clothesmoth'] }),
  R('att-boxes', 'z10-attic', 'The Box Mountain', 10, 1, 4, 2, { purpose: ['save', 'lairDoor', 'secret'],
    brief: 'Stacks of boxes and holiday decorations: super-jump (8-tile G walls), floss off a tinsel hook, glide. A Mote crack in a box: crumb cache. A music box Pip and Chip\'s duet opens (post-game). Save crack 2 and the "Ready?" card on the top box (y 1): the lair door (left edge, y 1).',
    save: 1, lairDoor: 'att-lair', secrets: ['att-mote', 'att-duet'] }),
  R('att-hatch', 'z10-attic', 'The Hatch', 8, 2, 2, 1, { purpose: ['shortcut'],
    brief: 'Old toys around the attic hatch. The hatch latch (C) in the floor (bottom edge, cols 36-41 of the room) breaks with a ground-pound and drops you into the Hall: the shortcut home. From below it can\'t be opened (a C clump is solid from underneath).',
    gates: ['oneWay'] }),
  R('att-lair', 'z10-attic', 'Nana\'s Nest', 7, 0, 3, 2, { purpose: ['arena'],
    brief: 'Nana\'s arena (boss: nana). See LAIRS.', boss: 'nana', cage: 'chip' }),

  // ===== The Dragon's Lair (optional; behind the furnace) =====
  R('lair-gap', 'lair', 'Behind the Furnace', 24, 13, 1, 1, { purpose: ['save', 'lairDoor'], dark: true, needs: 'glow',
    brief: 'A low gap behind the furnace (left, y 13, rows 13-15: crawl height 3) into a dusty corridor glowing orange at the far end. A save crack and the "Ready?" card (with Sir Bartholomew\'s golden eye as the portrait).',
    save: 1, lairDoor: 'dragon-lair' }),
  R('dragon-lair', 'lair', 'The Dragon\'s Lair', 25, 12, 3, 2, { purpose: ['arena'],
    brief: 'Sir Bartholomew\'s vivarium and hoard (boss: barty). See LAIRS.', boss: 'barty', reward: 'cloak' }),
];

// ---------------------------------------------------------------------------------------------
// Connections. side = the edge of room a. span = tiles left open on that edge, in the LOCAL
// coordinates of the shared screen cell (rows 0-17 on left/right edges, columns 0-31 on top /
// bottom edges); cell = which cell of room a the opening is in. exact: true means both builders
// must match it tile for tile (links between builders); otherwise it's a suggestion.
// Standard doorway: rows 12-15 open, rows 16-17 solid floor on both sides.
// gate: { kind, item?, cricket?, rescues?, oneWay?: 'a->b' | 'b->a', where?: 'a'|'b' (side the gate is built on) }
// ---------------------------------------------------------------------------------------------
const L = (a, b, side, cell, span, gate = null, o = {}) => ({ a, b, side, cell, span, gate, exact: false, ...o });
const X = (a, b, side, cell, span, gate = null, o = {}) => L(a, b, side, cell, span, gate, { exact: true, ...o });
const DOOR = [12, 15];

export const LINKS = [
  // tank (scripted: the lid gap ends the opening; no physical link into the house)
  L('tank-cup', 'tank-sand', 'right', [0, 20], DOOR),
  L('tank-sand', 'tank-decor', 'right', [2, 20], DOOR),
  L('tank-decor', 'tank-lid', 'top', [3, 19], [12, 19]),
  // bedroom
  L('bed-carrier', 'bed-underbed', 'left', [2, 5], DOOR),
  L('bed-carrier', 'bed-rug', 'right', [2, 5], DOOR),
  L('bed-rug', 'bed-closet', 'top', [3, 5], [8, 23], null, { note: 'shoe-rack slats (one-way) up into the closet' }),
  L('bed-rug', 'bed-desk', 'right', [4, 5], DOOR),
  L('bed-closet', 'bed-bedtop', 'left', [2, 3], [8, 15], null, { note: 'closet shelf to the headboard' }),
  L('bed-closet', 'bed-desk', 'right', [4, 3], [8, 13], null, { note: 'closet top shelf to the desk hutch (top of the desk climb)' }),
  L('bed-desk', 'bed-dresser', 'right', [5, 5], DOOR, null, { note: 'floor only; the desk\'s right side at y 3-4 is closed' }),
  L('bed-dresser', 'bed-lair', 'top', [6, 4], [20, 27], null, { note: 'over the tank rim through the lid gap (the lair door)' }),
  X('bed-lair', 'hall-top', 'right', [7, 3], [10, 13], { kind: 'rescue', cricket: 'stripe', where: 'a' }, { note: 'floor row 14 on both sides; the boss module opens it when Stripe is freed' }),
  // hall
  L('hall-top', 'hall-floor', 'bottom', [8, 3], [0, 31], { kind: 'oneWay', oneWay: 'a->b', note: 'drop down; going back up needs Booties (G walls near the hatch)' }),
  X('hall-floor', 'bath-door', 'right', [9, 5], DOOR),
  X('att-hatch', 'hall-top', 'bottom', [9, 2], [4, 9], { kind: 'cereal', item: 'thimble', oneWay: 'a->b', where: 'a' }, { note: 'the attic hatch latch: C tiles in att-hatch rows 16-17, cols 4-9 of cell x 9; hall-top leaves its top row open there (no clingable walls within 12 tiles below)' }),
  // bathroom
  L('bath-door', 'bath-steam', 'top', [10, 5], [4, 11]),
  L('bath-door', 'bath-toilet', 'right', [10, 5], DOOR),
  L('bath-steam', 'bath-cabinet', 'right', [10, 3], [10, 13]),
  L('bath-toilet', 'bath-cabinet', 'top', [11, 4], [20, 31], { kind: 'cling', item: 'booties' }),
  L('bath-toilet', 'bath-sink', 'right', [12, 4], [10, 13], null, { note: 'tank lid to the vanity side' }),
  L('bath-toilet', 'bath-sink', 'right', [12, 5], DOOR),
  L('bath-cabinet', 'bath-sink', 'right', [12, 3], [10, 13]),
  L('bath-sink', 'bath-shelf', 'right', [13, 3], [8, 11], { kind: 'glide', item: 'glider' }),
  L('bath-sink', 'bath-lair', 'right', [13, 4], DOOR, null, { note: 'the lair door' }),
  L('bath-sink', 'bath-tub', 'right', [13, 5], DOOR),
  X('bath-lair', 'stair-landing', 'right', [15, 4], DOOR, { kind: 'rescue', cricket: 'katy', where: 'a' }, { note: 'the boss module opens it when Katy is freed' }),
  { a: 'bath-door', b: 'laun-basket', door: true, gate: { kind: 'cereal', item: 'thimble', oneWay: 'a->b', where: 'a' }, exact: true,
    note: 'laundry chute: a door entity in bath-door ({type:"door", to:"laun-basket", at:[16, 3]}) behind a C lint plug; one-way (no door back)' },
  // stairwell
  L('stair-landing', 'stair-flight', 'bottom', [16, 4], [8, 31], { kind: 'hook', item: 'floss', where: 'a', note: 'the baby gate (G, 9 tall) on the landing; hooks swing you over' }),
  X('stair-landing', 'stu-door', 'right', [17, 4], [8, 11], { kind: 'glide', item: 'glider', where: 'a' }, { note: 'stu-door has its ledge (floor) at row 12; the landing side is >= 10 tiles of void before the opening' }),
  L('stair-flight', 'stair-foot', 'bottom', [16, 6], [0, 31]),
  X('stair-flight', 'liv-armchair', 'right', [17, 6], [4, 7], { kind: 'glide', item: 'glider', where: 'a' }, { note: 'the curtain pelmet ledge in liv-armchair at row 8 (cols 0-6); >= 8 tiles of open air from the nearest step' }),
  X('stair-foot', 'kit-fridge', 'left', [16, 8], DOOR),
  X('stair-foot', 'liv-armchair', 'right', [17, 8], DOOR, { kind: 'height', item: 'band', where: 'b' }, { note: 'the armchair back: G, 9 tiles tall, its foot 2+ tiles inside liv-armchair' }),
  // kitchen
  L('kit-fridge', 'kit-counter', 'left', [14, 6], [8, 15]),
  L('kit-fridge', 'kit-stove', 'left', [14, 8], DOOR),
  L('kit-stove', 'kit-counter', 'top', [12, 7], [0, 31]),
  L('kit-stove', 'kit-undersink', 'left', [12, 8], DOOR),
  L('kit-counter', 'kit-sink', 'left', [12, 6], DOOR, null, { note: 'the lair door' }),
  L('kit-sink', 'kit-window', 'left', [10, 6], [4, 7], { kind: 'rescue', cricket: 'duo', where: 'a' }),
  L('kit-window', 'kit-table', 'bottom', [7, 6], [0, 31], { kind: 'oneWay', oneWay: 'a->b', note: 'drop to the table; climbing back is G' }),
  L('kit-table', 'kit-undersink', 'right', [9, 8], DOOR, { kind: 'oneWay', oneWay: 'a->b', note: 'the dishwasher: one-way rungs on its west face, a G face on the east' }),
  L('kit-table', 'kit-pantrydoor', 'left', [7, 8], DOOR),
  X('kit-pantrydoor', 'pan-door', 'left', [5, 8], DOOR, { kind: 'water', item: 'raft', where: 'a' }, { note: 'the spill (~) is inside kit-pantrydoor; pan-door\'s floor at rows 16-17' }),
  X('kit-pantrydoor', 'laun-stairs', 'bottom', [5, 8], [18, 19], { kind: 'water', item: 'raft', where: 'a' }, { note: 'the head of the laundry stairs; laun-stairs leaves its top row open at cols 18-25 of x 5 ([playtest] the kitchen side opens at 18-19 over a ladder of one-way rungs: an 8-wide hole cut the Pantry off, and the Laundry had no way back up)' }),
  // pantry
  L('pan-door', 'pan-high', 'top', [4, 7], [8, 23], { kind: 'height', item: 'band', where: 'a' }),
  L('pan-door', 'pan-floor', 'left', [4, 8], DOOR),
  L('pan-floor', 'pan-shelves', 'top', [2, 8], [0, 31]),
  L('pan-floor', 'pan-jars', 'left', [2, 8], DOOR),
  L('pan-shelves', 'pan-lair', 'left', [2, 6], DOOR, null, { note: 'the lair door' }),
  // laundry
  L('laun-stairs', 'laun-sink', 'bottom', [5, 9], [2, 13]),
  L('laun-stairs', 'laun-lair', 'right', [6, 9], [6, 9], { kind: 'glide', item: 'glider', where: 'a' }, { note: 'the lair door, 10 tiles of air out from the stair head' }),
  L('laun-sink', 'laun-dryer', 'left', [5, 10], DOOR),
  L('laun-sink', 'laun-washer', 'right', [6, 10], DOOR),
  L('laun-dryer', 'laun-basket', 'left', [3, 10], DOOR),
  L('laun-washer', 'laun-shelf', 'right', [8, 10], DOOR, { kind: 'water', item: 'raft', where: 'a' }),
  X('laun-washer', 'bas-stairs', 'bottom', [8, 10], [12, 17], { kind: 'cereal', item: 'thimble', where: 'a' }, { note: 'C rubble in laun-washer rows 16-17, cols 12-17; bas-stairs is dark (needs glow)' }),
  // living room
  L('liv-armchair', 'liv-rug', 'right', [19, 8], DOOR),
  L('liv-rug', 'liv-basket', 'top', [20, 8], [4, 27], { kind: 'cling', item: 'booties' }),
  L('liv-rug', 'liv-lair', 'right', [21, 8], DOOR, null, { note: 'the lair door' }),
  L('liv-basket', 'liv-piano', 'right', [20, 6], [8, 15]),
  L('liv-piano', 'liv-lamp', 'right', [22, 7], DOOR),
  L('liv-lamp', 'liv-hearth', 'right', [23, 7], [8, 13], null, { note: 'lamp base to the mantel' }),
  X('liv-hearth', 'sun-door', 'right', [24, 8], DOOR, { kind: 'cereal', item: 'thimble', where: 'a' }, { note: 'sunken threshold in liv-hearth filled with C plaster rubble; sun-door floor at rows 16-17' }),
  X('liv-hearth', 'chim-ash', 'bottom', [24, 8], [14, 17], { kind: 'cereal', item: 'thimble', where: 'a' }, { note: 'the ash dump: C soot plug in liv-hearth rows 16-17, cols 14-17; chim-ash is dark (needs glow)' }),
  X('liv-hearth', 'chim-flue', 'top', [24, 7], [12, 19], { kind: 'chimney', item: 'feather', where: 'b' }, { note: 'the flue throat; dropping down into the hearth is free' }),
  // study
  L('stu-door', 'stu-desk', 'right', [18, 5], DOOR),
  L('stu-desk', 'stu-globe', 'top', [19, 4], [0, 31]),
  L('stu-globe', 'stu-nook', 'left', [19, 3], DOOR, { kind: 'dark', item: 'glow', where: 'b' }),
  L('stu-desk', 'stu-shelves', 'right', [20, 5], DOOR),
  L('stu-globe', 'stu-shelves', 'right', [20, 3], [8, 15]),
  L('stu-shelves', 'stu-window', 'right', [22, 3], [8, 13]),
  L('stu-shelves', 'stu-lair', 'right', [22, 4], DOOR, null, { note: 'the lair door' }),
  // sunroom
  L('sun-door', 'sun-fern', 'top', [25, 7], [0, 31]),
  L('sun-door', 'sun-pots', 'right', [25, 8], DOOR),
  L('sun-fern', 'sun-canopy', 'right', [25, 5], [4, 15]),
  L('sun-canopy', 'sun-bench', 'bottom', [28, 6], [0, 31], { kind: 'glide', item: 'glider', where: 'a' }),
  L('sun-pots', 'sun-bench', 'right', [27, 8], DOOR),
  L('sun-bench', 'sun-glass', 'right', [29, 8], DOOR),
  L('sun-glass', 'sun-lair', 'top', [30, 7], [12, 19], { kind: 'loud', item: 'earplugs', where: 'a' }, { note: 'the lair door' }),
  // basement
  L('bas-stairs', 'bas-storage', 'right', [9, 13], DOOR),
  L('bas-storage', 'bas-workbench', 'right', [12, 13], DOOR),
  L('bas-workbench', 'bas-sump', 'right', [15, 13], DOOR),
  L('bas-sump', 'bas-coal', 'right', [18, 13], DOOR, { kind: 'water', item: 'raft', where: 'a' }),
  L('bas-coal', 'bas-furnace', 'right', [21, 13], DOOR),
  L('bas-coal', 'bas-lair', 'top', [20, 12], [12, 19], { kind: 'chimney', item: 'feather', where: 'a' }, { note: 'the coal chute (lair door)' }),
  X('bas-furnace', 'bas-chimney', 'right', [23, 11], [10, 13], null, { note: 'the flue-pipe walkway; floor row 14' }),
  X('bas-furnace', 'lair-gap', 'right', [23, 13], [13, 15], { kind: 'dark', item: 'glow' }, { note: 'a crawl gap 3 tiles high; floor rows 16-17' }),
  X('chim-ash', 'bas-chimney', 'bottom', [24, 10], [12, 19], { kind: 'chimney', item: 'feather', oneWay: 'up needs feather', where: 'a' }),
  // chimney + attic
  X('chim-flue', 'chim-top', 'top', [24, 3], [12, 19], { kind: 'damper', rescues: 9, where: 'b' }, { note: 'the damper plate: solid until 9 rescues (see engine note in links.md)' }),
  X('chim-top', 'att-entry', 'left', [24, 1], [10, 13], null, { note: 'floor row 14 on both sides' }),
  L('att-entry', 'att-rafters', 'left', [22, 1], [2, 13], { kind: 'loud', item: 'earplugs', where: 'a' }),
  L('att-entry', 'att-trunks', 'left', [22, 2], DOOR, { kind: 'loud', item: 'earplugs', where: 'a' }),
  L('att-rafters', 'att-trunks', 'bottom', [18, 1], [0, 31]),
  L('att-rafters', 'att-insulation', 'left', [18, 1], [4, 13]),
  L('att-trunks', 'att-insulation', 'left', [18, 2], DOOR),
  L('att-insulation', 'att-boxes', 'left', [14, 2], DOOR, { kind: 'loud', item: 'earplugs', where: 'a' }),
  L('att-boxes', 'att-hatch', 'left', [10, 2], DOOR),
  L('att-boxes', 'att-lair', 'left', [10, 1], DOOR, null, { note: 'the lair door' }),
  // dragon's lair
  L('lair-gap', 'dragon-lair', 'right', [24, 13], DOOR, null, { note: 'the lair door' }),
];

// ---------------------------------------------------------------------------------------------
// Secrets (2-4 per zone + backtracking). kind: crumbs (a crumb cache, 25 crumbs unless noted),
// seedHeart (+1 health), songSeed (+chirp meter), recruit, notCricket, cloak, battery, duet.
// needs: an item, a perk ('perk:hugeLeap'), 'thermostat' (Frost's lock) or a cricket (Mote: 'crack').
// ---------------------------------------------------------------------------------------------
const S = (id, room, kind, needs, note, o = {}) => ({ id, room, kind, needs, note, ...o });
export const SECRETS = [
  // z01
  S('bed-crumbs-slipper', 'bed-underbed', 'crumbs', null, 'under a slipper at the dead end', { crumbs: 15 }),
  S('bed-weft', 'bed-closet', 'recruit', 'floss', 'Weft, on the clothes rail (hanger hooks)', { who: 'weft' }),
  S('bed-crumbs-shelf', 'bed-closet', 'crumbs', 'band', 'closet top shelf, 8 G tiles above the rail'),
  S('bed-hump', 'bed-closet', 'crumbs', 'perk:hugeLeap', 'a 5-tile G ledge in the closet corner'),
  S('bed-seedheart-sill', 'bed-bedtop', 'seedHeart', 'band', 'the window sill above the headboard (in view from the start)'),
  S('bed-mote', 'bed-carrier', 'songSeed', 'crack', 'the baseboard crack behind the Carrier'),
  // hall
  S('hall-songseed-closet', 'hall-floor', 'songSeed', 'earplugs', 'past the humming vacuum dock in the linen closet'),
  // z02
  S('bath-mote', 'bath-toilet', 'crumbs', 'crack', 'behind the bowl'),
  S('bath-songseed-cabinet', 'bath-cabinet', 'songSeed', 'band', 'top of the mirror cabinet'),
  S('bath-crumbs-shelf', 'bath-shelf', 'crumbs', 'glider', 'the towel shelf, 9 tiles across from the counter'),
  S('bath-seedheart-soap', 'bath-tub', 'seedHeart', 'raft', 'the soap ledge across the bath water'),
  S('bath-shelly', 'bath-tub', 'recruit', 'thimble', 'Shelly, in the drain under the soap plug', { who: 'shelly' }),
  S('bath-chute', 'bath-door', 'shortcut', 'thimble', 'the laundry chute to the Laundry basket (one-way)'),
  // z03
  S('kit-rolo', 'kit-fridge', 'recruit', 'raft', 'Rolo, behind the drip tray under the fridge', { who: 'rolo' }),
  S('kit-crumbs-cookiejar', 'kit-fridge', 'crumbs', null, 'the cookie jar on top of the fridge (wall-jump up)'),
  S('kit-thermo', 'kit-fridge', 'crumbs', 'thermostat', 'thermostat lock 66°F on the fridge side', { crumbs: 40 }),
  S('kit-crumbs-crawl', 'kit-stove', 'crumbs', 'glow', 'the dark kick-plate crawlspace under the cabinets'),
  S('kit-seedheart-cabinet', 'kit-counter', 'seedHeart', 'band', 'on top of the glass-fronted upper cabinets'),
  S('kit-songseed-hood', 'kit-counter', 'songSeed', 'glider', 'the range hood, a 10-tile glide from the fridge top'),
  S('kit-songseed-puddle', 'kit-undersink', 'songSeed', 'raft', 'behind the pipes across the leak puddle'),
  S('kit-mote', 'kit-undersink', 'crumbs', 'crack', 'the cabinet back panel'),
  S('kit-hump', 'kit-window', 'crumbs', 'perk:hugeLeap', 'above the curtain rod'),
  S('kit-cloak', 'kit-table', 'shortcut', 'cloak', 'walk the beetle lane openly'),
  // z04
  S('pan-crumb', 'pan-high', 'recruit', 'band', 'Sgt. Crumb, drilling alone on the top shelf', { who: 'crumb' }),
  S('pan-songseed-cereal', 'pan-high', 'songSeed', 'thimble', 'behind the cereal-box wall (C)'),
  S('pan-dash', 'pan-floor', 'crumbs', 'perk:dash', 'across the crumbling cracker floor'),
  S('pan-songseed-jars', 'pan-jars', 'songSeed', 'band', 'top of the jar cliff'),
  S('pan-mote', 'pan-jars', 'crumbs', 'crack', 'behind the honey jar'),
  S('pan-hump', 'pan-jars', 'crumbs', 'perk:hugeLeap', 'a 5-tile G ledge'),
  // z05
  S('laun-thermo', 'laun-sink', 'crumbs', 'thermostat', 'thermostat lock 72°F', { crumbs: 40 }),
  S('laun-songseed-drum', 'laun-dryer', 'songSeed', 'earplugs', 'inside the running dryer drum (loud)'),
  S('laun-mote', 'laun-basket', 'crumbs', 'crack', 'the baseboard by the basket'),
  S('laun-songseed-shelf', 'laun-shelf', 'songSeed', 'band', 'the top detergent shelf'), // [issue #19] or the Feather, late (Hump or Frost reach it without the Band): an intended alternative
  S('laun-duo', 'laun-shelf', 'crumbs', 'perk:shove', 'under the detergent box Duo shoves'),
  S('laun-beep-battery', 'laun-lair', 'notCricket', 'battery', 'give Beep the spare battery from the Basement workbench (after Peridot)', { who: 'beep' }),
  // z06
  S('liv-songseed-rod', 'liv-armchair', 'songSeed', 'band', 'the curtain rod above the pelmet'),
  S('liv-cloak', 'liv-rug', 'shortcut', 'cloak', 'cross the vacuum lane in the open'),
  S('liv-crumbs-dark', 'liv-basket', 'crumbs', 'glow', 'the dark shadow under the side table'),
  S('liv-crumbs-keys', 'liv-piano', 'crumbs', 'thimble', 'pound three keys in order (the melody on the music stand) to open the lid'),
  S('liv-seedheart-piano', 'liv-piano', 'seedHeart', 'earplugs', 'past the hammers inside the piano (loud)'),
  S('liv-jam', 'liv-piano', 'crumbs', 'perk:wallRun', 'wall-run up the piano side'),
  S('liv-lumen', 'liv-lamp', 'recruit', 'glider', 'Lumen, on the lampshade', { who: 'lumen' }),
  S('liv-mote', 'liv-hearth', 'crumbs', 'crack', 'between the hearth bricks'),
  // z07
  S('stu-page', 'stu-nook', 'recruit', 'glow', 'Page, reading in a dictionary in the dark nook', { who: 'page' }),
  S('stu-crumbs-plaster', 'stu-desk', 'crumbs', 'thimble', 'behind a plaster patch'),
  S('stu-mote', 'stu-desk', 'songSeed', 'crack', 'a cracked book spine'),
  S('stu-crumbs-clock', 'stu-globe', 'crumbs', 'band', 'on top of the mantel clock'),
  S('stu-duet', 'stu-globe', 'duet', 'perk:duet', 'the two-keyhole music box (post-game): 100 crumbs and the Duet song for the Stage', { crumbs: 100 }),
  S('stu-songseed-window', 'stu-window', 'songSeed', 'feather', 'the curtain rod over the window'),
  // z08
  S('sun-mote', 'sun-fern', 'crumbs', 'crack', 'the fern stand\'s base'),
  S('sun-katy', 'sun-canopy', 'songSeed', 'perk:longGlide', 'the far hanging basket, 14 tiles out'),
  S('sun-songseed-ridge', 'sun-canopy', 'songSeed', 'feather', 'the glass roof ridge'),
  S('sun-peeper', 'sun-pots', 'notCricket', null, 'Peeper\'s chirp-off (win it to recruit him)', { who: 'peeper' }),
  S('sun-digby', 'sun-pots', 'songSeed', 'perk:dig', 'dig the deep soil patch'),
  S('sun-thermo', 'sun-bench', 'crumbs', 'thermostat', 'thermostat lock 78°F', { crumbs: 40 }),
  S('sun-dot', 'sun-glass', 'recruit', 'earplugs', 'Dot, sheltering behind the roaring downpipe', { who: 'dot' }),
  // z09
  S('bas-cloak', 'bas-storage', 'songSeed', 'cloak', 'the beetle nest corridor (no hiding spots)'),
  S('bas-battery', 'bas-workbench', 'battery', null, 'a spare battery on the bench (carry it to Beep in the Laundry)'),
  S('bas-glim', 'bas-workbench', 'recruit', 'feather', 'Glim, blinking up in the joists', { who: 'glim' }),
  S('bas-mote', 'bas-sump', 'crumbs', 'crack', 'behind the sump pump'),
  S('bas-thermo', 'bas-furnace', 'songSeed', 'thermostat', 'thermostat lock 60°F'),
  // chimney
  S('chim-songseed-lookout', 'chim-flue', 'songSeed', 'feather', 'Soot\'s lookout ledge halfway up the flue'),
  // z10
  S('att-velvet', 'att-rafters', 'notCricket', null, 'Velvet, on the ridge beam (her gag scene; she moves in)', { who: 'velvet' }),
  S('att-cloak', 'att-trunks', 'crumbs', 'cloak', 'the hide-less stretch between trunks'),
  S('att-mote', 'att-boxes', 'crumbs', 'crack', 'a crack in a box'),
  S('att-duet', 'att-boxes', 'duet', 'perk:duet', 'the attic music box (post-game): the last harmony door, a hoard of 150 crumbs', { crumbs: 150 }),
];

// Collectible totals (100%): 4 seed-hearts in the world + 1 in Rolo's shop take health 5 -> 10.
// Counts are computed from SECRETS; the shop sells the rest (TOTALS.shop).
export const TOTALS = {
  get seedHearts() { return SECRETS.filter((s) => s.kind === 'seedHeart').length; },
  get songSeeds() { return SECRETS.filter((s) => s.kind === 'songSeed').length; },
  get crumbCaches() { return SECRETS.filter((s) => s.kind === 'crumbs').length; },
  maxHealth: 10, baseHealth: 5,
  shop: { seedHearts: 1, songSeeds: 2, listenRange: 2 }, // 5 base + 4 found + 1 bought = 10
};

// ---------------------------------------------------------------------------------------------
// The cast: where each recruit and Not-Cricket is.
// ---------------------------------------------------------------------------------------------
export const RECRUITS = {
  weft:   { room: 'bed-closet',    needs: 'floss',    facility: 'Hammocks and Weaver' },
  shelly: { room: 'bath-tub',      needs: 'thimble',  facility: 'Post' },
  rolo:   { room: 'kit-fridge',    needs: 'raft',     facility: 'Crumb Shop' },
  crumb:  { room: 'pan-high',      needs: 'band',     facility: 'Trainer' },
  lumen:  { room: 'liv-lamp',      needs: 'glider',   facility: 'Lamp and map table' },
  page:   { room: 'stu-nook',      needs: 'glow',     facility: 'Library (Sound Book, bestiary)' },
  dot:    { room: 'sun-glass',     needs: 'earplugs', facility: 'Clinic' },
  glim:   { room: 'bas-workbench', needs: 'feather',  facility: 'Night lights and the Stage' },
};
export const NOT_CRICKETS = {
  beep:   { room: 'laun-lair', heard: ['laun-dryer (through the vent)', 'laun-lair'], facility: 'a very quiet doorbell', joins: 'after Peridot; the battery (bas-workbench) quiets her' },
  peeper: { room: 'sun-pots', heard: ['stu-desk (floor register)', 'sun-*'], facility: 'Pond', joins: 'win the chirp-off' },
  soot:   { room: 'bas-chimney', heard: ['bas-*', 'chim-*', 'liv-hearth'], facility: 'Lookout tower', joins: 'gives the Swift Feather; moves in after her gag' },
  velvet: { room: 'att-rafters', heard: ['att-*'], facility: 'Echo map (reveals every secret on the map)', joins: 'after her gag' },
  hallAlarm: { room: 'hall-top', oneLiner: true }, squeakyToy: { room: 'liv-rug', oneLiner: true },
  dryerSqueak: { room: 'laun-dryer', oneLiner: true }, hinge: { room: 'stu-door', oneLiner: true },
  fridge: { room: 'kit-fridge', oneLiner: true },
};
// After their fight each gecko dozes somewhere (a non-hostile sleeping prop, sleep.webp + curled tail).
export const DOZING = {
  duchess: 'bed-dresser', chikchak: 'bath-cabinet', bigtok: 'kit-counter', lashes: 'pan-jars', peridot: 'laun-sink',
  gargy: 'liv-armchair', mossy: 'stu-desk', kite: 'sun-canopy', ember: 'bas-furnace', nana: 'att-lair',
};

// ---------------------------------------------------------------------------------------------
// The ten gecko lairs and the Dragon's Lair, in engine terms. Arena chirp radius / stun are
// fixed per fight (tiles / seconds). tell: tail-tip wiggle + rattle-swish, 0.8 s (1.2 Gentle).
// Losing restarts the current phase. Every arena is built for Jump 2 / Speed 2.
// ---------------------------------------------------------------------------------------------
export const LAIRS = {
  duchess: { room: 'bed-lair', cricket: 'stripe', arena: [2, 1], chirp: { radius: 4, stun: 0 }, verb: 'avoid',
    props: ['sand-berm', 'feeder-cup', 'feeder-cup-tipped', 'cup-tab', 'cup-tab-pulled', 'hide-log', 'water-dish', 'fake-plant'],
    layout: 'Her tank floor: sand, a sand berm (a 3-tile mound) at each side, the hide log (left, a hiding spot), the water dish (right). Stripe\'s feeder cup (lidded, the same tub Pip started in) sits on the rock in the middle (4 tiles up) with three pull tabs (cup-tab) on its lid\'s front edge.',
    phases: [
      'Phase 1 (teach): she stalks the floor and, after the tell (0.8 s), lunges at where you stand. Stand in front of a sand berm so she lunges into it: her snout sticks for 3 s. While she\'s stuck, run up her back (her body is a platform while stuck) to the rock and kick tab 1. Ends: tab 1 pulled.',
      'Phase 2 (twist): she now feints once before each lunge (a tell, a pause, a second tell). Same move, berm on the other side; kick tab 2. Ends: tab 2 pulled.',
      'Phase 3 (climax): she lunges twice in a row (two tells 0.6 s apart). Dodge the first, put the berm behind you for the second; kick tab 3. The cup tips, Stripe hops out. Ends: rescue.',
    ], hides: ['hide log (left)'], timings: { tell: 0.8, stuck: 3, lungeSpeed: '12 tiles/s', doubleGap: 0.6 } },
  chikchak: { room: 'bath-lair', cricket: 'katy', arena: [2, 1], chirp: { radius: 4, stun: 1.5 }, verb: 'stealth',
    props: ['faucet-handle', 'soap-dish', 'steam-vent', 'steam-puff', 'hook'],
    layout: 'The tub rim (a long floor), the tiled wall above with grout cracks (hiding spots), the mirror ledge high on the left where Chikchak perches, the three faucet handles (hot, cold, shower) spaced along the rim, the soap dish on the right wall 6 tiles up with Katy in it, floss hooks (towel hooks) leading to it.',
    phases: [
      'Phase 1: she hunts by sight from the mirror ledge, chirping decoy calls ("chik-chak-chak") that pull the Listen arrow the wrong way. Steam bursts from the hot tap every 4 s fill a cloud (3 s, 6 tiles wide) she can\'t see into. Move cloud to cloud, or hide in grout cracks; if she sees you in the open she strikes (tell first). Turn faucet 1 (kick it). Ends: faucet 1 on.',
      'Phase 2: clouds come from two vents, alternating; she climbs down to the rim and patrols. Turn faucet 2. Ends: faucet 2 on.',
      'Phase 3: faucet 3 is on the shower riser: wall-jump the tiles up to it inside a cloud. Water floods her ledge, she retreats to dry tile, and the floss hooks to the soap dish are clear: swing to Katy. Ends: rescue.',
    ], hides: ['grout cracks (3)', 'steam clouds'], timings: { tell: 0.8, steamEvery: 4, steamLasts: 3, sightRange: '10 tiles' } },
  bigtok: { room: 'kit-sink', cricket: 'duo', arena: [2, 2], chirp: { radius: 4, stun: 1 }, verb: 'distract',
    props: ['cork', 'wooden-spoon', 'sponge', 'spice-rack', 'bottle-cap'],
    layout: '2x2: the counter (lower floor), the sink basin full of water (~, the Raft floats it), the backsplash tiles, Big Tok clinging to the wall above the faucet (tall frame), the spice rack high on the right wall with Duo stuck behind a jar. Three decoys sit along the counter edge.',
    phases: [
      'Phase 1: his "TO-KAY!" bellow sends a floor-level shockwave along the counter (jump it; 1 heart). He bites anything that moves on the counter. Kick the cork off the counter edge: he chomps it and his jaw is stuck for 5 s. Raft across the sink to the first spice-rack ledge. Ends: on ledge 1.',
      'Phase 2: two shockwaves per bellow (a short and a tall one). Kick the wooden spoon; raft to ledge 2. Ends: on ledge 2.',
      'Phase 3: the bellow also ripples the sink (the raft bobs: time your jump). Kick the sponge, raft and climb to the top of the spice rack, kick Duo\'s jar loose. Ends: rescue.',
    ], hides: [], timings: { tell: 0.8, jawStuck: 5, shockSpeed: '9 tiles/s' } },
  lashes: { room: 'pan-lair', cricket: 'frost', arena: [2, 1], chirp: { radius: 5, stun: 2 }, verb: 'distract with fruit',
    props: ['grape', 'jam-blob', 'banana-slice', 'hook'],
    layout: 'Three shelves stacked (floors at rows 16, 11, 6), Lashes patrolling the middle shelf. Fruit hangs above each shelf (a grape on a stem, a jam jar tipped at the edge, a banana slice) reachable by floss hooks and a super-jump spot. Frost is in a jar at the far end of the top shelf.',
    phases: [
      'Phase 1: he patrols the middle shelf and licks his eye between steps (*slurp*: while licking he isn\'t looking: a safe window of 1 s). Swing above him and kick the grape down into his path at the right moment: he stops to lick it (6 s). Pass him. Ends: past him on the middle shelf.',
      'Phase 2: he patrols faster and turns at random ends; super-jump to the jam jar and kick it so it drips into his path. Ends: past him to the top shelf stairs.',
      'Phase 3: a fruit-fly swarm blocks the top shelf (chirp to scatter it, then it re-forms in 3 s). Drop the banana slice for him and run the top shelf to Frost\'s jar; kick its lid. Ends: rescue.',
    ], hides: ['behind a cereal box (2)'], timings: { tell: 0.8, lickWindow: 1, eatsFor: 6, swarmReform: 3 } },
  peridot: { room: 'laun-lair', cricket: 'hump', arena: [3, 1], chirp: { radius: 4, stun: 1.5 }, verb: 'put her to sleep',
    props: ['pull-chain', 'dryer-vent', 'smoke-alarm-wall', 'sock'],
    layout: '3x1: the laundry ceiling. Three light fixtures with pull-chains hang at the left, middle and right. The dryer\'s exhaust duct runs along the ceiling and leaks warm updrafts (glide lifts) at five seams. Beep (the smoke alarm) is on the far-right wall with Hump under her; Hump taps his case when you\'re near.',
    phases: [
      'Phase 1: she\'s wide awake in the light, running laps of the duct and lunging (tell first). Glide on the updrafts to the left pull-chain and pull it (kick it): a third of the room goes dark and she slows to half speed there. Ends: chain 1.',
      'Phase 2: she now stops under the remaining light and jumps at you as you pass over. Pull the middle chain. Ends: chain 2.',
      'Phase 3: only the right lamp is on and she guards it. Lure her into the dark side (she yawns there: 2 s), double back on the updrafts and pull the last chain: full dark, she naps (snore). Hop to the smoke alarm: Hump is underneath. Ends: rescue; then Beep\'s gag scene.',
    ], hides: ['in the dark (she can\'t see you there)', 'a sock on the duct'], timings: { tell: 0.8, yawn: 2, darkSlow: 0.5 } },
  gargy: { room: 'liv-lair', cricket: 'jam', arena: [2, 1], chirp: { radius: 4, stun: 1 }, verb: 'stun',
    props: ['cushion', 'throw-pillow', 'tv-remote'],
    layout: 'The sofa: three seat cushions (bouncy floors), two arms (ledges at the sides), the sofa back (a ledge 7 tiles up), Gargy lounging along the back. The TV remote in a caddy on the right arm with Jam stuck in the battery slot. A throw pillow rests on each cushion.',
    phases: [
      'Phase 1: he swats at you when you\'re on a cushion under him (tell first; the swat knocks you off the sofa: 1 heart). Ground-pound the cushion next to the one with a throw pillow: the pillow flies up and bonks him (dazed 3 s: a soft "bonk", never hurt). Ends: 1 bonk.',
      'Phase 2: he rolls along the back to follow you, and swats twice. Two pillows, two cushions to choose from. Ends: 2 bonks.',
      'Phase 3: he gets grumpy and shoves cushions so they bounce you (dynamic springs). Bonk him a third time: he sulks off to the armchair. Ends: rescue (Jam pops out of the remote).',
    ], hides: ['under a cushion edge (2)'], timings: { tell: 0.8, dazed: 3 } },
  mossy: { room: 'stu-lair', cricket: 'rin', arena: [1, 2], chirp: { radius: 6, stun: 0 }, verb: 'hide and seek (tag)',
    props: ['book-spine', 'bamboo-cage', 'hook'],
    layout: '1x2 tall: bookshelves on both sides, five shelf levels joined by book-spine steps and floss hooks. Mossy hides in one of eight hiding places (gaps between books, behind a fern frond, along a picture frame). Rin\'s bamboo cage hangs at the top.',
    phases: [
      'Phase 1: Mossy is camouflaged (drawn at 10% alpha). Chirp: if he\'s within 6 tiles his eyes shine back (glint 1 s on screen + an echo blip). Tag him (kick or touch) during the glint: no damage either way. Outside a glint, touching him costs a heart as usual. After a tag he relocates (3 s). Ends: tag 1.',
      'Phase 2: he relocates faster (2 s) and picks higher spots. Ends: tag 2.',
      'Phase 3: he relocates twice between chirps and strikes (tell first) when you pass his spot without seeing him. Ends: tag 3; he concedes and opens the cage.',
    ], hides: [], timings: { tell: 0.8, glint: 1, relocate: [3, 2, 1.5] } },
  kite: { room: 'sun-lair', cricket: 'digby', arena: [2, 2], chirp: { radius: 5, stun: 0 }, verb: 'chase',
    props: ['leaf-glider', 'hook', 'mister-nozzle'],
    layout: '2x2 canopy: hanging baskets (floors), chains (hooks), misters (lifts), a loop path round the room. Kite glides on his skin flaps holding the big leaf (leaf-glider) Digby clings to; he lands on a basket, then takes off on a fixed loop. Soil beds on the floor.',
    phases: [
      'Phase 1: he glides a slow loop. Race along the baskets (glide, swing) and chirp when within 5 tiles: startled, he drops 3 tiles lower and lands for 2 s. Ends: startle 1.',
      'Phase 2: faster loop; he does a swoop (tell first) at you if you\'re on his line. Ends: startle 2.',
      'Phase 3: he flies a figure-eight using the misters; chirp him once more. Digby lets go and drops into the soil bed. Ends: rescue.',
    ], hides: [], timings: { tell: 0.8, landFor: 2, loopSeconds: [10, 8, 7] } },
  ember: { room: 'bas-lair', cricket: 'mote', arena: [3, 1], chirp: { radius: 3, stun: 0 }, verb: 'dazzle',
    props: ['furnace-grate', 'hook'],
    layout: '3x1 dark den above the coal bin. Glowing red eyes are all you see of her. Mote is in a crack in the far right wall. A furnace grate on the right lets orange light in when the furnace runs (phase 3).',
    phases: [
      'Phase 1: she hunts by sound: running, jumping and chirping make noise rings she homes in on; standing still makes none and she loses track. When her red eyes are within 4 tiles, flash the Glow Bead (tap Use): dazzled 4 s. Move up one third of the den in that window. Ends: reach the middle.',
      'Phase 2: she hisses (tell + the gecko-growl pitched up) and lunges at the last sound. Glow flash, move, freeze. Ends: reach the crack.',
      'Phase 3: the furnace cycles on (lit 6 s) and off (dark 6 s). In the light she can see you; in the dark she hears you. Free Mote from the crack (kick it 3 times while she\'s dazzled). Ends: rescue.',
    ], hides: ['standing still is hiding', 'two coal lumps (h)'], timings: { tell: 0.8, dazzle: 4, furnaceCycle: 6 } },
  nana: { room: 'att-lair', cricket: 'chip', arena: [3, 2], chirp: { radius: 6, stun: 0 }, verb: 'the lullaby',
    props: ['music-stone-fork', 'music-stone-glass', 'music-stone-bell'],
    layout: '3x2: Nana fills the back of the attic, curled around a chimney breast. Three music stones on three rafters (tuning fork low-left, glass middle, bell high-right). Rafter gaps (hiding spots) all along the floor. Chip sits in an old shoebox by her chin.',
    phases: [
      'At the door: the "Ready?" card asks for a low, a middle and a high voice (low <= 3.5 kHz: Katy, Frost, Digby; middle 4-5 kHz: Pip, Duo, Jam, Rin; high >= 5.5 kHz: Stripe, Mote). One press picks a suggested trio; the door opens once the trio covers all three.',
      'Phase 1: she growls (loud zones pulse: Earplugs) and sweeps her tail along the floor (the long swish; tell first). Duck into rafter gaps. Between sweeps kick each music stone once to light it. Ends: 3 stones lit.',
      'Phase 2: each stone glows the colour of the voice it wants; your matching portrait glows too. Swap (L1/R1) and chirp at each stone with the right voice. Ends: 3 stones sung.',
      'Phase 3: the chorus. Everyone (all ten rescued crickets and every Not-Cricket met) joins a short rhythm sequence: press Chirp on the beat (rings on screen; window +/-150 ms; no failure, only "louder"). 16 beats. Nana yawns, sings along a little and falls asleep. Ends: Chip is free.',
    ], hides: ['rafter gaps (6)'], timings: { tell: 0.8, sweepEvery: 4, beatWindowMs: 150, beats: 16 } },
  barty: { room: 'dragon-lair', reward: 'cloak', arena: [3, 2], chirp: { radius: 3, stun: 0 }, verb: 'hide, then wave',
    props: ['hoard-pile', 'hoard-buttons', 'hoard-coins', 'bottle-cap', 'marble', 'candy-wrapper', 'pebble'],
    sprites: ['npcs/barty-eye', 'npcs/barty-claw', 'npcs/barty-head', 'npcs/barty-head-black', 'npcs/barty'],
    layout: '3x2 glass vivarium under a hot orange basking lamp. Hoard piles (coins, buttons, bottle caps, marbles, foil wrappers) rise in steps to the top of the hoard under the lamp. He is far too big: the camera only shows parts (a golden eye in the gloom, a claw, the spiky beard).',
    phases: [
      'Phase 1: skitter between hoard piles and hide (bottle caps, gaps between coins) while he searches, head-bobbing (his eye sweeps a cone). Chirping gives you away. Reach the second pile tier. Ends: tier 2.',
      'Phase 2: his claw sweeps the hoard (tell: the claw lifts; 1 s). Duck under bottle caps and into coin gaps; climb toward the lamp. Ends: top of the hoard.',
      'Phase 3: befriending. Stand on top of the hoard in plain view and wave: hold Listen and press Kick (the slow arm-wave). He stops, waves back, his beard pales. "...Nobody ever waves." Ends: the Cellophane Cloak.',
    ], hides: ['bottle caps (4)', 'coin gaps (5)'], timings: { tell: 1, eyeSweep: 3 } },
};

// Thermostat locks (Frost's perk). The reading follows position between the warm and cold ends.
export const THERMOSTATS = ROOMS.filter((r) => r.thermostat).map((r) => ({ room: r.id, ...r.thermostat }));

// Sneak sections (max 1-2 per zone, from zone 2): beetle or vacuum. Always a hiding spot within
// reach, never a timed chase.
export const SNEAKS = ROOMS.filter((r) => r.sneak).map((r) => ({ room: r.id, zone: r.zone, hazard: r.sneak }));

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
export const roomsOf = (zone) => ROOMS.filter((r) => r.zone === zone);
