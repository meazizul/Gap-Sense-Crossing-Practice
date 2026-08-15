"""Launch-screen image: brand gradient with the crossing glyph centered.
2732x2732 so it covers every device in any orientation."""
from PIL import Image, ImageDraw

BRAND_TOP = (15, 118, 110)
BRAND_BOTTOM = (14, 116, 144)
SIZE = 2732


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


img = Image.new("RGB", (SIZE, SIZE))
d = ImageDraw.Draw(img)
for y in range(SIZE):
    d.line([(0, y), (SIZE, y)], fill=lerp(BRAND_TOP, BRAND_BOTTOM, y / (SIZE - 1)))

# Centered crossing glyph, sized to ~34% of the canvas.
glyph = SIZE * 0.34
cx = cy = SIZE / 2
n = 4
gap_ratio = 0.42
bar_h = glyph / (n + (n - 1) * gap_ratio)
gap = bar_h * gap_ratio
top = cy - glyph / 2

for i in range(n):
    y0 = top + i * (bar_h + gap)
    t = i / (n - 1)
    half = (0.30 + 0.21 * t) * glyph
    d.rounded_rectangle([cx - half, y0, cx + half, y0 + bar_h],
                        radius=bar_h * 0.34, fill=(255, 255, 255))

for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
    img.save(f"ios/App/App/Assets.xcassets/Splash.imageset/{name}")
    print("wrote", name)
