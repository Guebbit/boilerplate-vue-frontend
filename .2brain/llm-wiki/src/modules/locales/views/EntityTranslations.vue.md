---
source: src/modules/locales/views/EntityTranslations.vue
sha256: c3b426e20ac112d551ac57158f4ee5052a05479eca0b89d4ffd75cb7854b5694
generated_at: 2026-10-17T01:06:54.574336+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/views/EntityTranslations.vue

## Purpose

Generic, entity-agnostic translation editor. Given a route parameter pair (`entityType`, `id`), it fetches the entity's existing translation rows via the locales store, renders one tab per locale (with the entity's registered translatable fields as textareas), and sends a single merging `PATCH` on save. Currently the only caller is `ProductEdit.vue`'s "Translations" action, but the screen is designed to work for any entity registered in `translatables`.

## Key elements

- **`load()`** — Fetches the language manifest (if not yet loaded) and the entity's translation rows in parallel, then rebuilds the local `drafts` map and `originalTags` set. Triggers on mount and whenever `entityType` or `id` changes (via a `watch`).
- **`drafts`** — `Record<string, Record<string, string> | null>`: the editable state. An object means "upsert these fields"; `null` means "delete this locale's row." This mirrors `UpsertTranslationsRequest` so submission is a direct pass-through.
- **`originalTags`** — Set of locale tags present in the last server fetch. Used by `handleRemoveLocale` to decide between sending `null` (was a real row) vs. simply dropping the key (added this session, never persisted).
- **`fieldNames`** — The translatable field list taken from the API response's `fields` array (the registry's declared list), **not** discovered from whichever rows happen to have values. This guarantees every registered field is editable even when no row has filled it in yet.
- **`handleAddLocale(tag)`** — Opens a new tab. If the tag exists in `rows` (a previously-fetched row), its content is restored; otherwise all known fields are initialised to `''`.
- **`handleRemoveLocale(tag)`** — Closes a tab. Marks the draft `null` if the tag was in `originalTags`, otherwise deletes the key. Resets `activeTab` if the closed tab was active.
- **`handleSave()`** — Builds an `UpsertTranslationsRequest`, stripping blank-string fields (the API rejects empty strings with 422; deletion is signalled by `null`). Calls `localesStore.saveEntityTranslations`, then reloads. On failure, blocks the save button in place via `useBlockingError` rather than emitting a toast.
- **`openTags`** — Derived from `drafts` keys, ordered with the fallback locale first. Computed via the shared `useTranslationTabOrder` composable.
- **Permission gates** — Route entry is gated on `translations.read` (route `meta.can`); the save button is only rendered when `session.can('update', 'Translation')` is true.

## Relationships

- **`src/modules/locales/store.ts`** — Provides `useLocalesStore`, from which this view destructures `capabilities` (the language manifest), and calls `fetchLanguages`, `fetchEntityTranslations(entityType, id)`, and `saveEntityTranslations(entityType, id, body)`. The store is the sole data-access layer between this view and the translations API.

## Notes

- The component uses a **dual `<script>`** pattern: a non-`setup` block solely to declare `name: 'EntityTranslationsPage'` (needed for `<KeepAlive>` and devtools, since `<script setup>` cannot set `name`), alongside the main `<script setup>` body.
- **Blank-field stripping on save** is intentional: the API treats `''` as a validation error (422), not a no-op. `null` is the delete signal; absence of a key is "don't touch."
- **`rows` is kept** even though it's not rendered directly; it exists so `handleAddLocale` can restore a locale's content after a remove-then-re-add cycle instead of blanking it.
- The save error uses `useBlockingError` (in-button alert), while load errors use `notifyErrorMessages` (toast). This distinction is deliberate: a failed save blocks the user's next action, a failed load is ambient. See `docs/theory/request-flow.md`.
- The `v-model` binding on textareas uses `drafts[tag]![field]` with a non-null assertion; the invariant is that `openTags` only ever contains keys whose draft value is an object (a `null` draft is always paired with tab removal, so the assertion is safe at render time).
