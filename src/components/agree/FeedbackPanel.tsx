import { useEffect, useRef, useState } from 'react'
import AgreementChart, { type ChartWord } from './AgreementChart'
import { GENDER_WORD, describeSlot } from '../../lib/agree/describe'
import type { Gender, Slot } from '../../lib/agree/paradigm'
import { slotKey } from '../../lib/agree/paradigm'

/**
 * 1 word types · 2 the noun's slot · 3 the modifier's parallel slot
 * · 4 rest, everything held.
 */
const LAST_STEP = 4
const STEP_MS = 850

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

interface SequenceProps {
  modifier: ChartWord
  noun: ChartWord
  gender: Gender
  slot: Slot
}

/**
 * Walks the explanation one step at a time. Mounted fresh for each answer
 * (the parent keys it), so the first step is its initial state rather than
 * something an effect has to set.
 */
function FeedbackSequence({ modifier, noun, gender, slot }: SequenceProps) {
  const [step, setStep] = useState(() => (prefersReducedMotion() ? LAST_STEP : 1))
  const [runId, setRunId] = useState(0)
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])

  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (prefersReducedMotion()) return
    for (let s = 2; s <= LAST_STEP; s++) {
      timers.current.push(setTimeout(() => setStep(s), STEP_MS * (s - 1)))
    }
    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [runId])

  const replay = () => {
    setStep(prefersReducedMotion() ? LAST_STEP : 1)
    setRunId((n) => n + 1)
  }

  const key = slotKey(slot.c, slot.n)
  const caption =
    step <= 1
      ? `${modifier.type} with ${noun.type}`
      : step === 2
        ? `The noun is ${describeSlot(slot)}, and ${GENDER_WORD[gender]}.`
        : `So the modifier is ${describeSlot(slot)} too — in the ${GENDER_WORD[gender]}.`

  return (
    <>
      <div className="agree-feedback-head">
        <p className="agree-caption">{caption}</p>
        <button type="button" className="linklike" onClick={replay}>
          Replay
        </button>
      </div>
      <AgreementChart
        modifier={modifier}
        noun={noun}
        highlight={step >= 2 ? key : null}
        showTypes={step >= 1}
        showNoun={step >= 2}
        showModifier={step >= 3}
      />
    </>
  )
}

interface Props extends SequenceProps {
  open: boolean
  /** changes with every answer, to restart the walkthrough */
  runKey: string | number
}

/**
 * The pushdown above the exercise. The wrapper stays mounted so its height can
 * animate; the walkthrough inside mounts only while it is open.
 */
export default function FeedbackPanel({ open, runKey, ...sequence }: Props) {
  return (
    <div className={'agree-feedback' + (open ? ' open' : '')} aria-hidden={!open}>
      <div className="agree-feedback-inner">
        {open && <FeedbackSequence key={runKey} {...sequence} />}
      </div>
    </div>
  )
}
