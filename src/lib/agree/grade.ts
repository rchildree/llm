/**
 * Grading typed answers, and the vowel-quantity question that comes with them.
 *
 * An answer that is correct apart from macrons is not marked wrong outright:
 * it is reported as `quantity`, and the exercise asks the student which they
 * meant before grading the choice.
 */
import { stripMacrons } from '../morph/utils'
import type { Form } from './paradigm'

export type FieldResult = 'right' | 'wrong' | 'quantity'

/** Students type "-is" as often as "is"; both mean the same ending. */
export function normalizeTyped(value: string): string {
  return value.trim().replace(/^[-‐-―−]+/, '').normalize('NFC')
}

/** What counts as a correct answer for this form: an ending, or a whole word. */
export function acceptedAnswers(form: Form): string[] {
  return form.splittable ? [form.ending] : [form.whole, ...form.alternates]
}

export function gradeField(typed: string, accepted: string[]): FieldResult {
  const value = normalizeTyped(typed)
  if (accepted.some((a) => a === value)) return 'right'
  const bare = stripMacrons(value)
  if (value.length > 0 && accepted.some((a) => stripMacrons(a) === bare)) return 'quantity'
  return 'wrong'
}

/**
 * The options offered by the "did you mean?" prompt: what the student typed
 * alongside the accepted spellings that differ from it only in quantity.
 */
export function quantityCandidates(typed: string, accepted: string[]): string[] {
  const value = normalizeTyped(typed)
  const bare = stripMacrons(value)
  const options = new Set<string>([value])
  for (const a of accepted) if (stripMacrons(a) === bare) options.add(a)
  return [...options]
}
