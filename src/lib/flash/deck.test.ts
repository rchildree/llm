import { describe, expect, test } from 'vitest'
import { draw, type Card } from './deck'
import type { Word } from './types'

function word(id: number, chapter = 1): Word {
  return { id: String(id), entry: `entry${id}`, definition: `def${id}`, chapter }
}

/** An RNG that always picks the top of the range, making Fisher-Yates a no-op. */
const noShuffle = () => 0.999999

/** Deal `count` cards, threading remaining/previous the way the page does. */
function deal(pool: Word[], count: number, rng: () => number): Card[] {
  const cards: Card[] = []
  let remaining: Word[] = []
  let previous: Card | null = null
  for (let i = 0; i < count; i++) {
    const next = draw(pool, remaining, previous, rng)
    if (!next) break
    cards.push((previous = next.card))
    remaining = next.remaining
  }
  return cards
}

describe('draw', () => {
  const pool = [word(1), word(2), word(3), word(4), word(5)]

  test('returns null for an empty pool', () => {
    expect(draw([], [], null)).toBeNull()
  })

  test('one pass covers every word exactly once', () => {
    const ids = deal(pool, pool.length, Math.random).map((c) => c.word.id)
    expect([...ids].sort()).toEqual(['1', '2', '3', '4', '5'])
  })

  test('keeps dealing past the end of a pass', () => {
    expect(deal(pool, 12, Math.random)).toHaveLength(12)
  })

  test('never deals the same word twice in a row, across many reshuffles', () => {
    const cards = deal(pool, 200, Math.random)
    for (let i = 1; i < cards.length; i++) {
      expect(cards[i].word.id).not.toBe(cards[i - 1].word.id)
    }
  })

  test('a fresh pass that would repeat the last word leads with another', () => {
    const three = [word(1), word(2), word(3)]
    const previous = { word: three[0], direction: 'la_en' } as const
    // noShuffle would deal word 1 first, which is the word just seen
    const next = draw(three, [], previous, noShuffle)
    expect(next!.card.word.id).not.toBe('1')
    // the displaced word stays in the pass rather than being dropped
    expect([next!.card.word.id, ...next!.remaining.map((w) => w.id)].sort())
      .toEqual(['1', '2', '3'])
  })

  test('a one-word pool keeps returning that word', () => {
    const cards = deal([word(1)], 3, Math.random)
    expect(cards.map((c) => c.word.id)).toEqual(['1', '1', '1'])
  })

  test('both directions are reachable', () => {
    const directions = new Set(deal(pool, 60, Math.random).map((c) => c.direction))
    expect([...directions].sort()).toEqual(['en_la', 'la_en'])
  })
})
