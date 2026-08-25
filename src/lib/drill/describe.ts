/** Human-readable rendering of an Analysis, for reveal explanations. */
import type { Analysis } from '../dataset/types'

const CASE: Record<string, string> = {
  nom: 'nom.', gen: 'gen.', dat: 'dat.', acc: 'acc.', abl: 'abl.', voc: 'voc.', loc: 'loc.',
}
const NUM: Record<string, string> = { sg: 'sg.', pl: 'pl.' }
const GEN: Record<string, string> = { m: 'm.', f: 'f.', n: 'n.' }
const DEG: Record<string, string> = { pos: '', comp: 'comparative', superl: 'superlative' }
const TENSE: Record<string, string> = {
  pres: 'pres.', impf: 'impf.', fut: 'fut.', pf: 'pf.', plupf: 'plupf.', futpf: 'fut. pf.',
}
const MOOD: Record<string, string> = { ind: 'ind.', subj: 'subj.' }
const VOICE: Record<string, string> = { act: 'act.', pass: 'pass.' }
const PERSON: Record<string, string> = { '1': '1st', '2': '2nd', '3': '3rd' }

export function describeAnalysis(a: Analysis): string {
  switch (a.k) {
    case 'nom':
      return [a.c && CASE[a.c], a.n && NUM[a.n], a.g && GEN[a.g], a.d && DEG[a.d]]
        .filter(Boolean)
        .join(' ')
    case 'fin':
      // canonical order: person number, tense, voice, mood
      return [a.p && PERSON[a.p], a.n && NUM[a.n], a.t && TENSE[a.t], a.v && VOICE[a.v], a.m && MOOD[a.m]]
        .filter(Boolean)
        .join(' ')
    case 'inf':
      return [a.t && TENSE[a.t], a.v && VOICE[a.v], 'infinitive'].filter(Boolean).join(' ')
    case 'imp':
      return ['imperative', a.n && NUM[a.n]].filter(Boolean).join(' ')
    case 'ptc': {
      // canonical order: case, number, gender, tense, voice, participle
      if (!a.c && a.t === 'fut' && a.v === 'pass') return 'gerundive (fut. pass. participle)'
      return [
        a.c && CASE[a.c], a.n && NUM[a.n], a.g && GEN[a.g],
        a.t && TENSE[a.t], a.v && VOICE[a.v], 'participle',
      ]
        .filter(Boolean)
        .join(' ')
    }
  }
}
