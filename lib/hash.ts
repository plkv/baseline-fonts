export function shortHash(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i)
    h |= 0
  }
  const hex = (h >>> 0).toString(16)
  return hex.padStart(8, '0')
}

