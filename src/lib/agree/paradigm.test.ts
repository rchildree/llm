import { describe, expect, test } from 'vitest'
import { indexPronounForms, modifierParadigm, nounParadigm, slotKey } from './paradigm'
import type { FormRecord, VocabEntry } from '../dataset/types'

const noun = (over: Partial<VocabEntry> & Pick<VocabEntry, 'id' | 'lemma' | 'pp'>): VocabEntry => ({
  chapter: 1,
  pos: 'n',
  dict: over.lemma,
  definition: '',
  flags: [],
  ...over,
} as VocabEntry)

const adj = (over: Partial<VocabEntry> & Pick<VocabEntry, 'id' | 'lemma' | 'pp'>): VocabEntry => ({
  chapter: 1,
  pos: 'adj',
  dict: over.lemma,
  definition: '',
  flags: [],
  ...over,
} as VocabEntry)

const at = (p: ReturnType<typeof nounParadigm>, c: string, n: string) => {
  const form = p!.get(`${c}.${n}`)!
  return `${form.stem}|${form.ending}`
}

describe('nounParadigm', () => {
  test('1st declension', () => {
    const puella = noun({ id: 'puella-n', lemma: 'puella', pp: ['puella', 'puellae', null, null], gender: 'f' })
    const p = nounParadigm(puella)
    expect(at(p, 'nom', 'sg')).toBe('puella|')
    expect(at(p, 'gen', 'sg')).toBe('puell|ae')
    expect(at(p, 'acc', 'sg')).toBe('puell|am')
    expect(at(p, 'abl', 'pl')).toBe('puell|īs')
  })

  test('3rd declension consonant stem', () => {
    const miles = noun({ id: 'miles-n', lemma: 'mīles', pp: ['mīles', 'mīlitis', null, null], gender: 'm' })
    const p = nounParadigm(miles)
    expect(at(p, 'gen', 'sg')).toBe('mīlit|is')
    expect(at(p, 'abl', 'sg')).toBe('mīlit|e')
    expect(at(p, 'nom', 'pl')).toBe('mīlit|ēs')
    expect(at(p, 'gen', 'pl')).toBe('mīlit|um')
  })

  test('mixed i-stem takes abl.sg. -e, not -ī', () => {
    const pars = noun({
      id: 'pars-n', lemma: 'pars', pp: ['pars', 'partis', null, null], gender: 'f', flags: ['i-stem'],
    })
    const p = nounParadigm(pars)
    expect(p!.get(slotKey('abl', 'sg'))!.whole).toBe('parte')
    // the i-stem genitive plural is still -ium
    expect(at(p, 'gen', 'pl')).toBe('part|ium')
  })

  test('4th and 5th declension', () => {
    const manus = noun({ id: 'manus-n', lemma: 'manus', pp: ['manus', 'manūs', null, null], gender: 'f' })
    expect(at(nounParadigm(manus), 'gen', 'sg')).toBe('man|ūs')
    expect(at(nounParadigm(manus), 'dat', 'pl')).toBe('man|ibus')

    const res = noun({ id: 'res-n', lemma: 'rēs', pp: ['rēs', 'reī', null, null], gender: 'f' })
    expect(at(nounParadigm(res), 'acc', 'sg')).toBe('r|em')
  })

  test('returns null without a genitive or gender', () => {
    expect(nounParadigm(noun({ id: 'x', lemma: 'x', pp: ['x', null, null, null], gender: 'f' }))).toBeNull()
    expect(nounParadigm(noun({ id: 'x', lemma: 'x', pp: ['x', 'xis', null, null] }))).toBeNull()
  })
})

describe('modifierParadigm — adjectives', () => {
  const magnus = adj({ id: 'magnus-adj', lemma: 'magnus', pp: ['magnus', 'magna', 'magnum', null] })

  test('1-2 adjective inflects by gender', () => {
    expect(at(modifierParadigm(magnus, 'f'), 'abl', 'pl')).toBe('magn|īs')
    expect(at(modifierParadigm(magnus, 'f'), 'gen', 'sg')).toBe('magn|ae')
    expect(at(modifierParadigm(magnus, 'm'), 'gen', 'sg')).toBe('magn|ī')
    expect(at(modifierParadigm(magnus, 'n'), 'nom', 'pl')).toBe('magn|a')
    expect(modifierParadigm(magnus, 'm')!.get('nom.sg')!.whole).toBe('magnus')
  })

  test('3rd declension adjective', () => {
    const omnis = adj({ id: 'omnis-adj', lemma: 'omnis', pp: ['omnis', 'omnis', 'omne', null] })
    expect(at(modifierParadigm(omnis, 'n'), 'nom', 'pl')).toBe('omn|ia')
    expect(at(modifierParadigm(omnis, 'm'), 'abl', 'sg')).toBe('omn|ī')
    expect(at(modifierParadigm(omnis, 'f'), 'gen', 'pl')).toBe('omn|ium')
  })

  test('one-termination adjective builds from the genitive', () => {
    const absens = adj({
      id: 'absens-adj', lemma: 'absēns', pp: ['absēns', 'absēns', 'absēns', null],
      genSg: 'absentis', flags: ['1term'],
    })
    expect(at(modifierParadigm(absens, 'm'), 'gen', 'sg')).toBe('absent|is')
  })

  test('pronominal adjective takes -īus / -ī in the singular', () => {
    const solus = adj({
      id: 'solus-adj', lemma: 'sōlus', pp: ['sōlus', 'sōla', 'sōlum', null], flags: ['pronominal'],
    })
    expect(at(modifierParadigm(solus, 'f'), 'gen', 'sg')).toBe('sōl|īus')
    expect(at(modifierParadigm(solus, 'f'), 'dat', 'sg')).toBe('sōl|ī')
  })

  test('every adjective form is splittable', () => {
    for (const form of modifierParadigm(magnus, 'f')!.values()) {
      expect(form.splittable).toBe(true)
      expect(form.stem + form.ending).toBe(form.whole)
    }
  })
})

describe('modifierParadigm — pronouns', () => {
  const rec = (s: string, a: FormRecord['a']): FormRecord => ({ s, l: 'hic-pron', a })
  const forms = indexPronounForms([
    rec('haec', [
      { k: 'nom', c: 'nom', n: 'sg', g: 'f' },
      { k: 'nom', c: 'nom', n: 'pl', g: 'n' },
    ]),
    rec('huius', [{ k: 'nom', c: 'gen', n: 'sg', g: 'f' }]),
    rec('hae', [{ k: 'nom', c: 'nom', n: 'pl', g: 'f' }]),
  ])
  const hic = { id: 'hic-pron', pos: 'pron', lemma: 'hic', chapter: 10 } as VocabEntry

  test('reads whole forms from the dataset, not a stem split', () => {
    const p = modifierParadigm(hic, 'f', forms)!
    expect(p.get('nom.sg')!.whole).toBe('haec')
    expect(p.get('gen.sg')!.whole).toBe('huius')
    expect(p.get('nom.sg')!.splittable).toBe(false)
    expect(p.get('nom.sg')!.stem).toBe('')
  })

  test('filters by the requested gender', () => {
    const neuter = modifierParadigm(hic, 'n', forms)!
    expect(neuter.get('nom.pl')!.whole).toBe('haec')
    expect(neuter.has('gen.sg')).toBe(false)
  })

  test('null without form data', () => {
    expect(modifierParadigm(hic, 'f', indexPronounForms([]))).toBeNull()
    expect(modifierParadigm(hic, 'f')).toBeNull()
  })

  test('alternates are kept', () => {
    const is = { id: 'is-pron', pos: 'pron', lemma: 'is', chapter: 7 } as VocabEntry
    const p = modifierParadigm(is, 'm', indexPronounForms([
      { s: 'eīs', l: 'is-pron', a: [{ k: 'nom', c: 'abl', n: 'pl', g: 'm' }] },
      { s: 'iīs', l: 'is-pron', a: [{ k: 'nom', c: 'abl', n: 'pl', g: 'm' }] },
    ]))!
    expect(p.get('abl.pl')!.whole).toBe('eīs')
    expect(p.get('abl.pl')!.alternates).toEqual(['iīs'])
  })
})
