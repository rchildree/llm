import { useState } from 'react'
import { useDisplay } from '../../app/DisplayContext'
import { shortSlot } from '../../lib/agree/describe'
import type { DoesItMatchQuestion } from '../../lib/agree/pairing'
import type { Triple } from '../../lib/agree/match'
import { GENDER_LABEL } from '../../lib/agree/describe'

const readings = (triples: Triple[]): string =>
  triples.map((t) => `${shortSlot(t)} ${GENDER_LABEL[t.g]}`).join(' · ')

interface Props {
  question: DoesItMatchQuestion
  /** fired the moment an answer is given, so the feedback panel can open */
  onAnswered: () => void
  onNext: (correct: boolean) => void
}

/** Judge whether two inflected forms can stand together. */
export default function DoesItMatch({ question, onAnswered, onNext }: Props) {
  const { lat } = useDisplay()
  const [answer, setAnswer] = useState<boolean | null>(null)

  const say = (value: boolean) => {
    setAnswer(value)
    onAnswered()
  }
  const correct = answer !== null && answer === question.matches

  return (
    <div className="card agree-card">
      <p className="drill-prompt">Can these two stand together?</p>

      <p className="agree-pair latin">
        {lat(question.modifierSurface)} {lat(question.nounSurface)}
      </p>

      {answer === null ? (
        <div className="drill-actions">
          <button className="btn" onClick={() => say(true)} autoFocus>
            Yes
          </button>
          <button className="btn-secondary" onClick={() => say(false)}>
            No
          </button>
        </div>
      ) : (
        <>
          <div className="agree-readings">
            <p>
              <span className="latin">{lat(question.modifierSurface)}</span>{' '}
              <span className="muted">{readings(question.modifierTriples) || '—'}</span>
            </p>
            <p>
              <span className="latin">{lat(question.nounSurface)}</span>{' '}
              <span className="muted">{readings(question.nounTriples) || '—'}</span>
            </p>
            <p className={question.matches ? 'grade-perfect' : 'grade-partial'}>
              {question.matches
                ? `They share ${readings(question.shared)}.`
                : 'No case, number and gender in common.'}
            </p>
          </div>
          <div className="drill-actions">
            <span className={correct ? 'grade-perfect' : 'grade-partial'}>
              {correct ? 'Right' : 'Not quite'}
            </span>
            <button className="btn" onClick={() => onNext(correct)} autoFocus>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
