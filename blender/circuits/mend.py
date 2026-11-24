import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import circuit
from build import ribbons
from circuit import CID, HERE, PUBLIC, Track, export

OUT = os.path.join(HERE, ".out")


def swap(name, fresh):
    old = bpy.data.objects[name]
    mesh, material = old.data, old.data.materials[0]
    title = mesh.name
    fresh.data.materials.clear()
    fresh.data.materials.append(material)
    old.data = fresh.data
    bpy.data.objects.remove(fresh)
    bpy.data.meshes.remove(mesh)
    old.data.name = title


def main():
    scene = bpy.context.scene
    track = Track()
    maps = [(img, img.filepath) for img in bpy.data.images if f"{CID}-map" in img.name]
    for img, _ in maps:
        img.filepath = os.path.join(PUBLIC, f"{CID}-map.webp")
        img.reload()
    before = set(bpy.data.objects)
    circuit.ribbon("road", track.samples, track.s, 0, track.lap, track.lap, bpy.data.materials["road"])
    ribbons(track)
    for o in set(bpy.data.objects) - before:
        swap(o.name.split(".")[0], o)
    for percent, suffix in ((100, ""), (50, "-1440")):
        scene.render.resolution_percentage = percent
        scene.render.filepath = os.path.join(PUBLIC, f"{CID}{suffix}.webp")
        bpy.ops.render.render(write_still=True)
    scene.render.resolution_percentage = 100
    os.makedirs(OUT, exist_ok=True)
    export(os.path.join(OUT, f"{CID}.glb"))
    for img, path in maps:
        img.filepath = path
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, f"{CID}.blend"))
    print("done mend", CID)


main()
