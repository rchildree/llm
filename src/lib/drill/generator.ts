/**
 * Drill question generator. Pure and seeded so questions are reproducible
 * and property-testable.
 *
 * Correctness invariant: a chip is "correct" iff ANY of its analyses —
 * merged across every lemma in the active pool that shares the surface —
 * matches the target. Distractors are sampled only from surfaces with no
 * matching analysis, so a chip can never be accidentally right.
 */
import { inChapterScope } from '../chapters'
import type { Analysis, VocabEntry } from '../dataset/types'
import { targetById } from './categories'
import type { Chip, DrillConfig, DrillPool, FormsByPos, Question, Target } from './types'

/** mulberry32 seeded PRNG */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A question always asks for between MIN_CORRECT and MAX_CORRECT correct forms. */
export const MIN_CORRECT = 2
export const MAX_CORRECT = 8

const MODE_POS: Record<DrillConfig['mode'], Array<'n' | 'adj' | 'v' | 'pron'>> = {
  'noun-adj': ['n', 'adj'],
  noun: ['n'],
  adj: ['adj'],
  verb: ['v'],
  pron: ['pron'],
  ptc: ['v'],
}

function entryIncluded(entry: VocabEntry, config: DrillConfig): boolean {
  if (!inChapterScope(entry.chapter, { cap: config.chapterCap, only: config.chapterOnly })) return false
  if (entry.pos === 'n' && config.declensions.length && !config.declensions.includes(entry.cls ?? '')) return false
  if (entry.pos === 'adj' && config.adjClasses.length && !config.adjClasses.includes(entry.cls ?? '')) return false
  if (entry.pos === 'v') {
    if (config.conjugations.length && !config.conjugations.includes(entry.cls ?? '')) return false
    if (!config.includeDeponents && entry.flags.includes('deponent')) return false
  }
  return true
}

function analysisIncluded(a: Analysis, config: DrillConfig): boolean {
  if (config.mode === 'ptc') return a.k === 'ptc'
  if (a.k === 'ptc') return false // participles drill separately
  if (!config.includeVocative && a.c === 'voc') return false
  if (!config.includePassives && a.v === 'pass' && a.k === 'fin') return false
  if (!config.includeSubjunctives && a.m === 'subj') return false
  if (!config.includeInfinitives && a.k === 'inf') return false
  return true
}

export function buildPool(entries: VocabEntry[], forms: FormsByPos, config: DrillConfig): DrillPool {
  const wanted = new Set(MODE_POS[config.mode])
  const poolEntries = new Map<string, VocabEntry>()
  for (const e of entries) {
    if (wanted.has(e.pos as 'n') && entryIncluded(e, config)) poolEntries.set(e.id, e)
  }

  const index = new Map<string, { analyses: Analysis[]; lemmas: string[] }>()
  for (const pos of wanted) {
    for (const record of forms[pos] ?? []) {
      if (!poolEntries.has(record.l)) continue
      const analyses = record.a.filter((a) => analysisIncluded(a, config))
      if (!analyses.length) continue
      let slot = index.get(record.s)
      if (!slot) index.set(record.s, (slot = { analyses: [], lemmas: [] }))
      slot.analyses.push(...analyses)
      if (!slot.lemmas.includes(record.l)) slot.lemmas.push(record.l)
    }
  }
  return { entries: poolEntries, index }
}

export function matchesTarget(analyses: Analysis[], target: Target): boolean {
  return analyses.some((a) =>
    Object.entries(target.match).every(([k, v]) => a[k as keyof Analysis] === v),
  )
}

function sample<T>(items: T[], count: number, random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, count)
}

export function generateQuestion(pool: DrillPool, config: DrillConfig, seed: number): Question | null {
  const random = rng(seed)
  const enabled = config.targets.map((id) => targetById.get(id)).filter((t): t is Target => Boolean(t))
  const candidates = sample(enabled, enabled.length, random)

  for (const target of candidates) {
    const matching: string[] = []
    const rest: string[] = []
    for (const [surface, slot] of pool.index) {
      ;(matchesTarget(slot.analyses, target) ? matching : rest).push(surface)
    }

    // number of correct chips is always in [MIN_CORRECT, MAX_CORRECT], further
    // capped by available matches, one guaranteed distractor, and enough
    // distractors on hand to fill the rest of the grid
    const upper = Math.min(MAX_CORRECT, config.chipCount - 1, matching.length)
    const lower = Math.max(MIN_CORRECT, config.chipCount - rest.length)
    if (lower > upper) continue
    const correctCount = lower + Math.floor(random() * (upper - lower + 1))
    const distractorCount = config.chipCount - correctCount

    const chosen = [
      ...sample(matching, correctCount, random).map((s) => ({ s, correct: true })),
      ...sample(rest, distractorCount, random).map((s) => ({ s, correct: false })),
    ]
    const chips: Chip[] = sample(chosen, chosen.length, random).map(({ s, correct }) => ({
      s,
      correct,
      analyses: pool.index.get(s)!.analyses,
      lemmas: pool.index.get(s)!.lemmas,
    }))
    return { target, chips, correctCount }
  }
  return null
}

export interface Grade {
  hits: number
  misses: number
  falseAlarms: number
  targets: number
  perfect: boolean
}

export function gradeSelection(question: Question, selected: Set<string>): Grade {
  let hits = 0
  let falseAlarms = 0
  for (const chip of question.chips) {
    if (selected.has(chip.s)) {
      if (chip.correct) hits++
      else falseAlarms++
    }
  }
  const targets = question.correctCount
  return {
    hits,
    misses: targets - hits,
    falseAlarms,
    targets,
    perfect: hits === targets && falseAlarms === 0,
  }
}
