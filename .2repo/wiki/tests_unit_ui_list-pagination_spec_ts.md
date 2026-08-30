# tests/unit/ui/list-pagination.spec.ts

## Purpose

Unit tests for `ListPagination.vue`, a thin wrapper around Vuetify's `v-pagination` whose only logic is a `v-if="length > 1"` guard. The file exists to pin down the exact render boundary (0, 1, 2 pages) that a happy-path example test would miss, plus the `v-model` contract and the `aria-label` pass-through.

## Key elements

- **`mountPager(props)`** — helper that mounts `ListPagination` with the Vuetify plugin; accepts an optional props object.
- **`isRendered(wrapper)`** — asserts presence/absence of the `.v-pagination` element (Vuetify's rendered control), serving as a proxy for the `v-if` decision.
- **`describe('ListPagination — the render boundary')`** — six cases: 0 pages, 1 page, 2 pages, 50 pages, omitted `length` (defaults to 0), and negative `length`. Each asserts the pager is hidden or visible.
- **`describe('ListPagination — the model')`** — four cases: default active page is 1; `modelValue` prop selects the correct page; clicking a page button emits `update:modelValue` with the clicked number; `total-visible="7"` caps the number of rendered page items (≤ 9 items including arrows).
- **`describe('ListPagination — the name')`** — verifies that an `ariaLabel` prop is forwarded to the `<nav>` element's `aria-label` attribute.

## Relationships

- **`docs/tools/component-testing.md`** — documents the component-testing conventions (mounting strategy, Vuetify plugin setup, assertion style) that this spec follows. The file does not import it, but the graph links them because the doc is the reference for the testing patterns used here.

## Notes

- The test file's opening docblock explicitly frames the boundary rationale: every list in the app has multiple pages during development, so the `v-if` guard is never exercised by incidental usage. The 1-page and 2-page cases catch off-by-one errors (`>= 1` vs. `> 2`).
- Selectors target Vuetify's internal class names (`.v-pagination`, `.v-pagination__item--is-active`, `.v-pagination__item button`). These are implementation details of the Vuetify version in use; a Vuetify upgrade that renames them will break these tests.
- The "caps the visible page buttons" test uses `toBeLessThanOrEqual(9)` (7 visible pages + 2 arrows) rather than an exact count, to stay resilient to minor Vuetify markup changes.
- The negative-length test is noted as unreachable through the normal API but guards against arithmetic edge cases in `totalPages` computation.
