import { describe, expect, test } from 'vitest'
import { declinedForm, whichGender } from './gender'
import { nounParadigm, slotKey } from './paradigm'
import { buildAgreementPool } from './pairing'
import { indexPronounForms } from './paradigm'
import type { FormRecord, VocabEntry } from '../dataset/types'

import entriesJson from '../../../public/datasets/knudsvig-731/entries.json'
import pronounJson from '../../../public/datasets/knudsvig-731/forms.pron.json'

const entries = entriesJson as unknown as VocabEntry[]
const pronounForms = indexPronounForms(pronounJson as unknown as FormRecord[])
const pool = buildAgreementPool(entries, { cap: 45, only: false }, pronounForms)

/** mulberry32, matching the drill generator's seeded RNG */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const find = (lemma: string): VocabEntry => entries.find((e) => e.lemma === lemma)!

describe('the ordinary mode', () => {
  test('shows the citation, not an inflected form', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(whichGender(pool.nouns, false, rng(seed))!.shown).toBeNull()
    }
  })

  test('an empty pool asks nothing', () => {
    expect(whichGender([], false, rng(1))).toBeNull()
    expect(whichGender([], true, rng(1))).toBeNull()
  })
})

describe('hard mode', () => {
  test('always puts a real inflected form on screen', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const q = whichGender(pool.nouns, true, rng(seed))
      expect(q).not.toBeNull()
      const { shown, entry } = q!
      expect(shown).not.toBeNull()
      const paradigm = nounParadigm(entry)!
      const form = paradigm.get(slotKey(shown!.slot.c, shown!.slot.n))
      expect(form?.whole).toBe(shown!.surface)
    }
  })

  test('never the nominative singular — that is the citation itself', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { shown } = whichGender(pool.nouns, true, rng(seed))!
      expect(slotKey(shown!.slot.c, shown!.slot.n)).not.toBe('nom.sg')
    }
  })

  test('never a form that merely repeats the citation', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const q = whichGender(pool.nouns, true, rng(seed))!
      const citation = nounParadigm(q.entry)!.get('nom.sg')!.whole
      expect(q.shown!.surface).not.toBe(citation)
    }
  })

  test("a 3rd-decl. neuter's accusative singular is skipped, its oblique forms are not", () => {
    // corpus: nom.sg. and acc.sg. are both "corpus"
    const slots = new Set<string>()
    for (let seed = 1; seed <= 120; seed++) {
      const form = declinedForm(find('corpus'), rng(seed))
      expect(form!.surface).not.toBe('corpus')
      slots.add(slotKey(form!.slot.c, form!.slot.n))
    }
    expect(slots.has('acc.sg')).toBe(false)
    expect(slots.has('gen.sg')).toBe(true)
  })

  test('the answer and the rules are the same either way', () => {
    const easy = whichGender([find('ōrātiō')], false, rng(4))!
    const hard = whichGender([find('ōrātiō')], true, rng(4))!
    expect(hard.answers).toEqual(easy.answers)
    expect(hard.hits.map((h) => h.rule.id)).toEqual(easy.hits.map((h) => h.rule.id))
    expect(hard.entry.lemma).toBe('ōrātiō')
  })

  test('a word with nothing to decline is not asked', () => {
    // every pool noun has a paradigm, so hard mode never comes up empty
    const q = whichGender(pool.nouns, true, rng(9))
    expect(q?.shown).toBeTruthy()
    expect(declinedForm({ ...find('ōrātiō'), pp: ['ōrātiō', null, null, null] })).toBeNull()
  })
})
