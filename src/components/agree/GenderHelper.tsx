import { useState } from 'react'
import { useDisplay } from '../../app/DisplayContext'
import { GENDER_LABEL, GENDER_WORD } from '../../lib/agree/describe'
import type { GenderQuestion } from '../../lib/agree/gender'
import type { RuleHit } from '../../lib/agree/genderRules'
import type { Gender } from '../../lib/agree/paradigm'

const CHOICES: Gender[] = ['m', 'f', 'n']

interface Props {
  question: GenderQuestion
  onNext: (correct: boolean) => void
}

/** The rules that bear on this noun — not the whole list. */
function Rules({ hits }: { hits: RuleHit[] }) {
  const { lat } = useDisplay()
  if (!hits.length)
    return (
      <p className="muted">
        No ending rule covers this one. It has to be learnt with its genitive.
      </p>
    )

  return (
    <ul className="gender-rules">
      {hits.map(({ rule, exception, gender }) => (
        <li key={rule.id}>
          <span className="gender-chip">{GENDER_LABEL[gender]}</span>
          <span>
            {rule.statement}
            {rule.examples.length > 0 && (
              <>
                : <span className="latin">{lat(rule.examples.join(', '))}</span>
              </>
            )}
            .
            {rule.caveat && <span className="gender-caveat"> {rule.caveat}</span>}
            {exception && (
              <span className="gender-exception">
                {' '}
                But <span className="latin">{lat(exception.lemma)}</span> is{' '}
                {GENDER_WORD[exception.gender]}
                {exception.note ? ` (${exception.note})` : ''}.
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Name a noun's gender, with the rules on hand. */
export default function GenderHelper({ question, onNext }: Props) {
  const { lat } = useDisplay()
  const [answer, setAnswer] = useState<Gender | null>(null)
  const [help, setHelp] = useState(false)

  const { entry, answers } = question
  const correct = answer !== null && answers.includes(answer)
  const genitive = entry.pp[1]

  return (
    <div className="card agree-card">
      <p className="drill-prompt">What gender is this noun?</p>

      <div className="gender-word">
        <p className="latin agree-pair">
          {lat(entry.lemma)}
          {genitive && <span className="gender-gen">, {lat(genitive)}</span>}
        </p>
        <p className="muted">{entry.definition}</p>
      </div>

      {answer === null ? (
        <>
          <div className="drill-actions">
            {CHOICES.map((gender) => (
              <button
                key={gender}
                className="btn gender-choice"
                onClick={() => setAnswer(gender)}
                title={GENDER_WORD[gender]}
              >
                {GENDER_LABEL[gender]}
              </button>
            ))}
            <button
              type="button"
              className={help ? 'btn-secondary on' : 'btn-secondary'}
              aria-expanded={help}
              onClick={() => setHelp((h) => !h)}
            >
              {help ? 'Hide help' : 'Help'}
            </button>
          </div>
          {help && (
            <div className="gender-help">
              <Rules hits={question.hits} />
            </div>
          )}
        </>
      ) : (
        <>
          <p className={correct ? 'grade-perfect' : 'grade-partial'}>
            {correct ? 'Right' : 'Not quite'} —{' '}
            <span className="latin">{lat(entry.lemma)}</span> is{' '}
            {answers.map((g) => GENDER_WORD[g]).join(' or ')}.
          </p>
          <div className="gender-help">
            <Rules hits={question.hits} />
          </div>
          <div className="drill-actions">
            <button className="btn" onClick={() => onNext(correct)} autoFocus>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
