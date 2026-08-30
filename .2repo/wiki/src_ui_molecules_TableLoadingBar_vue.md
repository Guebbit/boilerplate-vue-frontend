# src/ui/molecules/TableLoadingBar.vue

## Purpose

Provides an accessible `#loader` slot replacement for `v-data-table`. Vuetify's built-in loading bar renders a `v-progress-linear` with `role="progressbar"` but no accessible name, producing an axe "serious" violation on every list screen. Because `aria-label` is not a declared prop, Vuetify component defaults cannot inject one; this component is the supported override point (the loader slot) that adds the label.

## Key elements

- **`<v-progress-linear>` (template)** — Renders the actual bar with `absolute`, `indeterminate`, `height="2"`, `color="primary"`, and `:aria-label` bound to the i18n key `generic.loading-state`.
- **`useI18n()` / `t` (script setup)** — Supplies the translated loading-state label; the only runtime dependency in the file.
- **No props, no emits, no exports beyond the default SFC export** — It is a purely presentational, stateless wrapper.

## Relationships

No graph neighbors are recorded. The component is intended to be dropped into any `v-data-table`'s `#loader` slot; it has no imports from the application codebase beyond `vue-i18n`.

## Notes

- The component exists specifically so that every table gets the `aria-label` by *using the component*, rather than by remembering to add the attribute inline. The accessibility test suite can therefore target one location.
- The doc block in the source explains why Vuetify's `defaults` mechanism cannot fix this (it only maps declared props, and `aria-label` is not one of them). If Vuetify changes its internal loader or adds a label prop in a future major version, this component may become redundant—verify before deleting.
- The i18n key is `generic.loading-state`; adding a new language file requires that key to be present or the label will render as the raw key string.
