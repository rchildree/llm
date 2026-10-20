import { describe, expect, test } from 'vitest'
import { acceptedFor, cellKey, chartCells, gradeChart } from './chart'
import { buildAgreementPool, fillTheChart } from './pairing'
import { indexPronounForms, nounParadigm, modifierParadigm, slotKey } from './paradigm'
import type { Paradigm } from './paradigm'
import type { FillTheChartQuestion } from './pairing'
import type { FormRecord, VocabEntry } from '../dataset/types'

// the real published dataset, so the chart is exercised against real paradigms
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

const find = (lemma: string): VocabEntry => {
  const entry = entries.find((e) => e.lemma === lemma)
  if (!entry) throw new Error(`no entry ${lemma}`)
  return entry
}

/** A question put together by hand, so the expected answers are known. */
function question(
  modifierLemma: string,
  nounLemma: string,
  given = { c: 'gen' as const, n: 'sg' as const },
): FillTheChartQuestion {
  const modifier = find(modifierLemma)
  const noun = find(nounLemma)
  const gender = noun.gender === 'mf' ? 'm' : noun.gender!
  const modifierParadigmBuilt = modifierParadigm(modifier, gender, pronounForms) as Paradigm
  const nounParadigmBuilt = nounParadigm(noun) as Paradigm
  return {
    kind: 'fill-the-chart',
    pair: {
      modifier,
      noun,
      gender,
      modifierParadigm: modifierParadigmBuilt,
      nounParadigm: nounParadigmBuilt,
    },
    given,
  }
}

const full = buildAgreementPool(entries, { cap: 45, only: false }, pronounForms)

describe('which cells the student fills in', () => {
  const cells = chartCells(question('magnus', 'puella'))

  test('twenty cells, modifier before noun, in chart order', () => {
    expect(cells).toHaveLength(20)
    expect(cells.slice(0, 4).map((c) => c.key)).toEqual([
      'nom.sg:modifier',
      'nom.sg:noun',
      'gen.sg:modifier',
      'gen.sg:noun',
    ])
    expect(cells.at(-1)!.key).toBe('abl.pl:noun')
  })

  test('the worked-example row is given, not asked', () => {
    const given = cells.filter((c) => slotKey(c.slot.c, c.slot.n) === 'gen.sg')
    expect(given).toHaveLength(2)
    expect(given.every((c) => !c.typed)).toBe(true)
  })

  test('the nominative singular row is given on both sides', () => {
    // the engine hands back the citation form whole, with no ending to type,
    // for a noun and for an adjective alike — so that row is never asked
    expect(cells.find((c) => c.key === 'nom.sg:noun')!.typed).toBe(false)
    expect(cells.find((c) => c.key === 'nom.sg:modifier')!.typed).toBe(false)
  })

  test('sixteen boxes once the nominative and the worked example are given', () => {
    expect(cells.filter((c) => c.typed)).toHaveLength(16)
  })

  test("a 3rd-decl. neuter's nom. and acc. sg. are both given", () => {
    const neuter = chartCells(question('omnis', 'corpus'))
    const asked = (key: string) => neuter.find((c) => c.key === key)!.typed
    expect(asked('nom.sg:noun')).toBe(false)
    expect(asked('acc.sg:noun')).toBe(false)
    // the adjective still takes an ending in those slots (omne)
    expect(asked('acc.sg:modifier')).toBe(true)
  })

  test('a cell accepts the ending, not the whole form', () => {
    const cell = chartCells(question('magnus', 'puella')).find((c) => c.key === 'abl.pl:noun')!
    expect(acceptedFor(cell)).toEqual(['īs'])
    expect(cell.form?.stem).toBe('puell')
  })

  test('cellKey pairs a slot with a side', () => {
    expect(cellKey({ c: 'acc', n: 'pl' }, 'noun')).toBe('acc.pl:noun')
  })
})

describe('grading the chart', () => {
  const q = question('magnus', 'puella')
  const cells = chartCells(q)

  /** Fill every box from the paradigms, so the chart is perfect. */
  const perfect = (): Record<string, string> => {
    const values: Record<string, string> = {}
    for (const cell of cells) {
      if (cell.typed && cell.form) values[cell.key] = cell.form.ending
    }
    return values
  }

  test('a full right chart is correct and has no near-misses', () => {
    const grade = gradeChart(cells, perfect())
    expect(grade.results.size).toBe(16)
    expect([...grade.results.values()].every((r) => r === 'right')).toBe(true)
    expect(grade.near).toEqual([])
    expect(grade.correct).toBe(true)
  })

  test('only typed cells are graded', () => {
    const grade = gradeChart(cells, perfect())
    expect(grade.results.has('gen.sg:noun')).toBe(false)
    expect(grade.results.has('nom.sg:noun')).toBe(false)
  })

  test('an empty chart is wrong everywhere, not a near-miss', () => {
    const grade = gradeChart(cells, {})
    expect([...grade.results.values()].every((r) => r === 'wrong')).toBe(true)
    expect(grade.near).toEqual([])
    expect(grade.correct).toBe(false)
  })

  test('a leading hyphen is accepted, as in the other typed exercises', () => {
    const grade = gradeChart(cells, { ...perfect(), 'abl.pl:noun': '-īs' })
    expect(grade.results.get('abl.pl:noun')).toBe('right')
    expect(grade.correct).toBe(true)
  })

  test('a missing macron is a near-miss, and holds the reveal back', () => {
    const grade = gradeChart(cells, { ...perfect(), 'abl.pl:noun': 'is', 'dat.pl:modifier': 'is' })
    expect(grade.results.get('abl.pl:noun')).toBe('quantity')
    expect(grade.results.get('dat.pl:modifier')).toBe('quantity')
    expect(grade.near).toEqual(['dat.pl:modifier', 'abl.pl:noun'])
    expect(grade.correct).toBe(false)
  })

  test('near-misses come back in chart order, whatever order they were typed', () => {
    const grade = gradeChart(cells, {
      ...perfect(),
      'abl.pl:noun': 'is',
      'acc.sg:noun': 'am',
      'gen.pl:modifier': 'arum',
    })
    expect(grade.near).toEqual(['gen.pl:modifier', 'abl.pl:noun'])
  })

  test('one wrong cell makes the whole chart wrong', () => {
    const grade = gradeChart(cells, { ...perfect(), 'acc.pl:noun': 'ōs' })
    expect(grade.results.get('acc.pl:noun')).toBe('wrong')
    expect(grade.correct).toBe(false)
  })

  test('the grade travels with the cells, so a new question starts clean', () => {
    const other = chartCells(question('magnus', 'servus'))
    const grade = gradeChart(other, perfect())
    // puella's endings are not servus's
    expect(grade.correct).toBe(false)
  })
})

describe('dealing a chart question', () => {
  test('the modifier is always an adjective', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const q = fillTheChart(full, pronounForms, rng(seed))
      expect(q).not.toBeNull()
      expect(q!.pair.modifier.pos).toBe('adj')
    }
  })

  test('the worked-example row really shows an ending on both sides', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const q = fillTheChart(full, pronounForms, rng(seed))!
      const key = slotKey(q.given.c, q.given.n)
      for (const paradigm of [q.pair.modifierParadigm, q.pair.nounParadigm]) {
        const form = paradigm.get(key)
        expect(form?.whole).toBeTruthy()
        expect(form!.splittable ? form!.ending.length : form!.whole.length).toBeGreaterThan(0)
      }
    }
  })

  test('every chart has boxes to fill, and none of them is a gap', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const cells = chartCells(fillTheChart(full, pronounForms, rng(seed))!)
      const typed = cells.filter((c) => c.typed)
      // 16 is the usual count; a 3rd-decl. neuter noun gives two more rows away
      expect(typed.length).toBeGreaterThanOrEqual(14)
      expect(typed.every((c) => acceptedFor(c).every((a) => a.length > 0))).toBe(true)
    }
  })

  test('a chapter with no adjective yet deals nothing', () => {
    const early = buildAgreementPool(entries, { cap: 4, only: false }, pronounForms)
    expect(early.modifiers.some((e) => e.pos === 'adj')).toBe(false)
    expect(fillTheChart(early, pronounForms, rng(7))).toBeNull()
  })

  test('the first chapter with adjectives can deal one', () => {
    const five = buildAgreementPool(entries, { cap: 5, only: false }, pronounForms)
    expect(fillTheChart(five, pronounForms, rng(7))).not.toBeNull()
  })
})
