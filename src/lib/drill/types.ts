import type { Analysis, FormRecord, VocabEntry } from '../dataset/types'

/** What a drill question asks for. A chip is correct if ANY of its merged analyses matches. */
export interface Target {
  id: string
  label: string
  match: Partial<Analysis>
}

export type DrillMode = 'noun-adj' | 'noun' | 'adj' | 'verb' | 'pron' | 'ptc'

export interface DrillConfig {
  chapterCap: number
  /** true = drill only chapterCap itself, false = everything through it */
  chapterOnly: boolean
  mode: DrillMode
  /** noun declensions to include (empty = all): '1'..'5', 'irreg' */
  declensions: string[]
  /** adjective classes to include (empty = all): '1-2', '3', 'irreg' */
  adjClasses: string[]
  /** verb conjugations to include (empty = all): '1','2','3','3io','4','irreg' */
  conjugations: string[]
  includePassives: boolean
  includeSubjunctives: boolean
  includeInfinitives: boolean
  includeVocative: boolean
  includeDeponents: boolean
  /** enabled target ids; question targets are drawn from these */
  targets: string[]
  chipCount: number
}

/** One selectable chip: a surface with its merged (cross-lemma) analyses. */
export interface Chip {
  s: string
  correct: boolean
  /** all pool analyses of this surface, for the reveal explanation */
  analyses: Analysis[]
  /** lemma ids this surface belongs to */
  lemmas: string[]
}

export interface Question {
  target: Target
  chips: Chip[]
  correctCount: number
}

export interface DrillPool {
  entries: Map<string, VocabEntry>
  /** surface → merged analyses + lemmas across the whole filtered pool */
  index: Map<string, { analyses: Analysis[]; lemmas: string[] }>
}

export type FormsByPos = Partial<Record<'n' | 'adj' | 'v' | 'pron', FormRecord[]>>
