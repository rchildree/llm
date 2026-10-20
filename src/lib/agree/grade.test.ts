import { describe, expect, test } from 'vitest'
import { acceptedAnswers, gradeField, normalizeTyped, quantityCandidates } from './grade'
import type { Form } from './paradigm'

const splittable = (stem: string, ending: string): Form => ({
  whole: stem + ending, stem, ending, splittable: true, alternates: [],
})
const whole = (w: string, alternates: string[] = []): Form => ({
  whole: w, stem: '', ending: '', splittable: false, alternates,
})

describe('normalizeTyped', () => {
  test('trims and drops a leading hyphen', () => {
    expect(normalizeTyped('  -īs ')).toBe('īs')
    expect(normalizeTyped('—am')).toBe('am')
    expect(normalizeTyped('ae')).toBe('ae')
  })
})

describe('acceptedAnswers', () => {
  test('an ending for a splittable form', () => {
    expect(acceptedAnswers(splittable('magn', 'īs'))).toEqual(['īs'])
  })

  test('the whole word, plus alternates, for a pronoun', () => {
    expect(acceptedAnswers(whole('eīs', ['iīs']))).toEqual(['eīs', 'iīs'])
  })
})

describe('gradeField', () => {
  test('exact match is right', () => {
    expect(gradeField('īs', ['īs'])).toBe('right')
    expect(gradeField(' -īs ', ['īs'])).toBe('right')
  })

  test('any accepted alternate is right', () => {
    expect(gradeField('iīs', ['eīs', 'iīs'])).toBe('right')
  })

  test('right apart from quantity is flagged, not failed', () => {
    expect(gradeField('is', ['īs'])).toBe('quantity')
    expect(gradeField('īs', ['is'])).toBe('quantity')
    expect(gradeField('orum', ['ōrum'])).toBe('quantity')
  })

  test('a different ending is wrong', () => {
    expect(gradeField('am', ['īs'])).toBe('wrong')
    expect(gradeField('', ['īs'])).toBe('wrong')
  })

  test('empty input is never a quantity near-miss', () => {
    expect(gradeField('', [''])).toBe('right')
    expect(gradeField('  ', ['ae'])).toBe('wrong')
  })
})

describe('quantityCandidates', () => {
  test('offers what was typed beside the correct spelling', () => {
    expect(quantityCandidates('is', ['īs']).sort()).toEqual(['is', 'īs'])
  })

  test('offers every accepted spelling of the same letters', () => {
    expect(quantityCandidates('eis', ['eīs', 'iīs']).sort()).toEqual(['eis', 'eīs'])
  })

  test('collapses to one when the typed form is already accepted', () => {
    expect(quantityCandidates('īs', ['īs'])).toEqual(['īs'])
  })
})
