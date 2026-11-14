#!/usr/bin/env python3
"""Generate CrossLink PWA / app icons from code (no external assets needed).

Produces:
  public/icons/icon-192.png
  public/icons/icon-512.png
  public/icons/maskable-512.png
  public/icons/apple-touch-icon.png
  public/icons/icon.svg
"""

from __future__ import annotations

import math
import os
from PIL import Image, ImageChops, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "icons")

PRIMARY = (0, 106, 106, 255)      # --md-sys-color-primary #006a6a
PRIMARY_DARK = (0, 60, 60, 255)
WHITE = (255, 255, 255, 255)
SUPERSAMPLE = 4


def stadium_outline(size: int, width_ratio: float = 0.62, stroke_ratio: float = 0.095):
    """A single rounded 'chain link' outline, drawn at high resolution."""
    w = int(size * width_ratio)
    h = int(w * 0.46 / 0.62)
    stroke = max(2, int(size * stroke_ratio))
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0 = (size - w) // 2
    y0 = (size - h) // 2
    d.rounded_rectangle(
        [x0, y0, x0 + w, y0 + h],
        radius=h // 2,
        outline=WHITE,
        width=stroke,
    )
    return layer


def link_glyph(size: int) -> Image.Image:
    """Two interlocking stadium outlines rotated 45 degrees (chain link)."""
    link = stadium_outline(size)
    # Offset the two links along the 45-degree diagonal so their ends overlap.
    offset = int(size * 0.30)
    diag = offset / math.sqrt(2)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rotated = link.rotate(-45, resample=Image.BICUBIC, center=(size / 2, size / 2))
    for sign in (-1, 1):
        dx = sign * diag
        dy = sign * diag
        canvas.alpha_composite(rotated, (int(dx), int(dy)))
    return canvas


def make_icon(px: int, radius_ratio: float, glyph_scale: float, opaque: bool) -> Image.Image:
    big = px * SUPERSAMPLE
    radius = int(big * radius_ratio)

    shape_mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(shape_mask).rounded_rectangle(
        [0, 0, big - 1, big - 1], radius=radius, fill=255
    )

    base = Image.new("RGBA", (big, big), PRIMARY)

    # Subtle vertical wash for depth (Material 3 tonal feel), clipped to the shape.
    ramp = Image.new("L", (big, big), 0)
    rd = ImageDraw.Draw(ramp)
    for y in range(big):
        rd.line([(0, y), (big, y)], fill=int(56 * (y / big) ** 2))
    shade = Image.new("RGBA", (big, big), PRIMARY_DARK)
    shade.putalpha(ImageChops.multiply(ramp, shape_mask))

    bg = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    bg.paste(base, (0, 0), shape_mask)
    bg.alpha_composite(shade)

    glyph_size = int(big * glyph_scale)
    glyph = link_glyph(glyph_size)
    bg.alpha_composite(glyph, ((big - glyph_size) // 2, (big - glyph_size) // 2))

    icon = bg.resize((px, px), Image.LANCZOS)
    if opaque:
        solid = Image.new("RGBA", (px, px), PRIMARY)
        solid.alpha_composite(icon)
        return solid
    return icon


ICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="CrossLink">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#006a6a"/>
      <stop offset="1" stop-color="#003c3c"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <g transform="translate(256 256) rotate(-45) scale(0.7)" fill="none" stroke="#ffffff" stroke-width="49">
    <rect x="-312.1" y="-117.5" width="317" height="235" rx="117.5"/>
    <rect x="-4.9" y="-117.5" width="317" height="235" rx="117.5"/>
  </g>
</svg>
"""


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)

    targets = [
        ("icon-192.png", 192, 0.22, 0.70, False),
        ("icon-512.png", 512, 0.22, 0.70, False),
        # Maskable: full-bleed background, glyph inside the 80% safe zone.
        ("maskable-512.png", 512, 0.0, 0.56, True),
        # iOS applies its own corner mask, so keep it square and opaque.
        ("apple-touch-icon.png", 180, 0.0, 0.70, True),
    ]
    for name, px, radius_ratio, glyph_scale, opaque in targets:
        icon = make_icon(px, radius_ratio, glyph_scale, opaque)
        path = os.path.join(OUT_DIR, name)
        icon.save(path, "PNG", optimize=True)
        print("wrote", path, icon.size)

    svg_path = os.path.join(OUT_DIR, "icon.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(ICON_SVG)
    print("wrote", svg_path)


if __name__ == "__main__":
    main()
