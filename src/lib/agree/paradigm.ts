/**
 * Runtime paradigms for the Agreement section: every case/number form of one
 * word, in one gender.
 *
 * Nouns and adjectives are generated from the morphology engine, which hands
 * back a stem/ending split the typing exercises need. Pronouns come from the
 * dataset's pre-generated forms instead: their paradigms are suppletive
 * (eius vs is, cuius vs quī), there is no teachable stem to split off, and the
 * dataset already carries the hand-corrected tables and per-entry overrides.
 */
import type { Analysis, FormRecord, VocabEntry } from '../dataset/types'
import { buildAdjectiveEntry, buildNounEntry, mixedIStemAblSg } from '../morph/entries'
import { adjectiveEnding, nounEnding } from '../morph/morphology'
import type { Gender, LatinCase, LatinNumber } from '../morph/types'

export type { Gender }

/** The cases drilled for agreement — vocative is left out, as in the drills. */
export const AGREE_CASES: LatinCase[] = ['nom', 'gen', 'dat', 'acc', 'abl']
export const AGREE_NUMBERS: LatinNumber[] = ['sg', 'pl']

export interface Slot {
  c: LatinCase
  n: LatinNumber
}

export interface Form {
  /** full surface, e.g. "magnīs" */
  whole: string
  /** "magn" — empty when not splittable */
  stem: string
  /** "īs" — empty when not splittable */
  ending: string
  /** false for every pronoun: no stem/ending division to type */
  splittable: boolean
  /** equally correct variants, e.g. "iīs" beside "eīs" */
  alternates: string[]
}

/** key: `${case}.${number}`, e.g. "abl.sg" */
export type Paradigm = Map<string, Form>

export const slotKey = (c: LatinCase, n: LatinNumber): string => `${c}.${n}`

export function allSlots(): Slot[] {
  return AGREE_NUMBERS.flatMap((n) => AGREE_CASES.map((c) => ({ c, n })))
}

/** Pronoun forms keyed by lemma id, built once from the dataset's form chunk. */
export type PronounForms = Map<string, FormRecord[]>

export function indexPronounForms(records: FormRecord[]): PronounForms {
  const byLemma: PronounForms = new Map()
  for (const record of records) {
    const list = byLemma.get(record.l)
    if (list) list.push(record)
    else byLemma.set(record.l, [record])
  }
  return byLemma
}

export function nounParadigm(entry: VocabEntry): Paradigm | null {
  const morphEntry = buildNounEntry(entry)
  if (!morphEntry) return null
  const mixedAblSg = mixedIStemAblSg(morphEntry)

  const paradigm: Paradigm = new Map()
  for (const { c, n } of allSlots()) {
    const { stem, ending } = nounEnding(morphEntry, c, n)
    // mixed i-stems (the classroom default) take abl.sg. -e, matching the dataset
    if (mixedAblSg && c === 'abl' && n === 'sg') {
      paradigm.set(slotKey(c, n), {
        whole: mixedAblSg,
        stem: morphEntry.stem,
        ending: 'e',
        splittable: true,
        alternates: [],
      })
      continue
    }
    paradigm.set(slotKey(c, n), { whole: stem + ending, stem, ending, splittable: true, alternates: [] })
  }
  return paradigm
}

function adjectiveParadigm(entry: VocabEntry, gender: Gender): Paradigm | null {
  const morphEntry = buildAdjectiveEntry(entry)
  if (!morphEntry) return null

  const paradigm: Paradigm = new Map()
  for (const { c, n } of allSlots()) {
    const { stem, ending } = adjectiveEnding(morphEntry, 'positive', gender, c, n)
    paradigm.set(slotKey(c, n), { whole: stem + ending, stem, ending, splittable: true, alternates: [] })
  }
  return paradigm
}

function pronounParadigm(records: FormRecord[] | undefined, gender: Gender): Paradigm | null {
  if (!records?.length) return null

  // collect every surface each slot accepts, in the dataset's order
  const bySlot = new Map<string, string[]>()
  for (const record of records) {
    for (const a of record.a) {
      if (!a.c || !a.n || a.g !== gender) continue
      if (!AGREE_CASES.includes(a.c as LatinCase)) continue
      const key = slotKey(a.c as LatinCase, a.n as LatinNumber)
      const list = bySlot.get(key)
      if (list) {
        if (!list.includes(record.s)) list.push(record.s)
      } else {
        bySlot.set(key, [record.s])
      }
    }
  }
  if (bySlot.size === 0) return null

  const paradigm: Paradigm = new Map()
  for (const [key, surfaces] of bySlot) {
    paradigm.set(key, {
      whole: surfaces[0],
      stem: '',
      ending: '',
      splittable: false,
      alternates: surfaces.slice(1),
    })
  }
  return paradigm
}

/**
 * The paradigm of a modifier (adjective or pronoun) in the gender it must
 * agree in. `pronounForms` is only consulted for pronoun entries.
 */
export function modifierParadigm(
  entry: VocabEntry,
  gender: Gender,
  pronounForms?: PronounForms,
): Paradigm | null {
  if (entry.pos === 'adj') return adjectiveParadigm(entry, gender)
  if (entry.pos === 'pron') return pronounParadigm(pronounForms?.get(entry.id), gender)
  return null
}

/** Analyses are shaped for the dataset; re-export the narrow bit we rely on. */
export type { Analysis }
