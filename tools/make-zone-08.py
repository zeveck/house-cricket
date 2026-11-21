"""Zone 8, the Sunroom (builder C). Writes game/data/rooms/zone-08.js.
Run from anywhere:  python3 tools/make-zone-08.py [--dump room-id ...]
Main path (Jump 2 / Speed 2): sun-door (start) -> fronds up into sun-fern -> the canopy (three
glide gaps of 9 tiles: the Glider is the gate) -> drop onto the potting bench (Cotton Earplugs,
sound hole) -> the floor -> sun-glass: up the ivy, through the roaring downpipe tunnel (a loud
zone with a low ceiling: the Earplugs are the gate) -> save 2 + the lair door at the top.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from zonegen_c import Zone

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PAL = ['#9CC97A', '#5E9A52', '#DDEBE3', '#C77B56']

z = Zone('z08-sunroom', 8, 'Sunroom', header='Zone 8: the Sunroom (builder C). Plant canopy, misters, aphids, soft soil, loud rain.',
         palette=PAL, bg='z08-sunroom', music='z08-sunroom', temp=76,
         start={'room': 'sun-door'}, beaconVoice='mole',
         lair={'room': 'sun-glass', 'x': 15, 'y': 2},
         # [issue 22] the bench floor and the Glass Corner lie past the sound hole (the long way back
         # round by the canopy), so the hole phase's first -20 dB is 1.15x the way in from the French Doors
         # (then on down to -24 at the zone's far side)
         beaconSpan={'hole': 1.15},
         decoys=[{'voice': 'peeper', 'room': 'sun-pots', 'x': 31, 'y': 28, 'every': 1}],
         near=['fake-plant', 'leaf-glider', 'water-dish'], motes=True)


def zig(r, x, y0, y1, xmin, xmax, d=1, w=5, shift=4, ch='='):
    """One-way fronds every 2 rows from row y0 up to row y1, each overlapping the last by a tile,
    zig-zagging between columns xmin..xmax. Returns (x, d) of the last frond."""
    y = y0
    while y >= y1:
        r.plat(x, y, w, ch)
        nx = x + d * shift
        if nx < xmin or nx + w - 1 > xmax:
            d = -d; nx = x + d * shift
        x, y = nx, y - 2
    return x - d * shift, d


def stairs(r, steps, ch='='):
    for (x0, x1, y) in steps:
        r.plat(x0, y, x1 - x0 + 1, ch)


# ------------------------------------------------------------------ sun-door (25,7) 1x2
r = z.room('sun-door', 'The French Doors', 25, 7, 1, 2, bg={'v': 'a', 'x': 0.1, 'y': 0.8})
r.floor(34)
r.clear(0, 30, 1, 4)            # left: liv-hearth threshold (exact: cell 25,8 rows 12-15)
r.clear(31, 30, 1, 4)           # right: sun-pots
r.clear(3, 0, 26, 1)            # top: up into the fern stand
r.put(4, 33, 'P').put(8, 33, 'S')
# the doormat step and the fern stand's base tiers (fronds are one-way)
DX, DD = zig(r, 12, 32, 0, 2, 29, d=1)
r.ent('aphid', x=14, y=33, range=[12, 18])
r.ent('aphid', x=22, y=33, range=[20, 25])
r.ent('sign', x=2, y=33, w=8, text='Aphids are harmless. And bouncy.')
r.ent('sign', x=13, y=33, w=8, text='{down} + {jump} drops through the fronds.')
r.deco('fake-plant', 28, 33, 3.2, layer='back')
r.deco('water-dish', 6, 33, 0.8, layer='mid')
r.ent('checkpoint', x=9, y=19)

# ------------------------------------------------------------------ sun-fern (25,5) 1x2
r = z.room('sun-fern', 'The Fern Stand', 25, 5, 1, 2, bg={'v': 'b', 'x': 0.2, 'y': 0.4})
r.clear(3, 35, 26, 1)           # bottom: the door's fronds
r.clear(31, 4, 1, 12)           # right: the canopy (rows 4-15)
# the stand: a shelf tier at row 26 with # legs, fronds up to the canopy ledge (row 16)
r.fill(1, 26, 9, 1, '#')        # the stand's lower shelf (left)
r.fill(3, 22, 1, 4, '%')        # the Mote crack into the hollow back post
r.fill(1, 21, 3, 1, '#')
fx = DX + DD * 4
if fx < 4 or fx + 4 > 28: DD = -DD; fx = DX + DD * 4
FX, FD = zig(r, fx, 34, 18, 4, 28, d=FD if False else DD)
r.plat(13, 16, 9)                # the last fronds ...
r.fill(22, 16, 10, 1, '#')      # ... and the ledge out to the canopy
r.fill(28, 17, 4, 1, '#')
r.ent('crumbs', x=1, y=25, n=25)
r.ent('secret', id='sun-mote', x=2, y=25)
r.ent('mosquito', x=6, y=9, sight=5)
r.ent('checkpoint', x=25, y=15)
r.deco('fake-plant', 5, 25, 3.0, layer='back')
r.deco('leaf-glider', 14, 27, 1.0, layer='mid')  # [issue 40] fallen on the plank, not hanging in the air
r.deco('fake-plant', 27, 21, 2.4, layer='back', flip=True)
r.deco('fake-plant', 23, 15, 2.2, layer='back')
r.deco('mister-nozzle', 6, 3, 1.2, layer='back')

# ------------------------------------------------------------------ sun-canopy (26,5) 4x2
r = z.room('sun-canopy', 'The Canopy', 26, 5, 4, 2, loops=['rain-roof'], bg={'v': 'a', 'x': 0.5, 'y': 0.2})
r.decor.append({'gecko': 'kite', 'x': 30, 'y': 33, 'len': 240, 'pose': 'sleep', 'layer': 'mid', 'after': 'digby'})  # dozing after the fight (builder B's gecko decor)
r.fill(1, 1, 126, 1, 'G')       # the glass roof (never clingable)
r.fill(127, 0, 1, 36, 'G')      # the glass end wall
r.clear(0, 4, 1, 12)            # left: from the fern
r.fill(0, 16, 1, 1, '#')
r.fill(1, 16, 7, 1, '#')        # A: the entry ledge (row 16)
r.fill(16, 16, 6, 1, '#')       # B: basket, 8 tiles of air out
r.fill(30, 17, 6, 1, '#')       # C: basket, 8 tiles out, a tile lower
r.fill(44, 18, 6, 1, '#')       # D: basket, 8 tiles out
r.fill(54, 20, 13, 1, '#')      # E: the big macrame tray over the bench
r.fill(62, 21, 2, 14, 'G')      # the glass partition under E (no walking round the baskets)
r.clear(67, 35, 27, 1)          # bottom: the drop onto the potting bench (cell 28, cols 3-29)
# the floor of pot tops (left) and a frond stair back up to the entry ledge
r.fill(1, 34, 61, 1, '#')
stairs(r, [(3, 7, 32), (9, 13, 30), (3, 7, 28), (9, 13, 26), (3, 7, 24), (9, 13, 22), (3, 7, 20), (8, 11, 18)])
# the right half: a bench-side floor, Katy's launch basket, the far basket, the roof ridge
r.fill(94, 34, 33, 1, '#')
stairs(r, [(96, 100, 32), (102, 106, 30), (96, 100, 28), (102, 106, 26), (96, 100, 24)])
r.fill(96, 22, 6, 1, '#')       # F: the launch basket (row 22)
r.fill(113, 22, 6, 1, '#')      # the far basket, 11 tiles of air out: only Katy's long glide gets there (sim-measured)
r.fill(104, 5, 5, 1, 'G')       # the roof ridge (a mister + a flutter)
# hooks: hanging basket chains over the hole (optional swing to the right half)
for hx, hy in [(69, 16), (75, 17), (81, 18), (87, 19)]:
    r.put(hx, hy, 'H')
r.fill(91, 23, 5, 1, '#')       # a basket at the end of the chains
r.ent('lift', kind='mister', x=14, y=12, w=2, h=22, vy=7, on=2, off=2)   # a mister back up from the pot tops
r.ent('lift', kind='mister', x=100, y=8, w=2, h=14, vy=6, on=1.2, off=2, phase=0.5)
r.ent('secret', id='sun-katy', x=115, y=21)
r.ent('secret', id='sun-songseed-ridge', x=106, y=4)
r.ent('wasp', x=55, y=12, sight=7)
r.ent('wasp', x=110, y=14, sight=7)
r.ent('checkpoint', x=4, y=15)
r.ent('checkpoint', x=60, y=19)
r.ent('sign', x=1, y=15, w=6, text='Hold {jump} while falling to glide.')
for x, y in [(18, 16), (32, 17), (46, 18), (58, 20), (64, 20), (93, 23)]:     # hanging baskets on their chains
    r.deco('leaf-glider', x, y - 0.7, 1.4, layer='mid')  # [issue 40] a fallen leaf in the basket (its foot a little into the basket's painted top, not over its face)
for x, y, h in [(10, 33, 3.0), (30, 33, 4.0), (48, 33, 3.4), (110, 33, 3.6), (122, 33, 2.6), (99, 21, 1.6), (117, 21, 1.4)]:
    r.deco('fake-plant', x, y, h, layer='back', flip=x % 2 == 0)
r.deco('mister-nozzle', 15, 33, 1.0, layer='mid')
r.deco('mister-nozzle', 101, 21, 1.0, layer='mid')
r.deco('hook', 20, 3, 1.0, layer='back')
r.deco('hook', 50, 3, 1.0, layer='back')
r.paint_box('soil', 1, 34, 61, 1)
r.paint_box('soil', 94, 34, 33, 1)

# ------------------------------------------------------------------ sun-pots (26,7) 2x2
r = z.room('sun-pots', 'The Potted Plants', 26, 7, 2, 2, bg={'v': 'b', 'x': 0.4, 'y': 0.85}, terrainKinds={'s': 'soil'})
r.floor(34)
r.clear(0, 30, 1, 4)            # left: sun-door
r.clear(63, 30, 1, 4)           # right: sun-bench
def pot(x0, x1, top, soil=1):
    r.fill(x0, top, x1 - x0 + 1, 34 - top, '#')
    r.fill(x0, top, x1 - x0 + 1, soil, 's')
pot(8, 12, 32)                  # a little pot
pot(16, 23, 30)                 # a big pot
pot(27, 35, 30)                 # Peeper's pot
pot(37, 39, 28)                 # a tall narrow one
pot(40, 49, 28, soil=1)         # the deep pot (Digby)
r.fill(44, 29, 3, 4, 's')       # deep soil down to a buried song-seed
r.clear(44, 33, 3, 1)
pot(50, 51, 30)
pot(53, 57, 32)
r.ent('secret', id='sun-digby', x=45, y=33)
r.ent('aphid', x=25, y=33, range=[24, 26])
r.ent('aphid', x=14, y=33, range=[13, 15])
r.ent('npc', who='peeper', x=31, y=29, talk='npcs.peeper.meet')
r.ent('switch', id='sun-peeper', by='rhythm', x=31, y=29, draw=False, hear=8, n=4, beat=60, tol=15,
      good='Hmph. Not bad.', miss='That was a chirp. I said PEEP.',
      then=[['dialog', {'lines': [['peeper', 'Fine! You can peep. I\'m impressed. Slightly.'], ['peeper', 'A pond? In your box? ...I\'ll think about it.']], 'id': 'peeper-win'}],
            ['recruit', {'id': 'peeper'}]])
r.ent('sign', x=24, y=29, w=6, text='Chirp {chirp} once a second, four times.')
r.ent('crumbs', x=54, y=17, n=10)
stairs(r, [(52, 56, 26), (57, 61, 24), (52, 56, 22), (57, 61, 20), (52, 56, 18)])
r.deco('fake-plant', 20, 29, 4.2, layer='back')
r.deco('fake-plant', 10, 31, 2.2, layer='back', flip=True)
r.deco('fake-plant', 44, 27, 4.8, layer='back')
r.deco('fake-plant', 55, 31, 2.6, layer='back', flip=True)
r.deco('fake-plant', 38, 27, 3.2, layer='back')
r.deco('water-dish', 3, 33, 0.8, layer='mid')
r.deco('leaf-glider', 59, 19, 1.0, layer='mid', rot=0.25)

# ------------------------------------------------------------------ sun-bench (28,7) 2x2
# noWay [issue 21]: the floor (rows 26 down) can't climb to the bench top or the drop from the canopy
# (rows 0-24): the beacon's path (src/beacon.js) goes round by the canopy instead of up the slick side
r = z.room('sun-bench', 'The Potting Bench', 28, 7, 2, 2, temp={'left': 86, 'right': 66}, bg={'v': 'a', 'x': 0.7, 'y': 0.75},
           noWay=[{'from': [0, 26, 64, 10], 'to': [0, 0, 64, 25]}])
r.floor(34)
r.clear(3, 0, 27, 1)            # top: the drop from the canopy
r.clear(0, 30, 1, 4)            # left: sun-pots
r.clear(63, 30, 1, 4)           # right: sun-glass
r.fill(2, 24, 40, 1, '#')       # the bench top (10 tiles above the floor)
r.fill(2, 25, 40, 1, 'G')
r.fill(0, 1, 1, 29, 'G')        # the bench side against the wall: too slick to climb (the canopy is the way up)
r.fill(44, 1, 19, 1, 'G')       # the glass wall's frame
r.fill(60, 2, 3, 24, 'G')       # the cold glass (right)
r.fill(26, 20, 4, 1, '#')       # the thermostat's cubby roof
r.put(15, 23, 'B')              # the seed tray's drainage hole (sound hole)
r.ent('item', item='earplugs', x=13, y=23)
r.ent('thermostat', id='sun-thermo', x=27, y=21, target=78)
r.ent('gate', id='sun-thermo-door', x=31, y=21, w=1, h=3, opens={'switch': 'sun-thermo'})
r.fill(32, 20, 11, 1, '#')
r.fill(42, 21, 1, 4, '#')
r.ent('secret', id='sun-thermo', x=33, y=23)
r.ent('crumbs', x=34, y=23, n=40)
r.ent('sign', x=19, y=23, w=6, text='A thermostat lock. It wants 78°F.')
# the floor: pots of soil, a step up to the glass corner
r.fill(10, 32, 4, 2, '#'); r.fill(10, 32, 4, 1, 's')
r.fill(48, 32, 5, 2, '#'); r.fill(48, 32, 5, 1, 's')
r.ent('aphid', x=30, y=33, range=[24, 36])
r.ent('checkpoint', x=4, y=23)
r.deco('fake-plant', 6, 23, 2.0, layer='mid')
r.deco('fake-plant', 22, 23, 2.4, layer='back', flip=True)
r.deco('fake-plant', 38, 23, 1.8, layer='mid')
r.deco('sponge', 9, 23, 0.7, layer='mid')
r.deco('fake-plant', 12, 31, 2.6, layer='back')
r.deco('fake-plant', 50, 31, 3.0, layer='back', flip=True)
r.deco('water-dish', 40, 33, 0.8, layer='mid')
r.paint_box('soil', 4, 24, 20, 1)

# ------------------------------------------------------------------ sun-glass (30,7) 2x2
r = z.room('sun-glass', 'The Glass Corner', 30, 7, 2, 2, loops=['rain-roof'], bg={'v': 'b', 'x': 0.85, 'y': 0.5})
r.floor(34)
r.clear(0, 30, 1, 4)            # left: sun-bench
r.clear(12, 0, 8, 1)            # top: the lair (cols 12-19)
r.plat(12, 1, 8)                # the last frond under the lair gap
r.fill(1, 21, 62, 2, '#')       # the slab between the floor and the upper corner
r.clear(57, 21, 5, 1)           # ... with the ivy gap
r.plat(57, 22, 5)
r.fill(24, 1, 39, 17, '#')      # the downpipe housing (the tunnel runs under it)
r.fill(52, 1, 3, 17, 'G')       # the downpipe itself
# ivy up from the floor to the gap
stairs(r, [(36, 40, 32), (42, 46, 30), (48, 52, 28), (54, 58, 26), (58, 61, 24)])
# the upper corner: fronds up to the lair ledge (row 3)
zig(r, 17, 19, 5, 2, 22, d=-1)
r.fill(6, 3, 18, 1, '#')        # the lair ledge
r.clear(12, 3, 8, 1)            # ... open under the lair gap: fronds instead
r.plat(12, 3, 8)
r.put(21, 2, 'S')
r.ent('lair', boss='kite', x=15, y=2, w=2, h=2, to='sun-lair', at=[16, 34])
r.ent('beacon', x=15, y=1, after=True)
r.ent('loud', x=30, y=18, w=17, h=3)   # the downpipe's roar across the tunnel (low ceiling)
r.ent('npc', who='dot', x=40, y=20, recruit='dot')
r.ent('sign', x=50, y=20, w=8, text='Loud places make your legs ring. The Earplugs keep you steady.')
r.ent('checkpoint', x=58, y=20)
r.ent('checkpoint', x=10, y=20)
r.deco('fake-plant', 4, 33, 2.6, layer='back')
r.deco('fake-plant', 30, 33, 3.2, layer='back', flip=True)
r.deco('steam-puff', 53, 20, 2.0, layer='front', alpha=0.5)
r.deco('fake-plant', 44, 29, 2.0, layer='back')
r.deco('fake-plant', 11, 14, 2.0, layer='back', flip=True)
r.deco('save-crack', 21, 2, 1.0, layer='back')
r.ent('sign', x=7, y=2, w=6, text='Something big is gliding about up there.')

# ------------------------------------------------------------------ sun-lair (30,5) 2x2
r = z.room('sun-lair', 'The High Canopy', 30, 5, 2, 2, music='boss', loops=['rain-roof'], bg={'v': 'a', 'x': 0.9, 'y': 0.3}, terrainKinds={'s': 'soil'})
r.fill(1, 1, 62, 1, 'G')        # glass roof
r.floor(34)
r.clear(12, 34, 8, 1)           # the gap down to the glass corner
r.plat(12, 35, 8)               # ... one-way, so you can drop back down
r.fill(26, 34, 15, 1, 's')      # the soil bed Digby lands in
r.put(16, 34, 'P')
# fronds up to the middle perch and the side towers
stairs(r, [(28, 31, 32), (33, 36, 30), (28, 31, 28)])
r.fill(31, 26, 5, 1, '=')       # the middle perch (under his loop)
stairs(r, [(3, 7, 32), (9, 13, 30), (3, 7, 28)])
r.fill(8, 26, 6, 1, '#')        # left basket
stairs(r, [(56, 60, 32), (50, 54, 30), (56, 60, 28)])
r.fill(50, 26, 6, 1, '#')       # right basket
# the high baskets (phase 3): misters lift you up to them
r.fill(3, 15, 6, 1, '#')
r.fill(55, 15, 6, 1, '#')
r.ent('lift', kind='mister', x=1, y=14, w=2, h=20, vy=10, on=3, off=1.5)
r.ent('lift', kind='mister', x=61, y=14, w=2, h=20, vy=10, on=3, off=1.5, phase=2)
for hx, hy in [(19, 20), (25, 21), (39, 21), (45, 20)]:
    r.put(hx, hy, 'H')
r.ent('boss', boss='kite', x=33, y=25, cricket='digby', checkpoints=[[16, 34], [16, 34], [16, 34]])
for x, y in [(10, 26), (52, 26), (5, 15), (58, 15), (33, 26)]:     # [issue 40] fallen leaves lying on the baskets and planks (y - 1: on top, not over the face)
    r.deco('leaf-glider', x, y - 1, 1.3, layer='mid')
for x, y, h in [(22, 33, 3.4), (44, 33, 3.0), (6, 33, 2.4), (58, 33, 2.6)]:
    r.deco('fake-plant', x, y, h, layer='back', flip=x > 32)
r.deco('mister-nozzle', 2, 33, 1.0, layer='mid')
r.deco('mister-nozzle', 62, 33, 1.0, layer='mid', flip=True)

if __name__ == '__main__':
    if '--dump' in sys.argv:
        z.dump(sys.argv[sys.argv.index('--dump') + 1:])
    z.write(os.path.join(ROOT, 'game', 'data', 'rooms', 'zone-08.js'))
