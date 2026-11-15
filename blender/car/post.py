import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, ".out")
PUBLIC = os.path.join(HERE, "..", "..", "public", "car")
BG = {"light": (0xF4, 0xF3, 0xEF), "dark": (0x0E, 0x0F, 0x11)}
WIDTH = {"exploded": 1920, "exploded-phone": 1000, "top": 2200, "top-phone": 700, "side": 2400}
QUALITY = 80


def poster(name):
    view, theme = name.rsplit("-", 1)
    shot = Image.open(os.path.join(OUT, name + ".png")).convert("RGBA")
    flat = Image.new("RGBA", shot.size, BG[theme] + (255,))
    flat.alpha_composite(shot)
    w = WIDTH[view]
    flat = flat.convert("RGB").resize((w, round(shot.height * w / shot.width)), Image.LANCZOS)
    path = os.path.join(PUBLIC, name + ".webp")
    flat.save(path, "WEBP", quality=QUALITY, method=6)
    print("poster", name, flat.size, os.path.getsize(path) // 1024, "KB")


os.makedirs(PUBLIC, exist_ok=True)
for name in sys.argv[1:]:
    poster(name)
