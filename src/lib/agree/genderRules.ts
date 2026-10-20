/**
 * Why a noun is the gender it is.
 *
 * Latin gender is partly predictable from the citation form, and the
 * predictions are what a student is actually taught: 1st declension is
 * feminine, -tiō is feminine, -men is neuter. This module keeps those
 * predictions as data — one rule per teachable statement — so the gender
 * exercise can both check an answer and say which rules bear on the noun in
 * front of it.
 *
 * Every rule is tested against the published dataset (see genderRules.test.ts):
 * a rule may not contradict a recorded gender, so where the dataset has a word
 * a rule gets wrong, that word is listed in the rule's `exceptions` with the
 * gender it really is. Sense beats form, so the natural-gender rules come
 * first; within the formal rules the more specific pattern wins.
 */
import type { VocabEntry } from '../dataset/types'
import { buildNounEntry, demacron } from '../morph/entries'
import type { Gender } from './paradigm'

/** A noun as the rules see it: macrons stripped, so lists can be typed plainly. */
export interface RuleNoun {
  /** lemma as written, with macrons — for display only */
  lemma: string
  /** lemma without macrons, lower-cased: what the lemma lists match on */
  key: string
  /** nominative singular, macrons stripped and lower-cased */
  nom: string
  /** genitive singular, macrons stripped and lower-cased */
  gen: string
  /** '1'–'5', from buildNounEntry */
  declension: string
  /** capitalised in the dataset, i.e. a proper name */
  proper: boolean
}

/** A word a rule is wrong about, with the gender it really is. */
export interface GenderException {
  /** lemma, macrons optional */
  lemma: string
  gender: Gender
  /** a gloss when the lemma alone is ambiguous, e.g. ōs "mouth" vs os "bone" */
  note?: string
}

export interface GenderRule {
  id: string
  /** what the rule predicts for the words it covers */
  gender: Gender
  /** one line, as a student would say it — English, and no closing full stop */
  statement: string
  /** the words that show it; kept apart so they render as Latin */
  examples: string[]
  exceptions: GenderException[]
  /** does this rule bear on this noun? */
  test: (noun: RuleNoun) => boolean
}

const flat = (s: string): string => demacron(s).toLowerCase()

const ends =
  (...suffixes: string[]) =>
  (value: string): boolean =>
    suffixes.some((s) => value.endsWith(s))

/** A lemma list, matched without macrons or case. */
const lemmas = (...list: string[]): Set<string> => new Set(list.map(flat))

// ── natural gender: the sense of the word, whatever its ending ───────────────

const MALE_PERSONS = lemmas(
  // 1st-declension men: the classic "-a but masculine" list
  'agricola', 'nauta', 'poēta', 'incola', 'scrība', 'pīrāta', 'auriga', 'collēga',
  'convīva', 'advena',
  // men elsewhere, where the ending misleads or no ending rule reaches
  'dux', 'rēx', 'senex', 'index', 'mīles', 'obses', 'custōs', 'fūr', 'homō',
  'nēmō', 'hostis', 'pater', 'frāter', 'vir', 'puer',
)

const FEMALE_PERSONS = lemmas(
  'māter', 'mulier', 'uxor', 'soror', 'fīlia', 'puella', 'fēmina', 'domina',
  'rēgīna', 'dea',
)

/** Men and peoples named in this vocabulary; Rōma and Mūsa are feminine. */
const MALE_NAMES = lemmas(
  'Caesar', 'Carbō', 'Crassus', 'Rōmulus', 'Orgetorix', 'Gallus',
  'Belgae', 'Bellovacī', 'Helvētiī', 'Athēniēnsēs', 'Plataeēnsēs',
)

/**
 * The rules, in the order they are consulted. The first one that bears on a
 * noun is the one that answers for it; the rest are shown as further reasons.
 */
export const GENDER_RULES: GenderRule[] = [
  {
    id: 'natural-m',
    gender: 'm',
    statement: 'A word for a man or a male role is masculine, whatever its ending',
    examples: [],
    exceptions: [],
    test: (n) => MALE_PERSONS.has(n.key),
  },
  {
    id: 'natural-f',
    gender: 'f',
    statement: 'A word for a woman or a female role is feminine, whatever its ending',
    examples: [],
    exceptions: [],
    test: (n) => FEMALE_PERSONS.has(n.key),
  },
  {
    id: 'name-m',
    gender: 'm',
    statement: "A man's name, or the name of a people, is masculine",
    examples: [],
    exceptions: [],
    test: (n) => n.proper && MALE_NAMES.has(n.key),
  },

  // ── 3rd declension, by the ending of the nominative and genitive ───────────
  {
    id: 'third-io-f',
    gender: 'f',
    statement: 'An abstract noun in -iō (gen. -iōnis) is feminine',
    examples: ['ratiō', 'ratiōnis'],
    exceptions: [
      { lemma: 'pūgiō', gender: 'm', note: 'dagger' },
      { lemma: 'scīpiō', gender: 'm', note: 'staff' },
      { lemma: 'centuriō', gender: 'm', note: 'centurion — a man' },
      { lemma: 'septentriō', gender: 'm', note: 'the north' },
    ],
    test: (n) => n.declension === '3' && ends('io')(n.nom) && ends('ionis')(n.gen),
  },
  {
    id: 'third-tas-f',
    gender: 'f',
    statement: 'A noun in -tās (gen. -tātis) is feminine',
    examples: ['vēritās', 'vēritātis'],
    exceptions: [],
    test: (n) => n.declension === '3' && ends('as')(n.nom) && ends('atis')(n.gen),
  },
  {
    id: 'third-tudo-f',
    gender: 'f',
    statement: 'A noun in -dō or -gō (gen. -dinis, -ginis) is feminine',
    examples: ['multitūdō', 'imāgō'],
    exceptions: [
      { lemma: 'ōrdō', gender: 'm', note: 'rank, order' },
      { lemma: 'cardō', gender: 'm', note: 'hinge' },
      { lemma: 'margō', gender: 'm', note: 'edge' },
    ],
    test: (n) =>
      n.declension === '3' && ends('do', 'go')(n.nom) && ends('dinis', 'ginis')(n.gen),
  },
  {
    id: 'third-tus-f',
    gender: 'f',
    statement: 'A noun in -ūs (gen. -ūtis) is feminine',
    examples: ['virtūs', 'virtūtis'],
    exceptions: [],
    test: (n) => n.declension === '3' && ends('us')(n.nom) && ends('utis')(n.gen),
  },
  {
    id: 'third-x-f',
    gender: 'f',
    statement: 'A noun in -x is usually feminine',
    examples: ['vōx', 'lēx', 'nox', 'lūx'],
    exceptions: [
      { lemma: 'dux', gender: 'm' },
      { lemma: 'rēx', gender: 'm' },
      { lemma: 'senex', gender: 'm' },
      { lemma: 'index', gender: 'm', note: 'either gender' },
      { lemma: 'Orgetorix', gender: 'm', note: "a man's name" },
    ],
    test: (n) => n.declension === '3' && ends('x')(n.nom),
  },
  {
    id: 'third-cons-s-f',
    gender: 'f',
    statement: 'A noun in -bs, -ps or -rs is feminine',
    examples: ['urbs', 'ops', 'ars', 'mors'],
    exceptions: [],
    test: (n) => n.declension === '3' && ends('bs', 'ps', 'rs')(n.nom),
  },
  {
    id: 'third-es-f',
    gender: 'f',
    statement: 'A noun in -ēs that keeps its stem in the genitive is feminine',
    examples: ['nūbēs', 'nūbis', 'vulpēs', 'vulpis'],
    exceptions: [],
    test: (n) =>
      n.declension === '3' &&
      ends('es')(n.nom) &&
      ends('is')(n.gen) &&
      // the stem is unchanged, which is what tells vulpēs from mīles, mīlitis
      n.nom.slice(0, -2) === n.gen.slice(0, -2),
  },
  {
    id: 'third-aus-f',
    gender: 'f',
    statement: 'A noun in -aus (gen. -audis) is feminine',
    examples: ['laus', 'laudis', 'fraus', 'fraudis'],
    exceptions: [],
    test: (n) => n.declension === '3' && ends('aus')(n.nom) && ends('audis')(n.gen),
  },
  {
    id: 'third-ns-m',
    gender: 'm',
    statement: 'A noun in -ns is usually masculine',
    examples: ['fōns', 'mōns', 'pōns', 'dēns'],
    exceptions: [
      { lemma: 'mēns', gender: 'f' },
      { lemma: 'gēns', gender: 'f' },
      { lemma: 'frōns', gender: 'f', note: 'forehead; leaf' },
    ],
    test: (n) => n.declension === '3' && ends('ns')(n.nom),
  },
  {
    id: 'third-tor-m',
    gender: 'm',
    statement: 'An agent noun in -tor or -sor is masculine — the -trīx pair is feminine',
    examples: [],
    exceptions: [],
    test: (n) =>
      n.declension === '3' && ends('tor', 'sor')(n.nom) && ends('toris', 'soris')(n.gen),
  },
  {
    id: 'third-or-m',
    gender: 'm',
    statement: 'A noun in -or (gen. -ōris) is masculine',
    examples: ['amor', 'labor', 'timor'],
    exceptions: [
      { lemma: 'uxor', gender: 'f' },
      { lemma: 'soror', gender: 'f' },
      { lemma: 'arbor', gender: 'f' },
    ],
    test: (n) => n.declension === '3' && ends('or')(n.nom) && ends('oris')(n.gen),
  },
  {
    id: 'third-os-m',
    gender: 'm',
    statement: 'A noun in -ōs (gen. -ōris) is masculine',
    examples: ['mōs', 'mōris', 'flōs', 'flōris'],
    exceptions: [{ lemma: 'ōs', gender: 'n', note: 'mouth, face' }],
    test: (n) => n.declension === '3' && ends('os')(n.nom) && ends('oris')(n.gen),
  },
  {
    id: 'third-o-m',
    gender: 'm',
    statement: 'A noun in -ō with genitive -ōnis is masculine',
    examples: ['leō', 'leōnis'],
    exceptions: [],
    test: (n) =>
      n.declension === '3' && ends('o')(n.nom) && !ends('io')(n.nom) && ends('onis')(n.gen),
  },
  {
    id: 'third-er-m',
    gender: 'm',
    statement: 'A noun in -er is masculine',
    examples: ['pater', 'frāter', 'imber'],
    exceptions: [
      { lemma: 'māter', gender: 'f' },
      { lemma: 'mulier', gender: 'f' },
      { lemma: 'iter', gender: 'n', note: 'irregular throughout' },
    ],
    test: (n) => n.declension === '3' && ends('er')(n.nom),
  },
  {
    id: 'third-men-n',
    gender: 'n',
    statement: 'A noun in -men (gen. -minis) is neuter',
    examples: ['nōmen', 'nōminis'],
    exceptions: [],
    test: (n) => n.declension === '3' && ends('men')(n.nom) && ends('minis')(n.gen),
  },
  {
    id: 'third-us-oris-n',
    gender: 'n',
    statement: 'A noun in -us with genitive -oris is neuter',
    examples: ['corpus', 'corporis'],
    exceptions: [],
    test: (n) => n.declension === '3' && ends('us')(n.nom) && ends('oris')(n.gen),
  },
  {
    id: 'third-us-eris-n',
    gender: 'n',
    statement: 'A noun in -us with genitive -eris is neuter',
    examples: ['opus', 'operis'],
    exceptions: [],
    test: (n) => n.declension === '3' && ends('us')(n.nom) && ends('eris')(n.gen),
  },
  {
    id: 'third-us-uris-n',
    gender: 'n',
    statement: 'A noun in -ūs with genitive -ūris is neuter',
    examples: ['iūs', 'iūris', 'crūs', 'crūris'],
    exceptions: [{ lemma: 'tellūs', gender: 'f', note: 'the earth' }],
    test: (n) => n.declension === '3' && ends('us')(n.nom) && ends('uris')(n.gen),
  },
  {
    id: 'third-ut-n',
    gender: 'n',
    statement: 'A noun in -ut (gen. -itis) is neuter',
    examples: ['caput', 'capitis'],
    exceptions: [],
    test: (n) => n.declension === '3' && ends('ut')(n.nom) && ends('itis')(n.gen),
  },
  {
    id: 'third-ar-al-n',
    gender: 'n',
    statement: 'A noun in -ar or -al is neuter',
    examples: ['animal', 'exemplar'],
    exceptions: [{ lemma: 'Caesar', gender: 'm', note: "a man's name" }],
    test: (n) => n.declension === '3' && ends('ar', 'al')(n.nom),
  },
  {
    id: 'third-e-n',
    gender: 'n',
    statement: 'A noun whose nominative ends in -e is neuter',
    examples: ['mare', 'maris'],
    exceptions: [],
    test: (n) => n.declension === '3' && ends('e')(n.nom),
  },
  {
    id: 'third-ur-n',
    gender: 'n',
    statement: 'A noun in -ur is neuter',
    examples: ['rōbur', 'fulgur', 'ebur'],
    exceptions: [{ lemma: 'fūr', gender: 'm', note: 'thief — a person' }],
    test: (n) => n.declension === '3' && ends('ur')(n.nom) && ends('ris')(n.gen),
  },
  {
    id: 'third-ma-n',
    gender: 'n',
    statement: 'A Greek noun in -ma (gen. -matis) is neuter',
    examples: ['poēma', 'poēmatis'],
    exceptions: [],
    test: (n) => n.declension === '3' && ends('ma')(n.nom) && ends('matis')(n.gen),
  },

  // ── the declension defaults ────────────────────────────────────────────────
  {
    id: 'first-f',
    gender: 'f',
    statement: '1st declension (-a, gen. -ae) is feminine',
    examples: [],
    exceptions: [
      { lemma: 'agricola', gender: 'm' },
      { lemma: 'nauta', gender: 'm' },
      { lemma: 'poēta', gender: 'm' },
      { lemma: 'incola', gender: 'm' },
      { lemma: 'scrība', gender: 'm' },
      { lemma: 'pīrāta', gender: 'm' },
      { lemma: 'auriga', gender: 'm' },
      { lemma: 'collēga', gender: 'm' },
      { lemma: 'convīva', gender: 'm' },
      { lemma: 'advena', gender: 'm' },
    ],
    test: (n) => n.declension === '1' && ends('a')(n.nom) && ends('ae')(n.gen),
  },
  {
    id: 'second-us-m',
    gender: 'm',
    statement: '2nd declension in -us, -er or -ir is masculine',
    examples: [],
    exceptions: [
      { lemma: 'humus', gender: 'f', note: 'ground' },
      { lemma: 'alvus', gender: 'f', note: 'belly' },
      { lemma: 'vulgus', gender: 'n', note: 'the crowd' },
      { lemma: 'virus', gender: 'n', note: 'poison' },
      { lemma: 'pelagus', gender: 'n', note: 'the sea' },
    ],
    test: (n) => n.declension === '2' && ends('us', 'er', 'ir')(n.nom),
  },
  {
    id: 'second-um-n',
    gender: 'n',
    statement: '2nd declension in -um is neuter',
    examples: [],
    exceptions: [],
    test: (n) => n.declension === '2' && ends('um')(n.nom),
  },
  {
    id: 'fourth-m',
    gender: 'm',
    statement: '4th declension is masculine',
    examples: [],
    exceptions: [
      { lemma: 'manus', gender: 'f', note: 'hand' },
      { lemma: 'domus', gender: 'f', note: 'house' },
      { lemma: 'tribus', gender: 'f', note: 'tribe' },
      { lemma: 'porticus', gender: 'f', note: 'colonnade' },
      { lemma: 'Īdūs', gender: 'f', note: 'the Ides' },
    ],
    test: (n) => n.declension === '4',
  },
  {
    id: 'fifth-f',
    gender: 'f',
    statement: '5th declension is feminine',
    examples: [],
    exceptions: [
      { lemma: 'diēs', gender: 'm', note: 'day — feminine only of an appointed day' },
      { lemma: 'merīdiēs', gender: 'm', note: 'midday' },
    ],
    test: (n) => n.declension === '5',
  },
]

/** Everything the rules need from an entry, or null when it is not a noun. */
export function ruleNoun(entry: VocabEntry): RuleNoun | null {
  if (entry.pos !== 'n') return null
  const morphEntry = buildNounEntry(entry)
  if (!morphEntry) return null
  const [nom, gen] = entry.pp
  if (!gen) return null
  return {
    lemma: entry.lemma,
    key: flat(entry.lemma),
    nom: flat(nom ?? entry.lemma),
    gen: flat(gen),
    declension: morphEntry.declension,
    proper: entry.lemma.slice(0, 1) !== entry.lemma.slice(0, 1).toLowerCase(),
  }
}

export interface RuleHit {
  rule: GenderRule
  /** set when this noun is one of the rule's listed exceptions */
  exception: GenderException | null
  /** what the rule says here: the exception's gender when the noun is one */
  gender: Gender
}

/** Every rule that bears on this noun, in the order they are consulted. */
export function rulesFor(noun: RuleNoun): RuleHit[] {
  const hits: RuleHit[] = []
  for (const rule of GENDER_RULES) {
    if (!rule.test(noun)) continue
    const exception = rule.exceptions.find((e) => flat(e.lemma) === noun.key) ?? null
    hits.push({ rule, exception, gender: exception?.gender ?? rule.gender })
  }
  return hits
}

/** The gender the rules predict, or null when none of them covers the word. */
export function predictGender(noun: RuleNoun): Gender | null {
  return rulesFor(noun)[0]?.gender ?? null
}
