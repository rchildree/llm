/** Structured vocab + generated-forms dataset schema, shared by the app and build scripts. */

export type Pos =
  | 'n' | 'adj' | 'v' | 'pron'
  | 'adv' | 'prep' | 'conj' | 'num' | 'particle' | 'phrase' | 'other'

export type EntryGender = 'm' | 'f' | 'n' | 'mf'

export interface VocabEntry {
  id: string
  /** effective chapter for the chapter-cap filter (min of all listed appearances) */
  chapter: number
  pos: Pos
  /** first principal part / citation form, macrons preserved */
  lemma: string
  /** original DICT string verbatim, for display on cards */
  dict: string
  definition: string
  /** principal parts (verbs) or termination forms (adjectives); pp[0] === lemma */
  pp: [string, string | null, string | null, string | null]
  gender?: EntryGender
  /** genitive singular when given separately (1-term adjectives, some nouns) */
  genSg?: string
  flags: string[]
  /** filename in overrides/ that patched or replaced this entry, if any */
  morphOverride?: string
  /** inflection class for drill filters: declension 1–5, conjugation 1/2/3/3io/4, adj 1-2/3, or 'irreg' (published datasets only) */
  cls?: string
}

/** Grammatical analysis of one surface form. Short keys keep the emitted JSON small. */
export interface Analysis {
  /** kind: nominal | finite verb | infinitive | participle | imperative */
  k: 'nom' | 'fin' | 'inf' | 'ptc' | 'imp'
  /** case */
  c?: 'nom' | 'gen' | 'dat' | 'acc' | 'abl' | 'voc' | 'loc'
  /** number */
  n?: 'sg' | 'pl'
  /** gender */
  g?: 'm' | 'f' | 'n'
  /** degree (adjectives) */
  d?: 'pos' | 'comp' | 'superl'
  /** tense */
  t?: 'pres' | 'impf' | 'fut' | 'pf' | 'plupf' | 'futpf'
  /** mood (finite) */
  m?: 'ind' | 'subj'
  /** voice */
  v?: 'act' | 'pass'
  /** person */
  p?: '1' | '2' | '3'
}

/** One surface form of one lemma, with every analysis that produces it. */
export interface FormRecord {
  s: string
  /** lemma id (VocabEntry.id) */
  l: string
  a: Analysis[]
}

export interface DatasetManifest {
  id: string
  name: string
  version: string
  chapters: number
  entries: string
  forms: Partial<Record<'n' | 'adj' | 'v' | 'pron', string>>
  stats: { entries: number; surfaces: number }
}

export interface DatasetIndex {
  datasets: Array<{ id: string; name: string; path: string }>
  default: string
}
