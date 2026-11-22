#!/bin/sh
set -eu
cd "$(dirname "$0")"
blender="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
run() {
  "$blender" -b -P "$@" < /dev/null 2>&1 | grep -E "Traceback|Error|built|rendered|rig |peak|exported" || true
}
run engine.py
test -f engine.blend
run render.py -- rig
run render.py -- shadow
python3 -I post.py shadow-band
for theme in light dark; do
  for view in exploded band; do
    run render.py -- "$view" "$theme"
    python3 -I post.py "$view-$theme"
  done
done
ls -l ../../public/engine ../../src/engine/rig.json
