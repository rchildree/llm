/** Fetches the active dataset (manifest, entries, per-POS form chunks) from static hosting. */
import type { DatasetIndex, DatasetManifest, FormRecord, VocabEntry } from './types'

const base = `${import.meta.env.BASE_URL}datasets`

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`failed to load ${path}: ${res.status}`)
  return res.json()
}

export interface Dataset {
  manifest: DatasetManifest
  entries: VocabEntry[]
  /** lazily-loaded form chunks by pos */
  forms(pos: 'n' | 'adj' | 'v' | 'pron'): Promise<FormRecord[]>
}

export async function loadDefaultDataset(): Promise<Dataset> {
  const index = await fetchJson<DatasetIndex>(`${base}/index.json`)
  const meta = index.datasets.find((d) => d.id === index.default) ?? index.datasets[0]
  const root = `${import.meta.env.BASE_URL}${meta.path}`
  const manifest = await fetchJson<DatasetManifest>(`${root}/manifest.json`)
  const entries = await fetchJson<VocabEntry[]>(`${root}/${manifest.entries}`)

  const cache = new Map<string, Promise<FormRecord[]>>()
  return {
    manifest,
    entries,
    forms(pos) {
      const file = manifest.forms[pos]
      if (!file) return Promise.resolve([])
      let p = cache.get(pos)
      if (!p) cache.set(pos, (p = fetchJson<FormRecord[]>(`${root}/${file}`)))
      return p
    },
  }
}
