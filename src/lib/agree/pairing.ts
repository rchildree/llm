/**
 * Choosing a modifier and a noun to practise agreement on, and turning that
 * choice into the pair-based questions of this section.
 */
import type { VocabEntry } from '../dataset/types'
import { inChapterScope, type ChapterScope } from '../chapters'
import { buildAdjectiveEntry, buildNounEntry, gendersOf } from '../morph/entries'
import type { Rng } from '../flash/shuffle'
import {
  allSlots,
  modifierParadigm,
  nounParadigm,
  slotKey,
  type Form,
  type Gender,
  type Paradigm,
  type PronounForms,
  type Slot,
} from './paradigm'
import { sharedTriples, triplesFor, type Triple } from './match'
import {
  allowsModifier,
  allowsNoun,
  slotsFor,
  DEFAULT_AGREE_OPTIONS,
  type AgreementOptions,
} from './options'

/** A form is typeable when there is something to put in the box. */
const hasTypeableAnswer = (form: Form): boolean =>
  form.splittable ? form.ending.length > 0 : form.whole.length > 0

/**
 * Pronouns that actually modify a noun. The personal pronouns (ego, tū, nōs,
 * vōs, sē) never do, and quis / quisquam / quisquis / aliquis are substantive
 * in this vocabulary, so none of them belongs in an agreement exercise.
 */
export const ATTRIBUTIVE_PRONOUNS = new Set([
  'hic-pron',
  'is-pron',
  'idem-pron',
  'qui-pron',
  'qui-pron-2',
  'quicumque-pron',
  'quidam-pron',
  'quisque-pron',
  'uterque-pron',
])

export interface AgreementPool {
  modifiers: VocabEntry[]
  nouns: VocabEntry[]
  /**
   * The case/number slots a question may be built on. "Fill in the chart"
   * ignores this — a chart is the whole paradigm or it is not a chart.
   */
  slots: Slot[]
}

/**
 * Plural-only words have no singular to agree in, and a defective one has no
 * usable citation to build a paradigm from: vīs is cited "vīs pl. vīrēs", so
 * the engine takes "pl." for its genitive and inflects it — pl.is, pl.ī, pl.em.
 */
const usable = (entry: VocabEntry): boolean =>
  !entry.flags.includes('plural-only') && !entry.flags.includes('defective')

export function isEligibleNoun(entry: VocabEntry): boolean {
  return entry.pos === 'n' && usable(entry) && Boolean(entry.gender) && buildNounEntry(entry) !== null
}

export function isEligibleModifier(entry: VocabEntry, pronounForms?: PronounForms): boolean {
  if (entry.pos === 'adj') return usable(entry) && buildAdjectiveEntry(entry) !== null
  if (entry.pos === 'pron') return ATTRIBUTIVE_PRONOUNS.has(entry.id) && Boolean(pronounForms?.get(entry.id))
  return false
}

/**
 * Nouns obey the chapter scope exactly; modifiers always draw from everything
 * *through* the cap. Applying "only chapter N" to both would leave 16 of the
 * 45 chapters with no modifier at all and nothing to practise.
 *
 * `options` is the panel's doing: declensions, modifier kinds and the slots
 * the questions may ask about.
 */
export function buildAgreementPool(
  entries: VocabEntry[],
  scope: ChapterScope,
  pronounForms?: PronounForms,
  options: AgreementOptions = DEFAULT_AGREE_OPTIONS,
): AgreementPool {
  const throughCap: ChapterScope = { cap: scope.cap, only: false }
  return {
    modifiers: entries.filter(
      (e) =>
        inChapterScope(e.chapter, throughCap) &&
        isEligibleModifier(e, pronounForms) &&
        allowsModifier(e, options),
    ),
    nouns: entries.filter(
      (e) => inChapterScope(e.chapter, scope) && isEligibleNoun(e) && allowsNoun(e, options),
    ),
    slots: slotsFor(options),
  }
}

const pick = <T,>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)]

export interface Pair {
  modifier: VocabEntry
  noun: VocabEntry
  /** the noun's gender, which the modifier has to match */
  gender: Gender
  modifierParadigm: Paradigm
  nounParadigm: Paradigm
}

export function pickPair(
  pool: AgreementPool,
  pronounForms?: PronounForms,
  rng: Rng = Math.random,
): Pair | null {
  if (!pool.modifiers.length || !pool.nouns.length) return null
  // a handful of attempts covers the rare entry whose paradigm fails to build
  for (let attempt = 0; attempt < 24; attempt++) {
    const noun = pick(pool.nouns, rng)
    const modifier = pick(pool.modifiers, rng)
    const genders = gendersOf(noun)
    if (!genders.length) continue
    const gender = genders.length === 1 ? genders[0] : pick(genders, rng)
    const nParadigm = nounParadigm(noun)
    const mParadigm = modifierParadigm(modifier, gender, pronounForms)
    if (!nParadigm || !mParadigm) continue
    return { modifier, noun, gender, modifierParadigm: mParadigm, nounParadigm: nParadigm }
  }
  return null
}

// ── "make it agree": inflect both words into one named slot ──────────────────

export interface MakeItAgreeQuestion {
  kind: 'make-it-agree'
  pair: Pair
  slot: Slot
  modifierForm: Form
  nounForm: Form
}

export function makeItAgree(
  pool: AgreementPool,
  pronounForms?: PronounForms,
  rng: Rng = Math.random,
): MakeItAgreeQuestion | null {
  if (!pool.slots.length) return null
  for (let attempt = 0; attempt < 24; attempt++) {
    const pair = pickPair(pool, pronounForms, rng)
    if (!pair) return null
    const slot = pick(pool.slots, rng)
    const key = slotKey(slot.c, slot.n)
    const modifierForm = pair.modifierParadigm.get(key)
    const nounForm = pair.nounParadigm.get(key)
    // defective pronouns (quisquis) leave gaps in the grid
    if (!modifierForm?.whole || !nounForm?.whole) continue
    // a form whose ending is empty (3rd-decl. nom.sg. is the bare stem) would
    // ask the student to type nothing at all
    if (!hasTypeableAnswer(modifierForm) || !hasTypeableAnswer(nounForm)) continue
    return { kind: 'make-it-agree', pair, slot, modifierForm, nounForm }
  }
  return null
}

// ── "fill in the chart": both paradigms, typed out in parallel ──────────────

export interface FillTheChartQuestion {
  kind: 'fill-the-chart'
  pair: Pair
  /** the row handed to the student as the worked example */
  given: Slot
}

/**
 * Adjectives only. A pronoun column would be ten whole suppletive forms (is,
 * eius, eī, eum…) with no endings to line up against the noun's, which is the
 * one thing this chart exists to show — and ten whole-word boxes do not fit a
 * phone. Pronouns are still drilled by the other three exercises.
 */
export function fillTheChart(
  pool: AgreementPool,
  pronounForms?: PronounForms,
  rng: Rng = Math.random,
): FillTheChartQuestion | null {
  const adjectives = pool.modifiers.filter((e) => e.pos === 'adj')
  if (!adjectives.length) return null
  const adjOnly: AgreementPool = { modifiers: adjectives, nouns: pool.nouns, slots: pool.slots }

  for (let attempt = 0; attempt < 24; attempt++) {
    const pair = pickPair(adjOnly, pronounForms, rng)
    if (!pair) return null
    // the worked example has to be a row where both cells really show an ending
    const usable = allSlots().filter((slot) => {
      const key = slotKey(slot.c, slot.n)
      const modifierForm = pair.modifierParadigm.get(key)
      const nounForm = pair.nounParadigm.get(key)
      if (!modifierForm?.whole || !nounForm?.whole) return false
      return hasTypeableAnswer(modifierForm) && hasTypeableAnswer(nounForm)
    })
    if (!usable.length) continue
    return { kind: 'fill-the-chart', pair, given: pick(usable, rng) }
  }
  return null
}

// ── "does it match?": judge a pair of inflected forms ────────────────────────

export interface DoesItMatchQuestion {
  kind: 'does-it-match'
  pair: Pair
  modifierSurface: string
  nounSurface: string
  /** whether the two forms share any case/number/gender */
  matches: boolean
  /** the slots they share, for the reveal (empty when they don't) */
  shared: Triple[]
  /** what each form can actually be, for the reveal */
  modifierTriples: Triple[]
  nounTriples: Triple[]
}

/** Every gender's paradigm for a modifier — a surface may belong to several. */
function modifierByGender(
  modifier: VocabEntry,
  pronounForms?: PronounForms,
): Partial<Record<Gender, Paradigm>> {
  const byGender: Partial<Record<Gender, Paradigm>> = {}
  for (const gender of ['m', 'f', 'n'] as Gender[]) {
    const paradigm = modifierParadigm(modifier, gender, pronounForms)
    if (paradigm) byGender[gender] = paradigm
  }
  return byGender
}

const surfacesOf = (paradigm: Paradigm): string[] => {
  const all = new Set<string>()
  for (const form of paradigm.values()) {
    if (form.whole) all.add(form.whole)
    for (const alt of form.alternates) all.add(alt)
  }
  return [...all]
}

/**
 * Build a yes/no question. `wantMatch` asks for an agreeing pair; otherwise a
 * pair is sampled until it shares no case/number/gender at all, so a "no"
 * question can never be accidentally right.
 */
export function doesItMatch(
  pool: AgreementPool,
  wantMatch: boolean,
  pronounForms?: PronounForms,
  rng: Rng = Math.random,
): DoesItMatchQuestion | null {
  if (!pool.slots.length) return null
  const asked = new Set(pool.slots.map((s) => slotKey(s.c, s.n)))

  for (let attempt = 0; attempt < 60; attempt++) {
    const pair = pickPair(pool, pronounForms, rng)
    if (!pair) return null

    const nounSurfaces = surfacesOf(pair.nounParadigm)
    const byGender = modifierByGender(pair.modifier, pronounForms)
    const nounByGender: Partial<Record<Gender, Paradigm>> = { [pair.gender]: pair.nounParadigm }
    if (!nounSurfaces.length) continue

    const nounSurface = pick(nounSurfaces, rng)
    const nounTriples = triplesFor(nounByGender, nounSurface)
    if (!nounTriples.length) continue
    // the form keeps every reading it really has, but the question has to turn
    // on a slot the options left switched on
    const askable = nounTriples.filter((t) => asked.has(slotKey(t.c, t.n)))
    if (!askable.length) continue

    let modifierSurface: string
    if (wantMatch) {
      // inflect the modifier into one of the slots the noun form can fill
      const target = pick(askable, rng)
      const form = byGender[target.g]?.get(slotKey(target.c, target.n))
      if (!form?.whole) continue
      modifierSurface = form.whole
    } else {
      const candidates = surfacesOf(
        byGender[pair.gender] ?? Object.values(byGender)[0] ?? pair.modifierParadigm,
      )
      const allModifier = [...new Set(Object.values(byGender).flatMap(surfacesOf).concat(candidates))]
      const miss = allModifier.filter(
        (s) => !sharedTriples(triplesFor(byGender, s), nounTriples).length,
      )
      if (!miss.length) continue
      modifierSurface = pick(miss, rng)
    }

    const modifierTriples = triplesFor(byGender, modifierSurface)
    const shared = sharedTriples(modifierTriples, nounTriples)
    if (shared.length > 0 !== wantMatch) continue

    return {
      kind: 'does-it-match',
      pair,
      modifierSurface,
      nounSurface,
      matches: shared.length > 0,
      shared,
      modifierTriples,
      nounTriples,
    }
  }
  return null
}
