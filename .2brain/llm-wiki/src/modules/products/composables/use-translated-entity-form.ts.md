---
source: src/modules/products/composables/use-translated-entity-form.ts
sha256: 46c9ad3046fe00591ef5e231669e0bde10cc64c316491c86440435cc8c383e11
generated_at: 2026-10-17T01:27:46.568476+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/composables/use-translated-entity-form.ts

## Purpose

Extracts the shared form logic between `ProductCreate.vue` and `ProductEdit.vue`: toolkit-backed validation state, one language tab per entry in `form.translations`, per-tab error badges, and the shared tail of a failed submit. The views keep only what differs — surrounding fields, the actual HTTP request, and whether a 412 can occur.

## Key elements

- **`TranslatedForm`** – Minimal interface requiring a `translations: ProductTranslationsWrite` field.
- **`TranslatedEntityFormOptions<TForm>`** – Options bag: initial values, Zod schema, form-element ref, fallback-locale ref, and optional `seedFallback`, `stored`, `onStale`, `reportSubmitError` callbacks.
- **`useTranslatedEntityForm(options)`** – The exported composable. Returns the toolkit's full validation handle spread in, plus `openTags`, `activeTab`, `tabErrorCounts`, `handleAddLocale`, `handleRemoveLocale`, and `handleSubmitFailure`.
- **`blankTranslation()`** – Internal factory returning `{ title: '', description: '' }` for a freshly opened tab.

## Relationships

- **`translation-tab-errors.ts`** (same directory) – Supplies `translationTabErrorCountsFromZodError` and `translationTabErrorCountsFromServerError` to populate `tabErrorCounts` from client validation and server 422 responses respectively.
- **`ProductCreate.vue`** – Consumer. Passes `seedFallback: true`, no `stored`, and an `onStale` that is a no-op (412 impossible on create).
- **`ProductEdit.vue`** – Consumer. Passes `seedFallback: false`, a `stored` getter reflecting server-held locales, and an `onStale` that detects and handles 412.
- **`use-translated-entity-form.spec.ts`** – Unit test for this composable.

## Notes

- `translations` mirrors the write-body shape: an object upserts a locale, `null` marks it for deletion on submit, an absent key leaves it untouched.
- `openTags` is **derived** from `form.translations` (via `useTranslationTabOrder`), not stored separately, so `resetForm()` cannot desync the tab bar.
- `activeTab` is set once (the first tab to appear) and is never moved by subsequent data changes — only by explicit `handleAddLocale`/`handleRemoveLocale`.
- The fallback tab is never closable; that guard lives in the `TranslationTabs` UI component, not here.
- `seedFallback` is add-only and idempotent: it inserts a blank entry for the fallback tag the first time the tag becomes known, then never runs again.
- The `tabErrorCounts` watch uses `deep: true` because edits to a nested translation mutate `form.value` in place.
- In `handleSubmitFailure`, a server 422's per-locale errors are **merged** into existing `tabErrorCounts` (not replaced), while the `onStale` callback, when it returns `true`, short-circuits the remaining error-handling path entirely.
