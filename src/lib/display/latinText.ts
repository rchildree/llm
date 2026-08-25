/**
 * "Consummate Vs" display mode: render Latin the epigraphic way —
 * lowercase v as u, uppercase U as V. Display-time only; data keeps u/v.
 */
export function consummateVs(s: string): string {
  return s.replace(/v/g, 'u').replace(/U/g, 'V')
}
