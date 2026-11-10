---
source: src/ui/molecules/TableLoadingBar.vue
sha256: bb93b06853ae602c8582df700289b10864bab723efed1c94ac5190f458802ca3
signature: cd5092beeeeb77aec2d0b7515fcc68e2b2558b1aef4529c4a52d150292b296e9
generated_at: 2026-11-10T06:29:02.902104+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/TableLoadingBar.vue

## Purpose

Provides an accessible replacement for Vuetify's built-in `v-progress-linear` loader, intended to be passed into `v-data-table`'s `#loader` slot. It exists because Vuetify's internal loader renders a `role="progressbar"` with no accessible name (an axe serious violation), and that cannot be patched via Vuetify component defaults since `aria-label` is not a declared prop.

## Key elements

- **`<script setup>`** — imports `useI18n` and destructures `t` for translation lookups.
- **`<template>`** — renders a single `v-progress-linear` with `absolute`, `indeterminate`, `height="2"`, `color="primary"`, and `:aria-label="t('generic.loading-state')"`. No props are exposed; no slots are accepted.

## Relationships

No dependency-graph neighbors recorded. The component is consumed ad hoc inside any parent that supplies a `#loader` slot to a `v-data-table`, but no import-level relationship is tracked.

## Notes

- The i18n key `generic.loading-state` is the only string in the component. Missing that key will produce a visible fallback label in the loader.
- The component intentionally exposes **no props**. If a future table needs a differently-colored or taller bar, that would require either a prop addition or a separate component — do not expect configuration hooks.
- Because the component is the single source of the `aria-label`, the accessibility test suite asserts against this one file. Removing or bypassing it in a specific table will re-introduce the axe violation for that instance.
