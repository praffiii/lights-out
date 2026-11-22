#!/bin/sh
set -eu
cd "$(dirname "$0")"
blender="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
for id in us-2022 us-2023 qa-2004 ae-2009 au-1953 br-1940 it-1922; do
  CIRCUIT="$id" "$blender" -b "$id.blend" -P inset.py < /dev/null 2>&1 | grep -E "Traceback|Error|done inset" || true
  test -f "../../public/circuits/$id-inset.webp"
  test -f "../../src/circuits/insets/$id.json"
done
ls -l ../../public/circuits/*-inset.webp ../../src/circuits/insets/*.json
