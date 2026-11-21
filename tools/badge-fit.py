#!/usr/bin/env python3
"""[issue 39] Where each cricket's portrait sits in its round HUD badge (ui.js BADGE).

The portraits are whole side-view pictures, wider than tall, with long antennae. The badge shows the
whole body: the body's mask (alpha, opened so the thin antennae drop out) is fitted inside the circle
(the smallest circle around it, 97% of the badge), so only antenna tips are cut. Prints the JS table:
[w, x, y] = the picture's width, left and top, in % of the badge's inner size.
  python3 tools/badge-fit.py [preview.png]   (the preview: each badge at 4x, for a look)
"""
import glob, json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OPEN = 11     # px at the 512-wide source: wider than an antenna, thinner than a leg
FILL = 0.97   # the body's circle, as a share of the badge's


def enclose(pts):
    """Approximate smallest enclosing circle (Badoiu-Clarkson)."""
    c = pts.mean(0)
    for i in range(1, 400):
        d = np.hypot(*(pts - c).T)
        c = c + (pts[d.argmax()] - c) / (i + 1)
    return c, np.hypot(*(pts - c).T).max()


def fit(im):
    m = im.getchannel('A').point(lambda v: 255 if v > 90 else 0)
    m = m.filter(ImageFilter.MinFilter(OPEN)).filter(ImageFilter.MaxFilter(OPEN))
    ys, xs = np.nonzero(np.array(m)[::2, ::2])
    c, r = enclose(np.stack([xs * 2, ys * 2], 1).astype(float))
    s = FILL / 2 / r  # the badge is 1 across
    return dict(w=round(im.width * s * 100, 1), x=round((0.5 - c[0] * s) * 100, 1), y=round((0.5 - c[1] * s) * 100, 1))


def main():
    files = sorted(glob.glob('game/assets/sprites/crickets/*/portrait.webp'))
    table = {f.split('/')[-2]: fit(Image.open(f)) for f in files}
    print('const BADGE = {')
    for k, v in table.items():
        print(f"  {k}: {json.dumps([v['w'], v['x'], v['y']])},")
    print('};')
    if len(sys.argv) > 1:
        D = 188
        sheet = Image.new('RGBA', (len(files) * (D + 10), D), (42, 32, 26, 255))
        for i, f in enumerate(files):
            im = Image.open(f); v = table[f.split('/')[-2]]
            w = round(v['w'] / 100 * D); big = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            tile = Image.new('RGBA', (D, D), (60, 48, 38, 255)); tile.paste(big, (round(v['x'] / 100 * D), round(v['y'] / 100 * D)), big)
            mask = Image.new('L', (D, D), 0); ImageDraw.Draw(mask).ellipse((0, 0, D - 1, D - 1), 255)
            sheet.paste(tile, (i * (D + 10), 0), mask)
        sheet.save(sys.argv[1])


if __name__ == '__main__':
    main()
