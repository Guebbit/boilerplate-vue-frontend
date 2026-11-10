---
source: tests/unit/ui/list-search-actions.spec.ts
sha256: 61dc0e24d7506e0609d90477479455d19a347eccab39d5bc78c764e24cd67217
signature: c372c63f6c4455300cf89bc5ccb438dbe1b7e284775e7292f06351ddd9a8ecf4
generated_at: 2026-11-10T08:27:45.191431+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/list-search-actions.spec.ts

## Purpose

Unit tests for the `ListSearchActions.vue` component — the Search/Reset button row that closes every admin list's filter form. Verifies button types, emit behavior, the `hookPrefix` namespacing mechanism, loading-state handling, and default-slot ordering.

## Key elements

- **`mountRow`** — local helper that mounts `ListSearchActions` with optional `props` and a default slot, wiring in the `vuetify` and `i18n` plugins.
- **`describe('…buttons')`** — asserts Search is a `type="submit"` button, Reset is `type="button"`; confirms Reset emits `reset` on click; confirms Search click does **not** trigger any emit (the enclosing form owns the search).
- **`describe('…hook prefix')`** — passes `hookPrefix: 'refunds'` and verifies both `data-test` hooks are namespaced (`refunds-search-submit`, `refunds-search-reset`) while the un-prefixed hooks are absent.
- **`describe('…loading')`** — with no `loading` prop, both buttons are active; with `loading: true`, Reset gains `disabled` and Search gains the `v-btn--loading` class.
- **`describe('…the slot')`** — mounts with a default-slot `<a>` and asserts it renders *after* both buttons via the `data-test` attribute order.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The critical design contract tested here: **Search does not emit anything**. The parent form's own `@submit.prevent` is expected to handle the search; this component only provides the submit button.
- `hookPrefix` is the mechanism that keeps multiple `ListSearchActions` instances on a single page from colliding in `data-test` selectors.
- Slot ordering is asserted by collecting all `data-test` attributes in document order and comparing the array — a brittle but explicit check that the default slot lands after both buttons.
