#!/bin/sh
set -eu
cd "$(dirname "$0")"
blender="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
mag80="${MAG80:-../../../lights-out-private/car-mag80/scene.gltf}"
run() {
  "$blender" -b -P "$@" < /dev/null 2>&1 | grep -E "Traceback|Error|TRIANGLES|rendered|rig |peak|exported" || true
}
run prep.py -- "$mag80"
test -f car.blend
run render.py -- rig
run bake.py -- .out/car.glb
test -f .out/car.glb
bunx --bun @gltf-transform/cli meshopt .out/car.glb ../../public/car/car.glb --quantize-position 16
rm .out/car.glb
for pose in assembled exploded; do
  run render.py -- shadow "$pose"
  python3 -I post.py "shadow-$pose"
done
for theme in light dark; do
  for view in exploded exploded-phone top top-phone side side-corner; do
    run render.py -- "$view" "$theme"
    python3 -I post.py "$view-$theme"
  done
  for view in switch switch-phone dive dive-phone; do
    run duel.py -- "$view" "$theme"
    python3 -I post.py "$view-$theme"
  done
done
run duel.py -- pins
ls -l ../../public/car ../../src/car/parts.json
