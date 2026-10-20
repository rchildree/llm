import { useEffect, useMemo, useState } from 'react'
import { useDataset } from '../app/DatasetContext'
import AgreementRound, { type Exercise } from '../components/agree/AgreementRound'
import MultiToggle from '../components/MultiToggle'
import { chapterLabel, inChapterScope } from '../lib/chapters'
import { AGREE_CASES, indexPronounForms, type PronounForms } from '../lib/agree/paradigm'
import { buildAgreementPool } from '../lib/agree/pairing'
import {
  ALL_MODIFIER_KINDS,
  DEFAULT_AGREE_OPTIONS,
  type AgreementOptions,
} from '../lib/agree/options'
import {
  ALL_ADJ_CLASSES,
  ALL_CASES_NO_VOC,
  ALL_DECLENSIONS,
  ALL_NUMBERS,
} from '../lib/drill/config'
import { CASE_LABELS } from '../lib/morph/labels'
import { getSetting, setSetting } from '../storage/settings'

const EXERCISES: Array<[Exercise, string]> = [
  ['does-it-match', 'Does it match?'],
  ['make-it-agree', 'Make it agree'],
  ['fill-the-chart', 'Fill in the chart'],
  ['which-gender', 'Gender'],
]

/** the two switches — and the slot options — that only mean anything for a pair on screen */
const PAIR_EXERCISES = new Set<Exercise>(['does-it-match', 'make-it-agree'])

const ADJ_CLASSES: Array<[string, string]> = [
  ['1-2', '–us –a –um'],
  ['3', '3rd decl.'],
  ['irreg', 'irreg.'],
]
const MODIFIER_KINDS: Array<[string, string]> = [
  ['adj', 'adjectives'],
  ['pron', 'pronouns'],
]
// no vocative in this section, so the chips are the five cases it drills
const CASES: Array<[string, string]> = AGREE_CASES.map((c) => [c, CASE_LABELS[c]])
const NUMBERS: Array<[string, string]> = [
  ['sg', 'singular'],
  ['pl', 'plural'],
]

export default function Agreement() {
  const { dataset, error } = useDataset()
  const [chapterCap, setChapterCap] = useState<number | null>(null)
  const [chapterOnly, setChapterOnly] = useState(false)
  const [exercise, setExercise] = useState<Exercise>('does-it-match')
  const [easyMode, setEasyMode] = useState(false)
  const [feedback, setFeedback] = useState(true)
  const [pronounForms, setPronounForms] = useState<PronounForms | null>(null)
  const [genderHard, setGenderHard] = useState(false)
  const [options, setOptions] = useState<AgreementOptions>(DEFAULT_AGREE_OPTIONS)
  const [showOptions, setShowOptions] = useState(false)
  const [score, setScore] = useState({ done: 0, right: 0 })

  useEffect(() => {
    Promise.all([
      getSetting<number>('study.chapterCap', 10),
      getSetting<boolean>('study.chapterOnly', false),
      getSetting<Exercise>('agree.exercise', 'does-it-match'),
      getSetting<boolean>('agree.easyMode', false),
      getSetting<boolean>('agree.feedback', true),
      getSetting<AgreementOptions>('agree.options', DEFAULT_AGREE_OPTIONS),
      getSetting<boolean>('agree.genderHard', false),
    ]).then(([cap, only, saved, easy, fb, opts, hard]) => {
      setChapterCap(cap)
      setChapterOnly(only)
      setExercise(saved)
      setEasyMode(easy)
      setFeedback(fb)
      setOptions({ ...DEFAULT_AGREE_OPTIONS, ...opts })
      setGenderHard(hard)
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
    // the chart is adjective-only by design, so "pronouns alone" must not
    // empty it out — that choice simply has nothing to say there
    const effective =
      exercise === 'fill-the-chart' ? { ...options, modifierKinds: ['adj'] } : options
    return buildAgreementPool(
      dataset.entries,
      { cap: chapterCap, only: chapterOnly },
      pronounForms,
      effective,
    )
  }, [dataset, chapterCap, chapterOnly, pronounForms, options, exercise])

  const updateCap = (cap: number) => {
    setChapterCap(cap)
    void setSetting('study.chapterCap', cap)
  }

  const toggle = <T,>(value: T, set: (v: T) => void, key: string) => {
    set(value)
    void setSetting(key, value)
  }

  const update = (patch: Partial<AgreementOptions>) => {
    setOptions((prev) => {
      const next = { ...prev, ...patch }
      void setSetting('agree.options', next)
      return next
    })
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
  const allDeclensions = options.declensions.length === ALL_DECLENSIONS.length
  const allAdjClasses = options.adjClasses.length === ALL_ADJ_CLASSES.length

  const empty =
    !pool.nouns.length ? (
      nounsInScope === 0 || allDeclensions ? (
        <p>No nouns in chapter {label}.</p>
      ) : (
        <p>No nouns of these declensions in chapter {label} — widen them in Options.</p>
      )
    ) : exercise === 'fill-the-chart' && adjectives === 0 ? (
      allAdjClasses ? (
        <p>Filling in the chart needs an adjective — the first ones arrive in chapter 5.</p>
      ) : (
        <p>No adjectives of these types through chapter {label} — widen them in Options.</p>
      )
    ) : !pool.modifiers.length ? (
      allAdjClasses && options.modifierKinds.length === ALL_MODIFIER_KINDS.length ? (
        <p>
          No adjectives or pronouns through chapter {label} yet — the first adjectives
          arrive in chapter 5.
        </p>
      ) : (
        <p>No modifiers of these kinds through chapter {label} — widen them in Options.</p>
      )
    ) : !pool.slots.length ? (
      <p>Choose at least one case and one number in Options.</p>
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
          {exercise === 'which-gender' && (
            <button
              type="button"
              role="switch"
              aria-checked={genderHard}
              className={'switch' + (genderHard ? ' on' : '')}
              onClick={() => toggle(!genderHard, setGenderHard, 'agree.genderHard')}
              title="Show an inflected form, and hold the dictionary entry back"
            >
              <span className="switch-track"><span className="switch-thumb" /></span>
              Hard mode
            </button>
          )}
          <button className="btn-secondary" onClick={() => setShowOptions((v) => !v)}>
            {showOptions ? 'Hide options' : 'Options'}
          </button>
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

      {showOptions && (
        <div className="card options">
          <div className="opt-group">
            <span className="opt-label">Declensions</span>
            <MultiToggle
              values={options.declensions}
              options={ALL_DECLENSIONS}
              all={ALL_DECLENSIONS}
              onChange={(declensions) => update({ declensions })}
            />
          </div>

          {PAIR_EXERCISES.has(exercise) && (
            <div className="opt-group">
              <span className="opt-label">Modifiers</span>
              <MultiToggle
                values={options.modifierKinds}
                options={MODIFIER_KINDS}
                all={ALL_MODIFIER_KINDS}
                onChange={(modifierKinds) => update({ modifierKinds })}
              />
            </div>
          )}

          {exercise !== 'which-gender' && (
            <div className="opt-group">
              <span className="opt-label">Adjective type</span>
              <MultiToggle
                values={options.adjClasses}
                options={ADJ_CLASSES}
                all={ALL_ADJ_CLASSES}
                onChange={(adjClasses) => update({ adjClasses })}
              />
            </div>
          )}

          {PAIR_EXERCISES.has(exercise) && (
            <>
              <div className="opt-group">
                <span className="opt-label">Cases</span>
                <MultiToggle
                  values={options.cases}
                  options={CASES}
                  all={ALL_CASES_NO_VOC}
                  onChange={(cases) => update({ cases })}
                />
              </div>
              <div className="opt-group">
                <span className="opt-label">Numbers</span>
                <MultiToggle
                  values={options.numbers}
                  options={NUMBERS}
                  all={ALL_NUMBERS}
                  onChange={(numbers) => update({ numbers })}
                />
              </div>
            </>
          )}

          {exercise === 'fill-the-chart' && (
            <p className="muted opt-note">
              The chart is always the whole paradigm, so cases and numbers do not apply
              here — and its modifier is always an adjective.
            </p>
          )}
          {exercise === 'which-gender' && (
            <p className="muted opt-note">
              Gender asks about the noun alone, so only the declensions apply here.
            </p>
          )}
        </div>
      )}

      {chapterOnly && (
        <p className="muted agree-scope-note">
          Nouns from ch. {label}
          {exercise !== 'which-gender' && ` · modifiers through ch. ${label}`}
        </p>
      )}

      <AgreementRound
        key={`${exercise}:${chapterCap}:${chapterOnly}:${genderHard}`}
        pool={pool}
        pronounForms={pronounForms}
        exercise={exercise}
        easyMode={easyMode}
        feedback={feedback}
        genderHard={genderHard}
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
