"""Generate app icons: a zebra-crossing glyph on the brand gradient.
Re-run after changing BRAND_TOP / BRAND_BOTTOM to refresh every size."""
from PIL import Image, ImageDraw

BRAND_TOP = (15, 118, 110)     # teal-700
BRAND_BOTTOM = (14, 116, 144)  # cyan-700
STRIPE = (255, 255, 255)

SS = 4  # supersample factor for clean edges


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def make(size, rounded=True):
    w = size * SS
    img = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Diagonal-ish vertical gradient.
    for y in range(w):
        d.line([(0, y), (w, y)], fill=lerp(BRAND_TOP, BRAND_BOTTOM, y / max(1, w - 1)))

    # Zebra-crossing stripes in perspective: bars get narrower toward the top.
    n = 4
    top_margin = w * 0.20
    bottom_margin = w * 0.14
    band = w - top_margin - bottom_margin
    gap_ratio = 0.42
    bar_h = band / (n + (n - 1) * gap_ratio)
    gap = bar_h * gap_ratio

    for i in range(n):
        y0 = top_margin + i * (bar_h + gap)
        y1 = y0 + bar_h
        # Perspective: narrowest at the top (i == 0), widest at the bottom.
        t = i / (n - 1)
        half = (0.20 + 0.14 * t) * w
        cx = w / 2
        r = bar_h * 0.34
        d.rounded_rectangle([cx - half, y0, cx + half, y1], radius=r, fill=STRIPE)

    if rounded:
        # iOS applies its own mask, but a rounded source looks right everywhere else.
        mask = Image.new("L", (w, w), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, w - 1], radius=int(w * 0.2237), fill=255)
        img.putalpha(mask)

    return img.resize((size, size), Image.LANCZOS)


def make_square_opaque(size):
    """App Store / Capacitor icons must be square with no alpha."""
    img = make(size, rounded=False).convert("RGB")
    return img


targets = [
    ("www/icons/icon-192.png", 192, True),
    ("www/icons/icon-512.png", 512, True),
    ("www/icons/icon-maskable-512.png", 512, False),
    ("www/icons/apple-touch-icon.png", 180, False),
    ("www/icons/icon-1024.png", 1024, False),
]

for path, size, rounded in targets:
    if rounded:
        make(size, rounded=True).save(path)
    else:
        make_square_opaque(size).save(path)
    print("wrote", path, f"{size}x{size}")
