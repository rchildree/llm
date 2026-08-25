import type { EntryGender, Pos, VocabEntry } from '../../src/lib/dataset/types'

export type ParsedEntry = Omit<VocabEntry, 'id'>

/**
 * Chapter field may list several appearances ("8, 35", "RL3, 20").
 * RLn (reading lessons after the main sequence) map to 40+n.
 * The effective chapter for the chapter-cap filter is the earliest appearance.
 */
export function parseChapter(raw: string): number | null {
  const tokens = raw.split(',').map((t) => t.trim()).filter(Boolean)
  const values: number[] = []
  for (const t of tokens) {
    const rl = t.match(/^RL(\d)$/i)
    if (rl) {
      values.push(40 + parseInt(rl[1], 10))
      continue
    }
    const m = t.match(/^(\d+)$/)
    if (m) values.push(parseInt(m[1], 10))
  }
  return values.length ? Math.min(...values) : null
}

const demacron = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * House orthography: consonantal i is always written i/I, never j/J.
 * After a vowel and before i, the glide disappears entirely (trājiciō →
 * trāiciō, like iniciō), rather than doubling to ii.
 */
export function normalizeOrthography(s: string): string {
  return s
    .replace(/([aeiouāēīōū])j(?=i)/g, '$1')
    .replace(/j/g, 'i')
    .replace(/J/g, 'I')
}

/** Pronoun lemmas the morphology engine (or an override) can decline. */
const PRONOUN_LEMMAS = new Set([
  'ego', 'tu', 'nos', 'vos', 'sui', 'se',
  'is', 'hic', 'ille', 'iste', 'ipse', 'idem',
  'qui', 'quis', 'quisquis', 'quidam', 'aliquis', 'quisque', 'uterque',
  'quisquam', 'quicquam', 'quicumque',
])

/** Adjectives declined with pronominal gen. -īus / dat. -ī. */
const PRONOMINAL_ADJ = new Set([
  'alius', 'alter', 'uter', 'uterque', 'neuter',
  'nullus', 'solus', 'totus', 'ullus', 'unus',
])

const IRREGULAR_INFINITIVES = new Set([
  'esse', 'posse', 'ferre', 'ferri', 'velle', 'nolle', 'malle', 'ire', 'fieri',
])

function isIrregularInfinitive(inf: string): boolean {
  const plain = demacron(inf)
  if (IRREGULAR_INFINITIVES.has(plain)) return true
  // compounds: adesse, referre, abferri...
  return ['esse', 'ferre', 'ferri', 'velle', 'nolle', 'malle'].some(
    (base) => plain.length > base.length && plain.endsWith(base),
  )
}

/** Compound of eō: adeō/adīre, exeō/exīre... (regular 4th-conj is -iō/-īre, not -eō/-īre). */
function isEoCompound(pp1: string, inf: string): boolean {
  const p1 = demacron(pp1)
  const p2 = demacron(inf)
  return p1.endsWith('eo') && !p1.endsWith('ieo') && p2.endsWith('ire') && !p2.endsWith('iire')
}

const VOWELS_LONG = 'āēīōū'

function isThirdDeclension(gen: string): boolean {
  return /is$/.test(demacron(gen)) && !/[āē]is$/.test(gen)
}

/**
 * Flag 3rd-declension i-stem candidates for human review; misclassification
 * silently produces wrong drill answers (abl. -e/-ī, gen. pl. -um/-ium).
 */
function isIStemCandidate(nom: string, gen: string, gender?: EntryGender): boolean {
  const nomPlain = demacron(nom)
  const genPlain = demacron(gen)
  if (gender === 'n') {
    // neuters in -e, -al, -ar
    return /e$|al$|ar$/.test(nomPlain)
  }
  // parisyllabics in -is / -ēs (gen. same syllable count, approximated by equal length stems)
  if (/is$|es$/.test(nomPlain) && nomPlain.length === genPlain.length) return true
  // monosyllabic nominative whose stem ends in two consonants (nox noctis, urbs urbis)
  const syllables = nomPlain.match(new RegExp(`[aeiouy${VOWELS_LONG}]+`, 'gi')) ?? []
  const stem = genPlain.slice(0, -2)
  if (syllables.length === 1 && /[^aeiouy][^aeiouy]$/.test(stem)) return true
  return false
}

function stripParens(s: string): string {
  return s.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Classify the leading parenthetical marker of the definition, if any. */
function posFromDefinition(def: string): Pos | null {
  if (/\bprep\.\s*\+/.test(def)) return 'prep'
  if (/\((?:coord|subord)\.?\s*conj\.?\)/.test(def)) return 'conj'
  if (/\(conj\.\)/.test(def)) return 'conj'
  if (/\(sentence connector\)|\(intensifier\)|\(enclitic/.test(def)) return 'particle'
  if (/\(\s*adv(?:erb)?\.\s*\)/.test(def)) return 'adv'
  if (/\(indecl\.?\s*numeral|\(numeral/.test(def)) return 'num'
  if (/\(interrog/.test(def)) return 'particle'
  return null
}

export function parseRow(dict: string, def: string, chap: string): ParsedEntry {
  const chapter = parseChapter(chap) ?? 0
  const flags: string[] = []

  const firstWord = dict.trim().split(/\s+/)[0] ?? dict.trim()
  let lemma = firstWord
  if (firstWord.includes('/')) {
    lemma = firstWord.split('/')[0]
    flags.push('alt-forms')
  }

  const base: Omit<ParsedEntry, 'pos' | 'pp'> = {
    chapter,
    lemma,
    dict: dict.trim(),
    definition: def.trim(),
    flags,
  }
  const entry = (pos: Pos, pp: ParsedEntry['pp'], extra?: Partial<ParsedEntry>): ParsedEntry => ({
    ...base,
    pos,
    pp,
    ...extra,
  })
  const single: ParsedEntry['pp'] = [lemma, null, null, null]

  // ── noun: DICT ends with a gender marker ─────────────────────────────────
  const genderMatch = dict.match(/\b(m\.\/f\.|m\.|f\.|n\.)\s*(pl\.)?\s*$/)
  if (genderMatch) {
    const gender: EntryGender = genderMatch[1] === 'm./f.' ? 'mf' : (genderMatch[1][0] as EntryGender)
    const words = stripParens(dict.slice(0, genderMatch.index)).split(/\s+/).filter(Boolean)
    const nom = words[0] ?? lemma
    const gen = words[1] ?? null
    if (genderMatch[2]) flags.push('plural-only')
    if (gen && isThirdDeclension(gen) && isIStemCandidate(nom, gen, gender)) flags.push('i-stem?')
    return entry('n', [nom, gen, null, null], { gender })
  }

  const words = stripParens(dict).split(/\s+/).filter(Boolean)

  // ── verb: second word is an infinitive ───────────────────────────────────
  if (words.length >= 2) {
    const inf = words[1]
    const infPlain = demacron(inf)

    // perfect-only defectives cited by perfect infinitive: meminī meminisse
    if (/isse$/.test(infPlain)) {
      flags.push('defective', 'perfect-only')
      return entry('v', [words[0], inf, words[2] ?? null, null])
    }
    const isRegInf = /are$|ere$|ire$/.test(infPlain) && !IRREGULAR_INFINITIVES.has(infPlain)
    const isDepInf =
      /ari$|eri$|iri$/.test(infPlain) ||
      (/i$/.test(infPlain) && /or$/.test(demacron(words[0])))
    const isIrregInf = isIrregularInfinitive(inf) || isEoCompound(words[0], inf)

    if (isRegInf || isDepInf || isIrregInf) {
      let pp3: string | null = words[2] ?? null
      let pp4: string | null = words[3] ?? null
      if (isIrregInf) flags.push('irreg')
      // impersonals are cited in the 3rd person: decet decēre decuit
      if (/t$/.test(words[0])) flags.push('impersonal')
      if (isDepInf) {
        flags.push('deponent')
        if (pp3 && pp4 === 'sum') {
          pp3 = `${pp3} sum`
          pp4 = null
        }
      } else if (pp3 && /us$/.test(demacron(pp3)) && pp4 === 'sum') {
        flags.push('semi-deponent')
        pp3 = `${pp3} sum`
        pp4 = null
      }
      return entry('v', [words[0], inf, pp3, pp4])
    }
  }

  // ── adjectives ───────────────────────────────────────────────────────────
  const w = words.map(demacron)

  // 1-termination with genitive in parens: "absēns (absentis)"
  const oneTerm = dict.trim().match(/^(\S+)\s+\(([^)]+)\)$/)
  if (oneTerm && /is$/.test(demacron(oneTerm[2]))) {
    flags.push('1term')
    return entry('adj', [oneTerm[1], oneTerm[1], oneTerm[1], null], { genSg: oneTerm[2] })
  }

  if (words.length === 3) {
    // 1st/2nd declension (altus alta altum), incl. pronominal (alius alia aliud)
    if ((/um$/.test(w[2]) || /ud$/.test(w[2])) && /[ae]$/.test(w[1])) {
      if (PRONOMINAL_ADJ.has(demacron(words[0]))) flags.push('pronominal')
      return entry('adj', [words[0], words[1], words[2], null])
    }
    // 3rd declension 3-termination (acer ācrīs ācre)
    if (/e$/.test(w[2]) && /is$|ris$/.test(w[1])) {
      flags.push('3term')
      return entry('adj', [words[0], words[1], words[2], null])
    }
    // superlative cited in three terminations
    if (/imum$/.test(w[2])) {
      flags.push('superl')
      return entry('adj', [words[0], words[1], words[2], null])
    }
    // plural-cited 1st/2nd declension: cēterī cēterae cētera
    if (/i$/.test(w[0]) && /ae$/.test(w[1]) && /a$/.test(w[2])) {
      flags.push('plural-only')
      return entry('adj', [words[0], words[1], words[2], null])
    }
  }

  if (words.length === 2) {
    // 3rd declension 2-termination (fortis forte)
    if (/is$/.test(w[0]) && /e$/.test(w[1])) {
      return entry('adj', [words[0], words[0], words[1], null])
    }
    // comparative: maior maius / major majus / minor minus
    if (/ius$/.test(w[1]) || (/or$/.test(w[0]) && /us$/.test(w[1]))) {
      flags.push('comp')
      return entry('adj', [words[0], words[0], words[1], null])
    }
  }

  // ── uninflected single words marked in the definition ────────────────────
  // checked before pronoun lemmas so e.g. hīc "(adv.) here" isn't taken for hic;
  // multi-word citations (quis quid) are structural and outrank def markers
  const defPos = posFromDefinition(def)
  if (defPos && words.length === 1 && !PRONOUN_LEMMAS.has(demacron(lemma))) {
    return entry(defPos, single)
  }
  if (defPos && words.length === 1 && defPos === 'adv') {
    return entry(defPos, single)
  }

  // ── pronouns by lemma ────────────────────────────────────────────────────
  if (PRONOUN_LEMMAS.has(demacron(lemma))) {
    return entry('pron', single)
  }

  if (defPos) return entry(defPos, single)

  // ── leftovers ────────────────────────────────────────────────────────────
  if (words.length > 1) return entry('phrase', single)
  return entry('other', single)
}
