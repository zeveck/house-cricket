#!/usr/bin/env python3
"""Draws the sandbox zone (zone-99) as ASCII grids and writes game/data/rooms/zone-99.js.
Edit this to change the sandbox; the output file is plain data other tools read."""
import json, os

class R:
    def __init__(s, w, h, fill='.'):
        s.w, s.h = w*32, h*18
        s.g = [[fill]*s.w for _ in range(s.h)]
    def rect(s, x0, y0, x1, y1, ch='#'):
        for y in range(y0, y1+1):
            for x in range(x0, x1+1):
                s.g[y][x] = ch
    def put(s, x, y, ch): s.g[y][x] = ch
    def rows(s): return [''.join(r) for r in s.g]

rooms = []

# ---- R1 meadow: run, hop, one-way platforms, a pit, an ant, Tape Booties ----
r = R(1, 1)
r.rect(0, 0, 31, 0)            # ceiling
r.rect(0, 0, 0, 17)            # left wall
r.rect(0, 16, 31, 17)          # floor
r.rect(12, 16, 14, 17, '.')    # the pit (3 wide)
r.rect(31, 1, 31, 12)          # right wall above the exit (rows 13-15 open)
for (y, x0, x1) in [(14, 17, 21), (12, 21, 25), (10, 25, 29), (8, 26, 30)]:
    r.rect(x0, y, x1, y, '=')
r.put(3, 15, 'P'); r.put(6, 15, 'S'); r.put(9, 15, 'h')
r.rect(30, 7, 30, 7, '.')
rooms.append(dict(id='sb-meadow', name='Sandbox: Meadow', x=100, y=100, grid=r.rows(), entities=[
    dict(type='sign', x=1, y=15, w=9, text='{left} {right} move. {jump} jumps (hold it for higher). {kick} kicks. {chirp} chirps.'),
    dict(type='sign', x=15, y=15, w=6, text='{down} + {jump} drops through the thin platforms.'),
    dict(type='ant', x=20, y=15, range=[16, 26]),
    dict(type='item', item='booties', x=28, y=7),
]))

# ---- R2 shaft (1x2): wall-jump shaft, Floss Line, hooks over tacks ----
r = R(1, 2)
r.rect(0, 0, 31, 0); r.rect(0, 0, 0, 35); r.rect(31, 0, 31, 10); r.rect(31, 14, 31, 35)
r.rect(0, 34, 31, 35)                      # floor of the lower screen
r.rect(0, 14, 11, 14)                      # upper-left ledge (top of wall A)
r.rect(11, 15, 11, 30)                     # wall A (gap below it, rows 31-33, to walk in)
r.rect(15, 14, 16, 33)                     # wall B (2 wide), lip on top at row 14
r.rect(17, 33, 30, 33, '^')                # tacks under the hooks
r.rect(27, 14, 30, 14)                     # landing ledge by the exit
r.rect(0, 31, 10, 33, '.')                 # entry corridor (open to the meadow)
r.put(3, 33, 'k'); r.put(4, 13, 'k')
r.put(18, 10, 'H'); r.put(23, 12, 'H')
rooms.append(dict(id='sb-shaft', name='Sandbox: Shaft', x=101, y=99, grid=r.rows(), entities=[
    dict(type='sign', x=5, y=33, w=6, text='Tape Booties: press toward a wall in the air to cling, then {jump} to kick off.'),
    dict(type='item', item='floss', x=7, y=13),
    dict(type='sign', x=1, y=13, w=9, text='{use} near a hook grabs it. {left} {right} pump the swing; {lineOff} jumps off; {use} lets go.'),
]))

# ---- R3 pond (2x1): raft and current, rubber band 7-tile cliff, glider gap ----
r = R(2, 1)
r.rect(0, 0, 63, 0); r.rect(0, 15, 6, 17); r.rect(0, 10, 0, 10); r.rect(0, 1, 0, 10)
r.rect(0, 14, 6, 14)                       # entry floor
r.rect(7, 15, 20, 16, '~'); r.rect(7, 17, 20, 17)   # the pond
r.rect(21, 14, 30, 17)                     # far bank
r.rect(31, 7, 36, 17, 'G')                 # the 7-tile glass cliff (no cling)
r.rect(37, 16, 52, 16, '^'); r.rect(37, 17, 52, 17)  # tacks at the bottom of the glide gap
r.rect(53, 10, 63, 17)                     # landing ledge (3 below the cliff top)
r.rect(63, 1, 63, 6)                       # right wall above the exit (rows 7-9 open)
rooms.append(dict(id='sb-pond', name='Sandbox: Pond', x=102, y=99, grid=r.rows(), entities=[
    dict(type='item', item='raft', x=4, y=13),
    dict(type='current', x=7, y=13, w=14, h=3, vx=1.2),
    dict(type='sign', x=1, y=13, w=5, text='The Raft floats you across water. Without it, water is a pit.'),
    dict(type='item', item='band', x=23, y=13),
    dict(type='sign', x=21, y=13, w=9, text='Hold {use} on the ground to charge the Rubber Band; let go to launch.'),
    dict(type='item', item='glider', x=34, y=6),
    dict(type='sign', x=31, y=6, w=6, text='Hold {jump} while falling to glide.'),
    dict(type='ant', x=57, y=9, range=[54, 61]),
]))

# ---- R4 cellar (1x2): thimble + cereal plug, beetle sneak, loud zone ----
r = R(1, 2)
r.rect(0, 0, 31, 0); r.rect(0, 0, 0, 6); r.rect(0, 10, 0, 35); r.rect(31, 0, 31, 30); r.rect(31, 34, 31, 35)
r.rect(0, 10, 31, 17)                      # thick floor between the screens
r.rect(14, 10, 17, 12, 'C')                # the cereal plug (a cereal wall to pound through)
r.rect(14, 13, 17, 17, '.')                # the shaft under the plug
r.rect(0, 34, 31, 35)                      # lower floor
r.rect(1, 18, 13, 32)                      # low ceiling: the beetle corridor is one tile tall (row 33)
r.rect(18, 18, 30, 27)                     # ceiling over the loud corridor
r.put(2, 9, 'k'); r.put(16, 33, 'k')
r.put(4, 33, 'h'); r.put(9, 33, 'h')
rooms.append(dict(id='sb-cellar', name='Sandbox: Cellar', x=104, y=99, grid=r.rows(), entities=[
    dict(type='item', item='thimble', x=7, y=9),
    dict(type='sign', x=8, y=9, w=6, text='Thimble: {down} + {jump} in the air ground-pounds. Cereal crumbles.'),
    dict(type='beetle', x=8, y=33, range=[1, 12]),
    dict(type='item', item='earplugs', x=2, y=33),
    dict(type='sign', x=14, y=33, w=4, text='Beetles can’t be beaten. {enter} at a crack hides you.'),
    dict(type='loud', x=20, y=28, w=5, h=6),
    dict(type='item', item='glow', x=27, y=33),
]))

# ---- R5 dark (1x1): darkness (needs the Glow Bead), Swift Feather, the rescue ----
r = R(1, 1)
r.rect(0, 0, 31, 0); r.rect(0, 0, 0, 12); r.rect(31, 0, 31, 17); r.rect(0, 16, 31, 17)
r.rect(22, 11, 30, 11)                     # high ledge (5 above the floor)
r.rect(10, 13, 13, 13, '=')
r.rect(17, 3, 17, 12, '%')                 # a crack only Mote fits (pointless here; a test)
r.put(27, 10, 'B')
rooms.append(dict(id='sb-dark', name='Sandbox: Dark', x=105, y=100, dark=True, needs='glow',
    needsMsg='Too dark to go in without a light. (Glow Bead)', grid=r.rows(), entities=[
    dict(type='item', item='feather', x=6, y=15),
    dict(type='sign', x=2, y=15, w=6, text='Swift Feather: press {jump} again in the air to flutter.'),
    dict(type='ant', x=8, y=15, range=[3, 20]),
    dict(type='cage', cricket='stripe', x=27, y=10),
]))

# ---- R6 feel lab (isolated; goToRoom only): limits of coyote, buffer, grace, magnet ----
r = R(1, 1)
r.rect(0, 0, 31, 0); r.rect(0, 0, 0, 17); r.rect(31, 0, 31, 17); r.rect(0, 16, 31, 17)
r.rect(1, 12, 8, 15)                       # ledge to walk off (coyote)
r.rect(9, 16, 12, 17, '^')                 # tacks below the coyote gap
r.rect(13, 12, 15, 15)                     # landing (gap 4)
r.rect(19, 4, 19, 13); r.rect(23, 4, 23, 15)   # wall-grace walls (3 wide inner)
r.rect(20, 3, 22, 3, '=')
r.put(27, 6, 'H')
r.put(2, 11, 'P')
rooms.append(dict(id='sb-feel', name='Sandbox: Feel lab', x=90, y=100, grid=r.rows(), entities=[]))

# Render-only room fields (the sim ignores them; see ENGINE_NOTES "Rendering"): a showcase of the painter.
EXTRA = {
    'sb-meadow': dict(decor=[dict(prop='spool', x=7, y=15, h=2.2), dict(prop='cushion', x=29, y=15, h=1.1, layer='mid')],
                      paint=[dict(kind='sand', x=16, y=16, w=16, h=2)]),
    'sb-shaft': dict(bg=dict(v='b', mirror=False)),
    'sb-pond': dict(bg=dict(v='a', mirror=True), fx=[dict(kind='motes', x=4, y=2, w=24, h=8)]),
    'sb-cellar': dict(paint=[dict(kind='plaster', x=0, y=10, w=14, h=3), dict(kind='crumbling-floor', x=18, y=10, w=14, h=3),
                             dict(kind='soil', x=0, y=34, w=32, h=2)],
                      fx=[dict(kind='steam', x=22, y=33), dict(kind='dust', x=2, y=12, w=12, h=10)],
                      decor=[dict(prop='spool', x=29, y=33, h=1.2, layer='mid')]),
}
for rm in rooms: rm.update(EXTRA.get(rm['id'], {}))

zone = dict(id='zone-99', n=99, name='Sandbox', bg='z01-bedroom', palette=['#3B4A7A', '#F2C46D', '#C8564B', '#7C98C4'],
            start=dict(room='sb-meadow'), beacon=dict(room='sb-dark', x=27, y=10), rooms=rooms)

out = ["// Sandbox zone (zone 99): exercises every move and item. Generated by tools/make-sandbox.py;",
       "// edit that script (or this file by hand: it is plain data) and re-run tools/check-world.mjs.",
       "export default {"]
for k in ['id', 'n', 'name', 'bg', 'palette', 'start', 'beacon']:
    out.append(f"  {k}: {json.dumps(zone[k])},")
out.append("  rooms: [")
for rm in rooms:
    out.append("    {")
    for k in ['id', 'name', 'x', 'y', 'dark', 'needs', 'needsMsg', 'bg', 'decor', 'paint', 'fx']:
        if k in rm: out.append(f"      {k}: {json.dumps(rm[k], ensure_ascii=False)},")
    out.append("      grid: [")
    for row in rm['grid']: out.append(f"        '{row}',")
    out.append("      ],")
    out.append("      entities: [")
    for e in rm['entities']: out.append(f"        {json.dumps(e, ensure_ascii=False)},")
    out.append("      ],")
    out.append("    },")
out.append("  ],")
out.append("};")
p = os.path.join(os.path.dirname(__file__), '..', 'game', 'data', 'rooms', 'zone-99.js')
open(p, 'w').write('\n'.join(out) + '\n')
print('wrote', os.path.normpath(p))
