import { describe, expect, test } from 'vitest'
import { entriesForChip } from './help'
import type { VocabEntry } from '../dataset/types'
import type { Chip } from './types'

const entry = (id: string, dict: string): VocabEntry => ({
  id,
  chapter: 1,
  pos: 'n',
  lemma: id,
  dict,
  definition: 'gloss',
  pp: [id, null, null, null],
  flags: [],
})

const byId = new Map<string, VocabEntry>([
  ['puella-n', entry('puella-n', 'puella puellae f.')],
  ['servus-n', entry('servus-n', 'servus servī m.')],
])

const chip = (s: string, lemmas: string[]): Chip => ({ s, correct: true, analyses: [], lemmas })

describe('entriesForChip', () => {
  test('returns the entry for a single-lemma chip', () => {
    expect(entriesForChip(chip('puellae', ['puella-n']), byId).map((e) => e.dict)).toEqual([
      'puella puellae f.',
    ])
  })

  test('returns every entry for a cross-lemma syncretic surface', () => {
    const out = entriesForChip(chip('X', ['puella-n', 'servus-n']), byId)
    expect(out.map((e) => e.dict)).toEqual(['puella puellae f.', 'servus servī m.'])
  })

  test('skips lemma ids missing from the map rather than throwing', () => {
    expect(entriesForChip(chip('X', ['ghost-n', 'puella-n']), byId).map((e) => e.id)).toEqual([
      'puella-n',
    ])
  })

  test('empty when no lemmas resolve', () => {
    expect(entriesForChip(chip('X', ['ghost-n']), byId)).toEqual([])
  })
})
