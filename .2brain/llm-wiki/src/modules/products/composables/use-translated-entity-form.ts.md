---
source: src/modules/products/composables/use-translated-entity-form.ts
sha256: 3badc99e3b4b88b88f68f8ca0b5de89b3eee97b3df9bc74922b630bf37391bc7
signature: 00558f57444f2cf7b25b8f0d01e3c70f56b5e2697335edff60ea2e5f4c1fdd9a
generated_at: 2026-11-10T05:20:26.467305+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/composables/use-translated-entity-form.ts

## Purpose

Shared composable that gives `ProductCreate.vue` and `ProductEdit.vue` a unified translated-entity form: toolkit form state, one language tab per entry in `form.translations`, per-tab error badges, and a common failure-handling tail. The views keep only what differs (surrounding fields, the actual request, and whether a 412 is possible).

## Key elements

- **`TranslatedForm`** — Minimal interface (`translations: ProductTranslationsWrite`) that any form passed to the composable must satisfy.
- **`TranslatedEntityFormOptions<TForm>`** — Configuration bag: initial values, Zod schema, form element ref, `fallbackLocale` ref, optional `seedFallback`, `stored` (server-held translations for undo-on-reopen), `onStale` (412 hook), and `reportSubmitError`.
- **`useTranslatedEntityForm<TForm>`** — The exported composable. Returns the toolkit's validation handle plus:
  - `openTags` — ordered list of open language tabs (fallback first), derived reactively from `form.translations`.
  - `activeTab` — currently visible tab; set once on first appearance, never moved by later reorders.
  - `tabErrorCounts` — per-locale error counts for badge display; recomputed on every form mutation while errors are shown.
  - `handleAddLocale(tag)` — opens a tab, restoring stored content if one was removed earlier this session.
  - `handleRemoveLocale(tag)` — closes a tab; marks `null` if the server holds the locale, deletes the key if it never was saved.
  - `handleSubmitFailure(error)` — routes a rejected submit: delegates 412 to `onStale`, merges server-reported tab errors into `tabErrorCounts`, then falls through to `applyServerErrors` / `reportSubmitError`.
- **`blankTranslation()`** — Internal helper returning an empty `{ title: '', description: '' }` for newly opened tabs.

## Relationships

- **`ProductCreate.vue` / `ProductEdit.vue`** — Both call `useTranslatedEntityForm`; the views supply their own `schema`, `formElement`, `onStale` (create only), and `reportSubmitError`, and render the returned `openTags`, `activeTab`, `tabErrorCounts`, and handlers in their templates.
- **`translation-tab-errors.ts`** — Provides `translationTabErrorCountsFromZodError`, `translationTabErrorCountsFromServerError`, and the `TranslationTabErrorCounts` type used to compute and merge per-locale badge counts.
- **`use-translated-entity-form.spec.ts` / `use-translated-entity-form-baseline.spec.ts`** — Unit test suites covering the composable's behavior (tab add/remove, error counts, failure routing, seed-fallback, dirty-state baseline).

## Notes

- **`translations` uses the write-body's own tri-state shape:** an object upserts a locale, `null` signals deletion on the next submit, an absent key means "leave it alone." Don't delete keys expecting a server-side delete.
- **`openTags` is derived from `form.translations`,** not from a separate tab list. This means `resetForm()` (or any programmatic form mutation) automatically re-syncs the tab bar; there is no independent tab-visibility state to get out of whack.
- **`seedFallback` is add-only and idempotent.** Once the fallback locale has an entry the watcher does nothing further. On a pristine form it calls `setInitialData` after seeding so the form isn't falsely "dirty."
- **`tabErrorCounts` is recomputed via `schema.safeParse`** rather than read from the toolkit's `formErrors`, because the toolkit collapses all `translations.*` issues into a single bucket (documented in `translation-tab-errors.ts`).
- **The `deep: true` watch** on `[showFormErrors, () => form.value]` is required because editing a nested translation mutates `form.value` in place without triggering a top-level ref change.
- **`revalidateOn: locale`** ties revalidation to the admin's UI language (from `useI18n`), not to the content tab. Switching admin language re-runs the Zod schema.
- **`activeTab` is set-once-per-session:** the watcher only assigns `tags[0]` when `activeTab` is still `undefined`. Subsequent tab reorders (e.g. adding a new locale) do not yank the user to a different tab.
