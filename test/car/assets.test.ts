import { expect, it } from 'bun:test'

const KB = 1024

const POSTERS = ['exploded', 'exploded-phone', 'top', 'top-phone', 'side', 'side-corner'].flatMap((view) => [`${view}-light`, `${view}-dark`])

it('ships every car poster within budget', async () => {
  for (const name of POSTERS) {
    const file = Bun.file(`public/car/${name}.webp`)

    expect(`${name} ${await file.exists()}`).toBe(`${name} true`)
    expect(file.size).toBeLessThan(200 * KB)
  }
})
