/** Target-category definitions, following latin-quiz-tool's option surface. */
import type { Target } from './types'

const CASES = [
  ['nom', 'nominative'],
  ['gen', 'genitive'],
  ['dat', 'dative'],
  ['acc', 'accusative'],
  ['abl', 'ablative'],
  ['voc', 'vocative'],
] as const

const NUMBERS = [
  ['sg', 'singular'],
  ['pl', 'plural'],
] as const

const TENSES = [
  ['pres', 'present'],
  ['impf', 'imperfect'],
  ['fut', 'future'],
  ['pf', 'perfect'],
  ['plupf', 'pluperfect'],
  ['futpf', 'future perfect'],
] as const

const PERSONS = [
  ['1', '1st'],
  ['2', '2nd'],
  ['3', '3rd'],
] as const

/** case × number, e.g. "accusative plural" (the classic which-are target) */
export const CASE_NUMBER_TARGETS: Target[] = CASES.flatMap(([c, cl]) =>
  NUMBERS.map(([n, nl]) => ({
    id: `${c}.${n}`,
    label: `${cl} ${nl}`,
    match: { c, n },
  })),
)

export const CASE_TARGETS: Target[] = CASES.map(([c, cl]) => ({
  id: c,
  label: cl,
  match: { c },
}))

export const TENSE_TARGETS: Target[] = TENSES.map(([t, tl]) => ({
  id: `t.${t}`,
  label: `${tl} tense`,
  match: { k: 'fin', t },
}))

export const PERSON_NUMBER_TARGETS: Target[] = PERSONS.flatMap(([p, pl]) =>
  NUMBERS.map(([n, nl]) => ({
    id: `pn.${p}${n}`,
    label: `${pl} ${nl}`,
    match: { k: 'fin', p, n },
  })),
)

/** person number ⊗ tense, e.g. "3rd singular imperfect" (canonical order) */
export const TENSE_PERSON_TARGETS: Target[] = TENSES.flatMap(([t, tl]) =>
  PERSONS.flatMap(([p, pl]) =>
    NUMBERS.map(([n, nl]) => ({
      id: `tpn.${t}.${p}${n}`,
      label: `${pl} ${nl} ${tl}`,
      match: { k: 'fin' as const, t, p, n },
    })),
  ),
)

export const MOOD_TARGETS: Target[] = [
  { id: 'm.subj', label: 'subjunctive', match: { k: 'fin', m: 'subj' } },
  { id: 'm.ind', label: 'indicative', match: { k: 'fin', m: 'ind' } },
]

export const VOICE_TARGETS: Target[] = [
  { id: 'v.pass', label: 'passive', match: { k: 'fin', v: 'pass' } },
  { id: 'v.act', label: 'active', match: { k: 'fin', v: 'act' } },
]

export const INFINITIVE_TARGET: Target = { id: 'inf', label: 'infinitive', match: { k: 'inf' } }

export const PARTICIPLE_TARGETS: Target[] = [
  { id: 'ptc.pres.act', label: 'present active participle', match: { k: 'ptc', t: 'pres', v: 'act' } },
  { id: 'ptc.pf.pass', label: 'perfect passive participle', match: { k: 'ptc', t: 'pf', v: 'pass' } },
  { id: 'ptc.fut.act', label: 'future active participle', match: { k: 'ptc', t: 'fut', v: 'act' } },
  { id: 'ptc.fut.pass', label: 'future passive participle (gerundive)', match: { k: 'ptc', t: 'fut', v: 'pass' } },
]

export const ALL_TARGETS: Target[] = [
  ...CASE_NUMBER_TARGETS,
  ...CASE_TARGETS,
  ...TENSE_TARGETS,
  ...PERSON_NUMBER_TARGETS,
  ...TENSE_PERSON_TARGETS,
  ...MOOD_TARGETS,
  ...VOICE_TARGETS,
  INFINITIVE_TARGET,
  ...PARTICIPLE_TARGETS,
]

export const targetById = new Map(ALL_TARGETS.map((t) => [t.id, t]))
