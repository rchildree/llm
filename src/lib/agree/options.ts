/**
 * What the Agreement page may draw on: which noun declensions, which kinds of
 * modifier, and which case/number slots the questions ask about.
 *
 * The shape mirrors the drill options so the two panels behave the same way,
 * including the convention that an empty list means "no restriction" rather
 * than "nothing".
 */
import type { VocabEntry } from '../dataset/types'
import { ALL_ADJ_CLASSES, ALL_CASES_NO_VOC, ALL_DECLENSIONS, ALL_NUMBERS } from '../drill/config'
import { allSlots, type Slot } from './paradigm'

/** the two things that can modify a noun in this section */
export type ModifierKind = 'adj' | 'pron'
export const ALL_MODIFIER_KINDS: ModifierKind[] = ['adj', 'pron']

export interface AgreementOptions {
  /** noun declensions to include (empty = all): '1'..'5', 'irreg' */
  declensions: string[]
  /** adjective classes to include (empty = all): '1-2', '3', 'irreg' */
  adjClasses: string[]
  /** whether adjectives, pronouns or both may be the modifier */
  modifierKinds: string[]
  /** cases the questions may ask about (empty = all) */
  cases: string[]
  /** numbers the questions may ask about (empty = all) */
  numbers: string[]
}

export const DEFAULT_AGREE_OPTIONS: AgreementOptions = {
  declensions: ALL_DECLENSIONS,
  adjClasses: ALL_ADJ_CLASSES,
  modifierKinds: ALL_MODIFIER_KINDS,
  cases: ALL_CASES_NO_VOC,
  numbers: ALL_NUMBERS,
}

/** empty means "no restriction", as in the drills */
const permits = (chosen: string[], value: string): boolean =>
  chosen.length === 0 || chosen.includes(value)

export function allowsNoun(entry: VocabEntry, options: AgreementOptions): boolean {
  return permits(options.declensions, entry.cls ?? '')
}

export function allowsModifier(entry: VocabEntry, options: AgreementOptions): boolean {
  if (entry.pos === 'adj')
    return permits(options.modifierKinds, 'adj') && permits(options.adjClasses, entry.cls ?? '')
  if (entry.pos === 'pron') return permits(options.modifierKinds, 'pron')
  return false
}

/** The case/number slots a question may be built on. */
export function slotsFor(options: AgreementOptions): Slot[] {
  return allSlots().filter((s) => permits(options.cases, s.c) && permits(options.numbers, s.n))
}
