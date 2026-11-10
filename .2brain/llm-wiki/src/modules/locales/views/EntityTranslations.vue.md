---
source: src/modules/locales/views/EntityTranslations.vue
sha256: 68770e67c33fbe71ac717d0a80628f12779ab1cc3fe1221a58b0e16330cd9063
signature: 68770e67c33fbe71ac717d0a80628f12779ab1cc3fe1221a58b0e16330cd9063
generated_at: 2026-11-10T04:46:11.280821+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/views/EntityTranslations.vue

## Purpose

The generic translation editor screen for any `translatables`-registered entity (currently only `product`). It renders one tab per language the entity has a translation row for, lets the user add/remove language tabs and edit fields inline, then saves all changes in a single merging `PATCH /translations/{entityType}/{id}` call. Reachable via the "Translations" action on the product edit page.

## Key elements

- **`EntityTranslationsPage`** (named block) — gives the SFC a stable component name for devtools / `<KeepAlive>`, since `<script setup>` cannot declare one.
- **`load()`** — fetches the language manifest *and* the entity's translation rows in parallel, then rebuilds `drafts`, `fieldNames`, `baseline`, and `originalTags`. Triggered on mount and whenever `entityType`/`entityId` route params change.
- **`handleAddLocale(tag)`** — opens a language tab. Restores the row's original content if the locale was previously present; otherwise starts with all registry fields blank.
- **`handleRemoveLocale(tag)`** — closes a tab. Locates in `originalTags` get set to `null` (delete signal in the merge body); session-only tabs are dropped from `drafts` entirely.
- **`handleSave()`** — serialises drafts via `toUpdateEntityTranslationsBody`, calls `localesStore.saveEntityTranslations`, then reloads. 412 responses are delegated to `useStaleRecord`; other failures block the save button in place via `useBlockingError`.
- **`snapshotOf(value)`** — order-independent JSON serialisation of the drafts map (locale-sorted, field-name-sorted) used for dirty comparison.
- **`isDirty`** (computed) — `snapshotOf(drafts) !== baseline`; drives the leave guard.
- **`useLeaveGuard(isDirty, …)`** — warns before navigation away with unsaved changes.
- **`useStaleRecord`** — handles 412 (ETag mismatch) by offering a "reload latest" path that discards local drafts and re-baselines.
- **`useTranslationTabOrder`** — derives `openTags` from `drafts` with the fallback locale first; shared with product create/edit forms.
- **`TranslationTabs`** (organism) — the tab-bar UI; emits `@add` / `@remove`.
- **`useBlockingError`** — dedicated in-place error state for the save button (as opposed to ambient toasts for load failures).

## Relationships

- **`src/modules/locales/store.ts`** — consumes `useLocalesStore` for `fetchLanguages`, `fetchEntityTranslations`, `saveEntityTranslations`, and reactive refs (`capabilities`, `fallbackLocale`, `loading`, `savingEntityTranslations`).
- **`src/modules/locales/domain/index.ts`** — imports `toUpdateEntityTranslationsBody`, which converts the three-way draft shape (object / `null` / absent) into the API's `UpdateEntityTranslationsRequest` body.
- **`src/modules/locales/domain/translation-drafts.ts`** — the implementation module behind the domain re-export; defines the request-body mapper this view depends on.
- **`src/modules/locales/tests/entity-translations-leave-guard.spec.ts`** — exercises the `isDirty` + `useLeaveGuard` behaviour (unsaved-changes warning, auth-gated dismissal).
- **`src/modules/locales/tests/entity-translations-stale.spec.ts`** — exercises the 412 / `useStaleRecord` flow: "Reload latest" discards drafts and re-baselines.

## Notes

- The field list (`fieldNames`) comes from the **registry's declared list** in the response's `fields` array, never inferred from which rows happen to carry values. A brand-new field with no row yet is still editable.
- `null` in `drafts[tag]` is a **delete signal** for the merge endpoint, not a display state — such tabs are immediately removed from `openTags`, so the template's `drafts[tag]!` non-null assertion is safe.
- Blank fields are serialised as `null` (explicit clear) rather than omitted, because an empty string would 422 on the API and an omitted key would leave the stored value unchanged.
- The language manifest is **refetched on every `load()`**, not session-cached, because a session change (e.g. `display:Locale` granted) can add draft-language tabs to the tab bar.
- Save errors block the button in place (`useBlockingError`); load errors use the toast queue (`notifyErrorMessages`). This distinction is intentional (see `docs/theory/request-flow.md`).
