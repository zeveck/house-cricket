#!/usr/bin/env python3
"""Colour-match sprite animation frames to their reference picture, so they don't flicker (Pillow + numpy).

Usage:
  python3 tools/match-frames.py              match every frame below to its reference (idempotent)
  python3 tools/match-frames.py --check      report and fail (exit 1) if any group's frames spread too far
                                             (the PNG sources, then the WebP the game ships)
  python3 tools/match-frames.py --report     print the table, never fail
  python3 tools/match-frames.py pip soot     only these crickets / npcs / enemies

It works on the PNG sources under art/ (issue #14); run tools/build-art.py afterwards to make the
game's WebP from them. --check and --report measure both: the sources (the spread below), and the
built WebP, whose frames must each stand against their base as their sources do, within DRIFT
levels of mean luminance (lossy colour and downscaling must not undo the matching). A WebP is
measured at its source's size with its source's alpha (see load_any()).

What is matched (reference -> frames), paths under art/:
  crickets  sprites/crickets/<id>/base.png  -> anim/*/NN.png and poses/*.png
  npcs      sprites/npcs/<id>.png           -> <id>-talk.png (the talk flap alternates the two ~7.5/s)
  enemies   sprites/enemies/<id>/0.png      -> 1.png (0 and 1 are the walk loop)
  geckos    sprites/geckos/<id>/body.png    -> anim/*/NN.png (issue #26, Duchess's run/pounce/wake/tongue: whole
                                               bodies without the tail, so the tailless body is the reference; it
                                               is cut from idle.png, so they match her idle too)
The robot vacuum's frame 1 lights its ring up blue: that glow is the art, but the body round it
came out ~14 levels lighter than frame 0's, so it flickered too. For it (GLOW) only the body is
matched and measured: pixels whose blue is clearly above their red (the ring and its halo), and
the white-hot core they enclose, are left out of the statistics and left as drawn, with a soft
edge between (glow_weight()). --check measures the vacuum the same way (body only).
Not matched: an enemy's 2.png (flipped / stunned: a different view, belly up, drawn once, not
looped), the gecko rigs' pieces (body/tail/legs are pieces of one picture; strike/sleep are one-off poses),
portraits.

Method: per-channel histogram matching on opaque pixels (alpha >= 250). For each of R, G, B the
frame's quantiles (0.5 %..99.5 %) are mapped onto the reference's, giving a monotone tone curve
that is smoothed (no kinks -> no banding) and has its slope held to 0.6..1.6 in each pass (no
posterising, no crushed line art). Up to four passes are composed and the result rounded once, so
the combined curve is not held to that range: across the shipped frames its slope reaches 0..3.5
in the deepest shadows (the few near-black line pixels). The curve is applied
to every pixel with any alpha; alpha is untouched. The generated frames differ from their base by
a tone and white-balance shift (a lighter, greyer, bluer frame: darks darker and lights lighter
at once), not just an offset, so a full curve fits better than levels or mean/std (measured on
the talk frames, which line up pixel for pixel with their base: median error 1.8 levels for
histogram matching, 1.8 mean/std, 2.9 two-point levels, 7.7 untouched). Per channel also puts
back the hue the player sees in base.
Two-tone pictures (a clear gap between a dark and a light group, e.g. Rin's black body and pale
wings) are matched with each group weighted to the reference's proportions, so a frame that
shows less wing is not "corrected" by greying the body. See split().

Idempotent: a channel whose matching curve would move its pixels by <= TOL (0.75) levels on
average is left alone; a frame with all three channels matched is not rewritten at all.

Check (--check): mean luminance (Rec. 601, opaque pixels; two-tone pictures with their groups
weighted to the reference's proportions) may spread by at most MAX_SPREAD within each animation
loop (a talk/walk frame and its reference count as a loop), and each frame and pose may differ
from the reference by at most MAX_SPREAD. Poses are separate looks, so only the second applies.
"""
import glob, os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'art/sprites')            # the PNG sources (matched here)
BUILT = os.path.join(ROOT, 'game/assets/sprites')  # the WebP the game draws (tools/build-art.py), measured by --check

# Luminance points (0..255). Before matching, spreads ran to 16.6 (Pip's idle: 132 -> 148.5 every
# other frame) and 18-22 (centipede walk, Rin's poses); the smallest that read as a flicker when
# played were ~4-5 (Chip's idle 5.8, Dot's talk 5.4). After matching, the largest left anywhere
# is 0.5. 2 is four times that (room for a new frame's honest content differences) and well under
# the smallest visible step.
MAX_SPREAD = 2.0
# [issue 14] the built WebP: how far lossy colour (and downscaling) may move a frame's luminance
# relative to its base, against the same two sources.
DRIFT = 1.5  # the shipped frames drift 1.0 at most (the mosquito); visible flicker starts at ~4
OPAQUE = 250
QS = np.concatenate([[0.5], np.arange(2.5, 98, 2.5), [99.5]])
SLOPE = (0.6, 1.6)
GAP = 0.08          # see split()
GLOW = {'vacuum'}    # enemies whose frame 1 has a lit (blue) part left as drawn; see glow_weight()
GLOW_CLOSE = 9
GLOW_LO, GLOW_HI = 10, 30  # blue minus red: <= LO is body (matched, measured), >= HI is glow (untouched)


def load(p):
    return np.asarray(Image.open(p).convert('RGBA')).astype(np.float64)


LUMA = np.array([0.299, 0.587, 0.114])  # Rec. 601 luma weights (the issue's numbers use these)


def glow_weight(a):
    """0 for body pixels, 1 for lit-ring pixels (blue clearly above red), a ramp between. The ring's
    white-hot core is not blue, so the clearly-blue pixels are closed over (GLOW_CLOSE px) to take
    in what they enclose."""
    ramp = np.clip((a[..., 2] - a[..., 0] - GLOW_LO) / (GLOW_HI - GLOW_LO), 0, 1)
    m = Image.fromarray(((ramp >= 1) * 255).astype(np.uint8))
    m = m.filter(ImageFilter.MaxFilter(GLOW_CLOSE)).filter(ImageFilter.MinFilter(GLOW_CLOSE))
    return np.maximum(ramp, np.asarray(m) / 255.0)


def opaque(a, glow=False):
    m = a[..., 3] >= OPAQUE
    if glow:
        m &= glow_weight(a) == 0
    return a[..., :3][m]


def lum(a, glow=False):
    rgb = opaque(a, glow)
    return float((rgb @ LUMA).mean()) if len(rgb) else float('nan')


def otsu(L):
    h = np.bincount(np.clip(L, 0, 255).astype(int), minlength=256).astype(float)
    p = h / h.sum()
    w = np.cumsum(p)
    mu = np.cumsum(p * np.arange(256))
    with np.errstate(divide='ignore', invalid='ignore'):
        var = (mu[-1] * w - mu) ** 2 / (w * (1 - w))
    return int(np.nanargmax(var))


def split(rgb):
    """-> (is_light mask, light fraction, gap): the picture's two tone groups split at the Otsu
    threshold of its luminance; gap is True when few pixels (<= GAP) lie within 15 levels of the
    threshold, i.e. it really is two separate tones (Rin's black body and pale wings)."""
    L = rgb @ LUMA
    t = otsu(L)
    light = L > t
    return light, light.mean(), (np.abs(L - t) < 15).mean() <= GAP


def two_tone(rgb):
    """The reference's light fraction if it is a two-tone picture, else None."""
    _, f, gap = split(rgb)
    return f if gap else None


def weights(rgb, ref_frac):
    """Per-pixel weights that give a two-tone frame the reference's dark/light proportions. Rin's
    run shows less wing than her base: that is the drawing, not its tone, and plain histogram
    matching would 'correct' it by greying the body. Pictures without a clear gap between tones
    (every other sprite) get weight 1: there the Otsu split falls inside a busy tone range and
    moves with the shift being corrected, so reweighting would chase noise."""
    if ref_frac is None:
        return np.ones(len(rgb))
    light, f, _ = split(rgb)
    if f <= 0 or f >= 1:
        return np.ones(len(rgb))
    return np.where(light, ref_frac / f, (1 - ref_frac) / (1 - f))


def balanced_lum(a, ref_frac, glow=False):
    """Mean luminance with the frame's dark/light groups weighted to the reference's proportions."""
    rgb = opaque(a, glow)
    w = weights(rgb, ref_frac)
    return float(((rgb @ LUMA) * w).sum() / w.sum())


def wquant(x, w, qs):
    o = np.argsort(x)
    cw = np.cumsum(w[o])
    return np.interp(qs / 100 * cw[-1], cw - w[o] / 2, x[o])


def curve(src, w, ref):
    """256-entry tone curve mapping src channel values (weighted by w) onto ref's distribution."""
    sq, rq = wquant(src, w, QS), np.percentile(ref, QS)
    sq, rq = np.maximum.accumulate(sq), np.maximum.accumulate(rq)
    # anchor the ends with slope 1 beyond the extreme quantiles
    xs = np.concatenate([[sq[0] - 255], sq, [sq[-1] + 255]])
    ys = np.concatenate([[rq[0] - 255], rq, [rq[-1] + 255]])
    keep = np.concatenate([[True], np.diff(xs) > 1e-6])
    xs, ys = xs[keep], ys[keep]
    lut = np.interp(np.arange(256), xs, ys)
    k = np.ones(15) / 15  # smooth (+-7 levels) so the curve has no corners
    lut = np.convolve(np.pad(lut, 7, mode='edge'), k, mode='valid')
    d = np.clip(np.diff(lut), *SLOPE)  # limit contrast change: no gaps (banding), no flattening
    lut = np.concatenate([[lut[0]], lut[0] + np.cumsum(d)])
    # the clamp can drift the level: put the (weighted) mean back on the reference's
    lut += ref.mean() - (np.interp(src, np.arange(256), lut) * w).sum() / w.sum()
    return lut


TOL = 0.75  # levels: mean change a matching curve would make to a channel, below which a frame counts as matched
PASSES = 4  # the smoothed, slope-limited curve lands a little short; a few passes (composed, rounded once) close it


def tone_luts(rgb, w, ref_rgb):
    """-> per-channel composed curves (identity for a channel already within TOL)."""
    levels = np.arange(256, dtype=np.float64)
    luts = []
    for c in range(3):
        total, cur = levels.copy(), rgb[:, c]
        for i in range(PASSES):
            lut = curve(cur, w, ref_rgb[:, c])
            step = np.interp(cur, levels, lut)
            if i == 0 and (np.abs(step - cur) * w).sum() / w.sum() <= TOL:
                break  # this channel is already matched
            total, cur = np.interp(total, levels, lut), step
        luts.append(total)
    return luts


def match(path, ref_rgb, ref_frac, glow=False):
    a = load(path)
    levels = np.arange(256, dtype=np.float64)
    vis = a[..., 3] > 0
    g = glow_weight(a) if glow else np.zeros(a.shape[:2])
    for _ in range(8):
        # body = opaque pixels outside the glow; matching moves blue against red a little, so the
        # glow mask is taken from the result and the match redone until it settles (else a second
        # run would see a slightly different body and nudge it again)
        rgb = a[..., :3][(a[..., 3] >= OPAQUE) & (g == 0)]
        luts = tone_luts(rgb, weights(rgb, ref_frac), ref_rgb)
        out = a.copy()
        for c in range(3):
            out[..., c] = np.where(vis, np.interp(a[..., c], levels, luts[c]), a[..., c])
        out[..., :3] = out[..., :3] * (1 - g[..., None]) + a[..., :3] * g[..., None]  # the glow stays as drawn
        if not glow:
            break
        g2 = glow_weight(np.round(out))
        if np.array_equal(g2 == 0, g == 0) and np.abs(g2 - g).max() < 0.05:
            break
        g = g2
    if all(np.array_equal(t, levels) for t in luts):
        return False  # idempotent: a matched frame is left byte-for-byte alone
    out[..., :3] = np.clip(np.round(out[..., :3]), 0, 255)
    out[..., 3] = a[..., 3]
    Image.fromarray(out.astype(np.uint8), 'RGBA').save(path, optimize=True)
    return True


def groups(only):
    """-> [(name, ref, {set: [frames]}, glow)]"""
    out = []
    for d in sorted(glob.glob(os.path.join(SPR, 'crickets/*/'))):
        cid = os.path.basename(d.rstrip('/'))
        if only and cid not in only:
            continue
        sets = {os.path.basename(a): sorted(glob.glob(os.path.join(a, '*.png'))) for a in sorted(glob.glob(d + 'anim/*'))}
        sets['poses'] = sorted(glob.glob(d + 'poses/*.png'))
        out.append((f'cricket {cid}', d + 'base.png', sets, False))
    for t in sorted(glob.glob(os.path.join(SPR, 'npcs/*-talk.png'))):
        nid = os.path.basename(t)[:-9]
        if only and nid not in only:
            continue
        out.append((f'npc {nid}', t.replace('-talk.png', '.png'), {'talk': [t]}, False))
    for d in sorted(glob.glob(os.path.join(SPR, 'enemies/*/'))):
        eid = os.path.basename(d.rstrip('/'))
        if only and eid not in only:
            continue
        if os.path.exists(d + '1.png'):
            out.append((f'enemy {eid}', d + '0.png', {'walk': [d + '1.png']}, eid in GLOW))
    for d in sorted(glob.glob(os.path.join(SPR, 'geckos/*/'))):
        gid = os.path.basename(d.rstrip('/'))
        if (only and gid not in only) or not glob.glob(d + 'anim/*/*.png'):
            continue
        sets = {os.path.basename(a): sorted(glob.glob(os.path.join(a, '*.png'))) for a in sorted(glob.glob(d + 'anim/*'))}
        out.append((f'gecko {gid}', d + 'body.png', sets, False))
    return out


def built(p):
    """the WebP tools/build-art.py makes from a source PNG"""
    return os.path.join(BUILT, os.path.relpath(p, SPR))[:-4] + '.webp'


def as_built(gs):
    return [(f'{name} (webp)', built(ref), {s: [built(f) for f in fs] for s, fs in sets.items()}, glow) for name, ref, sets, glow in gs]


def source(p):
    """the PNG source of a built WebP"""
    return os.path.join(SPR, os.path.relpath(p, BUILT))[:-5] + '.png'


def load_any(p):
    """A picture as measured: a built WebP is scaled back to its source's size and given the source's
    alpha, so a downscaled one (the mites: 384 -> 120 px) is measured over the same pixels (its own
    soft edges would otherwise move which pixels count as opaque) and only its colour is compared."""
    if not p.endswith('.webp'):
        return load(p)
    s = Image.open(source(p)).convert('RGBA')
    w = Image.open(p).convert('RGBA')
    if w.size != s.size:
        w = w.resize(s.size, Image.LANCZOS)
    a = np.asarray(w).astype(np.float64).copy()
    a[..., 3] = np.asarray(s)[..., 3]
    return a


def main():
    args = sys.argv[1:]
    check, report = '--check' in args, '--report' in args
    only = {a for a in args if not a.startswith('--')}
    bad = changed = 0
    gs = groups(only)
    for name, ref, sets, glow in gs + (as_built(gs) if check or report else []):
        a = load_any(ref)
        ref_rgb = opaque(a, glow)
        ref_frac = two_tone(ref_rgb)
        if not (check or report):
            for fs in sets.values():
                for f in fs:
                    if match(f, ref_rgb, ref_frac, glow):
                        changed += 1
                        print('matched', os.path.relpath(f, ROOT))
            continue
        base = lum(a, glow)
        for s, fs in sets.items():
            if not fs:
                continue
            ims = [load_any(f) for f in fs]
            ls = [lum(x, glow) for x in ims]
            bs = [balanced_lum(x, ref_frac, glow) for x in ims]
            loop = bs if len(bs) > 1 else bs + [base]  # a lone talk/walk frame flaps with its reference
            within = max(loop) - min(loop) if s != 'poses' else 0.0  # poses are separate looks, not a loop
            vs_base = max(abs(x - base) for x in bs)
            raw = (max(ls) - min(ls)) if len(ls) > 1 else abs(ls[0] - base)
            flag = within > MAX_SPREAD or vs_base > MAX_SPREAD
            extra = ''
            if ref.endswith('.webp'):
                # [issue 14] the shipped WebP: each frame must sit against its base as its source does
                # (the sources passed the spread check above), within DRIFT levels of plain mean luminance
                sb = lum(load(source(ref)), glow)
                drift = max(abs((x - base) - (lum(load(source(f)), glow) - sb)) for x, f in zip(ls, fs))
                flag = drift > DRIFT
                extra = f' | vs source: drift {drift:4.1f}'
            bad += flag
            if report or flag:
                print(f"{'FAIL' if flag else 'ok  '} {name:25s} {s:6s} base {base:6.1f}  frames "
                      + ' '.join(f'{x:6.1f}' for x in ls)
                      + f'  | raw spread {raw:4.1f} | balanced: within {within:4.1f}  vs base {vs_base:4.1f}' + extra)
    if check or report:
        print(f'{bad} group(s) over {MAX_SPREAD} luminance spread' if bad else f'all frame groups within {MAX_SPREAD}')
        sys.exit(1 if bad and check else 0)
    print(f'{changed} frame(s) matched')


if __name__ == '__main__':
    main()
