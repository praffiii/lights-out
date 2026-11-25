#!/bin/sh
set -eu
cd "$(dirname "$0")"
blender="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
out=../../public/wing
mkdir -p .out/frames .out/open "$out"
angles=$(awk 'BEGIN { for (i = 0; i < 24; i++) printf "%.3f ", 56 - 32 * i / 23 }')
"$blender" -b -P wing.py -- "$PWD/.out/frames" 784 452 220 $angles < /dev/null
"$blender" -b -P wing.py -- "$PWD/.out/open" 1568 904 220 24 < /dev/null
for f in .out/frames/*.png; do python3 -I backdrop.py "$f" "$out/$(basename "$f" .png).webp" 90; done
python3 -I backdrop.py .out/open/00.png "$out/open.webp" 86
ls -l "$out"
