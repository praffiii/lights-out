const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']

const TENS = ['', '', 'twenty', 'thirty']

export function words(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 30) return String(n)

  if (n < 20) return ONES[n] ?? String(n)

  const unit = n % 10

  return `${TENS[Math.floor(n / 10)]}${unit ? `-${ONES[unit]}` : ''}`
}

export const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
