import { describe, expect, test } from 'vitest'
import { normalizeOrthography, parseChapter, parseRow } from './enrich-core'

describe('normalizeOrthography', () => {
  test('replaces consonantal j/J with i/I', () => {
    expect(normalizeOrthography('adjuvō adjuvāre adjūvī adjūtum')).toBe('adiuvō adiuvāre adiūvī adiūtum')
    expect(normalizeOrthography('Jūlius jam pejor')).toBe('Iūlius iam peior')
  })

  test('leaves i-spelled text untouched', () => {
    expect(normalizeOrthography('iaciō iacere iēcī iactum')).toBe('iaciō iacere iēcī iactum')
  })

  test('vowel + ji collapses to single i (iaciō compounds)', () => {
    expect(normalizeOrthography('trājiciō trājicere trājēcī trājectum')).toBe(
      'trāiciō trāicere trāiēcī trāiectum',
    )
    // but j after a consonant, or not before i, is a plain glide → i
    expect(normalizeOrthography('injēcī injectus')).toBe('iniēcī iniectus')
    expect(normalizeOrthography('adjuvō')).toBe('adiuvō')
  })
})

describe('parseChapter', () => {
  test('plain chapter number', () => {
    expect(parseChapter('12')).toBe(12)
  })

  test('multiple appearances take the earliest', () => {
    expect(parseChapter('8, 35')).toBe(8)
  })

  test('RL lessons map past the main sequence', () => {
    expect(parseChapter('RL2')).toBe(42)
  })

  test('RL plus chapter takes the earlier of the two', () => {
    expect(parseChapter('RL3, 20')).toBe(20)
  })

  test('garbage yields null', () => {
    expect(parseChapter('')).toBeNull()
  })
})

describe('parseRow', () => {
  const row = (dict: string, def: string, chap = '1') => parseRow(dict, def, chap)

  test('regular 1st-conj verb with four principal parts', () => {
    const e = row('amō amāre amāvī amātum', 'love, like')
    expect(e.pos).toBe('v')
    expect(e.lemma).toBe('amō')
    expect(e.pp).toEqual(['amō', 'amāre', 'amāvī', 'amātum'])
    expect(e.flags).toEqual([])
  })

  test('verb without supine', () => {
    const e = row('accidō accidere accidī', 'happen')
    expect(e.pos).toBe('v')
    expect(e.pp).toEqual(['accidō', 'accidere', 'accidī', null])
  })

  test('verb with parenthesized future participle keeps it out of pp', () => {
    const e = row('adeō adīre adiī (aditūrus)', 'go to, approach')
    expect(e.pos).toBe('v')
    expect(e.pp).toEqual(['adeō', 'adīre', 'adiī', null])
    expect(e.flags).toContain('irreg')
  })

  test('compound of sum flagged irregular', () => {
    const e = row('adsum adesse adfuī', 'be present')
    expect(e.pos).toBe('v')
    expect(e.flags).toContain('irreg')
  })

  test('deponent verb', () => {
    const e = row('sequor sequī secūtus sum', 'follow')
    expect(e.pos).toBe('v')
    expect(e.flags).toContain('deponent')
  })

  test('noun with genitive and gender', () => {
    const e = row('amor amōris m.', 'love')
    expect(e.pos).toBe('n')
    expect(e.gender).toBe('m')
    expect(e.pp).toEqual(['amor', 'amōris', null, null])
  })

  test('plural-only noun', () => {
    const e = row('aedēs aedium f.pl.', 'house')
    expect(e.pos).toBe('n')
    expect(e.gender).toBe('f')
    expect(e.flags).toContain('plural-only')
  })

  test('noun with m./f. gender', () => {
    const e = row('cīvis cīvis m./f.', 'citizen')
    expect(e.pos).toBe('n')
    expect(e.gender).toBe('mf')
  })

  test('1st/2nd declension adjective', () => {
    const e = row('altus alta altum', 'high, deep')
    expect(e.pos).toBe('adj')
    expect(e.pp).toEqual(['altus', 'alta', 'altum', null])
  })

  test('adjective in -is/-āre is not taken for a verb', () => {
    // mīlitāre looks like a 1st-conj. infinitive, but mīlitāris is no principal part
    const e = row('mīlitāris mīlitāre', 'military')
    expect(e.pos).toBe('adj')
    expect(e.pp).toEqual(['mīlitāris', 'mīlitāris', 'mīlitāre', null])
  })

  test('3rd declension 2-termination adjective', () => {
    const e = row('fortis forte', 'brave')
    expect(e.pos).toBe('adj')
    expect(e.pp).toEqual(['fortis', 'fortis', 'forte', null])
  })

  test('3rd declension 3-termination adjective', () => {
    const e = row('acer ācrīs ācre', 'sharp')
    expect(e.pos).toBe('adj')
    expect(e.pp).toEqual(['acer', 'ācrīs', 'ācre', null])
  })

  test('1-termination adjective with genitive in parens', () => {
    const e = row('absēns (absentis)', 'absent')
    expect(e.pos).toBe('adj')
    expect(e.genSg).toBe('absentis')
    expect(e.flags).toContain('1term')
  })

  test('preposition marked in the definition', () => {
    const e = row('ad', '(prep. + acc.) to, toward')
    expect(e.pos).toBe('prep')
  })

  test('adverb marked in the definition', () => {
    const e = row('ācriter', '(adv.) sharply, keenly')
    expect(e.pos).toBe('adv')
  })

  test('conjunction marked in the definition', () => {
    const e = row('et', '(coord. conj.) and')
    expect(e.pos).toBe('conj')
  })

  test('slash alternates keep the first as lemma', () => {
    const e = row('ā/ab', '(prep. + abl.) from, away from; by')
    expect(e.pos).toBe('prep')
    expect(e.lemma).toBe('ā')
    expect(e.flags).toContain('alt-forms')
  })

  test('multi-word phrase', () => {
    const e = row('ā quō', 'by whom?')
    expect(e.pos).toBe('phrase')
  })

  test('bare single word with no marker is other (review)', () => {
    const e = row('ait', 'says')
    expect(e.pos).toBe('other')
  })

  test('pronominal adjective alius alia aliud', () => {
    const e = row('alius alia aliud', 'another, other')
    expect(e.pos).toBe('adj')
    expect(e.flags).toContain('pronominal')
  })

  test('3rd-declension i-stem candidates are flagged for review', () => {
    const e = row('cīvis cīvis m./f.', 'citizen')
    expect(e.flags).toContain('i-stem?')
  })

  test('neuter in -e/-al/-ar flagged as i-stem candidate', () => {
    const e = row('animal animālis n.', 'animal')
    expect(e.flags).toContain('i-stem?')
  })

  test('regular 3rd-declension consonant stem not flagged', () => {
    const e = row('amor amōris m.', 'love')
    expect(e.flags).not.toContain('i-stem?')
  })

  test('plural-cited 1st/2nd declension adjective', () => {
    const e = row('cēterī cēterae cētera', '(pl. only) the others, the rest')
    expect(e.pos).toBe('adj')
    expect(e.pp).toEqual(['cēterī', 'cēterae', 'cētera', null])
    expect(e.flags).toContain('plural-only')
  })

  test('j-spelled comparative adjective', () => {
    const e = row('major majus', '(comp. of magnus) greater, bigger')
    expect(e.pos).toBe('adj')
    expect(e.flags).toContain('comp')
  })

  test('perfect-only defective verb', () => {
    const e = row('meminī meminisse', 'remember')
    expect(e.pos).toBe('v')
    expect(e.flags).toContain('perfect-only')
    expect(e.pp).toEqual(['meminī', 'meminisse', null, null])
  })

  test('impersonal verb cited in 3rd person gets flagged', () => {
    const e = row('decet decēre decuit', '(impers.) is fitting, suitable')
    expect(e.pos).toBe('v')
    expect(e.flags).toContain('impersonal')
  })

  test('normal verb with impersonal sense in def is not flagged', () => {
    const e = row('juvō juvāre jūvī jūtum', 'help; please; (impers.) it delights')
    expect(e.flags).not.toContain('impersonal')
  })

  test('quīcumque is a pronoun', () => {
    const e = row('quīcumque quaecumque quodcumque', '(indef. pronoun) whoever')
    expect(e.pos).toBe('pron')
  })

  test('adverb marker beats pronoun-lemma lookalike (hīc "here")', () => {
    const e = row('hīc', '(adv.) here')
    expect(e.pos).toBe('adv')
  })

  test('interrogative pronoun cited with two forms stays a pronoun', () => {
    const e = row('quis quid', '(interrogative pronoun) who? what?')
    expect(e.pos).toBe('pron')
  })

  test('preserves dict verbatim and parses chapter', () => {
    const e = parseRow('agō agere ēgī āctum', 'do, act, drive, lead', '3')
    expect(e.dict).toBe('agō agere ēgī āctum')
    expect(e.chapter).toBe(3)
    expect(e.definition).toBe('do, act, drive, lead')
  })
})
