import { describe, expect, test } from 'vitest'
import { pickDistractors } from './distractors'
import type { Word } from './types'

function word(id: number, chapter: number): Word {
  return { id: String(id), entry: `entry${id}`, definition: `def${id}`, chapter }
}

// Deterministic "shuffle" that leaves order unchanged.
const noShuffle = () => 0

describe('pickDistractors', () => {
  const correct = word(1, 1)

  test('never includes the correct word', () => {
    const pool = [correct, word(2, 1), word(3, 1), word(4, 1)]
    const result = pickDistractors(correct, pool, 3, noShuffle)
    expect(result.map((w) => w.id)).not.toContain(1)
  })

  test('returns the requested number of distractors', () => {
    const pool = [correct, word(2, 1), word(3, 1), word(4, 1), word(5, 1)]
    const result = pickDistractors(correct, pool, 3, noShuffle)
    expect(result).toHaveLength(3)
  })

  test('returns no duplicates', () => {
    const pool = [correct, word(2, 1), word(3, 1), word(4, 1)]
    const result = pickDistractors(correct, pool, 3, noShuffle)
    expect(new Set(result.map((w) => w.id)).size).toBe(3)
  })

  test('prefers same-chapter words when enough exist', () => {
    const pool = [correct, word(2, 1), word(3, 1), word(4, 1), word(5, 9)]
    const result = pickDistractors(correct, pool, 3, noShuffle)
    expect(result.every((w) => w.chapter === 1)).toBe(true)
  })

  test('falls back to other chapters when same-chapter is insufficient', () => {
    const pool = [correct, word(2, 1), word(3, 9), word(4, 9)]
    const result = pickDistractors(correct, pool, 3, noShuffle)
    expect(result.map((w) => w.id).sort()).toEqual(['2', '3', '4'])
  })

  test('returns as many as possible when the pool is too small', () => {
    const pool = [correct, word(2, 1)]
    const result = pickDistractors(correct, pool, 3, noShuffle)
    expect(result).toHaveLength(1)
  })
})
