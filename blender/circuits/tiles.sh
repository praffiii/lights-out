#!/bin/sh
set -eu
cd "$(dirname "$0")"
blender="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
"$blender" -b -P tiles.py -- "$@" < /dev/null 2>&1 | grep -E "Traceback|Error|done" || true
ls ../../public/circuits/tiles | wc -l
