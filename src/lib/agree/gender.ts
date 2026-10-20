/**
 * "Which gender is this noun?" — the one exercise in this section that is
 * about a single word rather than a pair. The rules that answer it, and the
 * help panel's text, live in genderRules.ts.
 */
import type { VocabEntry } from '../dataset/types'
import { gendersOf } from '../morph/entries'
import type { Rng } from '../flash/shuffle'
import { ruleNoun, rulesFor, type RuleHit, type RuleNoun } from './genderRules'
import type { Gender } from './paradigm'

export interface GenderQuestion {
  kind: 'which-gender'
  entry: VocabEntry
  noun: RuleNoun
  /** every gender the dataset records: a common-gender noun takes either */
  answers: Gender[]
  /** the rules that bear on this noun, in the order they are consulted */
  hits: RuleHit[]
}

const pick = <T,>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)]

export function whichGender(nouns: VocabEntry[], rng: Rng = Math.random): GenderQuestion | null {
  if (!nouns.length) return null
  for (let attempt = 0; attempt < 24; attempt++) {
    const entry = pick(nouns, rng)
    const noun = ruleNoun(entry)
    const answers = gendersOf(entry)
    if (!noun || !answers.length) continue
    return { kind: 'which-gender', entry, noun, answers, hits: rulesFor(noun) }
  }
  return null
}
