/**
 * VocabEntry → MorphEntry builders, shared by the build-time form generator
 * (adapter.ts) and the runtime paradigm code the Agreement section uses.
 *
 * These live apart from adapter.ts so the app can build a NounEntry or
 * AdjectiveEntry in the browser without pulling in the whole form-generation
 * pipeline, and so both callers derive declensions, stems and i-stem status
 * from exactly the same logic.
 */
import { deriveAdjectiveStem, deriveNounDeclension, deriveNounStem } from './morphology'
import type { AdjectiveEntry, Gender, NounEntry } from './types'
import type { VocabEntry } from '../dataset/types'

export const demacron = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

export const stripSuffix = (s: string, suffixes: string[]): string | null => {
  const plain = demacron(s)
  for (const suf of suffixes) {
    if (plain.endsWith(suf)) return s.slice(0, s.length - suf.length)
  }
  return null
}

export function isIStem(entry: VocabEntry): boolean {
  if (entry.flags.includes('not-i-stem')) return false
  return entry.flags.includes('i-stem') || entry.flags.includes('i-stem?')
}

/** The genders a noun entry can be read as ('mf' citations yield both). */
export function gendersOf(entry: VocabEntry): Gender[] {
  if (!entry.gender) return []
  return entry.gender === 'mf' ? ['m', 'f'] : [entry.gender]
}

export function buildNounEntry(entry: VocabEntry): NounEntry | null {
  const [nom, gen] = entry.pp
  if (!gen || !entry.gender) return null
  const genders = gendersOf(entry)
  const pluralOnly = entry.flags.includes('plural-only')

  let declension: NounEntry['declension']
  let stem: string
  if (pluralOnly) {
    // citation is nom.pl + gen.pl (aedēs aedium, castra castrōrum)
    const byEnding: Array<[string[], NounEntry['declension']]> = [
      [['arum'], '1'],
      [['orum'], '2'],
      [['uum'], '4'],
      [['erum'], '5'],
      [['um'], '3'],
    ]
    const match = byEnding.find(([sufs]) => stripSuffix(gen, sufs) !== null)
    if (!match) return null
    declension = match[1]
    stem = stripSuffix(gen, match[0])!
    if (declension === '3' && stripSuffix(gen, ['ium'])) stem = stripSuffix(gen, ['ium'])!
  } else {
    declension = deriveNounDeclension(gen, nom)
    stem = deriveNounStem(declension, gen)
  }

  const iStem = declension === '3' && (isIStem(entry) || (pluralOnly && demacron(gen).endsWith('ium')))
  return {
    id: entry.id,
    lemma: entry.lemma,
    displayName: entry.lemma,
    pos: 'noun',
    declension,
    gender: genders[0],
    nominative: nom ?? entry.lemma,
    genitive: gen,
    stem,
    iStem,
  }
}

/**
 * The classroom abl.sg. of a mixed i-stem: -e, not the engine's pure i-stem -ī.
 * Returns null when the entry isn't one, so callers can keep the engine's form.
 */
export function mixedIStemAblSg(morphEntry: NounEntry): string | null {
  if (!morphEntry.iStem || morphEntry.gender === 'n') return null
  return `${morphEntry.stem}e`
}

export function buildAdjectiveEntry(entry: VocabEntry): AdjectiveEntry | null {
  const [pp1, pp2, pp3] = entry.pp
  const base = {
    id: entry.id,
    lemma: entry.lemma,
    displayName: entry.lemma,
    pos: 'adjective' as const,
    degrees: ['positive' as const],
  }

  if (entry.flags.includes('comp')) return null // irregular comparatives need override paradigms

  if (entry.flags.includes('1term')) {
    if (!entry.genSg) return null
    return {
      ...base,
      adjectiveClass: '3',
      nominative: pp1,
      stem: deriveAdjectiveStem(entry.genSg),
    }
  }

  if (!pp2 || !pp3) return null

  // 3rd declension, 2- or 3-termination: neuter ends in -e
  if (demacron(pp3).endsWith('e')) {
    const stem = stripSuffix(pp2, ['is']) ?? pp2
    return {
      ...base,
      adjectiveClass: '3',
      nominative: pp1,
      feminineForm: pp2,
      neuterForm: pp3,
      stem,
    }
  }

  // 1st/2nd declension (incl. -er and pronominal); stem from the feminine
  const stem = stripSuffix(pp2, ['a', 'ae']) ?? pp2
  return {
    ...base,
    adjectiveClass: '1-2',
    pronominal: entry.flags.includes('pronominal') || undefined,
    nominative: pp1,
    feminineForm: pp2,
    neuterForm: pp3,
    stem,
  }
}
