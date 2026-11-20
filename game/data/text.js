// House Cricket: the writing bible. Every line of text in the game lives here.
// Tone: gentle, funny, never cruel. Nobody gets eaten. Geckos are polite about wanting to.
//
// Conventions (read by src/lines.js `line('geckos.duchess.pre')` and src/dialog.js):
// - {jump} {use} {chirp} {kick} {listen} {down} {left} {right} {swapPrev} {swapNext} {map}
//   {enter} (go in / use: ↓ on every scheme) {cloak} (hold: Shift, stick up) [issue #27: never {up}, which
//   jumps on the keyboard]
//   {pause} render as key caps / pad glyphs (never write a bare key letter).
// - *word* is a dialog BEAT (italic, a short pause; for Lashes the portrait licks its eye on
//   *slurp*). Never use asterisks for emphasis: use CAPITALS.
// - {name}, {zone}, {n} etc. in UI strings are filled by line(key, vars).
// - Dialog arrays are spoken by the entry's owner unless a line is [who, text].

export const TEXT = {
  // ---------------------------------------------------------------------------------------
  opening: {
    panels: [
      { img: 'story/open-1.webp', caption: 'Every Saturday, the pet store sells crickets by the cup.' },
      { img: 'story/open-2.webp', caption: 'This cup was for Duchess.' },
      { img: 'story/open-3.webp', caption: 'Pip had other plans.' },
    ],
    after: { img: 'story/open-4.webp', caption: 'The cup tipped. Everyone scattered into the dark house.' },
    skip: 'Hold {jump} to skip',
    home: 'Home, for now.',
    firstChirp: 'Press {chirp} to call. Somebody might answer.',
    stripeAnswers: 'Someone answered! Hold {listen} to hear which way.',
    pipVow: "I'm coming back for everyone. That's the plan. That's the whole plan.",
    tank: {
      tongs: 'The tongs! {left} {right} to dodge.',
      rim: 'Hold {jump} for a full-height leap.',
      tell: 'When she crouches and shakes her tail, get ready. When her shadow drops, HOP!', // [issue 32] what's on screen: the crouch and shake = get ready, the shadow = hop
      duchessWakes: ['Mm? Is it Saturday already?', '...Oh, hello, dinner.'],
      kick: '{kick} kicks. Loose pebbles make good steps.',
      squeeze: 'Jump into the gap with {jump} to squeeze through (or press {enter} under it).', // [issue #27]
      // [issue 7] [issue 25] the escape in the sand room (src/bosses/tank.js Sand): hide in the log to lose her
      hideLog: 'Hide in the log!',            // the note the script puts up as she wakes
      eaten: 'Duchess got her dinner. She crouches and shakes her tail: get ready. Her shadow drops: HOP! Then hide in the log →', // [issue 25] the card after a catch (not Gentle Mode)
      gentleOffer: 'Duchess is quick! Try Gentle Mode? (Slower tells, and she only shoos you.)', // [issue 25] after three catches
      exitShut: "Not with her right behind you! Lose her first: hide in the log.", // [issue 31] the crack is shut while she hunts
      caughtFirst: 'Too close! She crouches and shakes: get ready. Her shadow drops: HOP!', // Gentle Mode's catch (a roar and a skitter)
      caughtWalk: "Hey! She's not a pillow.",  // walking into her snout
      caughtLog: 'Run to the log! →',          // from the second catch (the log's outline pulses)
      caughtLogBack: '← Run back to the log!', // ... when the skitter lands him past the log
      bermBite: "Sand won't hide you. A cricket-sized gap will.", // once, when she bites a berm
      sniff: 'Mm? Where did dinner go?',
      shrug: 'Hmph. Nap time.',
      lost: "She's lost you. Squeeze out through the crack! →", // [issue 31] the way on opens as she turns away
    },
  },

  // Signs placed by zone builders: { type: 'sign', text: TEXT.signs.<key> } (or line('signs.<key>')).
  signs: {
    move: '{left} {right} to move. {jump} to jump.',
    tell: 'When she crouches and shakes her tail, get ready. When her shadow drops, HOP!', // [issue 32] the tank's note (tile 14)
    berm: 'Tail wiggling? Get behind a sand berm. She bites the sand: run up her back!', // [final-G] [issue 9]
    squeeze: 'Jump into the gap with {jump} to squeeze through (or press {enter} under it).', // [issue #27]
    jumpHold: 'Hold {jump} to jump higher. Tap it for a little hop.',
    kick: '{kick} kicks. Bugs flip over, scurry off and come back later. Nobody gets hurt.',
    chirp: '{chirp} chirps: it stuns little bugs and calls your friends.',
    listen: 'Stand still and hold {listen}. Crickets hear through their front legs.',
    listenStrip: 'The strip under the arrow shows the rhythm. Crickets chirp in short, steady groups.',
    carrier: 'Press {enter} at the Carrier to go inside.', // [polish-T] a verb, then the key
    save: 'Press {enter} at a baseboard crack to save. Every crack leads home to the Carrier.', // [issue 9] 2 lines on a phone
    hide: 'Press {enter} near a cricket-sized gap to hide. Nothing big can see you in there.',
    drop: '{down} + {jump} drops through thin platforms.',
    wallJump: 'Jump at a wall to stick, {jump} again to kick off. Glass and porcelain are too slick.', // [issue 9]
    floss: 'Press {use} near a hook to grab it. {left} {right} to swing. {jump} to let go with a fling.',
    flossDrop: '{use} again lets go straight down.',
    raft: 'Walk onto water with the Raft. Currents carry you along.',
    band: 'Hold {use} to stretch the Rubber Band, then let go to fly.',
    glider: 'Hold {jump} while falling to glide.',
    updraft: 'Warm air rises. Glide over the vents for a lift.',
    thimble: 'Press {down} + {jump} in the air to ground-pound. Cereal, plaster and piano keys give way.',
    glow: 'The Glow Bead lights the dark. Tap {use} to flash: night creatures hate it.',
    earplugs: 'Loud places make your legs ring. The Earplugs keep you steady.',
    feather: 'Press {jump} again in the air to flutter.',
    swap: '{swapPrev} {swapNext} swap crickets. A swap in the air waits until you land.',
    map: '{map} opens the map. Ledges you couldn\'t reach are marked.',
    sneak: 'That one can\'t be kicked. Hide and let it pass.',
    vacuum: 'The vacuum sweeps the same loop every time. Watch it, then go.',
    dark: 'It\'s too dark to see. Something down there is listening.',
    heat: 'Glowing burners are hot. Hop over them.',
    syrup: 'Sticky! Syrup slows you down.',
    cushion: 'Cushions are bouncy.',
    aphids: 'Aphids are harmless. And bouncy.',
    thermostat: 'A thermostat lock. It wants {n}°F. Someone who hears temperature could help.', // [issue 9]
    beaconMaze: 'Four sounds. Only one is a cricket. Listen to the rhythm.',
    cloak: 'Hold {cloak} in the open to vanish for a few seconds.',
    chute: 'The old laundry chute. One way only.',
    hatch: 'The attic hatch. A good pound would open it. From up here.',
  },

  // Refusals at gates (room needsMsg and toasts).
  gates: {
    cling: 'Too high to climb. If only you could stick to walls.',
    hook: 'Too far to jump. Something to swing from would help.',
    water: 'Water. Crickets don\'t swim. You\'d need something that floats.',
    height: 'Way too high. You\'d need a real boost.',
    glide: 'Too far to jump. If only you could float across.',
    cereal: 'Packed solid. A good hard pound from above might break it.',
    dark: 'Too dark to go in without a light. (Glow Bead)',
    loud: 'Too loud! Your legs ring. (Cotton Earplugs)',
    chimney: 'The bricks are slick with soot. You\'d need to flutter.',
    crack: 'A tiny crack. Someone very small could squeeze in.',
    damper: 'The damper is stuck. Only a proper chorus will shake it.',
    rescue: 'Not yet. Someone is still waiting in here.',
    cloak: 'No hiding spots at all. You\'d have to be invisible.',
  },

  ui: {
    ready: { title: 'Ready?', enter: 'Enter', change: 'Change trio', hint: 'Pick your trio. You can swap any time with {swapPrev} {swapNext}.' },
    zoneComplete: '{name} is safe!',
    returnToCarrier: 'Return to the Carrier?',
    yes: 'Yes', no: 'Not yet',
    goCarrier: 'Go to the Carrier',
    saved: 'Saved.',
    itemGet: 'You found the {item}!',
    heart: 'Seed-heart! +1 heart.',
    songSeed: 'Song-seed! Your chirp grows stronger.',
    crumbs: '+{n} crumbs',
    // [issue 33] what crumbs are for: the first one a save slot picks up, and the HUD counter's hover / tap
    crumbFirst: 'A crumb! Hang on to these: someone in this house trades for them.',
    crumbHint: 'Crumbs: hang on to them. Someone in this house trades for them.',
    crumbHintShop: 'Crumbs: spend them at Rolo\'s Crumb Shop in the Carrier.',
    duet: 'Pip and Chip, together! The music box opens: +{n} crumbs, and the Duet for the Stage.', // [fixer]
    shortcut: 'A secret shortcut!', // [fixer]
    // [issue 10] the ear guide: the first time it ever comes out, and what a click on it did
    earFirst: 'The ear points the way to go. Tap it to keep it out.',
    earPinned: 'Ear guide: pinned out. Double-click: {dbl}',
    earResting: 'Ear guide: resting. It comes out when it helps. Double-click: {dbl}',
    earDismissed: 'Ear guide: tucked away until it can help again.',
    earStaysOut: 'Ear guide: it stays out while Beacon chirps is Off.',
    earDblCall: 'the cricket sings only when you call.',
    earDblAuto: 'the cricket sings on its own.',
    checkpoint: 'Checkpoint',
    gentleOffer: 'That gecko is tricky. Try Gentle Mode? (Hits cost half, tells are slower.)',
    gentleOn: 'Gentle Mode is on.',
    controllerLost: 'Controller disconnected',
    controllerHint: 'Controllers work best in Chrome or Edge.',
    turnPhone: 'Turn your phone sideways to play.',
    pressAny: 'Press any key or button',
    heardHere: 'Heard here',
    stillMissing: 'Still missing:',
    missingEntry: '{name}: {zone}',
    noChirper: 'Hump can\'t chirp. Someone else takes the lead.',
    completion: '{n}% found',
  },

  // ---------------------------------------------------------------------------------------
  items: {
    booties:  { name: 'Tape Booties',       line: 'Double-sided tape, cricket-sized. Jump at a wall to stick, {jump} to kick off.' },
    floss:    { name: 'Floss Line',         line: 'Minty and very strong. Press {use} near a hook to swing.' },
    raft:     { name: 'Bottle-Cap Raft',    line: 'It floats! You are a sailor now.' },
    band:     { name: 'Rubber Band',        line: 'Hold {use} to stretch it, let go to fly.' },
    glider:   { name: 'Dryer-Sheet Glider', line: 'Smells like a spring meadow. Hold {jump} while falling to glide.' },
    thimble:  { name: 'Thimble Helmet',     line: 'A helmet! {down} + {jump} in the air to ground-pound.' },
    glow:     { name: 'Glow Bead',          line: 'It glows all by itself. Lights the dark; tap {use} to flash.' },
    earplugs: { name: 'Cotton Earplugs',    line: 'You hear with your legs, so these go on your knees. Loud places can\'t stop you now.' },
    feather:  { name: 'Swift Feather',      line: 'A gift from Soot. Press {jump} again in the air to flutter.' },
    cloak:    { name: 'Cellophane Cloak',   line: 'A crinkly sweet wrapper from a dragon\'s hoard. Hold {cloak} in the open to vanish.' },
    battery:  { name: 'Spare Battery',      line: 'Someone tired would love this.' },
    seedHeart: { name: 'Seed-heart',        line: '+1 heart.' },
    songSeed: { name: 'Song-seed',          line: 'Your chirp meter grows.' },
  },

  // ---------------------------------------------------------------------------------------
  // The ten geckos: 3 lines before (menace with manners), 2 after (good sport), plus extras.
  geckos: {
    duchess: { name: 'Duchess', species: 'Leopard gecko',
      hint: 'Stand behind a sand berm when her tail wiggles. She bites the sand: run up her back!', // [final-G] one line on the Ready card
      pre: ['Oh, hello, dinner.',
        'Oh, little one. You were supposed to be a snack. How terribly inconvenient for us both.',
        'Do come a little closer, darling. My eyes aren\'t what they were.'],
      post: ['Fair\'s fair, little one.', 'Off you go. I shall nap and pretend this never happened.'],
      dozing: 'Zzz... Saturday... cups...' },
    chikchak: { name: 'Chikchak', species: 'Common house gecko',
      hint: 'She hunts by sight. Hide in grout cracks or steam, and kick the glowing tap.', // [final-G] one line on the Ready card
      pre: ['Chik-chak-chak! Fooled you, sweetie.',
        'Everyone follows a chirp. Hardly anyone checks WHO is chirping.',
        'Into the steam with you, then. I always find my way to supper.'],
      post: ['Chak. Clever little thing.', 'Tell your katydid I\'m sorry about the soap dish. Mostly.'],
      lure: ['chik... chak... (over here! a cricket! a totally real cricket!)',
        'chik-chak-chak! (help, I am a cricket in great distress)',
        '(would a cricket say "sweetie"? hmm. forget I said that)',
        'Peekaboo! Oh, it\'s just steam. Pity.'],
      dozing: 'chik... zzz... chak...' },
    bigtok: { name: 'Big Tok', species: 'Tokay gecko',
      hint: "Jump his TO-KAY! shockwave. Kick a snack into the sink: he chews and can't bite.", // [final-G] one line on the Ready card
      pre: ['TO-KAY! ...Sorry. That\'s just how I say hello. TO-KAY!',
        'I BITE ANYTHING THAT MOVES. IT\'S A CONDITION.',
        'SO, FOR BOTH OUR SAKES, PLEASE HOLD STILL!'],
      post: ['TO-KAY... okay. Okay. You win, tiny.', 'MY JAW IS VERY TIRED. GOOD GAME. TO-KAY!'],
      dozing: 'to... kay... zzz...' },
    lashes: { name: 'Lashes', species: 'Crested gecko',
      hint: 'Drop fruit on his shelf: while he licks it, walk right past.', // [final-G] one line on the Ready card
      pre: ['*slurp* Pardon me. *slurp* You smell faintly of apricot.',
        'I\'m a fruit gecko, really. *slurp* Mango, fig, a little banana. But one does like a crunch.',
        'Shall we? *slurp* Do excuse the eye. I haven\'t any lids, you see.'],
      post: ['*slurp* Banana. Well played.', 'Do bring jam next time. *slurp* I\'ll behave. *slurp* Probably.'],
      dozing: '*slurp* ...zzz...' },
    peridot: { name: 'Peridot', species: 'Giant day gecko',
      hint: "Glide into the warm air, ride it up and kick the lamp chains. In the dark she's sleepy.", // [final-G] one line on the Ready card
      pre: ['Rise and shine, snack! Daytime is go time!',
        'I\'m a DAY gecko. Lights on, legs on! Lights off... let\'s not talk about lights off.',
        'Warm-up laps first! Then lunch. You\'re lunch. Let\'s GO!'],
      post: ['Hnnn... dark... cozy... good workout...', 'Same time tomorrow? *snore*'],
      dozing: '*snore* ...ten more laps... *snore*',
      flicker: 'Flicker! The chain slipped back. Ride up and tug it again!' }, // [final-G] phase 1 takes two tugs
    gargy: { name: 'Gargy', species: 'Gargoyle gecko',
      hint: 'Ground-pound a cushion beside a pillow: it flies up and bonks him.', // [final-G] one line on the Ready card
      pre: ['Ugh. Company.',
        'These are my cushions. I have sat on every one of them personally.',
        'Fine. I\'ll get up. A little. To swat you.'],
      post: ['Whatever. Take the noisy one.', 'Don\'t tell anyone a pillow beat me.'],
      dozing: 'mmf. five more minutes.',
      again: 'BONK. ...Hmph. He\'s still awake. Now from the other side!',
      otherSide: 'He\'s watching this cushion. Pound the one on his other side!' }, // [final-G] phase 1 takes two bonks
    mossy: { name: 'Mossy', species: 'Leaf-tailed gecko',
      hint: 'Chirp: his eyes shine for a moment. Tag him then!', // [final-G] one line on the Ready card
      pre: ['You can\'t see me, can you? Ha.',
        'I\'m a leaf. A hungry leaf. Leaves can be hungry.',
        'Ready or not! ...Oh, wait. YOU seek. I\'m already hidden.'],
      post: ['You found me! Nobody EVER finds me. Again? Please?', 'The bell cricket\'s yours. I\'ll be... somewhere. Guess where!'],
      dozing: '(a leaf, snoring softly)' },
    kite: { name: 'Kite', species: 'Flying gecko',
      hint: 'Chirp when he glides close: he drops in surprise.', // [final-G] one line on the Ready card
      pre: ['Watch this! No wings! Just flaps!',
        'I\'m the only gecko in the house who flies. Well. Glides. Stylishly.',
        'Catch me, catch your friend. Can\'t catch me, can\'t catch... you get it.'],
      post: ['Whoa! You startled me right out of the sky. Respect.', 'Nice flying, for a hopper. Race you again sometime?'],
      dozing: 'zzz... loop-the-loop... zzz...' },
    ember: { name: 'Ember', species: 'Cave gecko',
      hint: 'Stand still and she loses you. When her red eyes come close, flash the Glow Bead.', // [final-G] one line on the Ready card
      pre: ['W-who\'s there? Please don\'t turn on the light.',
        'I can hear you. Every little step. Tap, tap, tap.',
        'Stand very still and maybe I won\'t... oh. That\'s the trick, isn\'t it.'],
      post: ['Too bright! Too bright! ...You win.', 'Thank you for being quiet. Mostly. Come back and be quiet again sometime.'],
      dozing: '(a soft, contented blink in the dark)' },
    nana: { name: 'Nana', species: 'New Caledonian giant gecko',
      hint: 'Duck her tail, light the three stones, sing each its voice, then chirp on the beat.', // [final-G] one line on the Ready card
      pre: ['Mmm. Little voices, all the way up here. How lovely.',
        'Nana is ever so old, dears, and ever so hungry. Sing me something, or I\'ll have a snack instead.',
        'A low voice, a middle voice and a high one, please. Nana is particular.'],
      post: ['Oh... that was lovely... just like the old days...', 'Off you go, dears. Take your friend. Nana needs her nap.'],
      dozing: '(a growl so deep and gentle it sounds like purring)' },
    // [builder C] the Dragon's Lair (not a gecko, and he would like that noted)
    barty: { name: 'Sir Bartholomew', species: 'Bearded dragon',
      hint: "Keep out of his gaze. At the top, don't run: wave.", // [final-G] one line on the Ready card
      pre: ['WHO DARES disturb the hoard of Sir Bartholomew?',
        'I am NOT a gecko. I am a bearded dragon. There is a difference, and it is mostly beard.',
        'Behold my treasures! A button. Another button. A coin of great value. Probably.'],
      post: ['...Nobody ever waves.', 'Come back and wave again, little friend.'],
      waveHint: 'Some creatures say hello with a slow wave. Hold {listen} and press {kick}.' },
  },

  // ---------------------------------------------------------------------------------------
  // Crickets: thank-you when freed; one Carrier line per Carrier stage
  // (0: bare box, 0-2 rescues | 1: moss and a second level, 3 | 2: lights and ladder, 6 | 3: town, 9).
  crickets: {
    pip:    { thanks: "I'm coming back for everyone. That's the plan. That's the whole plan.",
              carrier: ['It echoes a bit in here. It won\'t for long.', 'Moss! It\'s starting to feel like home.', 'Listen to us. Listen to ALL of us.', 'A whole town. In a box. Who knew?'] },
    stripe: { thanks: 'Pip! I knew someone fast would come. Well. Someone came. Race you home!',
              carrier: ['I ran forty laps of this box. It\'s small.', 'A track! Watch me go!', 'New record. Probably. Nobody\'s timing.', 'I could run here forever. I might.'] },
    katy:   { thanks: 'Ka-ty-did! I mean, thank you. I\'m a katydid. A cousin. Not a cricket. Very close, though.',
              carrier: ['Cozy, for a box. Needs leaves.', 'A leaf hammock. Very proper.', 'Cousins are family too, you know.', 'Finest hammock in the house. I\'ve checked them all.'] },
    duo:    { thanks: 'Two spots, one big thank-you. That spice rack was not built for my size.',
              carrier: ['I\'d lift something, but there\'s nothing to lift.', 'These dice are heavy. Good.', 'Lift with the legs, everyone!', 'Strongest cricket in town. Also the only one doing push-ups.'] },
    frost:  { thanks: 'Brrr. I could tell you EXACTLY how cold it was in there. Thank you.',
              carrier: ['Sixty-nine degrees. I counted.', 'Count my chirps for fifteen seconds and add forty. Science!', 'Cozy and seventy-two. Everyone singing warms the place up.', 'Perfectly warm. I checked twice.'] },
    hump:   { thanks: '(taps a foot, very gratefully)',
              carrier: ['(taps hello)', '(drums softly on the bottle cap)', '(drums along with everyone)', '(the best drum solo you have ever seen)'] },
    jam:    { thanks: 'You came for me! Big respect, little Pip.',
              carrier: ['Walls are just floors standing up.', 'Up the wall and back. Again!', 'This lane is FAST.', 'Highest cricket in the Carrier. Literally.'] },
    rin:    { thanks: 'Ri-i-in. That is the sound of me being grateful.',
              carrier: ['A quiet box. I can fix that.', 'The bell rings when I sing.', 'Ri-i-in, ri-i-in. Everyone in tune now.', 'Our little town has a bell tower. It\'s me.'] },
    digby:  { thanks: 'Dug myself into a corner there. Well, a leaf. Thanks for shaking me loose.',
              carrier: ['Too much plastic. Not enough dirt.', 'Good soil. Proper soil.', 'I can hear you all from down in my burrow.', 'Tunnels everywhere. Tours on request.'] },
    mote:   { thanks: 'You found me! Most folks look right past me.',
              carrier: ['Everything here is so big.', 'A bunk my size!', 'Tiny door, tiny me, big town.', 'Best little house in the best little town.'] },
    chip:   { thanks: "Pip! You came all the way up here. I knew you'd sing us home.",
              carrier: ['Our old feeder cup is a bed now. Funny.', 'Remember the pet store? Me neither. Good.', 'Duet later?', 'We made it, Pip. All of us.'] },
  },

  // ---------------------------------------------------------------------------------------
  // Everyone else who talks. Recruits: meet (when found), join, carrier (in the hub), service.
  // Not-Crickets: meet is the 4-line gag; then join and carrier.
  npcs: {
    rolo: { name: 'Rolo', facility: 'Crumb Shop',
      meet: ['Oh! A visitor. I\'d roll up, but you look friendly.', 'Crumbs? You COLLECT crumbs? I could open a little shop...', 'I\'m a pill bug, by the way. Technically a crustacean. Like a tiny lobster. A dry one.'],
      join: 'Count me in. The Crumb Shop is open!',
      carrier: 'Crumbs for seeds, seeds for hearts. Fair trade!',
      service: ['What\'ll it be?', 'A fine choice. Very crunchy.', 'Not enough crumbs, I\'m afraid. Under the sofa is a good place to look.', 'Come again! I\'ll be right here. Rolling.'] },
    page: { name: 'Page', facility: 'Library',
      meet: ['Shh! I am reading.', 'Yes, I\'m a silverfish. No, I don\'t eat books. I read them. Mostly.', 'You hear all these sounds and write NOTHING down? Unthinkable.'],
      join: 'I shall keep a Sound Book for you. And a bestiary. Properly indexed.',
      carrier: 'Every sound in this house is a story.',
      service: ['The Sound Book: every sound you\'ve heard, and what it really is.', 'The bestiary: everyone you\'ve met, and a fact or two.', 'Quiet in the library, please. Except for the playing of sounds.'] },
    lumen: { name: 'Lumen', facility: 'Lamp and map table',
      meet: ['So... bright... so... round...', 'Oh! Sorry. You\'re not a lamp. I get confused.', 'Do you have a lamp? Can I live in your lamp?'],
      join: 'Take me home. I\'ll light it for you.',
      carrier: 'The map table glows where you\'ve found things. And where you haven\'t.',
      service: ['The map table: what\'s found and what\'s missing, room by room.', 'Ooh. Shiny. Sorry. What were we doing?'] },
    dot: { name: 'Dot', facility: 'Clinic',
      meet: ['Spots and all, at your service!', 'You look bruised, dear. All that jumping.', 'I was hiding from the rain. It\'s ever so loud on the glass.'],
      join: 'I\'ll patch you up at home. No charge. Spots are free.',
      carrier: 'Full heal, any time.',
      service: ['All better!', 'Tip: hold {listen} while standing still to hear which way the chirp comes from.', 'Tip: a swap pressed in the air waits until you land.', 'Tip: tiny spaces are the best hiding spots.', 'Tip: the tail tip always wiggles before a gecko strikes.', 'Tip: chirping while you hide gives you away to anything that listens.'] },
    weft: { name: 'Weft', facility: 'Hammocks and Weaver',
      meet: ['Eight legs, two big eyes, one heart. Don\'t be scared.', 'I\'m a jumping spider. I don\'t even do webs, really. Just a little silk now and then.', 'I sew. Maps, mostly. And hammocks.'],
      join: 'I\'ll stitch your map wherever you like.',
      carrier: 'Want a stitch on the map? Just ask.',
      service: ['Where shall I stitch?', 'There. Now you won\'t forget.', 'Hammocks are up. Sleep tight.'] },
    crumb: { name: 'Sgt. Crumb', facility: 'Trainer',
      meet: ['At ease, soldier.', 'I quit the colony. Too much marching, not enough jumping.', 'Look at those legs. Wasted on walking. Let me train you.'],
      join: 'Hut, hut! The Trainer is open!',
      carrier: 'Drop and give me twenty hops!',
      service: ['A time trial. One course per cricket. Beat my time.', 'Not bad, recruit. Not bad at all.', 'New record! I\'m writing it on a crumb.', 'Again! From the top!'] },
    glim: { name: 'Glim', facility: 'Night lights and the Stage',
      meet: ['Blink. Blink.', 'Sorry. Flirting with the light bulb. It never blinks back.', 'You hear songs? I COLLECT songs.'],
      join: 'I\'ll light your nights and run the Stage. Every song you\'ve heard!',
      carrier: 'Pick a song, any song.',
      service: ['The Stage: every song you\'ve heard, on request.', 'Blink if you want an encore.'] },
    shelly: { name: 'Shelly', facility: 'Post',
      meet: ['Thank you for the fresh air. That plug was mostly soap.', 'I\'m a snail. Not an insect. It doesn\'t matter. I don\'t want to talk about it.', 'I know every crack in this house. Slowly, but I know them.'],
      join: 'I\'ll carry your letters. And you. Crack to crack.',
      carrier: 'Post is open. Crack to crack, slow and sure.',
      service: ['Where to? Any crack you\'ve visited.', 'Off we go. Hold on to the shell.', 'Delivered. No rush. There\'s never a rush.'] },
    // Not-Crickets (each a 4-line gag, then they help and move in).
    beep: { name: 'Beep', facility: 'A very quiet doorbell',
      meet: ['BEEP.', '...beep. (I\'m not a cricket. I\'m so tired.)', 'Everyone follows the beep. Nobody ever brings a battery.', 'The camel cricket sat under me the whole time, tapping, so someone would come. Sweet boy. Take him home.'],
      battery: ['Is that... a battery? For me?', 'Oh. Oh, that\'s the stuff. I could beep for a hundred years.', 'I won\'t. But I could.'],
      join: 'I\'ll come along. I can be your doorbell. A very quiet one.',
      carrier: '(a very, very small beep)' },
    peeper: { name: 'Peeper', facility: 'Pond',
      meet: ['Peep! Peep! Peep!', 'What? No. NO. I\'m a FROG. A spring peeper. I sing for the ladies of the pond.', 'A cricket. Honestly. Do I LOOK like I rub my wings together?', 'Fine. A peep-off. Match my rhythm and I\'ll stop being offended.'],
      chirpOff: { start: 'One peep a second. Every second. Keep up.', good: 'Hmph. Not bad.', miss: 'That was a chirp. I said PEEP.', win: 'Fine! You can peep. I\'m impressed. Slightly.' },
      join: 'A pond? In your box? ...I\'ll think about it. (He is already packing.)',
      after: 'Peep. I\'m packing. A frog needs time to pack. Go on, I\'ll catch up.', // [fixer] after he has joined
      carrier: 'Peep. Still not a cricket.' },
    soot: { name: 'Soot', facility: 'Lookout tower',
      meet: ['Oh, here we go. Let me guess. You followed the chitter.',
        'Chimney sparrow? Chimney swallow? Chimney bat? Now cricket? I\'m a SWIFT.',
        'Those are my chicks. It\'s not a song, it\'s a racket, and they\'re very proud of it.',
        'Here. A feather. Flap it in the air and you\'ll climb anything. And the damper up top is stuck: only a proper chorus will shake it.'],
      join: 'When you\'ve a minute, I\'ll keep a lookout from your little box. Somebody has to.',
      carrier: 'Lookout is up. Swift by name. Swift by nature.',
      damperHint: 'Nine of you singing at once might do it. Eight won\'t. I\'ve been listening.' },
    velvet: { name: 'Velvet', facility: 'Echo map',
      meet: ['Bats aren\'t blind, sweetie. I saw you mistake me for a cricket.', 'Squeak. That\'s me laughing.', 'I can hear every room in this house. Every crumb. Every hiding cricket.', 'Come here. I\'ll draw it for you. The whole house, by echo.'],
      join: 'Every secret, on the echo map. Don\'t tell the moths.',
      carrier: 'I hear you\'ve been busy.' },
    barty: { name: 'Sir Bartholomew', facility: 'Hoard corner',
      meet: ['WHO DARES disturb the hoard of Sir Bartholomew?',
        'I am NOT a gecko. I am a bearded dragon. There is a difference, and it is mostly beard.',
        'Behold my treasures! A button. Another button. A coin of great value. Probably.'],
      search: ['I can smell cricket. Cricket, and... dust. Show yourself!', 'A dragon\'s eye misses nothing! ...It missed that.', 'Hm. Hmm. Hmmm.'],
      sweep: ['MY HOARD! Not one coin, thief!', 'I shall sweep you out like crumbs!'],
      wave: '...Nobody ever waves.',
      after: ['...Nobody ever waves. They run. Or they scream. Once, a moth fainted.',
        'You waved. A proper wave. Slow and polite.',
        'Here. The crinkly one. It makes you very hard to see. I never wanted to be hard to see. I wanted company.',
        'Come back and wave again, little friend. I\'ll be here. With my buttons.'],
      gift: 'A parcel from Sir Bartholomew: a button throne, and his second-best marble.',
      giftToast: 'Sir Bartholomew sent a gift to the Carrier.', // [fixer]
      carrier: 'A gift from Sir Bartholomew. He waves, sometimes, through the furnace grate.' },
    kid: { name: 'The kid' },
  },

  // One-line gags for the little sound-alikes (shown when you Listen or walk up).
  oneLiners: {
    hallAlarm: 'Beep. (A smoke alarm on the ceiling. Not a cricket. It needs a battery.)',
    squeakyToy: 'SQUEAK. (A rubber hedgehog. Definitely not a cricket.)',
    dryerSqueak: 'Eeeek. (The dryer door. It has never once been a cricket.)',
    hinge: 'Creeeak. (A door hinge. Very convincing. Not a cricket.)',
    fridge: 'Krrrk. (The fridge, settling. Not a cricket.)',
    clockRadio: 'Bip-bip. (A clock radio. Not even trying.)',
    frogVent: 'Peep... (from down the vent. Someone downstairs.)',
  },

  // [fixer] Duo's shove and Chip's duet (src/mechanics.js)
  push: { heavy: 'Too heavy to budge. (Duo could shove it.)' },
  duet: {
    wrong: 'Two keyholes. It wants two house crickets singing together.',
    half: 'One keyhole hums. Now the other voice, quick! ({swapNext})',
    need: 'One keyhole hums. It wants a second house cricket.',
    open: 'Pip and Chip, together. The music box plays!',
  },

  carrier: {
    grew: 'The Carrier grew!',
    arrive: '{name} moved in.',
    gift: '{name}\'s gift arrived.', // [polish-T] the same words as the toast in his lair ('sent a gift to the Carrier')
    // [fixer] Sir Bartholomew stays in his lair
    stage: ['A bare plastic box. Home, for now.', 'Moss on the floor and a second level!', 'String lights, a ladder and windows!', 'Rooftops and a garden. A real cricket town.'],
    sing: ['Everyone is home but one.', 'Listen. We are all singing at once.', 'Far above, up the chimney, something rattles open.'],
    singToast: 'The Attic damper rattled open.',
    empty: '{name}\'s spot is waiting.',
  },
  damper: { shut: 'Only a proper chorus will shake it.', missing: 'Still missing:', allFound: 'Everyone\'s found. Go home to the Carrier and sing together.', /* [polish-T] */ open: 'The damper is open. The Attic is up there.' },
  nana: { rule: 'Her stones want a low, a middle and a high voice.', low: 'Low (3.5 kHz or under)', mid: 'Middle (4 to 5 kHz)', high: 'High (5.5 kHz or over)', suggest: 'Suggest a trio', need: 'Your trio needs a {voice} voice.', chorus: 'Sing! {chirp} on the beat.', louder: 'Louder!',
    p1: 'Kick {kick} each music stone to wake it. Tail wiggling? Hide ({enter} at a gap) or dodge.', // [issue 9] 2 lines
    p2: 'Each stone wants one voice. {swapPrev} {swapNext} swap, then {chirp} beside the stone.',
    wants: 'The {stone} wants a {voice} voice.', fork: 'tuning fork', glass: 'glass', bell: 'bell' },
  hump: { cheer: "I'll cheer from here.", tap: '(tap tap tap)' },
  thermostat: { reading: '{n}°F', want: 'It wants {n}°F.', open: 'Click! The lock opens.', frostHint: 'Frost can tell the temperature from her own chirp. Bring her here.' },

  // ---------------------------------------------------------------------------------------
  // The Sound Book (Page's Library): every sound, with a one-line real fact (RESEARCH.md).
  sounds: {
    pip:    { name: 'House cricket (Pip)', fact: 'Only male crickets sing. A house cricket rubs a scraper on one wing along a toothed file on the other: 2 or 3 pulses per chirp, around 4.8 kHz.' },
    chip:   { name: 'House cricket (Chip)', fact: 'House crickets chirp faster when it\'s warm: anywhere from 40 to 200 chirps a minute.' },
    stripe: { name: 'Banded cricket (Stripe)', fact: 'Banded crickets sing higher than house crickets, around 6 kHz, with quicker chirps.' },
    katy:   { name: 'True katydid (Katy)', fact: 'Katydids are cricket cousins. Their loud rasp of 2 to 4 pulses sounds like "ka-ty-did".' },
    duo:    { name: 'Two-spotted cricket (Duo)', fact: 'Two-spotted crickets sing 3 to 5 pulses per chirp, 3 or 4 chirps a second.' },
    frost:  { name: 'Snowy tree cricket (Frost)', fact: 'The thermometer cricket: count her chirps in 15 seconds and add 40 to get the temperature in °F (Dolbear\'s law, 1897).' },
    hump:   { name: 'Camel cricket (Hump)', fact: 'Camel crickets have no wings, so they can\'t sing at all. Hump taps instead.' },
    jam:    { name: 'Jamaican field cricket (Jam)', fact: 'Field crickets are the classic outdoor chirpers; Jam\'s 3-pulse chirp sits around 4.5 kHz.' },
    rin:    { name: 'Bell cricket (Rin)', fact: 'The bell cricket\'s song rings like a tiny bell: "ri-i-in". In Japan people kept them in little cages to hear it.' },
    digby:  { name: 'Mole cricket (Digby)', fact: 'Mole crickets sing a low droning trill (about 2.5 kHz) from a burrow that works like a loudspeaker.' },
    mote:   { name: 'Ground cricket (Mote)', fact: 'Ground crickets are tiny, and their trill is high and faint: 7 to 8 kHz.' },
    ears:   { name: 'How crickets hear', fact: 'Crickets hear through eardrums on their front legs. That\'s why Listen means standing still.' },
    rivalry: { name: 'Rivalry song', fact: 'Crickets have three songs: calling (loud and steady), courtship (soft) and rivalry (loud, fast and harsh). Trapped crickets answer your call with a rivalry burst.' },
    alarm:  { name: 'Smoke alarm (Beep)', fact: 'A smoke alarm with a low battery chirps once every 30 to 60 seconds. It\'s the thing most often mistaken for a cricket.' },
    chikchak: { name: 'Common house gecko (Chikchak)', fact: 'House geckos really do chirp: a run of 6 to 9 "chik-chak"s, often at dusk.' },
    tokay:  { name: 'Tokay gecko (Big Tok)', fact: 'Tokay geckos are named after their loud call: "to-KAY!".' },
    lashes: { name: 'Crested gecko (Lashes)', fact: 'Crested geckos chirp and bark now and then. Mostly they lick fruit. And their eyes.' },
    nana:   { name: 'New Caledonian giant gecko (Nana)', fact: 'The biggest gecko alive, and it growls. Locals call it "the devil in the trees". Nana prefers "Nana".' },
    peeper: { name: 'Spring peeper (Peeper)', fact: 'Spring peepers are tiny tree frogs. Their clear rising "peep", about once a second, is often mistaken for crickets.' },
    soot:   { name: 'Chimney swift (Soot)', fact: 'Chimney swift chicks make a loud rattling chitter inside chimneys. People usually blame bats. Old names: chimney swallow, chimney sweep, chimney bat.' },
    velvet: { name: 'Bat (Velvet)', fact: 'Bats aren\'t blind. You can hear their squeaks and chitters in attics at dusk.' },
    fridge: { name: 'The fridge', fact: 'Fridges creak and tick as their plastic warms and cools. Not a cricket.' },
    squeak: { name: 'Squeaky toy', fact: 'A rubber toy squeaks when air rushes through a tiny reed inside. Not a cricket.' },
    hinge:  { name: 'Door hinge', fact: 'A dry hinge squeaks because metal sticks and slips against metal, over and over. Not a cricket.' },
    vacuum: { name: 'Robot vacuum', fact: 'A robot vacuum finds its way with bump sensors and remembers the room. It does not remember you.' },
    furnace: { name: 'The furnace', fact: 'A furnace rumbles on and off all night to keep the house warm, which is why crickets chirp faster near it.' },
    rain:   { name: 'Rain on glass', fact: 'Rain on a glass roof is loud for a cricket, whose ears are on its knees.' },
    tell:   { name: 'The tail tip', fact: 'Hunting geckos wiggle the tip of their tail just before they strike. Watch for it.' },
    growl:  { name: 'Gecko growl', fact: 'Most geckos are quiet, but some chirp, bark, click or growl.' },
  },

  // The bestiary (Page): a real fact per creature. Enemies are bonked, never hurt.
  bestiary: {
    ant:        { name: 'Worker ant', fact: 'Every worker ant is a female. They follow scent trails that their sisters lay down.' },
    antsoldier: { name: 'Ant soldier', fact: 'Some ant colonies have big-headed soldiers with huge jaws, for guarding the nest.' },
    aphid:      { name: 'Aphid herd', fact: 'Aphids sip plant sap. Some ants "farm" them for the sweet honeydew they make.' },
    beetle:     { name: 'Darkling beetle', fact: 'Mealworms, the OTHER gecko food, are darkling beetle larvae. These ones grew up.' },
    booklouse:  { name: 'Booklouse', fact: 'Booklice aren\'t lice. They nibble the tiny mould that grows on old paper and glue.' },
    cellarspider: { name: 'Cellar spider', fact: 'When disturbed, a cellar spider shakes its web so fast it becomes a blur.' },
    centipede:  { name: 'House centipede', fact: 'A grown house centipede has 15 pairs of long legs, and hunts other household bugs.' },
    clothesmoth: { name: 'Clothes moth', fact: 'It\'s the caterpillars that eat wool. Grown clothes moths don\'t eat at all.' },
    cockroach:  { name: 'Cockroach', fact: 'Like crickets, cockroaches feel moving air through two little tail feelers called cerci.' },
    dustbunny:  { name: 'Dust bunny', fact: 'Not a bunny. Not even alive. Just fluff, hair and dust, held together by static.' },
    earwig:     { name: 'Earwig', fact: 'Earwigs don\'t crawl into ears. Mother earwigs guard their eggs and keep them clean.' },
    fruitflies: { name: 'Fruit fly swarm', fact: 'Fruit flies were among the first animals sent into space, in 1947.' },
    mites:      { name: 'Dust mites', fact: 'Far too small to see on their own; they live in dust and feed on tiny flakes of skin.' },
    mosquito:   { name: 'Mosquito', fact: 'Only female mosquitoes bite. The males drink flower nectar.' },
    silverfish: { name: 'Silverfish', fact: 'Silverfish are wingless insects from one of the oldest insect families on Earth.' },
    stinkbug:   { name: 'Stink bug', fact: 'Stink bugs release their smell from glands on their middle when they feel threatened.' },
    wasp:       { name: 'Wasp', fact: 'Paper wasps chew wood into pulp and build their nests out of homemade paper.' },
    weevil:     { name: 'Rice weevil', fact: 'A mother rice weevil chews a hole in a grain of rice and lays one egg inside.' },
    wolfspider: { name: 'Wolf spider', fact: 'Wolf spider mothers carry their babies on their backs. Their eyes shine in torchlight.' },
    vacuum:     { name: 'The robot vacuum', fact: 'It sweeps the same loop every night. Loud, hungry for crumbs, and not interested in conversation.' },
    duchess:    { name: 'Duchess (leopard gecko)', fact: 'Leopard geckos have real eyelids and blink, unlike most geckos.' },
    chikchak:   { name: 'Chikchak (common house gecko)', fact: 'House geckos chirp to each other at dusk. A gecko that chirps!' },
    bigtok:     { name: 'Big Tok (tokay gecko)', fact: 'Tokays are famous for their loud call and their strong bite.' },
    lashes:     { name: 'Lashes (crested gecko)', fact: 'Crested geckos have no eyelids, so they lick their eyes to clean them. They love fruit.' },
    peridot:    { name: 'Peridot (giant day gecko)', fact: 'Day geckos are bright green and, unusually for geckos, active in the daytime.' },
    gargy:      { name: 'Gargy (gargoyle gecko)', fact: 'Gargoyle geckos are named for the knobbly bumps on their heads.' },
    mossy:      { name: 'Mossy (leaf-tailed gecko)', fact: 'Leaf-tailed geckos are camouflage masters: their tails look just like a dead leaf.' },
    kite:       { name: 'Kite (flying gecko)', fact: 'Flying geckos glide on flaps of skin along their sides, legs and tail.' },
    ember:      { name: 'Ember (cave gecko)', fact: 'Cave geckos are night hunters with eyelids, and some have glowing reddish eyes.' },
    nana:       { name: 'Nana (New Caledonian giant gecko)', fact: 'The largest gecko in the world. It lives in the treetops and growls.' },
    barty:      { name: 'Sir Bartholomew (bearded dragon)', fact: 'Bearded dragons head-bob, turn their beards black when excited, and wave one arm slowly to say "I mean no harm".' },
  },

  // ---------------------------------------------------------------------------------------
  ending: {
    panels: [
      { img: 'story/end-1.webp', caption: 'Nana fell asleep. The whole house sang.' },
      { img: 'story/end-2.webp', caption: 'In the morning, the kid found the Carrier full of crickets, and a trail of crumbs.' },
      { img: 'story/end-3.webp', caption: 'Now the geckos get fruit-mix gecko food. Lashes approves.' },
      { img: 'story/end-4.webp', caption: 'The Carrier sits on the sunny windowsill by the open garden window. Nobody leaves. Everybody sings.' },
    ],
    thanks: 'Thank you for playing',
    back: 'Back to the Carrier',
  },
  credits: [
    ['House Cricket', ''],
    ['An idea by', 'Rich Conlan'],
    ['Made with', 'gamegen'],
    ['Paintings and sprites', 'OpenAI image models and Google Gemini, by way of gamegen'],
    ['Music and sound', 'ElevenLabs, by way of gamegen. Cricket songs synthesized from the research on real crickets'],
    ['Type', 'Patrick Hand by Patrick Wagesreiter, Nunito by Vernon Adams and the Nunito Project (SIL Open Font License)'],
    ['Thanks to', 'every cricket that ever sang under a bed'],
  ],

  howto: {
    keys: 'Keyboard', touch: 'Touch', pad: 'Controller',
    padNote: 'Plug in a PS5 or other controller and press any button. Works best in Chrome or Edge.',
    touchNote: 'Turn your phone sideways. The stick appears where your left thumb lands.',
    report: 'Ctrl+Shift+F: report a bug',
    ear: 'The ear beside the sound button comes out to point the way to go: while you listen, after the cricket answers your chirp, and when you seem lost. Tap it to keep it out. Settings > Ear guide.', // [issue 10]
    crumbs: 'Crumbs (top right): for trading', // [issue 33] a How to Play row, beside Pause
  },
  shop: {
    heart: { name: 'Seed-heart', desc: '+1 heart' },
    song: { name: 'Song-seed', desc: 'Your chirp meter grows' },
    ear: { name: 'Big ears', desc: 'Listen reaches farther' },
    broke: 'Not enough crumbs.',
    bought: 'Bought!',
  },
  clinic: ['All better!', 'Tip: hold {listen} while standing still to hear which way the chirp comes from.', 'Tip: a swap pressed in the air waits until you land.', 'Tip: tiny spaces are the best hiding spots.', 'Tip: the tail tip always wiggles before a gecko strikes.'],
  trainer: 'Drop and give me twenty hops! Pick a cricket and beat my time.',
};

export default TEXT;
