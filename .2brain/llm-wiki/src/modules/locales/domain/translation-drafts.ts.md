---
source: src/modules/locales/domain/translation-drafts.ts
sha256: b2c1a65c3f9e2560f2e70349743a3eca1392b20a1dab671db60c5eeca7ebb2d9
signature: aaceb2c9a635866da6e44a35b0cac7d502a8bd8b38d62ecd545b374adf2d5074
generated_at: 2026-11-10T04:40:33.428753+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/domain/translation-drafts.ts

## Purpose

Pures the entity-translations editor's in-memory draft state into the PATCH request body sent to `PATCH /locales/translations/{entityType}/{id}`. It exists so the view layer never has to know the wire format.

## Key elements

- **`TranslationDrafts`** (type export) — `Record<string, Record<string, string> | null>`: one entry per open locale; the inner object maps field names to string values, or `null` signals the locale tab is marked for removal.
- **`toUpdateEntityTranslationsBody`** (const export) — Converts a `TranslationDrafts` value into an `UpdateEntityTranslationsRequest`. For each locale it emits `{ fields: {…}, origin: TranslationOrigin.human }` (or `null` for removed locales). Blank field values (`''`) are mapped to `null` so the API interprets them as "clear" rather than "keep."

## Relationships

- **`src/modules/locales/domain/index.ts`** — Barrel file; re-exports `TranslationDrafts` and `toUpdateEntityTranslationsBody` for consumers outside the domain folder.
- **`src/modules/locales/tests/translation-drafts.spec.ts`** — Unit tests for `toUpdateEntityTranslationsBody`, covering blank-value → `null` mapping and removed-locale passthrough.
- **`src/modules/locales/views/EntityTranslations.vue`** — The editor view that collects drafts in a reactive ref and calls `toUpdateEntityTranslationsBody` when the user saves.

## Notes

- Blank string fields are intentionally serialized as `null` (not omitted) because the API's merge-patch semantics treat a missing key as "leave unchanged" and an explicit `null` as "clear." Dropping a key would cause a cleared description to silently persist.
- The `origin` field is hardcoded to `TranslationOrigin.human`; there is no code path in this file that produces a different origin.
- The type `UpdateEntityTranslationsRequest` comes from the shared `@types` package, not from a local domain type — keep that in mind when the API contract changes.
