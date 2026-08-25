import { useEffect, useState } from 'react'
import { useDisplay } from '../app/DisplayContext'
import { describeAnalysis } from '../lib/drill/describe'
import { gradeSelection, type Grade } from '../lib/drill/generator'
import { entriesForChip } from '../lib/drill/help'
import type { Question } from '../lib/drill/types'
import type { VocabEntry } from '../lib/dataset/types'

interface Props {
  question: Question
  onNext: (grade: Grade) => void
  helpMode: boolean
  entriesById: Map<string, VocabEntry>
}

export default function WhichAreDrill({ question, onNext, helpMode, entriesById }: Props) {
  const { lat } = useDisplay()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [grade, setGrade] = useState<Grade | null>(null)
  // surface whose help popover is pinned open (touch); hover is CSS-only
  const [pinned, setPinned] = useState<string | null>(null)
  const revealed = grade !== null

  // dismiss a pinned popover on any outside interaction
  useEffect(() => {
    if (!pinned) return
    const close = () => setPinned(null)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [pinned])

  const toggle = (s: string) => {
    if (revealed) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const check = () => setGrade(gradeSelection(question, selected))

  const next = () => {
    if (grade) onNext(grade)
    setSelected(new Set())
    setGrade(null)
    setPinned(null)
  }

  const chipClass = (s: string, correct: boolean) => {
    const picked = selected.has(s)
    if (!revealed) return 'chip' + (picked ? ' picked' : '')
    if (correct && picked) return 'chip hit'
    if (correct) return 'chip missed'
    if (picked) return 'chip wrong'
    return 'chip dim'
  }

  return (
    <div className="drill card">
      <p className="drill-prompt">
        Which of these are <strong>{question.target.label}</strong>?
      </p>
      <div className="chip-grid">
        {question.chips.map((chip) => {
          const entries = helpMode ? entriesForChip(chip, entriesById) : []
          return (
            <div className="chip-wrap" key={chip.s}>
              <button
                type="button"
                className={chipClass(chip.s, chip.correct)}
                onClick={() => toggle(chip.s)}
                aria-pressed={selected.has(chip.s)}
              >
                <span className="latin">{lat(chip.s)}</span>
                {revealed && (
                  <span className="chip-parse">
                    {chip.analyses.map(describeAnalysis).join(' · ')}
                  </span>
                )}
              </button>
              {entries.length > 0 && (
                <>
                  <button
                    type="button"
                    className="chip-help-btn"
                    aria-label={`dictionary entry for ${chip.s}`}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setPinned((p) => (p === chip.s ? null : chip.s))
                    }}
                  >
                    i
                  </button>
                  <div
                    className={'chip-help-pop latin' + (pinned === chip.s ? ' pinned' : '')}
                    role="tooltip"
                  >
                    {entries.map((e) => (
                      <span key={e.id}>{lat(e.dict)}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
      <div className="drill-actions">
        {!revealed ? (
          <button className="btn" onClick={check} disabled={selected.size === 0}>
            Check
          </button>
        ) : (
          <>
            <span className={grade.perfect ? 'grade-perfect' : 'grade-partial'}>
              {grade.perfect
                ? 'Perfect!'
                : `${grade.hits}/${grade.targets} found` +
                  (grade.falseAlarms ? `, ${grade.falseAlarms} wrong` : '')}
            </span>
            <button className="btn" onClick={next} autoFocus>
              Next
            </button>
          </>
        )}
      </div>
    </div>
  )
}
