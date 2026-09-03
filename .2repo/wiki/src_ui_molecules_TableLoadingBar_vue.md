# src/ui/molecules/TableLoadingBar.vue

## Purpose

Drop-in replacement for the `v-progress-linear` that `v-data-table` renders internally while `loading` is true. It exists to give that progress bar an `aria-label`, fixing a `serious` axe violation (unlabeled `role="progressbar"`) that cannot be resolved through Vuetify component defaults because `aria-label` is not a declared prop. Intended to be passed into every table's `#loader` slot.

## Key elements

- **`v-progress-linear` (template)** — The sole rendered element. Hard-coded to `absolute`, `indeterminate`, `height="2"`, `color="primary"`. The `aria-label` is the only dynamic binding: `t('generic.loading-state')` from `vue-i18n`.
- **`useI18n` (script)** — Provides the translation function; no other logic or reactive state.

## Relationships

None tracked in the dependency graph. The component is consumed by whatever `v-data-table` instances in the app assign it to their `#loader` slot, but no neighbor files are recorded.

## Notes

- This component **replaces** the table's internal loading bar entirely — Vuetify does not merge the slot content with its default; whatever the slot renders becomes the bar.
- The label string lives under the i18n key `generic.loading-state`; adding a new language requires that key, not a change here.
- It is deliberately stateless and prop-less. Do not add configuration props unless the design requirement changes across all tables simultaneously.
- Because the file's docblock explicitly documents *why* the inline Vuetify bar can't be fixed globally, treat any future refactor that inlines this markup back into individual tables as an accessibility regression.
