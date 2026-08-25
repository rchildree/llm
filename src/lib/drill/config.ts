/** Drill option state ↔ target-id derivation, mirroring the which-are / latin-quiz-tool surface. */
import type { DrillConfig, DrillMode } from './types'

export interface DrillOptions {
  chapterCap: number
  chapterOnly: boolean
  mode: DrillMode
  declensions: string[]
  adjClasses: string[]
  conjugations: string[]
  includePassives: boolean
  includeSubjunctives: boolean
  includeInfinitives: boolean
  includeVocative: boolean
  includeDeponents: boolean
  /** noun/adj/pron target dimensions */
  cases: string[]
  numbers: string[]
  /** verb target dimensions */
  tenses: string[]
  personNumbers: string[]
  combineTensePerson: boolean
  participleTypes: string[]
  chipCount: number
}

export const ALL_DECLENSIONS = ['1', '2', '3', '4', '5', 'irreg']
export const ALL_ADJ_CLASSES = ['1-2', '3', 'irreg']
export const ALL_CONJUGATIONS = ['1', '2', '3', '3io', '4', 'irreg']
/** vocative stays off unless explicitly chosen — even via "All" */
export const ALL_CASES_NO_VOC = ['nom', 'gen', 'dat', 'acc', 'abl']
export const ALL_NUMBERS = ['sg', 'pl']
export const ALL_TENSES = ['pres', 'impf', 'fut', 'pf', 'plupf', 'futpf']
export const ALL_PERSON_NUMBERS = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl']
export const ALL_PTC_TYPES = ['ptc.pres.act', 'ptc.pf.pass', 'ptc.fut.act', 'ptc.fut.pass']

export const DEFAULT_OPTIONS: DrillOptions = {
  chapterCap: 35,
  chapterOnly: false,
  mode: 'noun-adj',
  declensions: ALL_DECLENSIONS,
  adjClasses: ALL_ADJ_CLASSES,
  conjugations: ALL_CONJUGATIONS,
  includePassives: true,
  includeSubjunctives: true,
  includeInfinitives: true,
  includeVocative: false,
  includeDeponents: true,
  cases: ALL_CASES_NO_VOC,
  numbers: ALL_NUMBERS,
  tenses: ALL_TENSES,
  personNumbers: ALL_PERSON_NUMBERS,
  combineTensePerson: true,
  participleTypes: ALL_PTC_TYPES,
  // not exposed in the options panel; change the default here
  chipCount: 10,
}

export function targetsFor(o: DrillOptions): string[] {
  if (o.mode === 'ptc') return o.participleTypes
  if (o.mode === 'verb') {
    const ids: string[] = []
    ids.push(...o.tenses.map((t) => `t.${t}`))
    ids.push(...o.personNumbers.map((pn) => `pn.${pn}`))
    if (o.combineTensePerson) {
      for (const t of o.tenses) for (const pn of o.personNumbers) ids.push(`tpn.${t}.${pn}`)
    }
    if (o.includeInfinitives) ids.push('inf')
    return ids
  }
  // nominal modes: case × number products
  const ids: string[] = []
  for (const c of o.cases) for (const n of o.numbers) ids.push(`${c}.${n}`)
  return ids
}

export function toConfig(o: DrillOptions): DrillConfig {
  return {
    chapterCap: o.chapterCap,
    chapterOnly: o.chapterOnly,
    mode: o.mode,
    declensions: o.declensions,
    adjClasses: o.adjClasses,
    conjugations: o.conjugations,
    includePassives: o.includePassives,
    includeSubjunctives: o.includeSubjunctives,
    includeInfinitives: o.includeInfinitives,
    includeVocative: o.includeVocative || o.cases.includes('voc'),
    includeDeponents: o.includeDeponents,
    targets: targetsFor(o),
    chipCount: o.chipCount,
  }
}
