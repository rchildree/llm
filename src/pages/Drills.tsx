import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDataset } from '../app/DatasetContext'
import WhichAreDrill from '../components/WhichAreDrill'
import {
  ALL_ADJ_CLASSES, ALL_CASES_NO_VOC, ALL_CONJUGATIONS, ALL_DECLENSIONS,
  ALL_NUMBERS, ALL_PERSON_NUMBERS, ALL_PTC_TYPES, ALL_TENSES,
  DEFAULT_OPTIONS, toConfig, type DrillOptions,
} from '../lib/drill/config'
import { buildPool, generateQuestion, type Grade } from '../lib/drill/generator'
import type { DrillMode, DrillPool, FormsByPos, Question } from '../lib/drill/types'
import { getSetting, setSetting } from '../storage/settings'

const MODES: Array<[DrillMode, string]> = [
  ['noun-adj', 'Nouns + adjectives'],
  ['noun', 'Nouns'],
  ['adj', 'Adjectives'],
  ['verb', 'Verbs'],
  ['pron', 'Pronouns'],
  ['ptc', 'Participles'],
]

const DECLENSIONS = ALL_DECLENSIONS
const ADJ_CLASSES: Array<[string, string]> = [['1-2', '–us –a –um'], ['3', '3rd decl.'], ['irreg', 'irreg.']]
const CONJUGATIONS = ALL_CONJUGATIONS
const CASES = ['nom', 'gen', 'dat', 'acc', 'abl', 'voc']
const NUMBERS: Array<[string, string]> = [['sg', 'singular'], ['pl', 'plural']]
const TENSES: Array<[string, string]> = [
  ['pres', 'present'], ['impf', 'imperfect'], ['fut', 'future'],
  ['pf', 'perfect'], ['plupf', 'pluperfect'], ['futpf', 'fut. perfect'],
]
const PERSON_NUMBERS: Array<[string, string]> = [
  ['1sg', '1st sg.'], ['2sg', '2nd sg.'], ['3sg', '3rd sg.'],
  ['1pl', '1st pl.'], ['2pl', '2nd pl.'], ['3pl', '3rd pl.'],
]
const PTC_TYPES: Array<[string, string]> = [
  ['ptc.pres.act', 'present active'],
  ['ptc.pf.pass', 'perfect passive'],
  ['ptc.fut.act', 'future active'],
  ['ptc.fut.pass', 'gerundive'],
]

function MultiToggle({
  values, options, onChange, all,
}: {
  values: string[]
  options: Array<[string, string]> | string[]
  onChange: (values: string[]) => void
  /** values selected by the "All" shortcut (may deliberately exclude e.g. voc) */
  all?: string[]
}) {
  const opts: Array<[string, string]> = options.map((o) => (Array.isArray(o) ? o : [o, o]))
  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
  const allOn = all !== undefined && all.every((v) => values.includes(v)) && values.length === all.length
  return (
    <div className="multi-toggle">
      {all !== undefined && (
        <button
          type="button"
          className={allOn ? 'toggle on' : 'toggle'}
          onClick={() => onChange([...all])}
        >
          All
        </button>
      )}
      {opts.map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={values.includes(value) ? 'toggle on' : 'toggle'}
          onClick={() => toggle(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  )
}

const isNominal = (mode: DrillMode) => ['noun-adj', 'noun', 'adj', 'pron'].includes(mode)

export default function Drills() {
  const { dataset, error } = useDataset()
  const [options, setOptions] = useState<DrillOptions>(DEFAULT_OPTIONS)
  const [optionsLoaded, setOptionsLoaded] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [forms, setForms] = useState<FormsByPos | null>(null)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31))
  const [score, setScore] = useState({ done: 0, perfect: 0 })
  const [helpMode, setHelpMode] = useState(false)

  // restore persisted options + shared chapter cap + help mode
  useEffect(() => {
    Promise.all([
      getSetting<DrillOptions>('drill.options', DEFAULT_OPTIONS),
      getSetting<number | null>('study.chapterCap', null),
      getSetting<boolean>('study.chapterOnly', false),
      getSetting<boolean>('drill.helpMode', false),
    ]).then(([saved, cap, only, help]) => {
      setOptions({
        ...DEFAULT_OPTIONS,
        ...saved,
        ...(cap !== null ? { chapterCap: cap } : {}),
        chapterOnly: only,
      })
      setHelpMode(help)
      setOptionsLoaded(true)
    })
  }, [])

  const toggleHelp = useCallback(() => {
    setHelpMode((h) => {
      void setSetting('drill.helpMode', !h)
      return !h
    })
  }, [])

  // lemma id → dictionary entry, for help-mode popovers
  const entriesById = useMemo(
    () => new Map((dataset?.entries ?? []).map((e) => [e.id, e])),
    [dataset],
  )

  const update = useCallback((patch: Partial<DrillOptions>) => {
    setOptions((prev) => {
      const next = { ...prev, ...patch }
      void setSetting('drill.options', next)
      if (patch.chapterCap !== undefined) void setSetting('study.chapterCap', patch.chapterCap)
      if (patch.chapterOnly !== undefined) void setSetting('study.chapterOnly', patch.chapterOnly)
      return next
    })
  }, [])

  // load the form chunks the current mode needs
  useEffect(() => {
    if (!dataset || !optionsLoaded) return
    let cancelled = false
    const needed = options.mode === 'noun-adj' ? (['n', 'adj'] as const)
      : options.mode === 'noun' ? (['n'] as const)
      : options.mode === 'adj' ? (['adj'] as const)
      : options.mode === 'pron' ? (['pron'] as const)
      : (['v'] as const)
    Promise.all(needed.map((pos) => dataset.forms(pos).then((f) => [pos, f] as const))).then((loaded) => {
      if (!cancelled) setForms(Object.fromEntries(loaded))
    })
    return () => {
      cancelled = true
    }
  }, [dataset, options.mode, optionsLoaded])

  const pool: DrillPool | null = useMemo(() => {
    if (!dataset || !forms) return null
    return buildPool(dataset.entries, forms, toConfig(options))
  }, [dataset, forms, options])

  const question: Question | null = useMemo(() => {
    if (!pool) return null
    return generateQuestion(pool, toConfig(options), seed)
  }, [pool, options, seed])

  const onNext = useCallback(
    (grade: Grade) => {
      setScore((s) => ({ done: s.done + 1, perfect: s.perfect + (grade.perfect ? 1 : 0) }))
      setSeed(Math.floor(Math.random() * 2 ** 31))
    },
    [],
  )

  if (error) return <main className="page"><h1>Form Drills</h1><p>Could not load vocabulary: {error}</p></main>
  if (!dataset || !optionsLoaded) return <main className="page"><h1>Form Drills</h1><p className="muted">Loading…</p></main>

  const chapters = Array.from({ length: dataset.manifest.chapters }, (_, i) => i + 1)

  return (
    <main className="page">
      <div className="page-head">
        <h1>Form Drills</h1>
        <div className="page-head-controls">
          <label className="muted">
            through chapter{' '}
            <select
              value={options.chapterCap}
              onChange={(e) => update({ chapterCap: Number(e.target.value) })}
            >
              {chapters.map((c) => (
                <option key={c} value={c}>{c > 40 ? `RL${c - 40}` : c}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={options.chapterOnly}
            className={'switch' + (options.chapterOnly ? ' on' : '')}
            onClick={() => update({ chapterOnly: !options.chapterOnly })}
            title="Drill only this chapter's words, not everything up to it"
          >
            <span className="switch-track"><span className="switch-thumb" /></span>
            only
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={helpMode}
            className={'switch' + (helpMode ? ' on' : '')}
            onClick={toggleHelp}
            title="Show each form's dictionary entry"
          >
            <span className="switch-track"><span className="switch-thumb" /></span>
            Help mode
          </button>
          <button className="btn-secondary" onClick={() => setShowOptions((v) => !v)}>
            {showOptions ? 'Hide options' : 'Options'}
          </button>
        </div>
      </div>

      {showOptions && (
        <div className="card options">
          <div className="opt-row">
            <label>Drill
              <select value={options.mode} onChange={(e) => update({ mode: e.target.value as DrillMode, })}>
                {MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          {(options.mode === 'noun' || options.mode === 'noun-adj') && (
            <div className="opt-group">
              <span className="opt-label">Declensions</span>
              <MultiToggle values={options.declensions} options={DECLENSIONS} all={ALL_DECLENSIONS}
                onChange={(declensions) => update({ declensions })} />
            </div>
          )}

          {(options.mode === 'adj' || options.mode === 'noun-adj') && (
            <div className="opt-group">
              <span className="opt-label">Adjective type</span>
              <MultiToggle values={options.adjClasses} options={ADJ_CLASSES} all={ALL_ADJ_CLASSES}
                onChange={(adjClasses) => update({ adjClasses })} />
            </div>
          )}

          {(options.mode === 'verb' || options.mode === 'ptc') && (
            <div className="opt-group">
              <span className="opt-label">Conjugations</span>
              <MultiToggle values={options.conjugations} options={CONJUGATIONS} all={ALL_CONJUGATIONS}
                onChange={(conjugations) => update({ conjugations })} />
            </div>
          )}

          {isNominal(options.mode) && (
            <>
              <div className="opt-group">
                <span className="opt-label">Cases</span>
                <MultiToggle values={options.cases} options={CASES} all={ALL_CASES_NO_VOC}
                  onChange={(cases) => update({ cases })} />
              </div>
              <div className="opt-group">
                <span className="opt-label">Numbers</span>
                <MultiToggle values={options.numbers} options={NUMBERS} all={ALL_NUMBERS}
                  onChange={(numbers) => update({ numbers })} />
              </div>
            </>
          )}

          {options.mode === 'verb' && (
            <>
              <div className="opt-group">
                <span className="opt-label">Tenses</span>
                <MultiToggle values={options.tenses} options={TENSES} all={ALL_TENSES}
                  onChange={(tenses) => update({ tenses })} />
              </div>
              <div className="opt-group">
                <span className="opt-label">Person + number</span>
                <MultiToggle values={options.personNumbers} options={PERSON_NUMBERS} all={ALL_PERSON_NUMBERS}
                  onChange={(personNumbers) => update({ personNumbers })} />
              </div>
              <div className="opt-row">
                <Check label="combined tense + person questions" value={options.combineTensePerson}
                  onChange={(combineTensePerson) => update({ combineTensePerson })} />
                <Check label="passives" value={options.includePassives}
                  onChange={(includePassives) => update({ includePassives })} />
                <Check label="subjunctives" value={options.includeSubjunctives}
                  onChange={(includeSubjunctives) => update({ includeSubjunctives })} />
                <Check label="infinitives" value={options.includeInfinitives}
                  onChange={(includeInfinitives) => update({ includeInfinitives })} />
                <Check label="deponents" value={options.includeDeponents}
                  onChange={(includeDeponents) => update({ includeDeponents })} />
              </div>
            </>
          )}

          {options.mode === 'ptc' && (
            <div className="opt-group">
              <span className="opt-label">Participle types</span>
              <MultiToggle values={options.participleTypes} options={PTC_TYPES} all={ALL_PTC_TYPES}
                onChange={(participleTypes) => update({ participleTypes })} />
            </div>
          )}
        </div>
      )}

      {question ? (
        <WhichAreDrill question={question} onNext={onNext} helpMode={helpMode} entriesById={entriesById} />
      ) : (
        <div className="card">
          <p>
            No question fits these settings — try raising the chapter, adding cases or tenses, or
            lowering “min correct.”
          </p>
        </div>
      )}

      {score.done > 0 && (
        <p className="muted session-score">
          This session: {score.perfect}/{score.done} perfect
        </p>
      )}
    </main>
  )
}
