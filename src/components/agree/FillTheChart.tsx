import { useMemo, useRef, useState } from 'react'
import { useDisplay } from '../../app/DisplayContext'
import AgreementChart, { type CellArgs, type ChartWord } from './AgreementChart'
import EndingInput, { type FieldStatus } from './EndingInput'
import MacronRow from './MacronRow'
import { acceptedFor, cellKey, chartCells, gradeChart, type ChartCell } from '../../lib/agree/chart'
import { describeWord, shortSlot } from '../../lib/agree/describe'
import { quantityCandidates } from '../../lib/agree/grade'
import { modifierParadigm, type PronounForms } from '../../lib/agree/paradigm'
import type { FillTheChartQuestion } from '../../lib/agree/pairing'

interface Props {
  question: FillTheChartQuestion
  pronounForms: PronounForms
  onNext: (correct: boolean) => void
}

/**
 * Both paradigms typed out in parallel. One row comes filled in as the worked
 * example; everything else with an ending to type is a box, and the whole
 * grid is graded at once.
 */
export default function FillTheChart({ question, pronounForms, onNext }: Props) {
  const { lat } = useDisplay()
  const cells = useMemo(() => chartCells(question), [question])
  const byKey = useMemo(() => new Map(cells.map((c) => [c.key, c])), [cells])
  const first = cells.find((c) => c.typed)

  const [values, setValues] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState(false)
  const [asking, setAsking] = useState<string[]>([])
  const [focused, setFocused] = useState(first?.key ?? '')
  const inputs = useRef(new Map<string, HTMLInputElement | null>())

  const grade = useMemo(() => gradeChart(cells, values), [cells, values])

  const { pair } = question
  const words: { modifier: ChartWord; noun: ChartWord } = {
    modifier: {
      dict: pair.modifier.dict,
      type: describeWord(pair.modifier, pair.gender),
      paradigm: modifierParadigm(pair.modifier, pair.gender, pronounForms) ?? pair.modifierParadigm,
    },
    noun: {
      dict: pair.noun.dict,
      type: describeWord(pair.noun, pair.gender),
      paradigm: pair.nounParadigm,
    },
  }

  const insert = (ch: string) => {
    const el = inputs.current.get(focused)
    setValues((prev) => {
      const current = prev[focused] ?? ''
      const start = el?.selectionStart ?? current.length
      const end = el?.selectionEnd ?? current.length
      const next = current.slice(0, start) + ch + current.slice(end)
      queueMicrotask(() => {
        el?.focus()
        el?.setSelectionRange(start + ch.length, start + ch.length)
      })
      return { ...prev, [focused]: next }
    })
  }

  const check = () => {
    if (revealed || asking.length) return
    if (grade.near.length) {
      setAsking(grade.near)
      return
    }
    setRevealed(true)
  }

  /** Commit a quantity choice; reveal once every near-miss is settled. */
  const resolve = (key: string, choice: string) => {
    const rest = asking.filter((k) => k !== key)
    setValues((prev) => ({ ...prev, [key]: choice }))
    setAsking(rest)
    if (!rest.length) setRevealed(true)
  }

  const statusOf = (cell: ChartCell): FieldStatus => {
    if (asking.includes(cell.key)) return 'quantity'
    if (!revealed) return 'open'
    return grade.results.get(cell.key) === 'right' ? 'right' : 'wrong'
  }

  const locked = revealed || asking.length > 0
  const typedCount = cells.filter((c) => c.typed).length
  const rightCount = [...grade.results.values()].filter((r) => r === 'right').length

  const renderCell = ({ slot, side, form }: CellArgs) => {
    const cell = byKey.get(cellKey(slot, side))
    if (!cell || !form?.whole) return <span className="agree-gap">—</span>

    if (!cell.typed) {
      // the worked example, and the forms that are simply given
      return (
        <span className="latin agree-chart-given">
          <span className="agree-stem">{lat(form.stem)}</span>
          <span className="agree-ending">{lat(form.ending)}</span>
        </span>
      )
    }

    const status = statusOf(cell)
    return (
      <EndingInput
        ref={(el) => {
          inputs.current.set(cell.key, el)
        }}
        stem={form.splittable ? form.stem : ''}
        value={values[cell.key] ?? ''}
        onChange={(v) => setValues((prev) => ({ ...prev, [cell.key]: v }))}
        onFocus={() => setFocused(cell.key)}
        onSubmit={check}
        status={status}
        disabled={locked}
        hideLabel
        label={`${question.pair[side].lemma} ${shortSlot(slot)}`}
        correction={
          revealed && status === 'wrong'
            ? form.splittable
              ? form.ending
              : form.whole
            : null
        }
      />
    )
  }

  const askingCell = asking.length ? byKey.get(asking[0]) : undefined

  return (
    <div className="card agree-card">
      <p className="drill-prompt">
        Fill in both paradigms. The nominative is the dictionary form, and the{' '}
        <strong>{shortSlot(question.given)}</strong> row is the worked example.
      </p>

      <div className="agree-chart-scroll">
        <AgreementChart
          modifier={words.modifier}
          noun={words.noun}
          className="agree-chart-typed"
          renderCell={renderCell}
        />
      </div>

      {askingCell && (
        <div className="agree-didyoumean">
          <span>
            Did you mean, for{' '}
            <span className="latin">{lat(question.pair[askingCell.side].lemma)}</span>{' '}
            {shortSlot(askingCell.slot)}?
          </span>
          {quantityCandidates(values[askingCell.key] ?? '', acceptedFor(askingCell)).map(
            (candidate) => (
              <button
                key={candidate}
                type="button"
                className="btn-secondary latin"
                onClick={() => resolve(askingCell.key, candidate)}
              >
                {askingCell.form?.splittable ? `-${lat(candidate)}` : lat(candidate)}
              </button>
            ),
          )}
          {asking.length > 1 && (
            <span className="muted">{asking.length - 1} more to settle</span>
          )}
        </div>
      )}

      <MacronRow onInsert={insert} disabled={locked} />

      <div className="drill-actions">
        {!revealed ? (
          <button className="btn" onClick={check} disabled={asking.length > 0}>
            Check
          </button>
        ) : (
          <>
            <span className={grade.correct ? 'grade-perfect' : 'grade-partial'}>
              {grade.correct ? 'Every cell right!' : `${rightCount}/${typedCount} right`}
            </span>
            <button className="btn" onClick={() => onNext(grade.correct)} autoFocus>
              Next
            </button>
          </>
        )}
      </div>
    </div>
  )
}
