#!/usr/bin/env python3
"""Slice each 2x2 chibi sprite sheet into 4 normalized frames and assemble a
horizontal 4-frame strip (idle, blink, grin, hop) for CSS steps() animation.

Output: assets/<name>.png  -> a FRAMES x FRAME horizontal strip (transparent).
Frame order in strip: [idle(TL), blink(TR), grin(BL), hop(BR)]
"""
import sys, os, glob
from PIL import Image, ImageDraw

SRC = "sheets_raw"
DST = "assets"
FRAME = 300          # px per frame (square)
TARGET = 0.82        # character occupies this fraction of frame height
SENTINEL = (255, 0, 255)
THRESH = 40

os.makedirs(DST, exist_ok=True)


def keyout(img):
    """Flood-fill the white background to transparent from many border points."""
    w, h = img.size
    pts = []
    for t in range(0, 100, 6):
        pts += [(int(w * t / 100), 0), (int(w * t / 100), h - 1),
                (0, int(h * t / 100)), (w - 1, int(h * t / 100))]
    for p in pts:
        try:
            ImageDraw.floodfill(img, p, SENTINEL, thresh=THRESH)
        except Exception:
            pass
    rgba = img.convert("RGBA")
    px = rgba.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][:3] == SENTINEL:
                px[x, y] = (0, 0, 0, 0)
    return rgba


def slice_quads(rgba):
    w, h = rgba.size
    mw, mh = w // 2, h // 2
    boxes = [(0, 0, mw, mh), (mw, 0, w, mh), (0, mh, mw, h), (mw, mh, w, h)]
    quads = []
    for b in boxes:
        q = rgba.crop(b)
        bbox = q.getbbox()
        quads.append(q.crop(bbox) if bbox else None)
    return quads


def process(path):
    name = os.path.splitext(os.path.basename(path))[0]
    img = Image.open(path).convert("RGB")
    rgba = keyout(img)
    quads = slice_quads(rgba)
    # fill any missing quad with the first valid one
    first = next((q for q in quads if q), None)
    if first is None:
        print("!! no content in", name); return None
    quads = [q if q else first.copy() for q in quads]
    # common scale: keep all frames the same character scale (no jitter on blink)
    max_h = max(q.height for q in quads)
    scale = (FRAME * TARGET) / max_h
    strip = Image.new("RGBA", (FRAME * 4, FRAME), (0, 0, 0, 0))
    baseline = int(FRAME * 0.95)            # feet sit here
    for i, q in enumerate(quads):
        nw, nh = max(1, int(q.width * scale)), max(1, int(q.height * scale))
        r = q.resize((nw, nh), Image.LANCZOS)
        x = i * FRAME + (FRAME - nw) // 2    # horizontally centered
        y = baseline - nh                    # bottom anchored
        strip.alpha_composite(r, (x, max(0, y)))
    strip.save(os.path.join(DST, name + ".png"))
    return name


def main():
    files = sorted(glob.glob(os.path.join(SRC, "*.png")))
    if len(sys.argv) > 1:
        want = set(sys.argv[1:])
        files = [f for f in files if os.path.splitext(os.path.basename(f))[0] in want]
    for f in files:
        n = process(f)
        if n:
            print("sliced", n)


if __name__ == "__main__":
    main()
