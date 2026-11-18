const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']

const TENS = ['', '', 'twenty', 'thirty']

export function words(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 30) return String(n)

  if (n < 20) return ONES[n] ?? String(n)

  const unit = n % 10

  return `${TENS[Math.floor(n / 10)]}${unit ? `-${ONES[unit]}` : ''}`
}

export const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const ORDINAL_ONES = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth']

export function ordinalWord(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 30) return ordinal(n)

  if (n < 20) return ORDINAL_ONES[n] ?? ordinal(n)

  const unit = n % 10
  const tens = TENS[Math.floor(n / 10)] ?? ''

  return unit ? `${tens}-${ORDINAL_ONES[unit] ?? ''}` : `${tens.slice(0, -1)}ieth`
}

export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } satisfies Record<number, string>)[n % 10] ?? 'th'

  return `${n}${suffix}`
}
