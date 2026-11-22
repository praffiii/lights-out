import json
import os
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from circuit import CID, HEIGHT, HERE, PUBLIC, Track

INSETS = os.path.join(HERE, "..", "..", "src", "circuits", "insets")
LINE_POINTS = 400


def main():
    scene = bpy.context.scene
    cam = scene.camera
    map_img = os.path.join(PUBLIC, f"{CID}-map.webp")
    for img in bpy.data.images:
        if f"{CID}-map" in img.name or f"{CID}-map" in img.filepath:
            img.filepath = map_img
            img.reload()
    labels = [o for o in bpy.data.objects if "-label" in o.name]
    for o in labels:
        o.hide_render = True
    scene.render.resolution_x, scene.render.resolution_y = 2880, 1800
    scene.render.resolution_percentage = 25
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.quality = 82
    out_img = os.path.join(PUBLIC, f"{CID}-inset.webp")
    scene.render.filepath = out_img
    bpy.ops.render.render(write_still=True)
    for o in labels:
        o.hide_render = False
    scene.render.resolution_percentage = 100

    track = Track()
    line = []
    for i in range(LINE_POINTS):
        u = i / LINE_POINTS
        p = track.at(track.lap * u) + Vector((0, 0, HEIGHT))
        v = world_to_camera_view(scene, cam, p)
        line.append([round(u, 4), round(v.x, 4), round(1 - v.y, 4)])
    os.makedirs(INSETS, exist_ok=True)
    out_json = os.path.join(INSETS, f"{CID}.json")
    with open(out_json, "w") as f:
        json.dump({"line": line}, f)
    print(f"done inset {CID}: {os.path.getsize(out_img) // 1024} KB, {len(line)} pts")


main()
