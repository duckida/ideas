#!/usr/bin/env python3
"""Generate a yellow-circle favicon.ico with multiple resolutions.

PIL's ICO writer resizes a single high-res source to every size listed in
`sizes`, so we only need to draw one 256px master image.
"""
from PIL import Image, ImageDraw

# Vibrant "Ideas" yellow
YELLOW = (255, 214, 10, 255)
RING = (224, 170, 0, 255)  # slightly darker ring for definition on white tabs


def make_circle(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    margin = max(1, size // 16)
    d.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=YELLOW,
        outline=RING,
        width=max(1, size // 32),
    )
    return img


sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

out = "src/app/favicon.ico"
master = make_circle(256)
master.save(out, sizes=sizes)
print(f"Wrote {out} with sizes {[w for (w, _) in sizes]}")
