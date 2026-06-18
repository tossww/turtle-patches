#!/usr/bin/env python3
"""Make the white background transparent (corner flood-fill so interior whites
like eyes survive), autocrop to content, and downscale. Writes to assets/."""
import sys, os, glob
from PIL import Image, ImageDraw

SRC = "assets_raw"
DST = "assets"
MAXSIZE = 512
SENTINEL = (255, 0, 255)
THRESH = 36

os.makedirs(DST, exist_ok=True)

def process(path):
    name = os.path.splitext(os.path.basename(path))[0]
    img = Image.open(path).convert("RGB")
    w, h = img.size
    # flood-fill from the four corners to mark the connected background
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        try:
            ImageDraw.floodfill(img, corner, SENTINEL, thresh=THRESH)
        except Exception:
            pass
    rgba = img.convert("RGBA")
    px = rgba.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if (r, g, b) == SENTINEL:
                px[x, y] = (0, 0, 0, 0)
    bbox = rgba.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    # pad to square
    cw, ch = rgba.size
    side = max(cw, ch)
    pad = int(side * 0.06)
    side += pad * 2
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(rgba, ((side - cw) // 2, (side - ch) // 2), rgba)
    if side > MAXSIZE:
        canvas = canvas.resize((MAXSIZE, MAXSIZE), Image.LANCZOS)
    canvas.save(os.path.join(DST, name + ".png"))
    return name

def main():
    files = sorted(glob.glob(os.path.join(SRC, "*.png")))
    if len(sys.argv) > 1:
        files = [f for f in files if os.path.splitext(os.path.basename(f))[0] in sys.argv[1:]]
    for f in files:
        n = process(f)
        print("processed", n)

if __name__ == "__main__":
    main()
