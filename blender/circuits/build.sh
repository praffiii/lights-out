#!/bin/sh
set -eu
cd "$(dirname "$0")"
id="$1"
blender="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
if [ ! -f "data/$id-m.json" ] || [ ! -f "data/$id-elevation.json" ] || [ ! -f "data/$id-terrain.json" ]; then
  python3 -I prep.py "$id"
fi
mkdir -p ../../public/circuits
CIRCUIT="$id" "$blender" -b -P build.py < /dev/null 2>&1 | grep -E "Traceback|Error|done" || true
test -f ".out/$id.glb"
bunx --bun @gltf-transform/cli meshopt ".out/$id.glb" "../../public/circuits/$id.glb" --quantize-position 16 --quantize-normal 10
rm ".out/$id.glb"
ls -l "../../public/circuits/$id.glb"
