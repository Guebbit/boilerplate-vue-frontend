---
source: src/app/utils/static-pages.generated.ts
sha256: e00c9ba24431145d1bc05da858b964823e451ad71b85cc92cb5ea6afc593b0a7
signature: 819a67c368e8ddad5676d011596df271f7dbe56ab2577bd50b3f29713241e519
generated_at: 2026-11-10T02:58:25.498391+00:00
model: ollama:qwen3.8:27b
---

# src/app/utils/static-pages.generated.ts

## Purpose

Generated, read-only source for the canonical list of the shop's prose pages (about, faq, terms, privacy, legal). It exists so that a single YAML file (`shared/rules/static-pages.yaml`) can be the one place an editor changes the page set, and every downstream consumer gets a typed, ordered tuple without hand-syncing.

## Key elements

- **`STATIC_PAGE_NAMES`** (`readonly ['about', 'faq', 'terms', 'privacy', 'legal']`) — The ordered, literal-typed list of static-page slugs used for navigation, routing guards, and sitemap generation. The `as const` assertion narrows the element type to the five specific literals rather than a generic array type.

## Relationships

- **`src/app/utils/static-pages.ts`** — Hand-written companion that likely imports `STATIC_PAGE_NAMES` to build page-specific metadata (titles, descriptions, render config) or to gate routes. Editing page slugs or order here would desynchronise the two files; the YAML is the intended source of truth.

## Notes

- **Do not edit.** The header comment and the `@module` tag mark this as output of `npm run regenerate`. Changes belong in `shared/rules/static-pages.yaml`, then re-run the generator.
- Because of `as const`, any code that appends to or reassigns the array will fail at compile time — treat it strictly as a read-only tuple.
- The array order is meaningful: it defines the link order "everywhere" per the comment, so reordering in YAML changes nav/footer/sitemap order simultaneously.
