import { describe, expect, test } from 'vitest'
import { buildPool, generateQuestion, gradeSelection } from './generator'
import { targetById } from './categories'
import type { DrillConfig } from './types'
import type { FormRecord, VocabEntry } from '../dataset/types'

const entry = (id: string, pos: VocabEntry['pos'], chapter: number, cls?: string, flags: string[] = []): VocabEntry => ({
  id,
  chapter,
  pos,
  lemma: id,
  dict: id,
  definition: '',
  pp: [id, null, null, null],
  flags,
  cls,
})

const rec = (l: string, s: string, a: FormRecord['a']): FormRecord => ({ s, l, a })

// small synthetic dataset: two nouns + one verb
const entries: VocabEntry[] = [
  entry('puella-n', 'n', 1, '1'),
  entry('servus-n', 'n', 3, '2'),
  entry('amo-v', 'v', 2, '1'),
]

const forms = {
  n: [
    rec('puella-n', 'puella', [{ k: 'nom', c: 'nom', n: 'sg' }, { k: 'nom', c: 'voc', n: 'sg' }]),
    rec('puella-n', 'puellae', [
      { k: 'nom', c: 'gen', n: 'sg' },
      { k: 'nom', c: 'dat', n: 'sg' },
      { k: 'nom', c: 'nom', n: 'pl' },
    ]),
    rec('puella-n', 'puellam', [{ k: 'nom', c: 'acc', n: 'sg' }]),
    rec('puella-n', 'puellās', [{ k: 'nom', c: 'acc', n: 'pl' }]),
    rec('puella-n', 'puellārum', [{ k: 'nom', c: 'gen', n: 'pl' }]),
    rec('servus-n', 'servōs', [{ k: 'nom', c: 'acc', n: 'pl' }]),
    rec('servus-n', 'servī', [{ k: 'nom', c: 'gen', n: 'sg' }, { k: 'nom', c: 'nom', n: 'pl' }]),
    rec('servus-n', 'servum', [{ k: 'nom', c: 'acc', n: 'sg' }]),
    rec('servus-n', 'servō', [{ k: 'nom', c: 'dat', n: 'sg' }, { k: 'nom', c: 'abl', n: 'sg' }]),
  ],
  v: [
    rec('amo-v', 'amat', [{ k: 'fin', t: 'pres', m: 'ind', v: 'act', p: '3', n: 'sg' }]),
    rec('amo-v', 'amant', [{ k: 'fin', t: 'pres', m: 'ind', v: 'act', p: '3', n: 'pl' }]),
    rec('amo-v', 'amābat', [{ k: 'fin', t: 'impf', m: 'ind', v: 'act', p: '3', n: 'sg' }]),
    rec('amo-v', 'amābant', [{ k: 'fin', t: 'impf', m: 'ind', v: 'act', p: '3', n: 'pl' }]),
    rec('amo-v', 'amātur', [{ k: 'fin', t: 'pres', m: 'ind', v: 'pass', p: '3', n: 'sg' }]),
    rec('amo-v', 'amet', [{ k: 'fin', t: 'pres', m: 'subj', v: 'act', p: '3', n: 'sg' }]),
    rec('amo-v', 'amāre', [{ k: 'inf', t: 'pres', v: 'act' }, { k: 'imp', n: 'sg' }]),
  ],
} as const

const config = (over: Partial<DrillConfig> = {}): DrillConfig => ({
  chapterCap: 35,
  chapterOnly: false,
  mode: 'noun',
  declensions: [],
  adjClasses: [],
  conjugations: [],
  includePassives: true,
  includeSubjunctives: true,
  includeInfinitives: true,
  includeVocative: false,
  includeDeponents: true,
  targets: ['acc.pl'],
  chipCount: 4,
  ...over,
})

/** builds a pool with `n` distinct acc.pl forms and `n` distinct acc.sg forms */
function bigPool(n: number) {
  const es: VocabEntry[] = []
  const fs: FormRecord[] = []
  for (let i = 0; i < n; i++) {
    es.push(entry(`plw${i}-n`, 'n', 1, '1'), entry(`sgw${i}-n`, 'n', 1, '1'))
    fs.push(rec(`plw${i}-n`, `plūrās${i}`, [{ k: 'nom', c: 'acc', n: 'pl' }]))
    fs.push(rec(`sgw${i}-n`, `singam${i}`, [{ k: 'nom', c: 'acc', n: 'sg' }]))
  }
  return buildPool(es, { n: fs }, config())
}

describe('buildPool', () => {
  test('chapter cap excludes later lemmas entirely', () => {
    const pool = buildPool(entries, { n: [...forms.n] }, config({ chapterCap: 2 }))
    expect(pool.index.has('puella')).toBe(true)
    expect(pool.index.has('servōs')).toBe(false)
    expect(pool.entries.has('servus-n')).toBe(false)
  })

  test('chapterOnly narrows the pool to that chapter alone', () => {
    const pool = buildPool(entries, { n: [...forms.n] }, config({ chapterCap: 3, chapterOnly: true }))
    expect(pool.entries.has('servus-n')).toBe(true)
    expect(pool.entries.has('puella-n')).toBe(false)
    expect(pool.index.has('puella')).toBe(false)
  })

  test('declension filter', () => {
    const pool = buildPool(entries, { n: [...forms.n] }, config({ declensions: ['2'] }))
    expect(pool.index.has('servōs')).toBe(true)
    expect(pool.index.has('puella')).toBe(false)
  })

  test('adjective class filter', () => {
    const adjEntries = [
      entry('bonus-adj', 'adj', 1, '1-2'),
      entry('fortis-adj', 'adj', 1, '3'),
    ]
    const adjForms = {
      adj: [
        rec('bonus-adj', 'bonōs', [{ k: 'nom' as const, c: 'acc' as const, n: 'pl' as const, g: 'm' as const }]),
        rec('fortis-adj', 'fortēs', [{ k: 'nom' as const, c: 'acc' as const, n: 'pl' as const, g: 'm' as const }]),
      ],
    }
    const pool = buildPool(adjEntries, adjForms, config({ mode: 'adj', adjClasses: ['3'] }))
    expect(pool.index.has('fortēs')).toBe(true)
    expect(pool.index.has('bonōs')).toBe(false)
  })

  test('merges analyses across lemmas for identical surfaces', () => {
    const withClash = [...forms.n, rec('servus-n', 'puellae', [{ k: 'nom' as const, c: 'abl' as const, n: 'pl' as const }])]
    const pool = buildPool(entries, { n: withClash }, config())
    const merged = pool.index.get('puellae')!
    expect(merged.lemmas).toContain('puella-n')
    expect(merged.lemmas).toContain('servus-n')
    expect(merged.analyses.some((a) => a.c === 'abl')).toBe(true)
  })

  test('verb pool: passives and subjunctives can be excluded', () => {
    const pool = buildPool(entries, { v: [...forms.v] }, config({
      mode: 'verb',
      includePassives: false,
      includeSubjunctives: false,
      includeInfinitives: false,
    }))
    expect(pool.index.has('amātur')).toBe(false)
    expect(pool.index.has('amet')).toBe(false)
    expect(pool.index.has('amat')).toBe(true)
    // amāre's infinitive analysis is filtered but its imperative analysis survives
    expect(pool.index.get('amāre')!.analyses.every((a) => a.k !== 'inf')).toBe(true)
  })

  test('vocative analyses excluded unless enabled', () => {
    const pool = buildPool(entries, { n: [...forms.n] }, config())
    expect(pool.index.get('puella')!.analyses.some((a) => a.c === 'voc')).toBe(false)
    const withVoc = buildPool(entries, { n: [...forms.n] }, config({ includeVocative: true }))
    expect(withVoc.index.get('puella')!.analyses.some((a) => a.c === 'voc')).toBe(true)
  })
})

describe('generateQuestion', () => {
  test('is deterministic for a given seed', () => {
    const pool = buildPool(entries, { n: [...forms.n] }, config())
    const q1 = generateQuestion(pool, config(), 42)
    const q2 = generateQuestion(pool, config(), 42)
    expect(q1).toEqual(q2)
  })

  test('always ≥ 2 correct chips and no accidental corrects', () => {
    const pool = buildPool(entries, { n: [...forms.n] }, config())
    for (let seed = 0; seed < 50; seed++) {
      const q = generateQuestion(pool, config({ chipCount: 4 }), seed)!
      const target = targetById.get('acc.pl')!
      const correct = q.chips.filter((c) => c.correct)
      expect(correct.length).toBeGreaterThanOrEqual(2)
      for (const chip of q.chips) {
        const matches = chip.analyses.some((a) =>
          Object.entries(target.match).every(([k, v]) => a[k as keyof typeof a] === v),
        )
        expect(matches).toBe(chip.correct)
      }
      expect(new Set(q.chips.map((c) => c.s)).size).toBe(q.chips.length)
    }
  })

  test('correct count stays within [2, 8] even with a large matching pool', () => {
    const pool = bigPool(20)
    for (let seed = 0; seed < 50; seed++) {
      const q = generateQuestion(pool, config({ chipCount: 12 }), seed)!
      expect(q.correctCount).toBeGreaterThanOrEqual(2)
      expect(q.correctCount).toBeLessThanOrEqual(8)
      // at least one distractor is always present
      expect(q.chips.some((c) => !c.correct)).toBe(true)
    }
  })

  test('returns null when the pool cannot supply 2 correct answers', () => {
    const pool = buildPool(entries, { n: [...forms.n] }, config({ chapterCap: 1 }))
    // only puella-n in pool: acc pl has exactly one match (puellās) → unsatisfiable
    expect(generateQuestion(pool, config({ chapterCap: 1 }), 1)).toBeNull()
  })

  test('verb tense targets work', () => {
    const pool = buildPool(entries, { v: [...forms.v] }, config({ mode: 'verb' }))
    const q = generateQuestion(pool, config({ mode: 'verb', targets: ['t.impf'], chipCount: 4 }), 7)!
    expect(q.target.id).toBe('t.impf')
    const impf = q.chips.filter((c) => c.correct).map((c) => c.s).sort()
    expect(impf).toEqual(['amābant', 'amābat'])
  })
})

describe('gradeSelection', () => {
  test('scores hits, misses, and false alarms', () => {
    const pool = buildPool(entries, { n: [...forms.n] }, config())
    const q = generateQuestion(pool, config({ chipCount: 4 }), 3)!
    const correct = q.chips.filter((c) => c.correct).map((c) => c.s)
    const perfect = gradeSelection(q, new Set(correct))
    expect(perfect.perfect).toBe(true)
    expect(perfect.hits).toBe(correct.length)
    expect(perfect.falseAlarms).toBe(0)

    const oneWrong = gradeSelection(q, new Set([q.chips.find((c) => !c.correct)!.s]))
    expect(oneWrong.perfect).toBe(false)
    expect(oneWrong.falseAlarms).toBe(1)
    expect(oneWrong.hits).toBe(0)
  })
})
