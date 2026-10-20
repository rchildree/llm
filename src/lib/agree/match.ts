/**
 * Whether a modifier form and a noun form actually agree.
 *
 * The rule is the same one the form drills rely on: a surface stands for every
 * slot it can fill, and two words agree iff they share at least one complete
 * case + number + gender triple. That is what makes syncretism safe —
 * "magnae puellae" genuinely agrees three ways (gen.sg., dat.sg., nom.pl.),
 * while a pair generated as a non-match must share none of them.
 */
import type { Gender, Paradigm, Slot } from './paradigm'
import type { LatinCase, LatinNumber } from '../morph/types'

export interface Triple extends Slot {
  g: Gender
}

export const tripleKey = (t: Triple): string => `${t.c}.${t.n}.${t.g}`

/** Every slot this surface fills, across the genders supplied. */
export function triplesFor(
  byGender: Partial<Record<Gender, Paradigm>>,
  surface: string,
): Triple[] {
  const found: Triple[] = []
  const seen = new Set<string>()
  for (const [gender, paradigm] of Object.entries(byGender) as Array<[Gender, Paradigm]>) {
    if (!paradigm) continue
    for (const [key, form] of paradigm) {
      if (form.whole !== surface && !form.alternates.includes(surface)) continue
      const [c, n] = key.split('.') as [LatinCase, LatinNumber]
      const triple: Triple = { c, n, g: gender }
      const id = tripleKey(triple)
      if (seen.has(id)) continue
      seen.add(id)
      found.push(triple)
    }
  }
  return found
}

/** The triples two forms have in common — empty means they do not agree. */
export function sharedTriples(a: Triple[], b: Triple[]): Triple[] {
  const inB = new Set(b.map(tripleKey))
  return a.filter((t) => inB.has(tripleKey(t)))
}

export function agrees(a: Triple[], b: Triple[]): boolean {
  return sharedTriples(a, b).length > 0
}
