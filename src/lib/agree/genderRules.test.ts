import { describe, expect, test } from 'vitest'
import { GENDER_RULES, predictGender, ruleNoun, rulesFor } from './genderRules'
import { gendersOf } from '../morph/entries'
import type { VocabEntry } from '../dataset/types'
import type { Gender } from './paradigm'

// the real published dataset: every rule is held to the recorded genders
import entriesJson from '../../../public/datasets/knudsvig-731/entries.json'

const entries = entriesJson as unknown as VocabEntry[]
const nouns = entries.filter((e) => e.pos === 'n')

const byLemma = (lemma: string): VocabEntry => {
  const entry = nouns.find((e) => e.lemma === lemma)
  if (!entry) throw new Error(`no noun ${lemma} in the dataset`)
  return entry
}

const noun = (lemma: string) => {
  const built = ruleNoun(byLemma(lemma))
  if (!built) throw new Error(`${lemma} yields no rule noun`)
  return built
}

const ruleIds = (lemma: string): string[] => rulesFor(noun(lemma)).map((h) => h.rule.id)

interface Audit {
  /** nouns the rule fires on and is not excepted for */
  fires: Record<string, string[]>
  /** nouns the rule lists as its own exceptions */
  excepted: Record<string, string[]>
  /** "<rule>: <lemma> → <gender>, recorded <gender>" */
  contradictions: string[]
  /** nouns no rule bears on at all */
  uncovered: string[]
}

/** Run every rule over every noun in the dataset. */
function audit(): Audit {
  const result: Audit = { fires: {}, excepted: {}, contradictions: [], uncovered: [] }
  for (const rule of GENDER_RULES) {
    result.fires[rule.id] = []
    result.excepted[rule.id] = []
  }

  for (const entry of nouns) {
    const built = ruleNoun(entry)
    if (!built) continue
    const recorded = gendersOf(entry)
    const hits = rulesFor(built)
    if (!hits.length) result.uncovered.push(entry.lemma)

    for (const hit of hits) {
      const bucket = hit.exception ? result.excepted : result.fires
      bucket[hit.rule.id].push(entry.lemma)
      if (!recorded.includes(hit.gender)) {
        result.contradictions.push(
          `${hit.rule.id}: ${entry.lemma} ${entry.pp[1]} → ${hit.gender}, recorded ${entry.gender}`,
        )
      }
    }
  }
  return result
}

const report = audit()

describe('the rules against the dataset', () => {
  test('no rule contradicts a recorded gender', () => {
    // a rule that is wrong about a word in the vocabulary has to either be
    // narrowed or list that word in its exceptions
    expect(report.contradictions).toEqual([])
  })

  test('the answer a student gets is the gender the dataset records', () => {
    const wrong: string[] = []
    for (const entry of nouns) {
      const built = ruleNoun(entry)
      if (!built) continue
      const predicted = predictGender(built)
      if (predicted && !gendersOf(entry).includes(predicted)) {
        wrong.push(`${entry.lemma} → ${predicted}, recorded ${entry.gender}`)
      }
    }
    expect(wrong).toEqual([])
  })

  /**
   * How much work each rule does, so editing the list shows its effect at
   * once. Counts are unexcepted fires over the 225 nouns of knudsvig-731;
   * -ur and -ma are real rules this vocabulary has no word for yet.
   */
  test('each rule fires on the nouns it is supposed to', () => {
    const counts = Object.fromEntries(
      GENDER_RULES.map((r) => [r.id, report.fires[r.id].length]),
    )
    expect(counts).toEqual({
      'natural-m': 16,
      'natural-f': 8,
      'name-m': 11,
      'third-io-f': 7,
      'third-tas-f': 9,
      'third-tudo-f': 4,
      'third-tus-f': 3,
      'third-x-f': 5,
      'third-cons-s-f': 4,
      'third-es-f': 1,
      'third-aus-f': 1,
      'third-ns-m': 5,
      'third-tor-m': 3,
      'third-or-m': 9,
      'third-os-m': 1,
      'third-o-m': 3,
      'third-er-m': 2,
      'third-men-n': 5,
      'third-us-oris-n': 3,
      'third-us-eris-n': 3,
      'third-us-uris-n': 1,
      'third-ut-n': 1,
      'third-ar-al-n': 1,
      'third-e-n': 1,
      'third-ur-n': 0,
      'third-ma-n': 0,
      'first-f': 39,
      'second-us-m': 30,
      'second-um-n': 21,
      'fourth-m': 10,
      'fifth-f': 5,
    })
  })

  test('the rules reach all but the words that must be learnt one by one', () => {
    const covered = nouns.filter((e) => {
      const built = ruleNoun(e)
      return built !== null && rulesFor(built).length > 0
    })
    expect(covered.length).toBeGreaterThanOrEqual(204)
    // what is left is plural-only citations (arma, castra), the mixed -is
    // i-stems (ignis m. beside nāvis f.) and genuine irregulars
    expect(report.uncovered).toContain('ignis')
    expect(report.uncovered).toContain('nāvis')
    expect(report.uncovered).toContain('cor')
  })

  test('every rule has an id of its own', () => {
    const ids = GENDER_RULES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('what the rules say about a word', () => {
  const gender = (lemma: string): Gender | null => predictGender(noun(lemma))

  test('the declension defaults', () => {
    expect(gender('puella')).toBe('f')
    expect(gender('servus')).toBe('m')
    expect(gender('ager')).toBe('m')
    expect(gender('vir')).toBe('m')
    expect(gender('bellum')).toBe('n')
    expect(gender('exercitus')).toBe('m')
    expect(gender('rēs')).toBe('f')
  })

  test('the 3rd-declension ending rules', () => {
    expect(gender('ratiō')).toBe('f')
    expect(gender('vēritās')).toBe('f')
    expect(gender('multitūdō')).toBe('f')
    expect(gender('imāgō')).toBe('f')
    expect(gender('virtūs')).toBe('f')
    expect(gender('vōx')).toBe('f')
    expect(gender('urbs')).toBe('f')
    expect(gender('vulpēs')).toBe('f')
    expect(gender('laus')).toBe('f')
    expect(gender('amor')).toBe('m')
    expect(gender('victor')).toBe('m')
    expect(gender('mōs')).toBe('m')
    expect(gender('leō')).toBe('m')
    expect(gender('mōns')).toBe('m')
    expect(gender('pater')).toBe('m')
    expect(gender('nōmen')).toBe('n')
    expect(gender('corpus')).toBe('n')
    expect(gender('opus')).toBe('n')
    expect(gender('plūs')).toBe('n')
    expect(gender('caput')).toBe('n')
    expect(gender('animal')).toBe('n')
    expect(gender('mare')).toBe('n')
  })

  test('an exception answers for itself, with the reason named', () => {
    expect(gender('ōrdō')).toBe('m')
    expect(gender('tellūs')).toBe('f')
    expect(gender('ōs')).toBe('n')
    expect(gender('iter')).toBe('n')
    expect(gender('manus')).toBe('f')
    expect(gender('diēs')).toBe('m')

    const hit = rulesFor(noun('tellūs')).find((h) => h.rule.id === 'third-us-uris-n')
    expect(hit?.exception?.gender).toBe('f')
    expect(hit?.rule.gender).toBe('n')
  })

  test('sense beats form, and is consulted first', () => {
    expect(ruleIds('poēta')).toEqual(['natural-m', 'first-f'])
    expect(gender('poēta')).toBe('m')
    expect(ruleIds('uxor')).toEqual(['natural-f', 'third-or-m'])
    expect(gender('uxor')).toBe('f')
    expect(ruleIds('māter')[0]).toBe('natural-f')
    expect(gender('Caesar')).toBe('m')
  })

  test('the specific pattern is consulted before the general one', () => {
    // -tor before the broad -or rule, -iō before -ō/-ōnis
    expect(ruleIds('gladiātor')).toEqual(['third-tor-m', 'third-or-m'])
    expect(ruleIds('āctiō')).toEqual(['third-io-f'])
    expect(ruleIds('leō')).toEqual(['third-o-m'])
  })

  test('a word no rule covers predicts nothing rather than guessing', () => {
    expect(rulesFor(noun('ignis'))).toEqual([])
    expect(gender('ignis')).toBe(null)
    expect(gender('sōl')).toBe(null)
  })

  test('lemma lists match without macrons, so they can be typed plainly', () => {
    // 'poēta' is listed as 'poēta' but 'nauta' and 'scrība' are matched flat
    const built = ruleNoun({
      ...byLemma('poēta'),
      lemma: 'nauta',
      pp: ['nauta', 'nautae', null, null],
    })
    expect(built && predictGender(built)).toBe('m')
  })

  test('only nouns have rules', () => {
    const adjective = entries.find((e) => e.pos === 'adj')!
    expect(ruleNoun(adjective)).toBe(null)
  })
})
