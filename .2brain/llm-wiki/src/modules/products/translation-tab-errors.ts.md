---
source: src/modules/products/translation-tab-errors.ts
sha256: c2e4a451a911c3c6066d22e4d08228e5aeeea339782150a9a96233f8e97ba53e
signature: b65e7d81805503f42719373a36cdbc7aa71c2e9a615a77f2a3ababe82f24e1e5
generated_at: 2026-11-10T05:33:21.375580+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/translation-tab-errors.ts

## Purpose

Converts validation failures (Zod `safeParse` results or rejected `PATCH` field pointers) into a per-locale error count map so that `ProductCreate.vue` / `ProductEdit.vue` can badge the specific language tab that owns a failure. It exists because `useStructureFormValidation.formErrors` keys every issue by `issue.path[0]`, collapsing all locale-specific `translations` issues into a single flat bucket with no way to distinguish which language failed.

## Key elements

- **`TranslationIssue`** (interface, not exported) — minimal `{ path, message }` shape; deliberately narrower than Zod's own issue type so a schema swap only breaks this file if that shape changes.
- **`TranslationTabErrorCounts`** (exported type) — `Record<string, number>`; a locale with zero errors is simply absent, so `Object.keys(counts).length` doubles as an "any errors?" check.
- **`localeOf`** (internal) — extracts the locale tag from a path shaped `['translations', <locale>, …]`; returns `undefined` for non-translation issues.
- **`translationTabErrorCounts`** (exported) — buckets an array of `TranslationIssue`s by locale into a count map.
- **`translationTabErrorCountsFromZodError`** (exported) — thin wrapper that calls the above with `error.issues`.
- **`translationTabErrorCountsFromServerError`** (exported) — accepts an `unknown` rejection value, locates the first envelope that carries an `errors` array (checks `error`, `error.data`, `error.response.data`), extracts `details.field` strings starting with `translations.`, and feeds them through `translationTabErrorCounts`.

## Relationships

- **`src/modules/products/composables/use-translated-entity-form.ts`** — The consuming side of this module. The composable (or the views it powers) calls one of the exported `translationTabErrorCounts*` functions to obtain per-locale counts for rendering tab badges, complementing the flat `formErrors` it already receives from `useStructureFormValidation`.
- **`src/modules/products/tests/translation-tab-errors.spec.ts`** — Unit tests covering the bucketing logic, the Zod-error wrapper, and the server-rejection envelope parsing.

## Notes

- `translationTabErrorCountsFromServerError` intentionally mirrors the three-candidate envelope lookup used by `useStructureFormValidation.applyServerErrors` but does **not** import the envelope type; it narrows `unknown` by hand via `isRecord`.
- The `.find` predicate over the candidate list checks that the candidate actually **carries** an `errors` array, not just that it is a record—picking the first record blindly would always return the outermost `error`.
- Only field pointers whose string starts with `translations.` are processed; any other `details.field` value is silently skipped, matching the file's scope to translation-tab errors.
