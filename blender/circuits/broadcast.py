import json
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

import circuit
from prep import R, layout

PAL = {
    "bg": "#06080E",
    "ground": "#0A0E18",
    "green": "#0A1019",
    "water": "#081226",
    "foot": "#0D1220",
    "minor": "#172033",
    "major": "#22304C",
    "block": "#131A2B",
    "road": "#111726",
    "start": "#FFFFFF",
}
MARGIN = 1000.0
DIST = 2.7
MAP_PX = 4096
FADE = 0.15
NEAR = 420.0
MIN_AREA = 1800.0
SIMPLIFY = 2.0
CORE = 4.5
EDGE = 2.0
HALO = 40.0
HALO_K = 18.0
HALO_GAIN = 0.6
GLOW = 1.6
TURN_OUT = 62.0
SECTOR_OUT = 150.0
FONTS = os.path.join(circuit.HERE, "fonts")
TITLE_FONT = "ArchivoExpanded-Black.ttf"
CAPTION_FONT = "MartianMono-Medium.ttf"
LABEL_CAP = 0.11
CAPTION_CAP = 0.15
STROKE = 2.5
LABEL_HALO = 12.0
LABEL_HALO_GAIN = 0.35
LABEL_LIFT = 3.0
LABEL_CLEAR = 40.0
LABEL_STEP = 20.0
SEG = 40.0
CURVE_STEPS = 3
WIDTHS = {"motorway": 22, "trunk": 20, "primary": 16, "secondary": 12, "tertiary": 10, "motorway_link": 10, "trunk_link": 10, "primary_link": 9, "secondary_link": 8, "residential": 6.5, "unclassified": 6.5, "living_street": 5, "service": 3.5}
MAJOR = {"motorway", "trunk", "primary", "secondary", "motorway_link", "trunk_link", "primary_link"}
GREEN = {"park", "pitch", "grass", "forest", "recreation_ground", "meadow"}


def rgba(hex_, k=1.0):
    return (*(v * k for v in circuit.linear(hex_)), 1)


class Local:
    def __init__(self, mid):
        c, _ = layout(circuit.CID)
        self.lon0, self.lat0 = c[0]
        a = math.radians(circuit.CFG["rot"])
        self.c, self.s, self.mid, self.k = math.cos(a), math.sin(a), mid, math.cos(math.radians(self.lat0))

    def __call__(self, lat, lon):
        x = math.radians(lon - self.lon0) * R * self.k
        y = math.radians(lat - self.lat0) * R
        return Vector((x * self.c - y * self.s - self.mid.x, x * self.s + y * self.c - self.mid.y, 0))


def extent(track):
    xs, ys = [p.x for p in track.samples], [p.y for p in track.samples]
    lo = Vector((min(xs) - MARGIN, min(ys) - MARGIN, 0))
    hi = Vector((max(xs) + MARGIN, max(ys) + MARGIN, 0))
    return lo, hi


def flat_emit(name, hex_):
    m = bpy.data.materials.new(name)
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()
    e = nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = rgba(hex_)
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(e.outputs[0], out.inputs["Surface"])
    return m


def mesh_obj(name, bm, mat):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    return ob


def polygon(bm, pts, z):
    if len(pts) > 2 and (pts[0] - pts[-1]).length < 0.01:
        pts = pts[:-1]
    if len(pts) < 3:
        return None
    try:
        return bm.faces.new([bm.verts.new((p.x, p.y, z)) for p in pts])
    except ValueError:
        return None


def polyline(bm, pts, w, z):
    if len(pts) < 2:
        return
    rows = []
    for i, p in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
        t = (b - a).normalized()
        n = Vector((-t.y, t.x, 0)) * (w / 2)
        rows.append((bm.verts.new((p.x + n.x, p.y + n.y, z)), bm.verts.new((p.x - n.x, p.y - n.y, z))))
    for (a, b), (c, d) in zip(rows, rows[1:]):
        try:
            bm.faces.new((a, b, d, c))
        except ValueError:
            pass


def ways(local):
    path = os.path.join(circuit.DATA, f"{circuit.CID}-osm.json")
    for e in json.load(open(path))["elements"]:
        tags = e.get("tags", {})
        if e["type"] == "way" and "geometry" in e:
            yield tags, [local(g["lat"], g["lon"]) for g in e["geometry"]]
        elif e["type"] == "relation":
            for m in e.get("members", []):
                if m.get("role") == "outer" and "geometry" in m:
                    yield tags, [local(g["lat"], g["lon"]) for g in m["geometry"]]


def bake_map(scene, local, lo, hi, out):
    layers = {k: bmesh.new() for k in ("green", "water", "foot", "minor", "major")}
    footprints = []
    for tags, pts in ways(local):
        if "building" in tags:
            polygon(layers["foot"], pts, 0.2)
            footprints.append((tags, pts))
        elif "highway" in tags:
            kind = tags["highway"]
            if kind in WIDTHS:
                polyline(layers["major" if kind in MAJOR else "minor"], pts, WIDTHS[kind], 0.4 if kind in MAJOR else 0.3)
        elif tags.get("natural") == "water" or tags.get("waterway") == "riverbank":
            polygon(layers["water"], pts, 0.1)
        elif tags.get("leisure") in GREEN or tags.get("landuse") in GREEN:
            polygon(layers["green"], pts, 0.0)
    obs = [mesh_obj(f"map-{k}", bm, flat_emit(f"map-{k}", PAL[k])) for k, bm in layers.items()]
    w, h = hi.x - lo.x, hi.y - lo.y
    data = bpy.data.cameras.new("top")
    data.type = "ORTHO"
    data.ortho_scale = max(w, h)
    data.clip_start, data.clip_end = 1, 1000
    cam = bpy.data.objects.new("top", data)
    scene.collection.objects.link(cam)
    cam.location = ((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, 500)
    scene.camera = cam
    r = scene.render
    r.engine = "BLENDER_EEVEE"
    r.resolution_x, r.resolution_y = round(MAP_PX * w / max(w, h)), round(MAP_PX * h / max(w, h))
    r.resolution_percentage = 100
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGB"
    scene.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.new("top")
    scene.world = world
    world.node_tree.nodes["Background"].inputs["Color"].default_value = rgba(PAL["ground"])
    r.filepath = out
    bpy.ops.render.render(write_still=True)
    for ob in obs + [cam]:
        bpy.data.objects.remove(ob)
    print(f"map {r.resolution_x}x{r.resolution_y} px, {max(w, h) / MAP_PX:.2f} m/px")
    return bpy.data.images.load(out), footprints


def save_webp(scene, img, path, scale=1.0):
    if scale != 1.0:
        img = img.copy()
        img.scale(round(img.size[0] * scale), round(img.size[1] * scale))
    s = scene.render.image_settings
    s.file_format, s.color_mode, s.quality = "WEBP", "RGB", 82
    img.save_render(path, scene=scene)


def map_uvs(ground, lo, hi):
    me = ground.data
    uv = me.uv_layers.new(name="map")
    w, h = hi.x - lo.x, hi.y - lo.y
    for loop in me.loops:
        co = me.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = ((co.x - lo.x) / w, (co.y - lo.y) / h)


def haze(nodes, links, colour, span):
    cam = nodes.new("ShaderNodeCameraData")
    ramp = nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value = span * DIST * 0.7
    ramp.inputs["From Max"].default_value = span * DIST * 1.9
    links.new(cam.outputs["View Distance"], ramp.inputs["Value"])
    power = nodes.new("ShaderNodeMath")
    power.operation = "POWER"
    power.inputs[1].default_value = 1.4
    links.new(ramp.outputs[0], power.inputs[0])
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    links.new(power.outputs[0], mix.inputs["Factor"])
    links.new(colour, mix.inputs["A"])
    mix.inputs["B"].default_value = rgba(PAL["bg"])
    return mix.outputs["Result"]


def ground_material(img, span):
    m = bpy.data.materials.new("ground")
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()
    uv = nodes.new("ShaderNodeUVMap")
    uv.uv_map = "map"
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.extension = "CLIP"
    tex.interpolation = "Cubic"
    links.new(uv.outputs[0], tex.inputs["Vector"])
    xy = nodes.new("ShaderNodeSeparateXYZ")
    links.new(uv.outputs[0], xy.inputs[0])

    def op(kind, a, b):
        n = nodes.new("ShaderNodeMath")
        n.operation = kind
        for slot, v in ((0, a), (1, b)):
            if isinstance(v, (int, float)):
                n.inputs[slot].default_value = v
            else:
                links.new(v, n.inputs[slot])
        return n.outputs[0]

    edge = op("MINIMUM", op("MINIMUM", xy.outputs["X"], op("SUBTRACT", 1.0, xy.outputs["X"])), op("MINIMUM", xy.outputs["Y"], op("SUBTRACT", 1.0, xy.outputs["Y"])))
    ramp = nodes.new("ShaderNodeMapRange")
    ramp.interpolation_type = "SMOOTHSTEP"
    ramp.inputs["From Min"].default_value = 0.0
    ramp.inputs["From Max"].default_value = FADE
    links.new(edge, ramp.inputs["Value"])
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    links.new(ramp.outputs[0], mix.inputs["Factor"])
    mix.inputs["A"].default_value = rgba(PAL["ground"])
    links.new(tex.outputs["Color"], mix.inputs["B"])
    e = nodes.new("ShaderNodeEmission")
    links.new(haze(nodes, links, mix.outputs["Result"], span), e.inputs["Color"])
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(e.outputs[0], out.inputs["Surface"])
    return m


def simplify(pts, tol):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    ab = b - a
    far, at = 0.0, 0
    for i, p in enumerate(pts[1:-1], start=1):
        d = (p - a).cross(ab).length / ab.length if ab.length > 1e-6 else (p - a).length
        if d > far:
            far, at = d, i
    if far <= tol:
        return [a, b]
    return simplify(pts[: at + 1], tol)[:-1] + simplify(pts[at:], tol)


def blocks(footprints, track, tree, mat, eye, targets):
    cell = 60.0
    grid = {(int(p.x // cell), int(p.y // cell)) for p in track.samples}
    reach = int(NEAR // cell) + 1

    def near(c):
        cx, cy = int(c.x // cell), int(c.y // cell)
        return any((cx + a, cy + b) in grid for a in range(-reach, reach + 1) for b in range(-reach, reach + 1))

    bm = bmesh.new()
    owner = bm.faces.layers.int.new("owner")
    count = 0
    for tags, pts in footprints:
        c = sum(pts, Vector()) / len(pts)
        area = abs(sum(a.x * b.y - b.x * a.y for a, b in zip(pts, pts[1:] + pts[:1]))) / 2
        if area < MIN_AREA or not near(c):
            continue
        hit = tree.ray_cast(Vector((c.x, c.y, 3000)), Vector((0, 0, -1)))
        if hit[0] is None:
            continue
        try:
            levels = float(tags.get("building:levels", "0"))
        except ValueError:
            levels = 0
        tall = min(36.0, levels * 3.2) if levels else (9.0 if tags.get("building") in ("grandstand", "industrial", "commercial", "retail") else 6.0)
        f = polygon(bm, simplify(pts, SIMPLIFY), hit[0].z - 2)
        if f is None:
            continue
        made = bmesh.ops.extrude_face_region(bm, geom=[f])
        top = [v for v in made["geom"] if isinstance(v, bmesh.types.BMVert)]
        bmesh.ops.translate(bm, verts=top, vec=(0, 0, tall + 2))
        count += 1
        for face in {g for v in top for g in v.link_faces} | {f}:
            face[owner] = count
    bm.faces.ensure_lookup_table()
    bvh = BVHTree.FromBMesh(bm)
    hidden = set()
    for q in targets:
        d = q - eye
        origin, left, step = eye.copy(), d.length, d.normalized()
        while left > 1:
            hit, _, idx, dist = bvh.ray_cast(origin, step, left)
            if hit is None:
                break
            hidden.add(bm.faces[idx][owner])
            origin, left = hit + step * 0.5, left - dist - 0.5
    bmesh.ops.delete(bm, geom=list({v for f in bm.faces if f[owner] in hidden for v in f.verts}), context="VERTS")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh_obj("blocks", bm, mat)
    return count - len(hidden)


def sector_span(track, a, b):
    m = len(track.samples)
    idx = [k for k in range(m) if a <= track.s[k] <= b]
    if a > 0:
        idx.insert(0, idx[0] - 1)
    idx.append((idx[-1] + 1) % m if b < track.lap else 0)
    us = [(track.lap if (k == 0 and j > 0) else track.s[k]) / track.lap for j, k in enumerate(idx)]
    return idx, us


def strips(name, track, idx, us, bands, z, mat):
    S, m = track.samples, len(track.samples)
    me = bpy.data.meshes.new(name)
    verts, faces, uvs = [], [], []
    for off, w in bands:
        base = len(verts)
        for k, u in zip(idx, us):
            p = S[k % m]
            t = circuit.flat(S[(k + 1) % m] - S[k - 1])
            n = Vector((-t.y, t.x, 0))
            for side, across in ((1, 1.0), (-1, 0.0)):
                q = p + n * (off + side * w / 2)
                verts.append((q.x, q.y, p.z + z))
                uvs.append((u, across))
        for j in range(len(idx) - 1):
            a = base + 2 * j
            faces.append((a, a + 1, a + 3, a + 2))
    me.from_pydata(verts, [], faces)
    layer = me.uv_layers.new(name="lap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            layer.data[li].uv = uvs[me.loops[li].vertex_index]
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    return ob


def glow_material(name, hex_):
    m = bpy.data.materials.new(name)
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()
    e = nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = rgba(hex_, GLOW)
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(e.outputs[0], out.inputs["Surface"])
    return m


def halo_material(name, hex_):
    m = bpy.data.materials.new(name)
    m.surface_render_method = "BLENDED"
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()
    uv = nodes.new("ShaderNodeUVMap")
    uv.uv_map = "lap"
    xy = nodes.new("ShaderNodeSeparateXYZ")
    links.new(uv.outputs[0], xy.inputs[0])
    d = nodes.new("ShaderNodeMath")
    d.operation = "SUBTRACT"
    d.inputs[1].default_value = 0.5
    links.new(xy.outputs["Y"], d.inputs[0])
    sq = nodes.new("ShaderNodeMath")
    sq.operation = "MULTIPLY"
    links.new(d.outputs[0], sq.inputs[0])
    links.new(d.outputs[0], sq.inputs[1])
    k = nodes.new("ShaderNodeMath")
    k.operation = "MULTIPLY"
    k.inputs[1].default_value = -HALO_K
    links.new(sq.outputs[0], k.inputs[0])
    ex = nodes.new("ShaderNodeMath")
    ex.operation = "EXPONENT"
    links.new(k.outputs[0], ex.inputs[0])
    e = nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = rgba(hex_, HALO_GAIN)
    links.new(ex.outputs[0], e.inputs["Strength"])
    see = nodes.new("ShaderNodeBsdfTransparent")
    add = nodes.new("ShaderNodeAddShader")
    links.new(e.outputs[0], add.inputs[0])
    links.new(see.outputs[0], add.inputs[1])
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(add.outputs[0], out.inputs["Surface"])
    return m


def outward(track, k, off):
    S, m = track.samples, len(track.samples)
    t = circuit.flat(S[(k + 3) % m] - S[(k - 3) % m])
    n = Vector((-t.y, t.x, 0))
    best = None
    for side in (1, -1):
        q = S[k] + n * off * side
        clear = min(math.hypot(q.x - p.x, q.y - p.y) for p in S)
        if best is None or clear > best[0]:
            best = (clear, q)
    return best[1]


def on_ground(tree, q, lift=0.0):
    hit = tree.ray_cast(Vector((q.x, q.y, 3000)), Vector((0, 0, -1)))
    return Vector((q.x, q.y, (hit[0].z if hit[0] else 0) + lift))


def ground_tree(ground):
    return BVHTree.FromObject(ground, bpy.context.evaluated_depsgraph_get())


def glyphs(body, font, size, bevel=0.0, spacing=1.0):
    cu = bpy.data.curves.new("glyphs", "FONT")
    cu.body = body
    cu.font = bpy.data.fonts.load(os.path.join(FONTS, font), check_existing=True)
    cu.size = size
    cu.space_character = spacing
    cu.fill_mode = "NONE" if bevel else "BOTH"
    cu.bevel_depth = bevel
    cu.bevel_resolution = 0
    cu.resolution_u = CURVE_STEPS
    ob = bpy.data.objects.new("glyphs", cu)
    bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    return me


def cap_height(body, font):
    me = glyphs(body, font, 1.0)
    h = max(v.co.y for v in me.vertices) - min(v.co.y for v in me.vertices)
    bpy.data.meshes.remove(me)
    return h


def gather(parts):
    bm = bmesh.new()
    for me, x, y in parts:
        me.transform(Matrix.Translation((x, y, 0)))
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    return bm


def rule(x0, y0, w, h):
    me = bpy.data.meshes.new("rule")
    me.from_pydata([(x0, y0, 0), (x0 + w, y0, 0), (x0 + w, y0 + h, 0), (x0, y0 + h, 0)], [], [(0, 1, 2, 3)])
    return me


def additive(name, hex_, gain):
    m = bpy.data.materials.new(name)
    m.surface_render_method = "BLENDED"
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()
    e = nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = rgba(hex_, gain)
    see = nodes.new("ShaderNodeBsdfTransparent")
    add = nodes.new("ShaderNodeAddShader")
    links.new(e.outputs[0], add.inputs[0])
    links.new(see.outputs[0], add.inputs[1])
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(add.outputs[0], out.inputs["Surface"])
    return m


def drape(bm, frame, tree):
    for _ in range(6):
        long = [e for e in bm.edges if e.calc_length() > SEG]
        if not long:
            break
        bmesh.ops.subdivide_edges(bm, edges=long, cuts=1)
    for v in bm.verts:
        q = frame(v.co)
        v.co = on_ground(tree, q, LABEL_LIFT + v.co.z)


def sector_label(n, hex_, track, ks, own, az, span, tree, taken, score):
    cap = span * LABEL_CAP
    size = cap / cap_height(f"S{n}", TITLE_FONT)
    small = cap * CAPTION_CAP
    csize = small / cap_height("SECTOR", CAPTION_FONT)
    gap, bar = small * 1.2, cap * 0.45
    under = -gap - small
    core = gather([
        (glyphs(f"S{n}", TITLE_FONT, size, STROKE / 2), 0, 0),
        (glyphs(f"SECTOR {n}", CAPTION_FONT, csize, spacing=1.5), bar + gap, under),
        (rule(0, under + small * 0.4, bar, small * 0.18), 0, 0),
    ])
    glow = gather([(glyphs(f"S{n}", TITLE_FONT, size, LABEL_HALO / 2), 0, 0)])
    xs, ys = [v.co.x for v in core.verts], [v.co.y for v in core.verts]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    a = math.radians(az)
    right, ahead = Vector((math.cos(a), math.sin(a), 0)), Vector((-math.sin(a), math.cos(a), 0))
    kd = KDTree(len(track.samples))
    for i, p in enumerate(track.samples):
        kd.insert((p.x, p.y, 0), i)
    kd.balance()
    edge = [Vector((x, y, 0)) for x in (min(xs), cx, max(xs)) for y in (min(ys), cy, max(ys))] + [v.co.copy() for v in list(core.verts)[:: max(1, len(core.verts) // 400)]]

    def placed(k, side):
        away = circuit.flat(outward(track, k, SECTOR_OUT) - track.samples[k]).normalized() * side
        t = 0.0
        while True:
            c = track.samples[k] + away * t
            frame = lambda co, c=c: Vector((c.x + right.x * (co.x - cx) + ahead.x * (co.y - cy), c.y + right.y * (co.x - cx) + ahead.y * (co.y - cy), 0))
            if min(kd.find(frame(co))[2] for co in edge) > LABEL_CLEAR + circuit.WIDTH / 2:
                return frame, [on_ground(tree, frame(Vector((x, y, 0)))) for x in (min(xs), max(xs)) for y in (min(ys), max(ys))]
            t += LABEL_STEP

    def rect(corners):
        rs, hs = [c.dot(right) for c in corners], [c.dot(ahead) for c in corners]
        return min(rs) - LABEL_CLEAR, min(hs) - LABEL_CLEAR, max(rs) + LABEL_CLEAR, max(hs) + LABEL_CLEAR

    def apart(corners):
        a = rect(corners)
        return all(a[2] < b[0] or b[2] < a[0] or a[3] < b[1] or b[3] < a[1] for b in taken)

    def rank(option):
        frame, corners = option
        return apart(corners), kd.find(frame(Vector((cx, cy, 0))))[1] in own, score(corners)

    frame, corners = max((placed(k, side) for k in ks for side in (1, -1)), key=rank)
    taken.append(rect(corners))
    drape(core, frame, tree)
    drape(glow, frame, tree)
    points = [v.co.copy() for v in list(core.verts)[:: max(1, len(core.verts) // 300)]]
    mesh_obj(f"S{n}-label", core, glow_material(f"S{n}-label", hex_))
    mesh_obj(f"S{n}-label-halo", glow, additive(f"S{n}-label-halo", hex_, LABEL_HALO_GAIN))
    return corners, points
