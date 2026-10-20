/** Human labels for the words in play and the slot being asked for. */
import type { VocabEntry } from '../dataset/types'
import { CASE_LABELS, NUMBER_LABELS } from '../morph/labels'
import type { Gender, Slot } from './paradigm'

const ORDINAL: Record<string, string> = {
  '1': '1st',
  '2': '2nd',
  '3': '3rd',
  '4': '4th',
  '5': '5th',
}

export const GENDER_LABEL: Record<Gender, string> = { m: 'm.', f: 'f.', n: 'n.' }

export const GENDER_WORD: Record<Gender, string> = {
  m: 'masculine',
  f: 'feminine',
  n: 'neuter',
}

/** e.g. "3rd decl. m.", "1-2 adj.", "pronoun" */
export function describeWord(entry: VocabEntry, gender: Gender): string {
  if (entry.pos === 'pron') return 'pronoun'
  if (entry.pos === 'adj') {
    if (entry.flags.includes('pronominal')) return 'pronominal adj.'
    if (entry.cls === '1-2') return '1-2 adj.'
    if (entry.cls === '3') return '3rd decl. adj.'
    return 'irreg. adj.'
  }
  const decl = ORDINAL[entry.cls ?? ''] ?? 'irreg.'
  return `${decl} decl. ${GENDER_LABEL[gender]}`
}

/** e.g. "accusative plural" */
export function describeSlot(slot: Slot): string {
  const cases: Record<string, string> = {
    nom: 'nominative',
    gen: 'genitive',
    dat: 'dative',
    acc: 'accusative',
    abl: 'ablative',
  }
  return `${cases[slot.c] ?? slot.c} ${slot.n === 'sg' ? 'singular' : 'plural'}`
}

/** e.g. "acc.pl." */
export function shortSlot(slot: Slot): string {
  return `${CASE_LABELS[slot.c]}${NUMBER_LABELS[slot.n]}`
}
