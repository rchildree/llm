import { useMemo, useRef, useState } from 'react'
import { useDisplay } from '../../app/DisplayContext'
import EndingInput, { type FieldStatus } from './EndingInput'
import MacronRow from './MacronRow'
import { acceptedAnswers, gradeField, quantityCandidates } from '../../lib/agree/grade'
import { describeSlot } from '../../lib/agree/describe'
import type { MakeItAgreeQuestion } from '../../lib/agree/pairing'

type Field = 'modifier' | 'noun'

interface Props {
  question: MakeItAgreeQuestion
  /** fired the moment the answer is revealed, so the feedback panel can open */
  onAnswered: () => void
  onNext: (correct: boolean) => void
}

/** Inflect both words into one named slot by typing the endings. */
export default function MakeItAgree({ question, onAnswered, onNext }: Props) {
  const { lat } = useDisplay()
  const [values, setValues] = useState<Record<Field, string>>({ modifier: '', noun: '' })
  const [revealed, setRevealed] = useState(false)
  const [asking, setAsking] = useState<Field[]>([])
  const [focused, setFocused] = useState<Field>('modifier')
  const refs = {
    modifier: useRef<HTMLInputElement>(null),
    noun: useRef<HTMLInputElement>(null),
  }

  const accepted = useMemo(
    () => ({
      modifier: acceptedAnswers(question.modifierForm),
      noun: acceptedAnswers(question.nounForm),
    }),
    [question],
  )

  const forms = { modifier: question.modifierForm, noun: question.nounForm }

  const insert = (ch: string) => {
    const el = refs[focused].current
    setValues((prev) => {
      const current = prev[focused]
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
    const near = (['modifier', 'noun'] as Field[]).filter(
      (f) => gradeField(values[f], accepted[f]) === 'quantity',
    )
    if (near.length) {
      setAsking(near)
      return
    }
    setRevealed(true)
    onAnswered()
  }

  /** Commit a quantity choice; reveal once every near-miss is settled. */
  const resolve = (field: Field, choice: string) => {
    const rest = asking.filter((f) => f !== field)
    setValues((prev) => ({ ...prev, [field]: choice }))
    setAsking(rest)
    if (!rest.length) {
      setRevealed(true)
      onAnswered()
    }
  }

  const statusOf = (field: Field): FieldStatus => {
    if (asking.includes(field)) return 'quantity'
    if (!revealed) return 'open'
    return gradeField(values[field], accepted[field]) === 'right' ? 'right' : 'wrong'
  }

  const correct =
    revealed &&
    (['modifier', 'noun'] as Field[]).every((f) => gradeField(values[f], accepted[f]) === 'right')

  const locked = revealed || asking.length > 0

  return (
    <div className="card agree-card">
      <p className="drill-prompt">
        Make these <strong>{describeSlot(question.slot)}</strong>.
      </p>

      <div className="agree-fields">
        {(['modifier', 'noun'] as Field[]).map((field) => (
          <EndingInput
            key={field}
            ref={refs[field]}
            stem={forms[field].splittable ? forms[field].stem : ''}
            value={values[field]}
            onChange={(v) => setValues((prev) => ({ ...prev, [field]: v }))}
            onFocus={() => setFocused(field)}
            onSubmit={check}
            status={statusOf(field)}
            disabled={locked}
            label={
              field === 'modifier'
                ? question.pair.modifier.dict
                : question.pair.noun.dict
            }
            correction={
              revealed && statusOf(field) === 'wrong'
                ? forms[field].splittable
                  ? forms[field].ending
                  : forms[field].whole
                : null
            }
          />
        ))}
      </div>

      {asking.map((field) => (
        <div className="agree-didyoumean" key={field}>
          <span>
            Did you mean, for <span className="latin">{lat(question.pair[field].dict)}</span>?
          </span>
          {quantityCandidates(values[field], accepted[field]).map((candidate) => (
            <button
              key={candidate}
              type="button"
              className="btn-secondary latin"
              onClick={() => resolve(field, candidate)}
            >
              {forms[field].splittable ? `-${lat(candidate)}` : lat(candidate)}
            </button>
          ))}
        </div>
      ))}

      <MacronRow onInsert={insert} disabled={locked} />

      <div className="drill-actions">
        {!revealed ? (
          <button className="btn" onClick={check} disabled={asking.length > 0}>
            Check
          </button>
        ) : (
          <>
            <span className={correct ? 'grade-perfect' : 'grade-partial'}>
              {correct ? (
                'Agreed!'
              ) : (
                <>
                  <span className="latin">
                    {lat(question.modifierForm.whole)} {lat(question.nounForm.whole)}
                  </span>
                </>
              )}
            </span>
            <button className="btn" onClick={() => onNext(correct)} autoFocus>
              Next
            </button>
          </>
        )}
      </div>
    </div>
  )
}
