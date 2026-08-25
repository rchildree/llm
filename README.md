# ITERUM — Latin Learning Machine

One site for Latin students: **vocab flashcards** and **form-identification
drills** ("which of these is accusative plural?"), built on a pre-generated
dataset of every inflected form of the Knudsvig *Latin for Reading* vocabulary
(731 words → ~28,000 surface forms with full grammatical analyses).

No accounts, no server, no progress tracking. Flashcards are a shuffled pass
through the selected vocabulary — every word once per pass, a random direction
each card, and never the same word twice in a row — flipped to reveal, or
answered from four options with the **Multiple choice** switch. Both pages share
one chapter setting: *through* chapter N, or **only ch. N** for that chapter
alone.

## Development

```sh
npm install
npm run dev        # app at http://localhost:5173
npm test           # vitest (enrichment, morphology adapter, drill engine, deck)
npm run build      # typecheck + production build to dist/
```

## Data pipeline

```
data/knudsvig-731/latin.tsv          source vocab (DICT / DEF / CHAP)
        │  scripts/enrich.ts         parse into structured entries + review report
        ▼
data/knudsvig-731/entries.json       + enrichment-review.md (human review queue)
        │  scripts/generate-forms.ts vendored chart-workbench morphology engine
        ▼
public/datasets/knudsvig-731/        entries.json, forms.{n,adj,v,pron}.json, manifest.json
```

- `npm run data` — regenerate everything. Fails if any inflectable entry
  produces no forms (coverage gaps are impossible to miss).
- `npm run data:check` — regenerate and fail on git diff; run before deploys.
- **Overrides**: fix a bad parse or supply a hand-written paradigm by adding
  `data/knudsvig-731/overrides/<entry-id>.json`. Fields shallow-merge over the
  parsed entry; `flags` union; a `forms` array replaces generation entirely
  (see `vis-n.json` for the pattern).
- **Review**: `data/knudsvig-731/enrichment-review.md` lists everything worth
  a human look — unclassified rows, i-stem candidates, irregulars, phrases.

### Swapping in another vocab list

Datasets are pluggable. Add `data/<id>/latin.tsv` (same 3 columns), run
`npm run data -- --dataset <id>`, and edit `public/datasets/index.json` to set
the default.

## Deploying (Cloudflare Pages, free)

- Build command: `npm ci && npm run data:check && npm run build`
- Output directory: `dist`
- SPA routing is handled by `public/_redirects`.

The whole app is static — no environment variables, no backend. GitHub Pages
also works (hosts serve the dataset JSON brotli-compressed, ~400 KB on the wire).

## Architecture notes

- `src/lib/morph/` — morphology engine vendored from chart-workbench
  (`morphology.ts` byte-compatible with upstream); all extensions live in
  `adapter.ts` (compound irregulars like adsum/adeō/referō, mixed i-stem
  ablatives, plural-only citations, impersonals, perfect-only defectives,
  irregular imperatives, gerundives).
- `src/lib/drill/` — seeded question generator. A chip is correct iff any of
  its analyses (merged across every pool lemma sharing that surface) matches
  the target; distractors are sampled only from non-matching surfaces, so
  syncretism (puellae = gen/dat sg + nom pl) can never create accidental
  right answers.
- `src/lib/flash/` — the flashcard deck. `deck.ts` deals a shuffled pass and
  reshuffles when it runs out, never leading a new pass with the word that
  ended the last one; `question.ts`/`distractors.ts` build the multiple-choice
  variant, preferring same-chapter distractors.
- `src/lib/chapters.ts` — the shared "through N vs. only N" rule, used by both
  the flashcard pool and the drill generator's entry filter.
- Settings (chapter scope, card mode, drill options, help mode, u·V) live in
  `localStorage` via `src/storage/settings.ts`.
