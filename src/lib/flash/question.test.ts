import { describe, expect, test } from 'vitest'
import { buildQuestion } from './question'
import type { Word } from './types'

function word(id: number, chapter = 1): Word {
  return { id: String(id), entry: `entry${id}`, definition: `def${id}`, chapter }
}

const noShuffle = () => 0

describe('buildQuestion', () => {
  const correct = word(1)
  const pool = [correct, word(2), word(3), word(4)]

  test('la_en prompts with the Latin entry', () => {
    const q = buildQuestion(correct, 'la_en', pool, 3, noShuffle)
    expect(q.prompt).toBe('entry1')
  })

  test('la_en options are English definitions', () => {
    const q = buildQuestion(correct, 'la_en', pool, 3, noShuffle)
    expect(q.options.map((o) => o.text)).toContain('def1')
  })

  test('en_la prompts with the definition and options are Latin entries', () => {
    const q = buildQuestion(correct, 'en_la', pool, 3, noShuffle)
    expect(q.prompt).toBe('def1')
    expect(q.options.map((o) => o.text)).toContain('entry1')
  })

  test('produces count + 1 options', () => {
    const q = buildQuestion(correct, 'la_en', pool, 3, noShuffle)
    expect(q.options).toHaveLength(4)
  })

  test('exactly one option is marked correct', () => {
    const q = buildQuestion(correct, 'la_en', pool, 3, noShuffle)
    expect(q.options.filter((o) => o.correct)).toHaveLength(1)
  })

  test('the correct option carries the right text', () => {
    const q = buildQuestion(correct, 'la_en', pool, 3, noShuffle)
    const right = q.options.find((o) => o.correct)
    expect(right?.text).toBe('def1')
  })
})
