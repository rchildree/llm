import { describe, expect, test } from 'vitest'
import { parseRow } from '../../../scripts/lib/enrich-core'
import { generateFormsForEntry } from './adapter'
import type { Analysis, VocabEntry } from '../dataset/types'

function entryOf(dict: string, def = '', chap = '1', extraFlags: string[] = []): VocabEntry {
  const parsed = parseRow(dict, def, chap)
  return { id: 'test', ...parsed, flags: [...parsed.flags, ...extraFlags] }
}

function formsOf(dict: string, def = '', extraFlags: string[] = []) {
  const records = generateFormsForEntry(entryOf(dict, def, '1', extraFlags))
  const map = new Map<string, Analysis[]>()
  for (const r of records) map.set(r.s, r.a)
  return map
}

const has = (a: Analysis[] | undefined, partial: Partial<Analysis>) =>
  (a ?? []).some((x) => Object.entries(partial).every(([k, v]) => x[k as keyof Analysis] === v))

describe('nouns', () => {
  test('1st declension puella: syncretic puellae', () => {
    const f = formsOf('puella puellae f.', 'girl')
    const a = f.get('puellae')
    expect(has(a, { k: 'nom', c: 'gen', n: 'sg' })).toBe(true)
    expect(has(a, { k: 'nom', c: 'dat', n: 'sg' })).toBe(true)
    expect(has(a, { k: 'nom', c: 'nom', n: 'pl' })).toBe(true)
    expect(has(a, { k: 'nom', c: 'voc', n: 'pl' })).toBe(true)
    expect(has(a, { k: 'nom', c: 'acc', n: 'sg' })).toBe(false)
    expect(f.get('puellā')).toBeDefined()
    expect(f.size).toBe(7)
  })

  test('2nd declension servus has vocative serve', () => {
    const f = formsOf('servus servī m.', 'slave')
    expect(has(f.get('serve'), { c: 'voc', n: 'sg' })).toBe(true)
    expect(has(f.get('servī'), { c: 'gen', n: 'sg' })).toBe(true)
    expect(has(f.get('servī'), { c: 'nom', n: 'pl' })).toBe(true)
  })

  test('2nd declension -er noun keeps puer in nom/voc', () => {
    const f = formsOf('puer puerī m.', 'boy')
    expect(has(f.get('puer'), { c: 'nom', n: 'sg' })).toBe(true)
    expect(has(f.get('puer'), { c: 'voc', n: 'sg' })).toBe(true)
    expect(f.get('puere')).toBeUndefined()
  })

  test('3rd declension neuter corpus', () => {
    const f = formsOf('corpus corporis n.', 'body')
    const a = f.get('corpus')
    expect(has(a, { c: 'nom', n: 'sg' })).toBe(true)
    expect(has(a, { c: 'acc', n: 'sg' })).toBe(true)
    expect(has(f.get('corporum'), { c: 'gen', n: 'pl' })).toBe(true)
    expect(f.get('corporium')).toBeUndefined()
  })

  test('mixed i-stem cīvis: gen pl -ium but abl sg -e', () => {
    const f = formsOf('cīvis cīvis m./f.', 'citizen')
    expect(has(f.get('cīvium'), { c: 'gen', n: 'pl' })).toBe(true)
    expect(has(f.get('cīve'), { c: 'abl', n: 'sg' })).toBe(true)
    expect(has(f.get('cīvī'), { c: 'dat', n: 'sg' })).toBe(true)
    expect(has(f.get('cīvī'), { c: 'abl', n: 'sg' })).toBe(false)
    // m./f. noun carries both genders
    expect(has(f.get('cīvis'), { c: 'nom', n: 'sg', g: 'm' })).toBe(true)
    expect(has(f.get('cīvis'), { c: 'nom', n: 'sg', g: 'f' })).toBe(true)
  })

  test('neuter i-stem mare keeps abl sg -ī', () => {
    const f = formsOf('mare maris n.', 'sea')
    expect(has(f.get('marī'), { c: 'abl', n: 'sg' })).toBe(true)
    expect(has(f.get('maria'), { c: 'nom', n: 'pl' })).toBe(true)
    expect(has(f.get('marium'), { c: 'gen', n: 'pl' })).toBe(true)
  })

  test('canis dismissed as i-stem via not-i-stem flag', () => {
    const f = formsOf('canis canis m./f.', 'dog', ['not-i-stem'])
    expect(has(f.get('canum'), { c: 'gen', n: 'pl' })).toBe(true)
    expect(f.get('canium')).toBeUndefined()
    expect(has(f.get('cane'), { c: 'abl', n: 'sg' })).toBe(true)
  })

  test('4th declension manus', () => {
    const f = formsOf('manus manūs f.', 'hand')
    const a = f.get('manūs')
    expect(has(a, { c: 'gen', n: 'sg' })).toBe(true)
    expect(has(a, { c: 'nom', n: 'pl' })).toBe(true)
    expect(has(f.get('manuī'), { c: 'dat', n: 'sg' })).toBe(true)
  })

  test('5th declension diēs', () => {
    const f = formsOf('diēs diēī m.', 'day')
    expect(has(f.get('diēī'), { c: 'gen', n: 'sg' })).toBe(true)
    expect(has(f.get('diērum'), { c: 'gen', n: 'pl' })).toBe(true)
  })

  test('plural-only noun aedēs has no singular analyses', () => {
    const f = formsOf('aedēs aedium f.pl.', 'house')
    expect(has(f.get('aedium'), { c: 'gen', n: 'pl' })).toBe(true)
    for (const [, analyses] of f) {
      expect(analyses.every((a) => a.n === 'pl')).toBe(true)
    }
  })

  test('plural-only 2nd declension castra', () => {
    const f = formsOf('castra castrōrum n.pl.', 'camp')
    expect(has(f.get('castra'), { c: 'nom', n: 'pl' })).toBe(true)
    expect(has(f.get('castrōrum'), { c: 'gen', n: 'pl' })).toBe(true)
    expect(f.get('castrum')).toBeUndefined()
  })
})

describe('adjectives', () => {
  test('1st/2nd declension bonus across genders', () => {
    const f = formsOf('bonus bona bonum', 'good')
    expect(has(f.get('bonae'), { c: 'gen', n: 'sg', g: 'f' })).toBe(true)
    expect(has(f.get('bonīs'), { c: 'dat', n: 'pl', g: 'm' })).toBe(true)
    expect(has(f.get('bonīs'), { c: 'abl', n: 'pl', g: 'n' })).toBe(true)
    expect(has(f.get('bone'), { c: 'voc', n: 'sg', g: 'm' })).toBe(true)
  })

  test('-er adjective pulcher', () => {
    const f = formsOf('pulcher pulchra pulchrum', 'beautiful')
    expect(has(f.get('pulcher'), { c: 'nom', n: 'sg', g: 'm' })).toBe(true)
    expect(has(f.get('pulchrī'), { c: 'gen', n: 'sg', g: 'm' })).toBe(true)
  })

  test('3rd declension 2-termination fortis: merged m/f analyses preserved', () => {
    const f = formsOf('fortis forte', 'brave')
    const a = f.get('fortis')
    expect(has(a, { c: 'nom', n: 'sg', g: 'm' })).toBe(true)
    expect(has(a, { c: 'nom', n: 'sg', g: 'f' })).toBe(true)
    expect(has(a, { c: 'gen', n: 'sg', g: 'n' })).toBe(true)
    expect(has(f.get('fortia'), { c: 'nom', n: 'pl', g: 'n' })).toBe(true)
    expect(has(f.get('fortium'), { c: 'gen', n: 'pl', g: 'm' })).toBe(true)
  })

  test('1-termination fēlīx-type from parenthesized genitive', () => {
    const f = formsOf('audāx (audācis)', 'bold')
    const a = f.get('audāx')
    expect(has(a, { c: 'nom', n: 'sg', g: 'm' })).toBe(true)
    expect(has(a, { c: 'nom', n: 'sg', g: 'n' })).toBe(true)
    expect(has(a, { c: 'acc', n: 'sg', g: 'n' })).toBe(true)
    expect(has(f.get('audācia'), { c: 'nom', n: 'pl', g: 'n' })).toBe(true)
  })

  test('pronominal alius has gen -īus and neuter aliud', () => {
    const f = formsOf('alius alia aliud', 'another')
    expect(has(f.get('aliud'), { c: 'nom', n: 'sg', g: 'n' })).toBe(true)
    const gen = [...f.entries()].find(([s]) => s.endsWith('īus'))
    expect(gen).toBeDefined()
  })

  test('meus has irregular vocative mī', () => {
    const f = formsOf('meus mea meum', 'my', ['1']) // includeVoc via default visibility
    expect(has(f.get('mī'), { c: 'voc', n: 'sg', g: 'm' })).toBe(true)
    expect(f.get('mee')).toBeUndefined()
  })

  test('plural-cited cēterī has no singular analyses', () => {
    const f = formsOf('cēterī cēterae cētera', '(pl. only) the rest')
    expect(has(f.get('cēterōrum'), { c: 'gen', n: 'pl', g: 'm' })).toBe(true)
    for (const [, analyses] of f) {
      expect(analyses.every((a) => a.n === 'pl')).toBe(true)
    }
  })
})

describe('verbs', () => {
  test('1st conjugation amō: finite spot checks', () => {
    const f = formsOf('amō amāre amāvī amātum', 'love')
    expect(has(f.get('amat'), { k: 'fin', t: 'pres', m: 'ind', v: 'act', p: '3', n: 'sg' })).toBe(true)
    expect(has(f.get('amābit'), { t: 'fut', p: '3', n: 'sg' })).toBe(true)
    expect(has(f.get('amāvistī'), { t: 'pf', p: '2', n: 'sg' })).toBe(true)
    expect(has(f.get('amāverit'), { t: 'futpf', m: 'ind' })).toBe(true)
    expect(has(f.get('amāverit'), { t: 'pf', m: 'subj' })).toBe(true)
    expect(has(f.get('amētur'), { t: 'pres', m: 'subj', v: 'pass' })).toBe(true)
  })

  test('amō: imperatives, infinitives, participles incl. gerundive', () => {
    const f = formsOf('amō amāre amāvī amātum', 'love')
    expect(has(f.get('amā'), { k: 'imp', n: 'sg' })).toBe(true)
    expect(has(f.get('amāte'), { k: 'imp', n: 'pl' })).toBe(true)
    expect(has(f.get('amāre'), { k: 'inf', t: 'pres', v: 'act' })).toBe(true)
    expect(has(f.get('amārī'), { k: 'inf', t: 'pres', v: 'pass' })).toBe(true)
    expect(has(f.get('amāvisse'), { k: 'inf', t: 'pf', v: 'act' })).toBe(true)
    expect(has(f.get('amāns'), { k: 'ptc', t: 'pres', v: 'act' })).toBe(true)
    expect(has(f.get('amātus'), { k: 'ptc', t: 'pf', v: 'pass' })).toBe(true)
    expect(has(f.get('amātūrus'), { k: 'ptc', t: 'fut', v: 'act' })).toBe(true)
    expect(has(f.get('amandus'), { k: 'ptc', t: 'fut', v: 'pass' })).toBe(true)
  })

  test('3rd conjugation dūcō has imperative dūc', () => {
    const f = formsOf('dūcō dūcere dūxī ductum', 'lead')
    expect(has(f.get('dūc'), { k: 'imp', n: 'sg' })).toBe(true)
    expect(has(f.get('dūcet'), { t: 'fut', p: '3', n: 'sg', v: 'act' })).toBe(true)
  })

  test('3io capiō', () => {
    const f = formsOf('capiō capere cēpī captum', 'take')
    expect(has(f.get('capiunt'), { t: 'pres', p: '3', n: 'pl', v: 'act' })).toBe(true)
    expect(has(f.get('capiētur'), { t: 'fut', p: '3', n: 'sg', v: 'pass' })).toBe(true)
  })

  test('irregular sum', () => {
    const f = formsOf('sum esse fuī (futūrus)', 'be')
    expect(has(f.get('est'), { t: 'pres', p: '3', n: 'sg' })).toBe(true)
    expect(has(f.get('erat'), { t: 'impf', p: '3', n: 'sg' })).toBe(true)
    expect(has(f.get('sīs'), { t: 'pres', m: 'subj', p: '2', n: 'sg' })).toBe(true)
    expect(has(f.get('esse'), { k: 'inf', t: 'pres' })).toBe(true)
  })

  test('compound adsum prefixes the sum paradigm', () => {
    const f = formsOf('adsum adesse adfuī', 'be present')
    expect(has(f.get('adest'), { t: 'pres', p: '3', n: 'sg' })).toBe(true)
    expect(has(f.get('aderat'), { t: 'impf' })).toBe(true)
    expect(has(f.get('adfuistī'), { t: 'pf', p: '2', n: 'sg' })).toBe(true)
    expect(has(f.get('adesse'), { k: 'inf', t: 'pres' })).toBe(true)
  })

  test('compound adeō prefixes the eō paradigm', () => {
    const f = formsOf('adeō adīre adiī (aditūrus)', 'approach')
    expect(has(f.get('adit'), { t: 'pres', p: '3', n: 'sg' })).toBe(true)
    expect(has(f.get('adiit'), { t: 'pf', p: '3', n: 'sg' })).toBe(true)
  })

  test('compound referō uses per-system prefixes', () => {
    const f = formsOf('referō referre rettulī relātum', 'bring back')
    expect(has(f.get('refert'), { t: 'pres', p: '3', n: 'sg', v: 'act' })).toBe(true)
    expect(has(f.get('rettulit'), { t: 'pf', p: '3', n: 'sg', v: 'act' })).toBe(true)
    expect(has(f.get('relātus'), { k: 'ptc', t: 'pf', v: 'pass' })).toBe(true)
  })

  test('deponent sequor', () => {
    const f = formsOf('sequor sequī secūtus sum', 'follow')
    expect(has(f.get('sequitur'), { t: 'pres', p: '3', n: 'sg' })).toBe(true)
    expect(has(f.get('sequī'), { k: 'inf', t: 'pres' })).toBe(true)
    expect(f.get('sequit')).toBeUndefined()
  })

  test('4th-conjugation audiō is NOT mistaken for a compound of eō', () => {
    const f = formsOf('audiō audīre audīvī audītum', 'hear')
    expect(has(f.get('audiunt'), { t: 'pres', p: '3', n: 'pl', v: 'act' })).toBe(true)
    expect(f.get('audeunt')).toBeUndefined()
    expect(has(f.get('audī'), { k: 'imp', n: 'sg' })).toBe(true)
    expect(f.get('audīree')).toBeUndefined()
  })

  test('eō has imperatives ī / īte, not engine garbage', () => {
    const f = formsOf('eō īre iī (īvī) itūrum', 'go')
    expect(has(f.get('ī'), { k: 'imp', n: 'sg' })).toBe(true)
    expect(has(f.get('īte'), { k: 'imp', n: 'pl' })).toBe(true)
    expect(f.get('īree')).toBeUndefined()
  })

  test('compound redeō gets prefixed imperatives', () => {
    const f = formsOf('redeō redīre rediī (reditūrus)', 'return')
    expect(has(f.get('redī'), { k: 'imp', n: 'sg' })).toBe(true)
  })

  test('nōlō imperatives; mālō and possum have none', () => {
    const nolo = formsOf('nōlō nōlle nōluī', 'be unwilling')
    expect(has(nolo.get('nōlī'), { k: 'imp', n: 'sg' })).toBe(true)
    expect(has(nolo.get('nōlīte'), { k: 'imp', n: 'pl' })).toBe(true)
    for (const f of [formsOf('mālō mālle māluī', 'prefer'), formsOf('possum posse potuī', 'be able')]) {
      for (const [, analyses] of f) {
        expect(analyses.every((a) => a.k !== 'imp')).toBe(true)
      }
    }
  })

  test('impersonal decet: only 3rd singular plus infinitive', () => {
    const f = formsOf('decet decēre decuit', '(impers.) is fitting')
    expect(has(f.get('decet'), { k: 'fin', t: 'pres', p: '3', n: 'sg' })).toBe(true)
    expect(has(f.get('decuit'), { k: 'fin', t: 'pf', p: '3', n: 'sg' })).toBe(true)
    expect(has(f.get('decēre'), { k: 'inf', t: 'pres' })).toBe(true)
    expect(f.get('deceō')).toBeUndefined()
    expect(f.get('decēreunt')).toBeUndefined()
    for (const [, analyses] of f) {
      for (const a of analyses) {
        if (a.k === 'fin') {
          expect(a.p).toBe('3')
          expect(a.n).toBe('sg')
        }
      }
    }
  })

  test('perfect-only meminī generates only the perfect system', () => {
    const f = formsOf('meminī meminisse', 'remember')
    expect(has(f.get('meminit'), { t: 'pf', m: 'ind', p: '3', n: 'sg' })).toBe(true)
    expect(has(f.get('meminerat'), { t: 'plupf', p: '3', n: 'sg' })).toBe(true)
    expect(has(f.get('meminisse'), { k: 'inf', t: 'pf' })).toBe(true)
    for (const [, analyses] of f) {
      expect(analyses.every((a) => a.k === 'inf' || ['pf', 'plupf', 'futpf'].includes(a.t!))).toBe(true)
    }
  })
})

describe('pronouns', () => {
  test('hic: hoc (short) is nom/acc n, hōc (long) is ablative', () => {
    const f = formsOf('hic haec hoc', 'this')
    const short = f.get('hoc')
    expect(has(short, { c: 'nom', n: 'sg', g: 'n' })).toBe(true)
    expect(has(short, { c: 'acc', n: 'sg', g: 'n' })).toBe(true)
    expect(has(short, { c: 'abl', n: 'sg', g: 'm' })).toBe(false)
    expect(has(f.get('hōc'), { c: 'abl', n: 'sg', g: 'm' })).toBe(true)
    expect(has(f.get('huius') ?? f.get('hujus'), { c: 'gen', n: 'sg' })).toBe(true)
  })

  test('is has e-stem plurals; iī/iīs remain as alternates', () => {
    const f = formsOf('is ea id', 'he, she, it')
    expect(has(f.get('eae'), { c: 'nom', n: 'pl', g: 'f' })).toBe(true)
    expect(has(f.get('eōrum'), { c: 'gen', n: 'pl', g: 'm' })).toBe(true)
    expect(has(f.get('eius'), { c: 'gen', n: 'sg', g: 'm' })).toBe(true)
    expect(has(f.get('iī'), { c: 'nom', n: 'pl', g: 'm' })).toBe(true)
    expect(has(f.get('iīs'), { c: 'dat', n: 'pl', g: 'f' })).toBe(true)
    for (const fake of ['iae', 'ia', 'iārum', 'iōrum', 'iās', 'iōs', 'eīus']) {
      expect(f.get(fake)).toBeUndefined()
    }
  })

  test('īdem declines with -dem throughout', () => {
    const f = formsOf('īdem eadem idem', 'the same')
    expect(has(f.get('eiusdem'), { c: 'gen', n: 'sg', g: 'f' })).toBe(true)
    expect(has(f.get('eundem'), { c: 'acc', n: 'sg', g: 'm' })).toBe(true)
    expect(has(f.get('eaedem'), { c: 'nom', n: 'pl', g: 'f' })).toBe(true)
    expect(has(f.get('eōrundem'), { c: 'gen', n: 'pl', g: 'n' })).toBe(true)
    expect(has(f.get('eīsdem'), { c: 'abl', n: 'pl', g: 'm' })).toBe(true)
    expect(f.get('eōrundīus')).toBeUndefined()
    expect(has(f.get('eae'), { c: 'nom', n: 'pl', g: 'f' })).toBe(false)
  })

  test('quisque keeps its nom sg quisque', () => {
    const f = formsOf('quisque quaeque quodque', 'each')
    expect(has(f.get('quisque'), { c: 'nom', n: 'sg', g: 'm' })).toBe(true)
    expect(has(f.get('quidque'), { c: 'nom', n: 'sg', g: 'n' })).toBe(true)
    expect(f.get('quīque')?.some((a) => a.n === 'sg')).toBeFalsy()
  })

  test('aliquis: substantive and adjectival nominatives, feminine aliqua', () => {
    const f = formsOf('aliquis aliquid', 'someone, something')
    expect(has(f.get('aliquis'), { c: 'nom', n: 'sg', g: 'm' })).toBe(true)
    expect(has(f.get('aliqua'), { c: 'nom', n: 'sg', g: 'f' })).toBe(true)
    expect(has(f.get('aliquid'), { c: 'nom', n: 'sg', g: 'n' })).toBe(true)
    expect(has(f.get('aliquae'), { c: 'nom', n: 'sg', g: 'f' })).toBe(false)
  })

  test('quisquis keeps only attested forms, no doubled fantasy cases', () => {
    const f = formsOf('quisquis quidquid', 'whoever, whatever')
    expect(has(f.get('quisquis'), { c: 'nom', n: 'sg', g: 'm' })).toBe(true)
    expect(has(f.get('quidquid'), { c: 'nom', n: 'sg', g: 'n' })).toBe(true)
    expect(has(f.get('quicquid'), { c: 'acc', n: 'sg', g: 'n' })).toBe(true)
    expect(has(f.get('quōquō'), { c: 'abl', n: 'sg', g: 'm' })).toBe(true)
    for (const fake of ['cuiuscuius', 'cuicui', 'quōrumquōrum', 'quārumquārum', 'quāsquās', 'quōsquōs', 'quaequae', 'quīquī']) {
      expect(f.get(fake)).toBeUndefined()
    }
  })

  test('personal pronoun ego', () => {
    const f = formsOf('ego meī', 'I')
    expect(has(f.get('ego'), { c: 'nom', n: 'sg' })).toBe(true)
  })

  test('slash-cited alternates split into separate surfaces', () => {
    const f = formsOf('nōs nostrum', 'we')
    expect(has(f.get('nostrī'), { c: 'gen', n: 'pl' })).toBe(true)
    expect(has(f.get('nostrum'), { c: 'gen', n: 'pl' })).toBe(true)
    expect(f.get('nostrī/nostrum')).toBeUndefined()
  })
})

describe('classifyEntry adjective classes', async () => {
  const { classifyEntry } = await import('./adapter')
  test('–us –a –um / 3rd / irregular buckets', () => {
    expect(classifyEntry(entryOf('bonus bona bonum', 'good'))).toBe('1-2')
    expect(classifyEntry(entryOf('fortis forte', 'brave'))).toBe('3')
    expect(classifyEntry(entryOf('audāx (audācis)', 'bold'))).toBe('3')
    expect(classifyEntry(entryOf('alius alia aliud', 'another'))).toBe('irreg')
    expect(classifyEntry(entryOf('maior maius', '(comp.) greater'))).toBe('3')
  })
})

describe('uninflected and overrides', () => {
  test('adverbs produce no forms', () => {
    expect(generateFormsForEntry(entryOf('ācriter', '(adv.) sharply'))).toEqual([])
  })

  test('override forms are passed through verbatim', () => {
    const e = entryOf('fīō fierī factum', 'become')
    const forms = [{ s: 'fit', a: [{ k: 'fin', t: 'pres', m: 'ind', p: '3', n: 'sg' } as Analysis] }]
    const out = generateFormsForEntry(e, forms)
    expect(out).toHaveLength(1)
    expect(out[0].s).toBe('fit')
    expect(out[0].l).toBe('test')
  })
})
