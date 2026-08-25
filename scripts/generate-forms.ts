/**
 * Form generation: data/<dataset>/entries.json → public/datasets/<dataset>/
 * (entries.json, forms.<pos>.json, manifest.json)
 *
 * Every inflectable entry (n/adj/v/pron) must yield forms, come from an
 * override paradigm, or carry the 'no-forms' flag — anything else fails the
 * build so silent coverage gaps are impossible.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { classifyEntry, generateFormsForEntry } from '../src/lib/morph/adapter'
import type { Analysis, DatasetManifest, FormRecord, VocabEntry } from '../src/lib/dataset/types'

const datasetId = process.argv.includes('--dataset')
  ? process.argv[process.argv.indexOf('--dataset') + 1]
  : 'knudsvig-731'

const dataDir = join(import.meta.dirname, '..', 'data', datasetId)
const outDir = join(import.meta.dirname, '..', 'public', 'datasets', datasetId)
const MAX_TOTAL_BYTES = 6 * 1024 * 1024

const entries: VocabEntry[] = JSON.parse(readFileSync(join(dataDir, 'entries.json'), 'utf8'))

const INFLECTABLE = new Set(['n', 'adj', 'v', 'pron'])
const buckets: Record<string, FormRecord[]> = { n: [], adj: [], v: [], pron: [] }
const missing: string[] = []

for (const entry of entries) {
  if (!INFLECTABLE.has(entry.pos)) continue

  let overrideForms: Array<{ s: string; a: Analysis[] }> | undefined
  if (entry.morphOverride) {
    const override = JSON.parse(readFileSync(join(dataDir, 'overrides', entry.morphOverride), 'utf8'))
    if (override.forms) overrideForms = override.forms
  }

  const records = generateFormsForEntry(entry, overrideForms)
  if (records.length === 0) {
    if (!entry.flags.includes('no-forms')) missing.push(`${entry.id} — ${entry.dict}`)
    continue
  }
  buckets[entry.pos].push(...records)
}

if (missing.length) {
  console.error(`\n${missing.length} inflectable entries produced no forms and lack a 'no-forms' flag or override:\n`)
  for (const m of missing) console.error(`  - ${m}`)
  process.exit(1)
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

let totalBytes = 0
let surfaces = 0
const formFiles: DatasetManifest['forms'] = {}
for (const pos of ['n', 'adj', 'v', 'pron'] as const) {
  const file = `forms.${pos}.json`
  const json = JSON.stringify(buckets[pos])
  totalBytes += Buffer.byteLength(json)
  surfaces += buckets[pos].length
  formFiles[pos] = file
  writeFileSync(join(outDir, file), json)
}

for (const entry of entries) {
  const cls = classifyEntry(entry)
  if (cls) entry.cls = cls
}
const entriesJson = JSON.stringify(entries)
totalBytes += Buffer.byteLength(entriesJson)
writeFileSync(join(outDir, 'entries.json'), entriesJson)

const manifest: DatasetManifest = {
  id: datasetId,
  name: 'Knudsvig, Latin for Reading',
  version: new Date().toISOString().slice(0, 10),
  chapters: Math.max(...entries.map((e) => e.chapter)),
  entries: 'entries.json',
  forms: formFiles,
  stats: { entries: entries.length, surfaces },
}
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1))

const index = { datasets: [{ id: datasetId, name: manifest.name, path: `datasets/${datasetId}` }], default: datasetId }
const indexPath = join(import.meta.dirname, '..', 'public', 'datasets', 'index.json')
if (existsSync(indexPath)) {
  const existing = JSON.parse(readFileSync(indexPath, 'utf8'))
  const others = existing.datasets.filter((d: { id: string }) => d.id !== datasetId)
  index.datasets = [...others, ...index.datasets]
  index.default = existing.default
}
writeFileSync(indexPath, JSON.stringify(index, null, 1))

if (totalBytes > MAX_TOTAL_BYTES) {
  console.error(`dataset too large: ${(totalBytes / 1e6).toFixed(1)} MB > ${MAX_TOTAL_BYTES / 1e6} MB`)
  process.exit(1)
}

const perPos = Object.entries(buckets).map(([p, b]) => `${p}:${b.length}`).join(' ')
console.log(`surfaces: ${surfaces} (${perPos}), total ${(totalBytes / 1e6).toFixed(2)} MB`)
