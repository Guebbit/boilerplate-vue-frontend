---
source: tests/unit/ui/list-pagination.spec.ts
sha256: e2ded3ad302c5096d822babfdf91e0a679fd561d12345675801daa72f81fb97f
generated_at: 2026-10-17T02:46:52.617645+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/list-pagination.spec.ts

## Purpose
Spec for `ListPagination.vue`, a thin wrapper over `v-pagination` whose only logic is `v-if="length > 1"`. The file exists to pin the three render-boundary cases (0, 1, 2 pages) that a happy-path test would never exercise, plus to verify model behavior, `aria-label` forwarding, and the focus-fallback mechanism when the pager unmounts.

## Key elements
- **`mountPager`** — helper that mounts `ListPagination` with the Vuetify plugin and an optional props override.
- **`isRendered`** — asserts the `v-if` gate by checking for the presence of `.v-pagination` in the wrapper.
- **`mountAttached`** — same mount as `mountPager` but with `attachTo: document.body`, required for the focus-fallback tests.
- **`describe('… the render boundary')`** — six cases: length 0, 1, 2, 50, omitted (defaults to 0), and -1.
- **`describe('… the model')`** — default page is 1, `modelValue` reflects correctly, clicking a page emits `update:modelValue`, and visible buttons are capped (≤ 9 for a 500-page list, per `total-visible="7"`).
- **`describe('… the name')`** — verifies `ariaLabel` prop is forwarded to the `<nav>` element's `aria-label` attribute.
- **`describe('… the focus fallback')`** — two tests: focus moves to `<main>` by default, or to a caller-supplied `focusFallback` selector, when the pager disappears.

## Relationships
- **`tests/support/unit/mounted-vm.ts`** — provides `nextRenderTick`, a helper that advances Vue's render cycle before reading DOM state. Used in the model and focus-fallback test blocks.

## Notes
- The focus-fallback tests mutate `document.body.innerHTML` directly (bypassing Vue) and require `attachTo: document.body` because `document.activeElement` only resolves inside a document-attached tree; the component's own guard checks `root.value?.contains(document.activeElement)`.
- The spec includes a `length: -1` case even though it is unreachable through the API, to document the arithmetic guard's behavior on nonsense input.
- `vi.waitFor` is used in focus-fallback tests to poll until focus has actually moved, rather than asserting immediately after `setProps`.
