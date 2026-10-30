"""Cut a generated sheet into assets and force them onto the game palette.

usage: uv run --with pillow --with numpy --with scipy python -I art/process.py <sheet.png> <out_dir> <cols>x<rows> name1 name2 ...
       names are read left to right, top to bottom. A name of "-" skips that cell; a trailing "!" (ping!) makes
       all paper transparent, for open shapes like rings.
       --whole <name>  keeps the image as one asset (scenes) instead of cutting it.

Each pixel snaps to the nearest palette colour (GPT does not hold exact hexes). Paper that touches the outside of an
icon becomes transparent; paper enclosed by linework stays opaque so the icon reads as a solid object.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

PAPER = (232, 231, 225)
INK = (17, 19, 18)
NET = (19, 145, 125)
ALERT = (217, 81, 44)
PALETTE = np.array([PAPER, INK, NET, ALERT], dtype=np.int32)


def snap(rgb: np.ndarray) -> np.ndarray:
    """Index of the nearest palette colour per pixel."""
    d = ((rgb[:, :, None, :].astype(np.int32) - PALETTE[None, None]) ** 2).sum(-1)
    return d.argmin(-1)


def to_rgba(idx: np.ndarray, keep_inside: bool) -> Image.Image:
    rgba = np.zeros(idx.shape + (4,), dtype=np.uint8)
    rgba[..., :3] = PALETTE[idx]
    rgba[..., 3] = 255
    paper = idx == 0
    if keep_inside:
        lab, _ = ndimage.label(paper)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        rgba[np.isin(lab, list(edge)), 3] = 0
    else:
        rgba[paper, 3] = 0
    return Image.fromarray(rgba, 'RGBA')


def cells(idx: np.ndarray, cols: int, rows: int):
    """Union of all ink blobs whose centre falls in each grid cell (GPT keeps rough cells, not exact ones)."""
    lab, _ = ndimage.label(ndimage.binary_dilation(idx != 0, iterations=6))
    H, W = idx.shape
    box = {}
    for s in ndimage.find_objects(lab):
        if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) < 60:
            continue  # stray specks
        cy, cx = (s[0].start + s[0].stop) / 2, (s[1].start + s[1].stop) / 2
        k = (int(cy * rows / H), int(cx * cols / W))
        y0, y1, x0, x1 = box.get(k, (H, 0, W, 0))
        box[k] = (min(y0, s[0].start), max(y1, s[0].stop), min(x0, s[1].start), max(x1, s[1].stop))
    return [(slice(b[0], b[1]), slice(b[2], b[3])) for k, b in sorted(box.items())]


def main():
    args = sys.argv[1:]
    sheet, out = Path(args[0]), Path(args[1])
    out.mkdir(parents=True, exist_ok=True)
    idx = snap(np.asarray(Image.open(sheet).convert('RGB')))
    if args[2] == '--whole':
        to_rgba(idx, keep_inside=True).convert('RGB').save(out / f'{args[3]}.png', optimize=True)
        print(args[3], idx.shape[::-1])
        return
    cols, rows = map(int, args[2].split('x'))
    names = args[3:]
    found = cells(idx, cols, rows)
    if len(found) != len(names):
        sys.exit(f'{len(found)} cells have ink, {len(names)} names given')
    for name, (ys, xs) in zip(names, found):
        if name == '-':
            continue
        pad = 6
        crop = idx[ys.start + 6:ys.stop - 6, xs.start + 6:xs.stop - 6]
        h, w = crop.shape
        side = max(h, w) + 2 * pad
        sq = np.zeros((side, side), dtype=crop.dtype)
        y0, x0 = (side - h) // 2, (side - w) // 2
        sq[y0:y0 + h, x0:x0 + w] = crop
        to_rgba(sq, keep_inside=not name.endswith("!")).save(out / f"{name.rstrip('!')}.png", optimize=True)
        print(name, side)


main()
