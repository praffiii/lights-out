#!/bin/sh
set -eu
cd "$(dirname "$0")"
blender="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
mag80="${MAG80:-../../../lights-out-private/car-mag80/scene.gltf}"
run() {
  "$blender" -b -P "$@" < /dev/null 2>&1 | grep -E "Traceback|Error|TRIANGLES|rendered|rig " || true
}
run prep.py -- "$mag80"
test -f car.blend
run render.py -- rig
for theme in light dark; do
  for view in exploded exploded-phone top top-phone side; do
    run render.py -- "$view" "$theme"
    python3 -I post.py "$view-$theme"
  done
done
ls -l ../../public/car ../../src/car/parts.json
