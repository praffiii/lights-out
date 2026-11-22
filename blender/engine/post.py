import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, ".out")
PUBLIC = os.path.join(HERE, "..", "..", "public", "engine")
BG = {"light": (0xF4, 0xF3, 0xEF), "dark": (0x0E, 0x0F, 0x11)}
WIDTH = {"exploded": 1920, "band": 1920}
QUALITY = 80
FADE = 0.14
SHADOW = (1024, 704)


def edge_fade(shot):
    w, h = shot.size
    mx, my = max(1, int(w * FADE)), max(1, int(h * FADE))
    rx = [min(1.0, i / mx, (w - 1 - i) / mx) for i in range(w)]
    ry = [min(1.0, j / my, (h - 1 - j) / my) for j in range(h)]
    rx = [t * t * (3 - 2 * t) for t in rx]
    ry = [t * t * (3 - 2 * t) for t in ry]
    alpha = shot.getchannel("A")
    src = alpha.tobytes()
    out = bytearray(len(src))
    for j in range(h):
        wy = ry[j]
        row = j * w
        if wy >= 1.0:
            for i in range(mx):
                out[row + i] = int(src[row + i] * rx[i])
            out[row + mx : row + w - mx] = src[row + mx : row + w - mx]
            for i in range(w - mx, w):
                out[row + i] = int(src[row + i] * rx[i])
        else:
            for i in range(w):
                out[row + i] = int(src[row + i] * rx[i] * wy)
    shot = shot.copy()
    shot.putalpha(Image.frombytes("L", (w, h), bytes(out)))
    return shot


def poster(name):
    view, theme = name.rsplit("-", 1)
    shot = Image.open(os.path.join(OUT, name + ".png")).convert("RGBA")
    if name == "band-light":
        shot = edge_fade(shot)
    flat = Image.new("RGBA", shot.size, BG[theme] + (255,))
    flat.alpha_composite(shot)
    w = WIDTH[view]
    flat = flat.convert("RGB").resize((w, round(shot.height * w / shot.width)), Image.LANCZOS)
    path = os.path.join(PUBLIC, name + ".webp")
    flat.save(path, "WEBP", quality=QUALITY, method=6)
    print("poster", name, flat.size, os.path.getsize(path) // 1024, "KB")


def shadow(name):
    shot = Image.open(os.path.join(OUT, name + ".png")).convert("RGBA")
    alpha = shot.getchannel("A").resize(SHADOW, Image.LANCZOS)
    path = os.path.join(PUBLIC, name + ".webp")
    alpha.save(path, "WEBP", quality=QUALITY, method=6)
    print("shadow", name, alpha.size, os.path.getsize(path) // 1024, "KB")


os.makedirs(PUBLIC, exist_ok=True)
for name in sys.argv[1:]:
    (shadow if name.startswith("shadow-") else poster)(name)
