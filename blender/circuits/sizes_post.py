import json
import os
import sys

from PIL import Image, ImageChops, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, ".out", "sizes")
PUBLIC = os.path.join(HERE, "..", "..", "public", "circuits", "sizes")
JSON = os.path.join(HERE, "..", "..", "src", "tracks", "sizes.json")
RING = 2
TOLERANCE = 2
SOFT = 8
FEATHER = 6


def seam(base, patch, x, y):
    w, h = patch.size
    region = base.crop((x, y, x + w, y + h))
    diff = ImageChops.difference(region, patch)
    inner = Image.new("L", (w, h), 255)
    inner.paste(0, (RING, RING, w - RING, h - RING))
    worst = max(hi for _, hi in diff.convert("RGB").getextrema())
    ring = max(hi for _, hi in ImageChops.multiply(diff.convert("RGB"), Image.merge("RGB", [inner] * 3)).getextrema())
    return ring, worst


def feathered(patch):
    w, h = patch.size
    alpha = Image.new("L", (w, h), 255)
    draw = ImageDraw.Draw(alpha)
    for d in range(FEATHER):
        draw.rectangle((d, d, w - 1 - d, h - 1 - d), outline=round(255 * d / FEATHER))
    out = patch.convert("RGBA")
    out.putalpha(alpha)
    return out


def shipped(base_path, patch_path, x, y):
    base = Image.open(base_path).convert("RGB")
    patch = Image.open(patch_path).convert("RGBA")
    w, h = patch.size
    region = base.crop((x, y, x + w, y + h))
    laid = Image.alpha_composite(region.convert("RGBA"), patch).convert("RGB")
    diff = ImageChops.difference(region, laid).convert("L")
    edge = Image.new("L", (w, h), 255)
    edge.paste(0, (1, 1, w - 1, h - 1))
    band = Image.new("L", (w, h), 255)
    band.paste(0, (RING * 3, RING * 3, w - RING * 3, h - RING * 3))
    return ImageChops.multiply(diff, edge).getextrema()[1], ImageChops.multiply(diff, band).getextrema()[1]


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
            path = os.path.join(PUBLIC, f"{mode}-{tile}.webp")
            feathered(patch).save(path, quality=82, alpha_quality=100, method=6)
            edge, band = shipped(os.path.join(PUBLIC, f"{mode}.webp"), path, x, y)
            if edge > TOLERANCE or band > SOFT:
                raise SystemExit(f"{mode}-{tile}: shipped seam {edge} at the edge, {band} across the pad")
        out[mode] = meta
        print("done post", mode, len(meta["cells"]))
    json.dump(out, open(JSON, "w"), indent=1)


main()
