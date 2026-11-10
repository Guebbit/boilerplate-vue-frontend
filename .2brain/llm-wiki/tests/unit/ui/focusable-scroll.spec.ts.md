---
source: tests/unit/ui/focusable-scroll.spec.ts
sha256: 25893706b3f46f7ac6add13c29b5dafcc8fea693335eab0888a26342be1fd0f0
signature: a1b4431579f899064186adda86d00d17d5bdbc6ac3b6408cfa64c88ec4f69185
generated_at: 2026-11-10T08:25:18.010997+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/focusable-scroll.spec.ts

## Purpose

Unit tests that pin the accessibility contract of the `v-focusable-scroll` directive when applied to a real Vuetify `v-table`. They verify that the *inner* scroller (`.v-table__wrapper`)—not the outer `.v-table`—receives `tabindex`, an optional `role="region"`, and a reactive `aria-label`, satisfying axe's `scrollable-region-focusable` rule.

## Key elements

- **`mountTable(name?)`** – Test helper that mounts a minimal `v-table` with the `vFocusableScroll` directive and an optional `label` prop, inside a Vuetify plugin context.
- **`v-focusable-scroll > makes the scroller focusable and names it as a region`** – Asserts `.v-table__wrapper` gets `tabindex="0"`, `role="region"`, and `aria-label` matching the provided name.
- **`v-focusable-scroll > leaves the outer table alone`** – Asserts `.v-table` does **not** receive a `tabindex`.
- **`v-focusable-scroll > still makes it focusable, without a role, when given no name`** – Asserts `tabindex="0"` is still set, but `role` is omitted when no label is supplied.
- **`v-focusable-scroll > follows a name that changes`** – Confirms `aria-label` updates reactively when the `label` prop changes after mount.

## Relationships

No graph neighbors recorded.

## Notes

- The test deliberately targets `.v-table__wrapper` (Vuetify's inner scroll container), not the top-level `.v-table`. If Vuetify changes its internal DOM structure, these selectors will break.
- The directive is imported from `@/ui/directives/focusable-scroll`; the Vuetify instance is imported from `@/ui/vuetify`.
- "No name" means the directive skips `role` entirely rather than emitting an empty `aria-label`.
