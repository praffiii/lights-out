import { expect, it } from 'bun:test'

const KB = 1024

const STILLS = ['exploded-light', 'exploded-dark', 'band-light', 'band-dark'] as const

it('ships every engine still under 200 KB', async () => {
  for (const name of STILLS) {
    const file = Bun.file(`public/engine/${name}.webp`)

    expect(`${name} ${await file.exists()}`).toBe(`${name} true`)
    expect(file.size).toBeLessThan(200 * KB)
  }
})

it('fades band-light cleanly into paper (#F4F3EF) at the corners', () => {
  const proc = Bun.spawnSync(['python3', '-I', '-c', "import json; from PIL import Image; im = Image.open('public/engine/band-light.webp').convert('RGB'); w, h = im.size; print(json.dumps([list(im.getpixel((0, 0))), list(im.getpixel((w - 1, 0))), list(im.getpixel((0, h - 1))), list(im.getpixel((w - 1, h - 1)))]))"])

  expect(proc.exitCode).toBe(0)

  const corners: ReadonlyArray<readonly [number, number, number]> = JSON.parse(proc.stdout.toString())

  for (const [r, g, b] of corners) {
    expect(Math.abs(r - 0xf4)).toBeLessThanOrEqual(2)
    expect(Math.abs(g - 0xf3)).toBeLessThanOrEqual(2)
    expect(Math.abs(b - 0xef)).toBeLessThanOrEqual(2)
  }
})
