import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
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


MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
WAITS = [10, 30, 60]
MARGIN = 1000.0
KINDS = {
    "building": '["building"]',
    "highway": '["highway"~"^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|residential|unclassified|living_street|service)$"]',
    "water": '["natural"="water"]',
    "riverbank": '["waterway"="riverbank"]',
    "leisure": '["leisure"~"^(park|pitch)$"]',
    "landuse": '["landuse"~"^(grass|forest|recreation_ground|meadow)$"]',
}


def overpass(query):
    body = urllib.parse.urlencode({"data": query}).encode()
    for url in MIRRORS:
        for wait in WAITS + [None]:
            try:
                req = urllib.request.Request(url, data=body, headers=UA)
                return json.load(urllib.request.urlopen(req, timeout=240))
            except (urllib.error.URLError, TimeoutError) as e:
                code = getattr(e, "code", None)
                if wait is None or (code is not None and code != 429 and code < 500):
                    print(url, "gave up:", e)
                    break
                print(url, "retry in", wait, "s:", e)
                time.sleep(wait)
    raise SystemExit("every Overpass mirror failed")


def osm(cid):
    c, _ = layout(cid)
    lons, lats = [p[0] for p in c], [p[1] for p in c]
    dlat = math.degrees(MARGIN / R)
    dlon = math.degrees(MARGIN / (R * math.cos(math.radians(lats[0]))))
    box = f"{min(lats) - dlat:.6f},{min(lons) - dlon:.6f},{max(lats) + dlat:.6f},{max(lons) + dlon:.6f}"
    parts = "".join(f"way{f}({box});relation{f}({box});" for f in KINDS.values())
    data = overpass(f"[out:json][timeout:180];({parts});out geom;")
    json.dump(data, open(os.path.join(DATA, f"{cid}-osm.json"), "w"))
    counts = {k: sum(1 for e in data["elements"] if k in e.get("tags", {})) for k in ("building", "highway", "natural", "waterway", "leisure", "landuse")}
    print(cid, len(data["elements"]), "elements", counts)


if __name__ == "__main__":
    if sys.argv[1] == "osm":
        osm(sys.argv[2])
    else:
        main(sys.argv[1])
