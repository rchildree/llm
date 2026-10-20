import { useState } from 'react'
import AgreementChart, { type ChartWord } from './AgreementChart'
import DoesItMatch from './DoesItMatch'
import FeedbackPanel from './FeedbackPanel'
import FillTheChart from './FillTheChart'
import GenderHelper from './GenderHelper'
import MakeItAgree from './MakeItAgree'
import { describeWord } from '../../lib/agree/describe'
import { whichGender, type GenderQuestion } from '../../lib/agree/gender'
import { modifierParadigm, type PronounForms, type Slot } from '../../lib/agree/paradigm'
import {
  doesItMatch,
  fillTheChart,
  makeItAgree,
  type AgreementPool,
  type DoesItMatchQuestion,
  type FillTheChartQuestion,
  type MakeItAgreeQuestion,
} from '../../lib/agree/pairing'

export type Exercise = 'does-it-match' | 'make-it-agree' | 'fill-the-chart' | 'which-gender'

type Question =
  | DoesItMatchQuestion
  | MakeItAgreeQuestion
  | FillTheChartQuestion
  | GenderQuestion

interface Props {
  pool: AgreementPool
  pronounForms: PronounForms
  exercise: Exercise
  easyMode: boolean
  feedback: boolean
  /** gender only: show an inflected form instead of the citation */
  genderHard: boolean
  onScore: (correct: boolean) => void
  /** rendered when the settings leave nothing to ask */
  empty: React.ReactNode
}

/**
 * One question at a time from a fixed pool. The page remounts this (via `key`)
 * whenever the pool or the exercise changes, so a new setting always deals a
 * fresh question.
 */
export default function AgreementRound({
  pool,
  pronounForms,
  exercise,
  easyMode,
  feedback,
  genderHard,
  onScore,
  empty,
}: Props) {
  const deal = (): Question | null => {
    switch (exercise) {
      case 'make-it-agree':
        return makeItAgree(pool, pronounForms)
      case 'fill-the-chart':
        return fillTheChart(pool, pronounForms)
      case 'which-gender':
        return whichGender(pool.nouns, genderHard)
      default:
        return doesItMatch(pool, Math.random() < 0.5, pronounForms)
    }
  }

  const [question, setQuestion] = useState<Question | null>(deal)
  const [answered, setAnswered] = useState(false)
  const [round, setRound] = useState(0)

  const next = (correct: boolean) => {
    onScore(correct)
    setQuestion(deal())
    setAnswered(false)
    setRound((r) => r + 1)
  }

  if (!question) return <div className="card">{empty}</div>

  // the two exercises that are not about a modifier/noun pair on screen: no
  // walkthrough to open, and easy mode would simply be the answer
  if (question.kind === 'which-gender')
    return <GenderHelper key={round} question={question} onNext={next} />
  if (question.kind === 'fill-the-chart')
    return (
      <FillTheChart
        key={round}
        question={question}
        pronounForms={pronounForms}
        onNext={next}
      />
    )

  const { pair } = question
  const slot: Slot | null =
    question.kind === 'make-it-agree'
      ? question.slot
      : (question.shared[0] ?? question.nounTriples[0] ?? null)

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

  return (
    <>
      {feedback && slot && (
        <FeedbackPanel
          open={answered}
          runKey={round}
          modifier={words.modifier}
          noun={words.noun}
          gender={pair.gender}
          slot={slot}
        />
      )}

      {question.kind === 'make-it-agree' ? (
        <MakeItAgree
          key={round}
          question={question}
          onAnswered={() => setAnswered(true)}
          onNext={next}
        />
      ) : (
        <DoesItMatch
          key={round}
          question={question}
          onAnswered={() => setAnswered(true)}
          onNext={next}
        />
      )}

      {easyMode && (
        <div className="card agree-easy">
          <AgreementChart modifier={words.modifier} noun={words.noun} />
        </div>
      )}
    </>
  )
}
