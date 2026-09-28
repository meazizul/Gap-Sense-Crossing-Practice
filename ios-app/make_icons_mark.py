"""Shared drawing helper so the icon and the launch image use one mark."""
from PIL import ImageDraw

WHITE = (255, 255, 255)
CANE_TIP = (255, 214, 102)


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




def draw_mark_on(d, canvas_size, scale=1.0):
    """Draw the mark centred on a canvas, occupying `scale` of its width."""
    box = canvas_size * scale
    offset = (canvas_size - box) / 2

    class Shifted:
        def __init__(self, inner):
            self._d = inner

        def _shift(self, pts):
            return [(x + offset, y + offset) for (x, y) in pts]

        def line(self, pts, **kw):
            self._d.line(self._shift(pts), **kw)

        def ellipse(self, pts, **kw):
            self._d.ellipse(self._shift(pts), **kw)

        def rounded_rectangle(self, pts, **kw):
            self._d.rounded_rectangle(self._shift(pts), **kw)

    draw_mark(Shifted(d), box)
