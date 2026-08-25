import { describe, expect, test } from 'vitest'
import { describeAnalysis } from './describe'

describe('describeAnalysis', () => {
  test('nominal', () => {
    expect(describeAnalysis({ k: 'nom', c: 'gen', n: 'sg', g: 'f' })).toBe('gen. sg. f.')
    expect(describeAnalysis({ k: 'nom', c: 'acc', n: 'pl' })).toBe('acc. pl.')
    expect(describeAnalysis({ k: 'nom', c: 'nom', n: 'sg', g: 'm', d: 'comp' })).toBe('nom. sg. m. comparative')
  })

  test('finite verb: person number, tense, voice, mood', () => {
    expect(describeAnalysis({ k: 'fin', t: 'impf', m: 'ind', v: 'act', p: '3', n: 'sg' })).toBe(
      '3rd sg. impf. act. ind.',
    )
    expect(describeAnalysis({ k: 'fin', t: 'pres', m: 'subj', v: 'pass', p: '1', n: 'pl' })).toBe(
      '1st pl. pres. pass. subj.',
    )
  })

  test('infinitives, imperatives, participles', () => {
    expect(describeAnalysis({ k: 'inf', t: 'pres', v: 'act' })).toBe('pres. act. infinitive')
    expect(describeAnalysis({ k: 'imp', n: 'pl' })).toBe('imperative pl.')
    expect(describeAnalysis({ k: 'ptc', t: 'fut', v: 'pass' })).toBe('gerundive (fut. pass. participle)')
    expect(describeAnalysis({ k: 'ptc', t: 'pf', v: 'pass' })).toBe('pf. pass. participle')
  })

  test('declined participle: case, number, gender, tense, voice, participle', () => {
    expect(describeAnalysis({ k: 'ptc', c: 'acc', n: 'pl', g: 'm', t: 'pres', v: 'act' })).toBe(
      'acc. pl. m. pres. act. participle',
    )
  })
})
