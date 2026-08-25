/**
 * Adapter between the dataset's VocabEntry and the vendored chart-workbench
 * morphology engine. All engine extensions (compound irregulars, mixed
 * i-stems, plural-only citation, perfect-only defectives) live here so
 * morphology.ts stays byte-compatible with upstream.
 */
import {
  deriveAdjectiveStem,
  deriveNounDeclension,
  deriveNounStem,
  deriveVerbConjugation,
  detectIrregularVerb,
  generateEntrySections,
  inferDeponentVerb,
  deriveVerbStems,
} from './morphology'
import type {
  AdjectiveEntry,
  ChartSection,
  Gender,
  LatinCase,
  LatinNumber,
  NounEntry,
  Person,
  PronounEntry,
  PronounType,
  VerbEntry,
  VerbTense,
  VisibilitySettings,
} from './types'
import type { Analysis, FormRecord, VocabEntry } from '../dataset/types'

const FULL_VISIBILITY: VisibilitySettings = {
  cases: ['nom', 'gen', 'dat', 'acc', 'abl', 'voc'],
  showLocative: false,
  showInfinitives: true,
  showParticiples: true,
  showImperatives: true,
  showIndicativeActive: true,
  showIndicativePassive: true,
  showSubjunctiveActive: true,
  showSubjunctivePassive: true,
}

const demacron = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

const stripSuffix = (s: string, suffixes: string[]): string | null => {
  const plain = demacron(s)
  for (const suf of suffixes) {
    if (plain.endsWith(suf)) return s.slice(0, s.length - suf.length)
  }
  return null
}

/** Collects surface → analyses, deduplicating identical analyses. */
class Collector {
  private map = new Map<string, Map<string, Analysis>>()

  add(surface: string, analysis: Analysis) {
    const s = surface.trim()
    if (!s || s === '—' || s.includes('—') || s.includes('?')) return
    if (s.includes('/')) {
      for (const alt of s.split('/')) this.add(alt, analysis)
      return
    }
    const key = JSON.stringify(
      Object.entries(analysis)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b)),
    )
    let inner = this.map.get(s)
    if (!inner) this.map.set(s, (inner = new Map()))
    if (!inner.has(key)) inner.set(key, analysis)
  }

  toRecords(lemmaId: string): FormRecord[] {
    return [...this.map.entries()].map(([s, inner]) => ({
      s,
      l: lemmaId,
      a: [...inner.values()],
    }))
  }
}

/**
 * Inflection class for drill filtering: noun declension 1–5, verb
 * conjugation 1/2/3/3io/4, adjective 1-2/3, or 'irreg'.
 */
export function classifyEntry(entry: VocabEntry): string | undefined {
  const [pp1, pp2, pp3] = entry.pp
  switch (entry.pos) {
    case 'n': {
      if (!pp2) return 'irreg'
      if (entry.flags.includes('defective')) return 'irreg'
      if (entry.flags.includes('plural-only')) {
        const sufs: Array<[string, string]> = [['arum', '1'], ['orum', '2'], ['uum', '4'], ['erum', '5'], ['um', '3']]
        const hit = sufs.find(([suf]) => demacron(pp2).endsWith(suf))
        return hit?.[1] ?? 'irreg'
      }
      return deriveNounDeclension(pp2)
    }
    case 'adj': {
      if (entry.flags.includes('pronominal')) return 'irreg'
      if (entry.flags.includes('comp') || entry.flags.includes('1term')) return '3'
      if (!pp3) return 'irreg'
      return demacron(pp3).endsWith('e') ? '3' : '1-2'
    }
    case 'v': {
      if (!pp1 || !pp2) return 'irreg'
      if (entry.flags.includes('irreg') || entry.flags.includes('perfect-only')) return 'irreg'
      if (detectIrregularVerb(pp1, pp2) || detectCompound(entry)) return 'irreg'
      return deriveVerbConjugation(pp2, pp1)
    }
    default:
      return undefined
  }
}

export function generateFormsForEntry(
  entry: VocabEntry,
  overrideForms?: Array<{ s: string; a: Analysis[] }>,
): FormRecord[] {
  if (overrideForms) return overrideForms.map((f) => ({ s: f.s, a: f.a, l: entry.id }))
  if (entry.flags.includes('no-forms')) return []
  switch (entry.pos) {
    case 'n':
      return nounForms(entry)
    case 'adj':
      return adjectiveForms(entry)
    case 'v':
      return verbForms(entry)
    case 'pron':
      return pronounForms(entry)
    default:
      return []
  }
}

// ── nouns ────────────────────────────────────────────────────────────────────

function isIStem(entry: VocabEntry): boolean {
  if (entry.flags.includes('not-i-stem')) return false
  return entry.flags.includes('i-stem') || entry.flags.includes('i-stem?')
}

function nounForms(entry: VocabEntry): FormRecord[] {
  const [nom, gen] = entry.pp
  if (!gen || !entry.gender) return []
  const genders: Gender[] = entry.gender === 'mf' ? ['m', 'f'] : [entry.gender]
  const pluralOnly = entry.flags.includes('plural-only')

  let declension: NounEntry['declension']
  let stem: string
  if (pluralOnly) {
    // citation is nom.pl + gen.pl (aedēs aedium, castra castrōrum)
    const byEnding: Array<[string[], NounEntry['declension']]> = [
      [['arum'], '1'],
      [['orum'], '2'],
      [['uum'], '4'],
      [['erum'], '5'],
      [['um'], '3'],
    ]
    const match = byEnding.find(([sufs]) => stripSuffix(gen, sufs) !== null)
    if (!match) return []
    declension = match[1]
    stem = stripSuffix(gen, match[0])!
    if (declension === '3' && stripSuffix(gen, ['ium'])) stem = stripSuffix(gen, ['ium'])!
  } else {
    declension = deriveNounDeclension(gen)
    stem = deriveNounStem(declension, gen)
  }

  const iStem = declension === '3' && (isIStem(entry) || (pluralOnly && demacron(gen).endsWith('ium')))
  const morphEntry: NounEntry = {
    id: entry.id,
    lemma: entry.lemma,
    displayName: entry.lemma,
    pos: 'noun',
    declension,
    gender: genders[0],
    nominative: nom ?? entry.lemma,
    genitive: gen,
    stem,
    iStem,
  }

  const collector = new Collector()
  const [section] = generateEntrySections(morphEntry, FULL_VISIBILITY)
  for (const row of section.rows) {
    for (const cell of row.cells) {
      const c = cell.slot.case as LatinCase
      const n = cell.slot.number as LatinNumber
      if (pluralOnly && n === 'sg') continue
      // mixed i-stems (the classroom default) take abl.sg. -e, not the engine's pure-i-stem -ī
      const surface =
        iStem && genders[0] !== 'n' && c === 'abl' && n === 'sg' ? `${stem}e` : cell.generatedText
      for (const g of genders) collector.add(surface, { k: 'nom', c, n, g })
    }
  }
  return collector.toRecords(entry.id)
}

// ── adjectives ───────────────────────────────────────────────────────────────

function buildAdjectiveEntry(entry: VocabEntry): AdjectiveEntry | null {
  const [pp1, pp2, pp3] = entry.pp
  const base = {
    id: entry.id,
    lemma: entry.lemma,
    displayName: entry.lemma,
    pos: 'adjective' as const,
    degrees: ['positive' as const],
  }

  if (entry.flags.includes('comp')) return null // irregular comparatives need override paradigms

  if (entry.flags.includes('1term')) {
    if (!entry.genSg) return null
    return {
      ...base,
      adjectiveClass: '3',
      nominative: pp1,
      stem: deriveAdjectiveStem(entry.genSg),
    }
  }

  if (!pp2 || !pp3) return null

  // 3rd declension, 2- or 3-termination: neuter ends in -e
  if (demacron(pp3).endsWith('e')) {
    const stem = stripSuffix(pp2, ['is']) ?? pp2
    return {
      ...base,
      adjectiveClass: '3',
      nominative: pp1,
      feminineForm: pp2,
      neuterForm: pp3,
      stem,
    }
  }

  // 1st/2nd declension (incl. -er and pronominal); stem from the feminine
  const stem = stripSuffix(pp2, ['a', 'ae']) ?? pp2
  return {
    ...base,
    adjectiveClass: '1-2',
    pronominal: entry.flags.includes('pronominal') || undefined,
    nominative: pp1,
    feminineForm: pp2,
    neuterForm: pp3,
    stem,
  }
}

/** Column labels are built from GENDER_LABELS, e.g. "M./F." — recover the gender group. */
function gendersFromColumnLabel(label: string): Gender[] {
  const genders = label
    .split('/')
    .map((part) => part.trim()[0]?.toLowerCase())
    .filter((g): g is Gender => g === 'm' || g === 'f' || g === 'n')
  return genders.length ? genders : ['m']
}

function adjectiveForms(entry: VocabEntry): FormRecord[] {
  const morphEntry = buildAdjectiveEntry(entry)
  if (!morphEntry) return []
  const pluralOnly = entry.flags.includes('plural-only')

  if (pluralOnly) {
    // cited in the plural (cēterī -ae -a): regenerate from a singular citation
    const stem = morphEntry.stem
    morphEntry.nominative = `${stem}us`
    morphEntry.feminineForm = `${stem}a`
    morphEntry.neuterForm = `${stem}um`
  }

  const collector = new Collector()
  for (const section of generateEntrySections(morphEntry, FULL_VISIBILITY)) {
    for (const row of section.rows) {
      row.cells.forEach((cell, i) => {
        const c = cell.slot.case as LatinCase
        const n = cell.slot.number as LatinNumber
        if (pluralOnly && n === 'sg') return
        const degree = cell.slot.degree
        const d = degree === 'comparative' ? 'comp' : degree === 'superlative' ? 'superl' : undefined
        // meus has the irregular vocative mī
        const surface =
          demacron(entry.lemma) === 'meus' && c === 'voc' && n === 'sg' && cell.generatedText === 'mee'
            ? 'mī'
            : cell.generatedText
        for (const g of gendersFromColumnLabel(section.columns[i]?.label ?? '')) {
          collector.add(surface, { k: 'nom', c, n, g, ...(d ? { d } : {}) })
        }
      })
    }
  }
  return collector.toRecords(entry.id)
}

// ── verbs ────────────────────────────────────────────────────────────────────

const TENSE_SHORT: Record<string, Analysis['t']> = {
  pres: 'pres', impf: 'impf', fut: 'fut', pf: 'pf', plupf: 'plupf', futpf: 'futpf',
  present: 'pres', imperfect: 'impf', future: 'fut', perfect: 'pf', pluperfect: 'plupf',
}
const PERFECT_SYSTEM = new Set<Analysis['t']>(['pf', 'plupf', 'futpf'])

interface CompoundInfo {
  base: { first: string; infinitive: string; perfect: string; supine: string }
  presPrefix: string
  perfPrefix: string
  supPrefix: string
}

const IRREGULAR_BASES = [
  { inf: 'esse', pps: { first: 'sum', infinitive: 'esse', perfect: 'fuī', supine: 'futūrum' } },
  { inf: 'ferre', pps: { first: 'ferō', infinitive: 'ferre', perfect: 'tulī', supine: 'lātum' } },
  { inf: 'ire', pps: { first: 'eō', infinitive: 'īre', perfect: 'iī', supine: 'itum' } },
  { inf: 'velle', pps: { first: 'volō', infinitive: 'velle', perfect: 'voluī', supine: '' } },
]

function detectCompound(entry: VocabEntry): CompoundInfo | null {
  const [pp1, pp2, pp3, pp4] = entry.pp
  if (!pp1 || !pp2) return null
  if (detectIrregularVerb(pp1, pp2)) return null // the simplex itself
  for (const { inf, pps } of IRREGULAR_BASES) {
    const presPrefix = stripSuffix(pp2, [inf])
    if (presPrefix === null || presPrefix === '') continue
    // both pp1 and the infinitive must be prefix + base: this keeps regular
    // 4th-conjugation verbs (audiō audīre) from matching eō's īre
    const pp1Prefix = stripSuffix(pp1, [demacron(pps.first)])
    if (pp1Prefix !== presPrefix && demacron(pp1Prefix ?? '') !== demacron(presPrefix)) continue
    const perfPrefix = pp3 ? (stripSuffix(pp3, [demacron(pps.perfect)]) ?? presPrefix) : presPrefix
    const supPrefix = pp4 ? (stripSuffix(pp4, [demacron(pps.supine)]) ?? perfPrefix) : perfPrefix
    return { base: pps, presPrefix, perfPrefix, supPrefix }
  }
  return null
}

function buildVerbEntry(entry: VocabEntry): VerbEntry | null {
  const [pp1, pp2, pp3raw, pp4raw] = entry.pp
  if (!pp1 || !pp2) return null

  const deponent = inferDeponentVerb({ first: pp1, infinitive: pp2, perfect: '', supine: '' })
  let perfect = pp3raw ?? ''
  let supine = pp4raw ?? ''
  if (deponent) {
    supine = (pp3raw ?? '').replace(/\s+sum$/, '')
    perfect = ''
  }

  const irregularKey = detectIrregularVerb(pp1, pp2)
  const conjugation = irregularKey ? 'irregular' : deriveVerbConjugation(pp2, pp1)
  const principalParts = { first: pp1, infinitive: pp2, perfect, supine }
  const stems = deriveVerbStems(conjugation, principalParts)

  return {
    id: entry.id,
    lemma: entry.lemma,
    displayName: entry.lemma,
    pos: 'verb',
    conjugation,
    principalParts,
    ...stems,
    deponent: deponent || undefined,
    irregularKey,
  }
}

const PERF_ENDINGS: Array<[Analysis['t'], 'ind' | 'subj', string[]]> = [
  ['pf', 'ind', ['ī', 'istī', 'it', 'imus', 'istis', 'ērunt']],
  ['plupf', 'ind', ['eram', 'erās', 'erat', 'erāmus', 'erātis', 'erant']],
  ['futpf', 'ind', ['erō', 'eris', 'erit', 'erimus', 'eritis', 'erint']],
  ['pf', 'subj', ['erim', 'erīs', 'erit', 'erīmus', 'erītis', 'erint']],
  ['plupf', 'subj', ['issem', 'issēs', 'isset', 'issēmus', 'issētis', 'issent']],
]
const PERSON_NUMBER: Array<[Person, LatinNumber]> = [
  ['1', 'sg'], ['2', 'sg'], ['3', 'sg'], ['1', 'pl'], ['2', 'pl'], ['3', 'pl'],
]

function perfectOnlyForms(entry: VocabEntry): FormRecord[] {
  const stem = stripSuffix(entry.pp[0], ['i'])
  if (stem === null) return []
  const collector = new Collector()
  for (const [t, m, endings] of PERF_ENDINGS) {
    endings.forEach((ending, i) => {
      const [p, n] = PERSON_NUMBER[i]
      collector.add(`${stem}${ending}`, { k: 'fin', t, m, v: 'act', p, n })
    })
  }
  collector.add(`${stem}isse`, { k: 'inf', t: 'pf', v: 'act' })
  return collector.toRecords(entry.id)
}

function extractVerbSections(
  sections: ChartSection[],
  collector: Collector,
  mapSurface: (surface: string, a: Analysis) => string = (s) => s,
) {
  for (const section of sections) {
    if (section.kind === 'finite-verb') {
      for (const row of section.rows) {
        for (const cell of row.cells) {
          const { mood, voice, tense, number, person } = cell.slot
          const a: Analysis = {
            k: 'fin',
            t: TENSE_SHORT[tense as VerbTense],
            m: mood === 'indicative' ? 'ind' : 'subj',
            v: voice === 'active' ? 'act' : 'pass',
            p: person as Person,
            n: number as LatinNumber,
          }
          collector.add(mapSurface(cell.generatedText, a), a)
        }
      }
      continue
    }
    // forms-list sections: imperatives, infinitives, participles
    const list = section.id.split('-').pop()
    for (const row of section.rows) {
      const cell = row.cells[0]
      let surface = cell.generatedText
      let a: Analysis | null = null
      if (list === 'imperatives') {
        a = { k: 'imp', n: row.label.startsWith('pl') ? 'pl' : 'sg' }
      } else if (list === 'infinitives' || list === 'participles') {
        const [tenseWord, voiceWord] = row.label.split(/\s+/)
        const t = TENSE_SHORT[tenseWord]
        const v = voiceWord === 'active' ? 'act' : 'pass'
        if (!t) continue
        a = { k: list === 'infinitives' ? 'inf' : 'ptc', t, v }
        if (list === 'participles') {
          // citation like "amāns (amantis)" or "amātus -a -um" → bare form
          surface = surface.split(/\s+\(|\s+-a\b/)[0]
        }
      }
      if (a) collector.add(mapSurface(surface, a), a)
    }
  }
}

/**
 * The engine only produces correct imperatives for sum, dūcō, faciō, and ferō;
 * for other irregulars it emits garbage (e.g. īre + e). Suppress those and
 * substitute the real forms (null = the verb has no imperative).
 */
const IRREGULAR_IMPERATIVES: Record<string, [string, string] | null> = {
  eo: ['ī', 'īte'],
  nolo: ['nōlī', 'nōlīte'],
  volo: null,
  malo: null,
  possum: null,
}

/** Impersonals are cited in the 3rd person (decet decēre decuit): rebuild and keep 3rd sg only. */
function impersonalForms(entry: VocabEntry): FormRecord[] {
  const [, inf, pp3] = entry.pp
  if (!inf) return []
  const nfc = inf.normalize('NFC')
  const conjugation = /āre$/.test(nfc) ? '1' : /ēre$/.test(nfc) ? '2' : /īre$/.test(nfc) ? '4' : '3'
  const stems = deriveVerbStems(conjugation, {
    first: '',
    infinitive: inf,
    perfect: pp3 ? pp3.normalize('NFC').replace(/it$/, 'ī') : '',
    supine: '',
  })
  const first = stems.presentStem + (conjugation === '2' ? 'eō' : conjugation === '4' ? 'iō' : 'ō')
  const morphEntry: VerbEntry = {
    id: entry.id,
    lemma: entry.lemma,
    displayName: entry.lemma,
    pos: 'verb',
    conjugation,
    principalParts: { first, infinitive: inf, perfect: pp3 ?? '', supine: '' },
    ...stems,
  }
  const collector = new Collector()
  extractVerbSections(generateEntrySections(morphEntry, FULL_VISIBILITY), collector, (surface, a) => {
    const keep =
      (a.k === 'fin' && a.p === '3' && a.n === 'sg' && a.v === 'act' && (PERFECT_SYSTEM.has(a.t) ? Boolean(pp3) : true)) ||
      (a.k === 'inf' && a.t === 'pres' && a.v === 'act')
    return keep ? surface : '—'
  })
  return collector.toRecords(entry.id)
}

function verbForms(entry: VocabEntry): FormRecord[] {
  if (entry.flags.includes('perfect-only')) return perfectOnlyForms(entry)
  if (entry.flags.includes('impersonal')) return impersonalForms(entry)

  const collector = new Collector()
  const compound = detectCompound(entry)
  if (compound) {
    const baseVocab: VocabEntry = {
      ...entry,
      pp: [compound.base.first, compound.base.infinitive, compound.base.perfect, compound.base.supine],
      lemma: compound.base.first,
    }
    const baseEntry = buildVerbEntry(baseVocab)
    if (!baseEntry) return []
    const baseKey = baseEntry.irregularKey
    const impOverride = baseKey ? IRREGULAR_IMPERATIVES[baseKey] : undefined
    const sections = generateEntrySections(baseEntry, FULL_VISIBILITY)
    extractVerbSections(sections, collector, (surface, a) => {
      if (a.k === 'imp' && impOverride !== undefined) return '—'
      const usesSupine =
        (a.k === 'fin' && a.v === 'pass' && PERFECT_SYSTEM.has(a.t)) ||
        (a.k === 'inf' && a.t === 'fut') ||
        (a.k === 'ptc' && (a.t === 'pf' || (a.t === 'fut' && a.v === 'act')))
      const usesPerfect =
        (a.k === 'fin' && a.v === 'act' && PERFECT_SYSTEM.has(a.t)) || (a.k === 'inf' && a.t === 'pf')
      const prefix = usesSupine ? compound.supPrefix : usesPerfect ? compound.perfPrefix : compound.presPrefix
      return `${prefix}${surface}`
    })
    if (impOverride) {
      collector.add(`${compound.presPrefix}${impOverride[0]}`, { k: 'imp', n: 'sg' })
      collector.add(`${compound.presPrefix}${impOverride[1]}`, { k: 'imp', n: 'pl' })
    }
    return collector.toRecords(entry.id)
  }

  const morphEntry = buildVerbEntry(entry)
  if (!morphEntry) return []
  const sections = generateEntrySections(morphEntry, FULL_VISIBILITY)

  const impOverride = morphEntry.irregularKey ? IRREGULAR_IMPERATIVES[morphEntry.irregularKey] : undefined
  const noSupine = !morphEntry.supineStem
  const noPerfect = !morphEntry.perfectStem && !morphEntry.deponent
  extractVerbSections(sections, collector, (surface, a) => {
    if (a.k === 'imp' && impOverride !== undefined) return '—'
    const supineBased =
      (a.k === 'fin' && a.v === 'pass' && PERFECT_SYSTEM.has(a.t)) ||
      (a.k === 'inf' && a.t === 'fut') ||
      (a.k === 'ptc' && (a.t === 'pf' || a.t === 'fut'))
    if (noSupine && supineBased && !(a.k === 'ptc' && a.t === 'fut' && a.v === 'pass')) return '—'
    if (noPerfect && ((a.k === 'fin' && a.v === 'act' && PERFECT_SYSTEM.has(a.t)) || (a.k === 'inf' && a.t === 'pf')))
      return '—'
    return surface
  })
  if (impOverride) {
    collector.add(impOverride[0], { k: 'imp', n: 'sg' })
    collector.add(impOverride[1], { k: 'imp', n: 'pl' })
  }
  return collector.toRecords(entry.id)
}

// ── pronouns ─────────────────────────────────────────────────────────────────

/**
 * Corrected paradigms for pronouns the engine's generic table-builder gets
 * wrong (is: fake i-stem plurals; idem: -dem suffixation; quisque/aliquis:
 * nominatives). Keyed "case:number:gender"; arrays are alternate spellings.
 */
const PRONOUN_FIXED_TABLES: Partial<Record<PronounType, Record<string, string | string[]>>> = {
  is: {
    'nom:sg:m': 'is', 'nom:sg:f': 'ea', 'nom:sg:n': 'id',
    'gen:sg:m': 'eius', 'gen:sg:f': 'eius', 'gen:sg:n': 'eius',
    'dat:sg:m': 'eī', 'dat:sg:f': 'eī', 'dat:sg:n': 'eī',
    'acc:sg:m': 'eum', 'acc:sg:f': 'eam', 'acc:sg:n': 'id',
    'abl:sg:m': 'eō', 'abl:sg:f': 'eā', 'abl:sg:n': 'eō',
    'nom:pl:m': ['eī', 'iī'], 'nom:pl:f': 'eae', 'nom:pl:n': 'ea',
    'gen:pl:m': 'eōrum', 'gen:pl:f': 'eārum', 'gen:pl:n': 'eōrum',
    'dat:pl:m': ['eīs', 'iīs'], 'dat:pl:f': ['eīs', 'iīs'], 'dat:pl:n': ['eīs', 'iīs'],
    'acc:pl:m': 'eōs', 'acc:pl:f': 'eās', 'acc:pl:n': 'ea',
    'abl:pl:m': ['eīs', 'iīs'], 'abl:pl:f': ['eīs', 'iīs'], 'abl:pl:n': ['eīs', 'iīs'],
  },
  idem: {
    'nom:sg:m': 'īdem', 'nom:sg:f': 'eadem', 'nom:sg:n': 'idem',
    'gen:sg:m': 'eiusdem', 'gen:sg:f': 'eiusdem', 'gen:sg:n': 'eiusdem',
    'dat:sg:m': 'eīdem', 'dat:sg:f': 'eīdem', 'dat:sg:n': 'eīdem',
    'acc:sg:m': 'eundem', 'acc:sg:f': 'eandem', 'acc:sg:n': 'idem',
    'abl:sg:m': 'eōdem', 'abl:sg:f': 'eādem', 'abl:sg:n': 'eōdem',
    'nom:pl:m': ['eīdem', 'īdem'], 'nom:pl:f': 'eaedem', 'nom:pl:n': 'eadem',
    'gen:pl:m': 'eōrundem', 'gen:pl:f': 'eārundem', 'gen:pl:n': 'eōrundem',
    'dat:pl:m': ['eīsdem', 'īsdem'], 'dat:pl:f': ['eīsdem', 'īsdem'], 'dat:pl:n': ['eīsdem', 'īsdem'],
    'acc:pl:m': 'eōsdem', 'acc:pl:f': 'eāsdem', 'acc:pl:n': 'eadem',
    'abl:pl:m': ['eīsdem', 'īsdem'], 'abl:pl:f': ['eīsdem', 'īsdem'], 'abl:pl:n': ['eīsdem', 'īsdem'],
  },
  quisque: {
    'nom:sg:m': 'quisque', 'nom:sg:f': 'quaeque', 'nom:sg:n': ['quidque', 'quodque'],
    'gen:sg:m': 'cuiusque', 'gen:sg:f': 'cuiusque', 'gen:sg:n': 'cuiusque',
    'dat:sg:m': 'cuique', 'dat:sg:f': 'cuique', 'dat:sg:n': 'cuique',
    'acc:sg:m': 'quemque', 'acc:sg:f': 'quamque', 'acc:sg:n': ['quidque', 'quodque'],
    'abl:sg:m': 'quōque', 'abl:sg:f': 'quāque', 'abl:sg:n': 'quōque',
    'nom:pl:m': 'quīque', 'nom:pl:f': 'quaeque', 'nom:pl:n': 'quaeque',
    'gen:pl:m': 'quōrumque', 'gen:pl:f': 'quārumque', 'gen:pl:n': 'quōrumque',
    'dat:pl:m': 'quibusque', 'dat:pl:f': 'quibusque', 'dat:pl:n': 'quibusque',
    'acc:pl:m': 'quōsque', 'acc:pl:f': 'quāsque', 'acc:pl:n': 'quaeque',
    'abl:pl:m': 'quibusque', 'abl:pl:f': 'quibusque', 'abl:pl:n': 'quibusque',
  },
  // quisquis is defective: only these forms are actually attested
  quisquis: {
    'nom:sg:m': 'quisquis', 'nom:sg:f': 'quisquis',
    'nom:sg:n': ['quidquid', 'quicquid'],
    'acc:sg:m': 'quemquem', 'acc:sg:n': ['quidquid', 'quicquid'],
    'abl:sg:m': 'quōquō', 'abl:sg:f': 'quāquā', 'abl:sg:n': 'quōquō',
    'dat:pl:m': 'quibusquibus', 'abl:pl:m': 'quibusquibus',
  },
  aliquis: {
    'nom:sg:m': ['aliquis', 'aliquī'], 'nom:sg:f': 'aliqua', 'nom:sg:n': ['aliquid', 'aliquod'],
    'gen:sg:m': 'alicuius', 'gen:sg:f': 'alicuius', 'gen:sg:n': 'alicuius',
    'dat:sg:m': 'alicui', 'dat:sg:f': 'alicui', 'dat:sg:n': 'alicui',
    'acc:sg:m': 'aliquem', 'acc:sg:f': 'aliquam', 'acc:sg:n': ['aliquid', 'aliquod'],
    'abl:sg:m': 'aliquō', 'abl:sg:f': 'aliquā', 'abl:sg:n': 'aliquō',
    'nom:pl:m': 'aliquī', 'nom:pl:f': 'aliquae', 'nom:pl:n': 'aliqua',
    'gen:pl:m': 'aliquōrum', 'gen:pl:f': 'aliquārum', 'gen:pl:n': 'aliquōrum',
    'dat:pl:m': 'aliquibus', 'dat:pl:f': 'aliquibus', 'dat:pl:n': 'aliquibus',
    'acc:pl:m': 'aliquōs', 'acc:pl:f': 'aliquās', 'acc:pl:n': 'aliqua',
    'abl:pl:m': 'aliquibus', 'abl:pl:f': 'aliquibus', 'abl:pl:n': 'aliquibus',
  },
}

const PRONOUN_TYPE_BY_LEMMA: Record<string, PronounType> = {
  ego: 'ego', tu: 'tu', nos: 'nos', vos: 'vos', se: 'sui', sui: 'sui',
  is: 'is', hic: 'hic', ille: 'ille', iste: 'iste', ipse: 'ipse', idem: 'idem',
  qui: 'qui', quis: 'quis', quisquis: 'quisquis', quidam: 'quidam',
  uterque: 'uterque', aliquis: 'aliquis', quisque: 'quisque',
}

function pronounForms(entry: VocabEntry): FormRecord[] {
  const pronounType = PRONOUN_TYPE_BY_LEMMA[demacron(entry.lemma).toLowerCase()]
  if (!pronounType) return []

  const fixed = PRONOUN_FIXED_TABLES[pronounType]
  if (fixed) {
    const collector = new Collector()
    for (const [key, value] of Object.entries(fixed)) {
      const [c, n, g] = key.split(':')
      const analysis: Analysis = { k: 'nom', c: c as Analysis['c'], n: n as Analysis['n'], g: g as Gender }
      for (const surface of Array.isArray(value) ? value : [value]) collector.add(surface, analysis)
    }
    return collector.toRecords(entry.id)
  }

  const morphEntry: PronounEntry = {
    id: entry.id,
    lemma: entry.lemma,
    displayName: entry.lemma,
    pos: 'pronoun',
    pronounType,
  }
  const collector = new Collector()
  const [section] = generateEntrySections(morphEntry, FULL_VISIBILITY)
  for (const row of section.rows) {
    for (const cell of row.cells) {
      const a: Analysis = {
        k: 'nom',
        c: cell.slot.case as LatinCase,
        n: cell.slot.number as LatinNumber,
      }
      if (cell.slot.gender) a.g = cell.slot.gender as Gender
      collector.add(cell.generatedText, a)
    }
  }
  return collector.toRecords(entry.id)
}
