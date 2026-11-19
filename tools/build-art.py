#!/usr/bin/env python3
"""Build the game's sprite pictures: art/**/*.png (the sources) -> game/assets/**/*.webp (Pillow).

Usage:
  python3 tools/build-art.py            build what changed (a source, or the settings for it)
  python3 tools/build-art.py --all      rebuild every picture
  python3 tools/build-art.py --check    fail (exit 1) if a picture is missing, out of date, or
                                        left over from a deleted source; changes nothing
  python3 tools/build-art.py pip props  only sources whose path contains one of these words

The source art (issue #14): every sprite, prop, item, Carrier piece and UI picture is painted and
kept as a PNG under art/, at the path it has in game/assets/ (art/sprites/crickets/pip/base.png ->
game/assets/sprites/crickets/pip/base.webp). Edit or add the PNG there, run this, then
`node tools/list-assets.mjs`. The game only reads the WebP; the JSON beside the pictures (gecko
meta.json, cricket anchors.json) stays in game/assets/ and is in the source pictures' pixels.

WebP: lossy colour at QUALITY with lossless alpha (edges, and the alpha the game measures for
bounding boxes, are exact), method 6. At 90 the colour moves ~2-5 levels on average, which can't
be seen at 100 % (tools: before/after contact sheets, issue #14), for ~1/8 of the PNG's bytes.

Downscaling (art/max-size.json): a picture stored far larger than the game ever draws it is shrunk to keep
2x its largest drawn size (hi-DPI headroom), measured at 1920x1080. Only pictures the game always
draws at an explicit size (props, items, enemies, NPCs, the Carrier, UI) may be shrunk: crickets
and geckos are drawn in their own pixels (anchors.json, meta.json), so they keep their size.

Not built (SKIP): sources the game never draws (terrain swatches feed tools/make-textures.py, the
app icon's source, unused ink blots).

The frame brightness matching (tools/match-frames.py) works on the PNG sources; its --check also
measures the built WebP frames.

A manifest (art/build.json) records each built picture's source hash and settings, so a rebuild
only touches what changed and --check can tell what's stale without re-encoding.
"""
import fnmatch, hashlib, json, os, re, sys
from multiprocessing import Pool
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art')
OUT = os.path.join(ROOT, 'game', 'assets')
MANIFEST = os.path.join(SRC, 'build.json')
QUALITY = 90
METHOD = 6
SKIP = ['terrain/*', 'ui/app-icon-source.png', 'ui/blot-*.png']
# art/max-size.json: {path or glob: the largest stored dimension in px}. From a drawn-size sweep at
# 1920x1080 (issue #14: every solution replayed in the browser, recording the largest size each
# picture is drawn at): 2x that (+15 %), for pictures that came out under 3/4 of their source. Pictures
# not listed are kept at their source size. First match wins.
SIZES = os.path.join(SRC, 'max-size.json')
SCALE = json.load(open(SIZES)) if os.path.exists(SIZES) else {}


def rel_sources():
    out = []
    for d, _, fs in os.walk(SRC):
        for f in fs:
            if f.endswith('.png'):
                out.append(os.path.relpath(os.path.join(d, f), SRC).replace(os.sep, '/'))
    return sorted(out)


def skipped(rel):
    return any(fnmatch.fnmatch(rel, g) for g in SKIP)


# Never downscaled, whatever max-size.json says: NPC pictures double as dialog portraits, and the
# browser's <img> downsampling softened their ink lines visibly when shrunk (issue #14 review).
FULL_SIZE = ['sprites/npcs/*']


def max_dim(rel):
    if any(fnmatch.fnmatch(rel, g) for g in FULL_SIZE):
        return None
    for g, m in SCALE.items():
        if fnmatch.fnmatch(rel, g):
            return m
    return None


def sha1(path):
    with open(path, 'rb') as f:
        return hashlib.sha1(f.read()).hexdigest()


def out_path(rel):
    return os.path.join(OUT, rel[:-4] + '.webp')


def settings(rel):
    return {'q': QUALITY, 'm': METHOD, 'max': max_dim(rel)}


def build(rel):
    im = Image.open(os.path.join(SRC, rel))
    im.load()
    if im.mode not in ('RGB', 'RGBA'):
        im = im.convert('RGBA')
    m = max_dim(rel)
    if m and max(im.size) > m:
        k = m / max(im.size)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    dst = out_path(rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, 'WEBP', quality=QUALITY, method=METHOD, alpha_quality=100)
    return im.size


def main():
    args = sys.argv[1:]
    check, everything = '--check' in args, '--all' in args
    only = [a for a in args if not a.startswith('--')]
    man = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    srcs = [r for r in rel_sources() if not skipped(r)]
    want = {r[:-4] + '.webp' for r in srcs}
    problems, built, todo = [], 0, []
    for rel in srcs:
        if only and not any(w in rel for w in only):
            continue
        key = rel[:-4] + '.webp'
        h, st = sha1(os.path.join(SRC, rel)), settings(rel)
        rec = man.get(key)
        fresh = rec and rec.get('src') == h and rec.get('set') == st and os.path.exists(out_path(rel))
        if fresh and not everything:
            continue
        if check:
            problems.append(f'{"stale" if os.path.exists(out_path(rel)) else "missing"}: game/assets/{key} (from art/{rel})')
            continue
        todo.append((rel, key, h, st))
    # encode on every core (method 6 is slow: ~15 min for everything on one)
    with Pool() as pool:
        for (rel, key, h, st), size in zip(todo, pool.imap(build, [t[0] for t in todo])):
            man[key] = {'src': h, 'set': st, 'size': list(size)}
            built += 1
            print('built', key, f'{size[0]}x{size[1]}', flush=True)
    # outputs whose source is gone (only in folders that have sources)
    folders = {os.path.dirname(k) for k in want}
    for d, _, fs in os.walk(OUT):
        for f in fs:
            if not f.endswith('.webp'):
                continue
            key = os.path.relpath(os.path.join(d, f), OUT).replace(os.sep, '/')
            if os.path.dirname(key) in folders and key not in want:
                problems.append(f'orphan: game/assets/{key} (no art/{key[:-5]}.png)')
    for k in [k for k in man if k not in want]:
        if check:
            problems.append(f'manifest: {k} has no source')
        else:
            del man[k]
    if check:
        # [issue #24] the JSON beside the pictures (gecko meta.json) names its frames by file: when the
        # sprites moved to WebP these still said .png, so no gecko's sleep, strike or legs ever drew
        for dirpath, _, files in os.walk(OUT):
            for f in files:
                if not f.endswith('.json'):
                    continue
                jp = os.path.join(dirpath, f)
                for name in re.findall(r'"file"\s*:\s*"([^"]+)"', open(jp).read()):
                    if not os.path.exists(os.path.join(dirpath, name)):
                        problems.append(f'missing: {os.path.relpath(jp, ROOT)} names {name}, which isn\'t there')
        for p in problems:
            print(p)
        print(f'{len(problems)} problem(s)' if problems else f'all {len(srcs)} pictures built and up to date')
        sys.exit(1 if problems else 0)
    with open(MANIFEST, 'w') as f:
        json.dump(dict(sorted(man.items())), f, indent=0)
        f.write('\n')
    for p in problems:
        print(p)
    print(f'{built} picture(s) built')


if __name__ == '__main__':
    main()
