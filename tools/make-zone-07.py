"""Zone 7, the Study (builder C): writes game/data/rooms/zone-07.js.
Run from the project root:  python3 tools/make-zone-07.py [--dump room-id ...]
Design: design/zones/z07.md, game/data/house.js (rooms, links, secrets), GAME_DESIGN "Study".
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from zonegen_c import Zone

T_SIGN = {
    'listen': 'Stand still and hold {listen}. Crickets hear through their front legs.',
    'maze': 'Four sounds. Only one is a cricket. Listen to the rhythm.',
    'strip': 'The strip under the arrow shows the rhythm. Crickets chirp in short, steady groups.',
    'floss': '{use} near a shelf pin to grab it. {left} {right} to swing. {lineOff} to jump off.',
    'hinge': 'Creeeak. (A door hinge. Very convincing. Not a cricket.)',
    'radio': 'Bip-bip. (A clock radio. Not even trying.)',
    'frog': 'Peep... (from down the vent. Someone downstairs.)',
    'hide': '{enter} near a cricket-sized gap to hide. Nothing big can see you in there.',
    'musicbox': 'A music box with two keyholes. It wants two house crickets singing at once.',
    'dark': 'Too dark to go in without a light. (Glow Bead)',
}

z = Zone('z07-study', 7, 'Study', header="""Zone 7: the Study. The beacon maze (four sounds, pick the true chirp by its rhythm), the
Glow Bead, Page in the dark nook, and Mossy's shelves.""",
         palette=['#A07850', '#4E7A55', '#E7D7B5', '#8A3B32'], bg='z07-study', music='z07-study',
         start={'room': 'stu-door'}, beaconVoice='bell', temp=68,
         near=['book-spine', 'spool'],
         decoys=[{'voice': 'hinge-creak', 'room': 'stu-door', 'x': 1, 'y': 9, 'every': 11},
                 {'voice': 'alarm', 'room': 'stu-desk', 'x': 58, 'y': 19, 'every': 20},
                 {'voice': 'peeper', 'room': 'stu-desk', 'x': 30, 'y': 33, 'every': 1}])

# ---------------------------------------------------------------- stu-door (18,4) 1x2
r = z.room('stu-door', 'The Study Door', 18, 4, 1, 2, bg={'v': 'a', 'x': 0.2, 'y': 0.4})
r.floor(34)
r.clear(0, 8, 1, 4)                    # exact link: stair-landing rows 8-11
r.fill(0, 12, 8, 2)                    # the door-frame ledge (floor row 12)
r.clear(31, 30, 1, 4)                  # to stu-desk (rows 30-33)
# the way back up to the ledge: the door's panel rails and a coat hook (one-way rails)
for (x, y, w) in [(22, 32, 6), (17, 30, 6), (22, 28, 6), (17, 26, 6), (22, 24, 6), (17, 22, 6), (12, 20, 6), (8, 18, 5), (10, 16, 3), (8, 14, 3)]:
    r.plat(x, y, w)
r.put(4, 33, 'S')
r.ent('sign', x=2, y=11, w=5, text=T_SIGN['hinge'])
r.ent('sign', x=7, y=33, w=6, text=T_SIGN['listen'])
r.ent('booklouse', x=14, y=33)
r.ent('booklouse', x=29, y=33)
r.deco('book-spine', 2, 33, 3.2, layer='back', rot=-0.08)
r.deco('book-spine', 3, 33, 3.0, layer='back')
r.deco('drawer-pull', 6, 11, 0.9, layer='back')   # the brass hinge on the door frame
r.deco('book-spine', 26, 31, 1.6, layer='back', rot=0.12)
r.deco('marble', 20, 33, 0.7, layer='mid')
r.deco('cork', 11, 33, 0.8, layer='mid')
r.deco('pin', 15, 19, 0.6, layer='back')

# ---------------------------------------------------------------- stu-desk (19,4) 2x2
r = z.room('stu-desk', 'The Writing Desk', 19, 4, 2, 2, bg={'v': 'a', 'x': 0.5, 'y': 0.5})
r.floor(34)
r.clear(0, 30, 1, 4); r.clear(63, 30, 1, 4)          # stu-door / stu-shelves
r.clear(20, 0, 8, 1)                                  # up into the hutch top (stu-globe)
r.plat(20, 1, 8)                                      # the hutch's top rail (one-way)
r.fill(10, 24, 40, 2)                                 # the desktop (floor row 24), cols 10-49
r.fill(40, 26, 10, 4)                                 # the drawer pedestal (kick space under it)
for y in (32, 30, 28, 26):                            # drawer lips, one-way
    r.plat(50, y, 3)
r.fill(13, 22, 2, 2); r.fill(15, 21, 7, 3)            # the typewriter (keys as steps)
r.fill(16, 2, 1, 18, 'G'); r.fill(30, 2, 1, 18, 'G')  # the hutch's glass sides
for (x, y, w) in [(22, 19, 6), (17, 17, 6), (22, 15, 6), (17, 13, 6), (22, 11, 6), (17, 9, 6), (22, 7, 6), (17, 5, 6), (22, 3, 6)]:
    r.plat(x, y, w)
# the plaster patch (Thimble): pound the C lid, the crumb cache is inside
r.fill(42, 20, 6, 2, 'C'); r.fill(42, 22, 1, 2); r.fill(47, 22, 1, 2); r.fill(48, 22, 2, 2)
r.ent('secret', id='stu-crumbs-plaster', x=44, y=23)
# a cracked book spine (Mote): a song-seed in the drawer pedestal
r.fill(33, 21, 6, 3); r.clear(35, 22, 3, 2); r.fill(34, 22, 1, 2, '%')
r.ent('secret', id='stu-mote', x=36, y=23)
r.ent('sign', x=2, y=33, w=6, text=T_SIGN['maze'])
r.ent('sign', x=55, y=33, w=6, text=T_SIGN['strip'])
r.ent('booklouse', x=20, y=33)
r.ent('silverfish', x=24, y=33, range=[12, 28])
r.deco('dryer-vent', 58, 20, 1.6, layer='back')       # the air vent: the hallway alarm comes through it
r.deco('furnace-grate', 30, 34, 0.7, layer='back')    # the floor register: Peeper, downstairs
r.deco('book-spine', 30, 23, 2.6, layer='back'); r.deco('book-spine', 31, 23, 2.3, layer='back', rot=0.1)
r.deco('drawer-pull', 45, 27, 0.8, layer='mid'); r.deco('drawer-pull', 45, 29, 0.8, layer='mid')
r.deco('pin', 11, 23, 0.6, layer='mid')
r.deco('dice', 26, 23, 1.0, layer='mid')
r.deco('book-spine', 20, 6, 1.6, layer='back'); r.deco('book-spine', 26, 12, 1.6, layer='back', rot=0.1)
r.deco('marble', 6, 33, 0.7, layer='mid')

r.decor.append({'gecko': 'mossy', 'x': 25, 'y': 23, 'len': 220, 'pose': 'sleep', 'layer': 'mid', 'after': 'rin'})  # dozing after his game

# ---------------------------------------------------------------- stu-globe (19,3) 2x1
r = z.room('stu-globe', 'The Hutch and Globe', 19, 3, 2, 1, bg={'v': 'b', 'x': 0.4, 'y': 0.2})
r.floor(16)
r.clear(20, 16, 8, 1); r.plat(20, 17, 8)               # the hole down into the desk hutch
r.clear(0, 12, 1, 4)                                   # the dark nook (stu-nook)
r.clear(63, 8, 1, 8)                                   # the bookcase (stu-shelves)
r.fill(40, 8, 6, 7, 'G')                               # the mantel clock: 8 glass tiles up (Rubber Band), on little feet:
                                                       # [issue #4] a 1-tile crawl under it (row 15), the way back from the hutch top
r.deco('pin', 40.5, 15, 0.8, layer='mid', rot=-1.5708); r.deco('pin', 45.5, 15, 0.8, layer='mid', rot=-1.5708)  # the clock's feet (push-pin heads)
r.ent('secret', id='stu-crumbs-clock', x=42, y=7)
r.fill(8, 13, 4, 3)                                    # a stack of books
r.ent('hide', x=33, y=15, w=1, art='bottle-cap')       # the pen cup
r.ent('hide', x=4, y=15, w=1, art='bottle-cap')
r.ent('wolfspider', x=26, y=15, sight=6)
r.ent('sign', x=34, y=15, w=4, text=T_SIGN['hide'])
r.ent('sign', x=13, y=15, w=4, text=T_SIGN['musicbox'])
r.ent('duet', id='stu-duet', x=15, y=15, hear=6, window=2, then=[['secret', {'id': 'stu-duet'}]])  # [fixer] Chip's Duet (post-game)
r.deco('book-spine', 9, 12, 2.0, layer='back'); r.deco('book-spine', 10, 12, 1.8, layer='back', rot=0.1)
r.deco('spool', 58, 15, 1.3, layer='mid')

# ---------------------------------------------------------------- stu-nook (18,3) 1x1, dark
r = z.room('stu-nook', 'The Reading Nook', 18, 3, 1, 1, dark=True, needs='glow', needsMsg=T_SIGN['dark'], bg={'v': 'b', 'x': 0.1, 'y': 0.3})
r.floor(16)
r.clear(31, 12, 1, 4)
r.fill(4, 12, 9, 4)                                    # the big dictionary
r.plat(14, 14, 4); r.plat(19, 12, 4); r.plat(24, 10, 4)
r.ent('npc', who='page', x=8, y=11, recruit='page')
r.ent('crumbs', x=25, y=9, n=10)
r.deco('book-spine', 3, 11, 2.2, layer='back'); r.deco('book-spine', 13, 11, 2.0, layer='back', rot=-0.1)
r.deco('book-spine', 27, 15, 2.4, layer='back')

# ---------------------------------------------------------------- stu-shelves (21,3) 2x3
# Carved out of solid books. Bottom screen: pillars and shelf pins (Floss) up to the junction
# corridor. Middle: four cubbies over the corridor; three are dead ends with gags (hinge, clock
# radio, frog vent), the fourth is a Tape Booties shaft up through the shelf board. Top: the
# second shelf's book rails up to the top shelf, the Glow Bead jar and the hollow spine (B).
# Past the bead: the window, and a glass chute down to the lair ledge (save 2, Mossy's door).
r = z.room('stu-shelves', 'The Bookcase', 21, 3, 2, 3, bg={'v': 'a', 'x': 0.7, 'y': 0.5},
           decoys=[{'voice': 'hinge-creak', 'x': 5, 'y': 24, 'every': 9},
                   {'voice': 'alarm', 'x': 16, 'y': 22, 'every': [6, 8]},
                   {'voice': 'peeper', 'x': 28, 'y': 24, 'every': 1}])
r.fill(0, 0, 64, 54)                                   # solid books; carve the spaces
# top screen
r.clear(1, 1, 62, 6)                                   # above the top shelf
r.fill(0, 1, 1, 7, 'G')                                # glass behind the pocket: no climbing back
r.clear(1, 7, 3, 9)                                    # the pocket (drop down to the hutch top)
r.clear(0, 8, 1, 8)                                    # exit left rows 8-15 (stu-globe)
r.fill(4, 8, 1, 8, 'G')                                # the pocket's glass wall
r.plat(11, 7, 7)                                       # the top shelf's one-way gap (cols 11-17)
r.clear(5, 8, 36, 10)                                  # the second shelf (rows 8-17, cols 5-40)
for (x, y, w) in [(35, 17, 6), (30, 15, 6), (25, 13, 6), (20, 11, 6), (15, 9, 6)]:
    r.plat(x, y, w)
r.clear(50, 7, 13, 7)                                  # past the bead: the window landing (rows 7-13)
r.clear(63, 8, 1, 6)                                   # exit right rows 8-13 (stu-window)
r.clear(54, 14, 2, 16)                                 # the chute down to the lair ledge
r.fill(53, 14, 1, 16, 'G'); r.fill(56, 14, 1, 16, 'G')
# middle screen: four cubbies over the junction corridor (rows 30-33)
r.clear(1, 19, 10, 15); r.clear(12, 19, 10, 15); r.clear(23, 19, 11, 15)
r.clear(35, 18, 4, 16)                                 # cubby 4: the shaft (cols 35-38) through the board
r.clear(1, 30, 38, 4)                                  # the corridor under the cubbies
r.fill(34, 30, 1, 2)                                   # the shaft's left wall comes down low (a 2-tall doorway)
for (x, y, w) in [(6, 31, 4), (2, 29, 4), (6, 27, 4), (2, 25, 4),          # cubby 1 rails
                  (17, 31, 4), (13, 29, 4), (17, 27, 4), (13, 25, 4),      # cubby 2
                  (28, 31, 4), (24, 29, 4), (28, 27, 4), (24, 25, 4)]:     # cubby 3
    r.plat(x, y, w)
r.fill(46, 16, 1, 18, 'G')                             # glass between the books and the lair side
r.clear(47, 30, 16, 4)                                 # the lair ledge corridor (rows 30-33)
r.clear(63, 30, 1, 4)                                  # exit right rows 30-33 (stu-lair)
r.clear(48, 34, 3, 2)                                  # drop hole from the lair ledge (one-way down)
r.plat(28, 34, 6); r.clear(28, 35, 11, 1)              # the corridor's one-way floor over the climb
# bottom screen: the floor run and the pin climb
r.clear(1, 36, 62, 16)
r.clear(0, 48, 1, 4)                                   # exit left rows 48-51 (stu-desk)
r.fill(47, 36, 1, 12, 'G'); r.fill(51, 36, 1, 12, 'G') # the drop shaft's glass walls
r.fill(8, 50, 5, 2)                                    # P1 (stand 49)
r.put(15, 46, 'H')
r.fill(20, 47, 5, 5)                                   # P2 (stand 46)
r.fill(25, 45, 3, 7)                                   # P2's step (stand 44)
r.put(31, 41, 'H')
for y in (50, 48, 46):                                 # [issue #4] rails out of the pit under the pin (it was 7 deep) up to P2's step
    r.plat(28, y, 3)
r.fill(36, 42, 6, 10)                                  # P3 (stand 41)
r.fill(39, 40, 3, 2)                                   # P3's step (stand 39)
r.plat(33, 38, 6); r.plat(29, 36, 6)                   # rails up to the corridor
for y in (50, 48, 46, 44, 42):                         # [fullrun] rails out of the drop shaft's pit up to P3's step (was sealed)
    r.plat(42, y, 3)
# the Glow Bead and the hollow book spine
r.ent('item', item='glow', x=46, y=6)
r.put(48, 6, 'B')
r.put(58, 33, 'S')
r.ent('lair', boss='mossy', x=61, y=33, w=2, h=3, to='stu-lair', at=[2, 15])
r.ent('beacon', x=61, y=31, after=True)
# enemies, hides, signs, crumbs
r.ent('silverfish', x=20, y=51, range=[14, 38])
r.ent('wolfspider', x=18, y=33, sight=6)
r.ent('hide', x=10, y=33, w=1, art='bottle-cap')
r.ent('hide', x=26, y=33, w=1, art='bottle-cap')
r.ent('silverfish', x=26, y=6, range=[18, 40])
r.ent('sign', x=2, y=51, w=5, text=T_SIGN['floss'])
r.ent('sign', x=1, y=33, w=4, text=T_SIGN['maze'])
r.ent('sign', x=2, y=24, w=4, nx=2, text=T_SIGN['hinge'])  # [issue 34] its marker clear of the hinge (the drawer pull)
r.ent('sign', x=13, y=24, w=4, text=T_SIGN['radio'])
r.ent('sign', x=24, y=24, w=4, text=T_SIGN['frog'])
r.ent('crumbs', x=3, y=24, n=5); r.ent('crumbs', x=14, y=24, n=5); r.ent('crumbs', x=25, y=24, n=5)
r.put(4, 51, 'k'); r.put(3, 33, 'k'); r.put(22, 6, 'k')
for x, y, h in [(2, 51, 2.8), (3, 51, 2.4), (10, 49, 1.6), (22, 46, 1.8), (37, 41, 1.6),
                (6, 6, 2.6), (7, 6, 2.2), (30, 6, 2.4), (31, 6, 2.0), (38, 6, 2.6),
                (2, 33, 2.4), (20, 33, 2.0), (33, 33, 1.8), (58, 13, 2.0), (60, 13, 2.4)]:
    r.deco('book-spine', x, y, h, layer='back', rot=((x * 7) % 5 - 2) * 0.04)
r.deco('drawer-pull', 4, 23, 0.9, layer='back')        # cubby 1: a door hinge
r.deco('smoke-alarm-wall', 15, 23, 1.2, layer='back')   # cubby 2: the clock radio
r.deco('dryer-vent', 26, 23, 1.2, layer='back')         # cubby 3: the vent
r.deco('pin', 15, 46, 0.5, layer='back'); r.deco('pin', 31, 41, 0.5, layer='back')

# ---------------------------------------------------------------- stu-window (23,3) 1x1
r = z.room('stu-window', 'The Study Window', 23, 3, 1, 1, bg={'v': 'b', 'x': 0.9, 'y': 0.1})
r.floor(14)
r.clear(0, 8, 1, 6)
r.fill(18, 9, 12, 5, 'G')                              # the window sill: glass (5 up)
r.plat(20, 4, 9)                                       # the curtain rod
r.ent('secret', id='stu-songseed-window', x=25, y=3)
r.ent('sign', x=4, y=13, w=6, text='Down there: the Sunroom\'s glass roof. Someone is peeping.')
r.deco('mesh-lid', 24, 8, 0.5, layer='back')
r.deco('book-spine', 3, 13, 2.2, layer='back'); r.deco('book-spine', 5, 13, 2.0, layer='back', rot=0.1)

# ---------------------------------------------------------------- stu-lair (23,4) 1x2: Mossy's shelves
r = z.room('stu-lair', 'The Shelves of Mossy', 23, 4, 1, 2, music='boss', bg={'v': 'a', 'x': 0.85, 'y': 0.6})
r.floor(34)
r.clear(0, 12, 1, 4)                                   # from the bookcase (rows 12-15)
r.fill(0, 16, 6, 2)                                    # the entry ledge (feet 16)
# a lattice of shelves, both sides and the middle, every step 2 up and 2-3 across
SHELVES = [(2, 32, 7), (23, 32, 7), (9, 30, 14), (2, 28, 7), (23, 28, 7), (9, 26, 14),
           (1, 24, 8), (23, 24, 8), (9, 22, 14), (2, 20, 7), (23, 20, 7), (9, 18, 14),
           (6, 16, 3), (23, 16, 5), (9, 14, 14), (4, 12, 5), (23, 12, 5), (9, 10, 14)]
for (x, y, w) in SHELVES:
    r.fill(x, y, w, 1)
r.put(5, 7, 'H'); r.put(26, 7, 'H')
r.ent('boss', boss='mossy', x=15, y=33, cricket='rin',
      checkpoints=[[2, 15], [2, 15], [2, 15]],
      # hiding places (tile the gecko lies on, facing): low first; phase 2 prefers the high ones
      spots=[[5, 31, 1], [26, 31, -1], [15, 29, 1], [4, 27, 1], [27, 27, -1], [17, 25, -1], [3, 23, 1],
             [28, 23, -1], [13, 21, 1], [5, 19, 1], [26, 19, -1], [18, 17, -1], [25, 15, -1], [12, 13, 1],
             [6, 11, 1], [25, 11, -1], [16, 9, 1]],
      cage=[16, 2])
for x, y, h in [(3, 31, 1.8), (28, 31, 1.6), (10, 29, 1.6), (21, 29, 1.8), (2, 23, 2.0), (29, 23, 2.0),
                (10, 21, 1.6), (21, 21, 1.8), (10, 9, 1.6), (21, 9, 1.6), (10, 13, 1.4), (21, 13, 1.4)]:
    r.deco('book-spine', x, y, h, layer='back', rot=((x * 3) % 5 - 2) * 0.05)
r.deco('fake-plant', 27, 33, 2.6, layer='back')        # the fern frond
r.deco('fake-plant', 4, 33, 2.2, layer='back', flip=True)


if __name__ == '__main__':
    if '--dump' in sys.argv:
        z.dump(sys.argv[sys.argv.index('--dump') + 1:])
    else:
        z.write(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game', 'data', 'rooms', 'zone-07.js'))
