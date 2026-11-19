// The Metroidvania keys (design: "Items"). id -> what the engine reads.
// gate: the kind of obstacle the item opens (rooms/tiles/zones name these kinds).
export const ITEMS = {
  booties:  { name: 'Tape Booties',       gate: 'cling',  verb: 'Wall-cling and wall-jump',   color: '#E8D9A8' },
  floss:    { name: 'Floss Line',         gate: 'hook',   verb: 'Use near a hook to swing',    color: '#E9F1EE' },
  raft:     { name: 'Bottle-Cap Raft',    gate: 'water',  verb: 'Float on water',              color: '#C8564B' },
  band:     { name: 'Rubber Band',        gate: 'height', verb: 'Hold Use to super-jump',      color: '#D99A3E' },
  glider:   { name: 'Dryer-Sheet Glider', gate: 'glide',  verb: 'Hold Jump while falling to glide', color: '#F4F2F8' },
  thimble:  { name: 'Thimble Helmet',     gate: 'cereal', verb: 'Down + Jump in the air to ground-pound', color: '#B9BDC4' },
  glow:     { name: 'Glow Bead',          gate: 'dark',   verb: 'Lights dark rooms; tap Use to flash', color: '#CFF27A' },
  earplugs: { name: 'Cotton Earplugs',    gate: 'loud',   verb: 'Walk through loud zones',     color: '#F4EBDD' },
  feather:  { name: 'Swift Feather',      gate: 'chimney', verb: 'Press Jump in the air to flutter', color: '#5A4632' },
  cloak:    { name: 'Cellophane Cloak',   gate: 'cloak',  verb: 'Hold Shift (or stick up) in the open to vanish', color: '#C9D6E8' },
  // quest items: carried, open no gate kind; an npc with give:'battery' takes it (Beep in laun-lair)
  battery:  { name: 'Spare Battery',      gate: null,     verb: 'Someone tired would love this.', color: '#7A8C99', quest: true },
};
export const ITEM_IDS = Object.keys(ITEMS);
// The Metroidvania keys only (no quest items).
export const KEY_ITEMS = ITEM_IDS.filter((id) => !ITEMS[id].quest);
// Items that give the Use button something to do (touch shows Use once one is held).
export const USE_ITEMS = ['floss', 'band', 'glow'];
