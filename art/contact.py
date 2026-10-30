"""Contact sheet of cut assets on a given background, to check cuts and alpha by eye."""
import sys
from PIL import Image
out, bg, *names = sys.argv[1:]
c = Image.new('RGBA', (len(names) * 140, 150), bg)
for i, n in enumerate(names):
    im = Image.open(f'public/art/{n}.png'); im.thumbnail((130, 130)); c.alpha_composite(im, (i * 140 + 5, 10))
c.save(out)
