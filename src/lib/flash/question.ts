import { pickDistractors, type Rng } from './distractors'
import type { Direction, Word } from './types'

export interface Option {
  text: string
  correct: boolean
}

export interface Question {
  prompt: string
  options: Option[]
}

/** The side of a word shown as the prompt for a given direction. */
function promptText(word: Word, direction: Direction): string {
  return direction === 'la_en' ? word.entry : word.definition
}

/** The side of a word used as an answer choice for a given direction. */
function answerText(word: Word, direction: Direction): string {
  return direction === 'la_en' ? word.definition : word.entry
}

/**
 * Build a multiple-choice question for one tested word: the prompt plus
 * `count` confusable distractors and the correct answer, shuffled together.
 */
export function buildQuestion(
  word: Word,
  direction: Direction,
  pool: Word[],
  count: number,
  rng: Rng = Math.random,
): Question {
  const distractors = pickDistractors(word, pool, count, rng)
  const options: Option[] = [
    { text: answerText(word, direction), correct: true },
    ...distractors.map((d) => ({ text: answerText(d, direction), correct: false })),
  ]
  // Fisher–Yates shuffle so the correct answer isn't always first.
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return { prompt: promptText(word, direction), options }
}

export { pickDistractors }
