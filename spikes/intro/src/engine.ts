/** A synthesized engine note. Created on the first click, because browsers only allow audio after a gesture. */
export function createEngine() {
  const ctx = new AudioContext()
  const out = ctx.createGain()
  out.gain.value = 0
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 6
  const body = ctx.createOscillator()
  body.type = 'sawtooth'
  const whine = ctx.createOscillator()
  whine.type = 'square'
  const whineGain = ctx.createGain()
  whineGain.gain.value = 0.18

  body.connect(filter)
  whine.connect(whineGain).connect(filter)
  filter.connect(out).connect(ctx.destination)
  body.start()
  whine.start()

  let on = false
  return {
    async toggle() {
      on = !on
      if (on) await ctx.resume()
      out.gain.setTargetAtTime(on ? 0.05 : 0, ctx.currentTime, 0.08)
      return on
    },
    update(rpm: number, speed: number) {
      if (!on) return
      const t = ctx.currentTime
      const f = 55 + rpm * 300
      body.frequency.setTargetAtTime(f, t, 0.04)
      whine.frequency.setTargetAtTime(f * 2.02, t, 0.04)
      filter.frequency.setTargetAtTime(500 + rpm * 2600, t, 0.05)
      out.gain.setTargetAtTime(0.04 + speed * 0.06, t, 0.1)
    },
  }
}
