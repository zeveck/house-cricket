// Every line the meta screens show, looked up by key. The writing bible is game/data/text.js
// (the world architect's); until a key exists there, the fallback below is used, so text.js
// drops in without code changes. Keys are dotted paths: line('geckos.duchess.pre').
import * as BIBLE from '../data/text.js'; // the writing bible (the world architect's); FALLBACK fills any gap

const FALLBACK = {
  opening: {
    panels: [
      { img: 'story/open-1.webp', caption: 'Every Saturday, the pet store sells crickets by the cup.' },
      { img: 'story/open-2.webp', caption: 'This cup was for Duchess.' },
      { img: 'story/open-3.webp', caption: 'Pip had other plans.' },
    ],
    after: { img: 'story/open-4.webp', caption: 'The cup tipped. Everyone scattered into the dark house.' },
    home: 'Home, for now.',
    firstChirp: 'Press {chirp} to call. Somebody might answer.',
  },
  ending: {
    panels: [
      { img: 'story/end-1.webp', caption: 'Nana sleeps. The whole house sings.' },
      { img: 'story/end-2.webp', caption: 'In the morning, the kid finds a box full of crickets, and a trail of crumbs.' },
      { img: 'story/end-3.webp', caption: 'The geckos get fruit-mix gecko food now. Lashes approves.' },
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
    ['Music and sound', 'ElevenLabs, by way of gamegen; cricket songs synthesized from real recordings research'],
    ['Type', 'Patrick Hand by Patrick Wagesreiter, Nunito by Vernon Adams and the Nunito Project (SIL Open Font License)'],
    ['Thanks to', 'every cricket that ever sang under a bed'],
  ],
  crickets: {
    pip:    { thanks: "I'm coming back for everyone. I promise.", carrier: ['It echoes a bit in here.', 'It feels like home now.', 'Listen to us all!', 'A whole town. Who knew?'] },
    stripe: { thanks: 'Pip! I knew someone fast would come. Race you home!', carrier: ['A track! Watch me go.', 'New record, probably.', 'Lap forty. Still fresh.', 'I could run here forever.'] },
    katy:   { thanks: 'Ka-ty-did! I mean, thank you. Katydid. Not a cricket, a cousin.', carrier: ['A leaf hammock. Very proper.', 'Cousins are family too.', 'I rasp, they chirp. We harmonize.', 'Finest hammock in the house.'] },
    duo:    { thanks: 'Two spots, one big thank-you.', carrier: ['These dice are heavy. Good.', 'Lift with the legs.', 'Spotted you from the dice.', 'Strongest cricket in town.'] },
    frost:  { thanks: "Brrr. I can tell you exactly how cold that was. Thank you.", carrier: ['Seventy-one degrees in here. Lovely.', 'Count my chirps, add forty. Science!', 'Cozy and seventy-two.', 'Perfectly warm. I checked.'] },
    hump:   { thanks: '(taps a foot, very gratefully)', carrier: ['(drums on the bottle cap)', '(drums a little louder)', '(drums along with everyone)', '(the best drum solo you have ever seen)'] },
    jam:    { thanks: 'Ya come for me! Big respect, little Pip.', carrier: ['Up the wall and back.', 'This lane is fast.', 'Walls are just floors standing up.', 'Highest cricket in the Carrier.'] },
    rin:    { thanks: 'Ri-i-in. That is the sound of me being grateful.', carrier: ['The bell rings when I sing.', 'Ri-i-in, ri-i-in.', 'Everyone sings in tune now.', 'Our little town has a bell tower.'] },
    digby:  { thanks: "Dug myself into a corner there. Thanks.", carrier: ['Good soil. Proper soil.', 'Burrow is coming along.', 'I can hear you all from down here.', 'Tunnels everywhere, if you want a tour.'] },
    mote:   { thanks: 'You found me! Most folks look right past me.', carrier: ['A bunk my size!', 'Tiny door, tiny me.', 'I can see everyone from up here.', 'Best little house in town.'] },
    chip:   { thanks: "Pip! You came all the way up here. I knew you'd sing us home.", carrier: ['Our old feeder cup is a bed now.', 'Remember the pet store?', 'Duet later?', 'We made it, Pip. All of us.'] },
  },
  geckos: {
    duchess:  { name: 'Duchess',  pre: ['Oh, hello, dinner.', 'I was bought a cupful of you, you know. Paid for.', 'Do come a little closer, darling.'], post: ["Fair's fair, little one.", 'Go on. I shall nap instead.'] },
    chikchak: { name: 'Chikchak', pre: ['Chik-chak! Fooled you.', 'You thought I was a cricket? Everyone does.', 'Now hold still in the steam, sweetie.'], post: ['Chak. You win, clever thing.', "Tell your friend I'm sorry about the soap dish."] },
    bigtok:   { name: 'Big Tok',  pre: ['TO-KAY!', 'I BITE ANYTHING THAT MOVES!', 'SO PLEASE MOVE!'], post: ['TO-KAY... okay.', 'MY JAW HURTS. GOOD GAME.'] },
    lashes:   { name: 'Lashes',   pre: ['Ah, a guest. *slurp* Pardon me.', 'I prefer fruit, honestly. *slurp* But a cricket is a cricket.', 'Shall we dine? *slurp*'], post: ['Mmm, banana. *slurp* You may go.', 'Bring jam next time. *slurp*'] },
    peridot:  { name: 'Peridot',  pre: ['Morning, sunshine! Ready for cardio?', "I'm fastest when the lights are on!", "Let's go, let's go!"], post: ['Yawn. Nap time. Good workout.', 'Same time tomorrow?'] },
    gargy:    { name: 'Gargy',    pre: ['Ugh. Visitors.', "Don't touch my cushions.", 'Fine. I will swat you.'], post: ['Whatever. Take him.', "Don't tell anyone a pillow beat me."] },
    mossy:    { name: 'Mossy',    pre: ['You cannot see me.', 'I am a leaf. A very hungry leaf.', 'Ready or not!'], post: ['Found me! Nobody ever finds me.', 'Again sometime? Please?'] },
    kite:     { name: 'Kite',     pre: ['Watch this!', 'No hands! No wings! Just flaps!', 'Catch me if you can, tiny.'], post: ['You startled me! Fair landing.', 'Nice flying, for a hopper.'] },
    ember:    { name: 'Ember',    pre: ['W-who is there?', 'I can hear you breathing, little one.', 'Please don\'t turn on the lights.'], post: ['Too bright... you win.', 'Thank you for being quiet, mostly.'] },
    nana:     { name: 'Nana',     pre: ['Mmm. Little voices.', 'Sing me something, dears, or I shall have a snack.', 'A low voice, a middle voice, and a high one, please.'], post: ['Oh, that was lovely...', 'Off you go. Nana needs her nap.'] },
  },
  npcs: {
    rolo:   { name: 'Rolo',   meet: ['Oh! Hello. I roll up when I am nervous.', 'You collect crumbs? I could open a little shop...', 'Count me in. The Crumb Shop is open!'], carrier: 'Crumbs for seeds, seeds for hearts. Fair trade!', facility: 'Crumb Shop' },
    page:   { name: 'Page',   meet: ['Shh! I am reading.', 'You hear sounds and write nothing down? Unthinkable.', 'I shall keep a Sound Book for you.'], carrier: 'Every sound in this house is a story.', facility: 'Library' },
    lumen:  { name: 'Lumen',  meet: ['So... bright...', 'Oh, sorry. You are not a lamp.', 'Take me home. I will light it for you.'], carrier: 'The map table glows when you find things.', facility: 'Map table' },
    dot:    { name: 'Dot',    meet: ['Spots and all, at your service!', 'You look bruised, dear.', 'I will patch you up at home.'], carrier: 'Full heal, no charge. Spots are free.', facility: 'Clinic' },
    weft:   { name: 'Weft',   meet: ['Eight legs, one heart. Do not be scared.', 'I sew. Maps, mostly.', 'I will stitch your map wherever you like.'], carrier: 'Want a stitch on the map? Just ask.', facility: 'Weaver' },
    crumb:  { name: 'Sgt. Crumb', meet: ['At ease, soldier.', 'I quit the colony. Too much marching, not enough jumping.', 'I will train you. Hut, hut!'], carrier: 'Drop and give me twenty hops!', facility: 'Trainer' },
    glim:   { name: 'Glim',   meet: ['Blink. Blink.', 'I collect songs. Got any?', 'I will run the Stage. Every song you hear!'], carrier: 'Pick a song, any song.', facility: 'Stage' },
    shelly: { name: 'Shelly', meet: ['A snail. Not an insect. It does not matter.', 'I know every crack in this house.', 'I will carry your letters. And you.'], carrier: 'Post is open. Crack to crack, slow and sure.', facility: 'Post' },
    peeper: { name: 'Peeper', meet: ['Peep!', 'I am NOT a cricket.', 'I sing to impress frogs.', 'Fine. I will move into your pond.'], carrier: 'Peep. Still not a cricket.', facility: 'Pond' },
    soot:   { name: 'Soot',   meet: ['Chimney sparrow?', 'Chimney swallow? Chimney bat?', 'Now CRICKET? I am a SWIFT.', 'Here. A feather. Go climb something.'], carrier: 'Lookout is up. Swift by name.', facility: 'Lookout' },
    velvet: { name: 'Velvet', meet: ['Squeak. Not blind, by the way.', 'Not a cricket either.', 'I can hear the whole house.', 'I will draw it for you.'], carrier: 'Every secret, on the echo map.', facility: 'Echo map' },
    beep:   { name: 'Beep',   meet: ['BEEP.', 'Sorry. Tired.', 'I am a battery. Not a cricket.', 'I will be your doorbell. A quiet one.'], carrier: '(a very small beep)', facility: 'Doorbell' },
    barty:  { name: 'Sir Bartholomew', meet: ['...Nobody ever waves.'], carrier: 'A gift from Sir Bartholomew.', facility: 'Hoard corner' },
  },
  carrier: {
    grew: 'The Carrier grew!',
    arrive: '{name} moved in.',
    sing: ['Everyone is home but one.', 'Listen. We are all singing at once.', 'Far above, up the chimney, something rattles open.'],
    singToast: 'The Attic damper rattled open.',
  },
  damper: { shut: 'Only a proper chorus will shake it.', missing: 'Still missing:' },
  nana: { rule: 'Her stones want a low, a middle and a high voice.', low: 'Low (3.5 kHz or under)', mid: 'Middle (4 to 5 kHz)', high: 'High (5.5 kHz or over)' },
  hump: { cheer: "I'll cheer from here." },
  sounds: {
    pip:    { name: 'House cricket (Pip)',      fact: 'Only male crickets sing, by rubbing a scraper on one wing against a file on the other.' },
    stripe: { name: 'Banded cricket (Stripe)',  fact: 'Banded crickets chirp faster and higher than house crickets.' },
    katy:   { name: 'True katydid (Katy)',      fact: 'Katydids are cricket cousins; their rasp sounds like "ka-ty-did".' },
    duo:    { name: 'Two-spotted cricket (Duo)', fact: 'Two-spotted crickets sing long, rapid pulse trains.' },
    frost:  { name: 'Snowy tree cricket (Frost)', fact: 'Count snowy tree cricket chirps in 15 seconds and add 40: that is the temperature in Fahrenheit (Dolbear\'s law).' },
    hump:   { name: 'Camel cricket (Hump)',     fact: 'Camel crickets have no wings, so they cannot sing at all.' },
    jam:    { name: 'Jamaican field cricket (Jam)', fact: 'Field crickets sing from the mouths of their burrows to carry the sound.' },
    rin:    { name: 'Bell cricket (Rin)',       fact: 'In Japan, bell crickets were kept in little cages for their ringing song.' },
    digby:  { name: 'Mole cricket (Digby)',     fact: 'Mole crickets dig horn-shaped burrows that make their song louder.' },
    mote:   { name: 'Ground cricket (Mote)',    fact: 'Ground crickets are tiny, and their trills are high and faint.' },
    chip:   { name: 'House cricket (Chip)',     fact: 'House crickets came to Europe from Asia, riding along with people.' },
    alarm:  { name: 'Smoke alarm (Beep)',       fact: 'A smoke alarm chirps about once a minute when its battery is low. Not a cricket.' },
    chikchak: { name: 'House gecko (Chikchak)', fact: 'Common house geckos really do chirp: "chik-chak-chak".' },
    peeper: { name: 'Spring peeper (Peeper)',   fact: 'Spring peepers are tiny tree frogs with a rising "peep", once a second.' },
    soot:   { name: 'Chimney swift (Soot)',     fact: 'Chimney swift chicks chitter from inside chimneys. Swifts, not sparrows.' },
    velvet: { name: 'Bat (Velvet)',             fact: 'Bats are not blind; many also use echolocation to "see" with sound.' },
    tokay:  { name: 'Tokay gecko (Big Tok)',    fact: 'Tokay geckos are named for their loud "to-kay" call.' },
  },
  howto: {
    keys: 'Keyboard',
    touch: 'Touch',
    pad: 'Controller',
    padNote: 'Plug in a PS5 or other controller and press any button. Works best in Chrome or Edge.',
    touchNote: 'Turn your phone sideways. The joystick (bottom left) follows your left thumb.',
    report: 'Ctrl+Shift+F: report a bug',
  },
  shop: {
    heart: { name: 'Seed-heart', desc: '+1 heart' },
    song: { name: 'Song-seed', desc: 'Chirp refills faster' },
    ear: { name: 'Big ears', desc: 'Listen reaches farther' },
    broke: 'Not enough crumbs.',
    bought: 'Bought!',
  },
  clinic: ['All better!', 'Tip: hold Listen while standing still to hear which way the chirp comes from.', 'Tip: a swap pressed in the air waits until you land.', 'Tip: tiny spaces are the best hiding spots.'],
  trainer: 'Time trials are being set up. Come back soon, soldier.',
};

const text = BIBLE.TEXT || BIBLE.default || BIBLE;

function dig(obj, path) {
  let o = obj;
  for (const k of path.split('.')) { if (o == null) return undefined; o = o[k]; }
  return o;
}
// line('geckos.duchess.name') -> the bible's value, else the fallback, else the key's last part.
export function line(key, vars) {
  let v = dig(text, key);
  if (v === undefined) v = dig(FALLBACK, key);
  if (v === undefined) return key.split('.').pop();
  if (typeof v === 'string' && vars) v = v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return v;
}
export function has(key) { return dig(text, key) !== undefined || dig(FALLBACK, key) !== undefined; }
export { FALLBACK };
