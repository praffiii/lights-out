import json
import math
import os
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
GEO = os.path.join(DATA, "f1-circuits.geojson")
UA = {"User-Agent": "LightsOutFanSite/0.1 (personal project)"}
R = 6371008.8


def layout(cid):
    f = next(f for f in json.load(open(GEO))["features"] if f["properties"]["id"] == cid)
    c = f["geometry"]["coordinates"]
    if f["geometry"]["type"] == "MultiLineString":
        c = c[0]
    lon0, lat0 = c[0]
    k = math.cos(math.radians(lat0))
    return c, [[math.radians(lo - lon0) * R * k, math.radians(la - lat0) * R] for lo, la in c]


def heights(c):
    z = []
    for i in range(0, len(c), 100):
        q = "|".join(f"{la:.6f},{lo:.6f}" for lo, la in c[i : i + 100])
        req = urllib.request.Request(f"https://api.opentopodata.org/v1/srtm30m?locations={q}", headers=UA)
        z += [r["elevation"] for r in json.load(urllib.request.urlopen(req, timeout=60))["results"]]
        time.sleep(1.2)
    return z


def main(cid):
    c, P = layout(cid)
    d = [0.0]
    for a, b in zip(P, P[1:]):
        d.append(d[-1] + math.dist(a, b))
    json.dump({"P": P, "d": d}, open(os.path.join(DATA, f"{cid}-m.json"), "w"))
    z = heights(c)
    source = "SRTM 30 m (NASA, public domain) via api.opentopodata.org, one value per layout point"
    json.dump({"source": source, "z": z}, open(os.path.join(DATA, f"{cid}-elevation.json"), "w"))
    xs, ys = [p[0] for p in P], [p[1] for p in P]
    m = 300.0
    x, y = [min(xs) - m, max(xs) + m], [min(ys) - m, max(ys) + m]
    extent = {"nx": int((x[1] - x[0]) / 40) + 1, "ny": int((y[1] - y[0]) / 40) + 1, "x": x, "y": y}
    json.dump(extent, open(os.path.join(DATA, f"{cid}-terrain.json"), "w"))
    print(cid, len(P), "points, lap", round(d[-1] + math.dist(P[-1], P[0])), "m, z", min(z), max(z))


if __name__ == "__main__":
    main(sys.argv[1])
