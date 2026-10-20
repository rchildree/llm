import { describe, expect, test } from 'vitest'
import { agrees, sharedTriples, tripleKey, triplesFor } from './match'
import { modifierParadigm, nounParadigm, type Gender, type Paradigm } from './paradigm'
import type { VocabEntry } from '../dataset/types'

const puella = {
  id: 'puella-n', chapter: 1, pos: 'n', lemma: 'puella', dict: 'puella', definition: '',
  pp: ['puella', 'puellae', null, null], gender: 'f', flags: [],
} as unknown as VocabEntry

const magnus = {
  id: 'magnus-adj', chapter: 1, pos: 'adj', lemma: 'magnus', dict: 'magnus', definition: '',
  pp: ['magnus', 'magna', 'magnum', null], flags: [],
} as unknown as VocabEntry

const nounF: Partial<Record<Gender, Paradigm>> = { f: nounParadigm(puella)! }
const adjAll: Partial<Record<Gender, Paradigm>> = {
  m: modifierParadigm(magnus, 'm')!,
  f: modifierParadigm(magnus, 'f')!,
  n: modifierParadigm(magnus, 'n')!,
}

const keys = (ts: ReturnType<typeof triplesFor>) => ts.map(tripleKey).sort()

describe('triplesFor', () => {
  test('a syncretic noun form reports every slot it fills', () => {
    expect(keys(triplesFor(nounF, 'puellae'))).toEqual(['dat.sg.f', 'gen.sg.f', 'nom.pl.f'])
  })

  test('an unambiguous form reports one slot', () => {
    expect(keys(triplesFor(nounF, 'puellam'))).toEqual(['acc.sg.f'])
  })

  test('an adjective form reports slots across genders', () => {
    // magnō is dat./abl. sg. in both masculine and neuter
    expect(keys(triplesFor(adjAll, 'magnō'))).toEqual(['abl.sg.m', 'abl.sg.n', 'dat.sg.m', 'dat.sg.n'])
  })

  test('a surface the word never takes reports nothing', () => {
    expect(triplesFor(nounF, 'mīlitis')).toEqual([])
  })
})

describe('agreement', () => {
  test('magnae puellae agrees three ways', () => {
    const shared = sharedTriples(triplesFor(adjAll, 'magnae'), triplesFor(nounF, 'puellae'))
    expect(keys(shared)).toEqual(['dat.sg.f', 'gen.sg.f', 'nom.pl.f'])
  })

  test('magnus puellae does not agree', () => {
    expect(agrees(triplesFor(adjAll, 'magnus'), triplesFor(nounF, 'puellae'))).toBe(false)
  })

  test('magnam puellam agrees', () => {
    expect(agrees(triplesFor(adjAll, 'magnam'), triplesFor(nounF, 'puellam'))).toBe(true)
  })

  test('a neuter form never agrees with a feminine noun', () => {
    const neuterOnly: Partial<Record<Gender, Paradigm>> = { n: adjAll.n }
    for (const form of adjAll.n!.values()) {
      const shared = sharedTriples(
        triplesFor(neuterOnly, form.whole),
        triplesFor(nounF, 'puellae'),
      )
      expect(shared).toEqual([])
    }
  })

  test('right case and number but wrong gender does not agree', () => {
    // magnum is acc.sg.m (and nom/acc sg.n) — never feminine
    const shared = sharedTriples(triplesFor(adjAll, 'magnum'), triplesFor(nounF, 'puellam'))
    expect(shared).toEqual([])
  })
})
