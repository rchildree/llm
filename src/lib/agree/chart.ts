/**
 * The typed parallel chart: which of its twenty cells the student fills in,
 * and how the lot of them are graded.
 *
 * Kept apart from the component so the rules about which cells are askable —
 * the worked-example row, the nominative singular that is simply given, the
 * neuter accusative that repeats it — are testable on their own.
 */
import { acceptedAnswers, gradeField, type FieldResult } from './grade'
import { allSlots, slotKey, type Form, type Slot } from './paradigm'
import type { FillTheChartQuestion } from './pairing'

export type Side = 'modifier' | 'noun'

/** key for one cell of the grid, e.g. "acc.pl:noun" */
export const cellKey = (slot: Slot, side: Side): string => `${slotKey(slot.c, slot.n)}:${side}`

export interface ChartCell {
  key: string
  slot: Slot
  side: Side
  /** null where the paradigm has no form at all */
  form: Form | null
  /**
   * A cell the student types in. False for the worked example, for a form
   * with no ending to type (nom.sg. is the citation form itself) and for a
   * gap in the paradigm — those are printed, not asked.
   */
  typed: boolean
}

/** A form is askable when there is something to put in the box. */
const hasEnding = (form: Form): boolean =>
  form.splittable ? form.ending.length > 0 : form.whole.length > 0

/** Every cell of the chart, row by row, modifier before noun. */
export function chartCells(question: FillTheChartQuestion): ChartCell[] {
  const given = slotKey(question.given.c, question.given.n)
  const cells: ChartCell[] = []
  for (const slot of allSlots()) {
    const key = slotKey(slot.c, slot.n)
    for (const side of ['modifier', 'noun'] as Side[]) {
      const paradigm =
        side === 'modifier' ? question.pair.modifierParadigm : question.pair.nounParadigm
      const form = paradigm.get(key) ?? null
      cells.push({
        key: cellKey(slot, side),
        slot,
        side,
        form,
        typed: key !== given && form !== null && Boolean(form.whole) && hasEnding(form),
      })
    }
  }
  return cells
}

/** What the box for this cell accepts. */
export function acceptedFor(cell: ChartCell): string[] {
  return cell.form ? acceptedAnswers(cell.form) : []
}

export interface ChartGrade {
  /** one result per typed cell, keyed by cell key */
  results: Map<string, FieldResult>
  /** the cells that are right apart from vowel quantity, in chart order */
  near: string[]
  /** every typed cell right — the one boolean the session tally gets */
  correct: boolean
}

export function gradeChart(cells: ChartCell[], values: Record<string, string>): ChartGrade {
  const results = new Map<string, FieldResult>()
  const near: string[] = []
  for (const cell of cells) {
    if (!cell.typed) continue
    const result = gradeField(values[cell.key] ?? '', acceptedFor(cell))
    results.set(cell.key, result)
    if (result === 'quantity') near.push(cell.key)
  }
  return {
    results,
    near,
    correct: [...results.values()].every((r) => r === 'right'),
  }
}
