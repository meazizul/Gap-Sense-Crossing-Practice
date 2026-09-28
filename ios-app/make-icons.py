"""Gap Sense app icon: a traveller with a white cane crossing a marked street.

Drawn programmatically so the mark can be regenerated at any size and the brand
colours changed in one place. Everything is bold and high-contrast: the icon has
to survive being shown at 60 px on a home screen.
"""
from PIL import Image, ImageDraw

BRAND_TOP = (15, 118, 110)      # teal-700
BRAND_BOTTOM = (14, 116, 144)   # cyan-700
WHITE = (255, 255, 255)
CANE_TIP = (255, 214, 102)      # amber — the one accent, marks the cane tip

SS = 4  # supersample for clean edges


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def draw_mark(d, S):
    """Draw into a S x S box. Coordinates are written in 0-100 space."""
    u = S / 100.0

    def P(x, y):
        return (x * u, y * u)

    def line(p1, p2, width, fill=WHITE):
        d.line([P(*p1), P(*p2)], fill=fill, width=max(1, int(width * u)), joint="curve")

    def dot(cx, cy, r, fill=WHITE):
        d.ellipse([P(cx - r, cy - r), P(cx + r, cy + r)], fill=fill)

    # --- crossing stripes: a clean ground band, clear of the figure ----
    for y, half, h in ((74.0, 26.0, 6.5), (86.0, 33.0, 7.0)):
        d.rounded_rectangle(
            [P(50 - half, y), P(50 + half, y + h)],
            radius=(h * u) * 0.42,
            fill=WHITE,
        )

    # --- the traveller, walking to the right ---------------------------
    dot(41, 18, 7.6)                      # head
    line((41.5, 26), (43.5, 45), 6.8)     # torso
    line((43.5, 44), (34, 68), 6.0)       # rear leg, pushing off
    line((43.5, 44), (52, 66), 6.0)       # front leg, mid-stride
    line((42.5, 30), (34.5, 41), 5.0)     # trailing arm
    line((43.0, 30), (55, 37), 5.0)       # leading arm, holding the cane

    # --- white cane, sweeping ahead and down ---------------------------
    line((55, 37), (73, 65), 3.8)
    dot(73.5, 66.5, 4.2, CANE_TIP)


def make(size, rounded=True):
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")

    for y in range(S):
        d.line([(0, y), (S, y)], fill=lerp(BRAND_TOP, BRAND_BOTTOM, y / max(1, S - 1)))

    draw_mark(d, S)

    if rounded:
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.2237), fill=255)
        img.putalpha(mask)
    return img.resize((size, size), Image.LANCZOS)


targets = [
    ("www/icons/icon-192.png", 192, True),
    ("www/icons/icon-512.png", 512, True),
    ("www/icons/icon-maskable-512.png", 512, False),
    ("www/icons/apple-touch-icon.png", 180, False),
    ("www/icons/icon-1024.png", 1024, False),
]

for path, size, rounded in targets:
    img = make(size, rounded=rounded)
    if not rounded:
        img = img.convert("RGB")
    img.save(path)
    print("wrote", path, f"{size}x{size}")
