/** Help-mode support: resolve a chip's lemma ids to their dictionary entries. */
import type { VocabEntry } from '../dataset/types'
import type { Chip } from './types'

/**
 * The dictionary entries behind a chip's surface — one per lemma it belongs to.
 * A syncretic surface shared across lemmas yields several; unknown ids are skipped.
 */
export function entriesForChip(chip: Chip, entriesById: Map<string, VocabEntry>): VocabEntry[] {
  return chip.lemmas
    .map((id) => entriesById.get(id))
    .filter((e): e is VocabEntry => e !== undefined)
}
