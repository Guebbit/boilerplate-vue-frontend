---
source: src/ui/organisms/TranslationTabs.vue
sha256: a074f8ce514bd160eb1d0ee46f80a6df7d42d96ed3b012596e17bac063ddc678
signature: a074f8ce514bd160eb1d0ee46f80a6df7d42d96ed3b012596e17bac063ddc678
generated_at: 2026-11-10T06:32:55.228282+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/TranslationTabs.vue

## Purpose

A purely presentational tab bar shared by every per-locale translation screen (product create/edit forms, generic entity-translations). It renders one tab per open locale, a fallback-locale guard, an optional per-tab error badge, a "add language" picker for unopened locales, and a single remove button. All data ownership and ordering live with the caller; this component only reports user intent via `add`/`remove` emits and a `v-model` for the active tab.

## Key elements

- **`TranslationTabLocale`** (exported interface) — the per-locale shape the component reads: `tag`, `nativeName`, `direction`, and optional `active` (when `false` the language is a draft).
- **Props** — `locales` (full universe of languages), `openTags` (currently-open tabs in display order), `fallbackTag` (never removable), `errorCounts` (optional per-tab badge counts).
- **`activeTab`** — `defineModel<string | undefined>`; the caller owns which tab is active.
- **Emits** — `add(tag)` when a closed locale is picked from the select; `remove(tag)` when the remove button is clicked.
- **`openLocales`** (computed) — resolves `openTags` against `locales`, falling back to a bare-tag row while the locale manifest is still loading.
- **`closedLocales`** (computed) — locales without an open tab, presented to the "add language" `<v-select>`; draft locales are annotated with a translated "(draft)" suffix.
- **`handlePick`** — emits `add` and resets the select's internal model to `null` so the control reads as a one-shot action.
- **`useTouchFriendlySize`** — drives the remove button's size (28 px desktop / 44 px below `sm`), keeping it above the 24 px WCAG 2.5.8 target minimum.

## Relationships

No graph neighbors are listed for this file. It depends only on standard library packages (`vue`, `vue-i18n`, `lucide-vue-next`, Vuetify) and one internal composable (`use-touch-friendly-size`). Callers are expected to manage per-locale state and tab ordering (the comment references `useTranslationTabOrder`, though it is not imported here).

## Notes

- **Remove button is deliberately a sibling of `<v-tabs>`, not inside it.** Placing a focusable `<button>` inside `role="tab"` triggers axe `nested-interactive`; placing it inside `role="tablist"` triggers `aria-required-children`. Sibling placement is the only shape that satisfies both.
- **Panels must use `v-tabs-window`, not `v-window`.** A plain `v-window` enables horizontal swipe gestures, which causes accidental language switches when the user drags inside a text field.
- **Fallback locale can never be removed.** The remove button is hidden (`v-if="activeLocale.tag !== fallbackTag"`) whenever the active tab is the fallback, because deleting it would produce a 422 on the API.
- **Draft languages** (`active: false`) show a muted "(draft)" badge on the tab and a contextual hint paragraph below the bar. They are still fully editable and persistable; they are simply invisible to shoppers.
- **`openTags` is expected to list the fallback locale first.** The component does not enforce or reorder this.
- **Accessibility wiring is caller-completed.** Each tab carries `id="translation-tab-{tag}"` and `aria-controls="translation-panel-{tag}"`; the caller must add `role="tabpanel"` and matching `aria-labelledby` on the `v-tabs-window-item` side to finish the WAI-ARIA APG tabs pattern.
