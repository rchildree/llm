import { describe, expect, test } from 'vitest'
import {
  ALL_MODIFIER_KINDS,
  DEFAULT_AGREE_OPTIONS,
  allowsModifier,
  allowsNoun,
  slotsFor,
  type AgreementOptions,
} from './options'
import { buildAgreementPool, doesItMatch, fillTheChart, makeItAgree } from './pairing'
import { indexPronounForms, slotKey } from './paradigm'
import { chartCells } from './chart'
import type { FormRecord, VocabEntry } from '../dataset/types'

// the real published dataset, so the filters are exercised on real vocabulary
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

const opts = (patch: Partial<AgreementOptions>): AgreementOptions => ({
  ...DEFAULT_AGREE_OPTIONS,
  ...patch,
})

const poolWith = (patch: Partial<AgreementOptions>) =>
  buildAgreementPool(entries, { cap: 45, only: false }, pronounForms, opts(patch))

const full = buildAgreementPool(entries, { cap: 45, only: false }, pronounForms)

describe('the option predicates', () => {
  const noun = entries.find((e) => e.lemma === 'puella')!
  const adjective = entries.find((e) => e.lemma === 'magnus')!
  const pronoun = entries.find((e) => e.id === 'hic-pron')!

  test('a declension the panel switched off is out', () => {
    expect(allowsNoun(noun, opts({ declensions: ['1'] }))).toBe(true)
    expect(allowsNoun(noun, opts({ declensions: ['3'] }))).toBe(false)
  })

  test('an empty list means no restriction, as in the drills', () => {
    expect(allowsNoun(noun, opts({ declensions: [] }))).toBe(true)
    expect(allowsModifier(adjective, opts({ adjClasses: [], modifierKinds: [] }))).toBe(true)
  })

  test('modifier kind and adjective class both have to pass', () => {
    expect(allowsModifier(adjective, opts({ modifierKinds: ['pron'] }))).toBe(false)
    expect(allowsModifier(adjective, opts({ adjClasses: ['3'] }))).toBe(false)
    expect(allowsModifier(adjective, opts({ adjClasses: ['1-2'] }))).toBe(true)
    expect(allowsModifier(pronoun, opts({ modifierKinds: ['adj'] }))).toBe(false)
    // an adjective class never silences a pronoun
    expect(allowsModifier(pronoun, opts({ adjClasses: ['1-2'] }))).toBe(true)
  })

  test('slots are the chosen cases times the chosen numbers', () => {
    expect(slotsFor(DEFAULT_AGREE_OPTIONS)).toHaveLength(10)
    expect(slotsFor(opts({ cases: ['nom', 'acc'] }))).toHaveLength(4)
    expect(slotsFor(opts({ numbers: ['pl'] }))).toHaveLength(5)
    expect(slotsFor(opts({ cases: ['abl'], numbers: ['sg'] }))).toEqual([{ c: 'abl', n: 'sg' }])
    expect(slotsFor(opts({ cases: [] }))).toHaveLength(10)
    expect(slotsFor(opts({ numbers: [] }))).toHaveLength(10)
  })
})

describe('the options narrow the pool', () => {
  test('the default pool is everything that was there before', () => {
    expect(full.nouns.length).toBeGreaterThan(200)
    expect(full.modifiers.length).toBeGreaterThan(100)
    expect(full.slots).toHaveLength(10)
  })

  test('declensions filter the nouns and leave the modifiers alone', () => {
    const first = poolWith({ declensions: ['1'] })
    expect(first.nouns.length).toBeGreaterThan(0)
    expect(first.nouns.every((e) => e.cls === '1')).toBe(true)
    expect(first.modifiers).toHaveLength(full.modifiers.length)
  })

  test('modifier kinds filter the modifiers and leave the nouns alone', () => {
    const pronounsOnly = poolWith({ modifierKinds: ['pron'] })
    expect(pronounsOnly.modifiers.length).toBeGreaterThan(0)
    expect(pronounsOnly.modifiers.every((e) => e.pos === 'pron')).toBe(true)
    expect(pronounsOnly.nouns).toHaveLength(full.nouns.length)

    const adjectivesOnly = poolWith({ modifierKinds: ['adj'] })
    expect(adjectivesOnly.modifiers.every((e) => e.pos === 'adj')).toBe(true)
  })

  test('adjective classes narrow the adjectives but keep the pronouns', () => {
    const third = poolWith({ adjClasses: ['3'] })
    expect(third.modifiers.some((e) => e.pos === 'pron')).toBe(true)
    expect(third.modifiers.filter((e) => e.pos === 'adj').every((e) => e.cls === '3')).toBe(true)
    expect(third.modifiers.filter((e) => e.pos === 'adj').length).toBeGreaterThan(0)
  })

  test('switching everything off leaves an empty pool rather than throwing', () => {
    const none = poolWith({ declensions: ['nothing'], modifierKinds: ['nothing'], cases: ['nothing'] })
    expect(none.nouns).toHaveLength(0)
    expect(none.modifiers).toHaveLength(0)
    expect(none.slots).toHaveLength(0)
    expect(makeItAgree(none, pronounForms, rng(1))).toBeNull()
    expect(doesItMatch(none, true, pronounForms, rng(1))).toBeNull()
    expect(fillTheChart(none, pronounForms, rng(1))).toBeNull()
  })
})

describe('the questions honour the chosen slots', () => {
  test('make it agree only asks for a slot that is switched on', () => {
    const pool = poolWith({ cases: ['abl'], numbers: ['pl'] })
    for (let seed = 1; seed <= 100; seed++) {
      const q = makeItAgree(pool, pronounForms, rng(seed))
      if (!q) continue
      expect(slotKey(q.slot.c, q.slot.n)).toBe('abl.pl')
    }
  })

  test('does it match turns on a slot that is switched on', () => {
    const pool = poolWith({ cases: ['gen'], numbers: ['sg', 'pl'] })
    const allowed = new Set(['gen.sg', 'gen.pl'])
    let asked = 0
    for (let seed = 1; seed <= 120; seed++) {
      const q = doesItMatch(pool, seed % 2 === 0, pronounForms, rng(seed))
      if (!q) continue
      asked++
      // the noun form has to be readable in one of the chosen slots
      expect(q.nounTriples.some((t) => allowed.has(slotKey(t.c, t.n)))).toBe(true)
      // and an agreeing pair has to agree there
      if (q.matches) expect(q.shared.some((t) => allowed.has(slotKey(t.c, t.n)))).toBe(true)
    }
    expect(asked).toBeGreaterThan(50)
  })

  test('a one-slot setting still deals both kinds of does-it-match question', () => {
    const pool = poolWith({ cases: ['dat'], numbers: ['sg'] })
    const yes = doesItMatch(pool, true, pronounForms, rng(3))
    const no = doesItMatch(pool, false, pronounForms, rng(3))
    expect(yes?.matches).toBe(true)
    expect(no?.matches).toBe(false)
  })

  test('the chart stays the whole paradigm whatever the slots say', () => {
    const pool = poolWith({ cases: ['nom'], numbers: ['sg'] })
    const q = fillTheChart(pool, pronounForms, rng(5))
    expect(q).not.toBeNull()
    expect(chartCells(q!)).toHaveLength(20)
    // and its worked example is still a row with endings on both sides
    expect(slotKey(q!.given.c, q!.given.n)).not.toBe('nom.sg')
  })
})

describe('what the panel is allowed to hold', () => {
  test('the defaults switch everything on', () => {
    expect(DEFAULT_AGREE_OPTIONS.modifierKinds).toEqual(ALL_MODIFIER_KINDS)
    expect(slotsFor(DEFAULT_AGREE_OPTIONS)).toHaveLength(10)
  })

  test('a stored option set from an older build is filled in, not trusted whole', () => {
    // the page spreads the defaults under whatever localStorage had
    const stored = { declensions: ['2'] } as Partial<AgreementOptions>
    const merged = { ...DEFAULT_AGREE_OPTIONS, ...stored }
    expect(merged.cases).toEqual(DEFAULT_AGREE_OPTIONS.cases)
    expect(merged.declensions).toEqual(['2'])
  })
})
