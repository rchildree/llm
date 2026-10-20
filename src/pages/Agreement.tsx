import { useEffect, useMemo, useState } from 'react'
import { useDataset } from '../app/DatasetContext'
import AgreementRound, { type Exercise } from '../components/agree/AgreementRound'
import { chapterLabel, inChapterScope } from '../lib/chapters'
import { indexPronounForms, type PronounForms } from '../lib/agree/paradigm'
import { buildAgreementPool } from '../lib/agree/pairing'
import { getSetting, setSetting } from '../storage/settings'

const EXERCISES: Array<[Exercise, string]> = [
  ['does-it-match', 'Does it match?'],
  ['make-it-agree', 'Make it agree'],
  ['fill-the-chart', 'Fill in the chart'],
  ['which-gender', 'Gender'],
]

/** the two switches that only mean anything for a pair on screen */
const PAIR_EXERCISES = new Set<Exercise>(['does-it-match', 'make-it-agree'])

export default function Agreement() {
  const { dataset, error } = useDataset()
  const [chapterCap, setChapterCap] = useState<number | null>(null)
  const [chapterOnly, setChapterOnly] = useState(false)
  const [exercise, setExercise] = useState<Exercise>('does-it-match')
  const [easyMode, setEasyMode] = useState(false)
  const [feedback, setFeedback] = useState(true)
  const [pronounForms, setPronounForms] = useState<PronounForms | null>(null)
  const [score, setScore] = useState({ done: 0, right: 0 })

  useEffect(() => {
    Promise.all([
      getSetting<number>('study.chapterCap', 10),
      getSetting<boolean>('study.chapterOnly', false),
      getSetting<Exercise>('agree.exercise', 'does-it-match'),
      getSetting<boolean>('agree.easyMode', false),
      getSetting<boolean>('agree.feedback', true),
    ]).then(([cap, only, saved, easy, fb]) => {
      setChapterCap(cap)
      setChapterOnly(only)
      setExercise(saved)
      setEasyMode(easy)
      setFeedback(fb)
    })
  }, [])

  // pronoun paradigms come from the dataset's form chunk, not the engine
  useEffect(() => {
    if (!dataset) return
    let cancelled = false
    dataset.forms('pron').then((records) => {
      if (!cancelled) setPronounForms(indexPronounForms(records))
    })
    return () => {
      cancelled = true
    }
  }, [dataset])

  const pool = useMemo(() => {
    if (!dataset || chapterCap === null || !pronounForms) return null
    return buildAgreementPool(dataset.entries, { cap: chapterCap, only: chapterOnly }, pronounForms)
  }, [dataset, chapterCap, chapterOnly, pronounForms])

  const updateCap = (cap: number) => {
    setChapterCap(cap)
    void setSetting('study.chapterCap', cap)
  }

  const toggle = <T,>(value: T, set: (v: T) => void, key: string) => {
    set(value)
    void setSetting(key, value)
  }

  if (error)
    return <main className="page"><h1>Agreement</h1><p>Could not load vocabulary: {error}</p></main>
  if (!dataset || chapterCap === null || !pronounForms || !pool)
    return <main className="page"><h1>Agreement</h1><p className="muted">Loading…</p></main>

  const chapters = Array.from({ length: dataset.manifest.chapters }, (_, i) => i + 1)
  const label = chapterLabel(chapterCap)
  const nounsInScope = dataset.entries.filter(
    (e) => e.pos === 'n' && inChapterScope(e.chapter, { cap: chapterCap, only: chapterOnly }),
  ).length

  const adjectives = pool.modifiers.filter((e) => e.pos === 'adj').length

  const empty =
    nounsInScope === 0 ? (
      <p>No nouns in chapter {label}.</p>
    ) : exercise === 'fill-the-chart' && adjectives === 0 ? (
      <p>
        Filling in the chart needs an adjective — the first ones arrive in chapter 5.
      </p>
    ) : !pool.modifiers.length ? (
      <p>
        No adjectives or pronouns through chapter {label} yet — the first adjectives
        arrive in chapter 5.
      </p>
    ) : (
      <p>Nothing to practise with these settings.</p>
    )

  return (
    <main className="page">
      <div className="page-head">
        <h1>Agreement</h1>
        <div className="page-head-controls">
          <label className="muted">
            through chapter{' '}
            <select value={chapterCap} onChange={(e) => updateCap(Number(e.target.value))}>
              {chapters.map((c) => (
                <option key={c} value={c}>{chapterLabel(c)}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={chapterOnly}
            className={'switch' + (chapterOnly ? ' on' : '')}
            onClick={() => toggle(!chapterOnly, setChapterOnly, 'study.chapterOnly')}
            title="Draw nouns from this chapter alone"
          >
            <span className="switch-track"><span className="switch-thumb" /></span>
            only ch. {label}
          </button>
          {PAIR_EXERCISES.has(exercise) && (
            <>
              <button
                type="button"
                role="switch"
                aria-checked={easyMode}
                className={'switch' + (easyMode ? ' on' : '')}
                onClick={() => toggle(!easyMode, setEasyMode, 'agree.easyMode')}
                title="Show both paradigms while you work"
              >
                <span className="switch-track"><span className="switch-thumb" /></span>
                Easy mode
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={feedback}
                className={'switch' + (feedback ? ' on' : '')}
                onClick={() => toggle(!feedback, setFeedback, 'agree.feedback')}
                title="Walk through the agreement after each answer"
              >
                <span className="switch-track"><span className="switch-thumb" /></span>
                Feedback
              </button>
            </>
          )}
        </div>
      </div>

      <div className="agree-tabs" role="tablist">
        {EXERCISES.map(([value, text]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={exercise === value}
            className={exercise === value ? 'toggle on' : 'toggle'}
            onClick={() => toggle(value, setExercise, 'agree.exercise')}
          >
            {text}
          </button>
        ))}
      </div>

      {chapterOnly && (
        <p className="muted agree-scope-note">
          Nouns from ch. {label}
          {exercise !== 'which-gender' && ` · modifiers through ch. ${label}`}
        </p>
      )}

      <AgreementRound
        key={`${exercise}:${chapterCap}:${chapterOnly}`}
        pool={pool}
        pronounForms={pronounForms}
        exercise={exercise}
        easyMode={easyMode}
        feedback={feedback}
        onScore={(correct) =>
          setScore((s) => ({ done: s.done + 1, right: s.right + (correct ? 1 : 0) }))
        }
        empty={empty}
      />

      {score.done > 0 && (
        <p className="muted session-score">
          This session: {score.right}/{score.done} right
        </p>
      )}
    </main>
  )
}
