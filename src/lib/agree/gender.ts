/**
 * "Which gender is this noun?" — the one exercise in this section that is
 * about a single word rather than a pair. The rules that answer it, and the
 * feedback panel's text, live in genderRules.ts.
 */
import type { VocabEntry } from '../dataset/types'
import { gendersOf } from '../morph/entries'
import type { Rng } from '../flash/shuffle'
import { ruleNoun, rulesFor, type RuleHit, type RuleNoun } from './genderRules'
import { allSlots, nounParadigm, slotKey, type Gender, type Slot } from './paradigm'

/** An inflected form standing in for the citation, in hard mode. */
export interface ShownForm {
  surface: string
  slot: Slot
}

export interface GenderQuestion {
  kind: 'which-gender'
  entry: VocabEntry
  noun: RuleNoun
  /** every gender the dataset records: a common-gender noun takes either */
  answers: Gender[]
  /** the rules that bear on this noun, in the order they are consulted */
  hits: RuleHit[]
  /**
   * Hard mode: the form put on screen in place of the dictionary entry, which
   * is held back until the student has chosen. Null in the ordinary mode.
   */
  shown: ShownForm | null
}

const pick = <T,>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)]

/**
 * A form that makes the student work: never the nominative singular, which is
 * the citation itself, and never a form that merely repeats it — a 3rd-decl.
 * neuter's accusative singular would give the word away unchanged.
 */
export function declinedForm(entry: VocabEntry, rng: Rng = Math.random): ShownForm | null {
  const paradigm = nounParadigm(entry)
  if (!paradigm) return null
  const citation = paradigm.get(slotKey('nom', 'sg'))?.whole

  const candidates: ShownForm[] = []
  for (const slot of allSlots()) {
    if (slot.c === 'nom' && slot.n === 'sg') continue
    const form = paradigm.get(slotKey(slot.c, slot.n))
    if (!form?.whole || form.whole === citation) continue
    candidates.push({ surface: form.whole, slot })
  }
  return candidates.length ? pick(candidates, rng) : null
}

export function whichGender(
  nouns: VocabEntry[],
  hard = false,
  rng: Rng = Math.random,
): GenderQuestion | null {
  if (!nouns.length) return null
  for (let attempt = 0; attempt < 24; attempt++) {
    const entry = pick(nouns, rng)
    const noun = ruleNoun(entry)
    const answers = gendersOf(entry)
    if (!noun || !answers.length) continue
    const shown = hard ? declinedForm(entry, rng) : null
    // a word with no usable inflected form is simply not asked in hard mode
    if (hard && !shown) continue
    return { kind: 'which-gender', entry, noun, answers, hits: rulesFor(noun), shown }
  }
  return null
}
