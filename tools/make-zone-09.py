"""Zone 9, the Basement (builder C): draws the eight rooms and writes game/data/rooms/zone-09.js.
    python3 tools/make-zone-09.py [--dump room-id ...]
Every room is dark (needs the Glow Bead) except the furnace room (lit by the furnace) and Ember's
den (dark; the boss paints its own light). See design/zones/z09.md and game/data/house.js.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from zonegen_c import Zone

DARK = 'Too dark to go in without a light. (Glow Bead)'
z = Zone('z09-basement', 9, 'Basement',
         header='Zone 9: the Basement. Darkness and the Glow Bead, the beetle sneak, the sump, the coal chute\n(a flutter-only climb to Ember\'s den), the furnace, Soot and the Swift Feather.',
         bg='z09-basement',
         palette=['#4F5B6E', '#E07A3A', '#B9BDC4', '#26303D'],
         music='z09-basement', temp=56, loops=['furnace'],
         beaconVoice='ground',
         start={'room': 'bas-stairs'},
         decoys=[{'voice': 'swift-chitter', 'room': 'bas-chimney', 'x': 16, 'y': 3, 'every': 7}],
         near=['spool', 'dice', 'pebble'])


def dark(**o):
    return dict(dark=True, needs='glow', needsMsg=DARK, **o)


# ------------------------------------------------------------------ bas-stairs (8,11) 2x3
r = z.room('bas-stairs', 'The Basement Stairs', 8, 11, 2, 3, **dark(bg={'v': 'a', 'x': 0.2, 'y': 0.3}))
r.clear(12, 0, 6, 1)                       # the laundry floor hole (exact: cols 12-17)
r.fill(1, 4, 22, 2, '#')                   # stair head under the hole
r.put(14, 3, 'P')
r.plat(15, 2, 3); r.plat(12, 0, 2)         # [cracks] two treads up under the laundry hole: once the rubble is
                                           # pounded you can climb back to laun-washer (the only way out before the Feather)
for k in range(10):                        # flight 1: down to the right
    r.plat(23 + 3 * k, 5 + k, 3)
r.fill(53, 16, 10, 2, '#')                 # landing 1 (right)
for k in range(17):                        # flight 2: down to the left ([cracks] was 14 steps: its last
    r.plat(50 - 3 * k, 17 + k, 3)          # one sat 5 rows over landing 2, so nobody climbed back up)
r.fill(1, 35, 10, 2, '#')                  # landing 2 (left)
for k in range(15):                        # flight 3: down to the right
    r.plat(11 + 3 * k, 36 + k, 3)
r.floor(52)
r.clear(63, 48, 1, 4)                      # exit right (rows 12-15 of cell 9,13)
r.put(6, 51, 'S')
r.put(3, 34, 'k'); r.put(60, 15, 'k')
r.ent('sign', x=13, y=3, w=7, text='{use} flashes the Glow Bead. Night creatures hate it.')
r.ent('sign', x=2, y=51, w=8, text='It\'s too dark to see. Something down there is listening.')
r.ent('cellarspider', x=33, y=1, drop=5)
r.ent('cellarspider', x=44, y=14, drop=3)
r.ent('cellarspider', x=24, y=28, drop=10)
r.ent('cellarspider', x=45, y=37, drop=8)
r.deco('pull-chain', 20, 3, 3.5, layer='back')
r.deco('spool', 4, 3, 2.2, layer='back')
r.deco('dice', 58, 15, 1.6, layer='back', rot=0.2)
r.deco('sock', 6, 34, 1.4, layer='back')
r.deco('bottle-cap', 30, 51, 1.0, layer='mid')
r.deco('pebble', 50, 51, 0.9, layer='mid')
r.deco('spool', 58, 51, 2.0, layer='back', flip=True)
r.o['fx'] = [{'kind': 'dust', 'x': 8, 'y': 2, 'w': 50, 'h': 48}]

# ------------------------------------------------------------------ bas-storage (10,12) 3x2
r = z.room('bas-storage', 'The Storage Boxes', 10, 12, 3, 2, **dark(bg={'v': 'b', 'x': 0.5}))
r.fill(1, 1, 94, 10, '#')                  # foundation wall over the boxes
r.fill(8, 11, 76, 4, '#')                  # roof of the beetle nest corridor
r.fill(8, 16, 76, 1, '#')                  # floor of the corridor (row 15 is a 1-tile crawl)
r.put(8, 15, '#')
r.clear(9, 16, 1, 1)                       # drop hole at the far end (one-way back down)
for y in range(16, 33, 2):                 # wire shelving up to the corridor (right)
    r.plat(84, y, 8)
r.fill(92, 11, 3, 5, '#')
r.floor(34)
r.clear(0, 30, 1, 4); r.clear(95, 30, 1, 4)
# box stacks (2 high) split the floor into three beetle beats
for x0, w in [(15, 2), (37, 3), (61, 2)]:
    r.fill(x0, 32, w, 2, '#')
r.fill(76, 32, 3, 2, '#')
for x in (20, 31, 44, 55, 67, 72):
    r.ent('hide', x=x, y=33, w=1, art='bottle-cap' if x in (20, 44, 67) else 'none')
r.ent('beetle', x=24, y=33, range=[18, 35])
r.ent('beetle', x=50, y=33, range=[41, 59])
r.ent('beetle', x=70, y=33, range=[64, 74])
r.ent('beetle', x=30, y=15, range=[11, 46])
r.ent('beetle', x=65, y=15, range=[47, 82])
r.ent('centipede', x=36, y=33, path=[[36, 33], [36, 31], [40, 31], [40, 33], [40, 31], [36, 31]], speed=200)
r.ent('secret', id='bas-cloak', x=10, y=15)
r.ent('sign', x=4, y=33, w=8, text='That one can\'t be kicked. Hide and let it pass. ({enter} near a gap)')
r.ent('sign', x=82, y=15, w=6, text='No hiding spots at all. You\'d have to be invisible.')
r.put(48, 33, 'k')
r.deco('dice', 16, 31, 1.8, layer='mid')
r.deco('spool', 38, 31, 2.0, layer='mid')
r.deco('dice', 62, 31, 1.7, layer='mid', rot=-0.15)
r.deco('sock', 77, 31, 1.3, layer='mid')
r.deco('cork', 27, 33, 0.9, layer='back')
r.deco('pull-chain', 52, 17, 3.0, layer='back')
r.deco('hide-log', 88, 33, 1.0, layer='back', alpha=0.7)
r.deco('marble', 58, 33, 0.7, layer='mid')
r.o['fx'] = [{'kind': 'dust', 'x': 2, 'y': 17, 'w': 90, 'h': 16}]

# ------------------------------------------------------------------ bas-workbench (13,12) 3x2
r = z.room('bas-workbench', 'The Workbench', 13, 12, 3, 2, **dark(bg={'v': 'a', 'x': 0.6, 'mirror': True}))
r.fill(1, 1, 94, 4, '#')                   # floor joists (ceiling)
for x in range(6, 94, 9):
    r.fill(x, 5, 2, 2, '#')                # joist ends
r.fill(42, 13, 7, 1, '#')                  # the high joist where Glim blinks (flutter only)
r.fill(18, 18, 66, 2, '#')                 # the workbench top
r.fill(18, 18, 1, 8, 'G'); r.fill(19, 20, 1, 6, 'G'); r.fill(82, 20, 2, 6, '#')   # bench aprons (the left end is varnished: no climbing it)
r.fill(0, 1, 1, 29, 'G')                   # the cellar wall behind the bench (damp: no cling)
for y in range(18, 33, 2):                 # crate ladder up to the bench (right end)
    r.plat(84, y, 7)
r.floor(34)
r.clear(0, 30, 1, 4); r.clear(95, 30, 1, 4)
r.fill(30, 33, 37, 1, '^')                 # spilled screws (points up)
r.fill(27, 32, 3, 2, 'G')                  # a tin to jump from for the first hook
r.fill(46, 30, 3, 3, 'G')                  # the vise, standing in the screws (oily: no cling)
for x, y in [(31, 28), (36, 28), (41, 28), (52, 28), (57, 28), (62, 28)]:
    r.put(x, y, 'H')                       # pegboard hooks
r.ent('item', item='battery', x=30, y=17)
r.ent('npc', who='glim', x=45, y=12, talk='npcs.glim.meet', recruit='glim')
r.ent('cellarspider', x=24, y=21)
r.ent('cellarspider', x=74, y=21)
r.ent('centipede', x=20, y=17, path=[[20, 17], [40, 17], [40, 17], [20, 17]], speed=240)
r.ent('sign', x=24, y=33, w=6, nx=25, text='{use} near a hook to grab it. {lineOff} to jump off.')  # [issue 9] the note clear of the glass block
r.put(80, 33, 'k')
r.deco('pull-chain', 47, 22, 2.6, layer='back')
r.deco('spool', 60, 17, 2.0, layer='mid')
r.deco('dice', 72, 17, 1.6, layer='mid')
r.deco('cork', 24, 17, 1.0, layer='mid')
r.deco('bottle-cap', 10, 33, 1.0, layer='mid')
r.deco('marble', 90, 33, 0.8, layer='mid')
r.o['fx'] = [{'kind': 'dust', 'x': 4, 'y': 6, 'w': 88, 'h': 26}]

# ------------------------------------------------------------------ bas-sump (16,12) 3x2
r = z.room('bas-sump', 'The Sump', 16, 12, 3, 2, **dark(bg={'v': 'b', 'x': 0.3, 'y': 0.7}))
r.fill(1, 1, 94, 18, '#')                  # foundation (the sump sits low)
for x, d in [(20, 2), (33, 1), (47, 3), (60, 1), (71, 2)]:
    r.fill(x, 19, 2, d, '#')               # dripping pipe stubs
r.floor(34)
r.clear(0, 30, 1, 4); r.clear(95, 30, 1, 4)
r.fill(14, 34, 68, 1, '~')                 # the sump: cold black water (Raft)
r.fill(84, 32, 5, 1, '#')                  # sump pump housing (roof)
r.fill(88, 33, 1, 1, '#'); r.put(84, 33, '%')   # Mote's crack into the pump
r.ent('current', x=14, y=31, w=68, h=3, vx=0.8)
r.ent('centipede', x=16, y=21, path=[[16, 21], [40, 21], [40, 32], [43, 32], [43, 21], [80, 21]])
r.ent('secret', id='bas-mote', x=86, y=33)
r.ent('sign', x=6, y=33, w=6, nx=11, text='Walk onto water with the Raft. Currents carry you along.')  # [issue 34] the marker clear of the bottle cap
r.put(48, 33, 'k')
r.deco('steam-vent', 86, 31, 2.4, layer='back', alpha=0.85)
r.deco('bottle-cap', 8, 33, 1.0, layer='mid')
r.deco('pebble', 91, 33, 0.9, layer='mid')
r.o['fx'] = [{'kind': 'dust', 'x': 4, 'y': 20, 'w': 88, 'h': 12}]

# ------------------------------------------------------------------ bas-coal (19,12) 3x2
r = z.room('bas-coal', 'The Old Coal Bin', 19, 12, 3, 2, **dark(bg={'v': 'a', 'x': 0.8}))
r.fill(1, 1, 42, 14, '#')                  # left: brick over the heap
r.fill(52, 1, 43, 17, '#')                 # right: brick
r.fill(51, 0, 1, 28, 'G')                  # the chute's right wall (soot-slick, never clingable)
r.fill(43, 0, 1, 17, 'G')                  # the chute's left wall
r.fill(48, 0, 3, 1, 'G')                   # under the den floor
# the coal heap: lumps stepping up from the floor to its top (H0: stand row 17, cols 28-46)
for i in range(7):
    r.fill(14 + 2 * i, 32 - 2 * i, 2, 1, '#')   # coal lumps (walk under them)
r.fill(28, 18, 19, 12, '#')                # the heap; a tunnel under it keeps the floor open
# flutter lips 4 apart, alternating sides of the 7-wide chute, a soot overhang over each lip's
# wall end; the last lip (left) is right under the den's floor hole
for y, side in [(14, 'R'), (10, 'L'), (6, 'R'), (2, 'L')]:
    if side == 'R':
        r.fill(48, y, 3, 1, 'G')
        if y - 4 >= 1: r.fill(49, y - 4, 2, 1, 'G')
    else:
        r.fill(44, y, 3, 1, 'G')
        if y - 4 >= 1: r.fill(44, y - 4, 2, 1, 'G')
r.clear(44, 0, 4, 1)                       # the chute mouth (into Ember's den), gated below
r.floor(34)
r.clear(0, 30, 1, 4); r.clear(95, 30, 1, 4)
r.put(55, 33, 'S')
r.ent('lair', boss='ember', x=48, y=33, w=3, h=3)
r.ent('gate', id='bas-chute', x=44, y=0, w=4, h=1, opens={'item': 'feather'}, msg='The bricks are slick with soot. You\'d need to flutter.')
r.ent('sign', x=58, y=33, w=6, text='The coal chute. Slick with soot all the way up.')
r.ent('centipede', x=54, y=18, path=[[54, 18], [93, 18], [93, 28], [93, 18]], speed=300)
r.put(20, 33, 'k')
r.deco('furnace-grate', 48, 26, 2.2, layer='back', alpha=0.6)
r.deco('pebble', 20, 29, 1.0, layer='mid')
r.deco('pebble', 36, 17, 1.2, layer='mid', flip=True)
r.deco('pebble-chip', 24, 25, 0.8, layer='mid')
r.deco('dice', 70, 33, 1.6, layer='back')
r.deco('spool', 85, 33, 2.0, layer='back')
r.o['fx'] = [{'kind': 'dust', 'x': 44, 'y': 1, 'w': 7, 'h': 30}]

# ------------------------------------------------------------------ bas-furnace (22,11) 2x3
r = z.room('bas-furnace', 'The Furnace', 22, 11, 2, 3, temp={'left': 55, 'right': 85},
           bg={'v': 'b', 'x': 0.7, 'y': 0.6})
r.decor.append({'gecko': 'ember', 'x': 24, 'y': 51, 'len': 260, 'pose': 'sleep', 'layer': 'mid', 'after': 'mote'})  # dozing after the fight (builder B's gecko decor)
r.fill(1, 1, 62, 9, '#')                   # ceiling
r.fill(36, 14, 27, 2, '#')                 # the flue-pipe walkway (floor row 14 at the right edge)
r.clear(63, 10, 1, 4)                      # exact: rows 10-13 of cell 23,11
r.fill(30, 30, 17, 18, '#')                # the furnace (on short legs: rows 48-51 free under it)
r.fill(40, 16, 3, 14, '#')                 # the flue riser
# the cold-air return: a booties shaft (cols 12-15) up to the duct ledges
r.fill(11, 31, 1, 19, '#'); r.fill(16, 31, 1, 19, '#')
r.fill(1, 31, 10, 1, '#')                  # left duct ledge (thermostat)
r.fill(16, 31, 14, 1, '#')                 # right duct ledge to the furnace
r.fill(1, 26, 4, 1, '#'); r.fill(1, 27, 1, 4, '#')      # the song-seed cubby (left)
r.floor(52)
r.clear(0, 48, 1, 4)                       # exit left
r.fill(54, 48, 9, 1, '#')                  # the crawl gap's ceiling
r.clear(63, 49, 1, 3)                      # exact: rows 13-15 of cell 23,13
r.ent('gate', id='bas-thermo-door', x=5, y=27, w=1, h=4, opens={'switch': 'bas-thermo'})
r.ent('thermostat', id='bas-thermo', x=8, y=30, target=60, tol=1)
r.ent('secret', id='bas-thermo', x=2, y=30)
r.ent('lift', kind='steam', x=31, y=12, w=3, h=18, vy=9, on=2.5, off=1)
r.ent('sign', x=17, y=30, w=6, text='Warm air rises off the furnace. Ride it up.')
r.ent('sign', x=19, y=51, w=8, text='Jump at a wall to stick to it. {jump} again to kick off.')
r.ent('sign', x=7, y=30, w=4, text='A thermostat lock. It wants 60°F. Someone who hears temperature could help.')
r.put(4, 51, 'k'); r.put(22, 30, 'k'); r.put(50, 13, 'k')
r.deco('furnace-grate', 38, 46, 3.2, layer='mid')
r.deco('thermostat-lock', 8, 30, 1.4, layer='back')
r.deco('steam-vent', 32, 29, 2.0, layer='back')
r.deco('furnace-grate', 60, 51, 1.6, layer='back', alpha=0.8)
r.deco('spool', 6, 51, 2.0, layer='back')
r.o['fx'] = [{'kind': 'steam', 'x': 32, 'y': 29, 'every': 6}, {'kind': 'steam', 'x': 41, 'y': 15, 'every': 9},
             {'kind': 'dust', 'x': 2, 'y': 10, 'w': 60, 'h': 40}]

# ------------------------------------------------------------------ bas-chimney (24,11) 1x2
r = z.room('bas-chimney', 'The Chimney Base', 24, 11, 1, 2, **dark(bg={'v': 'a', 'x': 0.9, 'y': 0.2}))
r.fill(1, 1, 10, 9, '#')                   # brick over the walkway
r.fill(11, 1, 1, 12, 'G')                  # flue: left wall (its foot is the walkway's ceiling)
r.fill(20, 1, 1, 11, 'G'); r.fill(21, 1, 10, 11, '#')   # flue: right wall
r.fill(0, 14, 12, 2, '#')                  # the flue-pipe walkway (floor row 14)
r.clear(0, 10, 1, 4)                       # exact: rows 10-13
r.clear(12, 0, 8, 1)                       # exact: cols 12-19 up to the ash pit
r.fill(18, 10, 2, 1, 'G'); r.fill(16, 6, 4, 1, 'G')     # lip 1 (right) + overhang
r.fill(12, 6, 2, 1, 'G'); r.fill(12, 2, 4, 1, 'G')      # lip 2 (left) + overhang
r.fill(18, 2, 2, 1, 'G')                                # lip 3 (right); its overhang is in the ash pit
r.fill(12, 16, 4, 1, '#')                  # ash ledge back up to the walkway
for i, y in enumerate(range(32, 17, -2)):  # ash steps up from the pit floor
    r.plat(22 if i % 2 == 0 else 16, y, 7 if i % 2 == 0 else 6)
r.floor(34)
r.ent('npc', who='soot', x=5, y=13, talk='npcs.soot.meet', recruit='soot')
r.ent('item', item='feather', x=8, y=13)
r.put(10, 13, 'B')
r.ent('sign', x=6, y=33, w=8, text='Press {jump} again in the air to flutter.')
r.put(26, 33, 'k')
r.deco('furnace-grate', 10, 12, 1.0, layer='back', alpha=0.7)
r.deco('pebble', 4, 33, 1.0, layer='mid')
r.deco('pebble-chip', 20, 33, 0.8, layer='mid')
r.o['fx'] = [{'kind': 'dust', 'x': 12, 'y': 0, 'w': 8, 'h': 34}]

# ------------------------------------------------------------------ bas-lair (19,11) 3x1: Ember's den
r = z.room('bas-lair', "Ember's Den", 19, 11, 3, 1, dark=True, music='boss', bg={'v': 'b', 'x': 0.5, 'y': 0.4})
r.fill(1, 16, 94, 2, '#'); r.clear(44, 16, 4, 2)        # floor; the chute comes up at cols 44-47
r.fill(48, 9, 47, 7, '#')                  # right: the den floor's bulk
r.fill(6, 9, 42, 2, '#')                   # the den floor over the coal tunnel
r.plat(3, 14, 3); r.plat(1, 12, 3); r.plat(3, 10, 3)  # coal steps up at the far left
r.fill(95, 6, 1, 3, '%')                   # Mote's crack in the far wall (kick it)
r.ent('hide', x=30, y=8, w=1, art='pebble'); r.ent('hide', x=66, y=8, w=1, art='pebble')   # two coal lumps
r.ent('boss', boss='ember', x=60, y=8, cricket='mote', checkpoints=[[7, 8], [46, 8], [84, 8]])
r.deco('furnace-grate', 88, 4, 2.4, layer='back')
r.deco('pebble', 30, 8, 1.3, layer='mid')
r.deco('pebble', 66, 8, 1.3, layer='mid', flip=True)
r.deco('pebble-chip', 20, 15, 0.8, layer='mid')
r.deco('pebble-chip', 12, 8, 0.8, layer='mid')
r.deco('pull-chain', 46, 3, 3.0, layer='back', alpha=0.6)

if __name__ == '__main__':
    if '--dump' in sys.argv:
        z.dump(sys.argv[sys.argv.index('--dump') + 1:] or None)
    else:
        z.write(os.path.join(os.path.dirname(__file__), '..', 'game', 'data', 'rooms', 'zone-09.js'))
