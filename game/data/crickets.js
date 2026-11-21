// The 11 playable crickets (design: "Rescued crickets"). Stats are 1..5.
// spd/jmp feed the movement table; chp = chirp radius and stun; wt = weight (light falls slowly).
// color/dark/accent are the shape fallback colours until sprites land; scale is the species scale.
// antenna: length multiplier and colour for the code-drawn antennae (they stay with the sprites).
export const CRICKETS = {
  pip:    { n: 0,  name: 'Pip',    species: 'House cricket',        khz: 4.8, spd: 3, jmp: 3, chp: 3, wt: 3, perk: 'listen2',    perkName: 'Listen shows the beacon twice as far',            scale: 1.0, color: '#C9A46A', dark: '#6B4E2E', accent: '#3E2F22', antenna: { len: 1.0,  color: '#5A4632' } },
  stripe: { n: 1,  name: 'Stripe', species: 'Banded cricket',       khz: 6.0, spd: 5, jmp: 3, chp: 2, wt: 2, perk: 'dash',       perkName: 'Dash: double-tap a direction',                     scale: 1.0, color: '#B88A55', dark: '#4A3424', accent: '#E8D3A8', antenna: { len: 1.0,  color: '#4A3424' } },
  katy:   { n: 2,  name: 'Katy',   species: 'True katydid',         khz: 3.0, spd: 3, jmp: 3, chp: 3, wt: 2, perk: 'longGlide',  perkName: 'Long glide (with the Glider)',                     scale: 1.05, color: '#8FB35A', dark: '#4C6B2C', accent: '#C9DD8F', antenna: { len: 1.5,  color: '#5E7A3A' } },
  duo:    { n: 3,  name: 'Duo',    species: 'Two-spotted cricket',  khz: 4.6, spd: 2, jmp: 2, chp: 4, wt: 5, perk: 'shove',      perkName: 'Shove: pushes a heavy box a tile at a time',       scale: 1.2, color: '#3A3230', dark: '#1C1716', accent: '#E8C24A', antenna: { len: 0.95, color: '#2A2220' } },
  frost:  { n: 4,  name: 'Frost',  species: 'Snowy tree cricket',   khz: 3.0, spd: 3, jmp: 4, chp: 2, wt: 1, perk: 'thermometer', perkName: 'Thermometer: reads the temperature from her chirp', scale: 0.95, color: '#CFE0B8', dark: '#7F9A6C', accent: '#F4F8EC', antenna: { len: 1.2,  color: '#9AB088' } },
  hump:   { n: 5,  name: 'Hump',   species: 'Camel cricket',        khz: 0,   spd: 3, jmp: 5, chp: 0, wt: 3, perk: 'hugeLeap',   perkName: 'Huge leap: hold down, then Jump',                  scale: 1.1, color: '#A57B52', dark: '#5C3F27', accent: '#D4B28A', antenna: { len: 1.8,  color: '#6B4A2E' } },
  jam:    { n: 6,  name: 'Jam',    species: 'Jamaican field cricket', khz: 4.5, spd: 5, jmp: 3, chp: 3, wt: 3, perk: 'wallRun',  perkName: 'Wall-run: runs 3 tiles up a wall',                 scale: 1.0, color: '#6E4A33', dark: '#33221A', accent: '#D98A3E', antenna: { len: 1.0,  color: '#3A281D' } },
  rin:    { n: 7,  name: 'Rin',    species: 'Bell cricket',         khz: 4.0, spd: 2, jmp: 3, chp: 5, wt: 2, perk: 'lullaby',    perkName: 'Lullaby: chirp-stun lasts 3x as long',             scale: 0.95, color: '#2E2A28', dark: '#151211', accent: '#DCD6C8', antenna: { len: 1.1,  color: '#1E1A18', band: '#F4EBDD' } },
  digby:  { n: 8,  name: 'Digby',  species: 'Mole cricket',         khz: 2.5, spd: 2, jmp: 2, chp: 4, wt: 4, perk: 'dig',        perkName: 'Dig through soft soil and sand',                   scale: 1.1, color: '#8A6844', dark: '#4E3824', accent: '#C2A27A', antenna: { len: 0.45, color: '#4E3824' } },
  mote:   { n: 9,  name: 'Mote',   species: 'Ground cricket',       khz: 7.5, spd: 4, jmp: 3, chp: 1, wt: 1, perk: 'tiny',       perkName: 'Tiny: fits through crack-sized gaps',              scale: 0.7, color: '#9C8468', dark: '#5A4A3A', accent: '#CDB89C', antenna: { len: 0.9,  color: '#5A4A3A' } },
  chip:   { n: 10, name: 'Chip',   species: 'House cricket',        khz: 4.9, spd: 3, jmp: 3, chp: 3, wt: 3, perk: 'duet',       perkName: 'Duet: opens harmony doors with Pip',               scale: 1.0, color: '#C4A06A', dark: '#664A2C', accent: '#3E2F22', antenna: { len: 1.0,  color: '#5A4632' } },
};

export const CRICKET_IDS = Object.keys(CRICKETS);
