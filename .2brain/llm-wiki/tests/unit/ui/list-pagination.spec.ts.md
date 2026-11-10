---
source: tests/unit/ui/list-pagination.spec.ts
sha256: 3998c3f6fef037ec235dd1518ea1c3165b07716a209f3e8d2fd194106812647a
signature: 823bdc4e9200551925feb2e2cce09d6644c2b4b432160c31bae657908c51458c
generated_at: 2026-11-10T08:27:30.171800+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/list-pagination.spec.ts

## Purpose

Spec for the `ListPagination.vue` molecule, whose entire logic is a single `v-if="length > 1"` gate over Vuetify's `v-pagination`. The spec exists to pin the three render boundaries (0 pages, 1 page, 2 pages) that a happy-path example would miss, plus the component's model contract, aria-label forwarding, focus-fallback behavior, and test-hook attribute.

## Key elements

- **`mountPager`** – local helper that mounts `ListPagination` with the Vuetify plugin and optional prop overrides.
- **`isRendered`** – asserts presence/absence of the `.v-pagination` element (i.e. whether the `v-if` admitted rendering).
- **`mountAttached`** – variant of `mountPager` that sets `attachTo: document.body`; required so `document.activeElement` works inside the focus-fallback tests.
- **`describe('…the render boundary')`** – six cases: `length` 0, 1, 2, 50, omitted (default 0), and negative (−1). All assert the `v-if` outcome.
- **`describe('…the model')`** – verifies default active page is "1", that `modelValue: 3` highlights "3", that clicking the second button emits `update:modelValue` with `2`, and that `total-visible="7"` caps the button count (≤ 9 items for 500 pages).
- **`describe('…the name')`** – confirms a caller-supplied `ariaLabel` lands on the `<nav>` element.
- **`describe('…the focus fallback')`** – two cases proving that when the pager disappears (length drops below 2), focus moves to `<main>` by default or to a caller-supplied `focusFallback` selector. Uses `vi.waitFor` to poll `document.activeElement`.
- **`describe('…the test hook')`** – asserts the `data-test` attribute defaults to `pagination` and can be overridden via the `testId` prop.

## Relationships

- **`tests/support/unit/mounted-vm.ts`** – provides `nextRenderTick`, used in every async test (model, focus-fallback, name) to flush Vue's render cycle before asserting on the DOM.

## Notes

- The file's header comment frames the spec as boundary-driven: the three critical cases are `length` 0, 1, and 2. The 1-page case is called out as the common real-world failure (a search narrowing to one page) and the one a `>= 1` guard would get wrong.
- `mountAttached` must be used (not `mountPager`) for the focus-fallback block; without `attachTo: document.body`, the component's internal `root.value?.contains(document.activeElement)` guard can never evaluate to true.
- The focus-fallback tests mutate `document.body.innerHTML` directly and rely on `vi.waitFor` to poll until focus has actually moved—there is no single deterministic tick to await.
- The "caps visible buttons" test asserts `≤ 9` (7 page items + prev/next arrows), reflecting the component's `total-visible="7"` attribute; it is a layout/performance guard for long admin lists, not a pixel-perfect count.
