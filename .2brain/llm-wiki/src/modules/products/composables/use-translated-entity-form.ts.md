---
source: src/modules/products/composables/use-translated-entity-form.ts
sha256: 600b379b692565fdb8ea8abba29bc87a62ddc99b6bce2d678482f22a50a57859
generated_at: 2026-10-02T15:33:25.413702+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/composables/use-translated-entity-form.ts

## Purpose

Shared composable that powers the multi-language translation form used by both `ProductCreate.vue` and `ProductEdit.vue`. It wires the `@guebbit/vue-toolkit` form-validation state, the language-tab open/close lifecycle, per-tab error badges, and the post-submit failure pipeline, so the two views only supply their differing fields, request, and whether a 412 is possible.

## Key elements

- **`TranslatedForm`** – minimal interface requiring a `translations: ProductTranslationsWrite` property; the single form field this composable reads/writes.
- **`TranslatedEntityFormOptions<TForm>`** – generic options bag: initial values, Zod schema, form element ref, fallback locale ref, optional `seedFallback` flag, optional `stored()` callback (server-held translations for tab-restore), optional `onStale` handler, and required `reportSubmitError`.
- **`useTranslatedEntityForm<TForm>(options)`** – the sole runtime export. Returns the toolkit's `form`/`showFormErrors`/`applyServerErrors`, plus:
  - `openTags` – reactive list of open locale tabs (fallback first), *derived* from `form.translations` via `useTranslationTabOrder`.
  - `activeTab` – the currently displayed tab; set once on first appearance, never moved by later tab changes.
  - `tabErrorCounts` – per-locale Zod error counts for tab badges; re-computed by re-parsing the schema whenever `showFormErrors` or the form mutates.
  - `handleAddLocale(tag)` – opens a tab (blank or restored from `stored()`).
  - `handleRemoveLocale(tag)` – closes a tab; sets the entry to `null` (PATCH delete signal) if server-stored, otherwise deletes the key.
  - `handleSubmitFailure(error)` – ordered failure pipeline: `onStale` → server tab-badge merge → `applyServerErrors` with `reportSubmitError` fallback.
- **`blankTranslation()`** – internal helper returning `{ title: '', description: '' }`.

## Relationships

The listed graph neighbor `src/infrastructure/utils/logger.ts` has no direct import or call in this file; no interaction to document.

The composable does depend on (not listed as neighbors but visible in imports):

- `useTranslationTabOrder` – produces the ordered `openTags` list.
- `translationTabErrorCountsFromZodError` / `translationTabErrorCountsFromServerError` – map Zod or server errors into per-locale badge counts.
- `VUETIFY_INVALID_FIELD_SELECTOR` – passed to the toolkit for scroll-to-invalid.
- `useStructureFormValidation` (from `@guebbit/vue-toolkit`) – core form state, submit, and revalidation.

## Notes

- **`translations` shape is the write body's shape**: an object upserts a locale, `null` signals deletion on submit, an absent key is left untouched. This is not a separate UI model.
- **`openTags` is derived, not stored**: it re-computes from `form.translations` on every change, so a `resetForm()` or programmatic mutation can never desync the tab bar from the data.
- **`seedFallback` is add-only**: once the fallback tab exists it is never re-checked or removed; the invariant "a product must have a fallback translation" is enforced structurally.
- **`activeTab` uses `??=`**: the first tab to appear "claims" the view; adding or removing other tabs does not switch the user's focus.
- **Tab badges re-parse the full schema** (`options.schema.safeParse`) rather than reusing the toolkit's `formErrors`, because the toolkit collapses all `translations.*` issues into a single bucket (see `translation-tab-errors.ts`).
- **The fallback tab is never closable** — enforced by the `TranslationTabs` UI component, not by this composable; `handleRemoveLocale` is never called for it.
- **`onStale` returning `true` short-circuits** the entire failure pipeline, preventing both badge updates and `reportSubmitError`.
