import { shuffle, type Rng } from './shuffle'
import type { Word } from './types'

// re-exported so multiple-choice callers get the RNG type from one place
export type { Rng }

/**
 * Choose up to `count` wrong-answer words for a multiple-choice question.
 * Same-chapter words are preferred (more confusable); other chapters fill any
 * remaining slots. Never returns the correct word, and never duplicates.
 */
export function pickDistractors(
  correct: Word,
  pool: Word[],
  count: number,
  rng: Rng = Math.random,
): Word[] {
  const candidates = pool.filter((w) => w.id !== correct.id)
  const sameChapter = candidates.filter((w) => w.chapter === correct.chapter)
  const others = candidates.filter((w) => w.chapter !== correct.chapter)
  const ordered = [...shuffle(sameChapter, rng), ...shuffle(others, rng)]
  return ordered.slice(0, count)
}
