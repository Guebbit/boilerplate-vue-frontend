---
source: src/modules/products/composables/translation-tab-errors.ts
sha256: c2e4a451a911c3c6066d22e4d08228e5aeeea339782150a9a96233f8e97ba53e
generated_at: 2026-10-17T01:27:13.460974+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/composables/translation-tab-errors.ts

## Purpose

Converts Zod validation failures and rejected-PATCH field pointers into a per-locale error count map so that `ProductCreate.vue` / `ProductEdit.vue` can badge the specific language tab that owns a failure. It exists because `useStructureFormValidation.formErrors` keys every issue by `issue.path[0]`, collapsing all locale-specific title/description errors into a single flat `translations` bucket with no way to distinguish which language failed.

## Key elements

- **`TranslationTabErrorCounts`** (exported type) — `Record<string, number>`; the per-locale count a tab badge renders. A locale with zero issues is simply absent.
- **`translationTabErrorCounts(issues: TranslationIssue[])`** (exported) — Core bucketing function. Walks an array of issues, extracts the locale from each issue's path, and returns a `{ locale: count }` map. Issues whose path does not start with `['translations', <string>, …]` are skipped.
- **`translationTabErrorCountsFromZodError(error: ZodError)`** (exported) — Thin wrapper that calls `translationTabErrorCounts(error.issues)`.
- **`translationTabErrorCountsFromServerError(error: unknown)`** (exported) — Accepts an `unknown` rejection value, locates the `errors` array across the three known envelopes (`error`, `error.data`, `error.response.data`), filters entries whose `details.field` starts with `translations.`, splits the dotted field into a path, and delegates to `translationTabErrorCounts`.
- **`localeOf(path)`** (internal) — Returns `path[1]` when `path[0] === 'translations'` and `path[1]` is a string; otherwise `undefined`.
- **`isRecord(value)`** (internal) — Type guard narrowing `unknown` to a plain keyed object.

## Relationships

- **`src/modules/products/composables/use-translated-entity-form.ts`** — The form composable whose `formErrors` output this module works around. The two are complementary: `use-translated-entity-form` produces a flat per-top-level-field error map; this file re-derives the locale granularity it loses.
- **`src/modules/products/tests/translation-tab-errors.spec.ts`** — Unit-test file exercising the three exported functions above.

## Notes

- The file deliberately uses a minimal local `TranslationIssue` interface (`path` + `message`) instead of importing Zod's full issue type, so a schema swap only breaks this file if the two read properties change shape.
- `translationTabErrorCountsFromServerError` mirrors the envelope-picking order used by `useStructureFormValidation.applyServerErrors` (`error` → `error.data` → `error.response.data`) but intentionally keeps the full dotted `field` string to preserve locale, which the flat `formErrors` bucket discards.
- Only `translations.<locale>.<field>` pointers are counted; top-level field errors (e.g. `price`) and whole-body refinements are excluded by design.
