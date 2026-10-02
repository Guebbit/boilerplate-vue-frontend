---
source: src/modules/locales/views/EntityTranslations.vue
sha256: 4fdfeca73ef83891b9d7f8dab36cd82b5818b72581318e5bd577eaf45c6301d8
generated_at: 2026-10-02T15:16:06.332379+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/views/EntityTranslations.vue

## Purpose

Generic translation editing screen for any entity registered in the `translatables` registry (currently only `product`). Renders one tab per language the entity has a row for, lets the visitor add/remove language tabs, and submits all open and removed locales in a single merging `PATCH` write. Gated on `translations.read` (route entry) and `translations.update` (save button).

## Key elements

- **`load()`** — fetches the language manifest (if empty) and the entity's translation rows via `localesStore.fetchEntityTranslations`, then rebuilds `drafts`, `fieldNames`, `originalTags`, and sets the active tab. Triggered immediately and on route-param change.
- **`handleAddLocale(tag)`** — opens a tab; restores the row's content if it was previously removed in this session, otherwise blanks every registry-declared field.
- **`handleRemoveLocale(tag)`** — closes a tab. If the locale was in `originalTags` it is set to `null` (the API's delete signal); if it was only opened this session the entry is dropped. Switches `activeTab` to the first remaining tab.
- **`handleSave()`** — builds an `UpsertTranslationsRequest` from `drafts`, strips blank-string fields (empty string would 422; `null` is the delete), calls `localesStore.saveEntityTranslations`, then reloads. Failures are reported via `useBlockingError` (inline alert on the button), not toasts.
- **`drafts`** (`Record<string, Record<string, string> | null>`) — the single source of editable state; `null` marks a tab pending deletion.
- **`openTags`** — derived from `drafts` keys via the shared `useTranslationTabOrder` composable (fallback locale first).
- **Template** — `TranslationTabs` for the tab bar, a `v-window` of `v-textarea`s (one per `fieldNames` entry), a save button visible only when `session.can('update', 'Translation')` is true, and an `InlineErrorAlert` for save failures.

## Relationships

- **`src/kernel/registry.ts`** — Conceptual dependency: the set of editable fields (`fields` in the API response) is declared by the `translatables` registry for the given entity type. The component never imports the registry directly; it receives the field list from the server response and treats it as authoritative.
- **`src/infrastructure/utils/logger.ts`** — No direct import or call in this file; the error paths use `notifyErrorMessages` (from `@/infrastructure/utils/errors.ts`) and `useBlockingError` instead.

## Notes

- Field discovery is **registry-driven, not row-driven**: `fieldNames` comes from the response's `fields` array, not from inspecting which keys the fetched rows happen to carry. This ensures blank-but-valid fields are offered in the UI.
- Blank fields are stripped client-side before submission (`value !== ''` filter). An empty string would produce a 422 on the API side; only `null` (the three-way shape) signals a locale deletion.
- Save errors use the **blocking** pattern (`useBlockingError` → `InlineErrorAlert`), while load errors use **ambient** toasts — a deliberate distinction documented in `docs/theory/request-flow.md`.
- The non-null assertion `drafts[tag]!` in the template is safe because `null` values are only ever set on tabs that `handleRemoveLocale` simultaneously excludes from `openTags`, so the `v-for` never renders them.
- Currently only reachable for `entityType = "product"` (linked from `ProductEdit.vue`'s "Translations" action), but the component is entity-agnostic.
