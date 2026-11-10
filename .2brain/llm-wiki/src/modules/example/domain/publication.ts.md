---
source: src/modules/example/domain/publication.ts
sha256: 7f0aa4d9e8c72e328639c39d86001dcdf2d95be17836b98c230f80fdc7a82482
signature: 6060368085e673f77a0d81966743a7075a55bdc032c7e1bd132caf100e18cf1a
generated_at: 2026-11-10T04:22:16.386454+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/domain/publication.ts

## Purpose

A domain-layer reading rule that collapses an `Example`'s `status` and `publishedAt` into a single three-state verdict (`live` / `withdrawn` / `never`) for screen display. It interprets existing server data but makes no decisions the server doesn't already own, and it is testable as a pure function with no component mounting.

## Key elements

- **`PublicationState`** (type) — the three-union `'live' | 'withdrawn' | 'never'`.
- **`Publication`** (interface) — the shape a view receives: `{ state, firstPublishedAt? }`. `firstPublishedAt` is absent when `state` is `'never'`.
- **`publicationOf`** (const, exported) — the sole logic. Takes `Pick<Example, 'status' | 'publishedAt'>`, switches on `status`, and returns a `Publication`. Pure, synchronous, no side effects.

## Relationships

- **`src/modules/example/domain/index.ts`** — barrel file that re-exports this module's public API (`PublicationState`, `Publication`, `publicationOf`) for consumers outside the domain folder.
- **`src/modules/example/tests/publication.spec.ts`** — unit tests that exercise `publicationOf` across every `status` × `publishedAt` combination.
- **`src/modules/example/views/ExampleTarget.vue`** and **`src/modules/example/views/ExamplesList.vue`** — view components that import `publicationOf` (and the `Publication` type) to decide what publication label/date to render. They do not read `status` or `publishedAt` directly.

## Notes

- The `switch` over `status` is exhaustive: adding a new status to the `Example` contract makes this file fail to compile until a branch is added. Treat it as a deliberate guard, not a style choice.
- `firstPublishedAt` is read-only here and, per the domain doc, is stamped once and never cleared. The rule never mutates or re-derives it; it only surfaces it.
- `never` and `withdrawn` are distinguished solely by the presence of `publishedAt`. A record that was never published will have `publishedAt` undefined regardless of whether it is `draft` or `archived`.
- The file deliberately returns a *verdict* (state + date), not display copy. View components are responsible for choosing the human-readable label for each state.
