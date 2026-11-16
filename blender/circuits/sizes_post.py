import json
import os
import sys

from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, ".out", "sizes")
PUBLIC = os.path.join(HERE, "..", "..", "public", "circuits", "sizes")
JSON = os.path.join(HERE, "..", "..", "src", "tracks", "sizes.json")
RING = 2
TOLERANCE = 2


def seam(base, patch, x, y):
    w, h = patch.size
    region = base.crop((x, y, x + w, y + h))
    diff = ImageChops.difference(region, patch)
    inner = Image.new("L", (w, h), 255)
    inner.paste(0, (RING, RING, w - RING, h - RING))
    worst = max(hi for _, hi in diff.convert("RGB").getextrema())
    ring = max(hi for _, hi in ImageChops.multiply(diff.convert("RGB"), Image.merge("RGB", [inner] * 3)).getextrema())
    return ring, worst


def main():
    os.makedirs(PUBLIC, exist_ok=True)
    out = {}
    for mode in sys.argv[1:]:
        meta = json.load(open(os.path.join(OUT, f"{mode}.json")))
        base = Image.open(os.path.join(OUT, f"{mode}.png")).convert("RGB")
        if base.size != (meta["w"], meta["h"]):
            raise SystemExit(f"{mode} base is {base.size}, expected {meta['w']}x{meta['h']}")
        base.save(os.path.join(PUBLIC, f"{mode}.webp"), quality=82, method=6)
        for tile, cell in meta["cells"].items():
            x, y, w, h = cell["patch"]
            patch = Image.open(os.path.join(OUT, f"{mode}-{tile}.png")).convert("RGB")
            if patch.size != (w, h):
                raise SystemExit(f"{mode}-{tile} is {patch.size}, expected {w}x{h}")
            ring, worst = seam(base, patch, x, y)
            if ring > TOLERANCE or worst <= TOLERANCE:
                raise SystemExit(f"{mode}-{tile}: edge differs by {ring}, inside by {worst}")
            patch.save(os.path.join(PUBLIC, f"{mode}-{tile}.webp"), quality=82, method=6)
        out[mode] = meta
        print("done post", mode, len(meta["cells"]))
    json.dump(out, open(JSON, "w"), indent=1)


main()
