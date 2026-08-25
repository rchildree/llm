/**
 * Card order: a shuffled pass through the whole pool, dealt one card at a
 * time and reshuffled when it runs out, so every word comes up once per pass.
 * The one extra rule is at the seam — a fresh pass never leads with the word
 * that just ended the last one, so no word is ever asked twice in a row.
 */
import { shuffle, type Rng } from './shuffle'
import type { Direction, Word } from './types'

export interface Card {
  word: Word
  direction: Direction
}

export interface Draw {
  card: Card
  /** the rest of the current pass, to hand back on the next draw */
  remaining: Word[]
}

/** Shuffle the pool into a new pass that doesn't start on `previous`'s word. */
function reshuffle(pool: Word[], previous: Card | null, rng: Rng): Word[] {
  const next = shuffle(pool, rng)
  if (previous && pool.length > 1 && next[0].id === previous.word.id) {
    const j = 1 + Math.floor(rng() * (next.length - 1))
    ;[next[0], next[j]] = [next[j], next[0]]
  }
  return next
}

/**
 * Deal the next card off `remaining`, starting a fresh pass when it is empty.
 * Returns null for an empty pool.
 */
export function draw(
  pool: Word[],
  remaining: Word[],
  previous: Card | null,
  rng: Rng = Math.random,
): Draw | null {
  if (pool.length === 0) return null
  const queue = remaining.length ? remaining : reshuffle(pool, previous, rng)
  return {
    card: { word: queue[0], direction: rng() < 0.5 ? 'la_en' : 'en_la' },
    remaining: queue.slice(1),
  }
}
