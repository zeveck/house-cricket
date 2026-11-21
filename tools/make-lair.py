#!/usr/bin/env python3
"""Builder C: the optional Dragon's Lair (design: "The Dragon's Lair", design/zones/lair.md).
Writes game/data/rooms/lair.js.   python3 tools/make-lair.py [--dump]

lair-gap (24,13): the crawl gap behind the furnace (left edge rows 13-15, floor 16-17, exact with
bas-furnace), a dusty corridor glowing orange, save crack + the "Ready?" door.
dragon-lair (25,12, 3x2): Sir Bartholomew's vivarium. Hoard tiers rise left to right under the
basking lamp: the floor (tier 1), tier 2 (stand row 27), the top of the hoard (stand row 19).
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from zonegen_c import Zone

z = Zone('lair', 'lair', "The Dragon's Lair",
         header="The optional Dragon's Lair behind the furnace (builder C). Sir Bartholomew: src/bosses/barty.js.",
         palette=['#4F5B6E', '#E07A3A', '#B9BDC4', '#26303D'], bg='z09-basement', music='lair', temp=90,
         start={'room': 'lair-gap'}, near=['marble', 'pebble', 'furnace-grate'])

# ---------------------------------------------------------------- lair-gap
g = z.room('lair-gap', 'Behind the Furnace', 24, 13, 1, 1, dark=True, needs='glow',
           needsMsg='Too dark to go in without a light. (Glow Bead)', bg={'v': 'b', 'mirror': True, 'x': 0.8, 'y': 0.7})
g.floor(16)                       # floor rows 16-17
g.fill(0, 0, 32, 3, '#')          # dusty duct ceiling
g.fill(0, 3, 9, 10, '#')          # the furnace's back: a 3-tile crawl at the left (rows 13-15)
g.fill(9, 3, 4, 6, '#'); g.fill(13, 3, 3, 3, '#')   # the ceiling steps up: the corridor opens out
g.clear(0, 13, 1, 3)              # exact: rows 13-15 open on the left edge
g.clear(31, 12, 1, 4)             # rows 12-15 open on the right edge (into the vivarium)
g.fill(24, 3, 8, 6, '#')          # lintel over the vivarium door
g.plat(18, 12, 4)                 # an old pipe bracket to hop on (decor ledge)
g.put(11, 15, 'S')                # save crack
g.ent('lair', boss='barty', x=27, y=15, w=3, h=3, to='dragon-lair', at=[3, 33])
g.ent('sign', x=13, y=15, w=6, text='Warm air. Orange light. Somebody big is breathing in there.')
g.ent('beacon', x=29, y=13, after=True)
g.deco('furnace-grate', 4, 15, 3.0, layer='back', alpha=0.9)
g.deco('save-crack', 11, 15, 1.6, layer='back')
g.deco('pebble', 16, 15, 0.7, layer='mid')
g.deco('marble', 22, 15, 0.8, layer='mid')
g.deco('candy-wrapper', 25, 15, 0.7, layer='mid', rot=-0.2)
g.deco('hoard-coins', 30, 15, 1.4, layer='back', alpha=0.85)
g.deco('pull-chain', 20, 8, 6.0, layer='back', alpha=0.7)  # [issue 40] long enough to reach the ceiling it hangs from
g.o['fx'] = [{'kind': 'dust', 'x': 10, 'y': 4, 'w': 20, 'h': 11}, {'kind': 'motes', 'x': 24, 'y': 9, 'w': 7, 'h': 6}]
g.o['paint'] = None

# ---------------------------------------------------------------- dragon-lair
d = z.room('dragon-lair', "The Dragon's Lair", 25, 12, 3, 2, bg={'v': 'a', 'x': 0.6, 'y': 0.75})
W = d.w  # 96
# the glass vivarium: walls and lid are glass (never clingable)
d.fill(0, 0, W, 1, 'G'); d.fill(W - 1, 0, 1, 36, 'G'); d.fill(0, 0, 1, 36, 'G')
d.floor(34)                                       # tier 1: the vivarium floor (stand row 33)
d.clear(0, 30, 1, 4)                              # the door from lair-gap (rows 30-33 = cell rows 12-15)
d.fill(0, 26, 2, 4, 'G')                          # door frame above the opening

# the hoard, solid underneath every surface; tops are listed as (x0, x1, top row)
tops = [
    (30, 33, 32),   # first coin step (2 up)
    (34, 37, 30),   # second
    (38, 57, 28),   # tier 2 (stand row 27)
    (58, 61, 26),
    (62, 65, 24),   # the climb to the top
    (66, 69, 22),
    (70, 79, 20),   # the top of the hoard, under the lamp (stand row 19)
    (80, 87, 22),
    (88, 94, 24),   # the far side slopes down behind the summit (his side)
]
for x0, x1, top in tops:
    d.fill(x0, top, x1 - x0 + 1, 34 - top, '#')
    d.paint_box('cereal', x0, top, x1 - x0 + 1, 34 - top)   # the hoard: knobbly heaps, not stone
# toppled coin stacks on the floor: one-way stepping stones (flow, and a teaser line up)
d.plat(12, 30, 3); d.plat(20, 29, 3)
d.plat(45, 24, 3)                                  # a button ledge over tier 2 (a peek spot, open view)

# hiding spots: bottle caps (4) on the floor and tier 2; coin gaps (5) up the climb
caps = [(7, 33), (16, 33), (25, 33), (50, 27)]
for x, y in caps:
    d.ent('hide', x=x, y=y, w=2, art='bottle-cap')
coins = [(35, 29), (40, 27), (56, 27), (63, 23), (67, 21)]
for x, y in coins:
    d.ent('hide', x=x, y=y, w=1, art='hoard-coins')

d.ent('sign', x=2, y=33, w=5, text='Press {enter} near a bottle cap to duck under it. He hunts with his eye, and his ears.')
d.ent('sign', x=71, y=19, w=6, text='Some creatures say hello with a slow wave. Hold {listen} and press {kick}.')
d.ent('boss', boss='barty', x=86, y=19, checkpoints=[[3, 33], [39, 27], [71, 19]])

# decor: the hoard piles (painted on the solid steps), the lamp, the glass
deco = d.deco
deco('hoard-pile', 31, 31, 2.4, layer='mid'); deco('hoard-coins', 36, 29, 2.0, layer='mid')
deco('hoard-buttons', 43, 27, 1.6, layer='mid', alpha=0.95); deco('marble', 47, 27, 0.9, layer='mid')
deco('hoard-coins', 53, 27, 1.5, layer='mid'); deco('hoard-pile', 60, 25, 2.2, layer='mid')
deco('hoard-buttons', 64, 23, 1.8, layer='mid'); deco('hoard-pile', 68, 21, 2.0, layer='mid')
deco('candy-wrapper', 78, 19, 0.8, layer='mid', rot=0.1); deco('marble', 71, 19, 0.8, layer='back')
deco('hoard-coins', 85, 21, 1.8, layer='mid'); deco('hoard-pile', 91, 23, 2.4, layer='mid')
deco('pebble', 4, 33, 0.8, layer='mid'); deco('marble', 11, 33, 0.9, layer='mid')
deco('candy-wrapper', 21, 33, 0.8, layer='mid', rot=-0.15); deco('hoard-coins', 28, 33, 1.0, layer='mid')
deco('pebble-chip', 25.5, 33, 0.5, layer='mid')  # [issue 40] on the floor, not on the hoard's face
deco('hoard-pile', 40, 33, 3.4, layer='back', alpha=0.8); deco('hoard-pile', 62, 33, 4.0, layer='back', alpha=0.8)
deco('hoard-coins', 80, 33, 3.5, layer='back', alpha=0.8)
deco('mesh-lid', 48, 1, 0.9, layer='back', alpha=0.7)
deco('pull-chain', 76, 7, 6.0, layer='back')                      # the basking lamp's cord
d.o['fx'] = [{'kind': 'motes', 'x': 62, 'y': 4, 'w': 24, 'h': 14}, {'kind': 'dust', 'x': 5, 'y': 6, 'w': 40, 'h': 20}]
d.paint_box('sand', 1, 34, 94, 2)

if g.o.get('paint') is None:
    del g.o['paint']
if '--dump' in sys.argv:
    z.dump()
z.write(os.path.join(os.path.dirname(__file__), '..', 'game', 'data', 'rooms', 'lair.js'))
