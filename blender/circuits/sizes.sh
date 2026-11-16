#!/bin/sh
set -eu
cd "$(dirname "$0")"
blender="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
tiles=$(cd ../.. && bun -e "import { CALENDAR } from './src/circuits/calendar.ts'; console.log(Object.values(CALENDAR).map((c) => c.tile).join(' '))")
rm -rf .out/sizes
for mode in desk phone; do
  "$blender" -b -P sizes.py -- "$mode" .out/sizes $tiles < /dev/null 2>&1 | grep -E "Traceback|Error|done" || true
  test -f ".out/sizes/$mode.json"
done
python3 -I sizes_post.py desk phone
ls -l ../../public/circuits/sizes | tail -n +2 | wc -l
