import { useEffect, useMemo, useState } from 'react'
import { useDataset } from '../app/DatasetContext'
import FlashDeck, { type FlashMode } from '../components/FlashDeck'
import { chapterLabel, inChapterScope } from '../lib/chapters'
import type { Word } from '../lib/flash/types'
import { getSetting, setSetting } from '../storage/settings'

export default function Flashcards() {
  const { dataset, error } = useDataset()
  const [chapterCap, setChapterCap] = useState<number | null>(null)
  const [chapterOnly, setChapterOnly] = useState(false)
  const [mode, setMode] = useState<FlashMode>('flip')

  useEffect(() => {
    Promise.all([
      getSetting<number>('study.chapterCap', 10),
      getSetting<boolean>('study.chapterOnly', false),
      getSetting<FlashMode>('flash.mode', 'flip'),
    ]).then(([cap, only, saved]) => {
      setChapterCap(cap)
      setChapterOnly(only)
      setMode(saved)
    })
  }, [])

  const pool: Word[] = useMemo(() => {
    if (chapterCap === null) return []
    return (dataset?.entries ?? [])
      .filter((e) => inChapterScope(e.chapter, { cap: chapterCap, only: chapterOnly }))
      .map((e) => ({ id: e.id, entry: e.dict, definition: e.definition, chapter: e.chapter }))
  }, [dataset, chapterCap, chapterOnly])

  const updateCap = (cap: number) => {
    setChapterCap(cap)
    void setSetting('study.chapterCap', cap)
  }

  const toggleOnly = () => {
    setChapterOnly((v) => {
      void setSetting('study.chapterOnly', !v)
      return !v
    })
  }

  const toggleMode = () => {
    setMode((m) => {
      const next: FlashMode = m === 'flip' ? 'choice' : 'flip'
      void setSetting('flash.mode', next)
      return next
    })
  }

  if (error) return <main className="page"><h1>Flashcards</h1><p>Could not load vocabulary: {error}</p></main>
  if (!dataset || chapterCap === null)
    return <main className="page"><h1>Flashcards</h1><p className="muted">Loading…</p></main>

  const chapters = Array.from({ length: dataset.manifest.chapters }, (_, i) => i + 1)

  return (
    <main className="page">
      <div className="page-head">
        <h1>Flashcards</h1>
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
            onClick={toggleOnly}
            title="Use only this chapter's words, not everything up to it"
          >
            <span className="switch-track"><span className="switch-thumb" /></span>
            only ch. {chapterLabel(chapterCap)}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={mode === 'choice'}
            className={'switch' + (mode === 'choice' ? ' on' : '')}
            onClick={toggleMode}
            title="Answer from four options instead of flipping the card"
          >
            <span className="switch-track"><span className="switch-thumb" /></span>
            Multiple choice
          </button>
        </div>
      </div>

      {pool.length === 0 ? (
        <div className="card">
          <p>No words in chapter {chapterLabel(chapterCap)}.</p>
        </div>
      ) : (
        <FlashDeck key={`${chapterCap}:${chapterOnly}`} pool={pool} mode={mode} />
      )}
    </main>
  )
}
