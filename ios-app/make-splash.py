"""Launch-screen image: brand gradient with the cane-traveller mark centered.
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

# Centered cane-traveller mark, sized to ~46% of the canvas.
from make_icons_mark import draw_mark_on

draw_mark_on(d, SIZE, scale=0.46)

for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
    img.save(f"ios/App/App/Assets.xcassets/Splash.imageset/{name}")
    print("wrote", name)
