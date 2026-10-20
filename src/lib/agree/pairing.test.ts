import { describe, expect, test } from 'vitest'
import {
  ATTRIBUTIVE_PRONOUNS,
  buildAgreementPool,
  doesItMatch,
  isEligibleModifier,
  isEligibleNoun,
  makeItAgree,
  pickPair,
} from './pairing'
import { indexPronounForms, modifierParadigm, slotKey } from './paradigm'
import { sharedTriples, triplesFor } from './match'
import type { Gender, Paradigm } from './paradigm'
import type { FormRecord, VocabEntry } from '../dataset/types'

// the real published dataset, so the pool is exercised against real vocabulary
import entriesJson from '../../../public/datasets/knudsvig-731/entries.json'
import pronounJson from '../../../public/datasets/knudsvig-731/forms.pron.json'

const entries = entriesJson as unknown as VocabEntry[]
const pronounForms = indexPronounForms(pronounJson as unknown as FormRecord[])

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

const full = buildAgreementPool(entries, { cap: 45, only: false }, pronounForms)

describe('eligibility', () => {
  test('the pool is big enough to drill', () => {
    expect(full.modifiers.length).toBeGreaterThan(100)
    expect(full.nouns.length).toBeGreaterThan(200)
  })

  test('personal and substantive pronouns are excluded', () => {
    const ids = new Set(full.modifiers.map((m) => m.id))
    for (const id of ['ego-pron', 'tu-pron', 'nos-pron', 'vos-pron', 'se-pron']) {
      expect(ids.has(id)).toBe(false)
    }
    for (const id of ['quis-pron', 'quisquam-pron', 'quisquis-pron', 'aliquis-pron']) {
      expect(ids.has(id)).toBe(false)
    }
  })

  test('the attributive pronouns are all present and usable', () => {
    const ids = new Set(full.modifiers.map((m) => m.id))
    for (const id of ATTRIBUTIVE_PRONOUNS) expect(ids.has(id)).toBe(true)
  })

  test('defective words are excluded: vīs has no genitive to decline', () => {
    const vis = entries.find((e) => e.lemma === 'vīs')!
    expect(vis.flags).toContain('defective')
    expect(isEligibleNoun(vis)).toBe(false)
    expect(full.nouns.some((e) => e.lemma === 'vīs')).toBe(false)
  })

  test('plural-only words are excluded from both sides', () => {
    const all = [...full.modifiers, ...full.nouns]
    expect(all.some((e) => e.flags.includes('plural-only'))).toBe(false)
    expect(isEligibleNoun(entries.find((e) => e.id === 'castra-n')!)).toBe(false)
    expect(isEligibleModifier(entries.find((e) => e.id === 'ceteri-adj')!)).toBe(false)
  })

  test('verbs and adverbs are never modifiers', () => {
    expect(full.modifiers.every((m) => m.pos === 'adj' || m.pos === 'pron')).toBe(true)
  })
})

describe('chapter scope', () => {
  test('nouns obey "only", modifiers draw through the cap', () => {
    const pool = buildAgreementPool(entries, { cap: 12, only: true }, pronounForms)
    expect(pool.nouns.every((n) => n.chapter === 12)).toBe(true)
    expect(pool.nouns.length).toBeGreaterThan(0)
    expect(pool.modifiers.every((m) => m.chapter <= 12)).toBe(true)
    expect(pool.modifiers.some((m) => m.chapter < 12)).toBe(true)
  })

  test('"through N" bounds both sides', () => {
    const pool = buildAgreementPool(entries, { cap: 10, only: false }, pronounForms)
    expect([...pool.nouns, ...pool.modifiers].every((e) => e.chapter <= 10)).toBe(true)
  })

  test('chapters below the first adjective yield no modifiers', () => {
    const pool = buildAgreementPool(entries, { cap: 4, only: false }, pronounForms)
    expect(pool.modifiers).toHaveLength(0)
    expect(pickPair(pool, pronounForms, rng(1))).toBeNull()
  })

  test('every chapter from 5 up can produce a pair', () => {
    for (let cap = 5; cap <= 45; cap++) {
      const pool = buildAgreementPool(entries, { cap, only: true }, pronounForms)
      if (!pool.nouns.length) continue // chapters with no nouns of their own
      expect(pickPair(pool, pronounForms, rng(cap))).not.toBeNull()
    }
  })
})

describe('makeItAgree', () => {
  test('both forms exist and sit in the asked-for slot', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const q = makeItAgree(full, pronounForms, rng(seed))
      expect(q).not.toBeNull()
      const key = slotKey(q!.slot.c, q!.slot.n)
      expect(q!.modifierForm.whole).toBeTruthy()
      expect(q!.nounForm.whole).toBeTruthy()
      expect(q!.pair.modifierParadigm.get(key)!.whole).toBe(q!.modifierForm.whole)
      expect(q!.pair.nounParadigm.get(key)!.whole).toBe(q!.nounForm.whole)
    }
  })

  test('the two forms always genuinely agree', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const q = makeItAgree(full, pronounForms, rng(seed))!
      const byGender: Partial<Record<Gender, Paradigm>> = {
        [q.pair.gender]: modifierParadigm(q.pair.modifier, q.pair.gender, pronounForms)!,
      }
      const nounSide: Partial<Record<Gender, Paradigm>> = { [q.pair.gender]: q.pair.nounParadigm }
      const shared = sharedTriples(
        triplesFor(byGender, q.modifierForm.whole),
        triplesFor(nounSide, q.nounForm.whole),
      )
      expect(shared.length).toBeGreaterThan(0)
    }
  })

  test('adjectives split, pronouns do not', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const q = makeItAgree(full, pronounForms, rng(seed))!
      expect(q.modifierForm.splittable).toBe(q.pair.modifier.pos === 'adj')
      expect(q.nounForm.splittable).toBe(true)
      if (q.modifierForm.splittable) {
        expect(q.modifierForm.stem + q.modifierForm.ending).toBe(q.modifierForm.whole)
      }
    }
  })
})

describe('doesItMatch', () => {
  test('a "yes" question really agrees', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const q = doesItMatch(full, true, pronounForms, rng(seed))
      expect(q).not.toBeNull()
      expect(q!.matches).toBe(true)
      expect(q!.shared.length).toBeGreaterThan(0)
    }
  })

  test('a "no" question never agrees by accident', () => {
    let built = 0
    for (let seed = 1; seed <= 500; seed++) {
      const q = doesItMatch(full, false, pronounForms, rng(seed))
      if (!q) continue
      built++
      expect(q.matches).toBe(false)
      expect(q.shared).toEqual([])
      // recompute independently of the generator's own bookkeeping
      const byGender: Partial<Record<Gender, Paradigm>> = {}
      for (const g of ['m', 'f', 'n'] as Gender[]) {
        const p = modifierParadigm(q.pair.modifier, g, pronounForms)
        if (p) byGender[g] = p
      }
      const nounSide: Partial<Record<Gender, Paradigm>> = { [q.pair.gender]: q.pair.nounParadigm }
      expect(
        sharedTriples(
          triplesFor(byGender, q.modifierSurface),
          triplesFor(nounSide, q.nounSurface),
        ),
      ).toEqual([])
    }
    expect(built).toBeGreaterThan(400)
  })

  test('both surfaces are real forms of their words', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const q = doesItMatch(full, seed % 2 === 0, pronounForms, rng(seed))!
      expect(q.modifierTriples.length).toBeGreaterThan(0)
      expect(q.nounTriples.length).toBeGreaterThan(0)
    }
  })
})
