"""The circuit overview: the whole lap from above, sectors filling on scroll.

Run:  npm run model

Writes:
  public/interlagos.glb           the model (three sector meshes, ground, start line, turn and label empties, camera)
  public/poster-{light,dark}.png  Blender renders from the same camera: the no-WebGL / reduced-motion frame
  src/pins.json                   turn and sector-label positions in that camera's frame, for the poster
  blender/interlagos.blend        open this in Blender to refine by hand
"""

import json
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from circuit import HEIGHT, HERE, PUBLIC, SECTOR_CUTS, SECTORS, THEMES, Track, build_track, camera, empty, export, flat, linear, project, recolour, setup_render  # noqa: E402

CAMERA_PITCH = math.radians(44)  # camera angle above the ground


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    track = Track()
    mats = build_track(track)

    cuts = [0, SECTOR_CUTS[0] * track.lap, SECTOR_CUTS[1] * track.lap, track.lap]
    for i, (name, _) in enumerate(SECTORS):
        # label sits outside the track at the sector's midpoint
        x = (cuts[i] + cuts[i + 1]) / 2
        h = flat(track.heading(x))
        out = Vector((h.y, -h.x, 0))  # right of travel; the lap runs anticlockwise, so right is outside
        empty(f"label-{name}", track.at(x) + out * 70 + Vector((0, 0, HEIGHT + 8)))

    # from the south, framing the whole circuit with a margin
    cam = camera(scene, 50)
    dist = (track.size.x * 0.5 * 1.28) / math.tan(cam.data.angle / 2)
    cam.location = (0, -dist * math.cos(CAMERA_PITCH), dist * math.sin(CAMERA_PITCH))
    cam.rotation_euler = (math.pi / 2 - CAMERA_PITCH, 0, 0)
    cam.data.clip_start, cam.data.clip_end = 10, dist * 4

    bg = setup_render(scene)
    # the same model in both themes; only the ground and the ink change
    for theme, c in THEMES.items():
        bg.inputs["Color"].default_value = (*linear(c["bg"]), 1)
        recolour(mats["ink"], c["ink"])
        recolour(mats["ground"], c["bg"])
        scene.render.filepath = os.path.join(PUBLIC, f"poster-{theme}.png")
        bpy.ops.render.render(write_still=True)
    recolour(mats["ink"], THEMES["light"]["ink"])
    recolour(mats["ground"], THEMES["light"]["bg"])

    pins = project(scene, cam, [o for o in scene.objects if o.type == "EMPTY"])
    json.dump(pins, open(os.path.join(HERE, "..", "src", "pins.json"), "w"), indent=1)
    export(os.path.join(PUBLIC, "interlagos.glb"))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "interlagos.blend"))
    zs = [p.z for p in track.samples]
    print(f"lap {track.lap:.0f} m, camera {dist:.0f} m, model height {min(zs):.0f}..{max(zs):.0f} m")


main()
